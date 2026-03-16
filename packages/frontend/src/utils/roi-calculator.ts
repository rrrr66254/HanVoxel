/**
 * ROI 계산 엔진 — HanVoxel 도입 효과 분석
 *
 * 산업 평균 벤치마크 기반 예상 개선율 적용
 */

export interface RoiInput {
  warehouseArea: number;     // 창고 면적 (m²)
  employeeCount: number;     // 직원 수
  monthlyPickings: number;   // 월 피킹 건수
  currentErrorRate: number;  // 현재 오류율 (%, 예: 2.5)
}

export interface RoiResult {
  // 현재 비용
  currentAnnualLaborCost: number;      // 현재 연간 인건비
  currentAnnualErrorCost: number;      // 현재 연간 오류 비용
  currentAnnualTotalCost: number;      // 현재 연간 총 비용

  // 개선 후
  improvedErrorRate: number;           // 개선 후 오류율 (%)
  improvedPickingEfficiency: number;   // 피킹 효율 개선율 (%)
  spaceSavingPercent: number;          // 공간 절감율 (%)

  // 절감액
  annualLaborSaving: number;           // 연간 인건비 절감액
  annualErrorSaving: number;           // 연간 오류 비용 절감액
  annualSpaceSaving: number;           // 연간 공간 절감액
  annualTotalSaving: number;           // 연간 총 절감액

  // 투자 회수
  monthlySubscription: number;         // 월 구독료
  annualSubscription: number;          // 연 구독료
  netAnnualSaving: number;             // 순 연간 절감액 (절감 - 구독)
  roiPercent: number;                  // ROI (%)
  paybackMonths: number;              // 투자 회수 기간 (개월)
}

// 산업 평균 벤치마크
const BENCHMARK = {
  avgMonthlySalary: 3500000,          // 월 평균 인건비 (원)
  avgErrorCostPerCase: 25000,          // 오류당 평균 비용 (원, 반품/재작업/고객불만)
  avgRentPerM2Monthly: 15000,          // m²당 월 임대료 (원)

  // HanVoxel 도입 시 개선율 (산업 평균 기반)
  pickingEfficiencyGain: 0.25,         // 피킹 효율 25% 개선
  errorReductionRate: 0.60,            // 오류율 60% 감소
  laborSavingRate: 0.15,              // 인건비 15% 절감 (동선 최적화)
  spaceSavingRate: 0.10,               // 공간 10% 절감 (레이아웃 최적화)
};

// 면적 기반 추천 플랜 가격
function getSubscriptionPrice(area: number): { monthly: number; annual: number; planName: string } {
  if (area <= 1500) return { monthly: 0, annual: 0, planName: 'Starter (무료)' };
  if (area <= 5000) return { monthly: 490000, annual: 4900000, planName: 'Growth' };
  return { monthly: 1490000, annual: 14900000, planName: 'Enterprise' };
}

export function calculateRoi(input: RoiInput): RoiResult {
  const { warehouseArea, employeeCount, monthlyPickings, currentErrorRate } = input;

  // === 현재 비용 산출 ===
  const currentAnnualLaborCost = employeeCount * BENCHMARK.avgMonthlySalary * 12;
  const monthlyErrors = monthlyPickings * (currentErrorRate / 100);
  const currentAnnualErrorCost = monthlyErrors * BENCHMARK.avgErrorCostPerCase * 12;
  const currentAnnualTotalCost = currentAnnualLaborCost + currentAnnualErrorCost;

  // === 개선 효과 ===
  const improvedErrorRate = currentErrorRate * (1 - BENCHMARK.errorReductionRate);
  const improvedPickingEfficiency = BENCHMARK.pickingEfficiencyGain * 100;
  const spaceSavingPercent = BENCHMARK.spaceSavingRate * 100;

  // === 절감액 산출 ===
  const annualLaborSaving = currentAnnualLaborCost * BENCHMARK.laborSavingRate;
  const annualErrorSaving = currentAnnualErrorCost * BENCHMARK.errorReductionRate;
  const annualSpaceSaving = warehouseArea * BENCHMARK.spaceSavingRate * BENCHMARK.avgRentPerM2Monthly * 12;
  const annualTotalSaving = annualLaborSaving + annualErrorSaving + annualSpaceSaving;

  // === 투자 회수 ===
  const plan = getSubscriptionPrice(warehouseArea);
  const annualSubscription = plan.annual || plan.monthly * 12;
  const netAnnualSaving = annualTotalSaving - annualSubscription;
  const roiPercent = annualSubscription > 0 ? (netAnnualSaving / annualSubscription) * 100 : 0;
  const paybackMonths = annualTotalSaving > 0
    ? Math.ceil(annualSubscription / (annualTotalSaving / 12))
    : 0;

  return {
    currentAnnualLaborCost,
    currentAnnualErrorCost,
    currentAnnualTotalCost,
    improvedErrorRate,
    improvedPickingEfficiency,
    spaceSavingPercent,
    annualLaborSaving,
    annualErrorSaving,
    annualSpaceSaving,
    annualTotalSaving,
    monthlySubscription: plan.monthly,
    annualSubscription,
    netAnnualSaving,
    roiPercent,
    paybackMonths,
  };
}

