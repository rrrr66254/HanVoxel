import { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { WarehouseScene } from './WarehouseScene';
import { ObjectInfoPanel } from './ObjectInfoPanel';
import { DimensionEditor } from './DimensionEditor';
import { PresetCatalog } from '../preset-catalog';
import { ViewerToolbar, CoordinateDisplay, Minimap } from './ViewerToolbar';
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

  const controlsRef = useRef<OrbitControlsImpl>(null);

  const allObjects = [...objects, ...placedObjects];
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
        color: placingPreset.color ?? '#f59e0b',
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
    setPlacedObjects((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
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
      if (editingId === id) setEditingId(null);
      if (selectedId === id) setSelectedId(null);
      await deleteSpatialObject(id);
    },
    [editingId, selectedId],
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

  // 객체 선택
  const handleSelect = useCallback((obj: SpatialObject) => {
    setSelectedId(obj.id);
    if (obj.metadata && typeof obj.metadata === 'object' && 'presetId' in obj.metadata) {
      setEditingId(obj.id);
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
          enabled={!placingPreset}
          rotateSpeed={0.5}
          zoomSpeed={1.2}
        />
        <WarehouseScene
          objects={activeObjects}
          selectedId={selectedId}
          onSelect={handleSelect}
          placingPreset={placingPreset}
          onPlace={handlePlace}
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

      {/* 프리셋 카탈로그 */}
      <PresetCatalog
        visible={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSelectPreset={handleSelectPreset}
      />
    </div>
  );
}
