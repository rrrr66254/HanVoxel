import type { SpatialObject, SpatialObjectType } from '../types/spatial';

// ============================================================
// warehouse-standards.md 기반 표준 규격 (미터 단위)
// ============================================================

const RACK = { w: 2.7, d: 1.1, h: 5.4, levels: 3, levelHeight: 1.5, loadPerLevel: 1000 }; // KR_STANDARD
const PALLET = { w: 1.1, d: 1.1, h: 0.144, maxLoad: 1000 }; // T11
const PRODUCT = { w: 0.4, d: 0.3, h: 0.3, qtyPerPallet: 24, kgPerPallet: 300 }; // FOOD_BEVERAGE
const CONTAINER = { w: 2.438, d: 12.192, h: 2.591 }; // DRY_40FT
const AISLE = { forklift: 4.0, reach: 2.8, pedestrian: 1.2, emergency: 1.5 }; // 권장 너비

// ============================================================
// 창고 레이아웃 설계 (식품·음료 물류 창고)
//
// 전체 치수: 약 60m × 45m
//
//  Y축 = 높이 (위)
//  X축 = 가로 (오른쪽)
//  Z축 = 세로 (앞쪽 = 도크 방향)
//
//  +Z ← 건물 뒤쪽
//   |
//   |  [ 보관 구역 — 랙 6열 ]
//   |
//   |  ─── 비상 통로 ───
//   |
//   |  [ 입고 스테이징 ]  [ 출고 스테이징 ]
//   |
//   |  ─── 도크 영역 (컨테이너 3기) ───
//   |
//  Z=0 → 건물 앞쪽 (도크)
//
// ============================================================

// 공간 객체 타입 마스터
const TYPES: Record<string, SpatialObjectType> = {
  BUILDING: { id: 'type-1', name: 'BUILDING', label: '건물', description: null, depth: 1 },
  FLOOR: { id: 'type-2', name: 'FLOOR', label: '층', description: null, depth: 2 },
  ZONE: { id: 'type-3', name: 'ZONE', label: '구역', description: null, depth: 3 },
  AISLE: { id: 'type-4', name: 'AISLE', label: '통로', description: null, depth: 3 },
  RACK: { id: 'type-5', name: 'RACK', label: '랙', description: null, depth: 4 },
  BIN: { id: 'type-6', name: 'BIN', label: '빈', description: null, depth: 5 },
  WORKSTATION: { id: 'type-7', name: 'WORKSTATION', label: '작업대', description: null, depth: 3 },
  SAFETY_ZONE: { id: 'type-8', name: 'SAFETY_ZONE', label: '안전구역', description: null, depth: 3 },
  WALL: { id: 'type-9', name: 'WALL', label: '벽', description: null, depth: 2 },
};

// ============================================================
// 레이아웃 상수
// ============================================================

// 보관 구역 시작점
const STORAGE_ORIGIN_X = 3;
const STORAGE_ORIGIN_Z = 18; // 도크에서 충분히 떨어진 위치

// 랙 배치: 2열씩 등지게 (back-to-back) 배치, 열 사이 리치트럭 통로
const RACK_PAIR_DEPTH = RACK.d * 2; // 등지기 쌍 깊이 = 2.2m
const RACK_AISLE_WIDTH = AISLE.reach; // 랙 간 통로 = 2.8m (리치트럭)
const RACK_ROW_PITCH = RACK_PAIR_DEPTH + RACK_AISLE_WIDTH; // 5.0m 간격

// 한 열에 랙 몇 개 (가로 방향)
const RACKS_PER_ROW = 8;
const RACK_GAP = 0.1; // 랙 간 간격 (가로)
const ROW_WIDTH = RACKS_PER_ROW * (RACK.w + RACK_GAP); // ~22.4m

// 주 통로 (지게차)
const MAIN_AISLE_WIDTH = AISLE.forklift; // 4.0m

