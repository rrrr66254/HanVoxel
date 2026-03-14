// 프리셋 카테고리
export interface PresetCategory {
  id: string;
  name: string;
  label: string;
  description: string | null;
  sortOrder: number;
}

// 공간 프리셋 (표준 규격)
export interface SpatialPreset {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  standard: string | null;
  region: string | null;

  // 치수 (m)
  width: number;
  depth: number;
  height: number;
  innerWidth: number | null;
  innerDepth: number | null;
  innerHeight: number | null;

  // 하중/용량
  weight: number | null;
  maxLoad: number | null;
  capacity: number | null;
  levels: number | null;
  levelHeight: number | null;
  loadPerLevel: number | null;

  // 제품 적재
  qtyPerPallet: number | null;
  kgPerPallet: number | null;

  // 3D 렌더링
  color: string | null;
  opacity: number;
  meshType: string | null;

  metadata: Record<string, unknown> | null;
  category?: PresetCategory;
}
