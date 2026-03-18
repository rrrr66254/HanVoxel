/**
 * 입고 관리 서비스
 *
 * - 입고 주문 생성/조회/상태 변경
 * - 도착 확인 → QC 검수 자동 생성
 * - QC 통과 → 재고 반영
 * - 달력 데이터 연동
 * - 자동발주 → 입고 주문 자동 생성
 */
import prisma from './prisma';

// ── 타입 ──────────────────────────────────────────

interface InboundItemInput {
  skuCode: string;
  itemName?: string;
  expectedQty: number;
  unitPrice?: number;
  spatialObjectId?: string;
}

interface CreateInboundInput {
  siteId: string;
  vendorId?: string;
  vendorName?: string;
  reorderRecommendationId?: string;
  expectedDate?: string;
  notes?: string;
  items: InboundItemInput[];
}

// ── 입고 주문 생성 ────────────────────────────────

export async function createInboundOrder(input: CreateInboundInput) {
  const order = await prisma.inboundOrder.create({
    data: {
      siteId: input.siteId,
      vendorId: input.vendorId ?? null,
      vendorName: input.vendorName ?? null,
      reorderRecommendationId: input.reorderRecommendationId ?? null,
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
      notes: input.notes ?? null,
      status: 'ORDERED',
      items: {
        create: input.items.map((item) => ({
          sku: item.skuCode,
          itemName: item.itemName ?? null,
          expectedQty: item.expectedQty,
          unitPrice: item.unitPrice ?? 0,
          spatialObjectId: item.spatialObjectId ?? null,
        })),
      },
    },
    include: { items: true },
  });

  // 달력에 입고 예정 등록
  if (input.expectedDate) {
    await prisma.deliveryCalendar.create({
      data: {
        siteId: input.siteId,
        type: 'INBOUND',
        inboundOrderId: order.id,
        scheduledDate: new Date(input.expectedDate),
        status: 'SCHEDULED',
        colorCode: '#3B82F6', // 파랑 — 예정
      },
    });
  }

  return order;
}

// ── 입고 주문 목록 조회 ────────────────────────────

