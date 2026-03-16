import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { calculateRoi, calculateActualSaving, generateRoiPdfHtml, BENCHMARK } from '../../utils/roi-calculator';
import type { RoiInput, ActualDataInput } from '../../utils/roi-calculator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, Calculator, TrendingUp, Clock, Target, RotateCcw, Info, BarChart3 } from 'lucide-react';

// ─── 색상 상수 ───
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  focusBorder: '#2D7DD2',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
  green: '#3FB950',
  greenGradientStart: '#0D4429',
  greenGradientEnd: '#1B7A3D',
  blue: '#2D7DD2',
  purple: '#A371F7',
  orange: '#D29922',
  red: '#F85149',
  chartGrid: '#21262D',
  barColors: ['#2D7DD2', '#3FB950', '#A371F7'],
};

interface RoiCalculatorProps {
  onBack: () => void;
}

// ─── 애니메이션 카운터 훅 ───
function useAnimatedValue(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

const fmt = (n: number) => n.toLocaleString('ko-KR');

// ─── 입력 필드 (문자열 기반) ───
function InputField({
  label, unit, rawValue, onChange, hint, step = '1', benchmark,
}: {
  label: string; unit: string; rawValue: string;
  onChange: (v: string) => void; hint?: string; step?: string;
  benchmark?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="number" step={step} min={0} value={rawValue}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '10px 50px 10px 14px', fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            color: COLORS.textPrimary, backgroundColor: COLORS.bg,
            border: `1px solid ${focused ? COLORS.focusBorder : COLORS.border}`,
            borderRadius: 8, outline: 'none', transition: 'border-color 0.2s ease',
          }}
        />
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 12, color: COLORS.textMuted, fontWeight: 500, pointerEvents: 'none',
        }}>{unit}</span>
      </div>
      {(hint || benchmark) && (
        <div style={{ marginTop: 4, fontSize: 11, color: COLORS.textMuted, lineHeight: 1.4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {hint && <span>{hint}</span>}
          {benchmark && <span style={{ color: COLORS.orange }}>참고: {benchmark}</span>}
        </div>
      )}
    </div>
  );
}

// ─── KPI 메트릭 카드 ───
function MetricCard({ label, value, changeText, changeDirection, icon, accentColor }: {
  label: string; value: string; changeText?: string; changeDirection?: 'up' | 'down';
  icon: React.ReactNode; accentColor: string;
}) {
  return (
    <div style={{
      backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 10, padding: '20px 16px 16px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: accentColor }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ color: accentColor, opacity: 0.9 }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{value}</div>
      {changeText && (
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: changeDirection === 'up' ? COLORS.green : COLORS.red }}>
          {changeDirection === 'up' ? '▲' : '▼'} {changeText}
        </div>
      )}
    </div>
  );
}

// ─── 상세 항목 행 ───
function DetailRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: bold ? '14px 0 6px' : '10px 0',
      borderTop: bold ? `1px solid ${COLORS.border}` : 'none',
      borderBottom: bold ? 'none' : `1px solid ${COLORS.chartGrid}`,
    }}>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 400, color: bold ? COLORS.textPrimary : COLORS.textSecondary }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 500, fontFamily: "'JetBrains Mono', monospace", color: color ?? COLORS.textPrimary }}>{value}</span>
    </div>
  );
}

// ─── 차트 커스텀 툴팁 ───
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
      <p style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, fontFamily: 'monospace' }}>{fmt(payload[0].value)}원</p>
    </div>
  );
}

// ─── 기본 입력값 ───
const DEFAULT_INPUT: RoiInput = {
  warehouseArea: 3000,
  monthlyPickings: 10000,
  currentErrorRate: 2.5,
  annualLaborCost: 630000000,    // 15명 x 350만 x 12개월
  annualErrorCost: 75000000,     // 10000건 x 2.5% x 25000원 x 12개월
  monthlyRentPerM2: 15000,
  laborSavingRate: BENCHMARK.laborSavingRate,
  errorReductionRate: BENCHMARK.errorReductionRate,
  spaceSavingRate: BENCHMARK.spaceSavingRate,
  pickingEfficiencyGain: BENCHMARK.pickingEfficiencyGain,
};

