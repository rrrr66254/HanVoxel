// 창고 템플릿 — 업종별 추천 창고 구성
export interface WarehouseTemplate {
  id: string;
  name: string;
  code: string;
  description: string | null;
  industry: string;
  areaMin: number | null;
  areaMax: number | null;

  // 사용 프리셋 참조
  rackPresetId: string;
  palletPresetId: string;
  containerPresetId: string | null;

  // 레이아웃 기본값
  rackLayout: string;
  aisleType: string;
  aisleWidth: number;
  mainAisleWidth: number;

  metadata: Record<string, unknown> | null;

  // 조인된 프리셋 정보 (API 응답 시)
  rackPreset?: {
    code: string;
    name: string;
    width: number;
    depth: number;
    height: number;
    levels: number | null;
    levelHeight: number | null;
    loadPerLevel: number | null;
    color: string | null;
  };
  palletPreset?: {
    code: string;
    name: string;
    width: number;
    depth: number;
    height: number;
  };
}

// 업종 코드 → 한국어 라벨
export const INDUSTRY_LABELS: Record<string, string> = {
  FOOD_BEVERAGE: '식품·음료',
  AUTO_PARTS: '자동차 부품',
  ELECTRONICS_FC: '전자제품 풀필먼트',
  COLD_CHAIN: '냉장·냉동',
  CHEMICAL: '화학·소재',
  PHARMACEUTICAL: '의약품 GMP',
  EXPORT_EU: '유럽 수출',
};

// 업종 코드 → 아이콘/색상
export const INDUSTRY_COLORS: Record<string, string> = {
  FOOD_BEVERAGE: '#22c55e',
  AUTO_PARTS: '#ef4444',
  ELECTRONICS_FC: '#3b82f6',
  COLD_CHAIN: '#06b6d4',
  CHEMICAL: '#f97316',
  PHARMACEUTICAL: '#ec4899',
  EXPORT_EU: '#8b5cf6',
};

// 층별 크기 설정
export interface FloorConfig {
  floor: number;        // 층 번호 (1~10)
  areaWidth: number;    // m
  areaDepth: number;    // m
  ceilingHeight: number; // m
}

// 마법사 입력 데이터
export interface WizardFormData {
  warehouseName: string;
  areaWidth: number;   // m (기본값 / 1층 기준)
  areaDepth: number;   // m
  ceilingHeight: number; // m
  floorCount: number;  // 층 수 (1~10)
  floorConfigs: FloorConfig[]; // 층별 개별 설정
  industry: string;
  templateId: string | null;
  isEmptyWarehouse?: boolean; // 빈 창고 직접 구성 모드
}

// 빈 창고 템플릿 (직접 구성용)
export const EMPTY_WAREHOUSE_TEMPLATE: WarehouseTemplate = {
  id: '__empty__',
  name: '빈 창고',
  code: 'TPL_EMPTY',
  description: '템플릿 없이 빈 공간에서 직접 구성합니다. 프리셋 카탈로그에서 랙·팔레트 등을 자유롭게 배치하세요.',
  industry: '__ALL__',
  areaMin: null,
  areaMax: null,
  rackPresetId: '',
  palletPresetId: '',
  containerPresetId: null,
  rackLayout: 'SINGLE',
  aisleType: 'REACH_TRUCK',
  aisleWidth: 2.8,
  mainAisleWidth: 4.0,
  metadata: { variant: 'empty', isEmpty: true },
};

// 특정 층의 설정 가져오기 (개별 설정 없으면 기본값 사용)
export function getFloorConfig(form: WizardFormData, floorNumber: number): FloorConfig {
  const custom = form.floorConfigs.find((f) => f.floor === floorNumber);
  if (custom) return custom;
  return { floor: floorNumber, areaWidth: form.areaWidth, areaDepth: form.areaDepth, ceilingHeight: form.ceilingHeight };
}
