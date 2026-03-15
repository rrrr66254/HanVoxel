/**
 * ERP 커넥터 API 클라이언트
 */

const API_BASE = '/api/v1';

// --- 타입 ---

export interface ConnectorConfig {
  id: string;
  companyId: string;
  erpType: 'DOUZON' | 'YOUNGLIMWON';
  displayName: string;
  baseUrl: string;
  authType: string;
  isActive: boolean;
  lastPingAt: string | null;
  lastPingStatus: string | null;
  createdAt: string;
  fieldMappings: FieldMapping[];
}

export interface FieldMapping {
  id: string;
  connectorId: string;
  entityType: string;
  sourceField: string;
  targetField: string;
  transformType: string;
  transformParam: string | null;
  isRequired: boolean;
}

export interface SyncLog {
  id: string;
  connectorId: string;
  direction: 'PUSH' | 'PULL';
  entityType: string;
  entityId: string | null;
  erpRefNo: string | null;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING' | 'SKIPPED';
  errorMessage: string | null;
  retryCount: number;
  syncedAt: string;
}

export interface SyncStats {
  total: number;
  success: number;
  failed: number;
  successRate: number;
}

export interface PingResult {
  ok: boolean;
  latencyMs: number;
  status: string;
}

// --- API 함수 ---

export async function getConnectors(companyId: string): Promise<ConnectorConfig[]> {
  const resp = await fetch(`${API_BASE}/connector/configs?companyId=${companyId}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function upsertConnector(data: {
  companyId: string;
  erpType: string;
  displayName: string;
  baseUrl: string;
  authType: string;
  credentials: Record<string, string>;
  configJson?: Record<string, string>;
}): Promise<ConnectorConfig> {
  const resp = await fetch(`${API_BASE}/connector/configs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function toggleConnector(id: string, isActive: boolean): Promise<ConnectorConfig> {
  const resp = await fetch(`${API_BASE}/connector/configs/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  const json = await resp.json();
  return json.data;
}

export async function pingConnector(id: string): Promise<PingResult> {
  const resp = await fetch(`${API_BASE}/connector/configs/${id}/ping`, { method: 'POST' });
  const json = await resp.json();
  return json.data;
}

export async function syncVoucher(connectorId: string, voucherId: string) {
  const resp = await fetch(`${API_BASE}/connector/sync/voucher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectorId, voucherId }),
  });
  return resp.json();
}

export async function syncPartner(connectorId: string, partnerId: string) {
  const resp = await fetch(`${API_BASE}/connector/sync/partner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectorId, partnerId }),
  });
  return resp.json();
}

export async function getSyncLogs(connectorId: string, options?: {
  status?: string;
  entityType?: string;
  limit?: number;
}): Promise<SyncLog[]> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.entityType) params.set('entityType', options.entityType);
  if (options?.limit) params.set('limit', String(options.limit));
  const resp = await fetch(`${API_BASE}/connector/${connectorId}/logs?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function getSyncStats(connectorId: string): Promise<SyncStats> {
  const resp = await fetch(`${API_BASE}/connector/${connectorId}/stats`);
  const json = await resp.json();
  return json.data;
}

export async function getFieldMappings(connectorId: string, entityType?: string): Promise<FieldMapping[]> {
  const params = entityType ? `?entityType=${entityType}` : '';
  const resp = await fetch(`${API_BASE}/connector/${connectorId}/mappings${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function upsertFieldMapping(connectorId: string, data: {
  entityType: string;
  sourceField: string;
  targetField: string;
  transformType?: string;
  transformParam?: string;
  isRequired?: boolean;
}): Promise<FieldMapping> {
  const resp = await fetch(`${API_BASE}/connector/${connectorId}/mappings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function deleteFieldMapping(connectorId: string, mappingId: string) {
  await fetch(`${API_BASE}/connector/${connectorId}/mappings/${mappingId}`, { method: 'DELETE' });
}