// 도크 영역
const DOCK_Z = 1; // Z=1m 부근
const DOCK_DEPTH = CONTAINER.d + 2; // 컨테이너 길이 + 여유 = ~14.2m
const CONTAINER_COUNT = 3;
const CONTAINER_SPACING = 2; // 컨테이너 간 간격

// 스테이징 영역
const STAGING_Z = DOCK_DEPTH + 1; // 도크 뒤 스테이징
const STAGING_DEPTH = 5;

// 비상 통로
const EMERGENCY_Z = STAGING_Z + STAGING_DEPTH + 0.5;

// 전체 건물 치수
const BUILDING_W = ROW_WIDTH + MAIN_AISLE_WIDTH + 6; // ~32m (양쪽 여유)
const BUILDING_D = 45;
const BUILDING_H = 8; // 천장 높이

// ============================================================
// 헬퍼 함수
// ============================================================

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

// KR_STANDARD 랙 행 생성 (back-to-back 쌍)
function createRackPairRow(
  labelFront: string,
  labelBack: string,
  pairIndex: number,
  count: number,
): SpatialObject[] {
  const racks: SpatialObject[] = [];
  const centerZ = STORAGE_ORIGIN_Z + pairIndex * RACK_ROW_PITCH;
  const frontZ = centerZ - RACK.d / 2 - 0.05;
  const backZ = centerZ + RACK.d / 2 + 0.05;

  for (let i = 0; i < count; i++) {
    const x = STORAGE_ORIGIN_X + i * (RACK.w + RACK_GAP);
    // 앞쪽 랙
    racks.push(obj(
      `rack-${labelFront}-${i + 1}`,
      TYPES.RACK,
      `랙 ${labelFront}-${String(i + 1).padStart(2, '0')}`,
      `RACK-${labelFront}${String(i + 1).padStart(2, '0')}`,
      [x + RACK.w / 2, RACK.h / 2, frontZ],
      [RACK.w, RACK.h, RACK.d],
      {
        color: null,
        opacity: 1,
        metadata: {
          standard: 'KR_STANDARD',
          levels: RACK.levels,
          levelHeight: RACK.levelHeight,
          loadPerLevel: RACK.loadPerLevel,
          pallet: 'T11',
          product: 'FOOD_BEVERAGE',
          palletPerLevel: 2, // T11(1.1m) × 2 = 2.2m ≈ RACK.w(2.7m)에 2개
          capacityPallets: RACK.levels * 2,
        },
      },
    ));
    // 뒤쪽 랙
    racks.push(obj(
      `rack-${labelBack}-${i + 1}`,
      TYPES.RACK,
      `랙 ${labelBack}-${String(i + 1).padStart(2, '0')}`,
      `RACK-${labelBack}${String(i + 1).padStart(2, '0')}`,
      [x + RACK.w / 2, RACK.h / 2, backZ],
      [RACK.w, RACK.h, RACK.d],
      {
        color: null,
        opacity: 1,
        metadata: {
          standard: 'KR_STANDARD',
          levels: RACK.levels,
          levelHeight: RACK.levelHeight,
          loadPerLevel: RACK.loadPerLevel,
          pallet: 'T11',
          product: 'FOOD_BEVERAGE',
          palletPerLevel: 2,
          capacityPallets: RACK.levels * 2,
        },
      },
    ));
  }
  return racks;
}

// 통로 생성 (바닥 마킹 스타일)
function createAisle(
  id: string,
  name: string,
  code: string,
  pos: [number, number, number],
  scale: [number, number, number],
  aisleType: string = 'REACH',
): SpatialObject {
  return obj(id, TYPES.AISLE, name, code,
    [pos[0], 0.01, pos[2]], // Y를 바닥 레벨로
    [scale[0], 0.02, scale[2]], // height를 얇게
    {
      color: '#475569',
      opacity: 1,
      metadata: { standard: 'REACH_TRUCK', width: AISLE.reach, aisleType },
    },
  );
}

