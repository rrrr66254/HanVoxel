/**
 * B2C 대량 출고 업로드 서비스
 *
 * - CSV/Excel 파싱 후 행별 검증
 * - 대량 출고 주문 생성 (트랜잭션)
 * - 업로드 이력 관리
 */
import prisma from './prisma';

// ── 타입 ──────────────────────────────────────────

/** 파싱된 출고 행 */
export interface ParsedRow {
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
}

/** 검증 상태 */
export type ValidationStatus = 'OK' | 'WARNING' | 'ERROR';

/** 검증 결과 행 */
export interface ValidatedRow extends ParsedRow {
  status: ValidationStatus;
  messages: string[];
}

/** 업로드 파싱 결과 */
export interface BulkParseResult {
  rows: ValidatedRow[];
  totalRows: number;
  okCount: number;
  warningCount: number;
  errorCount: number;
  uploadLogId: string;
}

/** 대량 생성 결과 */
export interface BulkCreateResult {
  createdCount: number;
  errorCount: number;
  errors: Array<{ rowIndex: number; message: string }>;
  uploadLogId: string;
}

// ── 플랫폼별 기본 컬럼 매핑 ──────────────────────

export interface ColumnMapping {
  [targetField: string]: string; // targetField → sourceColumn
}

export const PLATFORM_MAPPINGS: Record<string, ColumnMapping> = {
  COUPANG: {
    referenceNo: '주문번호',
    customerName: '수령인',
    destination: '배송지 주소',
    customerPhone: '수령인 연락처',
    skuCode: '옵션ID',
    productName: '상품명',
    qty: '수량',
    unitPrice: '판매가',
    scheduledDate: '발송기한',
    carrier: '택배사',
    trackingNumber: '송장번호',
  },
  SMARTSTORE: {
    referenceNo: '주문번호',
    customerName: '수취인명',
    destination: '배송지',
    customerPhone: '수취인연락처1',
    skuCode: '상품번호',
    productName: '상품명',
    qty: '수량',
    unitPrice: '상품가격',
    scheduledDate: '발송기한일',
    carrier: '택배사',
    trackingNumber: '송장번호',
  },
  CUSTOM: {
    referenceNo: '주문번호',
    customerName: '수령인 이름',
    destination: '수령인 주소',
    customerPhone: '연락처',
    skuCode: 'SKU 코드',
    productName: '품명',
    qty: '수량',
    unitPrice: '단가',
    scheduledDate: '출고 희망일',
    carrier: '배송사',
    trackingNumber: '운송장 번호',
  },
};

// ── 컬럼 매핑 적용 ──────────────────────────────

function applyMapping(rawRow: Record<string, string>, mapping: ColumnMapping): ParsedRow {
  const get = (field: string): string | undefined => {
    const col = mapping[field];
    if (!col) return undefined;
    return rawRow[col]?.trim() || undefined;
  };

  const qtyStr = get('qty');
  const priceStr = get('unitPrice');

  return {
    rowIndex: 0,
    referenceNo: get('referenceNo'),
    customerName: get('customerName'),
    destination: get('destination'),
    customerPhone: get('customerPhone'),
    skuCode: get('skuCode'),
    productName: get('productName'),
    qty: qtyStr ? parseInt(qtyStr, 10) : undefined,
    unitPrice: priceStr ? parseInt(priceStr.replace(/[,원₩]/g, ''), 10) : undefined,
    scheduledDate: get('scheduledDate'),
    carrier: get('carrier'),
    trackingNumber: get('trackingNumber'),
  };
}

// ── 행별 검증 ───────────────────────────────────

function validateRow(row: ParsedRow): ValidatedRow {
  const messages: string[] = [];
  let status: ValidationStatus = 'OK';

  // 필수 필드 검증
  if (!row.skuCode) {
    messages.push('SKU 코드 누락');
    status = 'ERROR';
  }
  if (!row.qty || row.qty <= 0) {
    messages.push('수량이 유효하지 않음');
    status = 'ERROR';
  }
  if (!row.customerName) {
    messages.push('수령인 이름 누락');
    status = 'ERROR';
  }

  // 경고 검증
  if (!row.destination && status !== 'ERROR') {
    messages.push('배송지 주소 미입력');
    status = 'WARNING';
  }
  if (!row.scheduledDate && status !== 'ERROR') {
    messages.push('출고 희망일 미입력 — 오늘 날짜로 설정됩니다');
    if (status === 'OK') status = 'WARNING';
  }
  if (!row.referenceNo && status !== 'ERROR') {
    messages.push('주문번호 미입력 — 자동 생성됩니다');
    if (status === 'OK') status = 'WARNING';
  }

  return { ...row, status, messages };
}

// ── 파싱 + 검증 ─────────────────────────────────

