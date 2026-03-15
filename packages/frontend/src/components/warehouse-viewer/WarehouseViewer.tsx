import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { WarehouseScene } from './WarehouseScene';
import { ObjectInfoPanel } from './ObjectInfoPanel';
import { DimensionEditor } from './DimensionEditor';
import { PresetCatalog } from '../preset-catalog';
import { ViewerToolbar, CoordinateDisplay, Minimap } from './ViewerToolbar';
import { KeyboardControlsHandler, KeyboardHint } from './KeyboardControls';
import { ContextMenu, useContextMenu } from './ContextMenu';
import { BinOccupancyRenderer, RackDetailPanel } from './BinPlacement';
import { TopViewZoneDrawer } from './TopViewZoneDrawer';
import type { BinOccupancy } from './BinPlacement';
import { ZoneListPanel } from './ZoneDrawing';
import type { ZoneConfig, ZoneType } from './ZoneDrawing';
import { createSpatialObject, updateSpatialObject, deleteSpatialObject } from '../../api/spatial-object-api';
import { createSpatialPreset } from '../../api/preset-api';
import type { SpatialObject, MeshType } from '../../types/spatial';
import type { SpatialPreset } from '../../types/preset';

// 기본 siteId / typeId (DB에 해당 레코드 필요 — 없으면 API 실패 시 로컬 유지)
const DEFAULT_SITE_ID = '00000000-0000-4000-a000-000000000001';
const DEFAULT_TYPE_ID = '00000000-0000-4000-a000-000000000002';

// 커스텀 프리셋용 카테고리 ID
const CUSTOM_PRESET_CATEGORY_ID = '00000000-0000-4000-a000-000000000010';

type ToolMode = 'select' | 'move' | 'rotate' | 'delete';
type ViewMode = 'perspective' | 'top' | 'front';

interface WarehouseViewerProps {
  objects: SpatialObject[];
  siteId?: string;
}

/**
 * 3D 창고 뷰어 — 전문 WMS 수준 UI
 */
