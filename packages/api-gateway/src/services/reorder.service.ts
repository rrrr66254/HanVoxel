/**
 * 자동 발주 추천 서비스
 *
 * - SKU별 일별 출고 이력 집계
 * - 공급업체 리드타임 조회
 * - ml-service 호출하여 수요 예측 + 발주 추천
 * - 추천 결과 DB 저장
 * - 발주서 자동 생성 (ERP Voucher)
 */
import prisma from './prisma';
import { Prisma } from '@prisma/client';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

// ── SKU 일별 출고 이력 집계 ──────────────────────────────

interface DailyUsageRow {
  sku: string;
  usageDate: Date;
  qtyUsed: number;
  qtyReceived: number;
}

export async function getSkuDailyUsage(
  siteId: string,
  sku: string,
  days: number = 90,
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.skuDailyUsage.findMany({
    where: {
      siteId,
      sku,
      usageDate: { gte: since },
    },
    orderBy: { usageDate: 'asc' },
  });
}

export async function getAllSkuUsage(siteId: string, days: number = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.skuDailyUsage.findMany({
    where: {
      siteId,
      usageDate: { gte: since },
    },
    orderBy: { usageDate: 'asc' },
  });

  // SKU별 그룹핑
  const grouped: Record<string, Array<{ date: string; qty: number }>> = {};
  for (const r of rows) {
    const key = r.sku;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      date: r.usageDate.toISOString().slice(0, 10),
      qty: r.qtyUsed,
    });
  }
  return grouped;
}

// ── 공급업체 리드타임 이력 ──────────────────────────────

export async function getLeadTimeRecords(siteId: string, sku?: string) {
  const where: Prisma.SupplierLeadTimeWhereInput = { siteId };
  if (sku) where.sku = sku;

  const records = await prisma.supplierLeadTime.findMany({
    where,
    include: { partner: { select: { name: true } } },
    orderBy: { orderDate: 'asc' },
  });

  return records.map((r) => ({
    partnerId: r.partnerId,
    partnerName: r.partner.name,
    sku: r.sku,
    orderDate: r.orderDate.toISOString().slice(0, 10),
    receivedDate: r.receivedDate?.toISOString().slice(0, 10) ?? null,
    actualDays: r.actualDays,
    orderQty: r.orderQty,
  }));
}

// ── 리드타임 기록 추가 ─────────────────────────────────

export async function recordLeadTime(
  siteId: string,
  partnerId: string,
  sku: string,
  orderDate: string,
  orderQty: number,
  voucherNo?: string,
) {
  return prisma.supplierLeadTime.create({
    data: {
      siteId,
      partnerId,
      sku,
      orderDate: new Date(orderDate),
      orderQty,
      voucherNo,
    },
  });
}

// ── 입고 완료 시 리드타임 갱신 ─────────────────────────

export async function completeLeadTime(
  id: string,
  receivedDate: string,
) {
  const record = await prisma.supplierLeadTime.findUnique({ where: { id } });
  if (!record) throw new Error('리드타임 기록을 찾을 수 없습니다');

  const orderDt = new Date(record.orderDate);
  const recvDt = new Date(receivedDate);
  const diffMs = recvDt.getTime() - orderDt.getTime();
  const actualDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  return prisma.supplierLeadTime.update({
    where: { id },
    data: {
      receivedDate: recvDt,
      actualDays,
    },
  });
}

// ── ML 서비스 호출: 발주 추천 생성 ────────────────────

interface MlReorderRecommendation {
  sku: string;
  itemName: string;
  siteId: string;
  currentQty: number;
  safetyStock: number;
  stockoutDate: string | null;
  daysUntilOut: number | null;
  reorderQty: number;
  partnerId: string | null;
  partnerName: string | null;
  avgLeadDays: number | null;
  orderByDate: string | null;
  urgency: string;
  forecastMeta: Record<string, unknown>;
}

interface MlReorderResponse {
  recommendations: MlReorderRecommendation[];
  summary: Record<string, unknown>;
}

