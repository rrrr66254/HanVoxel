const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface AlertData {
  id: string;
  siteId: string;
  metricType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  anomalyCount: number;
  isRead: boolean;
  resolvedAt: string | null;
  metadata: Record<string, unknown> | null;
  detectedAt: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { total?: number };
}

// 알림 목록 조회
export async function getAlerts(
  siteId: string,
  options?: { severity?: string; isRead?: boolean; limit?: number; offset?: number },
): Promise<{ alerts: AlertData[]; total: number }> {
  try {
    const params = new URLSearchParams({ siteId });
    if (options?.severity) params.set('severity', options.severity);
    if (options?.isRead !== undefined) params.set('isRead', String(options.isRead));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const res = await fetch(`${API_BASE}/api/v1/alerts?${params}`);
    const json: ApiResponse<AlertData[]> = await res.json();
    if (json.success && json.data) {
      return { alerts: json.data, total: json.meta?.total ?? json.data.length };
    }
    return { alerts: [], total: 0 };
  } catch {
    console.warn('[API] 알림 조회 실패 (오프라인 모드)');
    return { alerts: [], total: 0 };
  }
}

// 읽지 않은 알림 수
export async function getUnreadAlertCount(siteId: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/alerts/unread-count?siteId=${siteId}`);
    const json: ApiResponse<{ count: number }> = await res.json();
    return json.success && json.data ? json.data.count : 0;
  } catch {
    return 0;
  }
}

// 알림 읽음 처리
export async function markAlertRead(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/alerts/${id}/read`, { method: 'PATCH' });
    const json: ApiResponse<unknown> = await res.json();
    return json.success === true;
  } catch {
    return false;
  }
}

// 전체 읽음 처리
export async function markAllAlertsRead(siteId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/alerts/read-all?siteId=${siteId}`, { method: 'PATCH' });
    const json: ApiResponse<unknown> = await res.json();
    return json.success === true;
  } catch {
    return false;
  }
}
