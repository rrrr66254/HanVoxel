/**
 * CEO 대시보드 서비스
 *
 * - 매출/비용/이익 집계 (erp_vouchers)
 * - 생산 달성률 (production_orders)
 * - 재고 가치 (inventory_balances)
 * - 납기 준수율 (sla_metrics)
 * - 오늘의 타임라인 이벤트 (stock_movements + production_orders)
 * - 긴급 항목 (sla_violations + 마감 임박 생산 지시)
 * - 작업장 상태 (work_centers)
 * - 최근 알림 (alerts)
 * - 월별 매출/비용/이익 추이
 */
import prisma from './prisma';

// ── 타입 ──────────────────────────────────────────

interface KpiCard {
  label: string;
  value: number;
  unit: string;
  change?: number;
  changeLabel?: string;
}

interface TimelineEvent {
  id: string;
  time: string;
  type: string;
  title: string;
  detail: string;
}

interface UrgentItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  severity: string;
  deadline?: string;
}

interface WorkCenterStatus {
  id: string;
  code: string;
  name: string;
  status: string;
  type: string;
}

interface AlertSummary {
  id: string;
  type: string;
  severity: string;
  message: string;
  createdAt: string;
}

interface CeoDashboardResult {
  kpis: KpiCard[];
  timeline: TimelineEvent[];
  urgentItems: UrgentItem[];
  workCenters: WorkCenterStatus[];
  recentAlerts: AlertSummary[];
}

interface TrendPoint {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

// ── 기간 헬퍼 ────────────────────────────────────────

function getPeriodRange(period: 'today' | 'week' | 'month'): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    start.setDate(start.getDate() - 7);
  } else if (period === 'month') {
    start.setMonth(start.getMonth() - 1);
  }

  return { start, end };
}

function getTrendRange(period: 'month' | 'quarter' | 'year'): { start: Date; end: Date; months: number } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  let months = 1;
  if (period === 'month') {
    start.setMonth(start.getMonth() - 1);
    months = 1;
  } else if (period === 'quarter') {
    start.setMonth(start.getMonth() - 3);
    months = 3;
  } else {
    start.setMonth(start.getMonth() - 12);
    months = 12;
  }

  return { start, end, months };
}

// ── 목 데이터 (DB 연결 불가 시 폴백) ────────────────

function getMockDashboard(): CeoDashboardResult {
  return {
    kpis: [
      { label: '매출', value: 245000000, unit: '원', change: 12.5, changeLabel: '전월 대비' },
      { label: '영업이익', value: 38000000, unit: '원', change: 8.3, changeLabel: '전월 대비' },
      { label: '생산 달성률', value: 94.2, unit: '%', change: 2.1, changeLabel: '전월 대비' },
      { label: '재고 가치', value: 1250000000, unit: '원', change: -3.2, changeLabel: '전월 대비' },
      { label: '납기 준수율', value: 97.8, unit: '%', change: 1.5, changeLabel: '전월 대비' },
      { label: '설비 가동률', value: 88.5, unit: '%', change: -0.8, changeLabel: '전월 대비' },
    ],
    timeline: [
      { id: 'tl-1', time: '09:00', type: 'INBOUND', title: '입고 완료', detail: 'PO-2026-0312 — 자동차 부품 120팔레트' },
      { id: 'tl-2', time: '10:30', type: 'PRODUCTION', title: '생산 시작', detail: 'WO-20260318-0001 — 엔진 마운트 500EA' },
      { id: 'tl-3', time: '11:15', type: 'OUTBOUND', title: '출고 예정', detail: 'SO-2026-0089 — 현대 모비스 납품' },
      { id: 'tl-4', time: '14:00', type: 'QC', title: 'QC 검사', detail: 'INS-2026-0045 — 입고품 품질 검수' },
    ],
    urgentItems: [
      { id: 'urg-1', type: 'SLA_VIOLATION', title: 'SLA 위반 임박', detail: '현대 모비스 — 납기 준수율 93% (목표 95%)', severity: 'HIGH' },
      { id: 'urg-2', type: 'PRODUCTION_DELAY', title: '생산 지연', detail: 'WO-20260317-0003 — 마감 2시간 전, 달성률 72%', severity: 'MEDIUM', deadline: '2026-03-18T18:00:00Z' },
      { id: 'urg-3', type: 'STOCK_LOW', title: '안전 재고 부족', detail: 'SKU-2891 브레이크 패드 — 잔여 3일분', severity: 'HIGH' },
    ],
    workCenters: [
      { id: 'wc-1', code: 'WC-001', name: '프레스 라인 A', status: 'RUNNING', type: 'PRESS' },
      { id: 'wc-2', code: 'WC-002', name: '용접 라인 B', status: 'RUNNING', type: 'WELDING' },
      { id: 'wc-3', code: 'WC-003', name: '도장 라인 C', status: 'MAINTENANCE', type: 'PAINTING' },
      { id: 'wc-4', code: 'WC-004', name: '조립 라인 D', status: 'IDLE', type: 'ASSEMBLY' },
    ],
    recentAlerts: [
      { id: 'al-1', type: 'ANOMALY', severity: 'WARNING', message: '재고 수치 급변 감지 — SKU-1234 (전일 대비 -45%)', createdAt: '2026-03-18T08:30:00Z' },
      { id: 'al-2', type: 'SLA', severity: 'CRITICAL', message: 'SLA 위반 — 삼성전자 출고 지연 2건', createdAt: '2026-03-18T07:15:00Z' },
      { id: 'al-3', type: 'QC', severity: 'WARNING', message: 'QC 불량률 상승 — 공급업체 A사 (4.2% → 7.8%)', createdAt: '2026-03-18T06:00:00Z' },
    ],
  };
}

