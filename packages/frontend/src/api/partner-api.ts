/**
 * 업체 관리 + 배송 기사 API 클라이언트
 */

const API_BASE = '/api/v1';

// ── 타입 ────────────────────────────────────────

export interface PartnerContact {
  id: string;
  partnerId: string;
  name: string;
  department: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
}

export interface PartnerBankAccount {
  id: string;
  partnerId: string;
  bankName: string;
  accountNo: string;
  holder: string;
  isPrimary: boolean;
}

export interface PartnerAttachment {
  id: string;
  partnerId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  createdAt: string;
}

export interface PartnerTransactionSummary {
  id: string;
  partnerId: string;
  totalInbound: number;
  totalOutbound: number;
  totalPurchase: string;
  totalSales: string;
  receivables: string;
  payables: string;
  avgDeliveryRate: number | null;
  avgQualityScore: number | null;
  lastTransactionAt: string | null;
}

export interface Partner {
  id: string;
  companyId: string;
  type: 'SUPPLIER' | 'CUSTOMER' | 'BOTH';
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
  updatedAt: string;
  contacts?: PartnerContact[];
  bankAccounts?: PartnerBankAccount[];
  attachments?: PartnerAttachment[];
  transactionSummary?: PartnerTransactionSummary | null;
  drivers?: DeliveryDriver[];
}

export interface DeliveryDriver {
  id: string;
  partnerId: string | null;
  name: string;
  phone: string;
  vehicleNo: string | null;
  vehicleType: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  partner?: { id: string; name: string; code: string } | null;
}

// ── 거래처 API ──────────────────────────────────

export async function getPartners(
  companyId: string,
  opts?: { type?: string; search?: string; isActive?: boolean; page?: number; limit?: number },
): Promise<{ partners: Partner[]; total: number }> {
  const params = new URLSearchParams({ companyId });
  if (opts?.type) params.set('type', opts.type);
  if (opts?.search) params.set('search', opts.search);
  if (opts?.isActive !== undefined) params.set('isActive', String(opts.isActive));
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  const resp = await fetch(`${API_BASE}/partners?${params}`);
  const json = await resp.json();
  return { partners: json.data ?? [], total: json.meta?.total ?? 0 };
}

export async function getPartner(id: string): Promise<Partner> {
  const resp = await fetch(`${API_BASE}/partners/${id}`);
  const json = await resp.json();
  return json.data;
}

export async function createPartner(data: {
  companyId: string;
  type: string;
  name: string;
  code: string;
  bizNo?: string;
  ceoName?: string;
  bizType?: string;
  bizCategory?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  paymentTerms?: string;
  note?: string;
}): Promise<Partner> {
  const resp = await fetch(`${API_BASE}/partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error?.message ?? `HTTP ${resp.status}`);
  return json.data;
}

export async function updatePartner(id: string, data: Record<string, unknown>): Promise<Partner> {
  const resp = await fetch(`${API_BASE}/partners/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error?.message ?? `HTTP ${resp.status}`);
  return json.data;
}

export async function deletePartner(id: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/partners/${id}`, { method: 'DELETE' });
  if (!resp.ok) {
    const json = await resp.json();
    throw new Error(json.error?.message ?? `HTTP ${resp.status}`);
  }
}

// ── 담당자 API ──────────────────────────────────

export async function addContact(partnerId: string, data: { name: string; department?: string; position?: string; phone?: string; email?: string; isPrimary?: boolean }): Promise<PartnerContact> {
  const resp = await fetch(`${API_BASE}/partners/${partnerId}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function deleteContact(partnerId: string, contactId: string): Promise<void> {
  await fetch(`${API_BASE}/partners/${partnerId}/contacts/${contactId}`, { method: 'DELETE' });
}

// ── 계좌 API ────────────────────────────────────

export async function addBankAccount(partnerId: string, data: { bankName: string; accountNo: string; holder: string; isPrimary?: boolean }): Promise<PartnerBankAccount> {
  const resp = await fetch(`${API_BASE}/partners/${partnerId}/bank-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function deleteBankAccount(partnerId: string, accountId: string): Promise<void> {
  await fetch(`${API_BASE}/partners/${partnerId}/bank-accounts/${accountId}`, { method: 'DELETE' });
}

// ── 거래 요약 API ───────────────────────────────

export async function refreshSummary(partnerId: string): Promise<PartnerTransactionSummary> {
  const resp = await fetch(`${API_BASE}/partners/${partnerId}/refresh-summary`, { method: 'POST' });
  const json = await resp.json();
  return json.data;
}

// ── 배송 기사 API ───────────────────────────────

export async function getDrivers(opts?: { partnerId?: string; search?: string; page?: number; limit?: number }): Promise<{ drivers: DeliveryDriver[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.partnerId) params.set('partnerId', opts.partnerId);
  if (opts?.search) params.set('search', opts.search);
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  const resp = await fetch(`${API_BASE}/drivers?${params}`);
  const json = await resp.json();
  return { drivers: json.data ?? [], total: json.meta?.total ?? 0 };
}

export async function createDriver(data: { partnerId?: string; name: string; phone: string; vehicleNo?: string; vehicleType?: string; note?: string }): Promise<DeliveryDriver> {
  const resp = await fetch(`${API_BASE}/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function updateDriver(id: string, data: Record<string, unknown>): Promise<DeliveryDriver> {
  const resp = await fetch(`${API_BASE}/drivers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function deleteDriver(id: string): Promise<void> {
  await fetch(`${API_BASE}/drivers/${id}`, { method: 'DELETE' });
}
