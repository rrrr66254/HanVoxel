import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── SLA 기준 설정 CRUD ──────────────────────────────────

interface UpsertSlaTargetInput {
  companyId: string;
  siteId: string;
  name: string;
  deliveryOnTimeTarget?: number;
  misshipmentRateLimit?: number;
  pickingAccuracyTarget?: number;
  avgProcessingTimeLimit?: number;
  escalationEnabled?: boolean;
  escalationEmails?: Prisma.InputJsonValue;
  escalationThreshold?: number;
}

export async function upsertSlaTarget(data: UpsertSlaTargetInput) {
  return prisma.slaTarget.upsert({
    where: { companyId_siteId: { companyId: data.companyId, siteId: data.siteId } },
    create: {
      companyId: data.companyId,
      siteId: data.siteId,
      name: data.name,
      deliveryOnTimeTarget: data.deliveryOnTimeTarget ?? 98.0,
      misshipmentRateLimit: data.misshipmentRateLimit ?? 0.5,
      pickingAccuracyTarget: data.pickingAccuracyTarget ?? 99.5,
      avgProcessingTimeLimit: data.avgProcessingTimeLimit ?? 120,
      escalationEnabled: data.escalationEnabled ?? true,
      escalationEmails: data.escalationEmails ?? Prisma.DbNull,
      escalationThreshold: data.escalationThreshold ?? 3,
    },
    update: {
      name: data.name,
      deliveryOnTimeTarget: data.deliveryOnTimeTarget,
      misshipmentRateLimit: data.misshipmentRateLimit,
      pickingAccuracyTarget: data.pickingAccuracyTarget,
      avgProcessingTimeLimit: data.avgProcessingTimeLimit,
      escalationEnabled: data.escalationEnabled,
      escalationEmails: data.escalationEmails,
      escalationThreshold: data.escalationThreshold,
    },
  });
}

export async function getSlaTarget(companyId: string, siteId: string) {
  return prisma.slaTarget.findUnique({
    where: { companyId_siteId: { companyId, siteId } },
  });
}

