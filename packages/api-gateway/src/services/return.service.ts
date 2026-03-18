/**
 * 반품 & 불량 관리 서비스
 *
 * - 반품 주문 생성/조회/검수/처리
 * - 처분(Disposal) 관리
 * - 공급업체 클레임 생성
 * - 반품 분석 통계
 */
import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── 타입 ──────────────────────────────────────────

interface ReturnItemInput {
  productSku: string;
  qty: number;
  unitPrice?: number;
  defectPhotos?: string[];
  defectDescription?: string;
}

interface CreateReturnInput {
  siteId: string;
  type: string;
  partnerId: string;
  originalOrderId?: string;
  reasonType: string;
  reasonDetail?: string;
  items: ReturnItemInput[];
}

interface InspectReturnInput {
  items: Array<{ itemId: string; approvedQty: number }>;
}

interface CreateDisposalInput {
  returnItemId: string;
  disposalType: string;
  qty: number;
  reworkProductionOrderId?: string;
  cost?: number;
  processedBy?: string;
  notes?: string;
}

interface CreateVendorClaimInput {
  vendorId: string;
  claimAmount: number;
}

// ── 반품 번호 생성 ────────────────────────────────

export async function generateReturnNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `RET-${dateStr}-`;

  // 오늘 생성된 마지막 번호 조회
  const last = await prisma.returnOrder.findFirst({
    where: { returnNo: { startsWith: prefix } },
    orderBy: { returnNo: 'desc' },
    select: { returnNo: true },
  });

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.returnNo.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── 클레임 번호 생성 ──────────────────────────────

async function generateClaimNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `CLM-${dateStr}-`;

  const last = await prisma.vendorClaim.findFirst({
    where: { claimNo: { startsWith: prefix } },
    orderBy: { claimNo: 'desc' },
    select: { claimNo: true },
  });

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.claimNo.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── 반품 주문 생성 ────────────────────────────────

export async function createReturn(input: CreateReturnInput) {
  const returnNo = await generateReturnNo();
  const totalQty = input.items.reduce((sum, item) => sum + item.qty, 0);

  return prisma.returnOrder.create({
    data: {
      siteId: input.siteId,
      returnNo,
      type: input.type,
      partnerId: input.partnerId,
      originalOrderId: input.originalOrderId ?? null,
      reasonType: input.reasonType,
      reasonDetail: input.reasonDetail ?? null,
      totalQty,
      status: 'RECEIVED',
      items: {
        create: input.items.map((item) => ({
          productSku: item.productSku,
          qty: item.qty,
          unitPrice: item.unitPrice ?? 0,
          defectPhotos: item.defectPhotos ?? [],
          defectDescription: item.defectDescription ?? null,
        })),
      },
    },
    include: { items: true, partner: true },
  });
}

// ── 반품 주문 목록 조회 ────────────────────────────

