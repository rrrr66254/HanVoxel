import prisma from './prisma';

// ─── 타입 정의 ───

interface BaselineInput {
  companyId: string;
  siteId: string;
  annualLaborCost: number;
  annualErrorCost: number;
  monthlyRentPerM2: number;
  warehouseArea: number;
  monthlyPickings: number;
  errorRate: number;
  employeeCount: number;
  laborSavingRate: number;
  errorReductionRate: number;
  spaceSavingRate: number;
  pickingEfficiencyGain: number;
}

interface SnapshotInput {
  baselineId: string;
  companyId: string;
  siteId: string;
  period: string;
  actualLaborCost: number;
  actualErrorCost: number;
  actualEmployeeCount: number;
}

// ─── 기준선 (Baseline) ───

/** 기준선 저장 (도입 전 운영 지표 스냅샷) */
export async function upsertBaseline(input: BaselineInput) {
  return prisma.roiBaseline.upsert({
    where: {
      companyId_siteId: {
        companyId: input.companyId,
        siteId: input.siteId,
      },
    },
    create: {
      companyId: input.companyId,
      siteId: input.siteId,
      baselineDate: new Date(),
      annualLaborCost: BigInt(input.annualLaborCost),
      annualErrorCost: BigInt(input.annualErrorCost),
      monthlyRentPerM2: input.monthlyRentPerM2,
      warehouseArea: input.warehouseArea,
      monthlyPickings: input.monthlyPickings,
      errorRate: input.errorRate,
      employeeCount: input.employeeCount,
      laborSavingRate: input.laborSavingRate,
      errorReductionRate: input.errorReductionRate,
      spaceSavingRate: input.spaceSavingRate,
      pickingEfficiencyGain: input.pickingEfficiencyGain,
    },
    update: {
      baselineDate: new Date(),
      annualLaborCost: BigInt(input.annualLaborCost),
      annualErrorCost: BigInt(input.annualErrorCost),
      monthlyRentPerM2: input.monthlyRentPerM2,
      warehouseArea: input.warehouseArea,
      monthlyPickings: input.monthlyPickings,
      errorRate: input.errorRate,
      employeeCount: input.employeeCount,
      laborSavingRate: input.laborSavingRate,
      errorReductionRate: input.errorReductionRate,
      spaceSavingRate: input.spaceSavingRate,
      pickingEfficiencyGain: input.pickingEfficiencyGain,
    },
  });
}

/** 기준선 조회 */
export async function getBaseline(companyId: string, siteId: string) {
  return prisma.roiBaseline.findUnique({
    where: { companyId_siteId: { companyId, siteId } },
  });
}

// ─── 월별 스냅샷 ───

/** DB에서 자동 집계 가능한 운영 지표 수집 */
async function aggregateFromDb(companyId: string, siteId: string, period: string) {
  // period = 'YYYY-MM' → 해당 월의 시작~끝 계산
  const [year, month] = period.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // 피킹 건수 집계 (picking_orders 테이블)
  const pickingCount = await prisma.pickingOrder.count({
    where: {
      siteId,
      createdAt: { gte: startDate, lt: endDate },
    },
  });

  // 오류 건수 집계 (picking_lines 중 status = 'ERROR')
  const errorCount = await prisma.pickingLine.count({
    where: {
      pickingOrder: {
        siteId,
        createdAt: { gte: startDate, lt: endDate },
      },
      status: 'ERROR',
    },
  });

  // 총 피킹 라인 수 (오류율 계산용)
  const totalLines = await prisma.pickingLine.count({
    where: {
      pickingOrder: {
        siteId,
        createdAt: { gte: startDate, lt: endDate },
      },
    },
  });

  const actualErrorRate = totalLines > 0 ? (errorCount / totalLines) * 100 : 0;

  return {
    actualPickings: pickingCount,
    actualErrors: errorCount,
    actualErrorRate: Math.round(actualErrorRate * 100) / 100,
  };
}