const DEFAULT_ACTUAL: ActualDataInput = {
  actualAnnualLaborCost: 0,
  actualAnnualErrorCost: 0,
  actualErrorRate: 0,
  actualMonthlyPickings: 0,
};

/**
 * ROI 계산기 — HanVoxel 도입 효과 분석
 */
export function RoiCalculator({ onBack: _onBack }: RoiCalculatorProps) {
  // 문자열 기반 입력 상태
  const [rawInput, setRawInput] = useState({
    warehouseArea: String(DEFAULT_INPUT.warehouseArea),
    monthlyPickings: String(DEFAULT_INPUT.monthlyPickings),
    currentErrorRate: String(DEFAULT_INPUT.currentErrorRate),
    annualLaborCost: String(DEFAULT_INPUT.annualLaborCost),
    annualErrorCost: String(DEFAULT_INPUT.annualErrorCost),
    monthlyRentPerM2: String(DEFAULT_INPUT.monthlyRentPerM2),
    laborSavingRate: String(DEFAULT_INPUT.laborSavingRate),
    errorReductionRate: String(DEFAULT_INPUT.errorReductionRate),
    spaceSavingRate: String(DEFAULT_INPUT.spaceSavingRate),
    pickingEfficiencyGain: String(DEFAULT_INPUT.pickingEfficiencyGain),
  });

  const [showResult, setShowResult] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [showActual, setShowActual] = useState(false);

  // 실제 데이터 입력
  const [rawActual, setRawActual] = useState({
    actualAnnualLaborCost: '',
    actualAnnualErrorCost: '',
    actualErrorRate: '',
    actualMonthlyPickings: '',
  });

  const input: RoiInput = useMemo(() => ({
    warehouseArea: parseFloat(rawInput.warehouseArea) || 0,
    monthlyPickings: parseFloat(rawInput.monthlyPickings) || 0,
    currentErrorRate: parseFloat(rawInput.currentErrorRate) || 0,
    annualLaborCost: parseFloat(rawInput.annualLaborCost) || 0,
    annualErrorCost: parseFloat(rawInput.annualErrorCost) || 0,
    monthlyRentPerM2: parseFloat(rawInput.monthlyRentPerM2) || 0,
    laborSavingRate: parseFloat(rawInput.laborSavingRate) || 0,
    errorReductionRate: parseFloat(rawInput.errorReductionRate) || 0,
    spaceSavingRate: parseFloat(rawInput.spaceSavingRate) || 0,
    pickingEfficiencyGain: parseFloat(rawInput.pickingEfficiencyGain) || 0,
  }), [rawInput]);

  const actualInput: ActualDataInput = useMemo(() => ({
    actualAnnualLaborCost: parseFloat(rawActual.actualAnnualLaborCost) || 0,
    actualAnnualErrorCost: parseFloat(rawActual.actualAnnualErrorCost) || 0,
    actualErrorRate: parseFloat(rawActual.actualErrorRate) || 0,
    actualMonthlyPickings: parseFloat(rawActual.actualMonthlyPickings) || 0,
  }), [rawActual]);

  const setField = useCallback((field: string, value: string) => {
    setRawInput((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setActualField = useCallback((field: string, value: string) => {
    setRawActual((prev) => ({ ...prev, [field]: value }));
  }, []);

  const result = useMemo(() => calculateRoi(input), [input]);
  const actualResult = useMemo(() => {
    if (!showActual) return null;
    return calculateActualSaving(input, actualInput);
  }, [input, actualInput, showActual]);

  // 애니메이션 값
  const animatedTotalSaving = useAnimatedValue(showResult ? result.annualTotalSaving : 0, 1000);
  const animatedLaborSaving = useAnimatedValue(showResult ? result.annualLaborSaving : 0, 800);
  const animatedErrorSaving = useAnimatedValue(showResult ? result.annualErrorSaving : 0, 800);
  const animatedSpaceSaving = useAnimatedValue(showResult ? result.annualSpaceSaving : 0, 800);
  const animatedNetSaving = useAnimatedValue(showResult ? result.netAnnualSaving : 0, 900);
  const animatedRoi = useAnimatedValue(showResult ? Math.round(result.roiPercent) : 0, 700);
  const animatedPayback = useAnimatedValue(showResult ? result.paybackMonths : 0, 600);
  const animatedEfficiency = useAnimatedValue(showResult ? Math.round(result.improvedPickingEfficiency) : 0, 700);

  const handlePdfDownload = () => {
    const html = generateRoiPdfHtml(input, result);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const isValid =
    input.warehouseArea > 0 &&
    input.monthlyPickings > 0 &&
    input.annualLaborCost > 0;

  const chartData = [
    { name: '인건비 절감', value: result.annualLaborSaving },
    { name: '오류 비용 절감', value: result.annualErrorSaving },
    { name: '공간 절감', value: result.annualSpaceSaving },
  ];

  // 실제 데이터 유효성
  const isActualValid = actualInput.actualAnnualLaborCost > 0 || actualInput.actualAnnualErrorCost > 0;

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: COLORS.bg,
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* ─── 헤더 (돌아가기 버튼 제거) ─── */}
      <div style={{
        borderBottom: `1px solid ${COLORS.border}`,
        backgroundColor: 'rgba(22, 27, 34, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '16px 24px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
              <span style={{ color: COLORS.blue }}>Han</span>Voxel
            </span>
            <span style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: 400 }}>ROI 계산기</span>
          </div>
          <div style={{ color: COLORS.textMuted }}><Calculator size={20} /></div>
        </div>
      </div>

      {/* ─── 메인 컨텐츠 ─── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>
        {!showResult ? (
          /* ═══ 입력 폼 ═══ */
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 8 }}>
                도입 효과 분석
              </h1>
              <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                현재 창고 운영 비용과 예상 개선율을 입력하면 HanVoxel 도입 시 절감 효과를 계산합니다
              </p>
            </div>

            {/* 3컬럼 레이아웃 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, alignItems: 'start' }}>

              {/* ── 1열: 창고 기본 정보 + 비용 ── */}
              <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '24px 24px 20px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 20 }}>
                  창고 기본 정보
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <InputField
                    label="창고 면적" unit="m²"
                    rawValue={rawInput.warehouseArea}
                    onChange={(v) => setField('warehouseArea', v)}
                  />
                  <InputField
                    label="월 피킹 건수" unit="건/월"
                    rawValue={rawInput.monthlyPickings}
                    onChange={(v) => setField('monthlyPickings', v)}
                    hint="월 평균 출고 처리 건수"
                  />
                  <InputField
                    label="현재 오류율" unit="%"
                    rawValue={rawInput.currentErrorRate}
                    onChange={(v) => setField('currentErrorRate', v)}
                    hint="피킹 오류, 오배송, 불일치 비율"
                    step="0.1"
                  />
                  <div style={{ height: 1, background: COLORS.border, margin: '4px 0' }} />
                  <InputField
                    label="연간 인건비" unit="원"
                    rawValue={rawInput.annualLaborCost}
                    onChange={(v) => setField('annualLaborCost', v)}
                    hint="창고 운영 인력 전체 연봉 합계"
                    benchmark={`업계 평균 ${fmt(BENCHMARK.avgMonthlySalary)}원/인·월`}
                  />
                  <InputField
                    label="연간 오류 비용" unit="원"
                    rawValue={rawInput.annualErrorCost}
                    onChange={(v) => setField('annualErrorCost', v)}
                    hint="반품, 재작업, 고객불만 처리 비용"
                    benchmark={`업계 평균 ${fmt(BENCHMARK.avgErrorCostPerCase)}원/건`}
                  />
                  <InputField
                    label="m²당 월 임대료" unit="원/m²"
                    rawValue={rawInput.monthlyRentPerM2}
                    onChange={(v) => setField('monthlyRentPerM2', v)}
                    benchmark={`업계 평균 ${fmt(BENCHMARK.avgRentPerM2Monthly)}원`}
                  />
                </div>
              </div>

              {/* ── 2열: 예상 개선율 ── */}
              <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '24px 24px 20px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 6 }}>
                  예상 개선율
                </h3>
                <p style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
                  기본값은 산업 평균 벤치마크입니다. 상황에 맞게 수정하세요.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <InputField
                    label="인건비 절감율" unit="%"
                    rawValue={rawInput.laborSavingRate}
                    onChange={(v) => setField('laborSavingRate', v)}
                    hint="동선 최적화로 인건비 절감"
                    benchmark={`업계 평균 ${BENCHMARK.laborSavingRate}%`}
                    step="0.1"
                  />
                  <InputField
                    label="오류율 감소율" unit="%"
                    rawValue={rawInput.errorReductionRate}
                    onChange={(v) => setField('errorReductionRate', v)}
                    hint="바코드 스캔 + 위치 검증으로 오류 감소"
                    benchmark={`업계 평균 ${BENCHMARK.errorReductionRate}%`}
                    step="0.1"
                  />
                  <InputField
                    label="공간 절감율" unit="%"
                    rawValue={rawInput.spaceSavingRate}
                    onChange={(v) => setField('spaceSavingRate', v)}
                    hint="레이아웃 최적화로 불필요 면적 절감"
                    benchmark={`업계 평균 ${BENCHMARK.spaceSavingRate}%`}
                    step="0.1"
                  />
                  <InputField
                    label="피킹 효율 개선" unit="%"
                    rawValue={rawInput.pickingEfficiencyGain}
                    onChange={(v) => setField('pickingEfficiencyGain', v)}
                    hint="3D 동선 최적화로 피킹 속도 향상"
                    benchmark={`업계 평균 ${BENCHMARK.pickingEfficiencyGain}%`}
                    step="0.1"
                  />
                </div>

                {/* 분석 버튼 */}
                <button
                  onClick={() => setShowResult(true)}
                  disabled={!isValid}
                  style={{
                    width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600,
                    color: '#FFFFFF', backgroundColor: isValid ? COLORS.blue : COLORS.border,
                    border: 'none', borderRadius: 10,
                    cursor: isValid ? 'pointer' : 'not-allowed', opacity: isValid ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24,
                  }}
                  onMouseEnter={(e) => { if (isValid) e.currentTarget.style.backgroundColor = '#3A8FE0'; }}
                  onMouseLeave={(e) => { if (isValid) e.currentTarget.style.backgroundColor = COLORS.blue; }}
                >
                  <Calculator size={18} />
                  ROI 분석하기
                </button>
              </div>

              {/* ── 3열: 계산 공식 안내 ── */}
              <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '24px 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Info size={16} style={{ color: COLORS.blue }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>계산 공식 안내</h3>
                </div>

                {[
                  { label: '인건비 절감', formula: '연간 인건비 × 인건비 절감율(%)', desc: '동선 최적화로 작업 효율 향상' },
                  { label: '오류 비용 절감', formula: '연간 오류 비용 × 오류율 감소율(%)', desc: '바코드 스캔 + 위치 검증으로 오류 감소' },
                  { label: '공간 절감', formula: '면적 × 공간 절감율(%) × m²당 임대료 × 12개월', desc: '레이아웃 최적화로 불필요 면적 절감' },
                  { label: 'ROI (%)', formula: '(총 절감액 - 연 구독료) / 연 구독료 × 100', desc: '투자 대비 수익률' },
                  { label: '투자 회수 기간', formula: '연 구독료 / (총 절감액 / 12)', desc: '구독 비용 회수까지 걸리는 개월 수' },
                ].map(({ label, formula, desc }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 4 }}>{label}</div>
                    <code style={{
                      display: 'block', fontSize: 11,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: COLORS.blue, backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`, borderRadius: 6,
                      padding: '6px 10px', marginBottom: 4, lineHeight: 1.5,
                    }}>{formula}</code>
                    <p style={{ fontSize: 11, color: COLORS.textMuted }}>{desc}</p>
                  </div>
                ))}

                <div style={{ height: 1, background: COLORS.border, margin: '12px 0' }} />

                {/* 구독 플랜 기준 */}
                <div style={{
                  backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}`,
                  borderRadius: 8, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.purple, marginBottom: 8 }}>구독 플랜 기준</div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.8 }}>
                    {[
                      { range: '~1,500m²', plan: 'Starter (무료)', color: COLORS.green },
                      { range: '1,500~5,000m²', plan: 'Growth (49만원/월)', color: COLORS.textPrimary },
                      { range: '5,000m² 초과', plan: 'Enterprise (149만원/월)', color: COLORS.textPrimary },
                    ].map(({ range, plan, color }) => (
                      <div key={range} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{range}</span>
                        <span style={{ color }}>{plan}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ═══ 결과 화면 ═══ */
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 6 }}>분석 결과</h2>
              <p style={{ fontSize: 13, color: COLORS.textSecondary }}>
                {fmt(input.warehouseArea)} m² · 월 {fmt(input.monthlyPickings)}건 · 인건비 {fmt(input.annualLaborCost)}원 기준
              </p>
            </div>

            {/* 연간 절감 예상액 */}
            <div style={{
              background: `linear-gradient(135deg, ${COLORS.greenGradientStart} 0%, ${COLORS.greenGradientEnd} 100%)`,
              border: '1px solid rgba(63, 185, 80, 0.3)', borderRadius: 14,
              padding: '32px 28px', marginBottom: 28, textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', backgroundColor: 'rgba(63, 185, 80, 0.08)' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>연간 절감 예상액</p>
              <p style={{ fontSize: 42, fontWeight: 800, color: '#FFFFFF', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>
                {fmt(animatedTotalSaving)}<span style={{ fontSize: 22, fontWeight: 600, marginLeft: 4 }}>원</span>
              </p>
              <p style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>월 약 {fmt(Math.round(animatedTotalSaving / 12))}원 절감</p>
            </div>

            {/* KPI 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
              <MetricCard label="순 연간 절감" value={`${fmt(animatedNetSaving)}원`} changeText="구독료 차감 후" changeDirection="up" icon={<TrendingUp size={16} />} accentColor={COLORS.green} />
              <MetricCard label="피킹 효율" value={`+${animatedEfficiency}%`} changeText="동선 최적화" changeDirection="up" icon={<Target size={16} />} accentColor={COLORS.blue} />
              <MetricCard label="오류율 감소" value={`${input.currentErrorRate}% → ${result.improvedErrorRate.toFixed(2)}%`} changeText={`${(input.currentErrorRate - result.improvedErrorRate).toFixed(2)}%p 감소`} changeDirection="down" icon={<Target size={16} />} accentColor={COLORS.orange} />
              <MetricCard label="투자 회수" value={animatedPayback > 0 ? `${animatedPayback}개월` : '무료'} changeText={`ROI ${animatedRoi}%`} changeDirection="up" icon={<Clock size={16} />} accentColor={COLORS.purple} />
            </div>

            {/* 차트 + 계산식 2컬럼 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              {/* 바 차트 */}
              <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '24px 20px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 20 }}>항목별 연간 절감액</h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 20, left: 20, bottom: 8 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chartGrid} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: COLORS.textSecondary, fontSize: 12 }} axisLine={{ stroke: COLORS.chartGrid }} tickLine={false} />
                      <YAxis tick={{ fill: COLORS.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                        {chartData.map((_e, i) => <Cell key={`c-${i}`} fill={COLORS.barColors[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 계산 상세 */}
              <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>계산 상세</h3>
                  <button onClick={() => setShowFormulas(!showFormulas)} style={{ fontSize: 11, fontWeight: 600, color: COLORS.blue, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}>
                    {showFormulas ? '계산식 숨기기' : '계산식 보기'}
                  </button>
                </div>

                {[
                  { label: '인건비 절감', value: result.annualLaborSaving, formula: `= ${fmt(input.annualLaborCost)}원 × ${input.laborSavingRate}%` },
                  { label: '오류 비용 절감', value: result.annualErrorSaving, formula: `= ${fmt(input.annualErrorCost)}원 × ${input.errorReductionRate}%` },
                  { label: '공간 절감', value: result.annualSpaceSaving, formula: `= ${fmt(input.warehouseArea)}m² × ${input.spaceSavingRate}% × ${fmt(input.monthlyRentPerM2)}원 × 12개월` },
                ].map(({ label, value, formula }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.green, fontFamily: 'monospace' }}>{fmt(value)}원</span>
                    </div>
                    {showFormulas && <code style={{ fontSize: 11, color: COLORS.blue, fontFamily: 'monospace', display: 'block', padding: '4px 0' }}>{formula}</code>}
                  </div>
                ))}

                <div style={{ height: 1, background: COLORS.border, margin: '8px 0 12px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>총 절감 예상액</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.green, fontFamily: 'monospace' }}>{fmt(result.annualTotalSaving)}원</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>(-) 연 구독료</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: 'monospace' }}>{result.annualSubscription > 0 ? `${fmt(result.annualSubscription)}원` : '무료'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>순 연간 절감</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.green, fontFamily: 'monospace' }}>{fmt(result.netAnnualSaving)}원</span>
                </div>
                {showFormulas && (
                  <div style={{ marginTop: 8 }}>
                    <code style={{ fontSize: 11, color: COLORS.blue, fontFamily: 'monospace', display: 'block', padding: '4px 0' }}>
                      ROI = ({fmt(result.annualTotalSaving)} - {fmt(result.annualSubscription)}) / {fmt(result.annualSubscription)} × 100 = {result.roiPercent.toFixed(0)}%
                    </code>
                    <code style={{ fontSize: 11, color: COLORS.blue, fontFamily: 'monospace', display: 'block', padding: '4px 0' }}>
                      회수기간 = {fmt(result.annualSubscription)} / ({fmt(result.annualTotalSaving)} / 12) = {result.paybackMonths}개월
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* 비용 + ROI 2컬럼 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '20px 18px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: COLORS.textSecondary, marginBottom: 16 }}>입력된 현재 연간 비용</h3>
                <DetailRow label="인건비" value={`${fmt(result.currentAnnualLaborCost)}원`} />
                <DetailRow label="오류 비용" value={`${fmt(result.currentAnnualErrorCost)}원`} />
                <DetailRow label="총 비용" value={`${fmt(result.currentAnnualTotalCost)}원`} bold />
              </div>
              <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '20px 18px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: COLORS.blue, marginBottom: 16 }}>투자 대비 수익 (ROI)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: '월 구독료', value: result.monthlySubscription > 0 ? `${fmt(result.monthlySubscription)}원` : '무료', color: COLORS.textPrimary },
                    { label: '연 구독료', value: result.annualSubscription > 0 ? `${fmt(result.annualSubscription)}원` : '무료', color: COLORS.textPrimary },
                    { label: '순 연간 절감', value: `${fmt(animatedNetSaving)}원`, color: COLORS.green },
                    { label: 'ROI', value: animatedRoi > 0 ? `${animatedRoi}%` : '-', color: COLORS.blue },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <span style={{ fontSize: 11, color: COLORS.textMuted }}>{label}</span>
                      <p style={{ marginTop: 4, fontSize: 15, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ 실제 데이터 비교 섹션 ═══ */}
            <div style={{
              backgroundColor: COLORS.card, border: `1px solid ${showActual ? COLORS.blue : COLORS.border}`,
              borderRadius: 12, padding: '24px 24px', marginBottom: 28,
              transition: 'border-color 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showActual ? 20 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BarChart3 size={18} style={{ color: COLORS.blue }} />
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>실제 데이터 비교</h3>
                    <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>HanVoxel 도입 후 실제 운영 데이터를 입력하여 절감 효과를 비교합니다</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowActual(!showActual)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${showActual ? COLORS.blue : COLORS.border}`,
                    backgroundColor: showActual ? `${COLORS.blue}20` : 'transparent',
                    color: showActual ? COLORS.blue : COLORS.textSecondary,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  {showActual ? '접기' : '비교하기'}
                </button>
              </div>

              {showActual && (
                <>
                  {/* 도입 전 vs 도입 후 비교 입력 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                    {/* 도입 전 (입력값에서 가져옴) */}
                    <div style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '16px 16px 12px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textSecondary, marginBottom: 14 }}>도입 전 (입력값)</div>
                      {[
                        { label: '연간 인건비', value: `${fmt(input.annualLaborCost)}원` },
                        { label: '연간 오류 비용', value: `${fmt(input.annualErrorCost)}원` },
                        { label: '오류율', value: `${input.currentErrorRate}%` },
                        { label: '월 피킹 건수', value: `${fmt(input.monthlyPickings)}건` },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.chartGrid}` }}>
                          <span style={{ fontSize: 12, color: COLORS.textMuted }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary, fontFamily: 'monospace' }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* 도입 후 (직접 입력) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.blue, marginBottom: 2 }}>도입 후 (실제 데이터 입력)</div>
                      <InputField label="연간 인건비" unit="원" rawValue={rawActual.actualAnnualLaborCost} onChange={(v) => setActualField('actualAnnualLaborCost', v)} hint="도입 후 실제 연간 인건비" />
                      <InputField label="연간 오류 비용" unit="원" rawValue={rawActual.actualAnnualErrorCost} onChange={(v) => setActualField('actualAnnualErrorCost', v)} hint="도입 후 실제 오류 비용" />
                      <InputField label="오류율" unit="%" rawValue={rawActual.actualErrorRate} onChange={(v) => setActualField('actualErrorRate', v)} step="0.1" hint="도입 후 실제 오류율" />
                      <InputField label="월 피킹 건수" unit="건/월" rawValue={rawActual.actualMonthlyPickings} onChange={(v) => setActualField('actualMonthlyPickings', v)} hint="도입 후 실제 월 피킹 건수" />
                    </div>
                  </div>

                  {/* 비교 결과 */}
                  {isActualValid && actualResult && (
                    <div style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '20px 20px' }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: COLORS.green, marginBottom: 16 }}>실제 절감 비교 결과</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                        {[
                          { label: '인건비 절감', value: `${fmt(actualResult.laborSaving)}원`, sub: `${actualResult.laborSavingPercent.toFixed(1)}% 감소`, positive: actualResult.laborSaving > 0 },
                          { label: '오류 비용 절감', value: `${fmt(actualResult.errorCostSaving)}원`, sub: `${actualResult.errorCostSavingPercent.toFixed(1)}% 감소`, positive: actualResult.errorCostSaving > 0 },
                          { label: '총 절감', value: `${fmt(actualResult.totalSaving)}원`, sub: '인건비 + 오류 비용', positive: actualResult.totalSaving > 0 },
                          { label: '오류율 변화', value: `${actualResult.errorRateReduction >= 0 ? '-' : '+'}${Math.abs(actualResult.errorRateReduction).toFixed(2)}%p`, sub: `${input.currentErrorRate}% → ${actualInput.actualErrorRate}%`, positive: actualResult.errorRateReduction > 0 },
                        ].map(({ label, value, sub, positive }) => (
                          <div key={label}>
                            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: positive ? COLORS.green : COLORS.red }}>{value}</div>
                            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* 예측 vs 실제 비교 */}
                      <div style={{ height: 1, background: COLORS.border, margin: '8px 0 16px' }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 10 }}>예측 vs 실제 비교</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                          { label: '인건비 절감', predicted: result.annualLaborSaving, actual: actualResult.laborSaving },
                          { label: '오류 비용 절감', predicted: result.annualErrorSaving, actual: actualResult.errorCostSaving },
                          { label: '총 절감', predicted: result.annualTotalSaving, actual: actualResult.totalSaving },
                        ].map(({ label, predicted, actual }) => {
                          const diff = actual - predicted;
                          const diffPercent = predicted > 0 ? (diff / predicted) * 100 : 0;
                          return (
                            <div key={label} style={{ backgroundColor: COLORS.card, borderRadius: 8, padding: '10px 12px', border: `1px solid ${COLORS.border}` }}>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>{label}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 11, color: COLORS.textMuted }}>예측</span>
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: COLORS.textSecondary }}>{fmt(predicted)}원</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 11, color: COLORS.textMuted }}>실제</span>
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: COLORS.textPrimary, fontWeight: 600 }}>{fmt(actual)}원</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, color: COLORS.textMuted }}>차이</span>
                                <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: diff >= 0 ? COLORS.green : COLORS.red }}>
                                  {diff >= 0 ? '+' : ''}{fmt(diff)}원 ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(0)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 액션 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              <button
                onClick={handlePdfDownload}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                  fontSize: 14, fontWeight: 600, color: '#FFFFFF', backgroundColor: COLORS.blue,
                  border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3A8FE0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = COLORS.blue; }}
              >
                <Download size={16} /> PDF 다운로드
              </button>
              <button
                onClick={() => setShowResult(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                  fontSize: 14, fontWeight: 500, color: COLORS.textSecondary,
                  backgroundColor: 'transparent', border: `1px solid ${COLORS.border}`,
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = COLORS.card; e.currentTarget.style.color = COLORS.textPrimary; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = COLORS.textSecondary; }}
              >
                <RotateCcw size={16} /> 다시 계산
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5 }}>
              본 분석은 사용자 입력 기반 추정치이며, 실제 결과는 운영 환경에 따라 달라질 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
