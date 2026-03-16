/**
 * ROI 추적 API 클라이언트
 * — 기준선 저장/조회 + 월별 스냅샷 + 대시보드
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

// ── 타입 ──

export interface RoiBaselineData {
  id: string;
  companyId: string;
  siteId: string;
  baselineDate: string;
  annualLaborCost: number;
  annualErrorCost: number;
  monthlyRentPerM2: number;
  warehouseArea: number;
  monthlyPickings: number;
  errorRate: number;
  employeeCount: number;
  laborSavingRate: number;
  errorReductionRate: number;
  spaceSavingRate: number;
  pickingEfficiencyGain: number;
}

export interface RoiSnapshotData {
  id: string;
  period: string;
  actualPickings: number;
  actualErrors: number;
  actualErrorRate: number;
  actualEmployeeCount: number;
  actualLaborCost: number;
  actualErrorCost: number;
  laborSaving: number;
  errorCostSaving: number;
  spaceSaving: number;
  totalSaving: number;
  cumulativeSaving: number;
  dataSource: string;
}

export interface RoiDashboardData {
  baseline: RoiBaselineData;
  snapshots: RoiSnapshotData[];
  summary: {
    monthsTracked: number;
    totalLaborSaving: number;
    totalErrorSaving: number;
    totalSpaceSaving: number;
    totalSaving: number;
    predictedAnnualTotal: number;
    achievementRate: number;
  };
}

// ── API 호출 ──

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? '요청 실패');
  return json.data;
}

/** 기준선 저장 */
export async function saveBaseline(input: {
  companyId: string; siteId: string;
  annualLaborCost: number; annualErrorCost: number; monthlyRentPerM2: number;
  warehouseArea: number; monthlyPickings: number; errorRate: number; employeeCount: number;
  laborSavingRate: number; errorReductionRate: number; spaceSavingRate: number; pickingEfficiencyGain: number;
}): Promise<RoiBaselineData> {
  return apiCall(`${API_BASE}/roi/baseline`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** 기준선 조회 */
export async function getBaseline(companyId: string, siteId: string): Promise<RoiBaselineData | null> {
  try {
    return await apiCall(`${API_BASE}/roi/baseline/${companyId}/${siteId}`);
  } catch {
    return null;
  }
}

/** 월별 스냅샷 저장 */
export async function saveSnapshot(input: {
  companyId: string; siteId: string; period: string;
  actualLaborCost: number; actualErrorCost: number; actualEmployeeCount: number;
}): Promise<RoiSnapshotData> {
  return apiCall(`${API_BASE}/roi/snapshot`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** 대시보드 데이터 조회 */
export async function getDashboard(companyId: string, siteId: string): Promise<RoiDashboardData | null> {
  try {
    return await apiCall(`${API_BASE}/roi/dashboard/${companyId}/${siteId}`);
  } catch {
    return null;
  }
}