// DRY_40FT 컨테이너 생성
function createContainer(index: number, x: number): SpatialObject {
  return obj(
    `container-${index}`,
    TYPES.ZONE,
    `컨테이너 도크 ${index}`,
    `DOCK-${index}`,
    [x, CONTAINER.h / 2, DOCK_Z + CONTAINER.d / 2],
    [CONTAINER.w, CONTAINER.h, CONTAINER.d],
    {
      color: '#1d4ed8',
      opacity: 0.35,
      metadata: {
        type: 'DRY_40FT',
        innerWidth: 2.352,
        innerDepth: 12.032,
        innerHeight: 2.393,
        cbm: 67.6,
        maxLoad: 26750,
        palletCapacity: '20 × T11',
      },
    },
  );
}

// ============================================================
// 창고 데이터 조립
// ============================================================

export const MOCK_WAREHOUSE: SpatialObject[] = [
  // --- 바닥 (에폭시 코팅 타일) ---
  // 보관 구역 바닥 (회색 에폭시)
  obj('floor-storage', TYPES.FLOOR, '보관 구역 바닥', 'FLOOR-STORAGE',
    [STORAGE_ORIGIN_X + ROW_WIDTH / 2, 0.01, STORAGE_ORIGIN_Z + RACK_ROW_PITCH],
    [ROW_WIDTH + 8, 0.02, RACK_ROW_PITCH * 3 + AISLE.reach + 4],
    { metadata: { floorStyle: 'EPOXY_GRAY' } },
  ),
  // 도크 구역 바닥 (콘크리트)
  obj('floor-dock', TYPES.FLOOR, '도크 구역 바닥', 'FLOOR-DOCK',
    [BUILDING_W / 2, 0.01, DOCK_Z + DOCK_DEPTH / 2],
    [BUILDING_W - 2, 0.02, DOCK_DEPTH],
    { metadata: { floorStyle: 'CONCRETE' } },
  ),
  // 스테이징 구역 바닥 (녹색 에폭시)
  obj('floor-staging', TYPES.FLOOR, '스테이징 구역 바닥', 'FLOOR-STAGING',
    [BUILDING_W / 2, 0.01, STAGING_Z + STAGING_DEPTH / 2],
    [BUILDING_W - 4, 0.02, STAGING_DEPTH],
    { metadata: { floorStyle: 'EPOXY_GREEN' } },
  ),
  // 주 통로 바닥 (미끄럼방지)
  obj('floor-main-aisle', TYPES.FLOOR, '주 통로 바닥', 'FLOOR-MAIN-AISLE',
    [STORAGE_ORIGIN_X + ROW_WIDTH + MAIN_AISLE_WIDTH / 2 + 0.5, 0.01, STORAGE_ORIGIN_Z + RACK_ROW_PITCH],
    [MAIN_AISLE_WIDTH, 0.02, RACK_ROW_PITCH * 3 + AISLE.reach + 2],
    { metadata: { floorStyle: 'ANTI_SLIP' } },
  ),

  // --- 벽 (샌드위치 패널) ---
  // 뒷벽
  obj('wall-back', TYPES.WALL, '뒷벽', 'WALL-BACK',
    [BUILDING_W / 2, BUILDING_H / 2, BUILDING_D],
    [BUILDING_W, BUILDING_H, 0.15],
    { metadata: { wallStyle: 'SANDWICH_PANEL' } },
  ),
  // 좌측벽
  obj('wall-left', TYPES.WALL, '좌측벽', 'WALL-LEFT',
    [BUILDING_W / 2 - BUILDING_W / 2, BUILDING_H / 2, BUILDING_D / 2],
    [BUILDING_D, BUILDING_H, 0.15],
    { rotationY: Math.PI / 2, metadata: { wallStyle: 'SANDWICH_PANEL' } },
  ),
  // 우측벽
  obj('wall-right', TYPES.WALL, '우측벽', 'WALL-RIGHT',
    [BUILDING_W, BUILDING_H / 2, BUILDING_D / 2],
    [BUILDING_D, BUILDING_H, 0.15],
    { rotationY: Math.PI / 2, metadata: { wallStyle: 'SANDWICH_PANEL' } },
  ),
  // 앞벽 (도크 — 콘크리트)
  obj('wall-front', TYPES.WALL, '앞벽 (도크)', 'WALL-FRONT',
    [BUILDING_W / 2, BUILDING_H / 2, 0],
    [BUILDING_W, BUILDING_H, 0.2],
    { metadata: { wallStyle: 'CONCRETE_WALL' } },
  ),

  // --- 도크 영역 (DRY_40FT × 3기) ---
  ...Array.from({ length: CONTAINER_COUNT }, (_, i) => {
    const totalW = CONTAINER_COUNT * CONTAINER.w + (CONTAINER_COUNT - 1) * CONTAINER_SPACING;
    const startX = (BUILDING_W - totalW) / 2 + CONTAINER.w / 2;
    const x = startX + i * (CONTAINER.w + CONTAINER_SPACING);
    return createContainer(i + 1, x);
  }),

  // 도크 구역 (전체 영역 표시 — 바닥 레벨)
  obj('zone-dock', TYPES.ZONE, '컨테이너 도크 구역', 'ZONE-DOCK',
    [BUILDING_W / 2, 0.05, DOCK_Z + DOCK_DEPTH / 2],
    [BUILDING_W - 4, 0.1, DOCK_DEPTH],
    { color: '#1d4ed8', opacity: 0.05, metadata: { purpose: '컨테이너 하역 구역', containerType: 'DRY_40FT' } },
  ),

  // --- 입고 스테이징 구역 (바닥 레벨) ---
  obj('zone-inbound', TYPES.ZONE, '입고 스테이징', 'ZONE-IN',
    [BUILDING_W / 4, 0.05, STAGING_Z + STAGING_DEPTH / 2],
    [BUILDING_W / 2 - 3, 0.1, STAGING_DEPTH],
    {
      color: '#3b82f6',
      opacity: 0.06,
      metadata: {
        purpose: '입고 대기 구역',
        palletType: 'T11',
        capacity: '약 40 팔레트',
      },
    },
  ),

  // --- 출고 스테이징 구역 (바닥 레벨) ---
  obj('zone-outbound', TYPES.ZONE, '출고 스테이징', 'ZONE-OUT',
    [BUILDING_W * 3 / 4, 0.05, STAGING_Z + STAGING_DEPTH / 2],
    [BUILDING_W / 2 - 3, 0.1, STAGING_DEPTH],
    {
      color: '#10b981',
      opacity: 0.06,
      metadata: {
        purpose: '출고 준비 구역',
        palletType: 'T11',
        capacity: '약 40 팔레트',
      },
    },
  ),

  // --- 비상 통로 (소방법 기준 1.5m — 바닥 마킹) ---
  obj('emergency-aisle', TYPES.AISLE, '비상 통로', 'SAFE-MAIN',
    [BUILDING_W / 2, 0.01, EMERGENCY_Z],
    [BUILDING_W - 2, 0.02, AISLE.emergency],
    { color: '#f43f5e', opacity: 1, metadata: { standard: '산업안전보건기준 규칙 제35조', width: AISLE.emergency, aisleType: 'EMERGENCY' } },
  ),

  // --- 보관 구역 (KR_STANDARD 랙 6열 = 3쌍 back-to-back) ---
  // 쌍 1: A-B열
  ...createRackPairRow('A', 'B', 0, RACKS_PER_ROW),
  // 쌍 2: C-D열
  ...createRackPairRow('C', 'D', 1, RACKS_PER_ROW),
  // 쌍 3: E-F열
  ...createRackPairRow('E', 'F', 2, RACKS_PER_ROW),

  // --- 리치트럭 통로 (랙 쌍 사이) ---
  createAisle('aisle-1', '작업 통로 1', 'AISLE-01',
    [STORAGE_ORIGIN_X + ROW_WIDTH / 2, 0.05, STORAGE_ORIGIN_Z - RACK.d - AISLE.reach / 2],
    [ROW_WIDTH, 0.1, AISLE.reach],
  ),
  createAisle('aisle-2', '작업 통로 2', 'AISLE-02',
    [STORAGE_ORIGIN_X + ROW_WIDTH / 2, 0.05, STORAGE_ORIGIN_Z + RACK_ROW_PITCH - RACK.d - AISLE.reach / 2],
    [ROW_WIDTH, 0.1, AISLE.reach],
  ),
  createAisle('aisle-3', '작업 통로 3', 'AISLE-03',
    [STORAGE_ORIGIN_X + ROW_WIDTH / 2, 0.05, STORAGE_ORIGIN_Z + 2 * RACK_ROW_PITCH - RACK.d - AISLE.reach / 2],
    [ROW_WIDTH, 0.1, AISLE.reach],
  ),
  createAisle('aisle-4', '작업 통로 4', 'AISLE-04',
    [STORAGE_ORIGIN_X + ROW_WIDTH / 2, 0.05, STORAGE_ORIGIN_Z + 2 * RACK_ROW_PITCH + RACK.d / 2 + AISLE.reach / 2 + 0.05],
    [ROW_WIDTH, 0.1, AISLE.reach],
  ),

  // --- 주 통로 (지게차, 보관구역 옆) ---
  obj('main-aisle', TYPES.AISLE, '주 통로 (지게차)', 'AISLE-MAIN',
    [STORAGE_ORIGIN_X + ROW_WIDTH + MAIN_AISLE_WIDTH / 2 + 0.5, 0.01, STORAGE_ORIGIN_Z + RACK_ROW_PITCH],
    [MAIN_AISLE_WIDTH, 0.02, RACK_ROW_PITCH * 3 + AISLE.reach],
    { color: '#64748b', opacity: 1, metadata: { standard: 'COUNTERBALANCE_3T', width: AISLE.forklift, aisleType: 'FORKLIFT' } },
  ),

  // --- 작업대 ---
  obj('ws-picking', TYPES.WORKSTATION, '피킹 작업대', 'WS-PICK',
    [BUILDING_W / 2 - 3, 0.45, STAGING_Z + 1],
    [2, 0.9, 1.5],
    { color: '#8b5cf6', metadata: { operator: '김물류', task: '피킹' } },
  ),
  obj('ws-inspect', TYPES.WORKSTATION, '검수 작업대', 'WS-QC',
    [BUILDING_W / 2 + 3, 0.45, STAGING_Z + 1],
    [2, 0.9, 1.5],
    { color: '#8b5cf6', metadata: { operator: '이검수', task: '품질검수' } },
  ),
  obj('ws-packing', TYPES.WORKSTATION, '포장 작업대', 'WS-PACK',
    [BUILDING_W / 2, 0.45, STAGING_Z + 3.5],
    [3, 0.9, 1.5],
    { color: '#8b5cf6', status: 'MAINTENANCE', metadata: { note: '장비 점검 중' } },
  ),

  // --- 보관 구역 영역 표시 (바닥 레벨) ---
  obj('zone-storage', TYPES.ZONE, '보관 구역', 'ZONE-STORAGE',
    [STORAGE_ORIGIN_X + ROW_WIDTH / 2, 0.05, STORAGE_ORIGIN_Z + RACK_ROW_PITCH],
    [ROW_WIDTH + 2, 0.1, RACK_ROW_PITCH * 3 + AISLE.reach],
    { color: '#f59e0b', opacity: 0.03, metadata: { rackStandard: 'KR_STANDARD', totalRacks: 48, totalPallets: 48 * 6 } },
  ),
];
