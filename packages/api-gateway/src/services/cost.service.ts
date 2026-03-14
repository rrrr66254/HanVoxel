/**
 * 재고 원가 계산 서비스 — FIFO / 이동평균
 */
import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── FIFO 로트 타입 ─────────────────────────────────────

interface FifoLayer {
  qty: number;
  unitCost: number;
}

// ── 원가 조회 ──────────────────────────────────────────

export async function getSkuCosts(siteId: string, options?: { search?: string; limit?: number }) {
  const where: Prisma.SkuCostWhereInput = { siteId };
  if (options?.search) {
    where.OR = [
      { sku: { contains: options.search, mode: 'insensitive' } },
      { itemName: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  return prisma.skuCost.findMany({
    where,
    orderBy: { sku: 'asc' },
    take: options?.limit ?? 100,
  });
}

export async function getSkuCostBySku(siteId: string, sku: string) {
  return prisma.skuCost.findUnique({
    where: { siteId_sku: { siteId, sku } },
  });
}

// ── 매입 시 원가 업데이트 ──────────────────────────────

export async function updateSkuCostOnPurchase(
  siteId: string,
  sku: string,
  itemName: string,
  qty: number,
  unitPrice: number,
) {
  const existing = await prisma.skuCost.findUnique({
    where: { siteId_sku: { siteId, sku } },
  });

  if (!existing) {
    // 신규 SKU
    return prisma.skuCost.create({
      data: {
        siteId,
        sku,
        itemName,
        costMethod: 'FIFO',
        currentQty: qty,
        fifoLayers: [{ qty, unitCost: unitPrice }],
        avgUnitCost: unitPrice,
        lastPurchasePrice: unitPrice,
      },
    });
  }

  const prevQty = existing.currentQty;
  const newQty = prevQty + qty;

  // FIFO: 새 로트 추가
  const layers = (existing.fifoLayers as FifoLayer[] | null) ?? [];
  layers.push({ qty, unitCost: unitPrice });

  // 이동평균: (기존총원가 + 신규총원가) / 신규총수량
  const prevTotalCost = existing.avgUnitCost * prevQty;
  const newTotalCost = prevTotalCost + unitPrice * qty;
  const newAvgCost = newQty > 0 ? Math.round(newTotalCost / newQty) : 0;

  return prisma.skuCost.update({
    where: { siteId_sku: { siteId, sku } },
    data: {
      itemName,
      currentQty: newQty,
      fifoLayers: layers as unknown as Prisma.InputJsonValue,
      avgUnitCost: newAvgCost,
      lastPurchasePrice: unitPrice,
    },
  });
}

// ── 매출 시 원가 차감 ──────────────────────────────────

export async function updateSkuCostOnSales(siteId: string, sku: string, qty: number) {
  const existing = await prisma.skuCost.findUnique({
    where: { siteId_sku: { siteId, sku } },
  });
  if (!existing) return;

  let remaining = qty;
  const layers = (existing.fifoLayers as FifoLayer[] | null) ?? [];

  // FIFO: 오래된 로트부터 차감
  while (remaining > 0 && layers.length > 0) {
    const layer = layers[0];
    if (layer.qty <= remaining) {
      remaining -= layer.qty;
      layers.shift();
    } else {
      layer.qty -= remaining;
      remaining = 0;
    }
  }

  const newQty = Math.max(0, existing.currentQty - qty);

  return prisma.skuCost.update({
    where: { siteId_sku: { siteId, sku } },
    data: {
      currentQty: newQty,
      fifoLayers: layers as unknown as Prisma.InputJsonValue,
    },
  });
}

// ── FIFO 원가 계산 ─────────────────────────────────────

export function calculateFifoCost(layers: FifoLayer[]): number {
  if (layers.length === 0) return 0;
  const totalQty = layers.reduce((s, l) => s + l.qty, 0);
  const totalCost = layers.reduce((s, l) => s + l.qty * l.unitCost, 0);
  return totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
}

// ── SKU별 마진율 조회 ──────────────────────────────────

export async function getSkuMargins(siteId: string) {
  const costs = await prisma.skuCost.findMany({
    where: { siteId, sellingPrice: { gt: 0 } },
    orderBy: { sku: 'asc' },
  });

  return costs.map((c) => {
    const layers = (c.fifoLayers as FifoLayer[] | null) ?? [];
    const fifoCost = calculateFifoCost(layers);
    const avgCost = Math.round(c.avgUnitCost);
    const sellingPrice = c.sellingPrice;

    const fifoMargin = sellingPrice > 0
      ? Math.round(((sellingPrice - fifoCost) / sellingPrice) * 10000) / 100
      : 0;
    const avgMargin = sellingPrice > 0
      ? Math.round(((sellingPrice - avgCost) / sellingPrice) * 10000) / 100
      : 0;

    return {
      sku: c.sku,
      itemName: c.itemName,
      currentQty: c.currentQty,
      fifoCost,
      avgCost,
      sellingPrice,
      fifoMarginPct: fifoMargin,
      avgMarginPct: avgMargin,
      fifoProfit: sellingPrice - fifoCost,
      avgProfit: sellingPrice - avgCost,
    };
  });
}

// ── 판매 단가 설정 ─────────────────────────────────────

export async function updateSellingPrice(siteId: string, sku: string, sellingPrice: number) {
  return prisma.skuCost.update({
    where: { siteId_sku: { siteId, sku } },
    data: { sellingPrice },
  });
}
