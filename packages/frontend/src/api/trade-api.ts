/**
 * HanVoxel — 무역 인텔리전스 API 클라이언트
 */

const BASE = '/api/v1/trade';

// --- 타입 ---

export interface HsCodeResult {
  hsCode: string;
  description: string;
  descriptionEn: string;
  chapter: string;
  heading: string;
}

export interface WatchItem {
  id: string;
  companyId: string;
  hsCode: string;
  description: string;
  descriptionEn: string | null;
  isMain: boolean;
  createdAt: string;
}

export interface TradeRecord {
  hsCode: string;
  reporterIso: string;
  partnerIso: string;
  period: string;
  flowType: 'EXPORT' | 'IMPORT';
  valueUsd: number;
  weightKg: number | null;
  source: string;
}

export interface CoverageStats {
  totalCodes: number;
  popularCodes: number;
  totalSearches: number;
  avgCacheHitRate: number;
  topCodes: Array<{
    hsCode: string;
    searchCount: number;
    fetchCount: number;
    isPopular: boolean;
  }>;
}

export interface BatchLog {
  id: string;
  runAt: string;
  callsUsed: number;
  codesAdded: number;
  cacheHitRate: number;
  strategy: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
  meta?: Record<string, unknown>;
}

// --- API 호출 ---

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const resp = await fetch(url, init);
    const json = (await resp.json()) as ApiResponse<T>;
    if (!json.success) throw new Error(json.error?.message ?? '요청 실패');
    return json.data;
  } catch {
    throw new Error('API 연결 실패');
  }
}

export async function searchHsCodes(query: string): Promise<HsCodeResult[]> {
  return apiFetch<HsCodeResult[]>(`${BASE}/hs-search?q=${encodeURIComponent(query)}`);
}

export async function getWatchList(companyId: string): Promise<WatchItem[]> {
  return apiFetch<WatchItem[]>(`${BASE}/watch?companyId=${companyId}`);
}

export async function addWatch(
  companyId: string,
  hsCode: string,
  description: string,
  descriptionEn?: string
): Promise<WatchItem> {
  return apiFetch<WatchItem>(`${BASE}/watch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, hsCode, description, descriptionEn }),
  });
}

export async function removeWatch(companyId: string, hsCode: string): Promise<void> {
  await apiFetch<null>(`${BASE}/watch/${hsCode}?companyId=${companyId}`, {
    method: 'DELETE',
  });
}

export async function getTradeData(params: {
  hsCode: string;
  reporterIsos: string[];
  partnerIso?: string;
  period?: string;
  flowType?: string;
  companyId?: string;
}): Promise<TradeRecord[]> {
  const qs = new URLSearchParams();
  qs.set('hsCode', params.hsCode);
  qs.set('reporterIso', params.reporterIsos.join(','));
  if (params.partnerIso) qs.set('partnerIso', params.partnerIso);
  if (params.period) qs.set('period', params.period);
  if (params.flowType) qs.set('flowType', params.flowType);
  if (params.companyId) qs.set('companyId', params.companyId);
  return apiFetch<TradeRecord[]>(`${BASE}/data?${qs.toString()}`);
}

export async function getCoverageStats(): Promise<CoverageStats> {
  return apiFetch<CoverageStats>(`${BASE}/coverage`);
}

export async function getBatchLogs(days?: number): Promise<BatchLog[]> {
  const qs = days ? `?days=${days}` : '';
  return apiFetch<BatchLog[]>(`${BASE}/batch-logs${qs}`);
}
