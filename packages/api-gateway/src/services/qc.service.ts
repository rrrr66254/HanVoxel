import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── 공급업체 ────────────────────────────────────────────

interface UpsertSupplierInput {
  companyId: string;
  name: string;
  code: string;
  contact?: string;
  email?: string;
}

export async function upsertSupplier(data: UpsertSupplierInput) {
  return prisma.supplier.upsert({
    where: { companyId_code: { companyId: data.companyId, code: data.code } },
    create: data,
    update: { name: data.name, contact: data.contact, email: data.email },
  });
}

export async function getSuppliers(companyId: string) {
  return prisma.supplier.findMany({
    where: { companyId, isActive: true },
    orderBy: { qualityScore: 'desc' },
  });
}

export async function updateSupplierScore(id: string, qualityScore: number, grade: string) {
  return prisma.supplier.update({
    where: { id },
    data: { qualityScore, grade },
  });
}

// ── 검수 기록 ───────────────────────────────────────────

interface CreateInspectionInput {
  siteId: string;
  supplierId?: string;
  type: string;  // INBOUND | OUTBOUND
  totalQty: number;
  passedQty: number;
  defectQty: number;
  referenceNo?: string;
  inspectorName?: string;
  note?: string;
  metadata?: Prisma.InputJsonValue;
  defectItems?: CreateDefectItemInput[];
}

interface CreateDefectItemInput {
  defectType: string;
  qty: number;
  itemName?: string;
  itemSku?: string;
  quarantineLocationId?: string;
  disposition?: string;
  evidenceUrl?: string;
  note?: string;
}

export async function createInspection(data: CreateInspectionInput) {
  const defectRate = data.totalQty > 0 ? Math.round((data.defectQty / data.totalQty) * 10000) / 100 : 0;

  return prisma.qcInspection.create({
    data: {
      siteId: data.siteId,
      supplierId: data.supplierId,
      type: data.type,
      status: 'COMPLETED',
      totalQty: data.totalQty,
      passedQty: data.passedQty,
      defectQty: data.defectQty,
      defectRate,
      referenceNo: data.referenceNo,
      inspectorName: data.inspectorName,
      inspectedAt: new Date(),
      note: data.note,
      metadata: data.metadata ?? Prisma.DbNull,
      items: data.defectItems && data.defectItems.length > 0
        ? { create: data.defectItems }
        : undefined,
    },
    include: { items: true, supplier: true },
  });
}