export function WarehouseViewer({ objects, siteId }: WarehouseViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [placingPreset, setPlacingPreset] = useState<SpatialPreset | null>(null);
  const [placedObjects, setPlacedObjects] = useState<SpatialObject[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 뷰어 상태
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, z: 0 });
  const [layerVisibility, setLayerVisibility] = useState({
    racks: true,
    aisles: true,
    zones: true,
  });

  // Zone 시스템 상태
  const [zones, setZones] = useState<ZoneConfig[]>([]);
  const [drawingZoneType, setDrawingZoneType] = useState<ZoneType | null>(null);
  const [showZoneList, setShowZoneList] = useState(false);

  // 키보드 힌트
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);

  // BIN 적재 시스템
  const [binOccupancy, setBinOccupancy] = useState<BinOccupancy[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);

  // 2D 탑뷰 Zone 드로잉 모드
  const [topViewMode, setTopViewMode] = useState(false);

  // 그리드 표시 여부
  const [gridVisible, setGridVisible] = useState(true);

  // 드래그 앤 드롭 상태
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 우클릭 컨텍스트 메뉴
  const { contextState, openMenu, closeMenu } = useContextMenu();
  // 오브젝트 우클릭이 빈 공간 우클릭을 덮어쓰지 않도록 추적
  const objectContextMenuRef = useRef(false);

  const controlsRef = useRef<OrbitControlsImpl>(null);

  // 템플릿 객체가 placedObjects에 override된 경우 중복 제거, 삭제된 객체 필터링
  const placedIds = new Set(placedObjects.map((o) => o.id));
  const allObjects = [
    ...objects.filter((o) => !placedIds.has(o.id) && !deletedIds.has(o.id)),
    ...placedObjects.filter((o) => !deletedIds.has(o.id)),
  ];
  const selectedObject = allObjects.find((o) => o.id === selectedId) ?? null;
  const editingObject = allObjects.find((o) => o.id === editingId) ?? null;

  // 레이어 필터링된 활성 객체
  const activeObjects = allObjects.filter((o) => {
    if (!o.isActive) return false;
    const typeName = o.type.name;
    if (!layerVisibility.racks && typeName === 'RACK') return false;
    if (!layerVisibility.aisles && typeName === 'AISLE') return false;
    if (!layerVisibility.zones && (typeName === 'ZONE' || typeName === 'SAFETY_ZONE')) return false;
    return true;
  });

  const currentSiteId = siteId ?? DEFAULT_SITE_ID;

  // 프리셋 카드 클릭 → 배치 모드 진입
  const handleSelectPreset = useCallback((preset: SpatialPreset) => {
    setPlacingPreset(preset);
    setCatalogOpen(false);
    setSelectedId(null);
    setEditingId(null);
  }, []);

  // 고스트 메시 배치 확정
  const handlePlace = useCallback(
    async (position: [number, number, number]) => {
      if (!placingPreset) return;

      const code = `${placingPreset.code}_${Date.now()}`;
      const localObj: SpatialObject = {
        id: crypto.randomUUID(),
        siteId: currentSiteId,
        typeId: DEFAULT_TYPE_ID,
        type: { id: DEFAULT_TYPE_ID, name: 'RACK', label: placingPreset.name, description: null, depth: 5 },
        name: placingPreset.name,
        code,
        status: 'ACTIVE',
        isActive: true,
        positionX: position[0],
        positionY: position[1],
        positionZ: position[2],
        rotationX: 0, rotationY: 0, rotationZ: 0,
        scaleX: placingPreset.width || 1,
        scaleY: placingPreset.height || 1,
        scaleZ: placingPreset.depth || 1,
        color: null,
        opacity: placingPreset.opacity,
        visible: true,
        meshType: (placingPreset.meshType as MeshType) ?? 'box',
        metadata: { presetId: placingPreset.id, presetCode: placingPreset.code },
      };

      setPlacedObjects((prev) => [...prev, localObj]);
      setPlacingPreset(null);
      setEditingId(localObj.id);

      const saved = await createSpatialObject({
        siteId: currentSiteId,
        typeId: DEFAULT_TYPE_ID,
        name: localObj.name,
        code: localObj.code,
        positionX: localObj.positionX,
        positionY: localObj.positionY,
        positionZ: localObj.positionZ,
        scaleX: localObj.scaleX,
        scaleY: localObj.scaleY,
        scaleZ: localObj.scaleZ,
        color: localObj.color,
        opacity: localObj.opacity,
        meshType: localObj.meshType,
        metadata: localObj.metadata,
      });

      if (saved) {
        setPlacedObjects((prev) =>
          prev.map((o) =>
            o.id === localObj.id
              ? { ...localObj, id: saved.id, siteId: saved.siteId, typeId: saved.typeId }
              : o,
          ),
        );
        setEditingId(saved.id);
      }
    },
    [placingPreset, currentSiteId],
  );

  // 치수 편집 적용 — placedObjects에 있으면 업데이트, 없으면 템플릿 객체를 override로 추가
  const handleUpdateObject = useCallback(async (updated: SpatialObject) => {
    setSaving(true);
    setPlacedObjects((prev) => {
      const exists = prev.some((o) => o.id === updated.id);
      if (exists) {
        return prev.map((o) => (o.id === updated.id ? updated : o));
      }
      // 템플릿 객체 → placedObjects에 override로 추가
      return [...prev, updated];
    });
    await updateSpatialObject(updated.id, {
      name: updated.name,
      positionX: updated.positionX, positionY: updated.positionY, positionZ: updated.positionZ,
      rotationX: updated.rotationX, rotationY: updated.rotationY, rotationZ: updated.rotationZ,
      scaleX: updated.scaleX, scaleY: updated.scaleY, scaleZ: updated.scaleZ,
      color: updated.color, opacity: updated.opacity, meshType: updated.meshType,
    });
    setSaving(false);
  }, []);

  // 오브젝트 삭제 (초기 객체 + 배치된 객체 모두 지원)
  const handleDeleteObject = useCallback(
    async (id: string) => {
      setPlacedObjects((prev) => prev.filter((o) => o.id !== id));
      setDeletedIds((prev) => new Set(prev).add(id));
      if (editingId === id) setEditingId(null);
      if (selectedId === id) setSelectedId(null);
      if (selectedRackId === id) setSelectedRackId(null);
      await deleteSpatialObject(id);
    },
    [editingId, selectedId, selectedRackId],
  );

  // 내 프리셋으로 저장
  const handleSavePreset = useCallback(async (obj: SpatialObject) => {
    setSaving(true);
    const presetCode = `CUSTOM_${obj.code}`;
    const categoryId = (obj.metadata as Record<string, unknown>)?.presetCategoryId as string | undefined;
    const result = await createSpatialPreset({
      categoryId: categoryId ?? CUSTOM_PRESET_CATEGORY_ID,
      code: presetCode,
      name: `${obj.name} (커스텀)`,
      width: obj.scaleX, depth: obj.scaleZ, height: obj.scaleY,
      color: obj.color, opacity: obj.opacity, meshType: obj.meshType,
      metadata: { sourceObjectId: obj.id },
    });
    setSaving(false);
    if (result) {
      alert(`"${obj.name}" 프리셋이 저장되었습니다.`);
    } else {
      alert(`프리셋 저장에 실패했습니다. (API 미연결 시 오프라인 모드)`);
    }
  }, []);

  // 오브젝트 복제
  const handleDuplicate = useCallback(async (obj: SpatialObject) => {
    const newObj: SpatialObject = {
      ...obj,
      id: crypto.randomUUID(),
      name: `${obj.name} (복사)`,
      code: `${obj.code}_COPY_${Date.now()}`,
      positionX: obj.positionX + 3,
      positionZ: obj.positionZ + 3,
    };
    setPlacedObjects((prev) => [...prev, newObj]);
    setEditingId(newObj.id);
    setSelectedId(newObj.id);

    await createSpatialObject({
      siteId: newObj.siteId,
      typeId: newObj.typeId,
      name: newObj.name,
      code: newObj.code,
      positionX: newObj.positionX,
      positionY: newObj.positionY,
      positionZ: newObj.positionZ,
      scaleX: newObj.scaleX,
      scaleY: newObj.scaleY,
      scaleZ: newObj.scaleZ,
      color: newObj.color,
      opacity: newObj.opacity,
      meshType: newObj.meshType,
      metadata: newObj.metadata,
    });
  }, []);

  // 오브젝트 90° 회전
  const handleRotate90 = useCallback(async (obj: SpatialObject) => {
    const updatedObj: SpatialObject = {
      ...obj,
      rotationY: obj.rotationY + Math.PI / 2,
    };
    setPlacedObjects((prev) => prev.map((o) => (o.id === updatedObj.id ? updatedObj : o)));
    await updateSpatialObject(updatedObj.id, {
      rotationY: updatedObj.rotationY,
    });
  }, []);

  // 객체 선택 — 모든 객체를 DimensionEditor로 편집 가능
  const handleSelect = useCallback((obj: SpatialObject) => {
    setSelectedId(obj.id);
    setEditingId(obj.id);
    // 랙 선택 시 상세 패널 표시
    if (obj.type.name === 'RACK') {
      setSelectedRackId(obj.id);
    } else {
      setSelectedRackId(null);
    }
  }, []);

  // 뷰 모드 변경 → 카메라 위치 전환
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    const controls = controlsRef.current;
    if (!controls) return;

    const target = new THREE.Vector3(15, 0, 20);
    controls.target.copy(target);

    switch (mode) {
      case 'top':
        controls.object.position.set(15, 50, 20);
        break;
      case 'front':
        controls.object.position.set(15, 5, -15);
        break;
      default:
        controls.object.position.set(30, 20, 35);
        break;
    }
    controls.update();
  }, []);

  // 줌
  const handleZoomIn = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dir = new THREE.Vector3().subVectors(controls.target, controls.object.position).normalize();
    controls.object.position.addScaledVector(dir, 5);
    controls.update();
  }, []);

  const handleZoomOut = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dir = new THREE.Vector3().subVectors(controls.target, controls.object.position).normalize();
    controls.object.position.addScaledVector(dir, -5);
    controls.update();
  }, []);

  const handleResetView = useCallback(() => {
    handleViewModeChange('perspective');
  }, [handleViewModeChange]);

  // 레이어 토글
  const handleLayerToggle = useCallback((layer: 'racks' | 'aisles' | 'zones') => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  // Zone 드로잉 완료
  const handleZoneDrawComplete = useCallback((zone: Omit<ZoneConfig, 'id' | 'name'>) => {
    const ZONE_LABELS: Record<ZoneType, string> = {
      STORAGE: '보관 구역',
      PICKING: '피킹 구역',
      STAGING: '스테이징',
      SAFETY: '안전 구역',
    };
    const newZone: ZoneConfig = {
      ...zone,
      id: crypto.randomUUID(),
      name: `${ZONE_LABELS[zone.type]} ${zones.filter((z) => z.type === zone.type).length + 1}`,
    };
    setZones((prev) => [...prev, newZone]);
    setDrawingZoneType(null);
    setShowZoneList(true);
    handleViewModeChange('perspective');
  }, [zones, handleViewModeChange]);

  // Zone 삭제
  const handleDeleteZone = useCallback((id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  }, []);

  // 드래그 앤 드롭으로 프리셋 배치
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/hanvoxel-preset')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/hanvoxel-preset');
    if (!data) return;

    const preset: SpatialPreset = JSON.parse(data);

    // 드롭 위치를 3D 좌표로 변환 (NDC → 바닥 평면 교차)
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const nz = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    // 근사 좌표 변환 (카메라 기준)
    const worldX = Math.round(nx * 30 + 15);
    const worldZ = Math.round(nz * 25 + 20);
    const posY = (preset.height || 1) / 2;

    const code = `${preset.code}_${Date.now()}`;
    const localObj: SpatialObject = {
      id: crypto.randomUUID(),
      siteId: currentSiteId,
      typeId: DEFAULT_TYPE_ID,
      type: { id: DEFAULT_TYPE_ID, name: 'RACK', label: preset.name, description: null, depth: 5 },
      name: preset.name,
      code,
      status: 'ACTIVE',
      isActive: true,
      positionX: worldX,
      positionY: posY,
      positionZ: worldZ,
      rotationX: 0, rotationY: 0, rotationZ: 0,
      scaleX: preset.width || 1,
      scaleY: preset.height || 1,
      scaleZ: preset.depth || 1,
      color: preset.color ?? '#f59e0b',
      opacity: preset.opacity,
      visible: true,
      meshType: (preset.meshType as MeshType) ?? 'box',
      metadata: { presetId: preset.id, presetCode: preset.code },
    };

    setPlacedObjects((prev) => [...prev, localObj]);
    setEditingId(localObj.id);
    setSelectedId(localObj.id);

    const saved = await createSpatialObject({
      siteId: currentSiteId,
      typeId: DEFAULT_TYPE_ID,
      name: localObj.name,
      code: localObj.code,
      positionX: localObj.positionX,
      positionY: localObj.positionY,
      positionZ: localObj.positionZ,
      scaleX: localObj.scaleX,
      scaleY: localObj.scaleY,
      scaleZ: localObj.scaleZ,
      color: localObj.color,
      opacity: localObj.opacity,
      meshType: localObj.meshType,
      metadata: localObj.metadata,
    });

    if (saved) {
      setPlacedObjects((prev) =>
        prev.map((o) =>
          o.id === localObj.id
            ? { ...localObj, id: saved.id, siteId: saved.siteId, typeId: saved.typeId }
            : o,
        ),
      );
      setEditingId(saved.id);
    }
  }, [currentSiteId]);

  // 2D 탑뷰에서 Zone 추가
  const handleAddZoneFromTopView = useCallback((zone: Omit<ZoneConfig, 'id'>) => {
    const newZone: ZoneConfig = {
      ...zone,
      id: crypto.randomUUID(),
    };
    setZones((prev) => [...prev, newZone]);
  }, []);

  // 네이티브 DOM 이벤트로 드래그 감지 (R3F Canvas와의 호환성)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let dragCounter = 0;
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('application/hanvoxel-preset')) {
        dragCounter++;
        setIsDraggingOver(true);
      }
    };
    const handleDragLeave = () => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDraggingOver(false);
      }
    };
    const handleDropNative = () => {
      dragCounter = 0;
      setIsDraggingOver(false);
    };

    wrapper.addEventListener('dragenter', handleDragEnter);
    wrapper.addEventListener('dragleave', handleDragLeave);
    wrapper.addEventListener('drop', handleDropNative);

    return () => {
      wrapper.removeEventListener('dragenter', handleDragEnter);
      wrapper.removeEventListener('dragleave', handleDragLeave);
      wrapper.removeEventListener('drop', handleDropNative);
    };
  }, []);

  // 2D 탑뷰 모드
  if (topViewMode) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <TopViewZoneDrawer
          zones={zones}
          onAddZone={handleAddZoneFromTopView}
          onDeleteZone={handleDeleteZone}
          onClose={() => setTopViewMode(false)}
        />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 3D 캔버스 */}
      <Canvas
        camera={{ position: [30, 20, 35], fov: 60, near: 0.1, far: 500 }}
        shadows
        style={{ background: '#0D1117' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedId(null);
            setEditingId(null);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          // 오브젝트 위 우클릭이 먼저 처리된 경우 빈 공간 메뉴 생략
          if (objectContextMenuRef.current) return;
          openMenu(e);
        }}
        onPointerMove={(e) => {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const nz = ((e.clientY - rect.top) / rect.height) * 2 - 1;
          setCursorPos({ x: nx * 30 + 15, y: 0, z: nz * 25 + 20 });
        }}
      >
        <OrbitControls
          ref={controlsRef}
          makeDefault
          minDistance={5}
          maxDistance={120}
          maxPolarAngle={Math.PI / 2.05}
          enableDamping
          dampingFactor={0.08}
          enabled={!placingPreset && !drawingZoneType}
          rotateSpeed={0.5}
          zoomSpeed={1.2}
        />
        <KeyboardControlsHandler controlsRef={controlsRef} enabled={!placingPreset && !drawingZoneType} />
        <WarehouseScene
          objects={activeObjects}
          selectedId={selectedId}
          onSelect={handleSelect}
          onContextMenu={(obj, e) => {
            e.stopPropagation();
            // 오브젝트 우클릭 플래그 설정 (Canvas 빈 공간 메뉴 방지)
            objectContextMenuRef.current = true;
            setTimeout(() => { objectContextMenuRef.current = false; }, 50);
            openMenu({ clientX: e.clientX, clientY: e.clientY, preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent, obj);
          }}
          placingPreset={placingPreset}
          onPlace={handlePlace}
          zones={zones}
          drawingZoneType={drawingZoneType}
          onZoneDrawComplete={handleZoneDrawComplete}
          onZoneDrawCancel={() => { setDrawingZoneType(null); handleViewModeChange('perspective'); }}
          gridVisible={gridVisible}
          binOccupancy={binOccupancy}
        />
      </Canvas>

      {/* 뷰어 툴바 */}
      <ViewerToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        snapEnabled={snapEnabled}
        onSnapToggle={() => setSnapEnabled((v) => !v)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        layerVisibility={layerVisibility}
        onLayerToggle={handleLayerToggle}
      />

      {/* 좌표 표시 */}
      <CoordinateDisplay x={cursorPos.x} y={cursorPos.y} z={cursorPos.z} />

      {/* 미니맵 */}
      <Minimap objectCount={activeObjects.length} />

      {/* 객체 수 + 저장 상태 */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: '#161B22',
          border: '1px solid #30363D',
          borderRadius: 8,
          fontSize: 12,
          color: '#E6EDF3',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 20,
        }}
      >
        <span style={{ fontWeight: 700, color: '#2D7DD2' }}>{activeObjects.length}</span>
        <span style={{ color: '#8B949E' }}>공간 객체</span>
        {saving && (
          <span style={{ fontSize: 10, color: '#D29922', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#D29922', animation: 'pulse 1s infinite' }} />
            저장 중...
          </span>
        )}
      </div>

      {/* 배치 모드 안내 배너 */}
      {placingPreset && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            background: 'rgba(45, 125, 210, 0.15)',
            border: '1px solid rgba(45, 125, 210, 0.4)',
            borderRadius: 10,
            fontSize: 12,
            color: '#7EB8E0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontWeight: 700, color: '#2D7DD2' }}>{placingPreset.name}</span>
          배치 중 — 클릭하여 위치 확정
          <button
            onClick={() => setPlacingPreset(null)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid #30363D',
              background: '#21262D',
              color: '#8B949E',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
        </div>
      )}

      {/* 우측 패널들 */}
      {/* 카탈로그 토글 버튼 */}
      {!catalogOpen && !editingObject && (
        <button
          onClick={() => setCatalogOpen(true)}
          style={{
            position: 'absolute',
            top: 70,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #30363D',
            background: '#161B22',
            color: '#E6EDF3',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease',
            zIndex: 20,
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2D7DD2';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(45,125,210,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#30363D';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          표준 규격
        </button>
      )}

      {/* 선택된 객체 정보 패널 */}
      {!catalogOpen && !editingObject && (
        <ObjectInfoPanel
          object={selectedObject}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* 치수 편집 패널 */}
      {editingObject && (
        <DimensionEditor
          object={editingObject}
          onUpdate={handleUpdateObject}
          onSavePreset={handleSavePreset}
          onDelete={handleDeleteObject}
          onClose={() => setEditingId(null)}
        />
      )}

      {/* Zone 드로잉 버튼 */}
      {!placingPreset && !drawingZoneType && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            display: 'flex',
            gap: 6,
            zIndex: 20,
          }}
        >
          {(['STORAGE', 'PICKING', 'STAGING', 'SAFETY'] as ZoneType[]).map((type) => {
            const colors: Record<ZoneType, string> = { STORAGE: '#3B82F6', PICKING: '#10B981', STAGING: '#F59E0B', SAFETY: '#EF4444' };
            const labels: Record<ZoneType, string> = { STORAGE: '보관', PICKING: '피킹', STAGING: '스테이징', SAFETY: '안전' };
            return (
              <button
                key={type}
                onClick={() => { setDrawingZoneType(type); handleViewModeChange('top'); }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${colors[type]}40`,
                  background: `${colors[type]}15`,
                  color: colors[type],
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                {labels[type]}
              </button>
            );
          })}
          {/* 2D 탑뷰 모드 버튼 */}
          <button
            onClick={() => setTopViewMode(true)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(45,125,210,0.3)',
              background: 'rgba(45,125,210,0.1)',
              color: '#2D7DD2',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >
            2D 편집
          </button>

          {zones.length > 0 && (
            <button
              onClick={() => setShowZoneList((v) => !v)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #30363D',
                background: '#161B22',
                color: '#E6EDF3',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              구역 {zones.length}
            </button>
          )}
        </div>
      )}

      {/* Zone 드로잉 모드 안내 */}
      {drawingZoneType && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            background: 'rgba(22,27,34,0.95)',
            border: '1px solid #30363D',
            borderRadius: 10,
            fontSize: 12,
            color: '#E6EDF3',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          클릭으로 시작점 → 클릭으로 끝점 지정 (ESC 취소)
          <button
            onClick={() => { setDrawingZoneType(null); handleViewModeChange('perspective'); }}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid #30363D',
              background: '#21262D',
              color: '#8B949E',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            취소
          </button>
        </div>
      )}

      {/* 키보드 단축키 힌트 */}
      <KeyboardHint
        visible={showKeyboardHint}
        onToggle={() => setShowKeyboardHint((v) => !v)}
      />

      {/* 랙 상세 패널 */}
      {selectedRackId && (() => {
        const rack = allObjects.find((o) => o.id === selectedRackId);
        if (!rack) return null;
        return (
          <RackDetailPanel
            rack={rack}
            occupancy={binOccupancy}
            onClose={() => setSelectedRackId(null)}
          />
        );
      })()}

      {/* 우클릭 컨텍스트 메뉴 */}
      <ContextMenu
        object={contextState.object}
        position={contextState.position}
        onClose={closeMenu}
        onEdit={(obj) => { setEditingId(obj.id); setSelectedId(obj.id); }}
        onDuplicate={handleDuplicate}
        onRotate90={handleRotate90}
        onMove={(obj) => { setEditingId(obj.id); setSelectedId(obj.id); }}
        onDelete={handleDeleteObject}
        onResetView={handleResetView}
        onTopView={() => handleViewModeChange('top')}
        onFrontView={() => handleViewModeChange('front')}
        onToggleGrid={() => setGridVisible((v) => !v)}
        gridVisible={gridVisible}
      />

      {/* Zone 목록 패널 */}
      {showZoneList && (
        <ZoneListPanel
          zones={zones}
          onDeleteZone={handleDeleteZone}
          onClose={() => setShowZoneList(false)}
        />
      )}

      {/* 프리셋 카탈로그 */}
      <PresetCatalog
        visible={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      {/* 드래그 앤 드롭 오버레이 — Canvas 위에 투명 드롭 영역 표시 */}
      {isDraggingOver && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            background: 'rgba(45, 125, 210, 0.08)',
            border: '2px dashed rgba(45, 125, 210, 0.5)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              padding: '16px 32px',
              background: 'rgba(22, 27, 34, 0.9)',
              border: '1px solid #2D7DD2',
              borderRadius: 12,
              color: '#7EB8E0',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            여기에 드롭하여 배치
          </div>
        </div>
      )}
    </div>
  );
}
