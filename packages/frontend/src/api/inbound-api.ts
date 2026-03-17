/**
 * 입고 관리 API 클라이언트
 */

const API_BASE = '/api/v1';

// --- 타입 ---

export interface InboundItem {
  id: string;
  inboundOrderId: string;
  skuCode: string;
  itemName: string | null;
  expectedQty: number;
  actualQty: number | null;
  unitPrice: number;
  qcInspectionId: string | null;
  spatialObjectId: string | null;
  createdAt: string;
}

export interface InboundOrder {
  id: string;
  siteId: string;
  reorderRecommendationId: string | null;
  vendorId: string | null;
  vendorName: string | null;
  status: 'ORDERED' | 'IN_TRANSIT' | 'ARRIVED' | 'QC_PENDING' | 'QC_PASSED' | 'STOCKED';
  expectedDate: string | null;
  actualDate: string | null;
  notes: string | null;
  items: InboundItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEntry {
  id: string;
  siteId: string;
  type: 'INBOUND' | 'OUTBOUND';
  scheduledDate: string;
  timeSlot: string | null;
  status: string;
  colorCode: string | null;
  inboundOrder?: {
    id: string;
    vendorName: string | null;
    status: string;
    expectedDate: string | null;
    actualDate?: string | null;
  } | null;
  outboundOrder?: {
    id: string;
    type: string;
    customerName: string | null;
    status: string;
    manifestNumber: string | null;
    timeSlot?: string | null;
  } | null;
}

interface InboundItemInput {
  skuCode: string;
  itemName?: string;
  expectedQty: number;
  unitPrice?: number;
  spatialObjectId?: string;
}

// --- API 함수 ---

export async function createInboundOrder(data: {
  siteId: string;
  vendorId?: string;
  vendorName?: string;
  reorderRecommendationId?: string;
  expectedDate?: string;
  notes?: string;
  items: InboundItemInput[];
}): Promise<InboundOrder> {
  const resp = await fetch(`${API_BASE}/inbound/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function getInboundOrders(
  siteId: string,
  status?: string,
  page?: number,
  limit?: number,
): Promise<{ orders: InboundOrder[]; total: number }> {
  const params = new URLSearchParams({ siteId });
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const resp = await fetch(`${API_BASE}/inbound/orders?${params}`);
  const json = await resp.json();
  return { orders: json.data ?? [], total: json.meta?.total ?? 0 };
}

export async function getInboundOrder(id: string): Promise<InboundOrder> {
  const resp = await fetch(`${API_BASE}/inbound/orders/${id}`);
  const json = await resp.json();
  return json.data;
}

export async function arriveInboundOrder(
  id: string,
  actualItems?: Array<{ itemId: string; actualQty: number }>,
): Promise<{ order: InboundOrder; inspection: unknown }> {
  const resp = await fetch(`${API_BASE}/inbound/orders/${id}/arrive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actualItems }),
  });
  const json = await resp.json();
  return json.data;
}

export async function passQcInboundOrder(id: string): Promise<{ success: boolean; orderId: string }> {
  const resp = await fetch(`${API_BASE}/inbound/orders/${id}/qc-pass`, { method: 'PATCH' });
  const json = await resp.json();
  return json.data;
}

export async function getInboundCalendar(
  siteId: string,
  year: number,
  month: number,
): Promise<CalendarEntry[]> {
  const params = new URLSearchParams({ siteId, year: String(year), month: String(month) });
  const resp = await fetch(`${API_BASE}/inbound/calendar?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function rescheduleInbound(id: string, newDate: string): Promise<InboundOrder> {
  const resp = await fetch(`${API_BASE}/inbound/orders/${id}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDate }),
  });
  const json = await resp.json();
  return json.data;
}

export async function createFromReorder(recommendationId: string): Promise<InboundOrder> {
  const resp = await fetch(`${API_BASE}/inbound/from-reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommendationId }),
  });
  const json = await resp.json();
  return json.data;
}