export async function getInspections(
  siteId: string,
  options?: { type?: string; supplierId?: string; from?: string; to?: string; limit?: number; offset?: number }
) {
  const where: Prisma.QcInspectionWhereInput = { siteId };
  if (options?.type) where.type = options.type;
  if (options?.supplierId) where.supplierId = options.supplierId;
  if (options?.from || options?.to) {
    where.inspectedAt = {};
    if (options.from) where.inspectedAt.gte = new Date(options.from);
    if (options.to) where.inspectedAt.lte = new Date(options.to);
  }

  const [inspections, total] = await Promise.all([
    prisma.qcInspection.findMany({
      where,
      include: { items: true, supplier: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.qcInspection.count({ where }),
  ]);
  return { inspections, total };
}

export async function getInspectionById(id: string) {
  return prisma.qcInspection.findUnique({
    where: { id },
    include: { items: true, supplier: true },
  });
}

// ── 공급업체별 품질 스코어카드 ──────────────────────────

export async function getSupplierScorecard(supplierId: string, months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const inspections = await prisma.qcInspection.findMany({
    where: {
      supplierId,
      inspectedAt: { gte: since },
      status: 'COMPLETED',
    },
    orderBy: { inspectedAt: 'asc' },
  });

  if (inspections.length === 0) {
    return { supplierId, months, inspections: [], monthlyData: [], overallDefectRate: 0, grade: 'B', qualityScore: 80 };
  }

  // 월별 집계
  const monthlyMap = new Map<string, { total: number; defect: number; count: number }>();
  for (const insp of inspections) {
    const key = insp.inspectedAt
      ? `${insp.inspectedAt.getFullYear()}-${String(insp.inspectedAt.getMonth() + 1).padStart(2, '0')}`
      : 'unknown';
    const entry = monthlyMap.get(key) ?? { total: 0, defect: 0, count: 0 };
    entry.total += insp.totalQty;
    entry.defect += insp.defectQty;
    entry.count += 1;
    monthlyMap.set(key, entry);
  }

  const monthlyData = Array.from(monthlyMap.entries()).map(([month, d]) => ({
    month,
    totalQty: d.total,
    defectQty: d.defect,
    defectRate: d.total > 0 ? Math.round((d.defect / d.total) * 10000) / 100 : 0,
    inspectionCount: d.count,
  }));

  const totalQty = inspections.reduce((s, i) => s + i.totalQty, 0);
  const totalDefect = inspections.reduce((s, i) => s + i.defectQty, 0);
  const overallDefectRate = totalQty > 0 ? Math.round((totalDefect / totalQty) * 10000) / 100 : 0;

  // 등급 산정: A (<=0.5%), B (<=1.5%), C (<=3%), D (>3%)
  let grade: string;
  let qualityScore: number;
  if (overallDefectRate <= 0.5) {
    grade = 'A';
    qualityScore = 95 - overallDefectRate * 10;
  } else if (overallDefectRate <= 1.5) {
    grade = 'B';
    qualityScore = 85 - (overallDefectRate - 0.5) * 10;
  } else if (overallDefectRate <= 3.0) {
    grade = 'C';
    qualityScore = 70 - (overallDefectRate - 1.5) * 10;
  } else {
    grade = 'D';
    qualityScore = Math.max(0, 55 - (overallDefectRate - 3.0) * 5);
  }
  qualityScore = Math.round(qualityScore * 10) / 10;

  return { supplierId, months, inspections, monthlyData, overallDefectRate, grade, qualityScore };
}

// ── 격리 재고 조회 ──────────────────────────────────────

export async function getQuarantineItems(siteId: string) {
  return prisma.qcDefectItem.findMany({
    where: {
      inspection: { siteId },
      quarantineLocationId: { not: null },
      disposition: 'QUARANTINED',
    },
    include: { inspection: { include: { supplier: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ── QC 통계 (대시보드용) ────────────────────────────────

export async function getQcStats(siteId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const inspections = await prisma.qcInspection.findMany({
    where: { siteId, inspectedAt: { gte: since }, status: 'COMPLETED' },
    include: { items: true },
  });

  const totalInspections = inspections.length;
  const totalQty = inspections.reduce((s, i) => s + i.totalQty, 0);
  const totalDefect = inspections.reduce((s, i) => s + i.defectQty, 0);
  const avgDefectRate = totalQty > 0 ? Math.round((totalDefect / totalQty) * 10000) / 100 : 0;

  const inbound = inspections.filter((i) => i.type === 'INBOUND');
  const outbound = inspections.filter((i) => i.type === 'OUTBOUND');
  const inboundDefectRate = inbound.reduce((s, i) => s + i.totalQty, 0) > 0
    ? Math.round((inbound.reduce((s, i) => s + i.defectQty, 0) / inbound.reduce((s, i) => s + i.totalQty, 0)) * 10000) / 100
    : 0;
  const outboundDefectRate = outbound.reduce((s, i) => s + i.totalQty, 0) > 0
    ? Math.round((outbound.reduce((s, i) => s + i.defectQty, 0) / outbound.reduce((s, i) => s + i.totalQty, 0)) * 10000) / 100
    : 0;

  // 불량 유형 집계
  const defectTypeMap = new Map<string, number>();
  for (const insp of inspections) {
    for (const item of insp.items) {
      defectTypeMap.set(item.defectType, (defectTypeMap.get(item.defectType) ?? 0) + item.qty);
    }
  }
  const defectsByType = Array.from(defectTypeMap.entries())
    .map(([type, qty]) => ({ type, qty }))
    .sort((a, b) => b.qty - a.qty);

  return {
    days,
    totalInspections,
    totalQty,
    totalDefect,
    avgDefectRate,
    inboundDefectRate,
    outboundDefectRate,
    defectsByType,
    quarantineCount: inspections
      .flatMap((i) => i.items)
      .filter((item) => item.disposition === 'QUARANTINED').length,
  };
}
