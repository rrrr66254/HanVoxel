/**
 * 수주 관리 + MRP + BOM + 재고 더블체크 API 클라이언트
 */

const API_BASE = '/api/v1';

// --- 타입 ---

export interface SalesOrderItem {
  productSku: string;
  productName?: string;
  qty: number;
  unitPrice?: number;
}

export interface SalesOrder {
  id: string;
  siteId: string;
  orderNo: string;
  customerId: string | null;
  customerName: string | null;
  status: string;
  orderDate: string;
  deliveryDeadline: string | null;
  items: SalesOrderItem[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  mrpResults?: Array<{ id: string; status: string }>;
}

export interface MrpResult {
  id: string;
  salesOrderId: string;
  materialSku: string;
  materialName: string | null;
  requiredQty: number;
  currentStock: number;
  shortageQty: number;
  reorderTriggered: boolean;
  checkedBy: string | null;
  checkedAt: string | null;
  status: string;
  stockChecks?: StockCheckRequest[];
}

export interface BomItem {
  id: string;
  siteId: string;
  productSku: string;
  materialSku: string;
  qtyPerUnit: number;
  unit: string;
  leadTimeDays: number;
  notes: string | null;
}

export interface StockCheckRequest {
  id: string;
  mrpResultId: string;
  salesOrderId: string;
  assignedTo: string | null;
  requestedAt: string;
  respondedAt: string | null;
  actualQty: number | null;
  discrepancy: number | null;
  status: string;
  notes: string | null;
  mrpResult?: {
    materialSku: string;
    materialName: string | null;
    currentStock: number;
    requiredQty: number;
    shortageQty: number;
  };
  salesOrder?: {
    orderNo: string;
    customerName: string | null;
    deliveryDeadline: string | null;
  };
}

// --- API 함수 ---

export async function createSalesOrder(data: {
  siteId: string;
  customerId?: string;
  customerName?: string;
  orderDate?: string;
  deliveryDeadline?: string;
  items: SalesOrderItem[];
  notes?: string;
}): Promise<SalesOrder> {
  const resp = await fetch(`${API_BASE}/sales-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  if (!json.success) throw new Error(json.error?.message);
  return json.data;
}

export async function getSalesOrders(
  siteId: string,
  status?: string,
  page?: number,
): Promise<{ orders: SalesOrder[]; total: number }> {
  const params = new URLSearchParams({ siteId });
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  const resp = await fetch(`${API_BASE}/sales-orders?${params}`);
  const json = await resp.json();
  return { orders: json.data ?? [], total: json.meta?.total ?? 0 };
}

export async function getSalesOrder(id: string): Promise<SalesOrder> {
  const resp = await fetch(`${API_BASE}/sales-orders/${id}`);
  const json = await resp.json();
  return json.data;
}

export async function runMrp(salesOrderId: string): Promise<{
  totalMaterials: number;
  shortageCount: number;
  results: MrpResult[];
}> {
  const resp = await fetch(`${API_BASE}/sales-orders/${salesOrderId}/run-mrp`, { method: 'POST' });
  const json = await resp.json();
  if (!json.success) throw new Error(json.error?.message);
  return json.data;
}

export async function getMrpResults(salesOrderId: string): Promise<MrpResult[]> {
  const resp = await fetch(`${API_BASE}/sales-orders/${salesOrderId}/mrp`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function triggerReorders(salesOrderId: string): Promise<{ triggeredCount: number }> {
  const resp = await fetch(`${API_BASE}/sales-orders/${salesOrderId}/trigger-reorders`, { method: 'POST' });
  const json = await resp.json();
  return json.data;
}

export async function createBomItem(data: {
  siteId: string;
  productSku: string;
  materialSku: string;
  qtyPerUnit: number;
  unit?: string;
  leadTimeDays?: number;
  notes?: string;
}): Promise<BomItem> {
  const resp = await fetch(`${API_BASE}/bom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function getBom(siteId: string, productSku: string): Promise<BomItem[]> {
  const resp = await fetch(`${API_BASE}/bom/${productSku}?siteId=${siteId}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function getStockChecks(
  siteId: string,
  status?: string,
): Promise<{ checks: StockCheckRequest[]; total: number }> {
  const params = new URLSearchParams({ siteId });
  if (status) params.set('status', status);
  const resp = await fetch(`${API_BASE}/stock-checks?${params}`);
  const json = await resp.json();
  return { checks: json.data ?? [], total: json.meta?.total ?? 0 };
}

export async function confirmStockCheck(id: string, actualQty: number, notes?: string): Promise<StockCheckRequest> {
  const resp = await fetch(`${API_BASE}/stock-checks/${id}/confirm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actualQty, notes }),
  });
  const json = await resp.json();
  return json.data;
}

export async function reportDiscrepancy(id: string, actualQty: number, notes: string): Promise<StockCheckRequest> {
  const resp = await fetch(`${API_BASE}/stock-checks/${id}/discrepancy`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actualQty, notes }),
  });
  const json = await resp.json();
  return json.data;
}
