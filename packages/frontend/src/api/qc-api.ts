const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { total?: number };
}

// ── 타입 ────────────────────────────────────────────────

export interface SupplierData {
  id: string;
  companyId: string;
  name: string;
  code: string;
  contact: string | null;
  email: string | null;
  grade: string;
  qualityScore: number;
  isActive: boolean;
}

export interface DefectItemData {
  id: string;
  defectType: string;
  qty: number;
  itemName: string | null;
  itemSku: string | null;
  quarantineLocationId: string | null;
  disposition: string | null;
  note: string | null;
}

export interface InspectionData {
  id: string;
  siteId: string;
  supplierId: string | null;
  type: string;
  status: string;
  totalQty: number;
  passedQty: number;
  defectQty: number;
  defectRate: number;
  referenceNo: string | null;
  inspectorName: string | null;
  inspectedAt: string | null;
  note: string | null;
  supplier: SupplierData | null;
  items: DefectItemData[];
}

export interface QcStatsData {
  days: number;
  totalInspections: number;
  totalQty: number;
  totalDefect: number;
  avgDefectRate: number;
  inboundDefectRate: number;
  outboundDefectRate: number;
  defectsByType: { type: string; qty: number }[];
  quarantineCount: number;
}

export interface ScorecardData {
  supplierId: string;
  months: number;
  overallDefectRate: number;
  grade: string;
  qualityScore: number;
  monthlyData: {
    month: string;
    totalQty: number;
    defectQty: number;
    defectRate: number;
    inspectionCount: number;
  }[];
}

// ── API 함수 ────────────────────────────────────────────

export async function getSuppliers(companyId: string): Promise<SupplierData[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/qc/suppliers?companyId=${companyId}`);
    const json: ApiResponse<SupplierData[]> = await res.json();
    return json.success && json.data ? json.data : [];
  } catch { return []; }
}

export async function getInspections(
  siteId: string,
  options?: { type?: string; supplierId?: string; limit?: number },
): Promise<{ inspections: InspectionData[]; total: number }> {
  try {
    const params = new URLSearchParams({ siteId });
    if (options?.type) params.set('type', options.type);
    if (options?.supplierId) params.set('supplierId', options.supplierId);
    if (options?.limit) params.set('limit', String(options.limit));
    const res = await fetch(`${API_BASE}/api/v1/qc/inspections?${params}`);
    const json: ApiResponse<InspectionData[]> = await res.json();
    return { inspections: json.success && json.data ? json.data : [], total: json.meta?.total ?? 0 };
  } catch { return { inspections: [], total: 0 }; }
}

export async function createInspection(data: {
  siteId: string;
  supplierId?: string;
  type: string;
  totalQty: number;
  passedQty: number;
  defectQty: number;
  referenceNo?: string;
  inspectorName?: string;
  note?: string;
  defectItems?: {
    defectType: string;
    qty: number;
    itemName?: string;
    quarantineLocationId?: string;
    disposition?: string;
  }[];
}): Promise<InspectionData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/qc/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json: ApiResponse<InspectionData> = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function getQcStats(siteId: string, days = 30): Promise<QcStatsData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/qc/stats?siteId=${siteId}&days=${days}`);
    const json: ApiResponse<QcStatsData> = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function getSupplierScorecard(supplierId: string, months = 6): Promise<ScorecardData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/qc/suppliers/${supplierId}/scorecard?months=${months}`);
    const json: ApiResponse<ScorecardData> = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}
