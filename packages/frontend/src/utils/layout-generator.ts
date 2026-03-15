import type { SpatialObject, SpatialObjectType } from '../types/spatial';
import type { WarehouseTemplate } from '../types/warehouse-template';
import type { WizardFormData } from '../types/warehouse-template';

// 공간 객체 타입 마스터
const TYPES: Record<string, SpatialObjectType> = {
  FLOOR:      { id: 'type-2', name: 'FLOOR',       label: '층',       description: null, depth: 2 },
  ZONE:       { id: 'type-3', name: 'ZONE',        label: '구역',     description: null, depth: 3 },
  AISLE:      { id: 'type-4', name: 'AISLE',       label: '통로',     description: null, depth: 3 },
  RACK:       { id: 'type-5', name: 'RACK',        label: '랙',       description: null, depth: 4 },
  WORKSTATION:{ id: 'type-7', name: 'WORKSTATION', label: '작업대',   description: null, depth: 3 },
  SAFETY_ZONE:{ id: 'type-8', name: 'SAFETY_ZONE', label: '안전구역', description: null, depth: 3 },
  WALL:       { id: 'type-9', name: 'WALL',        label: '벽',       description: null, depth: 2 },
};

function obj(
  id: string,
  type: SpatialObjectType,
  name: string,
  code: string,
  pos: [number, number, number],
  scale: [number, number, number],
  overrides?: Partial<SpatialObject>,
): SpatialObject {
  return {
    id,
    siteId: 'site-1',
    typeId: type.id,
    type,
    name,
    code,
    status: 'ACTIVE',
    isActive: true,
    positionX: pos[0],
    positionY: pos[1],
    positionZ: pos[2],
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: scale[0],
    scaleY: scale[1],
    scaleZ: scale[2],
    color: null,
    opacity: 1,
    visible: true,
    meshType: 'box',
    metadata: null,
    ...overrides,
  };
}

/**
 * 창고 템플릿 + 폼 데이터 → SpatialObject[] 레이아웃 생성
 */
