/**
 * 자동 발주 추천 API 클라이언트
 */

const API_BASE = '/api/v1';

// --- 타입 ---

export interface ReorderRecommendation {
  id: string;
  siteId: string;
  sku: string;
  itemName: string;
  currentQty: number;
  safetyStock: number;
  stockoutDate: string | null;
  daysUntilOut: number | null;
  reorderQty: number;
  partnerId: string | null;
  partnerName: string | null;
  avgLeadDays: number | null;
  orderByDate: string | null;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'ACCEPTED' | 'DISMISSED' | 'AUTO_ORDERED';
  voucherId: string | null;
  forecastMeta: {
    model: string;
    horizon: number;
    totalForecast: number;
    mape: number | null;
    dailyAvg: number;
  } | null;
  createdAt: string;
}

export interface ReorderSummary {
  pendingCount: number;
  totalCount: number;
  urgentCount: number;
  autoOrderedLast30d: number;
}

export interface ForecastResult {
  sku: string;
  horizon: number;
  model: string;
  dailyForecast: Array<{ date: string; qty: number }>;
  totalForecast: number;
  mape: number | null;
}

export interface LeadTimeRecord {
  partnerId: string;
  partnerName: string;
  sku: string;
  orderDate: string;
  receivedDate: string | null;
  actualDays: number | null;
  orderQty: number;
}

// --- API 함수 ---

export async function getRecommendations(
  siteId: string,
  status?: string,
  urgency?: string,
): Promise<ReorderRecommendation[]> {
  const params = new URLSearchParams({ siteId });
  if (status) params.set('status', status);
  if (urgency) params.set('urgency', urgency);
  const resp = await fetch(`${API_BASE}/reorder/recommendations?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function generateRecommendations(
  siteId: string,
  horizon?: number,
): Promise<{ recommendations: ReorderRecommendation[]; summary: Record<string, unknown> }> {
  const params = new URLSearchParams({ siteId });
  if (horizon) params.set('horizon', String(horizon));
  const resp = await fetch(`${API_BASE}/reorder/generate?${params}`, { method: 'POST' });
  const json = await resp.json();
  return json.data ?? { recommendations: [], summary: {} };
}

export async function acceptRecommendation(id: string): Promise<ReorderRecommendation> {
  const resp = await fetch(`${API_BASE}/reorder/recommendations/${id}/accept`, { method: 'PATCH' });
  const json = await resp.json();
  return json.data;
}

export async function dismissRecommendation(id: string): Promise<ReorderRecommendation> {
  const resp = await fetch(`${API_BASE}/reorder/recommendations/${id}/dismiss`, { method: 'PATCH' });
  const json = await resp.json();
  return json.data;
}

export async function getReorderSummary(siteId: string): Promise<ReorderSummary> {
  const resp = await fetch(`${API_BASE}/reorder/summary?siteId=${siteId}`);
  const json = await resp.json();
  return json.data;
}

export async function getForecast(
  siteId: string,
  sku: string,
  horizon?: number,
): Promise<ForecastResult> {
  const params = new URLSearchParams({ siteId, sku });
  if (horizon) params.set('horizon', String(horizon));
  const resp = await fetch(`${API_BASE}/reorder/forecast?${params}`);
  const json = await resp.json();
  return json.data;
}

export async function getLeadTimes(
  siteId: string,
  sku?: string,
): Promise<LeadTimeRecord[]> {
  const params = new URLSearchParams({ siteId });
  if (sku) params.set('sku', sku);
  const resp = await fetch(`${API_BASE}/reorder/lead-times?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}
