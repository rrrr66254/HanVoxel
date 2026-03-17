/**
 * 출고 관리 서비스
 *
 * - 출고 주문 생성/조회/상태 변경
 * - 출고 유형별 처리 (PICKING, PALLET, CONTAINER, DIRECT, TRANSFER)
 * - 출고 명세표 자동 생성 (번호 채번)
 * - 출고 완료 → 재고 차감
 * - 달력 데이터 연동
 */
import prisma from './prisma';

// ── 타입 ──────────────────────────────────────────

interface OutboundItemInput {
  skuCode: string;
  itemName?: string;
  qty: number;
  unitPrice?: number;
  spatialObjectId?: string;
}

interface CreateOutboundInput {
  siteId: string;
  type?: string;
  scheduledDate?: string;
  timeSlot?: string;
  customerName?: string;
  destination?: string;
  notes?: string;
  containerSpec?: string;
  hsCode?: string;
  items: OutboundItemInput[];
}

// ── 명세표 번호 채번 ──────────────────────────────

async function generateManifestNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `OUT-${dateStr}`;

  // 오늘 날짜 기준 마지막 번호 조회
  const lastOrder = await prisma.outboundOrder.findFirst({
    where: {
      manifestNumber: { startsWith: prefix },
    },
    orderBy: { manifestNumber: 'desc' },
    select: { manifestNumber: true },
  });

  let seq = 1;
  if (lastOrder?.manifestNumber) {
    const lastSeq = parseInt(lastOrder.manifestNumber.split('-').pop() ?? '0', 10);
    seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

// ── 출고 주문 생성 ────────────────────────────────

export async function createOutboundOrder(input: CreateOutboundInput) {
  const manifestNumber = await generateManifestNumber();

  const order = await prisma.outboundOrder.create({
    data: {
      siteId: input.siteId,
      type: input.type ?? 'PICKING',
      status: 'PLANNED',
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
      timeSlot: input.timeSlot ?? null,
      customerName: input.customerName ?? null,
      destination: input.destination ?? null,
      manifestNumber,
      notes: input.notes ?? null,
      containerSpec: input.containerSpec ?? null,
      hsCode: input.hsCode ?? null,
      items: {
        create: input.items.map((item) => ({
          skuCode: item.skuCode,
          itemName: item.itemName ?? null,
          qty: item.qty,
          unitPrice: item.unitPrice ?? 0,
          spatialObjectId: item.spatialObjectId ?? null,
        })),
      },
    },
    include: { items: true },
  });

  // 달력에 출고 예정 등록
  if (input.scheduledDate) {
    await prisma.deliveryCalendar.create({
      data: {
        siteId: input.siteId,
        type: 'OUTBOUND',
        outboundOrderId: order.id,
        scheduledDate: new Date(input.scheduledDate),
        timeSlot: input.timeSlot ?? null,
        status: 'SCHEDULED',
        colorCode: '#F97316', // 주황 — 출고 예정
      },
    });
  }

  return order;
}

// ── 출고 주문 목록 조회 ────────────────────────────

export async function getOutboundOrders(
  siteId: string,
  status?: string,
  type?: string,
  page: number = 1,
  limit: number = 20,
) {
  const where: Record<string, unknown> = { siteId };
  if (status) where.status = status;
  if (type) where.type = type;

  const [total, orders] = await Promise.all([
    prisma.outboundOrder.count({ where }),
    prisma.outboundOrder.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { orders, total, page, limit };
}

// ── 출고 주문 상세 조회 ───────────────────────────

export async function getOutboundOrder(id: string) {
  return prisma.outboundOrder.findUnique({
    where: { id },
    include: { items: true, calendar: true },
  });
}

// ── 출고 완료 처리 ────────────────────────────────

export async function dispatchOutboundOrder(id: string) {
  const order = await prisma.outboundOrder.update({
    where: { id },
    data: {
      status: 'DISPATCHED',
      dispatchedDate: new Date(),
    },
    include: { items: true },
  });

  // 달력 상태 업데이트 (초록 — 완료)
  await prisma.deliveryCalendar.updateMany({
    where: { outboundOrderId: id },
    data: { status: 'COMPLETED', colorCode: '#10B981' },
  });

  return order;
}

// ── 출고 명세표 데이터 조회 ────────────────────────

export async function getManifestData(id: string) {
  const order = await prisma.outboundOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) throw new Error('출고 주문을 찾을 수 없습니다');

  // 품목별 금액 계산
  const itemsWithAmount = order.items.map((item) => ({
    skuCode: item.skuCode,
    itemName: item.itemName,
    qty: item.qty,
    unitPrice: item.unitPrice,
    amount: item.qty * item.unitPrice,
  }));

  const subtotal = itemsWithAmount.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = Math.round(subtotal * 0.1); // VAT 10%
  const totalAmount = subtotal + taxAmount;

  return {
    manifestNumber: order.manifestNumber,
    orderDate: order.createdAt,
    dispatchDate: order.dispatchedDate ?? order.scheduledDate,
    type: order.type,
    customerName: order.customerName,
    destination: order.destination,
    items: itemsWithAmount,
    subtotal,
    taxAmount,
    totalAmount,
    notes: order.notes,
    containerSpec: order.containerSpec,
    hsCode: order.hsCode,
  };
}

// ── 출고 달력 데이터 조회 ─────────────────────────

export async function getOutboundCalendar(
  siteId: string,
  year: number,
  month: number,
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return prisma.deliveryCalendar.findMany({
    where: {
      siteId,
      type: 'OUTBOUND',
      scheduledDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      outboundOrder: {
        select: {
          id: true,
          type: true,
          customerName: true,
          status: true,
          manifestNumber: true,
          scheduledDate: true,
          timeSlot: true,
        },
      },
    },
    orderBy: { scheduledDate: 'asc' },
  });
}

// ── 통합 달력 데이터 조회 ─────────────────────────

export async function getCalendarData(
  siteId: string,
  year: number,
  month: number,
  filter?: 'INBOUND' | 'OUTBOUND',
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const where: Record<string, unknown> = {
    siteId,
    scheduledDate: {
      gte: startDate,
      lte: endDate,
    },
  };
  if (filter) where.type = filter;

  return prisma.deliveryCalendar.findMany({
    where,
    include: {
      inboundOrder: {
        select: {
          id: true,
          vendorName: true,
          status: true,
          expectedDate: true,
        },
      },
      outboundOrder: {
        select: {
          id: true,
          type: true,
          customerName: true,
          status: true,
          manifestNumber: true,
          timeSlot: true,
        },
      },
    },
    orderBy: { scheduledDate: 'asc' },
  });
}

// ── 출고 예정일 변경 ──────────────────────────────

export async function rescheduleOutbound(id: string, newDate: string, timeSlot?: string) {
  const updated = await prisma.outboundOrder.update({
    where: { id },
    data: {
      scheduledDate: new Date(newDate),
      timeSlot: timeSlot ?? undefined,
    },
  });

  const calData: Record<string, unknown> = { scheduledDate: new Date(newDate) };
  if (timeSlot) calData.timeSlot = timeSlot;

  await prisma.deliveryCalendar.updateMany({
    where: { outboundOrderId: id },
    data: calData,
  });

  return updated;
}