/**
 * ROI 결과를 PDF 다운로드용 HTML로 변환
 */
export function generateRoiPdfHtml(input: RoiInput, result: RoiResult): string {
  const fmt = (n: number) => n.toLocaleString('ko-KR');
  const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>HanVoxel ROI 분석 리포트</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Pretendard', -apple-system, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 24px; color: #1e40af; margin-bottom: 4px; }
  h2 { font-size: 16px; color: #334155; margin: 28px 0 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
  .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .card-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  .blue { color: #1e40af; }
  .green { color: #059669; }
  .highlight { background: #eff6ff; border-color: #bfdbfe; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .row:last-child { border-bottom: none; }
  .row-label { color: #64748b; }
  .row-value { font-weight: 600; font-variant-numeric: tabular-nums; }
  .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; }
  .logo { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .logo img { height: 28px; }
  .logo span { color: #1B7340; }
</style>
</head>
<body>
  <div class="logo"><img src="/logo-icon.svg" alt="" /><span>HanVoxel</span></div>
  <h1>ROI 분석 리포트</h1>
  <p class="subtitle">${date} 기준 · Spatial Digital Twin 도입 효과 분석</p>

  <h2>입력 조건</h2>
  <div class="grid">
    <div class="card"><div class="card-label">창고 면적</div><div class="card-value">${fmt(input.warehouseArea)} m²</div></div>
    <div class="card"><div class="card-label">직원 수</div><div class="card-value">${fmt(input.employeeCount)}명</div></div>
    <div class="card"><div class="card-label">월 피킹 건수</div><div class="card-value">${fmt(input.monthlyPickings)}건</div></div>
    <div class="card"><div class="card-label">현재 오류율</div><div class="card-value">${input.currentErrorRate}%</div></div>
  </div>

  <h2>예상 개선 효과</h2>
  <div class="grid">
    <div class="card highlight"><div class="card-label">피킹 효율 개선</div><div class="card-value green">+${result.improvedPickingEfficiency.toFixed(0)}%</div></div>
    <div class="card highlight"><div class="card-label">오류율 감소</div><div class="card-value green">${input.currentErrorRate}% → ${result.improvedErrorRate.toFixed(2)}%</div></div>
    <div class="card highlight"><div class="card-label">공간 절감</div><div class="card-value green">${result.spaceSavingPercent.toFixed(0)}%</div></div>
    <div class="card highlight"><div class="card-label">투자 회수 기간</div><div class="card-value blue">${result.paybackMonths}개월</div></div>
  </div>

  <h2>연간 비용 절감 상세</h2>
  <div class="card">
    <div class="row"><span class="row-label">인건비 절감 (동선 최적화)</span><span class="row-value">${fmt(result.annualLaborSaving)}원</span></div>
    <div class="row"><span class="row-label">오류 비용 절감 (반품/재작업 감소)</span><span class="row-value">${fmt(result.annualErrorSaving)}원</span></div>
    <div class="row"><span class="row-label">공간 절감 (레이아웃 최적화)</span><span class="row-value">${fmt(result.annualSpaceSaving)}원</span></div>
    <div class="row" style="border-top:2px solid #1e40af; margin-top:8px; padding-top:8px;"><span class="row-label" style="font-weight:700; color:#1e40af;">연간 총 절감 예상액</span><span class="row-value" style="font-size:18px; color:#1e40af;">${fmt(result.annualTotalSaving)}원</span></div>
  </div>

  <h2>투자 대비 수익 (ROI)</h2>
  <div class="card">
    <div class="row"><span class="row-label">연간 구독료</span><span class="row-value">${fmt(result.annualSubscription)}원</span></div>
    <div class="row"><span class="row-label">순 연간 절감액</span><span class="row-value green">${fmt(result.netAnnualSaving)}원</span></div>
    <div class="row"><span class="row-label">ROI</span><span class="row-value green">${result.roiPercent.toFixed(0)}%</span></div>
    <div class="row"><span class="row-label">투자 회수 기간</span><span class="row-value blue">${result.paybackMonths}개월</span></div>
  </div>

  <div class="footer">
    <p>본 리포트는 산업 평균 벤치마크 기반 추정치이며, 실제 결과는 운영 환경에 따라 달라질 수 있습니다.</p>
    <p style="margin-top:8px;">© ${new Date().getFullYear()} HanVoxel — Spatial Digital Twin Factory Platform</p>
  </div>
</body>
</html>`;
}
