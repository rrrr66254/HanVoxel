/**
 * 업계 벤치마크 서비스
 * - 월별 KPI 집계 + 익명 벤치마크 스냅샷
 * - 개별 회사 순위 산출 + 개선 권고
 * - 리포트 생성 및 관리
 */
import prisma from './prisma';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

// KPI 키 목록
const KPI_KEYS = [
  'picking_accuracy',
  'inventory_turnover',
  'space_utilization',
  'on_time_delivery',
  'receiving_time',
  'order_cycle_time',
] as const;

// ── 타입 정의 ──

interface CompanyMetricsInput {
  companyId: string;
  siteId: string;
  pickingAccuracy: number;
  inventoryTurnover: number;
  spaceUtilization: number;
  onTimeDelivery: number;
  receivingTime: number;
  orderCycleTime: number;
}

interface BenchmarkSnapshotData {
  period: string;
  industry: string;
  companySize: string;
  participantCount: number;
  averages: Record<string, number>;
  percentiles: Record<string, { p25: number; p50: number; p75: number; p90: number }>;
}

interface CompanyRank {
  companyId: string;
  siteId: string;
  metrics: Record<string, number>;
  percentileRanks: Record<string, number>;
  overallScore: number;
}

interface RecommendationItem {
  kpi: string;
  kpiLabel: string;
  currentValue: number;
  industryAvg: number;
  industryP75: number;
  gapPercent: number;
  priority: string;
  message: string;
}

// ── 회사 KPI 수집 ──

/**
 * 사이트의 월별 KPI를 DB에서 집계
 * SlaMetric, PickingOrder, SkuDailyUsage, SpatialObject 데이터를 조합
 */
export async function collectSiteMetrics(
  companyId: string,
  siteId: string,
  period: string,
): Promise<CompanyMetricsInput> {
  const periodStart = new Date(`${period}-01`);
  const periodEnd = new Date(nextMonth(period));

  // SLA 메트릭에서 KPI 조회 (SlaTarget 경유)
  const slaTargets = await prisma.slaTarget.findMany({
    where: { siteId, isActive: true },
  });
  const targetIds = slaTargets.map((t) => t.id);

  const slaMetrics = targetIds.length > 0
    ? await prisma.slaMetric.findMany({
        where: {
          slaTargetId: { in: targetIds },
          recordDate: { gte: periodStart, lt: periodEnd },
        },
        orderBy: { recordDate: 'desc' },
      })
    : [];

  // 피킹 정확도 계산 (PickingOrder 기반)
  const pickingOrders = await prisma.pickingOrder.findMany({
    where: {
      siteId,
      createdAt: { gte: periodStart, lt: periodEnd },
      status: 'COMPLETED',
    },
  });

  const totalPicking = pickingOrders.length;
  const accuratePicking = pickingOrders.filter((o) => o.errorLines === 0).length;
  const pickingAccuracy = totalPicking > 0 ? (accuratePicking / totalPicking) * 100 : 95;

  // 재고회전율 계산 (월간 출고량 / SKU 수)
  const usageData = await prisma.skuDailyUsage.findMany({
    where: {
      siteId,
      usageDate: { gte: periodStart, lt: periodEnd },
    },
  });
  const totalUsed = usageData.reduce((sum, u) => sum + u.qtyUsed, 0);
  const totalReceived = usageData.reduce((sum, u) => sum + u.qtyReceived, 0);
  const avgStock = totalReceived > 0 ? totalReceived : totalUsed;
  const inventoryTurnover = avgStock > 0 ? (totalUsed / avgStock) * 12 : 6;

  // 공간활용률 (BIN 타입 공간 객체 기반 추정)
  const totalObjects = await prisma.spatialObject.count({
    where: { siteId, isActive: true },
  });
  // 사용 중인 객체 (status ACTIVE이면서 metadata 있는 것)
  const activeObjects = await prisma.spatialObject.count({
    where: { siteId, isActive: true, status: 'ACTIVE', metadata: { not: undefined } },
  });
  const spaceUtilization = totalObjects > 0
    ? Math.min(100, (activeObjects / totalObjects) * 100)
    : 65;

  // SLA 메트릭에서 납기준수율 / 처리시간 집계
  let onTimeDelivery = 90;
  let receivingTime = 3;
  let orderCycleTime = 6;

  if (slaMetrics.length > 0) {
    const avgDelivery = slaMetrics.reduce((s, m) => s + m.deliveryOnTimeRate, 0) / slaMetrics.length;
    onTimeDelivery = avgDelivery;

    const avgProcessing = slaMetrics.reduce((s, m) => s + m.avgProcessingTime, 0) / slaMetrics.length;
    receivingTime = avgProcessing / 60; // 분 → 시간
    orderCycleTime = receivingTime * 2; // 주문처리는 입고처리의 약 2배로 추정
  }

  return {
    companyId,
    siteId,
    pickingAccuracy: Math.min(100, Math.max(0, pickingAccuracy)),
    inventoryTurnover: Math.max(0, inventoryTurnover),
    spaceUtilization: Math.min(100, Math.max(0, spaceUtilization)),
    onTimeDelivery: Math.min(100, Math.max(0, onTimeDelivery)),
    receivingTime: Math.max(0, receivingTime),
    orderCycleTime: Math.max(0, orderCycleTime),
  };
}

