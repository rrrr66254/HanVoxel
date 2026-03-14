import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { WarehouseScene } from './WarehouseScene';
import { ObjectInfoPanel } from './ObjectInfoPanel';
import { DimensionEditor } from './DimensionEditor';
import { PresetCatalog } from '../preset-catalog';
import { createSpatialObject, updateSpatialObject, deleteSpatialObject } from '../../api/spatial-object-api';
import { createSpatialPreset } from '../../api/preset-api';
import type { SpatialObject, MeshType } from '../../types/spatial';
import type { SpatialPreset } from '../../types/preset';

// 기본 siteId / typeId (DB에 해당 레코드 필요 — 없으면 API 실패 시 로컬 유지)
const DEFAULT_SITE_ID = '00000000-0000-4000-a000-000000000001';
const DEFAULT_TYPE_ID = '00000000-0000-4000-a000-000000000002';

// 커스텀 프리셋용 카테고리 ID (RACK 카테고리)
const CUSTOM_PRESET_CATEGORY_ID = '00000000-0000-4000-a000-000000000010';

interface WarehouseViewerProps {
  objects: SpatialObject[];
  siteId?: string;
}

/**
 * 3D 창고 뷰어 — spatial_objects 데이터를 Three.js로 렌더링
 *
 * 기능:
 * - 공간 객체를 타입/상태별 색상으로 3D 렌더링
 * - 마우스 드래그로 카메라 회전, 스크롤로 줌
 * - 객체 클릭 시 상세 정보 패널 표시
 * - 호버 시 라벨 툴팁
 * - 우측 프리셋 카탈로그 패널
 * - 프리셋 카드 클릭 → 고스트 메시로 배치 → 치수 편집 → DB 저장
 */
