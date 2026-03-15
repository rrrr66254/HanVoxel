/**
 * 업계 벤치마크 API 클라이언트
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

// ── 타입 ──

export interface CompanyMetrics {
  companyId: string;
  siteId: string;
  pickingAccuracy: number;
  inventoryTurnover: number;
  spaceUtilization: number;
  onTimeDelivery: number;
  receivingTime: number;
  orderCycleTime: number;
}

export interface BenchmarkSnapshot {
  period: string;
  industry: string;
  companySize: string;
  participantCount: number;
  averages: Record<string, number>;
  percentiles: Record<string, { p25: number; p50: number; p75: number; p90: number }>;
}

export interface CompanyRank {
  companyId: string;
  siteId: string;
  metrics: Record<string, number>;
  percentileRanks: Record<string, number>;
  overallScore: number;
}

export interface RecommendationItem {
  kpi: string;
  kpiLabel: string;
  currentValue: number;
  industryAvg: number;
  industryP75: number;
  gapPercent: number;
  priority: string;
  message: string;
}

export interface BenchmarkData {
  myMetrics: CompanyMetrics;
  benchmark: BenchmarkSnapshot;
  rank: CompanyRank;
  recommendations: RecommendationItem[];
}

export interface BenchmarkReport {
  id: string;
  companyId: string;
  siteId: string;
  period: string;
  title: string;
  reportData: Record<string, unknown>;
  recommendations: RecommendationItem[];
  status: string;
  createdAt: string;
}

export interface CompanyBenchmarkHistory {
  id: string;
  period: string;
  pickingAccuracy: number;
  inventoryTurnover: number;
  spaceUtilization: number;
  onTimeDelivery: number;
  receivingTime: number;
  orderCycleTime: number;
  overallScore: number;
  percentileRanks: Record<string, number>;
}

// ── API 함수 ──

export async function getMyBenchmark(
  companyId: string,
  siteId: string,
  period: string,
): Promise<BenchmarkData | null> {
  const params = new URLSearchParams({ companyId, siteId, period });
  const resp = await fetch(`${API_BASE}/benchmark/my?${params}`);
  const json = await resp.json();
  return json.data;
}

export async function getMyMetrics(
  companyId: string,
  siteId: string,
  period: string,
): Promise<CompanyMetrics> {
  const params = new URLSearchParams({ companyId, siteId, period });
  const resp = await fetch(`${API_BASE}/benchmark/metrics?${params}`);
  const json = await resp.json();
  return json.data;
}

export async function generateReport(
  companyId: string,
  siteId: string,
  period: string,
): Promise<BenchmarkReport> {
  const resp = await fetch(`${API_BASE}/benchmark/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, siteId, period }),
  });
  const json = await resp.json();
  return json.data;
}

export async function getReports(companyId: string): Promise<BenchmarkReport[]> {
  const params = new URLSearchParams({ companyId });
  const resp = await fetch(`${API_BASE}/benchmark/reports?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function getBenchmarkHistory(
  companyId: string,
  siteId: string,
  months: number = 6,
): Promise<CompanyBenchmarkHistory[]> {
  const params = new URLSearchParams({ companyId, siteId, months: String(months) });
  const resp = await fetch(`${API_BASE}/benchmark/history?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}
