/**
 * 수주 관리 + MRP 소요 분석 + 재고 더블체크 서비스
 *
 * - 수주 등록/조회/상태 변경
 * - MRP 소요량 자동 계산
 * - 재고 더블체크 요청/확인
 * - 자동 발주 추천 연동
 */
import prisma from './prisma';

// ── 타입 ──────────────────────────────────────────

interface SalesOrderItemInput {
  productSku: string;
  productName?: string;
  qty: number;
  unitPrice?: number;
}

interface CreateSalesOrderInput {
  siteId: string;
  customerId?: string;
  customerName?: string;
  orderDate?: string;
  deliveryDeadline?: string;
  items: SalesOrderItemInput[];
  notes?: string;
}

// ── 수주 번호 채번 ──────────────────────────────

async function generateOrderNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SO-${dateStr}`;

  const last = await prisma.salesOrder.findFirst({
    where: { orderNo: { startsWith: prefix } },
    orderBy: { orderNo: 'desc' },
    select: { orderNo: true },
  });

  let seq = 1;
  if (last?.orderNo) {
    const lastSeq = parseInt(last.orderNo.split('-').pop() ?? '0', 10);
    seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

// ── 수주 등록 ───────────────────────────────────

export async function createSalesOrder(input: CreateSalesOrderInput) {
  const orderNo = await generateOrderNo();

  const order = await prisma.salesOrder.create({
    data: {
      siteId: input.siteId,
      orderNo,
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? null,
      status: 'RECEIVED',
      orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
      deliveryDeadline: input.deliveryDeadline ? new Date(input.deliveryDeadline) : null,
      items: input.items as unknown as Record<string, unknown>[],
      notes: input.notes ?? null,
    },
  });

  return order;
}

// ── 수주 목록 조회 ──────────────────────────────

export async function getSalesOrders(
  siteId: string,
  status?: string,
  page: number = 1,
  limit: number = 20,
) {
  const where: Record<string, unknown> = { siteId };
  if (status) where.status = status;

  const [total, orders] = await Promise.all([
    prisma.salesOrder.count({ where }),
    prisma.salesOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        mrpResults: { select: { id: true, status: true } },
      },
    }),
  ]);

  return { orders, total, page, limit };
}

// ── 수주 수정 ───────────────────────────────────

export async function updateSalesOrder(
  id: string,
  input: {
    customerName?: string;
    deliveryDeadline?: string;
    status?: string;
    notes?: string;
    items?: SalesOrderItemInput[];
  },
) {
  const data: Record<string, unknown> = {};
  if (input.customerName !== undefined) data.customerName = input.customerName;
  if (input.deliveryDeadline !== undefined) data.deliveryDeadline = input.deliveryDeadline ? new Date(input.deliveryDeadline) : null;
  if (input.status !== undefined) data.status = input.status;
  if (input.notes !== undefined) data.notes = input.notes || null;
  if (input.items !== undefined) data.items = input.items as unknown as Record<string, unknown>[];

  return prisma.salesOrder.update({
    where: { id },
    data,
    include: {
      mrpResults: { select: { id: true, status: true } },
    },
  });
}

// ── 수주 상세 조회 ──────────────────────────────

export async function getSalesOrder(id: string) {
  return prisma.salesOrder.findUnique({
    where: { id },
    include: {
      mrpResults: true,
      stockChecks: true,
    },
  });
}

// ── MRP 소요량 계산 ─────────────────────────────

export async function runMrp(salesOrderId: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
  });
  if (!order) throw new Error('수주를 찾을 수 없습니다');

  const items = order.items as unknown as SalesOrderItemInput[];
  if (!items || items.length === 0) throw new Error('수주 품목이 없습니다');

  // 기존 MRP 결과 삭제 (재실행 시)
  await prisma.mrpResult.deleteMany({ where: { salesOrderId } });
  await prisma.stockCheckRequest.deleteMany({ where: { salesOrderId } });

  const results: Array<{
    materialSku: string;
    materialName: string | null;
    requiredQty: number;
    currentStock: number;
    shortageQty: number;
  }> = [];

  // 제품별 BOM 조회 → 소요량 계산
  for (const item of items) {
    const bomItems = await prisma.bomItem.findMany({
      where: {
        siteId: order.siteId,
        productSku: item.productSku,
      },
    });

    if (bomItems.length === 0) {
      // BOM 미등록 시 완성품 SKU 자체를 자재로 취급
      const requiredQty = item.qty;

      // 재고 조회 (sku_costs에서 currentQty 사용)
      const skuCost = await prisma.skuCost.findFirst({
        where: { siteId: order.siteId, sku: item.productSku },
        select: { currentQty: true },
      });
      const currentStock = skuCost?.currentQty ?? 0;
      const shortageQty = Math.max(0, requiredQty - currentStock);

      results.push({
        materialSku: item.productSku,
        materialName: item.productName ?? null,
        requiredQty,
        currentStock,
        shortageQty,
      });
    } else {
      for (const bom of bomItems) {
        const requiredQty = item.qty * bom.qtyPerUnit;

        // 재고 조회
        const skuCost = await prisma.skuCost.findFirst({
          where: { siteId: order.siteId, sku: bom.materialSku },
          select: { currentQty: true },
        });
        const currentStock = skuCost?.currentQty ?? 0;
        const shortageQty = Math.max(0, requiredQty - currentStock);

        // 동일 자재 중복 합산
        const existing = results.find((r) => r.materialSku === bom.materialSku);
        if (existing) {
          existing.requiredQty += requiredQty;
          existing.shortageQty = Math.max(0, existing.requiredQty - existing.currentStock);
        } else {
          results.push({
            materialSku: bom.materialSku,
            materialName: bom.notes ?? bom.materialSku,
            requiredQty,
            currentStock,
            shortageQty,
          });
        }
      }
    }
  }

  // MRP 결과 저장
  const mrpResults = await Promise.all(
    results.map((r) =>
      prisma.mrpResult.create({
        data: {
          salesOrderId,
          materialSku: r.materialSku,
          materialName: r.materialName,
          requiredQty: r.requiredQty,
          currentStock: r.currentStock,
          shortageQty: r.shortageQty,
          status: r.shortageQty > 0 ? 'PENDING' : 'CHECKED_OK',
        },
      }),
    ),
  );

  // 부족 자재에 대해 더블체크 요청 생성
  const shortageResults = mrpResults.filter((r: { shortageQty: number }) => r.shortageQty > 0);
  for (const mr of shortageResults) {
    await prisma.stockCheckRequest.create({
      data: {
        mrpResultId: mr.id,
        salesOrderId,
        status: 'PENDING',
      },
    });
  }

  // 수주 상태 업데이트
  await prisma.salesOrder.update({
    where: { id: salesOrderId },
    data: { status: 'MRP_CHECKED' },
  });

  // 알림 생성 (부족 자재 있는 경우)
  if (shortageResults.length > 0) {
    try {
      await prisma.alert.create({
        data: {
          siteId: order.siteId,
          metricType: 'mrp_shortage',
          severity: 'warning',
          title: `[${order.orderNo}] MRP 분석 — 자재 ${shortageResults.length}건 부족`,
          message: `수주 ${order.orderNo}의 MRP 분석 결과 ${shortageResults.length}건의 자재 부족이 발견되었습니다. 재고 더블체크가 필요합니다.`,
          metadata: {
            salesOrderId,
            orderNo: order.orderNo,
            shortageCount: shortageResults.length,
          } as Record<string, unknown>,
        },
      });
    } catch {
      // 알림 실패 시 무시 (핵심 로직이 아님)
    }
  }

  return {
    salesOrderId,
    orderNo: order.orderNo,
    totalMaterials: results.length,
    shortageCount: shortageResults.length,
    results: mrpResults,
  };
}

// ── MRP 결과 조회 ───────────────────────────────

export async function getMrpResults(salesOrderId: string) {
  return prisma.mrpResult.findMany({
    where: { salesOrderId },
    include: {
      stockChecks: true,
    },
    orderBy: { shortageQty: 'desc' },
  });
}

// ── 부족 자재 일괄 자동 발주 ─────────────────────

export async function triggerReorders(salesOrderId: string) {
  const shortageResults = await prisma.mrpResult.findMany({
    where: {
      salesOrderId,
      shortageQty: { gt: 0 },
      reorderTriggered: false,
      status: { in: ['PENDING', 'CHECKED_OK'] },
    },
  });

  const order = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
    select: { siteId: true, orderNo: true },
  });
  if (!order) throw new Error('수주를 찾을 수 없습니다');

  let triggeredCount = 0;
  for (const mr of shortageResults) {
    // reorder_recommendations에 추가
    try {
      await prisma.reorderRecommendation.create({
        data: {
          siteId: order.siteId,
          sku: mr.materialSku,
          itemName: mr.materialName ?? mr.materialSku,
          currentQty: Math.round(mr.currentStock),
          safetyStock: 0,
          reorderQty: Math.round(mr.shortageQty),
          urgency: 'HIGH',
          status: 'PENDING',
        },
      });
    } catch {
      // 중복 등 무시
    }

    await prisma.mrpResult.update({
      where: { id: mr.id },
      data: { reorderTriggered: true, status: 'REORDERED' },
    });
    triggeredCount++;
  }

  return { triggeredCount };
}

// ── BOM 관리 ────────────────────────────────────

export async function createBomItem(data: {
  siteId: string;
  productSku: string;
  materialSku: string;
  qtyPerUnit: number;
  unit?: string;
  leadTimeDays?: number;
  notes?: string;
}) {
  return prisma.bomItem.create({
    data: {
      siteId: data.siteId,
      productSku: data.productSku,
      materialSku: data.materialSku,
      qtyPerUnit: data.qtyPerUnit,
      unit: data.unit ?? '개',
      leadTimeDays: data.leadTimeDays ?? 0,
      notes: data.notes ?? null,
    },
  });
}

export async function getBomByProduct(siteId: string, productSku: string) {
  return prisma.bomItem.findMany({
    where: { siteId, productSku },
    orderBy: { materialSku: 'asc' },
  });
}

export async function bulkCreateBom(siteId: string, items: Array<{
  productSku: string;
  materialSku: string;
  qtyPerUnit: number;
  unit?: string;
  leadTimeDays?: number;
  notes?: string;
}>) {
  let created = 0;
  for (const item of items) {
    try {
      await prisma.bomItem.upsert({
        where: {
          siteId_productSku_materialSku: {
            siteId,
            productSku: item.productSku,
            materialSku: item.materialSku,
          },
        },
        update: {
          qtyPerUnit: item.qtyPerUnit,
          unit: item.unit ?? '개',
          leadTimeDays: item.leadTimeDays ?? 0,
          notes: item.notes ?? null,
        },
        create: {
          siteId,
          productSku: item.productSku,
          materialSku: item.materialSku,
          qtyPerUnit: item.qtyPerUnit,
          unit: item.unit ?? '개',
          leadTimeDays: item.leadTimeDays ?? 0,
          notes: item.notes ?? null,
        },
      });
      created++;
    } catch {
      // skip
    }
  }
  return { created };
}

// ── 재고 더블체크 ───────────────────────────────

export async function getStockChecks(
  siteId?: string,
  assignedTo?: string,
  status?: string,
  page: number = 1,
  limit: number = 20,
) {
  const where: Record<string, unknown> = {};
  if (assignedTo) where.assignedTo = assignedTo;
  if (status) where.status = status;
  if (siteId) {
    where.salesOrder = { siteId };
  }

  const [total, checks] = await Promise.all([
    prisma.stockCheckRequest.count({ where }),
    prisma.stockCheckRequest.findMany({
      where,
      include: {
        mrpResult: { select: { materialSku: true, materialName: true, currentStock: true, requiredQty: true, shortageQty: true } },
        salesOrder: { select: { orderNo: true, customerName: true, deliveryDeadline: true } },
      },
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { checks, total, page, limit };
}

export async function confirmStockCheck(id: string, actualQty: number, notes?: string) {
  const check = await prisma.stockCheckRequest.findUnique({
    where: { id },
    include: { mrpResult: true, salesOrder: { select: { siteId: true } } },
  });
  if (!check) throw new Error('체크 요청을 찾을 수 없습니다');

  const discrepancy = actualQty - check.mrpResult.currentStock;
  const hasDiscrepancy = Math.abs(discrepancy) > 0.01;

  const updated = await prisma.stockCheckRequest.update({
    where: { id },
    data: {
      actualQty,
      discrepancy,
      status: hasDiscrepancy ? 'DISCREPANCY_FOUND' : 'CONFIRMED',
      respondedAt: new Date(),
      notes: notes ?? null,
    },
  });

  // MRP 결과 상태 업데이트
  if (hasDiscrepancy) {
    // 실물 기준으로 부족량 재계산
    const newShortage = Math.max(0, check.mrpResult.requiredQty - actualQty);
    await prisma.mrpResult.update({
      where: { id: check.mrpResultId },
      data: {
        currentStock: actualQty,
        shortageQty: newShortage,
        status: newShortage > 0 ? 'CHECKED_SHORTAGE' : 'CHECKED_OK',
        checkedAt: new Date(),
      },
    });

    // 불일치 알림
    try {
      await prisma.alert.create({
        data: {
          siteId: check.salesOrder?.siteId ?? 'demo',
          metricType: 'stock_discrepancy',
          severity: 'critical',
          title: `재고 불일치 발견 — ${check.mrpResult.materialSku}`,
          message: `시스템 재고: ${check.mrpResult.currentStock}, 실물: ${actualQty}, 차이: ${discrepancy}`,
          metadata: {
            stockCheckId: id,
            materialSku: check.mrpResult.materialSku,
            systemQty: check.mrpResult.currentStock,
            actualQty,
            discrepancy,
          } as Record<string, unknown>,
        },
      });
    } catch { /* ignore */ }
  } else {
    await prisma.mrpResult.update({
      where: { id: check.mrpResultId },
      data: {
        status: 'CHECKED_OK',
        checkedAt: new Date(),
      },
    });
  }

  return updated;
}

export async function reportDiscrepancy(id: string, actualQty: number, notes: string) {
  return confirmStockCheck(id, actualQty, notes);
}