export function generateWarehouseLayout(
  form: WizardFormData,
  template: WarehouseTemplate,
): SpatialObject[] {
  const W = form.areaWidth;
  const D = form.areaDepth;
  const H = form.ceilingHeight;

  const rack = template.rackPreset ?? { width: 2.7, depth: 1.1, height: 5.4, levels: 3, levelHeight: 1.5, loadPerLevel: 1000, color: '#f59e0b', code: 'RACK', name: '랙' };
  const aisleW = template.aisleWidth;
  const mainAisleW = template.mainAisleWidth;
  const isBackToBack = template.rackLayout === 'BACK_TO_BACK';
  const hasContainer = !!template.containerPresetId;

  const objects: SpatialObject[] = [];

  // --- 바닥 (에폭시 코팅) ---
  objects.push(obj(
    'floor-main', TYPES.FLOOR, '창고 바닥', 'FLOOR-MAIN',
    [W / 2, 0.01, D / 2],
    [W, 0.02, D],
    { metadata: { floorStyle: 'EPOXY_GRAY' } },
  ));

  // --- 벽 (샌드위치 패널) ---
  objects.push(obj(
    'wall-back', TYPES.WALL, '뒷벽', 'WALL-BACK',
    [W / 2, H / 2, D], [W, H, 0.15],
    { metadata: { wallStyle: 'SANDWICH_PANEL' } },
  ));
  objects.push(obj(
    'wall-left', TYPES.WALL, '좌측벽', 'WALL-LEFT',
    [0, H / 2, D / 2], [D, H, 0.15],
    { rotationY: Math.PI / 2, metadata: { wallStyle: 'SANDWICH_PANEL' } },
  ));
  objects.push(obj(
    'wall-right', TYPES.WALL, '우측벽', 'WALL-RIGHT',
    [W, H / 2, D / 2], [D, H, 0.15],
    { rotationY: Math.PI / 2, metadata: { wallStyle: 'SANDWICH_PANEL' } },
  ));
  objects.push(obj(
    'wall-front', TYPES.WALL, '앞벽', 'WALL-FRONT',
    [W / 2, H / 2, 0], [W, H, 0.2],
    { metadata: { wallStyle: 'CONCRETE_WALL' } },
  ));

  // --- 도크 영역 ---
  const DOCK_Z = 1;
  const DOCK_DEPTH = hasContainer ? 14.2 : 6;
  const STAGING_DEPTH = 5;
  const STAGING_Z = DOCK_DEPTH + 1;
  const EMERGENCY_Z = STAGING_Z + STAGING_DEPTH + 0.5;
  const STORAGE_Z = EMERGENCY_Z + 2;

  if (hasContainer) {
    // 컨테이너 3기 배치
    const containerCount = Math.min(3, Math.floor((W - 4) / 4.5));
    const containerW = 2.438;
    const containerD = 12.192;
    const containerH = 2.591;
    const spacing = 2;
    const totalContW = containerCount * containerW + (containerCount - 1) * spacing;
    const startX = (W - totalContW) / 2 + containerW / 2;

    for (let i = 0; i < containerCount; i++) {
      const x = startX + i * (containerW + spacing);
      objects.push(obj(
        `container-${i + 1}`, TYPES.ZONE, `컨테이너 도크 ${i + 1}`, `DOCK-${i + 1}`,
        [x, containerH / 2, DOCK_Z + containerD / 2],
        [containerW, containerH, containerD],
        { color: '#1d4ed8', opacity: 0.35, metadata: { type: 'DRY_40FT' } },
      ));
    }

    // 도크 구역
    objects.push(obj(
      'zone-dock', TYPES.ZONE, '컨테이너 도크 구역', 'ZONE-DOCK',
      [W / 2, 1.5, DOCK_Z + DOCK_DEPTH / 2],
      [W - 4, 3, DOCK_DEPTH],
      { color: '#1d4ed8', opacity: 0.05 },
    ));
  }

  // --- 입고/출고 스테이징 ---
  objects.push(obj(
    'zone-inbound', TYPES.ZONE, '입고 스테이징', 'ZONE-IN',
    [W / 4, rack.height / 3, STAGING_Z + STAGING_DEPTH / 2],
    [W / 2 - 3, rack.height / 1.5, STAGING_DEPTH],
    { color: '#3b82f6', opacity: 0.06 },
  ));
  objects.push(obj(
    'zone-outbound', TYPES.ZONE, '출고 스테이징', 'ZONE-OUT',
    [W * 3 / 4, rack.height / 3, STAGING_Z + STAGING_DEPTH / 2],
    [W / 2 - 3, rack.height / 1.5, STAGING_DEPTH],
    { color: '#10b981', opacity: 0.06 },
  ));

  // --- 비상 통로 (바닥 마킹) ---
  objects.push(obj(
    'emergency-aisle', TYPES.AISLE, '비상 통로', 'SAFE-MAIN',
    [W / 2, 0.01, EMERGENCY_Z],
    [W - 2, 0.02, 1.5],
    { color: '#f43f5e', opacity: 1, metadata: { aisleType: 'EMERGENCY' } },
  ));

  // --- 보관 구역 랙 배치 ---
  const rackW = rack.width;
  const rackD = rack.depth;
  const rackH = Math.min(rack.height, H - 0.5);
  const rackGap = 0.1;

  // 한 열에 들어가는 랙 수
  const storageAreaW = W - mainAisleW - 6; // 양쪽 여유 + 주 통로
  const racksPerRow = Math.max(1, Math.floor(storageAreaW / (rackW + rackGap)));
  const rowWidth = racksPerRow * (rackW + rackGap);

  const storageOriginX = 3;

  // 쌍 깊이 계산
  const pairDepth = isBackToBack ? rackD * 2 + 0.1 : rackD;
  const rowPitch = pairDepth + aisleW;

  // 보관 구역에 들어가는 열(쌍) 수
  const availableStorageD = D - STORAGE_Z - 3; // 뒤쪽 여유
  const pairCount = Math.max(1, Math.floor(availableStorageD / rowPitch));

  // 랙 배치
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let pair = 0; pair < pairCount; pair++) {
    const centerZ = STORAGE_Z + pair * rowPitch + pairDepth / 2;

    if (isBackToBack) {
      const frontZ = centerZ - rackD / 2 - 0.05;
      const backZ = centerZ + rackD / 2 + 0.05;
      const labelF = rowLabels[pair * 2] ?? `R${pair * 2}`;
      const labelB = rowLabels[pair * 2 + 1] ?? `R${pair * 2 + 1}`;

      for (let i = 0; i < racksPerRow; i++) {
        const x = storageOriginX + i * (rackW + rackGap) + rackW / 2;
        objects.push(obj(
          `rack-${labelF}-${i + 1}`, TYPES.RACK,
          `랙 ${labelF}-${String(i + 1).padStart(2, '0')}`,
          `RACK-${labelF}${String(i + 1).padStart(2, '0')}`,
          [x, rackH / 2, frontZ],
          [rackW, rackH, rackD],
          {
            color: rack.color ?? '#f59e0b',
            opacity: 0.9,
            metadata: {
              standard: rack.code,
              levels: rack.levels,
              levelHeight: rack.levelHeight,
              loadPerLevel: rack.loadPerLevel,
            },
          },
        ));
        objects.push(obj(
          `rack-${labelB}-${i + 1}`, TYPES.RACK,
          `랙 ${labelB}-${String(i + 1).padStart(2, '0')}`,
          `RACK-${labelB}${String(i + 1).padStart(2, '0')}`,
          [x, rackH / 2, backZ],
          [rackW, rackH, rackD],
          {
            color: rack.color ?? '#f59e0b',
            opacity: 0.9,
            metadata: {
              standard: rack.code,
              levels: rack.levels,
              levelHeight: rack.levelHeight,
              loadPerLevel: rack.loadPerLevel,
            },
          },
        ));
      }
    } else {
      // SINGLE 배치
      const label = rowLabels[pair] ?? `R${pair}`;
      for (let i = 0; i < racksPerRow; i++) {
        const x = storageOriginX + i * (rackW + rackGap) + rackW / 2;
        objects.push(obj(
          `rack-${label}-${i + 1}`, TYPES.RACK,
          `랙 ${label}-${String(i + 1).padStart(2, '0')}`,
          `RACK-${label}${String(i + 1).padStart(2, '0')}`,
          [x, rackH / 2, centerZ],
          [rackW, rackH, rackD],
          {
            color: rack.color ?? '#f59e0b',
            opacity: 0.9,
            metadata: {
              standard: rack.code,
              levels: rack.levels,
              levelHeight: rack.levelHeight,
              loadPerLevel: rack.loadPerLevel,
            },
          },
        ));
      }
    }
  }

  // --- 작업 통로 (바닥 마킹) ---
  for (let pair = 0; pair < pairCount; pair++) {
    const centerZ = STORAGE_Z + pair * rowPitch + pairDepth / 2;
    // 앞쪽 통로
    if (pair === 0) {
      objects.push(obj(
        `aisle-front-${pair}`, TYPES.AISLE, `작업 통로 ${pair * 2 + 1}`, `AISLE-${String(pair * 2 + 1).padStart(2, '0')}`,
        [storageOriginX + rowWidth / 2, 0.01, centerZ - pairDepth / 2 - aisleW / 2],
        [rowWidth, 0.02, aisleW],
        { color: '#475569', opacity: 1, metadata: { aisleType: 'REACH' } },
      ));
    }
    // 뒤쪽 통로
    objects.push(obj(
      `aisle-back-${pair}`, TYPES.AISLE, `작업 통로 ${pair * 2 + 2}`, `AISLE-${String(pair * 2 + 2).padStart(2, '0')}`,
      [storageOriginX + rowWidth / 2, 0.01, centerZ + pairDepth / 2 + aisleW / 2],
      [rowWidth, 0.02, aisleW],
      { color: '#475569', opacity: 1, metadata: { aisleType: 'REACH' } },
    ));
  }

  // --- 주 통로 (지게차) ---
  const storageEndZ = STORAGE_Z + pairCount * rowPitch;
  objects.push(obj(
    'main-aisle', TYPES.AISLE, '주 통로 (지게차)', 'AISLE-MAIN',
    [storageOriginX + rowWidth + mainAisleW / 2 + 0.5, 0.01, STORAGE_Z + (storageEndZ - STORAGE_Z) / 2],
    [mainAisleW, 0.02, storageEndZ - STORAGE_Z + aisleW],
    { color: '#64748b', opacity: 1, metadata: { aisleType: 'FORKLIFT' } },
  ));

  // --- 작업대 ---
  objects.push(obj(
    'ws-picking', TYPES.WORKSTATION, '피킹 작업대', 'WS-PICK',
    [W / 2 - 3, 0.45, STAGING_Z + 1],
    [2, 0.9, 1.5],
    { color: '#8b5cf6' },
  ));
  objects.push(obj(
    'ws-inspect', TYPES.WORKSTATION, '검수 작업대', 'WS-QC',
    [W / 2 + 3, 0.45, STAGING_Z + 1],
    [2, 0.9, 1.5],
    { color: '#8b5cf6' },
  ));

  // --- 보관 구역 영역 표시 ---
  const totalRacks = isBackToBack ? pairCount * racksPerRow * 2 : pairCount * racksPerRow;
  objects.push(obj(
    'zone-storage', TYPES.ZONE, '보관 구역', 'ZONE-STORAGE',
    [storageOriginX + rowWidth / 2, rackH / 2, STORAGE_Z + (storageEndZ - STORAGE_Z) / 2],
    [rowWidth + 2, rackH + 0.5, storageEndZ - STORAGE_Z + aisleW],
    {
      color: '#f59e0b',
      opacity: 0.03,
      metadata: {
        rackStandard: rack.code,
        totalRacks,
        rackLayout: template.rackLayout,
        aisleType: template.aisleType,
      },
    },
  ));

  return objects;
}
