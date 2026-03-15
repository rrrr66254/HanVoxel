// 공간 객체 타입 열거 (Spatial 계층 구조)
export type SpatialObjectTypeName =
  | 'SITE'
  | 'BUILDING'
  | 'FLOOR'
  | 'ZONE'
  | 'AISLE'
  | 'RACK'
  | 'BIN'
  | 'WORKSTATION'
  | 'MACHINE'
  | 'SAFETY_ZONE'
  | 'WALL';

// 공간 객체 상태
export type SpatialObjectStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

// 3D 메시 타입
export type MeshType = 'box' | 'cylinder' | 'sphere' | 'plane';

// 공간 객체 타입 정보
export interface SpatialObjectType {
  id: string;
  name: SpatialObjectTypeName;
  label: string;
  description: string | null;
  depth: number;
}

// 공간 객체 — DB spatial_objects 테이블 매핑
export interface SpatialObject {
  id: string;
  siteId: string;
  typeId: string;
  type: SpatialObjectType;
  name: string;
  code: string;
  status: SpatialObjectStatus;
  isActive: boolean;

  // 위치 (미터, site 원점 기준)
  positionX: number;
  positionY: number;
  positionZ: number;

  // 회전 (Euler, 라디안)
  rotationX: number;
  rotationY: number;
  rotationZ: number;

  // 크기 (미터)
  scaleX: number;
  scaleY: number;
  scaleZ: number;

  // 3D 렌더링
  color: string | null;
  opacity: number;
  visible: boolean;
  meshType: MeshType | null;

  // 메타데이터
  metadata: Record<string, unknown> | null;

  // 계층 관계
  children?: SpatialObject[];
}

// 공간 계층 구조
export interface SpatialHierarchy {
  id: string;
  parentId: string;
  childId: string;
  sortOrder: number;
}