export async function generateRecommendations(
  siteId: string,
  forecastHorizon: number = 30,
) {
  // 1. SKU 재고 목록
  const skuCosts = await prisma.skuCost.findMany({
    where: { siteId, currentQty: { gt: 0 } },
  });

  if (skuCosts.length === 0) return { recommendations: [], summary: {} };

  // 2. 출고 이력
  const usageHistory = await getAllSkuUsage(siteId, 90);

  // 3. 리드타임 이력
  const leadTimeRecords = await getLeadTimeRecords(siteId);

  // 4. ML 서비스 호출
  const body = {
    skus: skuCosts.map((s) => ({
      sku: s.sku,
      itemName: s.itemName,
      siteId,
      currentQty: s.currentQty,
      safetyStock: null,
      minOrderQty: 1,
      orderUnit: 1,
    })),
    usageHistory,
    leadTimeRecords,
    forecastHorizon,
  };

  const resp = await fetch(`${ML_SERVICE_URL}/api/v1/reorder/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`ML 서비스 발주 추천 실패: ${resp.status}`);
  }

  const data = (await resp.json()) as MlReorderResponse;

  // 5. DB에 추천 저장
  for (const rec of data.recommendations) {
    await prisma.reorderRecommendation.create({
      data: {
        siteId,
        sku: rec.sku,
        itemName: rec.itemName,
        currentQty: rec.currentQty,
        safetyStock: rec.safetyStock,
        stockoutDate: rec.stockoutDate ? new Date(rec.stockoutDate) : null,
        daysUntilOut: rec.daysUntilOut,
        reorderQty: rec.reorderQty,
        partnerId: rec.partnerId,
        partnerName: rec.partnerName,
        avgLeadDays: rec.avgLeadDays,
        orderByDate: rec.orderByDate ? new Date(rec.orderByDate) : null,
        urgency: rec.urgency,
        status: 'PENDING',
        forecastMeta: rec.forecastMeta as Prisma.InputJsonValue,
      },
    });
  }

  return data;
}

// ── 추천 목록 조회 ─────────────────────────────────────

export async function getRecommendations(
  siteId: string,
  status?: string,
  urgency?: string,
) {
  const where: Prisma.ReorderRecommendationWhereInput = { siteId };
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;

  return prisma.reorderRecommendation.findMany({
    where,
    orderBy: [{ urgency: 'asc' }, { stockoutDate: 'asc' }],
    take: 100,
  });
}

// ── 추천 수락 → 발주서 자동 생성 ──────────────────────

export async function acceptRecommendation(id: string) {
  const rec = await prisma.reorderRecommendation.findUnique({ where: { id } });
  if (!rec) throw new Error('추천을 찾을 수 없습니다');
  if (rec.status !== 'PENDING') throw new Error('이미 처리된 추천입니다');

  // 발주서 자동 생성
  let voucherId: string | null = null;

  if (rec.partnerId) {
    // 전표 번호 생성
    const today = new Date();
    const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const count = await prisma.voucher.count({
      where: { siteId: rec.siteId, voucherNo: { startsWith: prefix } },
    });
    const voucherNo = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    // 최근 매입 단가 조회
    const skuCost = await prisma.skuCost.findUnique({
      where: { siteId_sku: { siteId: rec.siteId, sku: rec.sku } },
    });
    const unitPrice = skuCost?.lastPurchasePrice ?? 0;
    const amount = rec.reorderQty * unitPrice;
    const taxAmount = Math.round(amount * 0.1);

    const voucher = await prisma.voucher.create({
      data: {
        siteId: rec.siteId,
        type: 'PURCHASE',
        voucherNo,
        partnerId: rec.partnerId,
        status: 'DRAFT',
        voucherDate: today,
        dueDate: rec.orderByDate ?? undefined,
        subtotal: amount,
        taxAmount,
        totalAmount: amount + taxAmount,
        note: `[자동발주] ${rec.sku} ${rec.itemName} — ${rec.reorderQty}개`,
        lines: {
          create: [{
            lineNo: 1,
            sku: rec.sku,
            itemName: rec.itemName,
            qty: rec.reorderQty,
            unitPrice,
            amount,
            taxAmount,
          }],
        },
      },
    });
    voucherId = voucher.id;

    // 리드타임 추적 기록
    await recordLeadTime(
      rec.siteId,
      rec.partnerId,
      rec.sku,
      today.toISOString().slice(0, 10),
      rec.reorderQty,
      voucherNo,
    );
  }

  // 추천 상태 업데이트
  return prisma.reorderRecommendation.update({
    where: { id },
    data: {
      status: voucherId ? 'AUTO_ORDERED' : 'ACCEPTED',
      voucherId,
    },
  });
}

// ── 추천 무시 ──────────────────────────────────────────

export async function dismissRecommendation(id: string) {
  return prisma.reorderRecommendation.update({
    where: { id },
    data: { status: 'DISMISSED' },
  });
}

// ── 수요 예측 조회 (단일 SKU) ──────────────────────────

export async function getForecast(siteId: string, sku: string, horizon: number = 30) {
  // 출고 이력 조회
  const usage = await getSkuDailyUsage(siteId, sku, 90);
  if (usage.length === 0) return null;

  const history = usage.map((r) => ({
    date: r.usageDate.toISOString().slice(0, 10),
    qty: r.qtyUsed,
  }));

  const resp = await fetch(`${ML_SERVICE_URL}/api/v1/reorder/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, sku, history, horizon }),
  });

  if (!resp.ok) throw new Error(`예측 실패: ${resp.status}`);
  return resp.json();
}

// ── 대시보드 요약 통계 ─────────────────────────────────

export async function getReorderSummary(siteId: string) {
  const [pending, total, urgent] = await Promise.all([
    prisma.reorderRecommendation.count({
      where: { siteId, status: 'PENDING' },
    }),
    prisma.reorderRecommendation.count({
      where: { siteId },
    }),
    prisma.reorderRecommendation.count({
      where: {
        siteId,
        status: 'PENDING',
        urgency: { in: ['CRITICAL', 'HIGH'] },
      },
    }),
  ]);

  // 최근 자동 발주 건수 (30일)
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const autoOrdered = await prisma.reorderRecommendation.count({
    where: {
      siteId,
      status: 'AUTO_ORDERED',
      createdAt: { gte: since },
    },
  });

  return {
    pendingCount: pending,
    totalCount: total,
    urgentCount: urgent,
    autoOrderedLast30d: autoOrdered,
  };
}
