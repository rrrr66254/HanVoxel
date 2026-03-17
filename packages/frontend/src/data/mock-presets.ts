import type { PresetCategory, SpatialPreset } from '../types/preset';

// DB seed와 동일한 카테고리
export const MOCK_CATEGORIES: PresetCategory[] = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'RACK',          label: '팔레트 랙',   description: '팔레트 보관용 랙 규격',             sortOrder: 1 },
  { id: '10000000-0000-0000-0000-000000000002', name: 'PALLET',        label: '팔레트',      description: '화물 적재 팔레트 규격',              sortOrder: 2 },
  { id: '10000000-0000-0000-0000-000000000003', name: 'LOADED_PALLET', label: '적재 팔레트', description: '팔레트 + 화물 합산 높이',             sortOrder: 3 },
  { id: '10000000-0000-0000-0000-000000000004', name: 'CONTAINER',     label: '컨테이너',    description: 'ISO 표준 해상 컨테이너 규격',         sortOrder: 4 },
  { id: '10000000-0000-0000-0000-000000000005', name: 'AISLE',         label: '통로',        description: '창고 내 통로 너비 기준',              sortOrder: 5 },
  { id: '10000000-0000-0000-0000-000000000006', name: 'PRODUCT_BOX',   label: '제품 박스',   description: '업종별 박스 규격 및 팔레트 적재 기준', sortOrder: 6 },
  { id: '10000000-0000-0000-0000-000000000007', name: 'EQUIPMENT',     label: '작업 장비',   description: '검수 작업대, 포장대, 충전소 등',      sortOrder: 7 },
  { id: '10000000-0000-0000-0000-000000000008', name: 'SAFETY',        label: '안전·소방',   description: '소화전, 소화기, 비상구 표시 등',      sortOrder: 8 },
  { id: '10000000-0000-0000-0000-000000000009', name: 'FACILITY',      label: '시설물',      description: '기둥, 배전반, 분리수거함 등',         sortOrder: 9 },
  { id: '10000000-0000-0000-0000-000000000010', name: 'FLOOR',         label: '바닥',        description: '공장 바닥 타일 및 마감재',            sortOrder: 10 },
  { id: '10000000-0000-0000-0000-000000000011', name: 'WALL',          label: '벽',          description: '공장 벽면 패널 및 마감재',            sortOrder: 11 },
  { id: '10000000-0000-0000-0000-000000000012', name: 'DOOR',          label: '출입문',      description: '창고 출입문 및 로딩 도크 게이트',      sortOrder: 12 },
];

const CAT = Object.fromEntries(MOCK_CATEGORIES.map((c) => [c.name, c.id]));

