/**
 * ROI 계산 엔진 — HanVoxel 도입 효과 분석
 *
 * 사용자가 직접 비용과 개선율을 입력하고,
 * 산업 평균 벤치마크는 참고값으로 제공
 */

// 산업 평균 벤치마크 (참고용 기본값)
export const BENCHMARK = {
  avgMonthlySalary: 3500000,          // 월 평균 인건비 (원)
  avgErrorCostPerCase: 25000,          // 오류당 평균 비용 (원)
  avgRentPerM2Monthly: 15000,          // m²당 월 임대료 (원)
  pickingEfficiencyGain: 25,           // 피킹 효율 개선율 (%)
  errorReductionRate: 60,              // 오류율 감소율 (%)
  laborSavingRate: 15,                 // 인건비 절감율 (%)
  spaceSavingRate: 10,                 // 공간 절감율 (%)
};

export interface RoiInput {
  // 창고 기본 정보
  warehouseArea: number;               // 창고 면적 (m²)
  monthlyPickings: number;             // 월 피킹 건수
  currentErrorRate: number;            // 현재 오류율 (%)

  // 직접 입력하는 비용
  annualLaborCost: number;             // 연간 인건비 (원)
  annualErrorCost: number;             // 연간 오류 비용 (원)
  monthlyRentPerM2: number;            // m²당 월 임대료 (원)

  // 사용자 편집 가능한 개선율 (%)
  laborSavingRate: number;             // 인건비 절감율 (%)
  errorReductionRate: number;          // 오류율 감소율 (%)
  spaceSavingRate: number;             // 공간 절감율 (%)
  pickingEfficiencyGain: number;       // 피킹 효율 개선율 (%)
}

export interface RoiResult {
  // 현재 비용
  currentAnnualLaborCost: number;
  currentAnnualErrorCost: number;
  currentAnnualTotalCost: number;

  // 개선 후
  improvedErrorRate: number;
  improvedPickingEfficiency: number;
  spaceSavingPercent: number;

  // 절감액
  annualLaborSaving: number;
  annualErrorSaving: number;
  annualSpaceSaving: number;
  annualTotalSaving: number;

  // 투자 회수
  monthlySubscription: number;
  annualSubscription: number;
  netAnnualSaving: number;
  roiPercent: number;
  paybackMonths: number;
}

// 실제 데이터 비교용 인터페이스
export interface ActualDataInput {
  actualAnnualLaborCost: number;       // 도입 후 실제 연간 인건비
  actualAnnualErrorCost: number;       // 도입 후 실제 오류 비용
  actualErrorRate: number;             // 도입 후 실제 오류율
  actualMonthlyPickings: number;       // 도입 후 실제 월 피킹 건수
}

export interface ActualDataResult {
  laborSaving: number;
  errorCostSaving: number;
  totalSaving: number;
  laborSavingPercent: number;
  errorCostSavingPercent: number;
  errorRateReduction: number;
  pickingChange: number;
  pickingChangePercent: number;
}

// 면적 기반 추천 플랜 가격
function getSubscriptionPrice(area: number): { monthly: number; annual: number; planName: string } {
  if (area <= 1500) return { monthly: 0, annual: 0, planName: 'Starter (무료)' };
  if (area <= 5000) return { monthly: 490000, annual: 4900000, planName: 'Growth' };
  return { monthly: 1490000, annual: 14900000, planName: 'Enterprise' };
}

export function calculateRoi(input: RoiInput): RoiResult {
  const {
    warehouseArea, currentErrorRate,
    annualLaborCost, annualErrorCost, monthlyRentPerM2,
    laborSavingRate, errorReductionRate, spaceSavingRate, pickingEfficiencyGain,
  } = input;

  // === 현재 비용 (사용자 직접 입력) ===
  const currentAnnualLaborCost = annualLaborCost;
  const currentAnnualErrorCost = annualErrorCost;
  const currentAnnualTotalCost = currentAnnualLaborCost + currentAnnualErrorCost;

  // === 개선 효과 ===
  const improvedErrorRate = currentErrorRate * (1 - errorReductionRate / 100);
  const improvedPickingEfficiency = pickingEfficiencyGain;
  const spaceSavingPercent = spaceSavingRate;

  // === 절감액 산출 ===
  const annualLaborSaving = currentAnnualLaborCost * (laborSavingRate / 100);
  const annualErrorSaving = currentAnnualErrorCost * (errorReductionRate / 100);
  const annualSpaceSaving = warehouseArea * (spaceSavingRate / 100) * monthlyRentPerM2 * 12;
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

// 실제 데이터 비교 계산
export function calculateActualSaving(
  beforeInput: RoiInput,
  actual: ActualDataInput,
): ActualDataResult {
  const laborSaving = beforeInput.annualLaborCost - actual.actualAnnualLaborCost;
  const errorCostSaving = beforeInput.annualErrorCost - actual.actualAnnualErrorCost;
  const totalSaving = laborSaving + errorCostSaving;

  const laborSavingPercent = beforeInput.annualLaborCost > 0
    ? (laborSaving / beforeInput.annualLaborCost) * 100
    : 0;
  const errorCostSavingPercent = beforeInput.annualErrorCost > 0
    ? (errorCostSaving / beforeInput.annualErrorCost) * 100
    : 0;
  const errorRateReduction = beforeInput.currentErrorRate - actual.actualErrorRate;
  const pickingChange = actual.actualMonthlyPickings - beforeInput.monthlyPickings;
  const pickingChangePercent = beforeInput.monthlyPickings > 0
    ? (pickingChange / beforeInput.monthlyPickings) * 100
    : 0;

  return {
    laborSaving,
    errorCostSaving,
    totalSaving,
    laborSavingPercent,
    errorCostSavingPercent,
    errorRateReduction,
    pickingChange,
    pickingChangePercent,
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
  .logo span { color: #1B7340; }
</style>
</head>
<body>
  <div class="logo"><span>HanVoxel</span></div>
  <h1>ROI 분석 리포트</h1>
  <p class="subtitle">${date} 기준 · Spatial Digital Twin 도입 효과 분석</p>

  <h2>입력 조건</h2>
  <div class="grid">
    <div class="card"><div class="card-label">창고 면적</div><div class="card-value">${fmt(input.warehouseArea)} m²</div></div>
    <div class="card"><div class="card-label">월 피킹 건수</div><div class="card-value">${fmt(input.monthlyPickings)}건</div></div>
    <div class="card"><div class="card-label">연간 인건비</div><div class="card-value">${fmt(input.annualLaborCost)}원</div></div>
    <div class="card"><div class="card-label">연간 오류 비용</div><div class="card-value">${fmt(input.annualErrorCost)}원</div></div>
    <div class="card"><div class="card-label">현재 오류율</div><div class="card-value">${input.currentErrorRate}%</div></div>
    <div class="card"><div class="card-label">적용 개선율</div><div class="card-value">인건비 ${input.laborSavingRate}% / 오류 ${input.errorReductionRate}% / 공간 ${input.spaceSavingRate}%</div></div>
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
    <p>본 리포트는 사용자 입력 기반 추정치이며, 실제 결과는 운영 환경에 따라 달라질 수 있습니다.</p>
    <p style="margin-top:8px;">© ${new Date().getFullYear()} HanVoxel — Spatial Digital Twin Factory Platform</p>
  </div>
</body>
</html>`;
}
