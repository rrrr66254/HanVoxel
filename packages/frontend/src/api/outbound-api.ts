/**
 * 출고 관리 API 클라이언트
 */

const API_BASE = '/api/v1';

// --- 타입 ---

export interface OutboundItem {
  id: string;
  outboundOrderId: string;
  skuCode: string;
  itemName: string | null;
  qty: number;
  unitPrice: number;
  pickedBy: string | null;
  pickedAt: string | null;
  spatialObjectId: string | null;
  createdAt: string;
}

export interface OutboundOrder {
  id: string;
  siteId: string;
  type: 'PICKING' | 'PALLET' | 'CONTAINER' | 'DIRECT' | 'TRANSFER';
  status: 'PLANNED' | 'PICKING' | 'PACKED' | 'DISPATCHED';
  scheduledDate: string | null;
  dispatchedDate: string | null;
  customerName: string | null;
  destination: string | null;
  manifestNumber: string | null;
  timeSlot: string | null;
  notes: string | null;
  containerSpec: string | null;
  hsCode: string | null;
  items: OutboundItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ManifestData {
  manifestNumber: string | null;
  orderDate: string;
  dispatchDate: string | null;
  type: string;
  customerName: string | null;
  destination: string | null;
  items: Array<{
    skuCode: string;
    itemName: string | null;
    qty: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  containerSpec: string | null;
  hsCode: string | null;
}

interface OutboundItemInput {
  skuCode: string;
  itemName?: string;
  qty: number;
  unitPrice?: number;
  spatialObjectId?: string;
}

// --- API 함수 ---

export async function createOutboundOrder(data: {
  siteId: string;
  type?: string;
  scheduledDate?: string;
  timeSlot?: string;
  customerName?: string;
  destination?: string;
  notes?: string;
  containerSpec?: string;
  hsCode?: string;
  items: OutboundItemInput[];
}): Promise<OutboundOrder> {
  const resp = await fetch(`${API_BASE}/outbound/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function updateOutboundOrder(
  id: string,
  data: {
    type?: string;
    status?: string;
    scheduledDate?: string;
    timeSlot?: string;
    customerName?: string;
    destination?: string;
    notes?: string;
    containerSpec?: string;
    hsCode?: string;
  },
): Promise<OutboundOrder> {
  const resp = await fetch(`${API_BASE}/outbound/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error?.message ?? `HTTP ${resp.status}`);
  return json.data;
}

export async function getOutboundOrders(
  siteId: string,
  status?: string,
  type?: string,
  page?: number,
  limit?: number,
): Promise<{ orders: OutboundOrder[]; total: number }> {
  const params = new URLSearchParams({ siteId });
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const resp = await fetch(`${API_BASE}/outbound/orders?${params}`);
  const json = await resp.json();
  return { orders: json.data ?? [], total: json.meta?.total ?? 0 };
}

export async function getOutboundOrder(id: string): Promise<OutboundOrder> {
  const resp = await fetch(`${API_BASE}/outbound/orders/${id}`);
  const json = await resp.json();
  return json.data;
}

export async function dispatchOutboundOrder(id: string): Promise<OutboundOrder> {
  const resp = await fetch(`${API_BASE}/outbound/orders/${id}/dispatch`, { method: 'PATCH' });
  const json = await resp.json();
  return json.data;
}

export async function getManifestData(id: string): Promise<ManifestData> {
  const resp = await fetch(`${API_BASE}/outbound/orders/${id}/manifest`);
  const json = await resp.json();
  return json.data;
}

export async function getOutboundCalendar(
  siteId: string,
  year: number,
  month: number,
): Promise<import('./inbound-api').CalendarEntry[]> {
  const params = new URLSearchParams({ siteId, year: String(year), month: String(month) });
  const resp = await fetch(`${API_BASE}/outbound/calendar?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function getCalendarAll(
  siteId: string,
  year: number,
  month: number,
  filter?: 'INBOUND' | 'OUTBOUND',
): Promise<import('./inbound-api').CalendarEntry[]> {
  const params = new URLSearchParams({ siteId, year: String(year), month: String(month) });
  if (filter) params.set('filter', filter);
  const resp = await fetch(`${API_BASE}/calendar?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function rescheduleOutbound(id: string, newDate: string, timeSlot?: string): Promise<OutboundOrder> {
  const resp = await fetch(`${API_BASE}/outbound/orders/${id}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDate, timeSlot }),
  });
  const json = await resp.json();
  return json.data;
}