// DB seed 기반 mock 프리셋 데이터
export const MOCK_PRESETS: SpatialPreset[] = [
  // === 랙 ===
  p(CAT.RACK, 'RACK_KR_STANDARD', '국내 일반형 랙',    'KS',       'KR', 2.7,1.1,5.4,   { levels:3, levelHeight:1.5, loadPerLevel:1000, color:'#f59e0b' }),
  p(CAT.RACK, 'RACK_KR_LARGE',    '국내 대형형 랙',    'KS',       'KR', 2.7,1.1,6.0,   { levels:4, levelHeight:1.4, loadPerLevel:1500, color:'#f59e0b' }),
  p(CAT.RACK, 'RACK_KR_HEAVY',    '국내 중량형 랙',    'KS',       'KR', 2.7,1.35,6.0,  { levels:4, levelHeight:1.4, loadPerLevel:2000, color:'#f59e0b' }),
  p(CAT.RACK, 'RACK_KR_HIGH',     '국내 고층형 랙',    'KS',       'KR', 2.7,1.1,9.0,   { levels:6, levelHeight:1.4, loadPerLevel:1000, color:'#f59e0b' }),
  p(CAT.RACK, 'RACK_EU_STANDARD', '유럽 표준형 랙',    'EN 15512', 'EU', 2.7,1.1,6.0,   { levels:4, levelHeight:1.4, loadPerLevel:1500, color:'#f59e0b' }),
  p(CAT.RACK, 'RACK_EU_LARGE',    '유럽 대형 랙',      'EN 15512', 'EU', 3.6,1.2,8.0,   { levels:5, levelHeight:1.5, loadPerLevel:2000, color:'#f59e0b' }),
  p(CAT.RACK, 'RACK_US_STANDARD', '미국 표준형 랙',    'RMI',      'US', 2.743,1.067,6.1,{ levels:4, levelHeight:1.4, loadPerLevel:1360, color:'#f59e0b' }),
  p(CAT.RACK, 'RACK_US_LARGE',    '미국 대형 랙',      'RMI',      'US', 2.743,1.219,9.1,{ levels:6, levelHeight:1.4, loadPerLevel:2041, color:'#f59e0b' }),
  p(CAT.RACK, 'RACK_DRIVE_IN',    '드라이브인 랙',     null,     'INTL', 2.7,5.5,6.0,   { levels:4, levelHeight:1.4, loadPerLevel:1500, color:'#d97706' }),
  p(CAT.RACK, 'RACK_FLOW',        '플로우 랙',         null,     'INTL', 2.7,5.5,6.0,   { levels:4, levelHeight:1.4, loadPerLevel:1000, color:'#d97706' }),
  p(CAT.RACK, 'RACK_CANTILEVER',  '캔틸레버 랙',       null,     'INTL', 1.0,1.5,4.0,   { levels:4, levelHeight:0.9, loadPerLevel:500,  color:'#d97706' }),

  // === 팔레트 ===
  p(CAT.PALLET, 'PALLET_T11',       'T11형 팔레트',           'KS A 1003','KR', 1.1,1.1,0.144,  { weight:20, maxLoad:1000, color:'#8b5cf6' }),
  p(CAT.PALLET, 'PALLET_T12',       'T12형 팔레트',           'KS A 1003','KR', 1.2,1.0,0.144,  { weight:22, maxLoad:1000, color:'#8b5cf6' }),
  p(CAT.PALLET, 'PALLET_T08',       'T08형 팔레트',           'KS A 1003','KR', 0.8,1.1,0.144,  { weight:13, maxLoad:500,  color:'#8b5cf6' }),
  p(CAT.PALLET, 'PALLET_ISO_1',     'ISO 1 팔레트',           'ISO 6780','INTL',1.2,1.0,0.144,  { weight:20, maxLoad:1000, color:'#7c3aed' }),
  p(CAT.PALLET, 'PALLET_ISO_2_EUR', 'ISO 2 EUR 팔레트',       'ISO 6780','EU',  1.2,0.8,0.144,  { weight:15, maxLoad:1000, color:'#7c3aed' }),
  p(CAT.PALLET, 'PALLET_STEEL',     '철제 팔레트',             null,     'INTL',1.1,1.1,0.15,   { weight:40, maxLoad:2000, color:'#a78bfa' }),
  p(CAT.PALLET, 'PALLET_PLASTIC',   '플라스틱 팔레트',          null,     'INTL',1.1,1.1,0.144,  { weight:20, maxLoad:1000, color:'#a78bfa' }),

  // === 적재 팔레트 ===
  p(CAT.LOADED_PALLET, 'LOADED_KR_STANDARD', '국내 일반 적재', 'KS', 'KR', 1.1,1.1,1.2, {}),
  p(CAT.LOADED_PALLET, 'LOADED_KR_HEAVY',    '국내 고밀도 적재','KS', 'KR', 1.1,1.1,1.5, {}),
  p(CAT.LOADED_PALLET, 'LOADED_EU_STANDARD', '유럽 표준 적재',  'EN', 'EU', 1.2,0.8,1.2, {}),

  // === 컨테이너 ===
  p(CAT.CONTAINER, 'CONTAINER_DRY_20FT',    '20ft 드라이 컨테이너',  'ISO 668','INTL', 2.438,6.058,2.591,   { maxLoad:21770, capacity:33.2,  color:'#1d4ed8', innerWidth:2.352, innerDepth:5.898,  innerHeight:2.393 }),
  p(CAT.CONTAINER, 'CONTAINER_DRY_40FT',    '40ft 드라이 컨테이너',  'ISO 668','INTL', 2.438,12.192,2.591,  { maxLoad:26750, capacity:67.6,  color:'#1d4ed8', innerWidth:2.352, innerDepth:12.032, innerHeight:2.393 }),
  p(CAT.CONTAINER, 'CONTAINER_HC_40FT',     '40ft HC 컨테이너',      'ISO 668','INTL', 2.438,12.192,2.896,  { maxLoad:26460, capacity:76.4,  color:'#1d4ed8', innerWidth:2.352, innerDepth:12.032, innerHeight:2.698 }),
  p(CAT.CONTAINER, 'CONTAINER_REEFER_20FT', '20ft 냉장 컨테이너',    'ISO 1496','INTL',2.438,6.058,2.591,   { maxLoad:21200, capacity:28.3,  color:'#0ea5e9', innerWidth:2.286, innerDepth:5.486,  innerHeight:2.261 }),
  p(CAT.CONTAINER, 'CONTAINER_REEFER_40FT', '40ft 냉장 컨테이너',    'ISO 1496','INTL',2.438,12.192,2.591,  { maxLoad:25080, capacity:59.8,  color:'#0ea5e9', innerWidth:2.286, innerDepth:11.583, innerHeight:2.261 }),

  // === 통로 (width=너비, depth=기본 길이 5m, height=0.02 얇은 마킹) ===
  p(CAT.AISLE, 'AISLE_PEDESTRIAN',       '보행 전용 통로',              '산업안전보건기준','KR',  1.2,5.0,0.02, { color:'#475569', aisleType:'PEDESTRIAN' }),
  p(CAT.AISLE, 'AISLE_MAIN',             '주 통로',                    '산업안전보건기준','KR',  2.4,5.0,0.02, { color:'#475569', aisleType:'MAIN' }),
  p(CAT.AISLE, 'AISLE_EMERGENCY',        '비상구 통로',                 '소방법',       'KR',  1.5,5.0,0.02, { color:'#f43f5e', aisleType:'EMERGENCY' }),
  p(CAT.AISLE, 'AISLE_COUNTERBALANCE_3T','카운터밸런스 지게차 통로',      null,         'INTL', 4.0,8.0,0.02, { color:'#64748b', aisleType:'FORKLIFT' }),
  p(CAT.AISLE, 'AISLE_REACH_TRUCK',      '리치트럭 통로',               null,         'INTL', 2.8,6.0,0.02, { color:'#64748b', aisleType:'REACH' }),
  p(CAT.AISLE, 'AISLE_AGV_FORKLIFT',     'AGV 무인지게차 통로',          null,         'INTL', 2.5,6.0,0.02, { color:'#64748b', aisleType:'AGV' }),

  // === 제품 박스 ===
  p(CAT.PRODUCT_BOX, 'BOX_FOOD_BEVERAGE', '식품·음료 박스',    null,'INTL', 0.4,0.3,0.3,  { qtyPerPallet:24, kgPerPallet:300, color:'#22c55e' }),
  p(CAT.PRODUCT_BOX, 'BOX_AUTO_PARTS',    '자동차 부품 박스',  null,'INTL', 0.6,0.4,0.4,  { qtyPerPallet:8,  kgPerPallet:600, color:'#ef4444' }),
  p(CAT.PRODUCT_BOX, 'BOX_ELECTRONICS',   '전자부품 박스',     null,'INTL', 0.5,0.35,0.25,{ qtyPerPallet:12, kgPerPallet:200, color:'#3b82f6' }),
  p(CAT.PRODUCT_BOX, 'BOX_PHARMA',        '의약품 박스',       null,'INTL', 0.3,0.2,0.2,  { qtyPerPallet:36, kgPerPallet:150, color:'#ec4899' }),
  p(CAT.PRODUCT_BOX, 'BOX_CHEMICAL',      '화학·소재 박스',    null,'INTL', 0.55,0.35,0.4,{ qtyPerPallet:8,  kgPerPallet:800, color:'#f97316' }),
  p(CAT.PRODUCT_BOX, 'BOX_GENERAL',       '일반 공산품 박스',  null,'INTL', 0.4,0.3,0.25, { qtyPerPallet:20, kgPerPallet:250, color:'#6b7280' }),
  p(CAT.PRODUCT_BOX, 'BOX_COLD_CHAIN',    '냉장 식품 박스',    null,'INTL', 0.4,0.3,0.25, { qtyPerPallet:20, kgPerPallet:280, color:'#06b6d4' }),

  // === 작업 장비 ===
  p(CAT.EQUIPMENT, 'EQUIP_QC_TABLE_STANDARD',  '검수 작업대 (표준)',     null,'KR',  1.5,0.8,0.9,  { metadata: { equipType:'QC_TABLE' },  color:'#06b6d4' }),
  p(CAT.EQUIPMENT, 'EQUIP_QC_TABLE_LARGE',     '검수 작업대 (대형)',     null,'KR',  2.0,1.0,0.9,  { metadata: { equipType:'QC_TABLE' },  color:'#06b6d4' }),
  p(CAT.EQUIPMENT, 'EQUIP_PACKING_STANDARD',   '포장 작업대 (표준)',     null,'KR',  1.8,0.8,0.9,  { metadata: { equipType:'PACKING' },   color:'#06b6d4' }),
  p(CAT.EQUIPMENT, 'EQUIP_PACKING_LARGE',      '포장 작업대 (대형)',     null,'KR',  2.4,1.0,0.9,  { metadata: { equipType:'PACKING' },   color:'#06b6d4' }),
  p(CAT.EQUIPMENT, 'EQUIP_CHARGING_STANDARD',  '충전 스테이션 (소형)',   null,'INTL',2.0,2.0,0.5,  { metadata: { equipType:'CHARGING' },  color:'#06b6d4' }),
  p(CAT.EQUIPMENT, 'EQUIP_CHARGING_LARGE',     '충전 스테이션 (대형)',   null,'INTL',3.0,3.0,0.6,  { metadata: { equipType:'CHARGING' },  color:'#06b6d4' }),

  // === 안전·소방 ===
  p(CAT.SAFETY, 'SAFETY_HYDRANT',             '소화전 캐비닛',          null,'KR',  0.6,0.2,0.8,  { metadata: { safetyType:'FIRE_HYDRANT', wallMounted: true },     color:'#ef4444' }),
  p(CAT.SAFETY, 'SAFETY_EXTINGUISHER_SMALL',  '소화기 (소형 3.3kg)',    null,'KR',  0.2,0.2,0.5,  { metadata: { safetyType:'FIRE_EXTINGUISHER' }, color:'#ef4444' }),
  p(CAT.SAFETY, 'SAFETY_EXTINGUISHER_LARGE',  '소화기 (대형 6.5kg)',    null,'KR',  0.25,0.25,0.65,{ metadata: { safetyType:'FIRE_EXTINGUISHER' }, color:'#ef4444' }),
  p(CAT.SAFETY, 'SAFETY_EXIT_SIGN',           '비상구 표시등',          null,'KR',  0.4,0.08,0.2, { metadata: { safetyType:'EXIT_SIGN', wallMounted: true, mountHeight: 2.5 },         color:'#22c55e' }),
  p(CAT.SAFETY, 'SAFETY_GUARDRAIL_3M',        '안전 가드레일 (3m)',     null,'KR',  0.1,3.0,1.1,  { metadata: { safetyType:'GUARD_RAIL' },        color:'#eab308' }),
  p(CAT.SAFETY, 'SAFETY_GUARDRAIL_6M',        '안전 가드레일 (6m)',     null,'KR',  0.1,6.0,1.1,  { metadata: { safetyType:'GUARD_RAIL' },        color:'#eab308' }),
  p(CAT.SAFETY, 'SAFETY_BOLLARD',             '안전 볼라드',            null,'INTL',0.22,0.22,0.9, { metadata: { safetyType:'BOLLARD' },           color:'#eab308' }),

  // === 시설물 ===
  p(CAT.FACILITY, 'FACILITY_COLUMN_STANDARD', '건물 기둥 (표준)',       null,'KR',  0.4,0.4,4.0,  { metadata: { facilityType:'COLUMN' },     color:'#9ca3af' }),
  p(CAT.FACILITY, 'FACILITY_COLUMN_LARGE',    '건물 기둥 (대형)',       null,'KR',  0.6,0.6,6.0,  { metadata: { facilityType:'COLUMN' },     color:'#9ca3af' }),
  p(CAT.FACILITY, 'FACILITY_ELEC_PANEL',      '배전반',                null,'KR',  0.8,0.3,1.5,  { metadata: { facilityType:'ELEC_PANEL', wallMounted: true, mountHeight: 1.2 }, color:'#6b7280' }),
  p(CAT.FACILITY, 'FACILITY_TRASH_SET',       '분리수거함 세트',        null,'KR',  1.2,0.5,0.9,  { metadata: { facilityType:'TRASH' },      color:'#6b7280' }),
  p(CAT.FACILITY, 'FACILITY_STAIRS',          '계단',                  null,'INTL',3.0,5.0,8.0,  { metadata: { facilityType:'STAIRS', capacity: 20 }, color:'#6b7280' }),
  p(CAT.FACILITY, 'FACILITY_STAIRS_SMALL',    '계단 (소형)',            null,'INTL',2.0,3.0,4.0,  { metadata: { facilityType:'STAIRS', capacity: 10 }, color:'#6b7280' }),
  p(CAT.FACILITY, 'FACILITY_PASSENGER_ELEV',  '승객용 엘리베이터',      null,'INTL',2.0,2.0,8.0,  { metadata: { facilityType:'PASSENGER_ELEVATOR', capacity: 1000 }, color:'#3b82f6' }),
  p(CAT.FACILITY, 'FACILITY_FREIGHT_LIFT',    '화물 리프트',            null,'INTL',3.0,3.0,8.0,  { metadata: { facilityType:'FREIGHT_LIFT', capacity: 5000 }, color:'#f59e0b' }),
  p(CAT.FACILITY, 'FACILITY_FREIGHT_LIFT_LG', '화물 리프트 (대형)',     null,'INTL',4.0,4.0,10.0, { metadata: { facilityType:'FREIGHT_LIFT', capacity: 10000 }, color:'#f59e0b' }),

  // === 바닥 (width/depth=면적, height=0.02 얇은 바닥) ===
  p(CAT.FLOOR, 'FLOOR_EPOXY_GRAY',  '에폭시 코팅 바닥 (회색)', null,'KR', 10,10,0.02, { floorStyle:'EPOXY_GRAY',  color:'#6B7B8D' }),
  p(CAT.FLOOR, 'FLOOR_EPOXY_GREEN', '에폭시 코팅 바닥 (녹색)', null,'KR', 10,10,0.02, { floorStyle:'EPOXY_GREEN', color:'#4A7B5A' }),
  p(CAT.FLOOR, 'FLOOR_CONCRETE',    '콘크리트 바닥',           null,'INTL',10,10,0.02, { floorStyle:'CONCRETE',    color:'#8A8A82' }),
  p(CAT.FLOOR, 'FLOOR_ANTI_SLIP',   '미끄럼방지 타일 바닥',     null,'KR', 10,10,0.02, { floorStyle:'ANTI_SLIP',   color:'#707878' }),
  p(CAT.FLOOR, 'FLOOR_MARKING',     '안전 마킹 바닥',          null,'KR',  5, 5,0.02, { floorStyle:'MARKING',     color:'#D4A017' }),

  // === 벽 (width=너비, depth=두께, height=높이) ===
  p(CAT.WALL, 'WALL_SANDWICH_PANEL', '샌드위치 패널 벽',   null,'KR',  5,0.15,4, { wallStyle:'SANDWICH_PANEL',   color:'#C8CDD3' }),
  p(CAT.WALL, 'WALL_CONCRETE',       '콘크리트 벽',        null,'INTL', 5,0.2, 4, { wallStyle:'CONCRETE_WALL',    color:'#9A978F' }),
  p(CAT.WALL, 'WALL_METAL',          '금속 골판 벽',       null,'INTL', 5,0.1, 4, { wallStyle:'METAL_CORRUGATED', color:'#8090A0' }),
  p(CAT.WALL, 'WALL_BRICK',          '벽돌 벽',            null,'INTL', 5,0.2, 4, { wallStyle:'BRICK',            color:'#8B5E3C' }),

  // === 출입문 (width=너비, depth=두께, height=높이) ===
  p(CAT.DOOR, 'DOOR_ROLLING_SHUTTER', '롤링 셔터 (창고문)',      null,'KR',   4.0,0.15,4.5, { doorStyle:'ROLLING_SHUTTER',  color:'#6B7280' }),
  p(CAT.DOOR, 'DOOR_SWING_DOUBLE',    '양개 스윙 도어',           null,'INTL', 2.0,0.1, 2.5, { doorStyle:'SWING_DOUBLE',     color:'#2563EB' }),
  p(CAT.DOOR, 'DOOR_SLIDING',         '슬라이딩 도어',            null,'INTL', 3.0,0.12,3.0, { doorStyle:'SLIDING',          color:'#4B5563' }),
  p(CAT.DOOR, 'DOOR_DOCK_LEVELER',    '독 레벨러 (로딩 도크)',    null,'INTL', 3.5,0.15,4.0, { doorStyle:'DOCK_LEVELER',     color:'#374151' }),
];

// 프리셋 생성 헬퍼
function p(
  categoryId: string,
  code: string,
  name: string,
  standard: string | null,
  region: string | null,
  width: number,
  depth: number,
  height: number,
  ext: Partial<SpatialPreset>,
): SpatialPreset {
  return {
    id: `preset-${code}`,
    categoryId,
    code,
    name,
    standard,
    region,
    width,
    depth,
    height,
    innerWidth: null,
    innerDepth: null,
    innerHeight: null,
    weight: null,
    maxLoad: null,
    capacity: null,
    levels: null,
    levelHeight: null,
    loadPerLevel: null,
    qtyPerPallet: null,
    kgPerPallet: null,
    color: null,
    opacity: 1,
    meshType: 'box',
    metadata: null,
    ...ext,
  };
}