export function WarehouseViewer({ objects, siteId }: WarehouseViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  // 배치 모드 상태
  const [placingPreset, setPlacingPreset] = useState<SpatialPreset | null>(null);
  const [placedObjects, setPlacedObjects] = useState<SpatialObject[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allObjects = [...objects, ...placedObjects];
  const selectedObject = allObjects.find((o) => o.id === selectedId) ?? null;
  const editingObject = allObjects.find((o) => o.id === editingId) ?? null;
  const activeObjects = allObjects.filter((o) => o.isActive);

  const currentSiteId = siteId ?? DEFAULT_SITE_ID;

  // 프리셋 카드 클릭 → 배치 모드 진입
  const handleSelectPreset = useCallback((preset: SpatialPreset) => {
    setPlacingPreset(preset);
    setCatalogOpen(false);
    setSelectedId(null);
    setEditingId(null);
  }, []);

  // 고스트 메시 배치 확정 → DB 저장 시도
  const handlePlace = useCallback(
    async (position: [number, number, number]) => {
      if (!placingPreset) return;

      const code = `${placingPreset.code}_${Date.now()}`;

      const localObj: SpatialObject = {
        id: crypto.randomUUID(),
        siteId: currentSiteId,
        typeId: DEFAULT_TYPE_ID,
        type: {
          id: DEFAULT_TYPE_ID,
          name: 'RACK',
          label: placingPreset.name,
          description: null,
          depth: 5,
        },
        name: placingPreset.name,
        code,
        status: 'ACTIVE',
        isActive: true,
        positionX: position[0],
        positionY: position[1],
        positionZ: position[2],
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scaleX: placingPreset.width || 1,
        scaleY: placingPreset.height || 1,
        scaleZ: placingPreset.depth || 1,
        color: placingPreset.color ?? '#f59e0b',
        opacity: placingPreset.opacity,
        visible: true,
        meshType: (placingPreset.meshType as MeshType) ?? 'box',
        metadata: { presetId: placingPreset.id, presetCode: placingPreset.code },
      };

      // 즉시 로컬 배치 (낙관적 업데이트)
      setPlacedObjects((prev) => [...prev, localObj]);
      setPlacingPreset(null);
      setEditingId(localObj.id);

      // DB 저장 시도
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
        // DB ID로 교체
        setPlacedObjects((prev) =>
          prev.map((o) =>
            o.id === localObj.id
              ? { ...localObj, id: saved.id, siteId: saved.siteId, typeId: saved.typeId }
              : o,
          ),
        );
        setEditingId(saved.id);
        console.log('[HanVoxel] DB 저장 완료:', saved.id);
      } else {
        console.warn('[HanVoxel] DB 저장 실패 — 로컬 상태로 유지');
      }
    },
    [placingPreset, currentSiteId],
  );

  // 치수 편집 적용 → DB 업데이트
  const handleUpdateObject = useCallback(async (updated: SpatialObject) => {
    setSaving(true);
    setPlacedObjects((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

    await updateSpatialObject(updated.id, {
      name: updated.name,
      positionX: updated.positionX,
      positionY: updated.positionY,
      positionZ: updated.positionZ,
      rotationX: updated.rotationX,
      rotationY: updated.rotationY,
      rotationZ: updated.rotationZ,
      scaleX: updated.scaleX,
      scaleY: updated.scaleY,
      scaleZ: updated.scaleZ,
      color: updated.color,
      opacity: updated.opacity,
      meshType: updated.meshType,
    });

    setSaving(false);
  }, []);

  // 오브젝트 삭제 → DB 소프트 삭제
  const handleDeleteObject = useCallback(
    async (id: string) => {
      setPlacedObjects((prev) => prev.filter((o) => o.id !== id));
      if (editingId === id) setEditingId(null);
      if (selectedId === id) setSelectedId(null);

      await deleteSpatialObject(id);
    },
    [editingId, selectedId],
  );

  // 내 프리셋으로 저장 → POST /api/v1/spatial-presets
  const handleSavePreset = useCallback(async (obj: SpatialObject) => {
    setSaving(true);
    const presetCode = `CUSTOM_${obj.code}`;
    const categoryId = (obj.metadata as Record<string, unknown>)?.presetCategoryId as string | undefined;

    const result = await createSpatialPreset({
      categoryId: categoryId ?? CUSTOM_PRESET_CATEGORY_ID,
      code: presetCode,
      name: `${obj.name} (커스텀)`,
      width: obj.scaleX,
      depth: obj.scaleZ,
      height: obj.scaleY,
      color: obj.color,
      opacity: obj.opacity,
      meshType: obj.meshType,
      metadata: { sourceObjectId: obj.id },
    });

    setSaving(false);

    if (result) {
      alert(`"${obj.name}" 프리셋이 저장되었습니다.`);
    } else {
      alert(`프리셋 저장에 실패했습니다. (API 미연결 시 오프라인 모드)`);
    }
  }, []);

  // 객체 선택 (기존 + 배치된 오브젝트 모두)
  const handleSelect = useCallback((obj: SpatialObject) => {
    setSelectedId(obj.id);
    // 배치된 오브젝트는 바로 편집 모드
    if (obj.metadata && typeof obj.metadata === 'object' && 'presetId' in obj.metadata) {
      setEditingId(obj.id);
    }
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* 3D 캔버스 */}
      <Canvas
        camera={{ position: [20, 15, 20], fov: 50, near: 0.1, far: 500 }}
        style={{ background: '#111827' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedId(null);
            setEditingId(null);
          }
        }}
      >
        <OrbitControls
          makeDefault
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping
          dampingFactor={0.1}
          enabled={!placingPreset}
        />
        <WarehouseScene
          objects={activeObjects}
          selectedId={selectedId}
          onSelect={handleSelect}
          placingPreset={placingPreset}
          onPlace={handlePlace}
        />
      </Canvas>

      {/* 좌측 상단 — 객체 수 + 저장 상태 */}
      <div className="absolute top-4 left-4 rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-2 text-sm text-white backdrop-blur">
        <span className="font-bold">{activeObjects.length}</span>
        <span className="ml-1 text-gray-400">공간 객체</span>
        {saving && <span className="ml-2 text-[10px] text-yellow-400">저장 중...</span>}
      </div>

      {/* 배치 모드 안내 배너 */}
      {placingPreset && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-blue-500/50 bg-blue-900/80 px-4 py-2 text-xs text-blue-200 backdrop-blur">
          <span className="font-semibold">{placingPreset.name}</span> 배치 중 — 클릭하여 위치 확정
          <button
            onClick={() => setPlacingPreset(null)}
            className="ml-3 rounded bg-gray-700 px-2 py-0.5 text-gray-300 hover:bg-gray-600"
          >
            취소
          </button>
        </div>
      )}

      {/* 우측 상단 — 카탈로그 토글 버튼 */}
      {!catalogOpen && !editingObject && (
        <button
          onClick={() => setCatalogOpen(true)}
          className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-2 text-xs text-white backdrop-blur transition-colors hover:border-blue-500 hover:bg-gray-800"
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

      {/* 선택된 객체 정보 패널 (카탈로그·에디터 닫혀있을 때만) */}
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

      {/* 프리셋 카탈로그 패널 */}
      <PresetCatalog
        visible={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSelectPreset={handleSelectPreset}
      />
    </div>
  );
}
