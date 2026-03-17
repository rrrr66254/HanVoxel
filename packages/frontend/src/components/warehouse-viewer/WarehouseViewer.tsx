import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { WarehouseScene } from './WarehouseScene';
import { ObjectEditor } from './ObjectEditor';
import { RackDetailPanel } from './RackDetailPanel';
import { EditorTopBar } from './EditorTopBar';
import { EditorLeftSidebar } from './EditorLeftSidebar';
import { EditorBottomBar } from './EditorBottomBar';
import { KeyboardControlsHandler } from './KeyboardControls';
import { ContextMenu, useContextMenu } from './ContextMenu';
import { BinOccupancyRenderer } from './BinPlacement';
import { MoveModeGhost } from './MoveMode';
import { TopViewZoneDrawer } from './TopViewZoneDrawer';
import type { BinOccupancy } from './BinPlacement';
import type { ZoneConfig, ZoneType } from './ZoneDrawing';
import { createSpatialObject, updateSpatialObject, deleteSpatialObject } from '../../api/spatial-object-api';
import { createSpatialPreset } from '../../api/preset-api';
import type { SpatialObject, MeshType } from '../../types/spatial';
import type { SpatialPreset } from '../../types/preset';

// 바닥 위치 충돌 검사 (비우기 시 사용)
function checkFloorCollision(
  x: number, y: number, z: number,
  width: number, height: number, depth: number,
  allObjects: SpatialObject[],
  excludeId?: string,
): boolean {
  const margin = 0.05;
  const minX = x - width / 2;
  const maxX = x + width / 2;
  const minY = y - height / 2;
  const maxY = y + height / 2;
  const minZ = z - depth / 2;
  const maxZ = z + depth / 2;

  for (const obj of allObjects) {
    if (obj.id === excludeId || !obj.isActive) continue;
    const tn = obj.type.name;
    // 바닥/통로/구역 제외
    if (tn === 'FLOOR' || tn === 'AISLE' || tn === 'ZONE' || tn === 'SAFETY_ZONE') continue;
    const oMeta = obj.metadata as Record<string, unknown> | null;
    if (oMeta?.floorStyle || oMeta?.aisleType) continue;

    const oMinX = obj.positionX - obj.scaleX / 2;
    const oMaxX = obj.positionX + obj.scaleX / 2;
    const oMinY = obj.positionY - obj.scaleY / 2;
    const oMaxY = obj.positionY + obj.scaleY / 2;
    const oMinZ = obj.positionZ - obj.scaleZ / 2;
    const oMaxZ = obj.positionZ + obj.scaleZ / 2;

    if (minX < oMaxX - margin && maxX > oMinX + margin &&
        minY < oMaxY - margin && maxY > oMinY + margin &&
        minZ < oMaxZ - margin && maxZ > oMinZ + margin) {
      return true;
    }
  }
  return false;
}

// 프리셋에서 스타일 메타데이터 추출 (통로/바닥/벽)
function extractStyleMeta(preset: SpatialPreset): Record<string, unknown> {
  const extra = preset as unknown as Record<string, unknown>;
  const meta: Record<string, unknown> = {};
  if (extra.aisleType) meta.aisleType = extra.aisleType;
  if (extra.floorStyle) meta.floorStyle = extra.floorStyle;
  if (extra.wallStyle) meta.wallStyle = extra.wallStyle;
  if (extra.doorStyle) meta.doorStyle = extra.doorStyle;
  // 컨테이너 타입 메타데이터 (프리셋 metadata에서 가져오거나 코드에서 추출)
  const presetMeta = extra.metadata as Record<string, unknown> | undefined;
  if (presetMeta?.type) {
    meta.type = presetMeta.type;
  } else {
    const code = (preset.code ?? '').toUpperCase();
    if (code.includes('REEFER')) meta.type = 'REEFER';
    else if (code.includes('HC_45FT')) meta.type = 'DRY_45FT';
    else if (code.includes('HC_40FT')) meta.type = 'DRY_40FT';
    else if (code.includes('40FT')) meta.type = 'DRY_40FT';
    else if (code.includes('20FT')) meta.type = 'DRY_20FT';
    else if (code.includes('OPEN')) meta.type = 'OPEN_TOP';
    else if (code.includes('FLATRACK')) meta.type = 'FLAT_RACK';
    else if (code.includes('TANK')) meta.type = 'TANK';
  }
  // 장비/안전/시설물 메타데이터 (프리셋 metadata에서 추출)
  if (presetMeta?.equipType) meta.equipType = presetMeta.equipType;
  if (presetMeta?.safetyType) meta.safetyType = presetMeta.safetyType;
  if (presetMeta?.facilityType) meta.facilityType = presetMeta.facilityType;
  // 벽 부착 메타데이터
  if (presetMeta?.wallMounted) meta.wallMounted = true;
  if (presetMeta?.mountHeight) meta.mountHeight = presetMeta.mountHeight;
  return meta;
}

// 기본 siteId / typeId
const DEFAULT_SITE_ID = '00000000-0000-4000-a000-000000000001';
const DEFAULT_TYPE_ID = '00000000-0000-4000-a000-000000000002';
const CUSTOM_PRESET_CATEGORY_ID = '00000000-0000-4000-a000-000000000010';

type ToolMode = 'select' | 'move' | 'rotate' | 'delete';
type ViewMode = 'perspective' | 'top' | 'front';

// 우측 패널 모드
type RightPanelMode = 'none' | 'editor' | 'rackDetail';

interface WarehouseViewerProps {
  objects: SpatialObject[];
  siteId?: string;
  onSave?: () => void;
  onBack?: () => void;
}

/**
 * 3D 창고 뷰어 — 오늘의집 스타일 + 이동 모드 + 더블클릭 상세
 */
