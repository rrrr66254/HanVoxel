/**
 * 원가 관리 서비스 — 원가 항목, 제품 원가, 생산 실적 원가, 수주 수익성
 */
import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── 타입 정의 ────────────────────────────────────────────

/** SalesOrder.items JSON 필드의 개별 항목 */
interface SalesOrderItem {
  product_sku: string;
  qty: number;
  unit_price: number;
}

// ── 원가 항목 CRUD ───────────────────────────────────────

/** 원가 항목 목록 조회 (사이트별, 유형별, 검색) */
export async function getCostItems(
  siteId: string,
  options?: { type?: string; search?: string; limit?: number },
) {
  const where: Prisma.CostItemWhereInput = { siteId };

  if (options?.type) {
    where.type = options.type;
  }

  if (options?.search) {
    where.name = { contains: options.search, mode: 'insensitive' };
  }

  const items = await prisma.costItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
  });

  const total = await prisma.costItem.count({ where });

  return { items, total };
}

/** 원가 항목 생성 */
export async function createCostItem(data: {
  siteId: string;
  name: string;
  type: string;
  unit?: string;
  unitCost: number;
}) {
  return prisma.costItem.create({
    data: {
      siteId: data.siteId,
      name: data.name,
      type: data.type,
      unit: data.unit ?? '개',
      unitCost: data.unitCost,
    },
  });
}

/** 원가 항목 수정 */
export async function updateCostItem(
  id: string,
  data: { name?: string; type?: string; unit?: string; unitCost?: number; isActive?: boolean },
) {
  return prisma.costItem.update({
    where: { id },
    data,
  });
}

// ── 제품별 원가 구성 조회 ────────────────────────────────

/** 제품 SKU 기준 원가 내역 (ProductCost + CostItem 조인) */
export async function getProductCost(siteId: string, productSku: string) {
  // 표준 원가 구성 조회
  const productCosts = await prisma.productCost.findMany({
    where: { siteId, productSku },
    include: { costItem: true },
    orderBy: { costItem: { type: 'asc' } },
  });

  // 유형별 소계 계산
  const breakdown: Record<string, number> = {};
  let totalStandardCost = 0;

  for (const pc of productCosts) {
    const cost = pc.qtyPerUnit * pc.costItem.unitCost;
    const costType = pc.costItem.type;
    breakdown[costType] = (breakdown[costType] ?? 0) + cost;
    totalStandardCost += cost;
  }

  return {
    productSku,
    siteId,
    items: productCosts.map((pc) => ({
      id: pc.id,
      costItemId: pc.costItemId,
      costItemName: pc.costItem.name,
      costType: pc.costItem.type,
      unit: pc.costItem.unit,
      unitCost: pc.costItem.unitCost,
      qtyPerUnit: pc.qtyPerUnit,
      calculatedCost: pc.qtyPerUnit * pc.costItem.unitCost,
    })),
    breakdown,
    totalStandardCost,
  };
}

// ── 생산 실적 원가 계산 ──────────────────────────────────

/** 생산 지시서(productionOrderId) 기반 실제 원가 계산 및 저장 */
export async function calculateProductionCost(productionOrderId: string) {
  // 생산 지시서(SalesOrder) 조회
  const order = await prisma.salesOrder.findUnique({
    where: { id: productionOrderId },
  });

  if (!order) {
    throw new Error('생산 지시서를 찾을 수 없습니다');
  }

  const items = order.items as SalesOrderItem[];
  if (!items || items.length === 0) {
    throw new Error('생산 품목이 없습니다');
  }

  const results = [];

  for (const item of items) {
    const productSku = item.product_sku;
    const producedQty = item.qty;

    // 1) 자재비: BOM 항목 × SkuCost 단가
    const bomItems = await prisma.bomItem.findMany({
      where: { siteId: order.siteId, productSku },
    });

    let materialCost = 0;
    for (const bom of bomItems) {
      // SkuCost에서 자재 단가 조회
      const skuCost = await prisma.skuCost.findUnique({
        where: { siteId_sku: { siteId: order.siteId, sku: bom.materialSku } },
      });
      const unitPrice = skuCost?.avgUnitCost ?? 0;
      materialCost += bom.qtyPerUnit * unitPrice * producedQty;
    }

    // 2) 인건비: CostItem LABOR 항목에서 시급 × 생산수량 기준
    const laborItems = await prisma.costItem.findMany({
      where: { siteId: order.siteId, type: 'LABOR', isActive: true },
    });
    let laborCost = 0;
    for (const li of laborItems) {
      // 제품 원가 테이블에서 해당 인건비 항목의 소요량 조회
      const pc = await prisma.productCost.findUnique({
        where: {
          siteId_productSku_costItemId: {
            siteId: order.siteId,
            productSku,
            costItemId: li.id,
          },
        },
      });
      const hoursPerUnit = pc?.qtyPerUnit ?? 1;
      laborCost += li.unitCost * hoursPerUnit * producedQty;
    }

    // 3) 제조간접비: CostItem OVERHEAD 항목 합산 / 월 생산량 기준
    const overheadItems = await prisma.costItem.findMany({
      where: { siteId: order.siteId, type: 'OVERHEAD', isActive: true },
    });
    let overheadCost = 0;
    for (const oh of overheadItems) {
      const pc = await prisma.productCost.findUnique({
        where: {
          siteId_productSku_costItemId: {
            siteId: order.siteId,
            productSku,
            costItemId: oh.id,
          },
        },
      });
      const allocRate = pc?.qtyPerUnit ?? 1;
      overheadCost += oh.unitCost * allocRate * producedQty;
    }

    const totalCost = materialCost + laborCost + overheadCost;
    const costPerUnit = producedQty > 0 ? Math.round(totalCost / producedQty) : 0;

    // upsert: 이미 계산된 레코드가 있으면 업데이트
    const actual = await prisma.productionCostActual.upsert({
      where: { id: productionOrderId },
      // 기존 레코드가 없으면 생성
      create: {
        siteId: order.siteId,
        productionOrderId,
        productSku,
        producedQty,
        materialCost,
        laborCost,
        overheadCost,
        totalCost,
        costPerUnit,
      },
      update: {
        producedQty,
        materialCost,
        laborCost,
        overheadCost,
        totalCost,
        costPerUnit,
        calculatedAt: new Date(),
      },
    });

    results.push(actual);
  }

  return results;
}

