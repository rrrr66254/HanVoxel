/**
 * B2C 대량 출고 업로드 API 클라이언트
 */

const API_BASE = '/api/v1';

// --- 타입 ---

export type ValidationStatus = 'OK' | 'WARNING' | 'ERROR';

export interface ValidatedRow {
  rowIndex: number;
  referenceNo?: string;
  customerName?: string;
  destination?: string;
  customerPhone?: string;
  skuCode?: string;
  productName?: string;
  qty?: number;
  unitPrice?: number;
  scheduledDate?: string;
  carrier?: string;
  trackingNumber?: string;
  status: ValidationStatus;
  messages: string[];
}

export interface ColumnMapping {
  [targetField: string]: string;
}

export interface BulkParseResult {
  rows: ValidatedRow[];
  totalRows: number;
  okCount: number;
  warningCount: number;
  errorCount: number;
  uploadLogId: string;
  fileHeaders: string[];
  columnMapping: ColumnMapping;
}

export interface BulkCreateResult {
  createdCount: number;
  errorCount: number;
  errors: Array<{ rowIndex: number; message: string }>;
  uploadLogId: string;
}

export interface BulkUploadLog {
  id: string;
  siteId: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  status: string;
  platformType: string;
  uploadedBy: string | null;
  createdAt: string;
}

// --- API 함수 ---

export async function bulkUpload(
  file: File,
  siteId: string,
  platformType: string,
  columnMapping?: ColumnMapping,
): Promise<BulkParseResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('siteId', siteId);
  formData.append('platformType', platformType);
  if (columnMapping) {
    formData.append('columnMapping', JSON.stringify(columnMapping));
  }

  const resp = await fetch(`${API_BASE}/outbound/bulk-upload`, {
    method: 'POST',
    body: formData,
  });
  const json = await resp.json();
  if (!json.success) throw new Error(json.error?.message ?? '업로드 실패');
  return json.data;
}

export async function bulkCreate(
  siteId: string,
  uploadLogId: string,
  rows: ValidatedRow[],
): Promise<BulkCreateResult> {
  const resp = await fetch(`${API_BASE}/outbound/bulk-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, uploadLogId, rows }),
  });
  const json = await resp.json();
  if (!json.success) throw new Error(json.error?.message ?? '생성 실패');
  return json.data;
}

export async function getBulkUploadLogs(
  siteId: string,
  page?: number,
  limit?: number,
): Promise<{ logs: BulkUploadLog[]; total: number }> {
  const params = new URLSearchParams({ siteId });
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const resp = await fetch(`${API_BASE}/outbound/bulk-logs?${params}`);
  const json = await resp.json();
  return { logs: json.data ?? [], total: json.meta?.total ?? 0 };
}

export async function getPlatformMapping(platform: string): Promise<ColumnMapping> {
  const resp = await fetch(`${API_BASE}/outbound/bulk-mapping?platform=${platform}`);
  const json = await resp.json();
  return json.data?.mapping ?? {};
}

export function getTemplateUrl(platform: string): string {
  return `${API_BASE}/outbound/bulk-template/${platform}`;
}