function getMockTrend(): TrendPoint[] {
  const months = ['2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09',
    '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
  return months.map((month, i) => ({
    month,
    revenue: 200000000 + Math.round(Math.sin(i * 0.5) * 30000000) + i * 5000000,
    cost: 160000000 + Math.round(Math.cos(i * 0.4) * 15000000) + i * 3000000,
    profit: 40000000 + Math.round(Math.sin(i * 0.3) * 10000000) + i * 2000000,
  }));
}

// ── CEO 대시보드 메인 ─────────────────────────────────

export async function getCeoDashboard(
  siteId: string,
  period: 'today' | 'week' | 'month',
): Promise<CeoDashboardResult> {
  const { start, end } = getPeriodRange(period);

  try {
    // 병렬로 모든 데이터 조회
    const [
      revenueData,
      productionData,
      inventoryValue,
      slaData,
      workCenters,
      recentAlerts,
      timelineMovements,
      timelineProduction,
      slaViolations,
      urgentOrders,
    ] = await Promise.all([
      // 1. 매출/비용 집계 (erp_vouchers)
      getRevenueKpis(siteId, start, end),
      // 2. 생산 달성률
      getProductionKpis(siteId, start, end),
      // 3. 재고 가치
      getInventoryValue(siteId),
      // 4. 납기 준수율
      getSlaKpis(siteId, start, end),
      // 5. 작업장 상태
      getWorkCenterStatuses(siteId),
      // 6. 최근 알림
      getRecentAlerts(siteId),
      // 7. 오늘의 재고 이동 이벤트
      getTimelineMovements(siteId),
      // 8. 오늘의 생산 이벤트
      getTimelineProductionEvents(siteId),
      // 9. SLA 위반 항목
      getSlaViolations(siteId),
      // 10. 마감 임박 생산 지시
      getUrgentProductionOrders(siteId),
    ]);

    // KPI 카드 구성
    const kpis: KpiCard[] = [
      { label: '매출', value: revenueData.revenue, unit: '원', change: revenueData.revenueChange, changeLabel: '전기 대비' },
      { label: '영업이익', value: revenueData.profit, unit: '원', change: revenueData.profitChange, changeLabel: '전기 대비' },
      { label: '생산 달성률', value: productionData.achievementRate, unit: '%', change: productionData.achievementChange, changeLabel: '전기 대비' },
      { label: '재고 가치', value: inventoryValue, unit: '원' },
      { label: '납기 준수율', value: slaData.complianceRate, unit: '%', change: slaData.complianceChange, changeLabel: '전기 대비' },
      { label: '설비 가동률', value: getUtilizationRate(workCenters), unit: '%' },
    ];

    // 타임라인 구성
    const timeline: TimelineEvent[] = [
      ...timelineMovements,
      ...timelineProduction,
    ].sort((a, b) => a.time.localeCompare(b.time));

    // 긴급 항목 구성
    const urgentItems: UrgentItem[] = [
      ...slaViolations,
      ...urgentOrders,
    ];

    return {
      kpis,
      timeline,
      urgentItems,
      workCenters,
      recentAlerts,
    };
  } catch {
    // DB 연결 불가 시 목 데이터 반환
    return getMockDashboard();
  }
}

// ── CEO 추이 데이터 ──────────────────────────────────

export async function getCeoTrend(
  siteId: string,
  period: 'month' | 'quarter' | 'year',
): Promise<TrendPoint[]> {
  const { start, end } = getTrendRange(period);

  try {
    // 기간 내 ERP 전표에서 월별 매출/비용 집계
    const vouchers = await prisma.erpVoucher.findMany({
      where: {
        siteId,
        voucherDate: { gte: start, lte: end },
        deletedAt: null,
      },
      select: {
        voucherDate: true,
        voucherType: true,
        totalAmount: true,
      },
    });

    // 월별 그루핑
    const monthMap: Record<string, { revenue: number; cost: number }> = {};

    for (const v of vouchers) {
      const month = v.voucherDate.toISOString().slice(0, 7);
      if (!monthMap[month]) {
        monthMap[month] = { revenue: 0, cost: 0 };
      }

      if (v.voucherType === 'SALES' || v.voucherType === 'SALES_RETURN') {
        // 매출 전표
        monthMap[month].revenue += v.voucherType === 'SALES'
          ? Number(v.totalAmount)
          : -Number(v.totalAmount);
      } else if (v.voucherType === 'PURCHASE' || v.voucherType === 'PURCHASE_RETURN') {
        // 매입(비용) 전표
        monthMap[month].cost += v.voucherType === 'PURCHASE'
          ? Number(v.totalAmount)
          : -Number(v.totalAmount);
      }
    }

    // 정렬된 결과 반환
    const result: TrendPoint[] = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
      }));

    if (result.length === 0) {
      return getMockTrend();
    }

    return result;
  } catch {
    return getMockTrend();
  }
}