// ── 수주 수익성 ──────────────────────────────────────────

/** 전체 수주 수익성 목록 조회 */
export async function getProfitabilityList(siteId: string) {
  const list = await prisma.salesOrderProfitability.findMany({
    where: { siteId },
    include: {
      salesOrder: {
        select: {
          orderNo: true,
          customerName: true,
          status: true,
          orderDate: true,
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return list.map((p) => ({
    id: p.id,
    salesOrderId: p.salesOrderId,
    orderNo: p.salesOrder.orderNo,
    customerName: p.salesOrder.customerName,
    status: p.salesOrder.status,
    orderDate: p.salesOrder.orderDate,
    totalRevenue: p.totalRevenue,
    totalCost: p.totalCost,
    grossProfit: p.grossProfit,
    grossMargin: p.grossMargin,
    updatedAt: p.updatedAt,
  }));
}

/** 단일 수주 수익성 상세 조회 */
export async function getProfitability(salesOrderId: string) {
  const profitability = await prisma.salesOrderProfitability.findUnique({
    where: { salesOrderId },
    include: {
      salesOrder: {
        select: {
          orderNo: true,
          customerName: true,
          status: true,
          orderDate: true,
          deliveryDeadline: true,
          items: true,
        },
      },
    },
  });

  if (!profitability) return null;

  // 품목별 수익성 세부 내역 계산
  const items = profitability.salesOrder.items as SalesOrderItem[];
  const itemDetails = [];

  for (const item of items) {
    // 해당 SKU의 표준 원가 조회
    const productCosts = await prisma.productCost.findMany({
      where: { siteId: profitability.siteId, productSku: item.product_sku },
      include: { costItem: true },
    });

    let unitCost = 0;
    for (const pc of productCosts) {
      unitCost += pc.qtyPerUnit * pc.costItem.unitCost;
    }

    const revenue = item.qty * item.unit_price;
    const cost = item.qty * unitCost;

    itemDetails.push({
      productSku: item.product_sku,
      qty: item.qty,
      unitPrice: item.unit_price,
      unitCost,
      revenue,
      cost,
      profit: revenue - cost,
      margin: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 10000) / 100 : 0,
    });
  }

  return {
    ...profitability,
    itemDetails,
  };
}

/** 수주 수익성 재계산 */
export async function recalculateProfitability(salesOrderId: string) {
  // 수주 정보 조회
  const order = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
  });

  if (!order) {
    throw new Error('수주를 찾을 수 없습니다');
  }

  const items = order.items as SalesOrderItem[];
  let totalRevenue = 0;
  let totalCost = 0;

  for (const item of items) {
    // 매출액 = 수량 × 단가
    totalRevenue += item.qty * item.unit_price;

    // 원가 = 수량 × 제품 표준원가
    const productCosts = await prisma.productCost.findMany({
      where: { siteId: order.siteId, productSku: item.product_sku },
      include: { costItem: true },
    });

    let unitCost = 0;
    for (const pc of productCosts) {
      unitCost += pc.qtyPerUnit * pc.costItem.unitCost;
    }
    totalCost += item.qty * unitCost;
  }

  const grossProfit = totalRevenue - totalCost;
  const grossMargin = totalRevenue > 0
    ? Math.round((grossProfit / totalRevenue) * 10000) / 100
    : 0;

  // upsert: 이미 존재하면 업데이트, 없으면 생성
  const profitability = await prisma.salesOrderProfitability.upsert({
    where: { salesOrderId },
    create: {
      siteId: order.siteId,
      salesOrderId,
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
    },
    update: {
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
    },
  });

  return profitability;
}
