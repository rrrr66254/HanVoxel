const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { total?: number };
}

// ── 타입 ────────────────────────────────────────────────

export interface PickingLineData {
  id: string;
  lineNo: number;
  sku: string;
  itemName: string;
  requestedQty: number;
  pickedQty: number;
  status: string;
  binLocationId: string | null;
  binCode: string | null;
  zone: string | null;
  barcode: string | null;
  expiryDate: string | null;
  receivedDate: string | null;
  pickSequence: number;
  scanVerified: boolean;
  pickedAt: string | null;
  errorReason: string | null;
}

export interface PickingOrderData {
  id: string;
  siteId: string;
  orderNo: string;
  policy: string;
  priority: number;
  status: string;
  assigneeId: string | null;
  assigneeName: string | null;
  customerName: string | null;
  note: string | null;
  totalLines: number;
  pickedLines: number;
  errorLines: number;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  lines: PickingLineData[];
}

export interface PickingStatsData {
  days: number;
  totalOrders: number;
  pending: number;
  inProgress: number;
  completed: number;
  totalLines: number;
  totalErrors: number;
  errorRate: number;
  avgPickingTime: number;
  workerStats: {
    workerId: string;
    name: string;
    completed: number;
    errors: number;
    lines: number;
  }[];
}

// ── API 함수 ────────────────────────────────────────────

export async function getPickingOrders(
  siteId: string,
  options?: { status?: string; assigneeId?: string; limit?: number },
): Promise<{ orders: PickingOrderData[]; total: number }> {
  try {
    const params = new URLSearchParams({ siteId });
    if (options?.status) params.set('status', options.status);
    if (options?.assigneeId) params.set('assigneeId', options.assigneeId);
    if (options?.limit) params.set('limit', String(options.limit));
    const res = await fetch(`${API_BASE}/api/v1/picking/orders?${params}`);
    const json: ApiResponse<PickingOrderData[]> = await res.json();
    return { orders: json.success && json.data ? json.data : [], total: json.meta?.total ?? 0 };
  } catch {
    return { orders: [], total: 0 };
  }
}

export async function getPickingOrder(id: string): Promise<PickingOrderData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/picking/orders/${id}`);
    const json: ApiResponse<PickingOrderData> = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function assignOrder(
  orderId: string,
  assigneeId: string,
  assigneeName: string,
): Promise<PickingOrderData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/picking/orders/${orderId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId, assigneeName }),
    });
    const json: ApiResponse<PickingOrderData> = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function startPicking(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/picking/orders/${orderId}/start`, {
      method: 'PATCH',
    });
    const json: ApiResponse<unknown> = await res.json();
    return json.success;
  } catch {
    return false;
  }
}

export async function pickLine(
  lineId: string,
  data: { pickedQty: number; scanVerified?: boolean; errorReason?: string },
): Promise<PickingLineData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/picking/lines/${lineId}/pick`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json: ApiResponse<PickingLineData> = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function getPickingStats(siteId: string, days = 7): Promise<PickingStatsData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/picking/stats?siteId=${siteId}&days=${days}`);
    const json: ApiResponse<PickingStatsData> = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}