/** 월별 스냅샷 저장/업데이트 (DB 자동 집계 + 사용자 수동 입력 결합) */
export async function upsertSnapshot(input: SnapshotInput) {
  // 기준선 조회
  const baseline = await getBaseline(input.companyId, input.siteId);
  if (!baseline) throw new Error('기준선이 설정되지 않았습니다');

  // DB 자동 집계
  const dbMetrics = await aggregateFromDb(input.companyId, input.siteId, input.period);

  // 절감액 계산
  const baselineMonthlyLabor = Number(baseline.annualLaborCost) / 12;
  const baselineMonthlyError = Number(baseline.annualErrorCost) / 12;

  const laborSaving = Math.max(0, baselineMonthlyLabor - input.actualLaborCost);
  const errorCostSaving = Math.max(0, baselineMonthlyError - input.actualErrorCost);
  const spaceSaving = Math.round(
    baseline.warehouseArea * (baseline.spaceSavingRate / 100) * baseline.monthlyRentPerM2
  );
  const totalSaving = laborSaving + errorCostSaving + spaceSaving;

  // 이전 누적 절감액 조회
  const prevSnapshots = await prisma.roiMonthlySnapshot.findMany({
    where: { baselineId: baseline.id, period: { lt: input.period } },
    orderBy: { period: 'desc' },
    take: 1,
    select: { cumulativeSaving: true },
  });
  const prevCumulative = prevSnapshots.length > 0 ? Number(prevSnapshots[0].cumulativeSaving) : 0;
  const cumulativeSaving = prevCumulative + totalSaving;

  // 데이터 소스 판별
  const hasManual = input.actualLaborCost > 0 || input.actualErrorCost > 0;
  const hasAuto = dbMetrics.actualPickings > 0;
  const dataSource = hasManual && hasAuto ? 'MIXED' : hasManual ? 'MANUAL' : 'AUTO';

  return prisma.roiMonthlySnapshot.upsert({
    where: {
      baselineId_period: { baselineId: baseline.id, period: input.period },
    },
    create: {
      baselineId: baseline.id,
      companyId: input.companyId,
      siteId: input.siteId,
      period: input.period,
      actualPickings: dbMetrics.actualPickings,
      actualErrors: dbMetrics.actualErrors,
      actualErrorRate: dbMetrics.actualErrorRate,
      actualEmployeeCount: input.actualEmployeeCount,
      actualLaborCost: BigInt(Math.round(input.actualLaborCost)),
      actualErrorCost: BigInt(Math.round(input.actualErrorCost)),
      laborSaving: BigInt(Math.round(laborSaving)),
      errorCostSaving: BigInt(Math.round(errorCostSaving)),
      spaceSaving: BigInt(Math.round(spaceSaving)),
      totalSaving: BigInt(Math.round(totalSaving)),
      cumulativeSaving: BigInt(Math.round(cumulativeSaving)),
      dataSource,
    },
    update: {
      actualPickings: dbMetrics.actualPickings,
      actualErrors: dbMetrics.actualErrors,
      actualErrorRate: dbMetrics.actualErrorRate,
      actualEmployeeCount: input.actualEmployeeCount,
      actualLaborCost: BigInt(Math.round(input.actualLaborCost)),
      actualErrorCost: BigInt(Math.round(input.actualErrorCost)),
      laborSaving: BigInt(Math.round(laborSaving)),
      errorCostSaving: BigInt(Math.round(errorCostSaving)),
      spaceSaving: BigInt(Math.round(spaceSaving)),
      totalSaving: BigInt(Math.round(totalSaving)),
      cumulativeSaving: BigInt(Math.round(cumulativeSaving)),
      dataSource,
    },
  });
}

// ─── 대시보드 조회 ───

// BigInt → number 변환 헬퍼
function toNum(v: bigint | number): number {
  return typeof v === 'bigint' ? Number(v) : v;
}

/** ROI 대시보드 데이터 (기준선 + 월별 추이 + 합계) */
export async function getDashboard(companyId: string, siteId: string) {
  const baseline = await prisma.roiBaseline.findUnique({
    where: { companyId_siteId: { companyId, siteId } },
  });
  if (!baseline) return null;

  const snapshots = await prisma.roiMonthlySnapshot.findMany({
    where: { baselineId: baseline.id },
    orderBy: { period: 'asc' },
  });

  // 총 합산
  const totalLabor = snapshots.reduce((s: number, r: typeof snapshots[number]) => s + toNum(r.laborSaving), 0);
  const totalError = snapshots.reduce((s: number, r: typeof snapshots[number]) => s + toNum(r.errorCostSaving), 0);
  const totalSpace = snapshots.reduce((s: number, r: typeof snapshots[number]) => s + toNum(r.spaceSaving), 0);
  const totalSaving = snapshots.reduce((s: number, r: typeof snapshots[number]) => s + toNum(r.totalSaving), 0);

  // 예측 연간 절감액 (기준선 기반 계산)
  const predictedAnnualLabor = toNum(baseline.annualLaborCost) * (baseline.laborSavingRate / 100);
  const predictedAnnualError = toNum(baseline.annualErrorCost) * (baseline.errorReductionRate / 100);
  const predictedAnnualSpace = baseline.warehouseArea * (baseline.spaceSavingRate / 100) * baseline.monthlyRentPerM2 * 12;
  const predictedAnnualTotal = predictedAnnualLabor + predictedAnnualError + predictedAnnualSpace;

  // 직렬화 가능하도록 BigInt → number 변환
  const serializedBaseline = {
    ...baseline,
    annualLaborCost: toNum(baseline.annualLaborCost),
    annualErrorCost: toNum(baseline.annualErrorCost),
  };

  const serializedSnapshots = snapshots.map((s: typeof snapshots[number]) => ({
    ...s,
    actualLaborCost: toNum(s.actualLaborCost),
    actualErrorCost: toNum(s.actualErrorCost),
    laborSaving: toNum(s.laborSaving),
    errorCostSaving: toNum(s.errorCostSaving),
    spaceSaving: toNum(s.spaceSaving),
    totalSaving: toNum(s.totalSaving),
    cumulativeSaving: toNum(s.cumulativeSaving),
  }));

  return {
    baseline: serializedBaseline,
    snapshots: serializedSnapshots,
    summary: {
      monthsTracked: snapshots.length,
      totalLaborSaving: totalLabor,
      totalErrorSaving: totalError,
      totalSpaceSaving: totalSpace,
      totalSaving,
      predictedAnnualTotal: Math.round(predictedAnnualTotal),
      // 실제 vs 예측 달성율
      achievementRate: predictedAnnualTotal > 0 && snapshots.length > 0
        ? Math.round((totalSaving / (predictedAnnualTotal / 12 * snapshots.length)) * 100)
        : 0,
    },
  };
}
