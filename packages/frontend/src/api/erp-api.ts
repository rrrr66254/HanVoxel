const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { total?: number };
}

// ── 타입 ────────────────────────────────────────────────

export interface PartnerData {
  id: string;
  companyId: string;
  type: string;
  name: string;
  code: string;
  bizNo: string | null;
  ceoName: string | null;
  bizType: string | null;
  bizCategory: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  paymentTerms: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface VoucherLineData {
  id: string;
  lineNo: number;
  sku: string;
  itemName: string;
  qty: number;
  unitPrice: number;
  amount: number;
  taxAmount: number;
  note: string | null;
}

export interface VoucherData {
  id: string;
  siteId: string;
  type: string;
  voucherNo: string;
  partnerId: string;
  status: string;
  voucherDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  referenceNo: string | null;
  note: string | null;
  confirmedAt: string | null;
  createdAt: string;
  partner?: { id: string; name: string; code: string };
  lines: VoucherLineData[];
}

export interface SkuCostData {
  id: string;
  siteId: string;
  sku: string;
  itemName: string;
  costMethod: string;
  currentQty: number;
  avgUnitCost: number;
  lastPurchasePrice: number;
  sellingPrice: number;
}

export interface SkuMarginData {
  sku: string;
  itemName: string;
  currentQty: number;
  fifoCost: number;
  avgCost: number;
  sellingPrice: number;
  fifoMarginPct: number;
  avgMarginPct: number;
  fifoProfit: number;
  avgProfit: number;
}

export interface VoucherStatsData {
  days: number;
  totalPurchases: number;
  totalSales: number;
  purchaseAmount: number;
  salesAmount: number;
  pendingPurchases: number;
  pendingSales: number;
}

export interface PartnerStatsData {
  suppliers: number;
  customers: number;
  both: number;
  total: number;
}

// ── 거래처 API ─────────────────────────────────────────

export async function getPartners(
  companyId: string,
  options?: { type?: string; search?: string },
): Promise<{ partners: PartnerData[]; total: number }> {
  try {
    const params = new URLSearchParams({ companyId });
    if (options?.type) params.set('type', options.type);
    if (options?.search) params.set('search', options.search);
    const res = await fetch(`${API_BASE}/api/v1/erp/partners?${params}`);
    const json: ApiResponse<PartnerData[]> = await res.json();
    return { partners: json.success && json.data ? json.data : [], total: json.meta?.total ?? 0 };
  } catch { return { partners: [], total: 0 }; }
}

export async function createPartner(data: {
  companyId: string; type: string; name: string; code: string;
  bizNo?: string; ceoName?: string; phone?: string; email?: string; contactName?: string; paymentTerms?: string;
}): Promise<PartnerData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/erp/partners`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const json: ApiResponse<PartnerData> = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function getPartnerHistory(partnerId: string): Promise<VoucherData[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/erp/partners/${partnerId}/history`);
    const json: ApiResponse<VoucherData[]> = await res.json();
    return json.success && json.data ? json.data : [];
  } catch { return []; }
}

export async function getPartnerStats(companyId: string): Promise<PartnerStatsData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/erp/partners/stats?companyId=${companyId}`);
    const json: ApiResponse<PartnerStatsData> = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

// ── 전표 API ───────────────────────────────────────────

export async function getVouchers(
  siteId: string,
  options?: { type?: string; status?: string; from?: string; to?: string },
): Promise<{ vouchers: VoucherData[]; total: number }> {
  try {
    const params = new URLSearchParams({ siteId });
    if (options?.type) params.set('type', options.type);
    if (options?.status) params.set('status', options.status);
    if (options?.from) params.set('from', options.from);
    if (options?.to) params.set('to', options.to);
    const res = await fetch(`${API_BASE}/api/v1/erp/vouchers?${params}`);
    const json: ApiResponse<VoucherData[]> = await res.json();
    return { vouchers: json.success && json.data ? json.data : [], total: json.meta?.total ?? 0 };
  } catch { return { vouchers: [], total: 0 }; }
}

export async function createVoucher(data: {
  siteId: string; type: string; partnerId: string; voucherDate: string; dueDate?: string;
  referenceNo?: string; note?: string;
  lines: { sku: string; itemName: string; qty: number; unitPrice: number }[];
}): Promise<VoucherData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/erp/vouchers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const json: ApiResponse<VoucherData> = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function confirmVoucher(id: string): Promise<VoucherData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/erp/vouchers/${id}/confirm`, { method: 'PATCH' });
    const json: ApiResponse<VoucherData> = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function getVoucherStats(siteId: string, days = 30): Promise<VoucherStatsData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/erp/vouchers/stats?siteId=${siteId}&days=${days}`);
    const json: ApiResponse<VoucherStatsData> = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export function getVoucherPdfUrl(id: string, docType: 'purchase_order' | 'delivery_note'): string {
  return `${API_BASE}/api/v1/erp/vouchers/${id}/pdf?docType=${docType}`;
}

// ── 원가/마진 API ──────────────────────────────────────

export async function getSkuCosts(siteId: string): Promise<SkuCostData[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/erp/costs?siteId=${siteId}`);
    const json: ApiResponse<SkuCostData[]> = await res.json();
    return json.success && json.data ? json.data : [];
  } catch { return []; }
}

export async function getSkuMargins(siteId: string): Promise<SkuMarginData[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/erp/margins?siteId=${siteId}`);
    const json: ApiResponse<SkuMarginData[]> = await res.json();
    return json.success && json.data ? json.data : [];
  } catch { return []; }
}

export async function updateSellingPrice(siteId: string, sku: string, sellingPrice: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/erp/costs/selling-price`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, sku, sellingPrice }),
    });
    const json: ApiResponse<unknown> = await res.json();
    return json.success;
  } catch { return false; }
}
