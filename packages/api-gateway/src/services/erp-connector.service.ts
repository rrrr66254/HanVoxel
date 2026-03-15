/**
 * ERP 커넥터 서비스 — 더존 iCUBE / 영림원 K-System 정식 연동
 *
 * 기능:
 *   - OAuth2 / API Key 인증
 *   - 전표 양방향 동기화 (PUSH / PULL)
 *   - 거래처 마스터 동기화
 *   - 재고 수불 데이터 연동
 *   - 동기화 오류 재시도 (최대 3회, 지수 백오프)
 *   - 필드 매핑 커스터마이징
 */

import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── 공통 인터페이스 ────────────────────────────────────

export interface ErpVoucherData {
  type: 'AP' | 'AR';
  partnerCode: string;
  date: string;  // YYYYMMDD
  lines: {
    itemCode: string;
    itemName: string;
    qty: number;
    unitPrice: number;
    amount: number;
    taxAmount: number;
  }[];
  totalAmount: number;
  referenceNo?: string;
}

export interface ErpPartnerData {
  code: string;
  name: string;
  bizNo?: string;
  ceoName?: string;
  bizType?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface ErpInventoryData {
  itemCode: string;
  warehouseCode: string;
  qty: number;
  unitCost: number;
  lastUpdated: string;
}

export interface ErpSyncResult {
  success: boolean;
  erpRefNo?: string;
  error?: string;
  rawResponse?: unknown;
}

export type ErpType = 'DOUZON' | 'YOUNGLIMWON';

// ── 인증 관리 ──────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

async function getOAuth2Token(
  baseUrl: string,
  credentials: { clientId: string; clientSecret: string },
): Promise<string> {
  const cacheKey = `${baseUrl}:${credentials.clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const resp = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });

  if (!resp.ok) {
    throw new Error(`OAuth2 인증 실패: ${resp.status}`);
  }

  const data = (await resp.json()) as { access_token: string; expires_in: number };
  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });
  return data.access_token;
}

// ── 재시도 로직 ─────────────────────────────────────────

const MAX_RETRIES = 3;

async function withRetry<T>(
  fn: () => Promise<T>,
  connectorId: string,
  entityType: string,
  entityId?: string,
): Promise<{ result: T; retryCount: number }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      return { result, retryCount: attempt };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES) {
        // 지수 백오프: 1초, 2초, 4초
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── 필드 매핑 엔진 ─────────────────────────────────────

interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformType: string;
  transformParam: string | null;
}

function applyFieldMappings(
  data: Record<string, unknown>,
  mappings: FieldMapping[],
): Record<string, unknown> {
  if (mappings.length === 0) return data;

  const result: Record<string, unknown> = {};
  for (const mapping of mappings) {
    const sourceValue = data[mapping.sourceField];
    let targetValue: unknown = sourceValue;

    switch (mapping.transformType) {
      case 'DIRECT':
        targetValue = sourceValue;
        break;
      case 'CONSTANT':
        targetValue = mapping.transformParam;
        break;
      case 'FORMAT':
        // 날짜 포맷 등 간단한 변환
        if (typeof sourceValue === 'string' && mapping.transformParam) {
          targetValue = sourceValue.replace(/-/g, '');
        }
        break;
      case 'LOOKUP': {
        // JSON 룩업 테이블
        if (mapping.transformParam) {
          try {
            const lookupTable = JSON.parse(mapping.transformParam) as Record<string, string>;
            targetValue = lookupTable[String(sourceValue)] ?? sourceValue;
          } catch {
            targetValue = sourceValue;
          }
        }
        break;
      }
      default:
        targetValue = sourceValue;
    }

    result[mapping.targetField] = targetValue;
  }
  return result;
}

// ── 더존 iCUBE 커넥터 ──────────────────────────────────

export class DouzonConnector {
  private baseUrl: string;
  private credentials: { clientId: string; clientSecret: string };

  constructor(config: { baseUrl: string; credentials: { clientId: string; clientSecret: string } }) {
    this.baseUrl = config.baseUrl;
    this.credentials = config.credentials;
  }

  /** HanVoxel 전표 → 더존 iCUBE 형식 */
  mapToDouzon(data: ErpVoucherData, customMappings?: FieldMapping[]) {
    const base = {
      SLIP_TYPE: data.type === 'AP' ? '21' : '11',
      SLIP_DATE: data.date,
      CUST_CODE: data.partnerCode,
      TOT_AMT: data.totalAmount,
      REMARK: data.referenceNo ?? '',
      ITEMS: data.lines.map((line, idx) => ({
        SEQ: idx + 1,
        ITEM_CODE: line.itemCode,
        ITEM_NAME: line.itemName,
        QTY: line.qty,
        UNIT_PRICE: line.unitPrice,
        SUPPLY_AMT: line.amount,
        VAT_AMT: line.taxAmount,
      })),
    };

    if (customMappings && customMappings.length > 0) {
      const customized = applyFieldMappings(
        base as unknown as Record<string, unknown>,
        customMappings,
      );
      return { ...base, ...customized };
    }
    return base;
  }

  /** HanVoxel 거래처 → 더존 거래처 형식 */
  mapPartnerToDouzon(data: ErpPartnerData) {
    return {
      CUST_CODE: data.code,
      CUST_NAME: data.name,
      BIZ_NO: data.bizNo ?? '',
      CEO_NAME: data.ceoName ?? '',
      BIZ_TYPE: data.bizType ?? '',
      ADDR: data.address ?? '',
      TEL_NO: data.phone ?? '',
      EMAIL: data.email ?? '',
    };
  }

  /** 전표 전송 (PUSH) */
  async sendVoucher(data: ErpVoucherData, mappings?: FieldMapping[]): Promise<ErpSyncResult> {
    const mapped = this.mapToDouzon(data, mappings);

    if (!this.baseUrl || this.baseUrl === '') {
      // 프리뷰 모드
      return {
        success: true,
        erpRefNo: `DZ-${data.date}-PREVIEW`,
        rawResponse: mapped,
      };
    }

    const token = await getOAuth2Token(this.baseUrl, this.credentials);
    const resp = await fetch(`${this.baseUrl}/api/iCUBE/slip/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mapped),
    });

    const body = (await resp.json()) as { resultCode: string; slipNo?: string; message?: string };
    if (!resp.ok || body.resultCode !== '0000') {
      return {
        success: false,
        error: body.message ?? `HTTP ${resp.status}`,
        rawResponse: body,
      };
    }

    return {
      success: true,
      erpRefNo: body.slipNo,
      rawResponse: body,
    };
  }

  /** 거래처 동기화 (PUSH) */
  async syncPartner(data: ErpPartnerData): Promise<ErpSyncResult> {
    const mapped = this.mapPartnerToDouzon(data);

    if (!this.baseUrl || this.baseUrl === '') {
      return { success: true, erpRefNo: `DZ-CUST-${data.code}`, rawResponse: mapped };
    }

    const token = await getOAuth2Token(this.baseUrl, this.credentials);
    const resp = await fetch(`${this.baseUrl}/api/iCUBE/customer/upsert`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mapped),
    });

    const body = (await resp.json()) as { resultCode: string; message?: string };
    if (!resp.ok || body.resultCode !== '0000') {
      return { success: false, error: body.message ?? `HTTP ${resp.status}`, rawResponse: body };
    }

    return { success: true, erpRefNo: `DZ-CUST-${data.code}`, rawResponse: body };
  }

  /** 재고 수불 조회 (PULL) */
  async pullInventory(warehouseCode: string, itemCodes?: string[]): Promise<ErpSyncResult> {
    if (!this.baseUrl || this.baseUrl === '') {
      return {
        success: true,
        rawResponse: { items: [], message: 'preview mode' },
      };
    }

    const token = await getOAuth2Token(this.baseUrl, this.credentials);
    const params = new URLSearchParams({ WH_CODE: warehouseCode });
    if (itemCodes) params.set('ITEM_CODES', itemCodes.join(','));

    const resp = await fetch(`${this.baseUrl}/api/iCUBE/inventory/balance?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = (await resp.json()) as { resultCode: string; items?: unknown[]; message?: string };
    if (!resp.ok || body.resultCode !== '0000') {
      return { success: false, error: body.message ?? `HTTP ${resp.status}`, rawResponse: body };
    }

    return { success: true, rawResponse: body };
  }

  /** 연결 상태 확인 */
  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    if (!this.baseUrl || this.baseUrl === '') {
      return { ok: false, latencyMs: 0 };
    }

    const start = Date.now();
    try {
      const token = await getOAuth2Token(this.baseUrl, this.credentials);
      const resp = await fetch(`${this.baseUrl}/api/iCUBE/health`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      return { ok: resp.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }
}

// ── 영림원 K-System 커넥터 ─────────────────────────────

export class YoungLimWonConnector {
  private baseUrl: string;
  private companyCode: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; companyCode: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.companyCode = config.companyCode;
    this.apiKey = config.apiKey;
  }

  /** HanVoxel 전표 → 영림원 K-System 형식 */
  mapToYoungLimWon(data: ErpVoucherData, customMappings?: FieldMapping[]) {
    const base = {
      compCd: this.companyCode,
      slipDiv: data.type === 'AP' ? 'P' : 'S',
      slipDate: data.date,
      custCd: data.partnerCode,
      totAmt: data.totalAmount,
      rmk: data.referenceNo ?? '',
      dtls: data.lines.map((line, idx) => ({
        seqNo: idx + 1,
        itemCd: line.itemCode,
        itemNm: line.itemName,
        qty: line.qty,
        unitPrc: line.unitPrice,
        supAmt: line.amount,
        vatAmt: line.taxAmount,
      })),
    };

    if (customMappings && customMappings.length > 0) {
      const customized = applyFieldMappings(
        base as unknown as Record<string, unknown>,
        customMappings,
      );
      return { ...base, ...customized };
    }
    return base;
  }

  /** 발주서 자동 전송 */
  async sendVoucher(data: ErpVoucherData, mappings?: FieldMapping[]): Promise<ErpSyncResult> {
    const mapped = this.mapToYoungLimWon(data, mappings);

    if (!this.baseUrl || this.baseUrl === '') {
      return {
        success: true,
        erpRefNo: `YLW-${data.date}-PREVIEW`,
        rawResponse: mapped,
      };
    }

    const resp = await fetch(`${this.baseUrl}/api/v1/slip/create`, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mapped),
    });

    const body = (await resp.json()) as { code: string; slipNo?: string; msg?: string };
    if (!resp.ok || body.code !== 'OK') {
      return { success: false, error: body.msg ?? `HTTP ${resp.status}`, rawResponse: body };
    }

    return { success: true, erpRefNo: body.slipNo, rawResponse: body };
  }

  /** 거래처 동기화 */
  async syncPartner(data: ErpPartnerData): Promise<ErpSyncResult> {
    const mapped = {
      compCd: this.companyCode,
      custCd: data.code,
      custNm: data.name,
      bizNo: data.bizNo ?? '',
      ceoNm: data.ceoName ?? '',
      bizTp: data.bizType ?? '',
      addr: data.address ?? '',
      telNo: data.phone ?? '',
      email: data.email ?? '',
    };

    if (!this.baseUrl || this.baseUrl === '') {
      return { success: true, erpRefNo: `YLW-CUST-${data.code}`, rawResponse: mapped };
    }

    const resp = await fetch(`${this.baseUrl}/api/v1/customer/upsert`, {
      method: 'POST',
      headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(mapped),
    });

    const body = (await resp.json()) as { code: string; msg?: string };
    if (!resp.ok || body.code !== 'OK') {
      return { success: false, error: body.msg ?? `HTTP ${resp.status}`, rawResponse: body };
    }

    return { success: true, erpRefNo: `YLW-CUST-${data.code}`, rawResponse: body };
  }

  /** 입고 확인 데이터 수신 (PULL) */
  async pullReceipts(fromDate: string, toDate: string): Promise<ErpSyncResult> {
    if (!this.baseUrl || this.baseUrl === '') {
      return { success: true, rawResponse: { receipts: [], message: 'preview mode' } };
    }

    const params = new URLSearchParams({
      compCd: this.companyCode,
      fromDate,
      toDate,
    });

    const resp = await fetch(`${this.baseUrl}/api/v1/receipt/list?${params}`, {
      headers: { 'X-API-KEY': this.apiKey },
    });

    const body = (await resp.json()) as { code: string; receipts?: unknown[]; msg?: string };
    if (!resp.ok || body.code !== 'OK') {
      return { success: false, error: body.msg ?? `HTTP ${resp.status}`, rawResponse: body };
    }

    return { success: true, rawResponse: body };
  }

  /** 연결 상태 확인 */
  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    if (!this.baseUrl || this.baseUrl === '') {
      return { ok: false, latencyMs: 0 };
    }

    const start = Date.now();
    try {
      const resp = await fetch(`${this.baseUrl}/api/v1/health`, {
        headers: { 'X-API-KEY': this.apiKey },
        signal: AbortSignal.timeout(5000),
      });
      return { ok: resp.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }
}

// ── 커넥터 팩토리 + 서비스 함수 ────────────────────────

function createConnector(config: {
  erpType: string;
  baseUrl: string;
  authType: string;
  credentials: Record<string, string>;
  configJson?: Record<string, string> | null;
}): DouzonConnector | YoungLimWonConnector {
  if (config.erpType === 'DOUZON') {
    return new DouzonConnector({
      baseUrl: config.baseUrl,
      credentials: {
        clientId: config.credentials.clientId ?? '',
        clientSecret: config.credentials.clientSecret ?? '',
      },
    });
  }
  return new YoungLimWonConnector({
    baseUrl: config.baseUrl,
    companyCode: config.configJson?.companyCode ?? '',
    apiKey: config.credentials.apiKey ?? '',
  });
}

// ── 커넥터 설정 CRUD ──────────────────────────────────

export async function getConnectorConfigs(companyId: string) {
  return prisma.erpConnectorConfig.findMany({
    where: { companyId },
    include: { fieldMappings: true },
    orderBy: { erpType: 'asc' },
  });
}

export async function getConnectorConfig(id: string) {
  return prisma.erpConnectorConfig.findUnique({
    where: { id },
    include: { fieldMappings: true },
  });
}

export async function upsertConnectorConfig(
  companyId: string,
  erpType: ErpType,
  data: {
    displayName: string;
    baseUrl: string;
    authType: string;
    credentials: Record<string, string>;
    configJson?: Record<string, string>;
  },
) {
  return prisma.erpConnectorConfig.upsert({
    where: { companyId_erpType: { companyId, erpType } },
    create: {
      companyId,
      erpType,
      displayName: data.displayName,
      baseUrl: data.baseUrl,
      authType: data.authType,
      credentials: data.credentials as Prisma.InputJsonValue,
      configJson: data.configJson as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
    update: {
      displayName: data.displayName,
      baseUrl: data.baseUrl,
      authType: data.authType,
      credentials: data.credentials as Prisma.InputJsonValue,
      configJson: data.configJson as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  });
}

export async function toggleConnector(id: string, isActive: boolean) {
  return prisma.erpConnectorConfig.update({
    where: { id },
    data: { isActive },
  });
}

// ── 연결 상태 확인 ─────────────────────────────────────

export async function pingConnector(id: string) {
  const config = await prisma.erpConnectorConfig.findUnique({ where: { id } });
  if (!config) throw new Error('커넥터를 찾을 수 없습니다');

  const connector = createConnector({
    erpType: config.erpType,
    baseUrl: config.baseUrl,
    authType: config.authType,
    credentials: config.credentials as Record<string, string>,
    configJson: config.configJson as Record<string, string> | null,
  });

  const pingResult = await connector.ping();

  await prisma.erpConnectorConfig.update({
    where: { id },
    data: {
      lastPingAt: new Date(),
      lastPingStatus: pingResult.ok ? 'OK' : 'ERROR',
    },
  });

  return { ...pingResult, status: pingResult.ok ? 'OK' : 'ERROR' };
}

// ── 전표 동기화 ─────────────────────────────────────────

export async function syncVoucher(
  connectorId: string,
  voucherId: string,
) {
  const config = await prisma.erpConnectorConfig.findUnique({
    where: { id: connectorId },
    include: { fieldMappings: { where: { entityType: 'VOUCHER' } } },
  });
  if (!config) throw new Error('커넥터를 찾을 수 없습니다');
  if (!config.isActive) throw new Error('커넥터가 비활성 상태입니다');

  // 전표 데이터 조회
  const voucher = await prisma.voucher.findUnique({
    where: { id: voucherId },
    include: { partner: true, lines: true },
  });
  if (!voucher) throw new Error('전표를 찾을 수 없습니다');

  // HanVoxel → ERP 형식 변환
  const erpData: ErpVoucherData = {
    type: voucher.type === 'PURCHASE' ? 'AP' : 'AR',
    partnerCode: voucher.partner.code,
    date: voucher.voucherDate.toISOString().slice(0, 10).replace(/-/g, ''),
    lines: voucher.lines.map((l) => ({
      itemCode: l.sku,
      itemName: l.itemName,
      qty: l.qty,
      unitPrice: l.unitPrice,
      amount: l.amount,
      taxAmount: l.taxAmount,
    })),
    totalAmount: voucher.totalAmount,
    referenceNo: voucher.voucherNo,
  };

  const connector = createConnector({
    erpType: config.erpType,
    baseUrl: config.baseUrl,
    authType: config.authType,
    credentials: config.credentials as Record<string, string>,
    configJson: config.configJson as Record<string, string> | null,
  });

  const mappings = config.fieldMappings.map((m) => ({
    sourceField: m.sourceField,
    targetField: m.targetField,
    transformType: m.transformType,
    transformParam: m.transformParam,
  }));

  // 재시도 로직 포함 전송
  let syncResult: ErpSyncResult;
  let retryCount = 0;

  try {
    const { result, retryCount: rc } = await withRetry(
      () => connector.sendVoucher(erpData, mappings),
      connectorId,
      'VOUCHER',
      voucherId,
    );
    syncResult = result;
    retryCount = rc;
  } catch (e) {
    syncResult = {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
    retryCount = MAX_RETRIES;
  }

  // 동기화 로그 기록
  await prisma.erpSyncLog.create({
    data: {
      connectorId,
      direction: 'PUSH',
      entityType: 'VOUCHER',
      entityId: voucherId,
      erpRefNo: syncResult.erpRefNo,
      status: syncResult.success ? 'SUCCESS' : 'FAILED',
      errorMessage: syncResult.error,
      retryCount,
      requestPayload: erpData as unknown as Prisma.InputJsonValue,
      responsePayload: syncResult.rawResponse as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  });

  return syncResult;
}

// ── 거래처 동기화 ───────────────────────────────────────

export async function syncPartner(connectorId: string, partnerId: string) {
  const config = await prisma.erpConnectorConfig.findUnique({ where: { id: connectorId } });
  if (!config || !config.isActive) throw new Error('커넥터가 비활성 상태입니다');

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) throw new Error('거래처를 찾을 수 없습니다');

  const partnerData: ErpPartnerData = {
    code: partner.code,
    name: partner.name,
    bizNo: partner.bizNo ?? undefined,
    ceoName: partner.ceoName ?? undefined,
    bizType: partner.bizType ?? undefined,
    address: partner.address ?? undefined,
    phone: partner.phone ?? undefined,
    email: partner.email ?? undefined,
  };

  const connector = createConnector({
    erpType: config.erpType,
    baseUrl: config.baseUrl,
    authType: config.authType,
    credentials: config.credentials as Record<string, string>,
    configJson: config.configJson as Record<string, string> | null,
  });

  let syncResult: ErpSyncResult;
  let retryCount = 0;

  try {
    const { result, retryCount: rc } = await withRetry(
      () => connector.syncPartner(partnerData),
      connectorId,
      'PARTNER',
      partnerId,
    );
    syncResult = result;
    retryCount = rc;
  } catch (e) {
    syncResult = { success: false, error: e instanceof Error ? e.message : String(e) };
    retryCount = MAX_RETRIES;
  }

  await prisma.erpSyncLog.create({
    data: {
      connectorId,
      direction: 'PUSH',
      entityType: 'PARTNER',
      entityId: partnerId,
      erpRefNo: syncResult.erpRefNo,
      status: syncResult.success ? 'SUCCESS' : 'FAILED',
      errorMessage: syncResult.error,
      retryCount,
      requestPayload: partnerData as unknown as Prisma.InputJsonValue,
      responsePayload: syncResult.rawResponse as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  });

  return syncResult;
}

// ── 동기화 로그 조회 ────────────────────────────────────

export async function getSyncLogs(
  connectorId: string,
  options?: { status?: string; entityType?: string; limit?: number },
) {
  const where: Prisma.ErpSyncLogWhereInput = { connectorId };
  if (options?.status) where.status = options.status;
  if (options?.entityType) where.entityType = options.entityType;

  return prisma.erpSyncLog.findMany({
    where,
    orderBy: { syncedAt: 'desc' },
    take: options?.limit ?? 50,
  });
}

export async function getSyncStats(connectorId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [total, success, failed] = await Promise.all([
    prisma.erpSyncLog.count({
      where: { connectorId, syncedAt: { gte: since } },
    }),
    prisma.erpSyncLog.count({
      where: { connectorId, status: 'SUCCESS', syncedAt: { gte: since } },
    }),
    prisma.erpSyncLog.count({
      where: { connectorId, status: 'FAILED', syncedAt: { gte: since } },
    }),
  ]);

  return {
    total,
    success,
    failed,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
  };
}

// ── 필드 매핑 CRUD ──────────────────────────────────────

export async function getFieldMappings(connectorId: string, entityType?: string) {
  const where: Prisma.ErpFieldMappingWhereInput = { connectorId };
  if (entityType) where.entityType = entityType;

  return prisma.erpFieldMapping.findMany({
    where,
    orderBy: [{ entityType: 'asc' }, { sourceField: 'asc' }],
  });
}

export async function upsertFieldMapping(
  connectorId: string,
  entityType: string,
  sourceField: string,
  data: { targetField: string; transformType?: string; transformParam?: string; isRequired?: boolean },
) {
  return prisma.erpFieldMapping.upsert({
    where: {
      connectorId_entityType_sourceField: { connectorId, entityType, sourceField },
    },
    create: {
      connectorId,
      entityType,
      sourceField,
      targetField: data.targetField,
      transformType: data.transformType ?? 'DIRECT',
      transformParam: data.transformParam,
      isRequired: data.isRequired ?? false,
    },
    update: {
      targetField: data.targetField,
      transformType: data.transformType ?? 'DIRECT',
      transformParam: data.transformParam,
      isRequired: data.isRequired ?? false,
    },
  });
}

export async function deleteFieldMapping(id: string) {
  return prisma.erpFieldMapping.delete({ where: { id } });
}

// ── 프리뷰 (매핑 미리보기) ──────────────────────────────

export function previewErpMapping(data: ErpVoucherData, erpType: ErpType) {
  if (erpType === 'DOUZON') {
    const connector = new DouzonConnector({
      baseUrl: '',
      credentials: { clientId: '', clientSecret: '' },
    });
    return { erpType, mapped: connector.mapToDouzon(data) };
  }
  const connector = new YoungLimWonConnector({ baseUrl: '', companyCode: 'DEMO', apiKey: '' });
  return { erpType, mapped: connector.mapToYoungLimWon(data) };
}

// ── 레거시 호환 ──────────────────────────────────────────

export function getConnectorStatus(): { douzon: string; younglimwon: string } {
  return {
    douzon: process.env.DOUZON_API_URL ? 'configured' : 'not_configured',
    younglimwon: process.env.YOUNGLIMWON_API_URL ? 'configured' : 'not_configured',
  };
}