export async function parseAndValidate(
  siteId: string,
  fileName: string,
  fileSize: number,
  rawRows: Record<string, string>[],
  platformType: string,
  columnMapping: ColumnMapping,
  uploadedBy?: string,
): Promise<BulkParseResult> {
  // 컬럼 매핑 적용 + 검증
  const validated: ValidatedRow[] = rawRows.map((raw, idx) => {
    const parsed = applyMapping(raw, columnMapping);
    parsed.rowIndex = idx + 1;
    return validateRow(parsed);
  });

  const okCount = validated.filter((r) => r.status === 'OK').length;
  const warningCount = validated.filter((r) => r.status === 'WARNING').length;
  const errorCount = validated.filter((r) => r.status === 'ERROR').length;

  // 업로드 로그 생성
  const log = await prisma.bulkUploadLog.create({
    data: {
      siteId,
      fileName,
      fileSize,
      totalRows: rawRows.length,
      successCount: 0,
      errorCount,
      warningCount,
      status: 'VALIDATED',
      platformType,
      columnMapping: columnMapping as Record<string, unknown>,
      uploadedBy,
    },
  });

  return {
    rows: validated,
    totalRows: rawRows.length,
    okCount,
    warningCount,
    errorCount,
    uploadLogId: log.id,
  };
}

// ── 대량 출고 주문 생성 ──────────────────────────

export async function bulkCreateOrders(
  siteId: string,
  uploadLogId: string,
  rows: ValidatedRow[],
): Promise<BulkCreateResult> {
  // 에러가 아닌 행만 생성 대상
  const validRows = rows.filter((r) => r.status !== 'ERROR');
  const errors: Array<{ rowIndex: number; message: string }> = [];
  let createdCount = 0;

  // 트랜잭션으로 일괄 생성
  try {
    await prisma.$transaction(async (tx: typeof prisma) => {
      for (const row of validRows) {
        try {
          // 명세표 번호 생성
          const today = new Date();
          const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
          const prefix = `OUT-${dateStr}`;
          const lastOrder = await tx.outboundOrder.findFirst({
            where: { manifestNumber: { startsWith: prefix } },
            orderBy: { manifestNumber: 'desc' },
            select: { manifestNumber: true },
          });
          let seq = 1;
          if (lastOrder?.manifestNumber) {
            const lastSeq = parseInt(lastOrder.manifestNumber.split('-').pop() ?? '0', 10);
            seq = lastSeq + 1;
          }
          // 이미 생성된 건수도 반영
          seq += createdCount;
          const manifestNumber = `${prefix}-${String(seq).padStart(4, '0')}`;

          const scheduledDate = row.scheduledDate ? new Date(row.scheduledDate) : new Date();

          await tx.outboundOrder.create({
            data: {
              siteId,
              type: 'PICKING',
              status: 'PLANNED',
              scheduledDate,
              customerName: row.customerName ?? null,
              destination: row.destination ?? null,
              manifestNumber,
              notes: row.carrier ? `배송사: ${row.carrier}` : null,
              items: {
                create: [{
                  skuCode: row.skuCode ?? '',
                  itemName: row.productName ?? null,
                  qty: row.qty ?? 0,
                  unitPrice: row.unitPrice ?? 0,
                }],
              },
            },
          });

          // 달력 등록
          await tx.deliveryCalendar.create({
            data: {
              siteId,
              type: 'OUTBOUND',
              scheduledDate,
              status: 'SCHEDULED',
              colorCode: '#F97316',
            },
          });

          createdCount++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : '생성 실패';
          errors.push({ rowIndex: row.rowIndex, message: msg });
        }
      }
    });
  } catch (e) {
    // 트랜잭션 전체 실패
    const msg = e instanceof Error ? e.message : '트랜잭션 실패';
    await prisma.bulkUploadLog.update({
      where: { id: uploadLogId },
      data: {
        status: 'FAILED',
        errorDetails: { message: msg } as Record<string, unknown>,
      },
    });
    return {
      createdCount: 0,
      errorCount: rows.length,
      errors: [{ rowIndex: 0, message: msg }],
      uploadLogId,
    };
  }

  // 업로드 로그 업데이트
  const errorCount = rows.filter((r) => r.status === 'ERROR').length + errors.length;
  await prisma.bulkUploadLog.update({
    where: { id: uploadLogId },
    data: {
      status: 'COMPLETED',
      successCount: createdCount,
      errorCount,
      errorDetails: errors.length > 0 ? (errors as unknown as Record<string, unknown>) : undefined,
    },
  });

  return { createdCount, errorCount, errors, uploadLogId };
}

// ── 업로드 이력 조회 ─────────────────────────────

export async function getUploadLogs(siteId: string, page: number = 1, limit: number = 20) {
  const where = { siteId };
  const [total, logs] = await Promise.all([
    prisma.bulkUploadLog.count({ where }),
    prisma.bulkUploadLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { logs, total, page, limit };
}

// ── 플랫폼 매핑 조회 ─────────────────────────────

export function getPlatformMapping(platform: string): ColumnMapping {
  return PLATFORM_MAPPINGS[platform] ?? PLATFORM_MAPPINGS.CUSTOM;
}
