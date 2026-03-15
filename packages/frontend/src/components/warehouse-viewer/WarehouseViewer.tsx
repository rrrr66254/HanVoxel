import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
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
}

/**
 * 3D 창고 뷰어 — 오늘의집 스타일 + 이동 모드 + 더블클릭 상세
 */
export function WarehouseViewer({ objects, siteId }: WarehouseViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placingPreset, setPlacingPreset] = useState<SpatialPreset | null>(null);
  const [placedObjects, setPlacedObjects] = useState<SpatialObject[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 우측 패널 모드
  const [rightPanel, setRightPanel] = useState<RightPanelMode>('none');
  const [rackDetailId, setRackDetailId] = useState<string | null>(null);

  // 이동 모드
  const [movingObjectId, setMovingObjectId] = useState<string | null>(null);
  const [originalPosition, setOriginalPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  // 뷰어 상태
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, z: 0 });
  const [layerVisibility, setLayerVisibility] = useState({ racks: true, aisles: true, zones: true });

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

  // 싱글클릭 지연 타이머 (더블클릭과 분리용)
  const singleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // === 싱글 클릭 — 300ms 지연 후 선택 + 편집 패널 열기 ===
  const handleSelect = useCallback((obj: SpatialObject) => {
    if (isMoving || wasDragRef.current) return;

    // 이전 싱글클릭 타이머 취소 (더블클릭 시 싱글클릭 방지)
    if (singleClickTimerRef.current) {
      clearTimeout(singleClickTimerRef.current);
      singleClickTimerRef.current = null;
    }

    // 300ms 후 싱글클릭 처리 (더블클릭이 오면 취소됨)
    singleClickTimerRef.current = setTimeout(() => {
      console.log('[HanVoxel] 싱글클릭 →', obj.name, obj.type.name);
      setSelectedId(obj.id);
      setEditingId(obj.id);
      setRightPanel('editor');
      setRackDetailId(null);
      singleClickTimerRef.current = null;
    }, 300);
  }, [isMoving]);

  // === 더블 클릭 — R3F 네이티브 onDoubleClick 이벤트 ===
  const handleDoubleClick = useCallback((obj: SpatialObject) => {
    if (isMoving || wasDragRef.current) return;

    // 싱글클릭 타이머 취소
    if (singleClickTimerRef.current) {
      clearTimeout(singleClickTimerRef.current);
      singleClickTimerRef.current = null;
    }

    const meta = obj.metadata as Record<string, unknown> | null;
    const isRack = obj.type.name === 'RACK' && meta?.levels;

    console.log('[HanVoxel] 더블클릭 →', obj.name, obj.type.name, isRack ? '→ RackDetailPanel' : '→ ObjectEditor');

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
  }, [isMoving]);

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
    // 컨테이너
    if (catName.includes('CONTAINER') || code.includes('FT') || code.includes('REEFER')) return { name: 'RACK' };
    // 통로
    if (catName.includes('AISLE') || code.includes('AISLE')) return { name: 'AISLE' };
    return { name: 'RACK' };
  }, []);

  // === 프리셋 배치 ===
  const handleSelectPreset = useCallback((preset: SpatialPreset) => {
    setPlacingPreset(preset);
    setSelectedId(null);
    setEditingId(null);
    setRightPanel('none');
  }, []);

  const handlePlace = useCallback(async (position: [number, number, number]) => {
    if (!placingPreset) return;
    const code = `${placingPreset.code}_${Date.now()}`;
    const typeInfo = getTypeFromPreset(placingPreset);
    const localObj: SpatialObject = {
      id: crypto.randomUUID(), siteId: currentSiteId, typeId: DEFAULT_TYPE_ID,
      type: { id: DEFAULT_TYPE_ID, name: typeInfo.name, label: placingPreset.name, description: null, depth: 5 },
      name: placingPreset.name, code, status: 'ACTIVE', isActive: true,
      positionX: position[0], positionY: position[1], positionZ: position[2],
      rotationX: 0, rotationY: 0, rotationZ: 0,
      scaleX: placingPreset.width || 1, scaleY: placingPreset.height || 1, scaleZ: placingPreset.depth || 1,
      color: null, opacity: placingPreset.opacity, visible: true,
      meshType: (placingPreset.meshType as MeshType) ?? 'box',
      metadata: { presetId: placingPreset.id, presetCode: placingPreset.code, levels: placingPreset.levels, levelHeight: placingPreset.levelHeight, loadPerLevel: placingPreset.loadPerLevel, ...(typeInfo.itemType ? { itemType: typeInfo.itemType } : {}) },
    };
    setPlacedObjects((prev) => [...prev, localObj]);
    setPlacingPreset(null);
    setEditingId(localObj.id);
    setRightPanel('editor');

    const saved = await createSpatialObject({
      siteId: currentSiteId, typeId: DEFAULT_TYPE_ID, name: localObj.name, code: localObj.code,
      positionX: localObj.positionX, positionY: localObj.positionY, positionZ: localObj.positionZ,
      scaleX: localObj.scaleX, scaleY: localObj.scaleY, scaleZ: localObj.scaleZ,
      color: localObj.color, opacity: localObj.opacity, meshType: localObj.meshType, metadata: localObj.metadata,
    });
    if (saved) {
      setPlacedObjects((prev) => prev.map((o) => o.id === localObj.id ? { ...localObj, id: saved.id, siteId: saved.siteId, typeId: saved.typeId } : o));
      setEditingId(saved.id);
    }
  }, [placingPreset, currentSiteId]);

  // === 오브젝트 CRUD ===
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
    const updatedObj: SpatialObject = { ...obj, rotationY: obj.rotationY + Math.PI / 2 };
    setPlacedObjects((prev) => prev.map((o) => (o.id === updatedObj.id ? updatedObj : o)));
    await updateSpatialObject(updatedObj.id, { rotationY: updatedObj.rotationY });
  }, []);

  // BIN 아이템 제거
  const handleRemoveBinItem = useCallback((rackId: string, level: number) => {
    setBinOccupancy((prev) => prev.filter((o) => !(o.rackId === rackId && o.level === level)));
  }, []);

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
    const posY = (preset.height || 1) / 2;
    const code = `${preset.code}_${Date.now()}`;
    const dropTypeInfo = getTypeFromPreset(preset);
    const localObj: SpatialObject = {
      id: crypto.randomUUID(), siteId: currentSiteId, typeId: DEFAULT_TYPE_ID,
      type: { id: DEFAULT_TYPE_ID, name: dropTypeInfo.name, label: preset.name, description: null, depth: 5 },
      name: preset.name, code, status: 'ACTIVE', isActive: true,
      positionX: worldX, positionY: posY, positionZ: worldZ,
      rotationX: 0, rotationY: 0, rotationZ: 0,
      scaleX: preset.width || 1, scaleY: preset.height || 1, scaleZ: preset.depth || 1,
      color: null, opacity: preset.opacity, visible: true, meshType: (preset.meshType as MeshType) ?? 'box',
      metadata: { presetId: preset.id, presetCode: preset.code, ...(dropTypeInfo.itemType ? { itemType: dropTypeInfo.itemType } : {}) },
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

  // 싱글클릭 타이머 cleanup
  useEffect(() => {
    return () => {
      if (singleClickTimerRef.current) clearTimeout(singleClickTimerRef.current);
    };
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

  // OrbitControls 비활성화 조건
  const orbitEnabled = !placingPreset && !drawingZoneType && !isMoving;

  // 2D 탑뷰 모드
  if (topViewMode) {
    return (
      <div className="flex h-full w-full flex-col bg-[#0D1117]">
        <TopViewZoneDrawer zones={zones} onAddZone={handleAddZoneFromTopView} onDeleteZone={handleDeleteZone} onClose={() => setTopViewMode(false)} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]">
      {/* 상단 바 */}
      <EditorTopBar activeTool={activeTool} onToolChange={setActiveTool} viewMode={viewMode} onViewModeChange={handleViewModeChange} onTopView2D={() => setTopViewMode(true)} saving={saving} objectCount={activeObjects.length} />

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
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
            <OrbitControls ref={controlsRef} makeDefault minDistance={5} maxDistance={120} maxPolarAngle={Math.PI / 2.05} enableDamping dampingFactor={0.08} enabled={orbitEnabled} rotateSpeed={0.5} zoomSpeed={1.2} />
            <KeyboardControlsHandler controlsRef={controlsRef} enabled={orbitEnabled} />
            <WarehouseScene
              objects={activeObjects} selectedId={selectedId} onSelect={handleSelect} onDoubleClick={handleDoubleClick}
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

          {/* 컨텍스트 메뉴 */}
          <ContextMenu
            object={contextState.object} position={contextState.position} onClose={closeMenu}
            onEdit={(obj) => { setEditingId(obj.id); setSelectedId(obj.id); setRightPanel('editor'); }}
            onDuplicate={handleDuplicate} onRotate90={handleRotate90}
            onMove={handleStartMove}
            onDelete={handleDeleteObject} onResetView={handleResetView}
            onTopView={() => handleViewModeChange('top')} onFrontView={() => handleViewModeChange('front')}
            onToggleGrid={() => setGridVisible((v) => !v)} gridVisible={gridVisible}
          />
        </div>

        {/* 우측 패널 — 편집기 또는 랙 상세 */}
        {rightPanel === 'editor' && editingObject && (
          <div className="w-72 border-l border-[#2A2F38] bg-[#1A1D24]">
            <ObjectEditor object={editingObject} onUpdate={handleUpdateObject} onSavePreset={handleSavePreset} onDelete={handleDeleteObject} onClose={() => { setEditingId(null); setRightPanel('none'); }} />
          </div>
        )}

        {rightPanel === 'rackDetail' && rackDetailObject && (
          <div className="w-80 border-l border-[#2A2F38] bg-[#1A1D24]">
            <RackDetailPanel
              rack={rackDetailObject}
              occupancy={binOccupancy}
              onClose={() => { setRackDetailId(null); setRightPanel('none'); }}
              onUpdateRack={handleUpdateObject}
              onRemoveBinItem={handleRemoveBinItem}
            />
          </div>
        )}
      </div>

      {/* 하단 바 */}
      <EditorBottomBar cursorPos={cursorPos} gridVisible={gridVisible} onToggleGrid={() => setGridVisible((v) => !v)} snapEnabled={snapEnabled} onSnapToggle={() => setSnapEnabled((v) => !v)} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onResetView={handleResetView} />
    </div>
  );
}
