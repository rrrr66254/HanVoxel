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

// 마법사 입력 데이터
export interface WizardFormData {
  warehouseName: string;
  areaWidth: number;   // m
  areaDepth: number;   // m
  ceilingHeight: number; // m
  industry: string;
  templateId: string | null;
}