export function WarehouseViewer({ objects, siteId, onSave, onBack }: WarehouseViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placingPreset, setPlacingPreset] = useState<SpatialPreset | null>(null);
  const [placedObjects, setPlacedObjects] = useState<SpatialObject[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // 우측 패널 모드
  const [rightPanel, setRightPanel] = useState<RightPanelMode>('none');
  const [rackDetailId, setRackDetailId] = useState<string | null>(null);

  // 이동 모드
  const [movingObjectId, setMovingObjectId] = useState<string | null>(null);
  const [originalPosition, setOriginalPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  // 토스트 메시지 (배치 차단 시)
  const [toast, setToast] = useState<{ message: string; time: number } | null>(null);
  const handleBlockedToast = useCallback((message: string) => {
    setToast({ message, time: Date.now() });
  }, []);

  // 토스트 자동 소멸 (3초)
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 뷰어 상태
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, z: 0 });
  const [layerVisibility, setLayerVisibility] = useState({ racks: true, aisles: true, zones: true });

  // 편집 레이어 모드: 'structure'(바닥/벽) vs 'objects'(랙/팔레트/박스 등)
  type EditLayerMode = 'structure' | 'objects';
  const [editLayer, setEditLayer] = useState<EditLayerMode>('objects');

  // Zone 시스템 상태
  const [zones, setZones] = useState<ZoneConfig[]>([]);
  const [drawingZoneType, setDrawingZoneType] = useState<ZoneType | null>(null);

  // BIN 적재 시스템
  const [binOccupancy, setBinOccupancy] = useState<BinOccupancy[]>([]);

  // 2D 탑뷰 / 그리드
  const [topViewMode, setTopViewMode] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);

  // 드래그 앤 드롭
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 우클릭 컨텍스트 메뉴
  const { contextState, openMenu, closeMenu } = useContextMenu();
  const objectContextMenuRef = useRef(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // (더블클릭은 NativeDoubleClickHandler에서 네이티브로 처리)

  // 포인터 이벤트 추적 (클릭 vs 드래그 구분, 5px 임계값)
  const pointerDownPosRef = useRef<{ x: number; y: number; button: number } | null>(null);
  const wasDragRef = useRef(false);

  // 전체 오브젝트 목록
  const placedIds = new Set(placedObjects.map((o) => o.id));
  const allObjects = [
    ...objects.filter((o) => !placedIds.has(o.id) && !deletedIds.has(o.id)),
    ...placedObjects.filter((o) => !deletedIds.has(o.id)),
  ];
  const editingObject = allObjects.find((o) => o.id === editingId) ?? null;
  const rackDetailObject = allObjects.find((o) => o.id === rackDetailId) ?? null;
  const movingObject = allObjects.find((o) => o.id === movingObjectId) ?? null;

  // 활성 객체 (이동 중인 객체 제외)
  const activeObjects = allObjects.filter((o) => {
    if (!o.isActive) return false;
    if (o.id === movingObjectId) return false; // 이동 중이면 원래 위치 숨김
    const typeName = o.type.name;
    if (!layerVisibility.racks && typeName === 'RACK') return false;
    if (!layerVisibility.aisles && typeName === 'AISLE') return false;
    if (!layerVisibility.zones && (typeName === 'ZONE' || typeName === 'SAFETY_ZONE')) return false;
    return true;
  });

  // 랙 목록 (이동 모드 BIN 스냅용)
  const rackObjects = allObjects.filter((o) => o.type.name === 'RACK' && o.isActive);

  const currentSiteId = siteId ?? DEFAULT_SITE_ID;
  const isMoving = movingObjectId !== null;

  // === 이동 모드 핸들러 ===
  const handleStartMove = useCallback((obj: SpatialObject) => {
    setMovingObjectId(obj.id);
    setOriginalPosition({ x: obj.positionX, y: obj.positionY, z: obj.positionZ });
    setEditingId(null);
    setRightPanel('none');
    setRackDetailId(null);
  }, []);

  const handleMoveDrop = useCallback(async (obj: SpatialObject, newPos: THREE.Vector3) => {
    const updated: SpatialObject = { ...obj, positionX: newPos.x, positionY: newPos.y, positionZ: newPos.z };
    setPlacedObjects((prev) => {
      const exists = prev.some((o) => o.id === updated.id);
      if (exists) return prev.map((o) => (o.id === updated.id ? updated : o));
      return [...prev, updated];
    });
    setMovingObjectId(null);
    setOriginalPosition(null);
    await updateSpatialObject(updated.id, { positionX: newPos.x, positionY: newPos.y, positionZ: newPos.z });
  }, []);

  const handleMoveDropToBin = useCallback(async (obj: SpatialObject, bin: BinOccupancy) => {
    setBinOccupancy((prev) => [...prev, bin]);
    // 바닥에서 이동한 경우 원본 삭제
    setPlacedObjects((prev) => prev.filter((o) => o.id !== obj.id));
    setDeletedIds((prev) => new Set(prev).add(obj.id));
    setMovingObjectId(null);
    setOriginalPosition(null);
    await deleteSpatialObject(obj.id);
  }, []);

  const handleMoveCancel = useCallback(() => {
    setMovingObjectId(null);
    setOriginalPosition(null);
  }, []);

  // === R3F onClick — 선택만 처리 (편집 패널은 더블클릭에서) ===
  const handleSelect = useCallback((obj: SpatialObject) => {
    if (isMoving || wasDragRef.current) return;
    setSelectedId(obj.id);
  }, [isMoving]);

  // === 더블클릭 콜백 (NativeDoubleClickHandler에서 호출) ===
  const handleNativeDoubleClick = useCallback((objectId: string) => {
    const obj = allObjects.find((o) => o.id === objectId);
    if (!obj) return;

    const meta = obj.metadata as Record<string, unknown> | null;
    const isRack = obj.type.name === 'RACK' && meta?.levels;

    console.log('[HanVoxel] 더블클릭 감지 ->', obj.name, obj.type.name, isRack ? '-> RackDetailPanel' : '-> ObjectEditor');

    if (isRack) {
      setRackDetailId(obj.id);
      setRightPanel('rackDetail');
      setEditingId(null);
      setSelectedId(obj.id);
    } else {
      setEditingId(obj.id);
      setRightPanel('editor');
      setRackDetailId(null);
      setSelectedId(obj.id);
    }
  }, [allObjects]);

  // === 싱글클릭 콜백 (NativeDoubleClickHandler에서 호출) ===
  const handleNativeSingleClick = useCallback((objectId: string) => {
    console.log('[HanVoxel] 싱글클릭 감지 ->', objectId);
    setSelectedId(objectId);
    setEditingId(objectId);
    setRightPanel('editor');
    setRackDetailId(null);
  }, []);

  // === 프리셋 카테고리 → 타입 매핑 ===
  const getTypeFromPreset = useCallback((preset: SpatialPreset): { name: SpatialObject['type']['name']; itemType?: string } => {
    const catName = preset.category?.name?.toUpperCase() ?? '';
    const code = preset.code?.toUpperCase() ?? '';
    // 랙: levels가 있는 프리셋
    if (preset.levels && preset.levels > 0) return { name: 'RACK' };
    if (catName.includes('RACK')) return { name: 'RACK' };
    // 팔레트
    if (catName.includes('PALLET') || code.includes('PALLET') || code.startsWith('T11') || code.startsWith('T12') || code.startsWith('T08') || code.startsWith('ISO_')) return { name: 'BIN', itemType: 'pallet' };
    // 제품 박스
    if (catName.includes('BOX') || catName.includes('PRODUCT') || code.includes('BOX') || code.includes('FOOD') || code.includes('AUTO') || code.includes('PHARMA') || code.includes('CHEMICAL') || code.includes('ELECTRONICS') || code.includes('GENERAL') || code.includes('COLD')) return { name: 'BIN', itemType: 'box' };
    // 컨테이너 → ZONE 타입 + metadata.type으로 컨테이너 렌더링
    if (catName.includes('CONTAINER') || code.includes('FT') || code.includes('REEFER')) return { name: 'ZONE', itemType: 'container' };
    // 통로
    if (catName.includes('AISLE') || code.includes('AISLE')) return { name: 'AISLE' };
    // 바닥
    if (catName.includes('FLOOR') || code.includes('FLOOR')) return { name: 'FLOOR' };
    // 벽
    if (catName.includes('WALL') || code.includes('WALL')) return { name: 'WALL' };
    // 출입문
    if (catName.includes('DOOR') || code.includes('DOOR')) return { name: 'WALL' };
    // 작업 장비
    if (catName.includes('EQUIPMENT') || code.includes('EQUIP')) return { name: 'WORKSTATION', itemType: 'equipment' };
    // 안전·소방
    if (catName.includes('SAFETY') || code.includes('SAFETY')) return { name: 'WORKSTATION', itemType: 'safety' };
    // 시설물
    if (catName.includes('FACILITY') || code.includes('FACILITY')) return { name: 'WORKSTATION', itemType: 'facility' };
    return { name: 'RACK' };
  }, []);

  // === 프리셋 배치 ===
  const handleSelectPreset = useCallback((preset: SpatialPreset) => {
    setPlacingPreset(preset);
    setSelectedId(null);
    setEditingId(null);
    setRightPanel('none');
  }, []);

  const handlePlace = useCallback(async (position: [number, number, number], rotationY?: number) => {
    if (!placingPreset) return;
    const code = `${placingPreset.code}_${Date.now()}`;
    const typeInfo = getTypeFromPreset(placingPreset);
    const localObj: SpatialObject = {
      id: crypto.randomUUID(), siteId: currentSiteId, typeId: DEFAULT_TYPE_ID,
      type: { id: DEFAULT_TYPE_ID, name: typeInfo.name, label: placingPreset.name, description: null, depth: 5 },
      name: placingPreset.name, code, status: 'ACTIVE', isActive: true,
      positionX: position[0], positionY: position[1], positionZ: position[2],
      rotationX: 0, rotationY: rotationY ?? 0, rotationZ: 0,
      scaleX: placingPreset.width || 1, scaleY: placingPreset.height || 1, scaleZ: placingPreset.depth || 1,
      color: typeInfo.itemType === 'container' ? null : (placingPreset.color ?? null),
      opacity: placingPreset.opacity, visible: true,
      meshType: (placingPreset.meshType as MeshType) ?? 'box',
      metadata: {
        presetId: placingPreset.id, presetCode: placingPreset.code,
        levels: placingPreset.levels, levelHeight: placingPreset.levelHeight, loadPerLevel: placingPreset.loadPerLevel,
        ...(typeInfo.itemType ? { itemType: typeInfo.itemType } : {}),
        // 통로/바닥/벽 스타일 메타데이터 전달
        ...extractStyleMeta(placingPreset),
      },
    };
    // 출입문 배치 시 — 벽 자동 분할 (벽에 개구부 생성)
    const styleMeta = extractStyleMeta(placingPreset);
    const isDoorPlacement = !!styleMeta.doorStyle;
    const newWallSegments: SpatialObject[] = [];

    if (isDoorPlacement) {
      const allObjects = [...(objects ?? []), ...placedObjects];
      const doorW = localObj.scaleX;
      const doorH = localObj.scaleY;
      const doorX = localObj.positionX;
      const doorZ = localObj.positionZ;
      const doorRotY = localObj.rotationY;

      for (const wall of allObjects) {
        const wMeta = wall.metadata as Record<string, unknown> | null;
        if (!wMeta?.wallStyle) continue;
        const wRotY = wall.rotationY;
        const isXAligned = Math.abs(Math.sin(wRotY)) < 0.5;
        const wallIsParallel = Math.abs(Math.sin(wRotY) - Math.sin(doorRotY)) < 0.3 ||
          Math.abs(Math.sin(wRotY) + Math.sin(doorRotY)) < 0.3;
        if (!wallIsParallel) continue;

        // 벽의 길이 방향에서 문 위치 체크
        if (isXAligned) {
          const wallLeft = wall.positionX - wall.scaleX / 2;
          const wallRight = wall.positionX + wall.scaleX / 2;
          const doorLeft = doorX - doorW / 2;
          const doorRight = doorX + doorW / 2;
          // Z 근접 확인
          if (Math.abs(wall.positionZ - doorZ) > wall.scaleZ + 0.5) continue;
          if (doorLeft <= wallLeft && doorRight >= wallRight) continue; // 문이 벽보다 큼
          if (doorRight <= wallLeft || doorLeft >= wallRight) continue; // 겹치지 않음

          // 벽을 좌/우 두 조각으로 분할
          const leftW = Math.max(0, doorLeft - wallLeft);
          const rightW = Math.max(0, wallRight - doorRight);

          // 기존 벽 제거 → 새 조각 추가
          setPlacedObjects((prev) => prev.filter((o) => o.id !== wall.id));

          if (leftW > 0.1) {
            const leftSeg: SpatialObject = {
              ...wall, id: crypto.randomUUID(), code: `${wall.code}_L`,
              positionX: wallLeft + leftW / 2,
              scaleX: leftW,
            };
            newWallSegments.push(leftSeg);
          }
          if (rightW > 0.1) {
            const rightSeg: SpatialObject = {
              ...wall, id: crypto.randomUUID(), code: `${wall.code}_R`,
              positionX: doorRight + rightW / 2,
              scaleX: rightW,
            };
            newWallSegments.push(rightSeg);
          }
          // 문 상단 벽 조각 (문 높이 위에 남은 벽)
          if (wall.scaleY > doorH + 0.1) {
            const topH = wall.scaleY - doorH;
            const topSeg: SpatialObject = {
              ...wall, id: crypto.randomUUID(), code: `${wall.code}_T`,
              positionX: doorX,
              positionY: wall.positionY + (wall.scaleY - topH) / 2,
              scaleX: doorW,
              scaleY: topH,
            };
            newWallSegments.push(topSeg);
          }
          break; // 한 벽만 분할
        } else {
          // Z축 방향 벽
          const wallTop = wall.positionZ - wall.scaleX / 2;
          const wallBottom = wall.positionZ + wall.scaleX / 2;
          const doorTop = doorZ - doorW / 2;
          const doorBottom = doorZ + doorW / 2;
          if (Math.abs(wall.positionX - doorX) > wall.scaleZ + 0.5) continue;
          if (doorTop <= wallTop && doorBottom >= wallBottom) continue;
          if (doorBottom <= wallTop || doorTop >= wallBottom) continue;

          const topW = Math.max(0, doorTop - wallTop);
          const bottomW = Math.max(0, wallBottom - doorBottom);

          setPlacedObjects((prev) => prev.filter((o) => o.id !== wall.id));

          if (topW > 0.1) {
            const topSeg: SpatialObject = {
              ...wall, id: crypto.randomUUID(), code: `${wall.code}_L`,
              positionZ: wallTop + topW / 2,
              scaleX: topW,
            };
            newWallSegments.push(topSeg);
          }
          if (bottomW > 0.1) {
            const bottomSeg: SpatialObject = {
              ...wall, id: crypto.randomUUID(), code: `${wall.code}_R`,
              positionZ: doorBottom + bottomW / 2,
              scaleX: bottomW,
            };
            newWallSegments.push(bottomSeg);
          }
          if (wall.scaleY > doorH + 0.1) {
            const topH = wall.scaleY - doorH;
            const topSegAbove: SpatialObject = {
              ...wall, id: crypto.randomUUID(), code: `${wall.code}_T`,
              positionZ: doorZ,
              positionY: wall.positionY + (wall.scaleY - topH) / 2,
              scaleX: doorW,
              scaleY: topH,
            };
            newWallSegments.push(topSegAbove);
          }
          break;
        }
      }
    }

    setPlacedObjects((prev) => [...prev, localObj, ...newWallSegments]);
    setPlacingPreset(null);
    setEditingId(localObj.id);
    setRightPanel('editor');

    const saved = await createSpatialObject({
      siteId: currentSiteId, typeId: DEFAULT_TYPE_ID, name: localObj.name, code: localObj.code,
      positionX: localObj.positionX, positionY: localObj.positionY, positionZ: localObj.positionZ,
      rotationY: localObj.rotationY,
      scaleX: localObj.scaleX, scaleY: localObj.scaleY, scaleZ: localObj.scaleZ,
      color: localObj.color, opacity: localObj.opacity, meshType: localObj.meshType, metadata: localObj.metadata,
    });
    if (saved) {
      setPlacedObjects((prev) => prev.map((o) => o.id === localObj.id ? { ...localObj, id: saved.id, siteId: saved.siteId, typeId: saved.typeId } : o));
      setEditingId(saved.id);
    }
  }, [placingPreset, currentSiteId, objects, placedObjects]);

  // === 오브젝트 CRUD ===
  // 로컬 프리뷰 업데이트 (DB 저장 없이 실시간 반영)
  const handlePreviewUpdate = useCallback((updated: SpatialObject) => {
    setPlacedObjects((prev) => {
      const exists = prev.some((o) => o.id === updated.id);
      if (exists) return prev.map((o) => (o.id === updated.id ? updated : o));
      return [...prev, updated];
    });
  }, []);

  const handleUpdateObject = useCallback(async (updated: SpatialObject) => {
    setSaving(true);
    setPlacedObjects((prev) => {
      const exists = prev.some((o) => o.id === updated.id);
      if (exists) return prev.map((o) => (o.id === updated.id ? updated : o));
      return [...prev, updated];
    });
    await updateSpatialObject(updated.id, {
      name: updated.name,
      positionX: updated.positionX, positionY: updated.positionY, positionZ: updated.positionZ,
      rotationX: updated.rotationX, rotationY: updated.rotationY, rotationZ: updated.rotationZ,
      scaleX: updated.scaleX, scaleY: updated.scaleY, scaleZ: updated.scaleZ,
      color: updated.color, opacity: updated.opacity, meshType: updated.meshType,
      metadata: updated.metadata,
    });
    setSaving(false);
  }, []);

  const handleDeleteObject = useCallback(async (id: string) => {
    setPlacedObjects((prev) => prev.filter((o) => o.id !== id));
    setDeletedIds((prev) => new Set(prev).add(id));
    if (editingId === id) { setEditingId(null); setRightPanel('none'); }
    if (selectedId === id) setSelectedId(null);
    if (rackDetailId === id) { setRackDetailId(null); setRightPanel('none'); }
    await deleteSpatialObject(id);
  }, [editingId, selectedId, rackDetailId]);

  const handleSavePreset = useCallback(async (obj: SpatialObject) => {
    setSaving(true);
    const presetCode = `CUSTOM_${obj.code}`;
    const categoryId = (obj.metadata as Record<string, unknown>)?.presetCategoryId as string | undefined;
    const result = await createSpatialPreset({
      categoryId: categoryId ?? CUSTOM_PRESET_CATEGORY_ID, code: presetCode, name: `${obj.name} (커스텀)`,
      width: obj.scaleX, depth: obj.scaleZ, height: obj.scaleY,
      color: obj.color, opacity: obj.opacity, meshType: obj.meshType, metadata: { sourceObjectId: obj.id },
    });
    setSaving(false);
    if (result) alert(`"${obj.name}" 프리셋이 저장되었습니다.`);
    else alert(`프리셋 저장에 실패했습니다.`);
  }, []);

  const handleDuplicate = useCallback(async (obj: SpatialObject) => {
    const newObj: SpatialObject = { ...obj, id: crypto.randomUUID(), name: `${obj.name} (복사)`, code: `${obj.code}_COPY_${Date.now()}`, positionX: obj.positionX + 3, positionZ: obj.positionZ + 3 };
    setPlacedObjects((prev) => [...prev, newObj]);
    setEditingId(newObj.id); setSelectedId(newObj.id); setRightPanel('editor');
    await createSpatialObject({ siteId: newObj.siteId, typeId: newObj.typeId, name: newObj.name, code: newObj.code, positionX: newObj.positionX, positionY: newObj.positionY, positionZ: newObj.positionZ, scaleX: newObj.scaleX, scaleY: newObj.scaleY, scaleZ: newObj.scaleZ, color: newObj.color, opacity: newObj.opacity, meshType: newObj.meshType, metadata: newObj.metadata });
  }, []);

  const handleRotate90 = useCallback(async (obj: SpatialObject) => {
    // 90도 회전 시 폭(X)과 깊이(Z)를 스왑 — 랙에 맞게 방향 전환
    const updatedObj: SpatialObject = {
      ...obj,
      rotationY: obj.rotationY + Math.PI / 2,
      scaleX: obj.scaleZ,
      scaleZ: obj.scaleX,
    };
    setPlacedObjects((prev) => prev.map((o) => (o.id === updatedObj.id ? updatedObj : o)));
    await updateSpatialObject(updatedObj.id, { rotationY: updatedObj.rotationY, scaleX: updatedObj.scaleX, scaleZ: updatedObj.scaleZ });
  }, []);

  // BIN 아이템 제거 — 랙 앞 바닥에 배출 (충돌 시 복귀 + 경고)
  const handleRemoveBinItem = useCallback((rackId: string, level: number) => {
    const binItem = binOccupancy.find((o) => o.rackId === rackId && o.level === level);
    if (!binItem) return;

    // 해당 랙 찾기
    const allObjs = [...(objects ?? []), ...placedObjects];
    const rack = allObjs.find((o) => o.id === rackId);
    if (!rack) {
      setBinOccupancy((prev) => prev.filter((o) => !(o.rackId === rackId && o.level === level)));
      return;
    }

    // 랙 앞 바닥 위치 계산 (랙 전면 + 아이템 깊이/2 여유)
    const frontZ = rack.positionZ - rack.scaleZ / 2 - binItem.depth / 2 - 0.2;
    const floorX = rack.positionX;
    const floorY = binItem.height / 2;

    // 충돌 검사 — 바닥 위치에 다른 오브젝트가 있는지 확인
    const hasCollision = checkFloorCollision(floorX, floorY, frontZ, binItem.width, binItem.height, binItem.depth, allObjs, rackId);

    if (hasCollision) {
      // 충돌 — 복귀 + 경고
      handleBlockedToast('랙 앞에 물건이 있습니다. 비우기 전에 앞쪽을 치워주세요.');
      return;
    }

    // 충돌 없음 — 바닥에 새 오브젝트 생성
    const newObj: SpatialObject = {
      id: crypto.randomUUID(),
      siteId: currentSiteId,
      typeId: DEFAULT_TYPE_ID,
      type: { id: DEFAULT_TYPE_ID, name: 'BIN', label: binItem.itemName, description: null, depth: 5 },
      name: binItem.itemName,
      code: `${binItem.presetCode ?? 'BIN'}_${Date.now()}`,
      status: 'ACTIVE',
      isActive: true,
      positionX: floorX,
      positionY: floorY,
      positionZ: frontZ,
      rotationX: 0, rotationY: 0, rotationZ: 0,
      scaleX: binItem.width,
      scaleY: binItem.height,
      scaleZ: binItem.depth,
      color: binItem.itemColor,
      opacity: 1,
      visible: true,
      meshType: 'box',
      metadata: {
        itemType: binItem.itemType,
        presetCode: binItem.presetCode,
        ...(binItem.itemMetadata ?? {}),
      },
    };

    // BIN에서 제거 + 바닥에 추가
    setBinOccupancy((prev) => prev.filter((o) => !(o.rackId === rackId && o.level === level)));
    setPlacedObjects((prev) => [...prev, newObj]);

    // DB에 저장
    createSpatialObject({
      siteId: newObj.siteId, typeId: newObj.typeId, name: newObj.name, code: newObj.code,
      positionX: newObj.positionX, positionY: newObj.positionY, positionZ: newObj.positionZ,
      scaleX: newObj.scaleX, scaleY: newObj.scaleY, scaleZ: newObj.scaleZ,
      color: newObj.color, opacity: newObj.opacity, meshType: newObj.meshType, metadata: newObj.metadata,
    });
  }, [binOccupancy, objects, placedObjects, currentSiteId]);

  // === 뷰 모드 / 줌 ===
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    const controls = controlsRef.current;
    if (!controls) return;
    const target = new THREE.Vector3(15, 0, 20);
    controls.target.copy(target);
    switch (mode) {
      case 'top': controls.object.position.set(15, 50, 20); break;
      case 'front': controls.object.position.set(15, 5, -15); break;
      default: controls.object.position.set(30, 20, 35); break;
    }
    controls.update();
  }, []);

  const handleZoomIn = useCallback(() => { const c = controlsRef.current; if (!c) return; const d = new THREE.Vector3().subVectors(c.target, c.object.position).normalize(); c.object.position.addScaledVector(d, 5); c.update(); }, []);
  const handleZoomOut = useCallback(() => { const c = controlsRef.current; if (!c) return; const d = new THREE.Vector3().subVectors(c.target, c.object.position).normalize(); c.object.position.addScaledVector(d, -5); c.update(); }, []);
  const handleResetView = useCallback(() => { handleViewModeChange('perspective'); }, [handleViewModeChange]);
  const handleLayerToggle = useCallback((layer: 'racks' | 'aisles' | 'zones') => { setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] })); }, []);

  // === Zone 관련 ===
  const handleZoneDrawComplete = useCallback((zone: Omit<ZoneConfig, 'id' | 'name'>) => {
    const ZONE_LABELS: Record<ZoneType, string> = { STORAGE: '보관 구역', PICKING: '피킹 구역', STAGING: '스테이징', SAFETY: '안전 구역' };
    const newZone: ZoneConfig = { ...zone, id: crypto.randomUUID(), name: `${ZONE_LABELS[zone.type]} ${zones.filter((z) => z.type === zone.type).length + 1}` };
    setZones((prev) => [...prev, newZone]); setDrawingZoneType(null); handleViewModeChange('perspective');
  }, [zones, handleViewModeChange]);

  const handleDeleteZone = useCallback((id: string) => { setZones((prev) => prev.filter((z) => z.id !== id)); }, []);
  const handleDrawZone = useCallback((type: ZoneType) => { setDrawingZoneType(type); handleViewModeChange('top'); }, [handleViewModeChange]);

  // === 드래그 앤 드롭 ===
  const handleDragOver = useCallback((e: React.DragEvent) => { if (e.dataTransfer.types.includes('application/hanvoxel-preset')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingOver(false);
    const data = e.dataTransfer.getData('application/hanvoxel-preset');
    if (!data) return;
    const preset: SpatialPreset = JSON.parse(data);
    const wrapper = wrapperRef.current;
    const rect = wrapper ? wrapper.getBoundingClientRect() : (e.target as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const nz = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const worldX = Math.round(nx * 30 + 15); const worldZ = Math.round(nz * 25 + 20);
    const dropExtra = preset as unknown as Record<string, unknown>;
    const isDropFloor = dropExtra.floorStyle !== undefined || preset.code?.includes('FLOOR');
    const isDropAisle = dropExtra.aisleType !== undefined || preset.code?.includes('AISLE');
    const posY = (isDropFloor || isDropAisle) ? 0.01 : (preset.height || 1) / 2;
    const code = `${preset.code}_${Date.now()}`;
    const dropTypeInfo = getTypeFromPreset(preset);
    const localObj: SpatialObject = {
      id: crypto.randomUUID(), siteId: currentSiteId, typeId: DEFAULT_TYPE_ID,
      type: { id: DEFAULT_TYPE_ID, name: dropTypeInfo.name, label: preset.name, description: null, depth: 5 },
      name: preset.name, code, status: 'ACTIVE', isActive: true,
      positionX: worldX, positionY: posY, positionZ: worldZ,
      rotationX: 0, rotationY: 0, rotationZ: 0,
      scaleX: preset.width || 1, scaleY: preset.height || 1, scaleZ: preset.depth || 1,
      color: dropTypeInfo.itemType === 'container' ? null : (preset.color ?? null),
      opacity: preset.opacity, visible: true, meshType: (preset.meshType as MeshType) ?? 'box',
      metadata: { presetId: preset.id, presetCode: preset.code, ...(dropTypeInfo.itemType ? { itemType: dropTypeInfo.itemType } : {}), ...extractStyleMeta(preset) },
    };
    setPlacedObjects((prev) => [...prev, localObj]); setEditingId(localObj.id); setSelectedId(localObj.id); setRightPanel('editor');
    const saved = await createSpatialObject({ siteId: currentSiteId, typeId: DEFAULT_TYPE_ID, name: localObj.name, code: localObj.code, positionX: localObj.positionX, positionY: localObj.positionY, positionZ: localObj.positionZ, scaleX: localObj.scaleX, scaleY: localObj.scaleY, scaleZ: localObj.scaleZ, color: localObj.color, opacity: localObj.opacity, meshType: localObj.meshType, metadata: localObj.metadata });
    if (saved) { setPlacedObjects((prev) => prev.map((o) => o.id === localObj.id ? { ...localObj, id: saved.id, siteId: saved.siteId, typeId: saved.typeId } : o)); setEditingId(saved.id); }
  }, [currentSiteId]);

  const handleAddZoneFromTopView = useCallback((zone: Omit<ZoneConfig, 'id'>) => { setZones((prev) => [...prev, { ...zone, id: crypto.randomUUID() }]); }, []);

  // 드래그 DOM 이벤트
  useEffect(() => {
    const wrapper = wrapperRef.current; if (!wrapper) return;
    let dragCounter = 0;
    const enter = (e: DragEvent) => { if (e.dataTransfer?.types.includes('application/hanvoxel-preset')) { dragCounter++; setIsDraggingOver(true); } };
    const leave = () => { dragCounter--; if (dragCounter <= 0) { dragCounter = 0; setIsDraggingOver(false); } };
    const drop = () => { dragCounter = 0; setIsDraggingOver(false); };
    wrapper.addEventListener('dragenter', enter); wrapper.addEventListener('dragleave', leave); wrapper.addEventListener('drop', drop);
    return () => { wrapper.removeEventListener('dragenter', enter); wrapper.removeEventListener('dragleave', leave); wrapper.removeEventListener('drop', drop); };
  }, []);


  // OrbitControls 마우스 버튼 매핑 (좌클릭=패닝, 우클릭=회전, 휠=줌)
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    }
  });

  // 포인터 이벤트 추적 — 클릭 vs 드래그 구분 (5px 임계값)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const onDown = (e: PointerEvent) => {
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY, button: e.button };
      wasDragRef.current = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!pointerDownPosRef.current) return;
      const dx = e.clientX - pointerDownPosRef.current.x;
      const dy = e.clientY - pointerDownPosRef.current.y;
      if (dx * dx + dy * dy > 25) wasDragRef.current = true; // 5px^2 = 25
    };
    const onUp = () => { pointerDownPosRef.current = null; };
    wrapper.addEventListener('pointerdown', onDown);
    wrapper.addEventListener('pointermove', onMove);
    wrapper.addEventListener('pointerup', onUp);
    return () => {
      wrapper.removeEventListener('pointerdown', onDown);
      wrapper.removeEventListener('pointermove', onMove);
      wrapper.removeEventListener('pointerup', onUp);
    };
  }, []);

  // === ESC 키로 상세 패널 닫기 ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 배치 모드 취소
        if (placingPreset) { setPlacingPreset(null); return; }
        // 이동 모드 취소 (MoveMode에서도 처리하지만 안전장치)
        if (movingObjectId) { setMovingObjectId(null); setOriginalPosition(null); return; }
        // Zone 드로잉 취소
        if (drawingZoneType) { setDrawingZoneType(null); handleViewModeChange('perspective'); return; }
        // 우측 패널 닫기
        if (rightPanel !== 'none') {
          setEditingId(null);
          setRackDetailId(null);
          setRightPanel('none');
          setSelectedId(null);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placingPreset, movingObjectId, drawingZoneType, rightPanel, handleViewModeChange]);

  // OrbitControls 비활성화 조건
  const orbitEnabled = !placingPreset && !drawingZoneType && !isMoving && !isResizing;

  // 2D 탑뷰 모드
  if (topViewMode) {
    return (
      <div className="flex h-full w-full flex-col bg-[#0D1117]">
        <TopViewZoneDrawer zones={zones} objects={allObjects} onAddZone={handleAddZoneFromTopView} onDeleteZone={handleDeleteZone} onClose={() => setTopViewMode(false)} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]">
      {/* 상단 바 */}
      <EditorTopBar activeTool={activeTool} onToolChange={setActiveTool} viewMode={viewMode} onViewModeChange={handleViewModeChange} onTopView2D={() => setTopViewMode(true)} saving={saving} objectCount={activeObjects.length} editLayer={editLayer} onEditLayerChange={setEditLayer} onSave={onSave} onBack={onBack} />

      {/* 메인 영역 */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 좌측 사이드바 */}
        <EditorLeftSidebar onSelectPreset={handleSelectPreset} layerVisibility={layerVisibility} onLayerToggle={handleLayerToggle} onDrawZone={handleDrawZone} zones={zones} onDeleteZone={handleDeleteZone} />

        {/* 3D 캔버스 영역 */}
        <div ref={wrapperRef} className="relative flex-1" onDragOver={handleDragOver} onDrop={handleDrop}>
          <Canvas
            camera={{ position: [30, 20, 35], fov: 60, near: 0.1, far: 500 }}
            shadows
            style={{ background: '#0D1117' }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
            onClick={(e) => { if (e.target === e.currentTarget && !isMoving && !wasDragRef.current) { setSelectedId(null); setEditingId(null); setRightPanel('none'); setRackDetailId(null); } }}
            onContextMenu={(e) => { e.preventDefault(); if (wasDragRef.current || objectContextMenuRef.current || isMoving) return; openMenu(e); }}
            onPointerMove={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
              const nz = ((e.clientY - rect.top) / rect.height) * 2 - 1;
              setCursorPos({ x: nx * 30 + 15, y: 0, z: nz * 25 + 20 });
            }}
          >
            <OrbitControls ref={controlsRef} makeDefault minDistance={5} maxDistance={120} maxPolarAngle={Math.PI / 2.05} enableDamping dampingFactor={0.08} enabled={orbitEnabled} panSpeed={0.5} rotateSpeed={0.5} zoomSpeed={1.2} />
            <DynamicRotateSpeed controlsRef={controlsRef} />
            <KeyboardControlsHandler controlsRef={controlsRef} enabled={orbitEnabled} />
            {/* 네이티브 더블클릭 핸들러 (R3F 내부 컴포넌트) */}
            <NativeDoubleClickHandler
              objects={activeObjects}
              onSingleClick={handleNativeSingleClick}
              onDoubleClick={handleNativeDoubleClick}
              disabled={isMoving}
              wasDragRef={wasDragRef}
            />

            <WarehouseScene
              objects={activeObjects} selectedId={selectedId} onSelect={handleSelect}
              onContextMenu={(obj, e) => {
                if (wasDragRef.current) return; // 드래그였으면 컨텍스트 메뉴 표시 안 함
                e.stopPropagation(); objectContextMenuRef.current = true;
                setTimeout(() => { objectContextMenuRef.current = false; }, 50);
                openMenu({ clientX: e.clientX, clientY: e.clientY, preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent, obj);
              }}
              placingPreset={placingPreset} onPlace={handlePlace}
              zones={zones} drawingZoneType={drawingZoneType}
              onZoneDrawComplete={handleZoneDrawComplete}
              onZoneDrawCancel={() => { setDrawingZoneType(null); handleViewModeChange('perspective'); }}
              editLayer={editLayer} onResize={handlePreviewUpdate}
              onResizeStart={() => setIsResizing(true)}
              onResizeEnd={() => setIsResizing(false)}
              gridVisible={gridVisible} binOccupancy={binOccupancy}
            />

            {/* 이동 모드 고스트 메시 */}
            {movingObject && (
              <MoveModeGhost
                movingObject={movingObject}
                allObjects={allObjects}
                racks={rackObjects}
                binOccupancy={binOccupancy}
                onDrop={handleMoveDrop}
                onDropToBin={handleMoveDropToBin}
                onCancel={handleMoveCancel}
                onBlockedToast={handleBlockedToast}
              />
            )}
          </Canvas>

          {/* 이동 모드 배너 */}
          {isMoving && (
            <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-950/80 px-5 py-2.5 text-xs text-blue-300 shadow-lg backdrop-blur">
              <span className="font-bold text-blue-400">{movingObject?.name}</span>
              이동 중 — 클릭하여 배치 · ESC 취소
              {/* 랙 근처에서는 BIN 배치 안내 */}
            </div>
          )}

          {/* 배치 모드 안내 배너 */}
          {placingPreset && (
            <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-950/80 px-5 py-2.5 text-xs text-blue-300 shadow-lg backdrop-blur">
              <span className="font-bold text-blue-400">{placingPreset.name}</span>
              배치 중 — 클릭하여 위치 확정
              <button onClick={() => setPlacingPreset(null)} className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1 text-[11px] text-gray-400 transition-colors hover:bg-gray-700">취소</button>
            </div>
          )}

          {/* Zone 드로잉 모드 안내 */}
          {drawingZoneType && (
            <div className="absolute bottom-14 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[#2A2F38] bg-[#1A1D24]/95 px-5 py-2.5 text-xs text-gray-300 shadow-lg">
              클릭으로 시작점 → 클릭으로 끝점 지정 (ESC 취소)
              <button onClick={() => { setDrawingZoneType(null); handleViewModeChange('perspective'); }} className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1 text-[11px] text-gray-400 transition-colors hover:bg-gray-700">취소</button>
            </div>
          )}

          {/* 드래그 앤 드롭 오버레이 */}
          {isDraggingOver && (
            <div onDragOver={handleDragOver} onDrop={handleDrop} className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500/50 bg-blue-500/5" style={{ pointerEvents: 'auto' }}>
              <div className="rounded-xl border border-blue-500 bg-[#1A1D24]/90 px-8 py-4 text-sm font-medium text-blue-300">여기에 드롭하여 배치</div>
            </div>
          )}

          {/* 배치 차단 토스트 */}
          {toast && (
            <div className="absolute bottom-14 right-4 z-50 animate-pulse rounded-lg border border-red-500/40 bg-red-950/90 px-4 py-2.5 text-xs text-red-300 shadow-lg backdrop-blur">
              <span className="mr-2 font-bold text-red-400">배치 불가</span>
              {toast.message}
            </div>
          )}

        </div>

      </div>

      {/* 편집 모달 카드 — 화면 중앙 floating */}
      {rightPanel === 'editor' && editingObject && (
        <div className="fixed inset-0 z-50 flex items-center justify-end pr-4" onClick={() => { setEditingId(null); setRightPanel('none'); }}>
          <div
            className="h-[80vh] w-80 overflow-hidden rounded-xl border border-[#2A2F38] bg-[#1A1D24] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 16px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(45,125,210,0.15)' }}
          >
            <ObjectEditor object={editingObject} onUpdate={handleUpdateObject} onPreview={handlePreviewUpdate} onSavePreset={handleSavePreset} onDelete={(id) => { handleDeleteObject(id); setEditingId(null); setRightPanel('none'); }} onClose={() => { setEditingId(null); setRightPanel('none'); }} />
          </div>
        </div>
      )}

      {/* 랙 상세 모달 카드 */}
      {rightPanel === 'rackDetail' && rackDetailObject && (
        <div className="fixed inset-0 z-50 flex items-center justify-end pr-4" onClick={() => { setRackDetailId(null); setRightPanel('none'); }}>
          <div
            className="h-[80vh] w-80 overflow-hidden rounded-xl border border-[#2A2F38] bg-[#1A1D24] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 16px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(45,125,210,0.15)' }}
          >
            <RackDetailPanel
              rack={rackDetailObject}
              occupancy={binOccupancy}
              onClose={() => { setRackDetailId(null); setRightPanel('none'); }}
              onUpdateRack={handleUpdateObject}
              onRemoveBinItem={handleRemoveBinItem}
            />
          </div>
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      <ContextMenu
        object={contextState.object} position={contextState.position} onClose={closeMenu}
        onEdit={(obj) => {
          closeMenu();
          // setTimeout으로 컨텍스트 메뉴 닫힌 후 모달 열기
          setTimeout(() => { setEditingId(obj.id); setSelectedId(obj.id); setRightPanel('editor'); }, 0);
        }}
        onDuplicate={handleDuplicate} onRotate90={handleRotate90}
        onMove={handleStartMove}
        onDelete={handleDeleteObject} onResetView={handleResetView}
        onTopView={() => handleViewModeChange('top')} onFrontView={() => handleViewModeChange('front')}
        onToggleGrid={() => setGridVisible((v) => !v)} gridVisible={gridVisible}
      />

      {/* 하단 바 */}
      <EditorBottomBar cursorPos={cursorPos} gridVisible={gridVisible} onToggleGrid={() => setGridVisible((v) => !v)} snapEnabled={snapEnabled} onSnapToggle={() => setSnapEnabled((v) => !v)} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onResetView={handleResetView} />
    </div>
  );
}

// ============================================================
// 카메라 거리 기반 동적 회전 속도 조절
// ============================================================

function DynamicRotateSpeed({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // 카메라-타겟 거리 계산
    const dist = camera.position.distanceTo(controls.target);

    // 거리에 비례하여 회전 속도 조절 (가까울수록 느리게)
    // 거리 5~120m → rotateSpeed 0.1~0.5 (로그 스케일)
    const minSpeed = 0.08;
    const maxSpeed = 0.5;
    const speed = minSpeed + (maxSpeed - minSpeed) * Math.min(1, Math.log(dist / 5 + 1) / Math.log(25));
    controls.rotateSpeed = speed;
  });

  return null;
}

// ============================================================
// 네이티브 더블클릭 핸들러 (Canvas 내부 컴포넌트)
// R3F의 onDoubleClick이 불안정해서 직접 구현
// ============================================================

interface NativeDoubleClickHandlerProps {
  objects: SpatialObject[];
  onSingleClick: (objectId: string) => void;
  onDoubleClick: (objectId: string) => void;
  disabled: boolean;
  wasDragRef: React.MutableRefObject<boolean>;
}

function NativeDoubleClickHandler({ objects, onSingleClick, onDoubleClick, disabled, wasDragRef }: NativeDoubleClickHandlerProps) {
  const { camera, gl, scene } = useThree();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  // 오브젝트 ID 맵 (mesh -> objectId) 구축
  const objectIdMap = useRef(new Map<string, string>());
  useEffect(() => {
    objectIdMap.current.clear();
    objects.forEach((obj) => {
      objectIdMap.current.set(obj.id, obj.id);
    });
  }, [objects]);

  // raycaster로 클릭한 위치의 오브젝트 감지
  const findObjectAtPosition = useCallback((clientX: number, clientY: number): string | null => {
    const rect = gl.domElement.getBoundingClientRect();
    pointer.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(pointer.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    // 교차된 메시에서 userData.objectId를 가진 부모를 찾음
    for (const hit of intersects) {
      let current: THREE.Object3D | null = hit.object;
      while (current) {
        const userData = current.userData as Record<string, unknown>;
        if (userData?.objectId && typeof userData.objectId === 'string') {
          return userData.objectId;
        }
        current = current.parent;
      }
    }

    // userData가 없는 경우: 위치 기반으로 가장 가까운 오브젝트 매칭
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const obj of objects) {
        const dx = hitPoint.x - obj.positionX;
        const dy = hitPoint.y - obj.positionY;
        const dz = hitPoint.z - obj.positionZ;
        const dist = dx * dx + dy * dy + dz * dz;
        // 오브젝트 바운딩 범위 내인지 확인
        const halfW = obj.scaleX / 2 + 0.5;
        const halfH = obj.scaleY / 2 + 0.5;
        const halfD = obj.scaleZ / 2 + 0.5;
        if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH && Math.abs(dz) <= halfD) {
          if (dist < bestDist) {
            bestDist = dist;
            bestId = obj.id;
          }
        }
      }
      return bestId;
    }

    return null;
  }, [camera, gl, scene, objects]);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleClick = (e: MouseEvent) => {
      // 좌클릭만 처리
      if (e.button !== 0) return;
      if (disabled) return;
      if (wasDragRef.current) return;

      const objectId = findObjectAtPosition(e.clientX, e.clientY);
      if (!objectId) {
        // 빈 공간 클릭 — 타이머 리셋
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        clickCountRef.current = 0;
        return;
      }

      clickCountRef.current++;

      if (clickCountRef.current === 1) {
        // 첫 번째 클릭 — 250ms 대기
        clickTimerRef.current = setTimeout(() => {
          // 싱글클릭으로 확정
          console.log('[HanVoxel] 네이티브 싱글클릭 확정 ->', objectId);
          onSingleClick(objectId);
          clickCountRef.current = 0;
          clickTimerRef.current = null;
        }, 250);
      } else if (clickCountRef.current >= 2) {
        // 더블클릭 확정
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        clickCountRef.current = 0;
        console.log('[HanVoxel] 네이티브 더블클릭 확정 ->', objectId);
        onDoubleClick(objectId);
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('click', handleClick);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, [gl, disabled, wasDragRef, findObjectAtPosition, onSingleClick, onDoubleClick]);

  return null; // 렌더링 없음 — 이벤트 핸들러만 등록
}