// ── 벤치마크 집계 ──

/**
 * 동일 업종·규모 회사 데이터를 ML 서비스에서 익명 집계
 */
export async function aggregateBenchmark(
  period: string,
  industry: string,
  companySize: string,
): Promise<BenchmarkSnapshotData | null> {
  // 캐시 확인
  const cached = await prisma.benchmarkSnapshot.findUnique({
    where: {
      period_industry_companySize: { period, industry, companySize },
    },
  });

  if (cached) {
    return {
      period: cached.period,
      industry: cached.industry,
      companySize: cached.companySize,
      participantCount: cached.participantCount,
      averages: {
        picking_accuracy: cached.avgPickingAccuracy,
        inventory_turnover: cached.avgInventoryTurnover,
        space_utilization: cached.avgSpaceUtilization,
        on_time_delivery: cached.avgOnTimeDelivery,
        receiving_time: cached.avgReceivingTime,
        order_cycle_time: cached.avgOrderCycleTime,
      },
      percentiles: cached.percentiles as Record<string, { p25: number; p50: number; p75: number; p90: number }>,
    };
  }

  // 동일 업종·규모 회사 조회
  const companies = await prisma.company.findMany({
    where: { industry, companySize, isActive: true },
    include: { sites: { where: { isActive: true }, take: 1 } },
  });

  if (companies.length < 5) return null;

  // 각 회사의 KPI 수집
  const metricsList: CompanyMetricsInput[] = [];
  for (const comp of companies) {
    const site = comp.sites[0];
    if (!site) continue;
    try {
      const metrics = await collectSiteMetrics(comp.id, site.id, period);
      metricsList.push(metrics);
    } catch {
      // 데이터 부족 회사는 건너뜀
    }
  }

  if (metricsList.length < 5) return null;

  // ML 서비스 호출
  const mlPayload = {
    period,
    industry,
    company_size: companySize,
    metrics_list: metricsList.map((m) => ({
      company_id: m.companyId,
      site_id: m.siteId,
      picking_accuracy: m.pickingAccuracy,
      inventory_turnover: m.inventoryTurnover,
      space_utilization: m.spaceUtilization,
      on_time_delivery: m.onTimeDelivery,
      receiving_time: m.receivingTime,
      order_cycle_time: m.orderCycleTime,
    })),
  };

  const resp = await fetch(`${ML_SERVICE_URL}/api/v1/benchmark/aggregate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mlPayload),
  });

  if (!resp.ok) return null;
  const result = await resp.json() as Record<string, unknown>;
  const averages = result.averages as Record<string, number>;
  const percentiles = result.percentiles as Record<string, { p25: number; p50: number; p75: number; p90: number }>;

  // DB에 스냅샷 저장
  await prisma.benchmarkSnapshot.upsert({
    where: {
      period_industry_companySize: { period, industry, companySize },
    },
    create: {
      period,
      industry,
      companySize,
      participantCount: result.participant_count as number,
      avgPickingAccuracy: averages.picking_accuracy,
      avgInventoryTurnover: averages.inventory_turnover,
      avgSpaceUtilization: averages.space_utilization,
      avgOnTimeDelivery: averages.on_time_delivery,
      avgReceivingTime: averages.receiving_time,
      avgOrderCycleTime: averages.order_cycle_time,
      percentiles,
    },
    update: {
      participantCount: result.participant_count as number,
      avgPickingAccuracy: averages.picking_accuracy,
      avgInventoryTurnover: averages.inventory_turnover,
      avgSpaceUtilization: averages.space_utilization,
      avgOnTimeDelivery: averages.on_time_delivery,
      avgReceivingTime: averages.receiving_time,
      avgOrderCycleTime: averages.order_cycle_time,
      percentiles,
    },
  });

  return {
    period: result.period as string,
    industry: result.industry as string,
    companySize: result.company_size as string,
    participantCount: result.participant_count as number,
    averages,
    percentiles,
  };
}

// ── 내 회사 순위 조회 ──

/**
 * 내 회사의 업계 대비 순위 계산
 */
export async function getMyBenchmark(
  companyId: string,
  siteId: string,
  period: string,
): Promise<{
  myMetrics: CompanyMetricsInput;
  benchmark: BenchmarkSnapshotData;
  rank: CompanyRank;
  recommendations: RecommendationItem[];
} | null> {
  // 회사 정보 조회
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { sites: { where: { id: siteId } } },
  });

  if (!company || !company.industry || !company.companySize) return null;

  const industry = company.industry;
  const companySize = company.companySize;

  // 벤치마크 집계 (캐시 또는 새로 생성)
  const benchmark = await aggregateBenchmark(period, industry, companySize);
  if (!benchmark) return null;

  // 내 KPI 수집
  const myMetrics = await collectSiteMetrics(companyId, siteId, period);

  // 동일 업종·규모 전체 값 수집 (순위 계산용)
  const allCompanies = await prisma.company.findMany({
    where: { industry, companySize, isActive: true },
    include: { sites: { where: { isActive: true }, take: 1 } },
  });

  const allValues: Record<string, number[]> = {};
  KPI_KEYS.forEach((k) => { allValues[k] = []; });

  for (const c of allCompanies) {
    const site = c.sites[0];
    if (!site) continue;
    try {
      const m = await collectSiteMetrics(c.id, site.id, period);
      allValues.picking_accuracy.push(m.pickingAccuracy);
      allValues.inventory_turnover.push(m.inventoryTurnover);
      allValues.space_utilization.push(m.spaceUtilization);
      allValues.on_time_delivery.push(m.onTimeDelivery);
      allValues.receiving_time.push(m.receivingTime);
      allValues.order_cycle_time.push(m.orderCycleTime);
    } catch {
      // 건너뜀
    }
  }

  // ML 서비스: 순위 계산
  const rankResp = await fetch(`${ML_SERVICE_URL}/api/v1/benchmark/rank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: {
        company_id: companyId,
        site_id: siteId,
        picking_accuracy: myMetrics.pickingAccuracy,
        inventory_turnover: myMetrics.inventoryTurnover,
        space_utilization: myMetrics.spaceUtilization,
        on_time_delivery: myMetrics.onTimeDelivery,
        receiving_time: myMetrics.receivingTime,
        order_cycle_time: myMetrics.orderCycleTime,
      },
      benchmark: {
        period: benchmark.period,
        industry: benchmark.industry,
        company_size: benchmark.companySize,
        participant_count: benchmark.participantCount,
        averages: benchmark.averages,
        percentiles: benchmark.percentiles,
      },
      all_values: allValues,
    }),
  });

  if (!rankResp.ok) return null;
  const rankResult = await rankResp.json() as Record<string, unknown>;

  // ML 서비스: 개선 권고
  const recResp = await fetch(`${ML_SERVICE_URL}/api/v1/benchmark/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: {
        company_id: companyId,
        site_id: siteId,
        picking_accuracy: myMetrics.pickingAccuracy,
        inventory_turnover: myMetrics.inventoryTurnover,
        space_utilization: myMetrics.spaceUtilization,
        on_time_delivery: myMetrics.onTimeDelivery,
        receiving_time: myMetrics.receivingTime,
        order_cycle_time: myMetrics.orderCycleTime,
      },
      benchmark: {
        period: benchmark.period,
        industry: benchmark.industry,
        company_size: benchmark.companySize,
        participant_count: benchmark.participantCount,
        averages: benchmark.averages,
        percentiles: benchmark.percentiles,
      },
    }),
  });

  const recResult = recResp.ok
    ? (await recResp.json() as { recommendations: Record<string, unknown>[] })
    : { recommendations: [] };

  const rank: CompanyRank = {
    companyId: rankResult.company_id as string,
    siteId: rankResult.site_id as string,
    metrics: rankResult.metrics as Record<string, number>,
    percentileRanks: rankResult.percentile_ranks as Record<string, number>,
    overallScore: rankResult.overall_score as number,
  };

  const recommendations: RecommendationItem[] = (recResult.recommendations ?? []).map(
    (r: Record<string, unknown>) => ({
      kpi: r.kpi as string,
      kpiLabel: r.kpi_label as string,
      currentValue: r.current_value as number,
      industryAvg: r.industry_avg as number,
      industryP75: r.industry_p75 as number,
      gapPercent: r.gap_percent as number,
      priority: r.priority as string,
      message: r.message as string,
    }),
  );

  // CompanyBenchmark 저장
  await prisma.companyBenchmark.upsert({
    where: {
      companyId_siteId_period: { companyId, siteId, period },
    },
    create: {
      companyId,
      siteId,
      period,
      industry,
      companySize,
      pickingAccuracy: myMetrics.pickingAccuracy,
      inventoryTurnover: myMetrics.inventoryTurnover,
      spaceUtilization: myMetrics.spaceUtilization,
      onTimeDelivery: myMetrics.onTimeDelivery,
      receivingTime: myMetrics.receivingTime,
      orderCycleTime: myMetrics.orderCycleTime,
      percentileRanks: rank.percentileRanks,
      overallScore: rank.overallScore,
    },
    update: {
      pickingAccuracy: myMetrics.pickingAccuracy,
      inventoryTurnover: myMetrics.inventoryTurnover,
      spaceUtilization: myMetrics.spaceUtilization,
      onTimeDelivery: myMetrics.onTimeDelivery,
      receivingTime: myMetrics.receivingTime,
      orderCycleTime: myMetrics.orderCycleTime,
      percentileRanks: rank.percentileRanks,
      overallScore: rank.overallScore,
    },
  });

  return { myMetrics, benchmark, rank, recommendations };
}

// ── 리포트 생성 ──

/**
 * 벤치마크 리포트 생성
 */
export async function generateReport(
  companyId: string,
  siteId: string,
  period: string,
): Promise<{ id: string; title: string; reportData: Record<string, unknown> } | null> {
  const benchmarkData = await getMyBenchmark(companyId, siteId, period);
  if (!benchmarkData) return null;

  const comp = await prisma.company.findUnique({ where: { id: companyId } });
  const site = await prisma.site.findFirst({ where: { id: siteId } });

  // ML 서비스: 리포트 생성
  const resp = await fetch(`${ML_SERVICE_URL}/api/v1/benchmark/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: {
        company_id: companyId,
        site_id: siteId,
        picking_accuracy: benchmarkData.myMetrics.pickingAccuracy,
        inventory_turnover: benchmarkData.myMetrics.inventoryTurnover,
        space_utilization: benchmarkData.myMetrics.spaceUtilization,
        on_time_delivery: benchmarkData.myMetrics.onTimeDelivery,
        receiving_time: benchmarkData.myMetrics.receivingTime,
        order_cycle_time: benchmarkData.myMetrics.orderCycleTime,
      },
      benchmark: {
        period: benchmarkData.benchmark.period,
        industry: benchmarkData.benchmark.industry,
        company_size: benchmarkData.benchmark.companySize,
        participant_count: benchmarkData.benchmark.participantCount,
        averages: benchmarkData.benchmark.averages,
        percentiles: benchmarkData.benchmark.percentiles,
      },
      rank: benchmarkData.rank,
      recommendations: benchmarkData.recommendations.map((r) => ({
        kpi: r.kpi,
        kpi_label: r.kpiLabel,
        current_value: r.currentValue,
        industry_avg: r.industryAvg,
        industry_p75: r.industryP75,
        gap_percent: r.gapPercent,
        priority: r.priority,
        message: r.message,
      })),
      company_name: comp?.name ?? '',
      site_name: site?.name ?? '',
    }),
  });

  if (!resp.ok) return null;
  const result = await resp.json() as { title: string; report_data: Record<string, unknown> };

  // DB에 리포트 저장
  const report = await prisma.benchmarkReport.create({
    data: {
      companyId,
      siteId,
      period,
      title: result.title,
      reportData: result.report_data as Record<string, string>,
      recommendations: benchmarkData.recommendations as unknown as Record<string, string>[],
      status: 'GENERATED',
    },
  });

  return {
    id: report.id,
    title: report.title,
    reportData: result.report_data,
  };
}

// ── 리포트 목록 ──

export async function getReports(companyId: string, limit: number = 12) {
  return prisma.benchmarkReport.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ── 벤치마크 히스토리 (트렌드) ──

export async function getBenchmarkHistory(
  companyId: string,
  siteId: string,
  months: number = 6,
) {
  return prisma.companyBenchmark.findMany({
    where: { companyId, siteId },
    orderBy: { period: 'desc' },
    take: months,
  });
}

// ── 유틸 ──

function nextMonth(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (month === 12) return `${year + 1}-01-01`;
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}
