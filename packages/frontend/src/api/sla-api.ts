const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { total?: number };
}

// ── 타입 ────────────────────────────────────────────────

export interface SlaTargetData {
  id: string;
  companyId: string;
  siteId: string;
  name: string;
  deliveryOnTimeTarget: number;
  misshipmentRateLimit: number;
  pickingAccuracyTarget: number;
  avgProcessingTimeLimit: number;
  escalationEnabled: boolean;
  escalationEmails: string[] | null;
  escalationThreshold: number;
  isActive: boolean;
}

export interface SlaMetricData {
  id: string;
  slaTargetId: string;
  recordDate: string;
  deliveryOnTimeRate: number;
  misshipmentRate: number;
  pickingAccuracy: number;
  avgProcessingTime: number;
  totalOrders: number;
  onTimeOrders: number;
  misshipmentCount: number;
  totalPicks: number;
  accuratePicks: number;
}

export interface SlaViolationData {
  id: string;
  slaTargetId: string;
  metricName: string;
  targetValue: number;
  actualValue: number;
  violationDate: string;
  severity: string;
  escalated: boolean;
  resolvedAt: string | null;
  note: string | null;
}

export interface SlaReportData {
  target: SlaTargetData;
  metrics: SlaMetricData[];
  violations: SlaViolationData[];
  summary: {
    period: { from: string; to: string };
    totalDays: number;
    avgDeliveryOnTimeRate: number;
    avgMisshipmentRate: number;
    avgPickingAccuracy: number;
    avgProcessingTime: number;
    totalOrders: number;
    totalPicks: number;
    violationCount: number;
    unresolvedViolations: number;
    escalatedCount: number;
    deliveryOnTimeMet: boolean;
    misshipmentRateMet: boolean;
    pickingAccuracyMet: boolean;
    processingTimeMet: boolean;
  } | null;
}

// ── API 함수 ────────────────────────────────────────────

export async function upsertSlaTarget(data: {
  companyId: string;
  siteId: string;
  name: string;
  deliveryOnTimeTarget?: number;
  misshipmentRateLimit?: number;
  pickingAccuracyTarget?: number;
  avgProcessingTimeLimit?: number;
  escalationEnabled?: boolean;
  escalationEmails?: string[];
  escalationThreshold?: number;
}): Promise<SlaTargetData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/sla/targets`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json: ApiResponse<SlaTargetData> = await res.json();
    return json.success ? json.data : null;
  } catch {
    console.warn('[API] SLA 기준 설정 실패 (오프라인 모드)');
    return null;
  }
}

export async function getSlaTarget(companyId: string, siteId: string): Promise<SlaTargetData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/sla/targets?companyId=${companyId}&siteId=${siteId}`);
    const json: ApiResponse<SlaTargetData> = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function getSlaMetrics(
  slaTargetId: string,
  options?: { from?: string; to?: string; limit?: number },
): Promise<SlaMetricData[]> {
  try {
    const params = new URLSearchParams({ slaTargetId });
    if (options?.from) params.set('from', options.from);
    if (options?.to) params.set('to', options.to);
    if (options?.limit) params.set('limit', String(options.limit));
    const res = await fetch(`${API_BASE}/api/v1/sla/metrics?${params}`);
    const json: ApiResponse<SlaMetricData[]> = await res.json();
    return json.success && json.data ? json.data : [];
  } catch {
    return [];
  }
}

export async function getSlaReport(
  slaTargetId: string,
  from: string,
  to: string,
): Promise<SlaReportData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/sla/report?slaTargetId=${slaTargetId}&from=${from}&to=${to}`);
    const json: ApiResponse<SlaReportData> = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function getSlaViolations(
  slaTargetId: string,
  options?: { from?: string; to?: string; metricName?: string },
): Promise<SlaViolationData[]> {
  try {
    const params = new URLSearchParams({ slaTargetId });
    if (options?.from) params.set('from', options.from);
    if (options?.to) params.set('to', options.to);
    if (options?.metricName) params.set('metricName', options.metricName);
    const res = await fetch(`${API_BASE}/api/v1/sla/violations?${params}`);
    const json: ApiResponse<SlaViolationData[]> = await res.json();
    return json.success && json.data ? json.data : [];
  } catch {
    return [];
  }
}
