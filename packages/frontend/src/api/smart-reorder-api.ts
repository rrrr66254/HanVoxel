/**
 * 스마트 발주 API 클라이언트
 * 데이터 기반 발주 예측 & 자동화
 */

const API_BASE = '/api/v1';

// --- 타입 ---

export interface SmartSchedule {
  id: string;
  siteId: string;
  skuCode: string;
  skuName: string;
  vendorId: string | null;
  vendorName: string | null;
  recommendedOrderDate: string;
  recommendedQty: number;
  estimatedArrivalDate: string | null;
  arrivalConfidence: number | null;
  arrivalRangeMin: string | null;
  arrivalRangeMax: string | null;
  stockoutRiskDate: string | null;
  reason: string | null;
  status: 'AUTO_SCHEDULED' | 'CONFIRMED' | 'ORDERED' | 'ARRIVED';
  currentStock: number;
  safetyStock: number;
  dailyUsage: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}

export interface TimelineItem {
  skuCode: string;
  skuName: string;
  currentStock: number;
  dailyUsage: number;
  safetyStock: number;
  stockSufficientUntil: string;
  recommendedOrderDate: string | null;
  estimatedArrivalDate: string | null;
  arrivalRangeMin: string | null;
  arrivalRangeMax: string | null;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  vendorName: string | null;
}

export interface ArrivalPrediction {
  vendorId: string;
  vendorName: string;
  skuCode: string;
  orderDate: string;
  estimatedArrival: string;
  arrivalRangeMin: string;
  arrivalRangeMax: string;
  confidence: number;
  avgLeadTime: number;
  p90LeadTime: number;
  sampleCount: number;
  recentAvg: number;
  seasonalAdjustment: number;
}

export interface AccuracyReport {
  overallMape: number;
  demandAccuracy: number;
  leadTimeAccuracy: number;
  totalPredictions: number;
  perSku: Array<{
    skuCode: string;
    skuName: string;
    mape: number;
    sampleCount: number;
    modelUsed: string;
  }>;
  perVendor: Array<{
    vendorId: string;
    vendorName: string;
    avgLeadTime: number;
    p90LeadTime: number;
    onTimeRate: number;
    sampleCount: number;
  }>;
}

export interface SmartReorderSummary {
  thisWeekOrders: number;
  avgLeadTimeAccuracy: number;
  stockoutRiskCount: number;
  savedUrgentOrders: number;
}

// --- API 함수 ---

export async function getSmartSchedules(
  siteId: string,
  filters?: { urgent?: boolean; status?: string },
): Promise<{ schedules: SmartSchedule[]; summary: SmartReorderSummary }> {
  const params = new URLSearchParams({ siteId });
  if (filters?.urgent) params.set('urgent', 'true');
  if (filters?.status) params.set('status', filters.status);
  const resp = await fetch(`${API_BASE}/smart-reorder/schedule?${params}`);
  const json = await resp.json();
  return json.data ?? { schedules: [], summary: { thisWeekOrders: 0, avgLeadTimeAccuracy: 0, stockoutRiskCount: 0, savedUrgentOrders: 0 } };
}

export async function getTimeline(
  siteId: string,
  days = 60,
): Promise<TimelineItem[]> {
  const params = new URLSearchParams({ siteId, days: String(days) });
  const resp = await fetch(`${API_BASE}/smart-reorder/timeline?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function predictArrival(
  vendorId: string,
  skuCode: string,
  orderDate: string,
): Promise<ArrivalPrediction> {
  const params = new URLSearchParams({ vendor_id: vendorId, sku_code: skuCode, order_date: orderDate });
  const resp = await fetch(`${API_BASE}/smart-reorder/predict-arrival?${params}`);
  const json = await resp.json();
  return json.data;
}

export async function getAccuracyReport(siteId: string): Promise<AccuracyReport> {
  const params = new URLSearchParams({ siteId });
  const resp = await fetch(`${API_BASE}/smart-reorder/accuracy?${params}`);
  const json = await resp.json();
  return json.data;
}

export async function confirmSchedule(id: string): Promise<SmartSchedule> {
  const resp = await fetch(`${API_BASE}/smart-reorder/confirm/${id}`, { method: 'POST' });
  const json = await resp.json();
  return json.data;
}

export async function triggerTraining(siteId: string): Promise<{ message: string }> {
  const resp = await fetch(`${API_BASE}/smart-reorder/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId }),
  });
  const json = await resp.json();
  return json.data;
}
