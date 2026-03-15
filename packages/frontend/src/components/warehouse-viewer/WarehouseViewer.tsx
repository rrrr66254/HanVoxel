import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { WarehouseScene } from './WarehouseScene';
import { DimensionEditor } from './DimensionEditor';
import { EditorTopBar } from './EditorTopBar';
import { EditorLeftSidebar } from './EditorLeftSidebar';
import { EditorBottomBar } from './EditorBottomBar';
import { KeyboardControlsHandler } from './KeyboardControls';
import { ContextMenu, useContextMenu } from './ContextMenu';
import { BinOccupancyRenderer, RackDetailPanel } from './BinPlacement';
import { TopViewZoneDrawer } from './TopViewZoneDrawer';
import type { BinOccupancy } from './BinPlacement';
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
 * 3D 창고 뷰어 — 오늘의집 스타일 레이아웃
 *
 * ┌─────────────────────────────────────────────┐
 * │  EditorTopBar                               │
 * ├────┬────────────────────────────────┬───────┤
 * │ L  │                                │  R    │
 * │ e  │        3D Canvas               │  패널 │
 * │ f  │                                │       │
 * │ t  │                                │       │
 * ├────┴────────────────────────────────┴───────┤
 * │  EditorBottomBar                            │
 * └─────────────────────────────────────────────┘
 */
export function WarehouseViewer({ objects, siteId }: WarehouseViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // BIN 적재 시스템
  const [binOccupancy] = useState<BinOccupancy[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);

  // 2D 탑뷰 Zone 드로잉 모드
  const [topViewMode, setTopViewMode] = useState(false);

  // 그리드 표시 여부
  const [gridVisible, setGridVisible] = useState(false);

  // 드래그 앤 드롭 상태
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 우클릭 컨텍스트 메뉴
  const { contextState, openMenu, closeMenu } = useContextMenu();
  const objectContextMenuRef = useRef(false);

  const controlsRef = useRef<OrbitControlsImpl>(null);

  // 템플릿 객체가 placedObjects에 override된 경우 중복 제거, 삭제된 객체 필터링
  const placedIds = new Set(placedObjects.map((o) => o.id));
  const allObjects = [
    ...objects.filter((o) => !placedIds.has(o.id) && !deletedIds.has(o.id)),
    ...placedObjects.filter((o) => !deletedIds.has(o.id)),
  ];
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

  // 치수 편집 적용
  const handleUpdateObject = useCallback(async (updated: SpatialObject) => {
    setSaving(true);
    setPlacedObjects((prev) => {
      const exists = prev.some((o) => o.id === updated.id);
      if (exists) {
        return prev.map((o) => (o.id === updated.id ? updated : o));
      }
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

  // 오브젝트 삭제
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
    await updateSpatialObject(updatedObj.id, { rotationY: updatedObj.rotationY });
  }, []);

  // 객체 선택
  const handleSelect = useCallback((obj: SpatialObject) => {
    setSelectedId(obj.id);
    setEditingId(obj.id);
    if (obj.type.name === 'RACK') {
      setSelectedRackId(obj.id);
    } else {
      setSelectedRackId(null);
    }
  }, []);

  // 뷰 모드 변경
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
    handleViewModeChange('perspective');
  }, [zones, handleViewModeChange]);

  // Zone 삭제
  const handleDeleteZone = useCallback((id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  }, []);

  // Zone 그리기 시작 (좌측 사이드바에서 호출)
  const handleDrawZone = useCallback((type: ZoneType) => {
    setDrawingZoneType(type);
    handleViewModeChange('top');
  }, [handleViewModeChange]);

  // 드래그 앤 드롭
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/hanvoxel-preset')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const data = e.dataTransfer.getData('application/hanvoxel-preset');
    if (!data) return;

    const preset: SpatialPreset = JSON.parse(data);

    const wrapper = wrapperRef.current;
    const rect = wrapper ? wrapper.getBoundingClientRect() : (e.target as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const nz = ((e.clientY - rect.top) / rect.height) * 2 - 1;
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
      color: null,
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

  // 네이티브 DOM 이벤트로 드래그 감지
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
      <div className="flex h-full w-full flex-col bg-[#0D1117]">
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
    <div className="flex h-full w-full flex-col bg-[#0D1117]">
      {/* 상단 바 */}
      <EditorTopBar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onTopView2D={() => setTopViewMode(true)}
        saving={saving}
        objectCount={activeObjects.length}
      />

      {/* 메인 영역 (사이드바 + 캔버스 + 우측 패널) */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 */}
        <EditorLeftSidebar
          onSelectPreset={handleSelectPreset}
          layerVisibility={layerVisibility}
          onLayerToggle={handleLayerToggle}
          onDrawZone={handleDrawZone}
          zones={zones}
          onDeleteZone={handleDeleteZone}
        />

        {/* 3D 캔버스 영역 */}
        <div
          ref={wrapperRef}
          className="relative flex-1"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
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

          {/* 배치 모드 안내 배너 */}
          {placingPreset && (
            <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-950/80 px-5 py-2.5 text-xs text-blue-300 shadow-lg backdrop-blur">
              <span className="font-bold text-blue-400">{placingPreset.name}</span>
              배치 중 — 클릭하여 위치 확정
              <button
                onClick={() => setPlacingPreset(null)}
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1 text-[11px] text-gray-400 transition-colors hover:bg-gray-700"
              >
                취소
              </button>
            </div>
          )}

          {/* Zone 드로잉 모드 안내 */}
          {drawingZoneType && (
            <div className="absolute bottom-14 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[#2A2F38] bg-[#1A1D24]/95 px-5 py-2.5 text-xs text-gray-300 shadow-lg">
              클릭으로 시작점 → 클릭으로 끝점 지정 (ESC 취소)
              <button
                onClick={() => { setDrawingZoneType(null); handleViewModeChange('perspective'); }}
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1 text-[11px] text-gray-400 transition-colors hover:bg-gray-700"
              >
                취소
              </button>
            </div>
          )}

          {/* 드래그 앤 드롭 오버레이 */}
          {isDraggingOver && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500/50 bg-blue-500/5"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="rounded-xl border border-blue-500 bg-[#1A1D24]/90 px-8 py-4 text-sm font-medium text-blue-300">
                여기에 드롭하여 배치
              </div>
            </div>
          )}

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
        </div>

        {/* 우측 속성 패널 */}
        {editingObject && (
          <div className="w-72 border-l border-[#2A2F38] bg-[#1A1D24]">
            <DimensionEditor
              object={editingObject}
              onUpdate={handleUpdateObject}
              onSavePreset={handleSavePreset}
              onDelete={handleDeleteObject}
              onClose={() => setEditingId(null)}
            />
          </div>
        )}

        {/* 랙 상세 패널 (우측 — DimensionEditor와 함께 표시) */}
        {selectedRackId && !editingObject && (() => {
          const rack = allObjects.find((o) => o.id === selectedRackId);
          if (!rack) return null;
          return (
            <div className="w-64 border-l border-[#2A2F38] bg-[#1A1D24]">
              <RackDetailPanel
                rack={rack}
                occupancy={binOccupancy}
                onClose={() => setSelectedRackId(null)}
              />
            </div>
          );
        })()}
      </div>

      {/* 하단 바 */}
      <EditorBottomBar
        cursorPos={cursorPos}
        gridVisible={gridVisible}
        onToggleGrid={() => setGridVisible((v) => !v)}
        snapEnabled={snapEnabled}
        onSnapToggle={() => setSnapEnabled((v) => !v)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />
    </div>
  );
}