export async function listReturns(
  opts: {
    siteId?: string;
    type?: string;
    status?: string;
    partnerId?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { siteId, type, status, partnerId, page = 1, limit = 20 } = opts;

  const where: Record<string, unknown> = {};
  if (siteId) where.siteId = siteId;
  if (type) where.type = type;
  if (status) where.status = status;
  if (partnerId) where.partnerId = partnerId;

  const [total, returns] = await Promise.all([
    prisma.returnOrder.count({ where }),
    prisma.returnOrder.findMany({
      where,
      include: { items: true, partner: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { returns, total, page, limit };
}

// ── 반품 주문 상세 조회 ───────────────────────────

export async function getReturnById(id: string) {
  return prisma.returnOrder.findUnique({
    where: { id },
    include: {
      items: { include: { disposals: true } },
      disposals: true,
      vendorClaims: true,
      partner: { select: { id: true, name: true, code: true, type: true } },
    },
  });
}

// ── 반품 검수 (승인 수량 설정) ────────────────────

export async function inspectReturn(id: string, data: InspectReturnInput) {
  // 각 아이템별 승인 수량 업데이트
  for (const item of data.items) {
    await prisma.returnItem.update({
      where: { id: item.itemId },
      data: { approvedQty: item.approvedQty },
    });
  }

  // 총 승인 수량 계산
  const updatedItems = await prisma.returnItem.findMany({
    where: { returnOrderId: id },
  });
  const totalApproved = updatedItems.reduce((sum, item) => sum + item.approvedQty, 0);

  // 반품 주문 상태 변경 + 승인 수량 갱신
  return prisma.returnOrder.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedQty: totalApproved,
    },
    include: { items: true, partner: true },
  });
}

// ── 처분(Disposal) 생성 ──────────────────────────

export async function createDisposal(returnOrderId: string, data: CreateDisposalInput) {
  const disposal = await prisma.returnDisposal.create({
    data: {
      returnOrderId,
      returnItemId: data.returnItemId,
      disposalType: data.disposalType,
      qty: data.qty,
      reworkProductionOrderId: data.reworkProductionOrderId ?? null,
      cost: data.cost ?? 0,
      processedBy: data.processedBy ?? null,
      processedAt: new Date(),
      notes: data.notes ?? null,
    },
  });

  // 모든 아이템에 대한 처분이 완료되었는지 확인
  const returnOrder = await prisma.returnOrder.findUnique({
    where: { id: returnOrderId },
    include: { items: true, disposals: true },
  });

  if (returnOrder) {
    const totalDisposedQty = returnOrder.disposals.reduce((sum, d) => sum + d.qty, 0);
    if (totalDisposedQty >= returnOrder.approvedQty) {
      // 모든 승인 수량 처분 완료 → 상태 변경
      await prisma.returnOrder.update({
        where: { id: returnOrderId },
        data: { status: 'COMPLETED' },
      });
    } else {
      // 일부 처분 진행 중
      await prisma.returnOrder.update({
        where: { id: returnOrderId },
        data: { status: 'PROCESSING' },
      });
    }
  }

  return disposal;
}

// ── 공급업체 클레임 생성 ──────────────────────────

export async function createVendorClaim(returnOrderId: string, data: CreateVendorClaimInput) {
  const claimNo = await generateClaimNo();

  return prisma.vendorClaim.create({
    data: {
      returnOrderId,
      vendorId: data.vendorId,
      claimNo,
      claimAmount: data.claimAmount,
      status: 'DRAFT',
    },
    include: { vendor: { select: { id: true, name: true, code: true } } },
  });
}

// ── 반품 분석 통계 ────────────────────────────────

export async function getReturnAnalytics(
  siteId: string,
  from: string,
  to: string,
) {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const where: Prisma.ReturnOrderWhereInput = {
    siteId,
    createdAt: { gte: fromDate, lte: toDate },
  };

  // 전체 통계
  const totalReturns = await prisma.returnOrder.count({ where });
  const totalAgg = await prisma.returnOrder.aggregate({
    where,
    _sum: { totalQty: true, approvedQty: true },
  });

  // 월별 통계
  const allReturns = await prisma.returnOrder.findMany({
    where,
    select: { createdAt: true, totalQty: true, approvedQty: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  const monthlyMap = new Map<string, { count: number; totalQty: number; approvedQty: number }>();
  for (const r of allReturns) {
    const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(key) ?? { count: 0, totalQty: 0, approvedQty: 0 };
    existing.count += 1;
    existing.totalQty += r.totalQty;
    existing.approvedQty += r.approvedQty;
    monthlyMap.set(key, existing);
  }
  const monthlyStats = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));

  // 사유별 통계
  const reasonReturns = await prisma.returnOrder.findMany({
    where,
    select: { reasonType: true, totalQty: true },
  });

  const reasonMap = new Map<string, { count: number; totalQty: number }>();
  for (const r of reasonReturns) {
    const existing = reasonMap.get(r.reasonType) ?? { count: 0, totalQty: 0 };
    existing.count += 1;
    existing.totalQty += r.totalQty;
    reasonMap.set(r.reasonType, existing);
  }
  const reasonBreakdown = Array.from(reasonMap.entries()).map(([reason, data]) => ({
    reason,
    ...data,
  }));

  // 거래처별 반품 순위
  const partnerReturns = await prisma.returnOrder.findMany({
    where,
    select: { partnerId: true, totalQty: true, partner: { select: { id: true, name: true, code: true } } },
  });

  const partnerMap = new Map<string, { partnerId: string; partnerName: string; partnerCode: string; count: number; totalQty: number }>();
  for (const r of partnerReturns) {
    const existing = partnerMap.get(r.partnerId) ?? {
      partnerId: r.partnerId,
      partnerName: r.partner.name,
      partnerCode: r.partner.code,
      count: 0,
      totalQty: 0,
    };
    existing.count += 1;
    existing.totalQty += r.totalQty;
    partnerMap.set(r.partnerId, existing);
  }
  const partnerRankings = Array.from(partnerMap.values())
    .sort((a, b) => b.totalQty - a.totalQty);

  return {
    summary: {
      totalReturns,
      totalQty: totalAgg._sum.totalQty ?? 0,
      approvedQty: totalAgg._sum.approvedQty ?? 0,
    },
    monthlyStats,
    reasonBreakdown,
    partnerRankings,
  };
}
