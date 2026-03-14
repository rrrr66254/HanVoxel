import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── 피킹 주문 ──────────────────────────────────────────

interface CreatePickingOrderInput {
  siteId: string;
  orderNo: string;
  policy?: string;
  priority?: number;
  customerName?: string;
  note?: string;
  lines: {
    sku: string;
    itemName: string;
    requestedQty: number;
    binLocationId?: string;
    binCode?: string;
    zone?: string;
    barcode?: string;
    expiryDate?: string;
    receivedDate?: string;
    pickSequence?: number;
  }[];
}

export async function createPickingOrder(data: CreatePickingOrderInput) {
  return prisma.pickingOrder.create({
    data: {
      siteId: data.siteId,
      orderNo: data.orderNo,
      policy: data.policy ?? 'FIFO',
      priority: data.priority ?? 3,
      customerName: data.customerName,
      note: data.note,
      totalLines: data.lines.length,
      lines: {
        create: data.lines.map((line, idx) => ({
          lineNo: idx + 1,
          sku: line.sku,
          itemName: line.itemName,
          requestedQty: line.requestedQty,
          binLocationId: line.binLocationId,
          binCode: line.binCode,
          zone: line.zone,
          barcode: line.barcode,
          expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
          receivedDate: line.receivedDate ? new Date(line.receivedDate) : null,
          pickSequence: line.pickSequence ?? idx + 1,
        })),
      },
    },
    include: { lines: { orderBy: { pickSequence: 'asc' } } },
  });
}

export async function getPickingOrders(
  siteId: string,
  options?: { status?: string; assigneeId?: string; limit?: number; offset?: number }
) {
  const where: Prisma.PickingOrderWhereInput = { siteId };
  if (options?.status) where.status = options.status;
  if (options?.assigneeId) where.assigneeId = options.assigneeId;

  const [orders, total] = await Promise.all([
    prisma.pickingOrder.findMany({
      where,
      include: { lines: { orderBy: { pickSequence: 'asc' } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.pickingOrder.count({ where }),
  ]);
  return { orders, total };
}

export async function getPickingOrderById(id: string) {
  return prisma.pickingOrder.findUnique({
    where: { id },
    include: { lines: { orderBy: { pickSequence: 'asc' } } },
  });
}

// 작업 배정
export async function assignOrder(id: string, assigneeId: string, assigneeName: string) {
  return prisma.pickingOrder.update({
    where: { id },
    data: { assigneeId, assigneeName, status: 'ASSIGNED', assignedAt: new Date() },
    include: { lines: { orderBy: { pickSequence: 'asc' } } },
  });
}

// 피킹 시작
export async function startPicking(id: string) {
  return prisma.pickingOrder.update({
    where: { id },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });
}

// 라인 피킹 완료
export async function pickLine(lineId: string, data: {
  pickedQty: number;
  scanVerified?: boolean;
  errorReason?: string;
}) {
  const status = data.errorReason ? 'ERROR' : data.pickedQty === 0 ? 'SHORT' : 'PICKED';

  const line = await prisma.pickingLine.update({
    where: { id: lineId },
    data: {
      pickedQty: data.pickedQty,
      status,
      scanVerified: data.scanVerified ?? false,
      pickedAt: new Date(),
      errorReason: data.errorReason,
    },
  });

  // 주문 진행 상태 업데이트
  const allLines = await prisma.pickingLine.findMany({
    where: { pickingOrderId: line.pickingOrderId },
  });
  const pickedLines = allLines.filter((l) => l.status === 'PICKED' || l.status === 'SHORT').length;
  const errorLines = allLines.filter((l) => l.status === 'ERROR').length;
  const allDone = allLines.every((l) => l.status !== 'PENDING');

  await prisma.pickingOrder.update({
    where: { id: line.pickingOrderId },
    data: {
      pickedLines,
      errorLines,
      ...(allDone ? { status: 'COMPLETED', completedAt: new Date() } : {}),
    },
  });

  return line;
}

// ── 대시보드 통계 ───────────────────────────────────────

export async function getPickingStats(siteId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await prisma.pickingOrder.findMany({
    where: { siteId, createdAt: { gte: since } },
    include: { lines: true },
  });

  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const inProgress = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'ASSIGNED').length;
  const completed = orders.filter((o) => o.status === 'COMPLETED').length;
  const totalLines = orders.reduce((s, o) => s + o.totalLines, 0);
  const totalErrors = orders.reduce((s, o) => s + o.errorLines, 0);
  const errorRate = totalLines > 0 ? Math.round((totalErrors / totalLines) * 10000) / 100 : 0;

  // 완료 주문 평균 처리 시간 (분)
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED' && o.startedAt && o.completedAt);
  const avgPickingTime = completedOrders.length > 0
    ? Math.round(completedOrders.reduce((s, o) => s + (o.completedAt!.getTime() - o.startedAt!.getTime()), 0) / completedOrders.length / 60000)
    : 0;

  // 작업자별 생산성
  const workerMap = new Map<string, { name: string; completed: number; errors: number; lines: number }>();
  for (const order of orders) {
    if (!order.assigneeId) continue;
    const entry = workerMap.get(order.assigneeId) ?? { name: order.assigneeName ?? '', completed: 0, errors: 0, lines: 0 };
    if (order.status === 'COMPLETED') entry.completed += 1;
    entry.errors += order.errorLines;
    entry.lines += order.pickedLines;
    workerMap.set(order.assigneeId, entry);
  }
  const workerStats = Array.from(workerMap.entries())
    .map(([id, d]) => ({ workerId: id, ...d }))
    .sort((a, b) => b.lines - a.lines);

  return {
    days,
    totalOrders: orders.length,
    pending,
    inProgress,
    completed,
    totalLines,
    totalErrors,
    errorRate,
    avgPickingTime,
    workerStats,
  };
}