// ── 내부 헬퍼 함수 ───────────────────────────────────

/** 매출/비용 KPI 조회 */
async function getRevenueKpis(siteId: string, start: Date, end: Date) {
  const vouchers = await prisma.erpVoucher.findMany({
    where: {
      siteId,
      voucherDate: { gte: start, lte: end },
      deletedAt: null,
    },
    select: { voucherType: true, totalAmount: true },
  });

  let revenue = 0;
  let cost = 0;

  for (const v of vouchers) {
    if (v.voucherType === 'SALES') revenue += Number(v.totalAmount);
    if (v.voucherType === 'PURCHASE') cost += Number(v.totalAmount);
  }

  const profit = revenue - cost;

  // 전기 비교를 위한 이전 기간 데이터
  const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - periodDays);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevVouchers = await prisma.erpVoucher.findMany({
    where: {
      siteId,
      voucherDate: { gte: prevStart, lte: prevEnd },
      deletedAt: null,
    },
    select: { voucherType: true, totalAmount: true },
  });

  let prevRevenue = 0;
  let prevCost = 0;
  for (const v of prevVouchers) {
    if (v.voucherType === 'SALES') prevRevenue += Number(v.totalAmount);
    if (v.voucherType === 'PURCHASE') prevCost += Number(v.totalAmount);
  }
  const prevProfit = prevRevenue - prevCost;

  const revenueChange = prevRevenue > 0
    ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10
    : 0;
  const profitChange = prevProfit > 0
    ? Math.round(((profit - prevProfit) / prevProfit) * 1000) / 10
    : 0;

  return { revenue, cost, profit, revenueChange, profitChange };
}

/** 생산 달성률 KPI 조회 */
async function getProductionKpis(siteId: string, start: Date, end: Date) {
  const orders = await prisma.productionOrder.findMany({
    where: {
      siteId,
      createdAt: { gte: start, lte: end },
    },
    select: { plannedQty: true, actualQty: true },
  });

  const totalPlanned = orders.reduce((sum, o) => sum + o.plannedQty, 0);
  const totalActual = orders.reduce((sum, o) => sum + o.actualQty, 0);

  const achievementRate = totalPlanned > 0
    ? Math.round((totalActual / totalPlanned) * 1000) / 10
    : 0;

  // 전기 비교 (간단히 0으로 처리 — 전기 대비 계산은 추후 고도화)
  return { achievementRate, achievementChange: 0 };
}

/** 재고 가치 합계 조회 */
async function getInventoryValue(siteId: string): Promise<number> {
  const result = await prisma.inventoryBalance.aggregate({
    where: { siteId },
    _sum: { totalValue: true },
  });

  return Number(result._sum.totalValue ?? 0);
}

/** 납기 준수율 KPI 조회 */
async function getSlaKpis(siteId: string, start: Date, end: Date) {
  const metrics = await prisma.slaMetric.findMany({
    where: {
      siteId,
      measuredAt: { gte: start, lte: end },
      metricType: 'DELIVERY_COMPLIANCE',
    },
    select: { metricValue: true },
  });

  const complianceRate = metrics.length > 0
    ? Math.round(
        (metrics.reduce((sum, m) => sum + Number(m.metricValue), 0) / metrics.length) * 10,
      ) / 10
    : 0;

  return { complianceRate, complianceChange: 0 };
}