export async function getInboundOrders(
  siteId: string,
  status?: string,
  page: number = 1,
  limit: number = 20,
) {
  const where: Record<string, unknown> = { siteId };
  if (status) where.status = status;

  const [total, orders] = await Promise.all([
    prisma.inboundOrder.count({ where }),
    prisma.inboundOrder.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { orders, total, page, limit };
}

// ── 입고 주문 상세 조회 ───────────────────────────

export async function getInboundOrder(id: string) {
  return prisma.inboundOrder.findUnique({
    where: { id },
    include: { items: true, calendar: true },
  });
}

// ── 도착 확인 처리 ─────────────────────────────────

export async function arriveInboundOrder(
  id: string,
  actualItems?: Array<{ itemId: string; actualQty: number }>,
) {
  const order = await prisma.inboundOrder.update({
    where: { id },
    data: {
      status: 'ARRIVED',
      actualDate: new Date(),
    },
    include: { items: true },
  });

  // 실제 수량 업데이트
  if (actualItems) {
    for (const ai of actualItems) {
      await prisma.inboundItem.update({
        where: { id: ai.itemId },
        data: { actualQty: ai.actualQty },
      });
    }
  }

  // 달력 상태 업데이트 (주황 — 도착)
  await prisma.deliveryCalendar.updateMany({
    where: { inboundOrderId: id },
    data: { status: 'ARRIVED', colorCode: '#F59E0B' },
  });

  // QC 검수 자동 생성
  const inspection = await prisma.qcInspection.create({
    data: {
      siteId: order.siteId,
      partnerId: order.vendorId ?? undefined,
      type: 'INBOUND',
      status: 'PENDING',
      totalQty: order.items.reduce((sum, item) => sum + (item.actualQty ?? item.expectedQty), 0),
      referenceNo: order.id,
    },
  });

  // 주문 상태를 QC_PENDING으로 변경
  await prisma.inboundOrder.update({
    where: { id },
    data: { status: 'QC_PENDING' },
  });

  // 각 아이템에 QC 검수 ID 연동
  await prisma.inboundItem.updateMany({
    where: { inboundOrderId: id },
    data: { qcInspectionId: inspection.id },
  });

  return { order, inspection };
}

// ── 도착 확인 취소 ───────────────────────────────

export async function cancelArrivalInboundOrder(id: string) {
  const order = await prisma.inboundOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) throw new Error('입고 주문을 찾을 수 없습니다');

  if (!['ARRIVED', 'QC_PENDING'].includes(order.status)) {
    throw new Error('도착 확인 취소는 도착/QC대기 상태에서만 가능합니다');
  }

  // QC 검수 삭제 (자동 생성된 것)
  const qcIds = order.items.map((i) => i.qcInspectionId).filter(Boolean) as string[];
  if (qcIds.length > 0) {
    await prisma.qcInspection.deleteMany({
      where: { id: { in: qcIds } },
    });
  }

  // 아이템 실제수량 및 QC ID 초기화
  await prisma.inboundItem.updateMany({
    where: { inboundOrderId: id },
    data: { actualQty: null, qcInspectionId: null },
  });

  // 주문 상태 복원
  await prisma.inboundOrder.update({
    where: { id },
    data: {
      status: 'ORDERED',
      actualDate: null,
    },
  });

  // 달력 상태 복원 (파랑 — 예정)
  await prisma.deliveryCalendar.updateMany({
    where: { inboundOrderId: id },
    data: { status: 'SCHEDULED', colorCode: '#3B82F6' },
  });

  return { success: true, orderId: id };
}

// ── QC 통과 처리 ──────────────────────────────────

export async function passQcInboundOrder(id: string) {
  const order = await prisma.inboundOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) throw new Error('입고 주문을 찾을 수 없습니다');

  // 주문 상태 업데이트
  await prisma.inboundOrder.update({
    where: { id },
    data: { status: 'QC_PASSED' },
  });

  // 달력 상태 업데이트 (초록 — 완료)
  await prisma.deliveryCalendar.updateMany({
    where: { inboundOrderId: id },
    data: { status: 'COMPLETED', colorCode: '#10B981' },
  });

  // 최종 STOCKED 상태
  await prisma.inboundOrder.update({
    where: { id },
    data: { status: 'STOCKED' },
  });

  return { success: true, orderId: id };
}

// ── 달력 데이터 조회 ──────────────────────────────

export async function getInboundCalendar(
  siteId: string,
  year: number,
  month: number,
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return prisma.deliveryCalendar.findMany({
    where: {
      siteId,
      type: 'INBOUND',
      scheduledDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      inboundOrder: {
        select: {
          id: true,
          vendorName: true,
          status: true,
          expectedDate: true,
          actualDate: true,
        },
      },
    },
    orderBy: { scheduledDate: 'asc' },
  });
}

// ── 입고 예정일 변경 (달력 드래그) ────────────────

export async function rescheduleInbound(id: string, newDate: string) {
  const updated = await prisma.inboundOrder.update({
    where: { id },
    data: { expectedDate: new Date(newDate) },
  });

  await prisma.deliveryCalendar.updateMany({
    where: { inboundOrderId: id },
    data: { scheduledDate: new Date(newDate) },
  });

  return updated;
}

// ── 자동발주 → 입고 주문 자동 생성 ────────────────

export async function createFromReorderRecommendation(recommendationId: string) {
  const rec = await prisma.reorderRecommendation.findUnique({
    where: { id: recommendationId },
  });

  if (!rec) throw new Error('발주 추천을 찾을 수 없습니다');

  // 리드타임 기반 입고 예정일 계산
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + (rec.avgLeadDays ?? 7));

  const order = await createInboundOrder({
    siteId: rec.siteId,
    vendorId: rec.partnerId ?? undefined,
    vendorName: rec.partnerName ?? undefined,
    reorderRecommendationId: recommendationId,
    expectedDate: expectedDate.toISOString().slice(0, 10),
    notes: `자동발주 추천 기반 입고 (SKU: ${rec.sku})`,
    items: [{
      skuCode: rec.sku,
      itemName: rec.itemName,
      expectedQty: rec.reorderQty,
    }],
  });

  return order;
}