export async function getSlaTargetsByCompany(companyId: string) {
  return prisma.slaTarget.findMany({
    where: { companyId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

// ── SLA KPI 스냅샷 ──────────────────────────────────────

interface RecordSlaMetricInput {
  slaTargetId: string;
  recordDate: string | Date;
  deliveryOnTimeRate: number;
  misshipmentRate: number;
  pickingAccuracy: number;
  avgProcessingTime: number;
  totalOrders?: number;
  onTimeOrders?: number;
  misshipmentCount?: number;
  totalPicks?: number;
  accuratePicks?: number;
  metadata?: Prisma.InputJsonValue;
}

export async function recordSlaMetric(data: RecordSlaMetricInput) {
  const date = new Date(data.recordDate);
  return prisma.slaMetric.upsert({
    where: {
      slaTargetId_recordDate: {
        slaTargetId: data.slaTargetId,
        recordDate: date,
      },
    },
    create: {
      slaTargetId: data.slaTargetId,
      recordDate: date,
      deliveryOnTimeRate: data.deliveryOnTimeRate,
      misshipmentRate: data.misshipmentRate,
      pickingAccuracy: data.pickingAccuracy,
      avgProcessingTime: data.avgProcessingTime,
      totalOrders: data.totalOrders ?? 0,
      onTimeOrders: data.onTimeOrders ?? 0,
      misshipmentCount: data.misshipmentCount ?? 0,
      totalPicks: data.totalPicks ?? 0,
      accuratePicks: data.accuratePicks ?? 0,
      metadata: data.metadata ?? Prisma.DbNull,
    },
    update: {
      deliveryOnTimeRate: data.deliveryOnTimeRate,
      misshipmentRate: data.misshipmentRate,
      pickingAccuracy: data.pickingAccuracy,
      avgProcessingTime: data.avgProcessingTime,
      totalOrders: data.totalOrders,
      onTimeOrders: data.onTimeOrders,
      misshipmentCount: data.misshipmentCount,
      totalPicks: data.totalPicks,
      accuratePicks: data.accuratePicks,
      metadata: data.metadata,
    },
  });
}

export async function getSlaMetrics(
  slaTargetId: string,
  options?: { from?: string; to?: string; limit?: number }
) {
  const where: Prisma.SlaMetricWhereInput = { slaTargetId };
  if (options?.from || options?.to) {
    where.recordDate = {};
    if (options.from) where.recordDate.gte = new Date(options.from);
    if (options.to) where.recordDate.lte = new Date(options.to);
  }

  return prisma.slaMetric.findMany({
    where,
    orderBy: { recordDate: 'desc' },
    take: options?.limit ?? 90,
  });
}

// 최신 KPI 조회 (대시보드용)
export async function getLatestSlaMetric(slaTargetId: string) {
  return prisma.slaMetric.findFirst({
    where: { slaTargetId },
    orderBy: { recordDate: 'desc' },
  });
}

// ── SLA 위반 기록 ───────────────────────────────────────

interface RecordViolationInput {
  slaTargetId: string;
  metricName: string;
  targetValue: number;
  actualValue: number;
  violationDate: string | Date;
  severity: string;
  escalated?: boolean;
  note?: string;
}

export async function recordViolation(data: RecordViolationInput) {
  return prisma.slaViolation.create({
    data: {
      slaTargetId: data.slaTargetId,
      metricName: data.metricName,
      targetValue: data.targetValue,
      actualValue: data.actualValue,
      violationDate: new Date(data.violationDate),
      severity: data.severity,
      escalated: data.escalated ?? false,
      note: data.note,
    },
  });
}

export async function getViolations(
  slaTargetId: string,
  options?: { from?: string; to?: string; metricName?: string; limit?: number }
) {
  const where: Prisma.SlaViolationWhereInput = { slaTargetId };
  if (options?.metricName) where.metricName = options.metricName;
  if (options?.from || options?.to) {
    where.violationDate = {};
    if (options.from) where.violationDate.gte = new Date(options.from);
    if (options.to) where.violationDate.lte = new Date(options.to);
  }

  return prisma.slaViolation.findMany({
    where,
    orderBy: { violationDate: 'desc' },
    take: options?.limit ?? 100,
  });
}

export async function resolveViolation(id: string, note?: string) {
  return prisma.slaViolation.update({
    where: { id },
    data: {
      resolvedAt: new Date(),
      ...(note ? { note } : {}),
    },
  });
}

// ── SLA 리포트 집계 ─────────────────────────────────────

export async function getSlaReport(
  slaTargetId: string,
  from: string,
  to: string
) {
  const [metrics, violations, target] = await Promise.all([
    prisma.slaMetric.findMany({
      where: {
        slaTargetId,
        recordDate: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { recordDate: 'asc' },
    }),
    prisma.slaViolation.findMany({
      where: {
        slaTargetId,
        violationDate: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { violationDate: 'asc' },
    }),
    prisma.slaTarget.findUnique({ where: { id: slaTargetId } }),
  ]);

  if (!target || metrics.length === 0) {
    return { target, metrics, violations, summary: null };
  }

  // 평균 계산
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const summary = {
    period: { from, to },
    totalDays: metrics.length,
    avgDeliveryOnTimeRate: Math.round(avg(metrics.map((m) => m.deliveryOnTimeRate)) * 100) / 100,
    avgMisshipmentRate: Math.round(avg(metrics.map((m) => m.misshipmentRate)) * 1000) / 1000,
    avgPickingAccuracy: Math.round(avg(metrics.map((m) => m.pickingAccuracy)) * 100) / 100,
    avgProcessingTime: Math.round(avg(metrics.map((m) => m.avgProcessingTime)) * 10) / 10,
    totalOrders: metrics.reduce((s, m) => s + m.totalOrders, 0),
    totalPicks: metrics.reduce((s, m) => s + m.totalPicks, 0),
    violationCount: violations.length,
    unresolvedViolations: violations.filter((v) => !v.resolvedAt).length,
    escalatedCount: violations.filter((v) => v.escalated).length,
    // 목표 달성 여부
    deliveryOnTimeMet: avg(metrics.map((m) => m.deliveryOnTimeRate)) >= target.deliveryOnTimeTarget,
    misshipmentRateMet: avg(metrics.map((m) => m.misshipmentRate)) <= target.misshipmentRateLimit,
    pickingAccuracyMet: avg(metrics.map((m) => m.pickingAccuracy)) >= target.pickingAccuracyTarget,
    processingTimeMet: avg(metrics.map((m) => m.avgProcessingTime)) <= target.avgProcessingTimeLimit,
  };

  return { target, metrics, violations, summary };
}
