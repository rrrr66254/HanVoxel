import prisma from './prisma';
import { Prisma } from '@prisma/client';

interface CreateAlertInput {
  id?: string;
  siteId: string;
  metricType: string;
  severity: string;
  title: string;
  message: string;
  anomalyCount?: number;
  detectedAt: string | Date;
  metadata?: Prisma.InputJsonValue | null;
}

// 알림 생성
export async function createAlert(data: CreateAlertInput) {
  return prisma.alert.create({
    data: {
      ...(data.id ? { id: data.id } : {}),
      siteId: data.siteId,
      metricType: data.metricType,
      severity: data.severity,
      title: data.title,
      message: data.message,
      anomalyCount: data.anomalyCount ?? 0,
      detectedAt: new Date(data.detectedAt),
      metadata: data.metadata ?? Prisma.DbNull,
    },
  });
}

// 사이트별 알림 목록 조회
export async function getAlertsBySite(
  siteId: string,
  options?: { severity?: string; isRead?: boolean; limit?: number; offset?: number }
) {
  const where: Prisma.AlertWhereInput = { siteId };
  if (options?.severity) where.severity = options.severity;
  if (options?.isRead !== undefined) where.isRead = options.isRead;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.alert.count({ where }),
  ]);

  return { alerts, total };
}

// 알림 읽음 처리
export async function markAlertRead(id: string) {
  return prisma.alert.update({
    where: { id },
    data: { isRead: true },
  });
}

// 알림 일괄 읽음 처리
export async function markAllAlertsRead(siteId: string) {
  return prisma.alert.updateMany({
    where: { siteId, isRead: false },
    data: { isRead: true },
  });
}

// 알림 해결 처리
export async function resolveAlert(id: string) {
  return prisma.alert.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });
}

// 읽지 않은 알림 수
export async function getUnreadCount(siteId: string) {
  return prisma.alert.count({
    where: { siteId, isRead: false },
  });
}