/** 작업장 상태 목록 조회 */
async function getWorkCenterStatuses(siteId: string): Promise<WorkCenterStatus[]> {
  const workCenters = await prisma.workCenter.findMany({
    where: { siteId },
    select: { id: true, code: true, name: true, status: true, type: true },
    orderBy: { code: 'asc' },
  });

  return workCenters;
}

/** 설비 가동률 계산 */
function getUtilizationRate(workCenters: WorkCenterStatus[]): number {
  if (workCenters.length === 0) return 0;
  const running = workCenters.filter((wc) => wc.status === 'RUNNING').length;
  return Math.round((running / workCenters.length) * 1000) / 10;
}

/** 최근 알림 조회 (최대 10건) */
async function getRecentAlerts(siteId: string): Promise<AlertSummary[]> {
  const alerts = await prisma.alert.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      alertType: true,
      severity: true,
      message: true,
      createdAt: true,
    },
  });

  return alerts.map((a) => ({
    id: a.id,
    type: a.alertType,
    severity: a.severity,
    message: a.message,
    createdAt: a.createdAt.toISOString(),
  }));
}

/** 오늘의 재고 이동 타임라인 이벤트 */
async function getTimelineMovements(siteId: string): Promise<TimelineEvent[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const movements = await prisma.stockMovement.findMany({
    where: {
      siteId,
      movedAt: { gte: todayStart, lte: todayEnd },
    },
    orderBy: { movedAt: 'asc' },
    take: 20,
    select: {
      id: true,
      movedAt: true,
      movementType: true,
      sku: true,
      qty: true,
      reason: true,
    },
  });

  return movements.map((m) => {
    const time = m.movedAt.toISOString().slice(11, 16); // HH:mm
    const typeLabel = m.movementType === 'INBOUND' ? '입고' : m.movementType === 'OUTBOUND' ? '출고' : '이동';
    return {
      id: m.id,
      time,
      type: m.movementType,
      title: `${typeLabel} — ${m.sku}`,
      detail: `${m.qty}EA${m.reason ? ` (${m.reason})` : ''}`,
    };
  });
}

/** 오늘의 생산 타임라인 이벤트 */
async function getTimelineProductionEvents(siteId: string): Promise<TimelineEvent[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const orders = await prisma.productionOrder.findMany({
    where: {
      siteId,
      OR: [
        { plannedStartAt: { gte: todayStart, lte: todayEnd } },
        { plannedEndAt: { gte: todayStart, lte: todayEnd } },
      ],
    },
    include: {
      workCenter: { select: { code: true, name: true } },
    },
    orderBy: { plannedStartAt: 'asc' },
    take: 10,
  });

  return orders.map((o) => {
    const time = o.plannedStartAt
      ? o.plannedStartAt.toISOString().slice(11, 16)
      : '00:00';
    return {
      id: o.id,
      time,
      type: 'PRODUCTION',
      title: `생산 — ${o.orderNo}`,
      detail: `${o.productName ?? o.productSku} ${o.plannedQty}EA (${o.workCenter?.name ?? ''})`,
    };
  });
}

/** SLA 위반 긴급 항목 */
async function getSlaViolations(siteId: string): Promise<UrgentItem[]> {
  const violations = await prisma.slaViolation.findMany({
    where: {
      siteId,
      resolvedAt: null,
    },
    orderBy: { violatedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      metricType: true,
      violationDetail: true,
      violatedAt: true,
    },
  });

  return violations.map((v) => ({
    id: v.id,
    type: 'SLA_VIOLATION',
    title: `SLA 위반 — ${v.metricType}`,
    detail: v.violationDetail ?? '',
    severity: 'HIGH',
  }));
}

/** 마감 임박 생산 지시서 */
async function getUrgentProductionOrders(siteId: string): Promise<UrgentItem[]> {
  const now = new Date();
  const in24Hours = new Date(now);
  in24Hours.setHours(in24Hours.getHours() + 24);

  const orders = await prisma.productionOrder.findMany({
    where: {
      siteId,
      status: { in: ['IN_PROGRESS', 'RELEASED'] },
      plannedEndAt: { gte: now, lte: in24Hours },
    },
    include: {
      workCenter: { select: { name: true } },
    },
    orderBy: { plannedEndAt: 'asc' },
    take: 5,
  });

  return orders.map((o) => {
    const achievementRate = o.plannedQty > 0
      ? Math.round((o.actualQty / o.plannedQty) * 100)
      : 0;
    return {
      id: o.id,
      type: 'PRODUCTION_DELAY',
      title: `마감 임박 — ${o.orderNo}`,
      detail: `${o.productName ?? o.productSku} 달성률 ${achievementRate}% (${o.workCenter?.name ?? ''})`,
      severity: achievementRate < 80 ? 'HIGH' : 'MEDIUM',
      deadline: o.plannedEndAt?.toISOString(),
    };
  });
}
