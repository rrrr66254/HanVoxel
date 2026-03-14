import type { SpatialObject, SpatialObjectType } from '../types/spatial';

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
};

// 샘플 창고 — 중견 자동차 부품 창고
export const MOCK_WAREHOUSE: SpatialObject[] = [
  // 바닥 (FLOOR)
  {
    id: 'floor-1',
    siteId: 'site-1',
    typeId: TYPES.FLOOR.id,
    type: TYPES.FLOOR,
    name: '1층 바닥',
    code: 'F1',
    status: 'ACTIVE',
    isActive: true,
    positionX: 20, positionY: -0.05, positionZ: 15,
    rotationX: -Math.PI / 2, rotationY: 0, rotationZ: 0,
    scaleX: 50, scaleY: 40, scaleZ: 1,
    color: '#1e293b',
    opacity: 0.6,
    visible: true,
    meshType: 'plane',
    metadata: null,
  },

  // 구역 A — 입고 구역
  {
    id: 'zone-a',
    siteId: 'site-1',
    typeId: TYPES.ZONE.id,
    type: TYPES.ZONE,
    name: '입고 구역 A',
    code: 'ZONE-A',
    status: 'ACTIVE',
    isActive: true,
    positionX: 5, positionY: 2, positionZ: 5,
    rotationX: 0, rotationY: 0, rotationZ: 0,
    scaleX: 12, scaleY: 4, scaleZ: 10,
    color: '#3b82f6',
    opacity: 0.08,
    visible: true,
    meshType: 'box',
    metadata: { purpose: '입고 대기 구역' },
  },

  // 구역 B — 출고 구역
  {
    id: 'zone-b',
    siteId: 'site-1',
    typeId: TYPES.ZONE.id,
    type: TYPES.ZONE,
    name: '출고 구역 B',
    code: 'ZONE-B',
    status: 'ACTIVE',
    isActive: true,
    positionX: 35, positionY: 2, positionZ: 5,
    rotationX: 0, rotationY: 0, rotationZ: 0,
    scaleX: 12, scaleY: 4, scaleZ: 10,
    color: '#10b981',
    opacity: 0.08,
    visible: true,
    meshType: 'box',
    metadata: { purpose: '출고 준비 구역' },
  },

  // 안전 구역
  {
    id: 'safety-1',
    siteId: 'site-1',
    typeId: TYPES.SAFETY_ZONE.id,
    type: TYPES.SAFETY_ZONE,
    name: '비상 통로',
    code: 'SAFE-1',
    status: 'ACTIVE',
    isActive: true,
    positionX: 20, positionY: 0.5, positionZ: 30,
    rotationX: 0, rotationY: 0, rotationZ: 0,
    scaleX: 40, scaleY: 1, scaleZ: 2,
    color: '#f43f5e',
    opacity: 0.15,
    visible: true,
    meshType: 'box',
    metadata: null,
  },

  // 랙 A열 (5개)
  ...createRackRow('A', 5, 3, { startX: 3, z: 15, spacing: 3 }),

  // 랙 B열 (5개)
  ...createRackRow('B', 5, 4, { startX: 3, z: 22, spacing: 3 }),

  // 랙 C열 (4개)
  ...createRackRow('C', 4, 3, { startX: 25, z: 15, spacing: 3 }),

  // 랙 D열 (4개)
  ...createRackRow('D', 4, 4, { startX: 25, z: 22, spacing: 3 }),

  // 작업대
  {
    id: 'ws-1',
    siteId: 'site-1',
    typeId: TYPES.WORKSTATION.id,
    type: TYPES.WORKSTATION,
    name: '피킹 작업대 1',
    code: 'WS-1',
    status: 'ACTIVE',
    isActive: true,
    positionX: 20, positionY: 0.5, positionZ: 5,
    rotationX: 0, rotationY: 0, rotationZ: 0,
    scaleX: 2, scaleY: 1, scaleZ: 1.5,
    color: '#8b5cf6',
    opacity: 1,
    visible: true,
    meshType: 'box',
    metadata: { operator: '김물류' },
  },
  {
    id: 'ws-2',
    siteId: 'site-1',
    typeId: TYPES.WORKSTATION.id,
    type: TYPES.WORKSTATION,
    name: '검수 작업대',
    code: 'WS-2',
    status: 'MAINTENANCE',
    isActive: true,
    positionX: 20, positionY: 0.5, positionZ: 8,
    rotationX: 0, rotationY: 0, rotationZ: 0,
    scaleX: 2, scaleY: 1, scaleZ: 1.5,
    color: null,
    opacity: 1,
    visible: true,
    meshType: 'box',
    metadata: { note: '장비 점검 중' },
  },
];

// 랙 행 생성 헬퍼
function createRackRow(
  rowLabel: string,
  count: number,
  levels: number,
  config: { startX: number; z: number; spacing: number },
): SpatialObject[] {
  const racks: SpatialObject[] = [];
  const rackWidth = 2;
  const rackDepth = 1;
  const rackHeight = levels * 1.2;

  for (let i = 0; i < count; i++) {
    const x = config.startX + i * (rackWidth + config.spacing);
    racks.push({
      id: `rack-${rowLabel}-${i + 1}`,
      siteId: 'site-1',
      typeId: TYPES.RACK.id,
      type: TYPES.RACK,
      name: `랙 ${rowLabel}-${String(i + 1).padStart(2, '0')}`,
      code: `RACK-${rowLabel}${String(i + 1).padStart(2, '0')}`,
      status: 'ACTIVE',
      isActive: true,
      positionX: x,
      positionY: rackHeight / 2,
      positionZ: config.z,
      rotationX: 0, rotationY: 0, rotationZ: 0,
      scaleX: rackWidth,
      scaleY: rackHeight,
      scaleZ: rackDepth,
      color: '#f59e0b',
      opacity: 0.9,
      visible: true,
      meshType: 'box',
      metadata: { levels, capacity: levels * 4 },
    });
  }

  return racks;
}
