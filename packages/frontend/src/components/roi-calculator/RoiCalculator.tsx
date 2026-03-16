import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { calculateRoi, generateRoiPdfHtml } from '../../utils/roi-calculator';
import type { RoiInput } from '../../utils/roi-calculator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, Calculator, TrendingUp, Clock, Target, ArrowLeft, RotateCcw, Info } from 'lucide-react';

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
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return value;
}

// ─── 숫자 포맷 ───
const fmt = (n: number) => n.toLocaleString('ko-KR');

// ─── 입력 필드 컴포넌트 (문자열 기반 — 전체 삭제 가능) ───
function InputField({
  label,
  unit,
  rawValue,
  onChange,
  hint,
  step = '1',
}: {
  label: string;
  unit: string;
  rawValue: string;
  onChange: (v: string) => void;
  hint: string;
  step?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.textPrimary,
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          step={step}
          min={0}
          value={rawValue}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '12px 60px 12px 16px',
            fontSize: 15,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            color: COLORS.textPrimary,
            backgroundColor: COLORS.bg,
            border: `1px solid ${focused ? COLORS.focusBorder : COLORS.border}`,
            borderRadius: 8,
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 12,
            color: COLORS.textMuted,
            fontWeight: 500,
            pointerEvents: 'none',
          }}
        >
          {unit}
        </span>
      </div>
      <p style={{ marginTop: 6, fontSize: 11, color: COLORS.textMuted, lineHeight: 1.4 }}>
        {hint}
      </p>
    </div>
  );
}

// ─── KPI 메트릭 카드 ───
function MetricCard({
  label,
  value,
  changeText,
  changeDirection,
  icon,
  accentColor,
}: {
  label: string;
  value: string;
  changeText?: string;
  changeDirection?: 'up' | 'down';
  icon: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: '20px 16px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: accentColor,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ color: accentColor, opacity: 0.9 }}>{icon}</div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: COLORS.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {changeText && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            fontWeight: 600,
            color: changeDirection === 'up' ? COLORS.green : COLORS.red,
          }}
        >
          {changeDirection === 'up' ? '▲' : '▼'} {changeText}
        </div>
      )}
    </div>
  );
}

// ─── 상세 항목 행 ───
function DetailRow({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: bold ? '14px 0 6px' : '10px 0',
        borderTop: bold ? `1px solid ${COLORS.border}` : 'none',
        borderBottom: bold ? 'none' : `1px solid ${COLORS.chartGrid}`,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: bold ? 700 : 400,
          color: bold ? COLORS.textPrimary : COLORS.textSecondary,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: bold ? 700 : 500,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          color: color ?? COLORS.textPrimary,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── 차트 커스텀 툴팁 ───
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, fontFamily: 'monospace' }}>
        {fmt(payload[0].value)}원
      </p>
    </div>
  );
}

// ─── 공식 설명 행 ───
function FormulaRow({ label, formula, description }: { label: string; formula: string; description: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 4 }}>
        {label}
      </div>
      <code
        style={{
          display: 'block',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          color: COLORS.blue,
          backgroundColor: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: '8px 12px',
          marginBottom: 4,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {formula}
      </code>
      <p style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

// ─── 기본 입력값 ───
const DEFAULT_INPUT: RoiInput = {
  warehouseArea: 3000,
  employeeCount: 15,
  monthlyPickings: 10000,
  currentErrorRate: 2.5,
};

/**
 * ROI 계산기 — HanVoxel 도입 효과 분석 (웹 최적화 레이아웃)
 */
export function RoiCalculator({ onBack }: RoiCalculatorProps) {
  // 문자열 기반 입력 상태 (전체 삭제 가능)
  const [rawInput, setRawInput] = useState({
    warehouseArea: String(DEFAULT_INPUT.warehouseArea),
    employeeCount: String(DEFAULT_INPUT.employeeCount),
    monthlyPickings: String(DEFAULT_INPUT.monthlyPickings),
    currentErrorRate: String(DEFAULT_INPUT.currentErrorRate),
  });
  const [showResult, setShowResult] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  // 문자열 → 숫자 변환 (빈 문자열은 0)
  const input: RoiInput = useMemo(() => ({
    warehouseArea: parseFloat(rawInput.warehouseArea) || 0,
    employeeCount: parseFloat(rawInput.employeeCount) || 0,
    monthlyPickings: parseFloat(rawInput.monthlyPickings) || 0,
    currentErrorRate: parseFloat(rawInput.currentErrorRate) || 0,
  }), [rawInput]);

  const setField = useCallback((field: keyof RoiInput, value: string) => {
    setRawInput((prev) => ({ ...prev, [field]: value }));
  }, []);

  const result = useMemo(() => calculateRoi(input), [input]);

  // 애니메이션 카운터 값
  const animatedTotalSaving = useAnimatedValue(showResult ? result.annualTotalSaving : 0, 1000);
  const animatedLaborSaving = useAnimatedValue(showResult ? result.annualLaborSaving : 0, 800);
  const animatedErrorSaving = useAnimatedValue(showResult ? result.annualErrorSaving : 0, 800);
  const animatedSpaceSaving = useAnimatedValue(showResult ? result.annualSpaceSaving : 0, 800);
  const animatedNetSaving = useAnimatedValue(showResult ? result.netAnnualSaving : 0, 900);
  const animatedRoi = useAnimatedValue(showResult ? Math.round(result.roiPercent) : 0, 700);
  const animatedPayback = useAnimatedValue(showResult ? result.paybackMonths : 0, 600);
  const animatedEfficiency = useAnimatedValue(showResult ? Math.round(result.improvedPickingEfficiency) : 0, 700);

  // PDF 다운로드
  const handlePdfDownload = () => {
    const html = generateRoiPdfHtml(input, result);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleReset = () => {
    setShowResult(false);
  };

  // 유효성 검사
  const isValid =
    input.warehouseArea > 0 &&
    input.employeeCount > 0 &&
    input.monthlyPickings > 0 &&
    input.currentErrorRate > 0;

  // 차트 데이터
  const chartData = [
    { name: '인건비 절감', value: result.annualLaborSaving },
    { name: '오류 비용 절감', value: result.annualErrorSaving },
    { name: '공간 절감', value: result.annualSpaceSaving },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bg,
        fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ─── 헤더 ─── */}
      <div
        style={{
          borderBottom: `1px solid ${COLORS.border}`,
          backgroundColor: 'rgba(22, 27, 34, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: 'transparent',
                color: COLORS.textSecondary,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.card;
                e.currentTarget.style.color = COLORS.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = COLORS.textSecondary;
              }}
              title="돌아가기"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
                <span style={{ color: COLORS.blue }}>Han</span>Voxel
              </span>
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  fontWeight: 400,
                }}
              >
                ROI 계산기
              </span>
            </div>
          </div>
          <div style={{ color: COLORS.textMuted }}>
            <Calculator size={20} />
          </div>
        </div>
      </div>

      {/* ─── 메인 컨텐츠 ─── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>
        {!showResult ? (
          /* ════════════════════════════════════
             입력 폼 — 2컬럼 웹 레이아웃
             ════════════════════════════════════ */
          <>
            {/* 제목 */}
            <div style={{ marginBottom: 36 }}>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  marginBottom: 8,
                }}
              >
                도입 효과 분석
              </h1>
              <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                현재 창고 운영 정보를 입력하면 HanVoxel 도입 시 예상 절감 효과를 계산합니다
              </p>
            </div>

            {/* 2컬럼: 입력 폼 + 계산 공식 설명 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
              {/* 왼쪽: 입력 카드 */}
              <div
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: '28px 28px 20px',
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 24 }}>
                  창고 운영 정보
                </h3>

                {/* 2x2 그리드 입력 필드 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 20px' }}>
                  <InputField
                    label="창고 면적"
                    unit="m²"
                    rawValue={rawInput.warehouseArea}
                    onChange={(v) => setField('warehouseArea', v)}
                    hint="창고 총 면적"
                  />
                  <InputField
                    label="직원 수"
                    unit="명"
                    rawValue={rawInput.employeeCount}
                    onChange={(v) => setField('employeeCount', v)}
                    hint="관리자 + 피킹 + 검수 인력"
                  />
                  <InputField
                    label="월 피킹 건수"
                    unit="건/월"
                    rawValue={rawInput.monthlyPickings}
                    onChange={(v) => setField('monthlyPickings', v)}
                    hint="월 평균 출고 처리 건수"
                  />
                  <InputField
                    label="현재 오류율"
                    unit="%"
                    rawValue={rawInput.currentErrorRate}
                    onChange={(v) => setField('currentErrorRate', v)}
                    hint="피킹 오류, 오배송, 불일치 비율"
                    step="0.1"
                  />
                </div>

                {/* 분석 버튼 */}
                <button
                  onClick={() => setShowResult(true)}
                  disabled={!isValid}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    backgroundColor: isValid ? COLORS.blue : COLORS.border,
                    border: 'none',
                    borderRadius: 10,
                    cursor: isValid ? 'pointer' : 'not-allowed',
                    opacity: isValid ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 24,
                  }}
                  onMouseEnter={(e) => {
                    if (isValid) e.currentTarget.style.backgroundColor = '#3A8FE0';
                  }}
                  onMouseLeave={(e) => {
                    if (isValid) e.currentTarget.style.backgroundColor = COLORS.blue;
                  }}
                >
                  <Calculator size={18} />
                  ROI 분석하기
                </button>
              </div>

              {/* 오른쪽: 계산 공식 + 벤치마크 기준값 설명 */}
              <div
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: '28px 28px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Info size={16} style={{ color: COLORS.blue }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
                    계산 공식 안내
                  </h3>
                </div>

                {/* 산업 벤치마크 기준값 */}
                <div
                  style={{
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: '14px 16px',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.orange, marginBottom: 8 }}>
                    산업 평균 벤치마크 기준값
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                    <span style={{ color: COLORS.textSecondary }}>월 평균 인건비</span>
                    <span style={{ color: COLORS.textPrimary, fontFamily: 'monospace', textAlign: 'right' }}>350만원/인</span>
                    <span style={{ color: COLORS.textSecondary }}>오류당 처리비용</span>
                    <span style={{ color: COLORS.textPrimary, fontFamily: 'monospace', textAlign: 'right' }}>25,000원/건</span>
                    <span style={{ color: COLORS.textSecondary }}>m² 월 임대료</span>
                    <span style={{ color: COLORS.textPrimary, fontFamily: 'monospace', textAlign: 'right' }}>15,000원/m²</span>
                    <span style={{ color: COLORS.textSecondary }}>피킹 효율 개선</span>
                    <span style={{ color: COLORS.textPrimary, fontFamily: 'monospace', textAlign: 'right' }}>+25%</span>
                    <span style={{ color: COLORS.textSecondary }}>오류율 감소</span>
                    <span style={{ color: COLORS.textPrimary, fontFamily: 'monospace', textAlign: 'right' }}>60%</span>
                    <span style={{ color: COLORS.textSecondary }}>인건비 절감율</span>
                    <span style={{ color: COLORS.textPrimary, fontFamily: 'monospace', textAlign: 'right' }}>15%</span>
                    <span style={{ color: COLORS.textSecondary }}>공간 절감율</span>
                    <span style={{ color: COLORS.textPrimary, fontFamily: 'monospace', textAlign: 'right' }}>10%</span>
                  </div>
                </div>

                {/* 비용 산출 공식 */}
                <FormulaRow
                  label="현재 연간 인건비"
                  formula="직원 수 x 350만원 x 12개월"
                  description="창고 운영 인력의 연간 총 인건비를 산출합니다."
                />
                <FormulaRow
                  label="현재 연간 오류 비용"
                  formula="월 피킹 건수 x (오류율/100) x 25,000원 x 12개월"
                  description="반품, 재작업, 고객불만 처리 비용을 포함합니다."
                />

                <div style={{ height: 1, background: COLORS.border, margin: '8px 0 16px' }} />

                {/* 절감액 공식 */}
                <FormulaRow
                  label="인건비 절감 (동선 최적화)"
                  formula="현재 연간 인건비 x 15%"
                  description="3D 레이아웃 최적화로 피킹 동선을 단축하여 인건비를 절감합니다."
                />
                <FormulaRow
                  label="오류 비용 절감"
                  formula="현재 연간 오류 비용 x 60%"
                  description="바코드 스캔 + 위치 검증으로 오류를 대폭 줄입니다."
                />
                <FormulaRow
                  label="공간 절감 (레이아웃)"
                  formula="면적 x 10% x 15,000원/m² x 12개월"
                  description="공간 활용도 최적화로 불필요 임대 면적을 줄입니다."
                />

                <div style={{ height: 1, background: COLORS.border, margin: '8px 0 16px' }} />

                <FormulaRow
                  label="ROI (%)"
                  formula="(총 절감액 - 연 구독료) / 연 구독료 x 100"
                  description="투자 대비 수익률. 높을수록 투자 효율이 좋습니다."
                />
                <FormulaRow
                  label="투자 회수 기간"
                  formula="연 구독료 / (총 절감액 / 12개월)"
                  description="구독 비용을 절감액으로 회수하는 데 걸리는 개월 수입니다."
                />

                {/* 구독 플랜 기준 */}
                <div
                  style={{
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: '14px 16px',
                    marginTop: 12,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.purple, marginBottom: 8 }}>
                    구독 플랜 기준
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>~1,500m²</span>
                      <span style={{ color: COLORS.green }}>Starter (무료)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1,500~5,000m²</span>
                      <span style={{ color: COLORS.textPrimary }}>Growth (49만원/월)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>5,000m² 초과</span>
                      <span style={{ color: COLORS.textPrimary }}>Enterprise (149만원/월)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ════════════════════════════════════
             결과 화면
             ════════════════════════════════════ */
          <div>
            {/* 제목 */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  marginBottom: 6,
                }}
              >
                분석 결과
              </h2>
              <p style={{ fontSize: 13, color: COLORS.textSecondary }}>
                {fmt(input.warehouseArea)} m² · {input.employeeCount}명 · 월{' '}
                {fmt(input.monthlyPickings)}건 기준
              </p>
            </div>

            {/* ─── 연간 절감 예상액 (대형 카드, 그린 그라데이션) ─── */}
            <div
              style={{
                background: `linear-gradient(135deg, ${COLORS.greenGradientStart} 0%, ${COLORS.greenGradientEnd} 100%)`,
                border: `1px solid rgba(63, 185, 80, 0.3)`,
                borderRadius: 14,
                padding: '32px 28px',
                marginBottom: 28,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(63, 185, 80, 0.08)',
                }}
              />
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                연간 절감 예상액
              </p>
              <p
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineHeight: 1.1,
                }}
              >
                {fmt(animatedTotalSaving)}
                <span style={{ fontSize: 22, fontWeight: 600, marginLeft: 4 }}>원</span>
              </p>
              <p
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                월 약 {fmt(Math.round(animatedTotalSaving / 12))}원 절감
              </p>
            </div>

            {/* ─── KPI 카드 그리드 ─── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 14,
                marginBottom: 28,
              }}
            >
              <MetricCard
                label="순 연간 절감"
                value={`${fmt(animatedNetSaving)}원`}
                changeText="구독료 차감 후"
                changeDirection="up"
                icon={<TrendingUp size={16} />}
                accentColor={COLORS.green}
              />
              <MetricCard
                label="피킹 효율"
                value={`+${animatedEfficiency}%`}
                changeText="동선 최적화"
                changeDirection="up"
                icon={<Target size={16} />}
                accentColor={COLORS.blue}
              />
              <MetricCard
                label="오류율 감소"
                value={`${input.currentErrorRate}% → ${result.improvedErrorRate.toFixed(2)}%`}
                changeText={`${(input.currentErrorRate - result.improvedErrorRate).toFixed(2)}%p 감소`}
                changeDirection="down"
                icon={<Target size={16} />}
                accentColor={COLORS.orange}
              />
              <MetricCard
                label="투자 회수"
                value={animatedPayback > 0 ? `${animatedPayback}개월` : '무료'}
                changeText={`ROI ${animatedRoi}%`}
                changeDirection="up"
                icon={<Clock size={16} />}
                accentColor={COLORS.purple}
              />
            </div>

            {/* ─── 절감 항목별 바 차트 + 계산식 토글 ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              {/* 바 차트 */}
              <div
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: '24px 20px',
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: COLORS.textPrimary,
                    marginBottom: 20,
                  }}
                >
                  항목별 연간 절감액
                </h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 20, left: 20, bottom: 8 }}
                      barCategoryGap="30%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={COLORS.chartGrid}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: COLORS.textSecondary, fontSize: 12 }}
                        axisLine={{ stroke: COLORS.chartGrid }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: COLORS.textSecondary, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                        {chartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.barColors[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 계산식 상세 (결과 화면 내) */}
              <div
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: '24px 20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
                    계산 상세
                  </h3>
                  <button
                    onClick={() => setShowFormulas(!showFormulas)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.blue,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {showFormulas ? '계산식 숨기기' : '계산식 보기'}
                  </button>
                </div>

                {/* 인건비 절감 */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>인건비 절감</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.green, fontFamily: 'monospace' }}>{fmt(result.annualLaborSaving)}원</span>
                  </div>
                  {showFormulas && (
                    <code style={{ fontSize: 11, color: COLORS.blue, fontFamily: 'monospace', display: 'block', padding: '4px 0' }}>
                      = {input.employeeCount}명 x 350만원 x 12개월 x 15% = {fmt(result.annualLaborSaving)}원
                    </code>
                  )}
                </div>

                {/* 오류 비용 절감 */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>오류 비용 절감</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.green, fontFamily: 'monospace' }}>{fmt(result.annualErrorSaving)}원</span>
                  </div>
                  {showFormulas && (
                    <code style={{ fontSize: 11, color: COLORS.blue, fontFamily: 'monospace', display: 'block', padding: '4px 0' }}>
                      = {fmt(input.monthlyPickings)}건 x {input.currentErrorRate}% x 25,000원 x 12개월 x 60% = {fmt(result.annualErrorSaving)}원
                    </code>
                  )}
                </div>

                {/* 공간 절감 */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>공간 절감</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.green, fontFamily: 'monospace' }}>{fmt(result.annualSpaceSaving)}원</span>
                  </div>
                  {showFormulas && (
                    <code style={{ fontSize: 11, color: COLORS.blue, fontFamily: 'monospace', display: 'block', padding: '4px 0' }}>
                      = {fmt(input.warehouseArea)}m² x 10% x 15,000원 x 12개월 = {fmt(result.annualSpaceSaving)}원
                    </code>
                  )}
                </div>

                <div style={{ height: 1, background: COLORS.border, margin: '8px 0 12px' }} />

                {/* 합계 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>총 절감 예상액</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.green, fontFamily: 'monospace' }}>{fmt(result.annualTotalSaving)}원</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>(-) 연 구독료</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: 'monospace' }}>{result.annualSubscription > 0 ? `${fmt(result.annualSubscription)}원` : '무료'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>순 연간 절감</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.green, fontFamily: 'monospace' }}>{fmt(result.netAnnualSaving)}원</span>
                </div>

                {showFormulas && (
                  <div style={{ marginTop: 8 }}>
                    <code style={{ fontSize: 11, color: COLORS.blue, fontFamily: 'monospace', display: 'block', padding: '4px 0' }}>
                      ROI = ({fmt(result.annualTotalSaving)} - {fmt(result.annualSubscription)}) / {fmt(result.annualSubscription)} x 100 = {result.roiPercent.toFixed(0)}%
                    </code>
                    <code style={{ fontSize: 11, color: COLORS.blue, fontFamily: 'monospace', display: 'block', padding: '4px 0' }}>
                      회수기간 = {fmt(result.annualSubscription)} / ({fmt(result.annualTotalSaving)} / 12) = {result.paybackMonths}개월
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* ─── 상세 분석 (2컬럼) ─── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: 28,
              }}
            >
              {/* 현재 연간 비용 */}
              <div
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: '20px 18px',
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.textSecondary,
                    marginBottom: 16,
                  }}
                >
                  현재 연간 비용
                </h3>
                <DetailRow
                  label="인건비"
                  value={`${fmt(result.currentAnnualLaborCost)}원`}
                />
                <DetailRow
                  label="오류 비용 (반품/재작업)"
                  value={`${fmt(result.currentAnnualErrorCost)}원`}
                />
                <DetailRow
                  label="총 비용"
                  value={`${fmt(result.currentAnnualTotalCost)}원`}
                  bold
                />
              </div>

              {/* ROI 요약 */}
              <div
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: '20px 18px',
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.blue,
                    marginBottom: 16,
                  }}
                >
                  투자 대비 수익 (ROI)
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 16,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>월 구독료</span>
                    <p
                      style={{
                        marginTop: 4,
                        fontSize: 15,
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {result.monthlySubscription > 0
                        ? `${fmt(result.monthlySubscription)}원`
                        : '무료'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>연 구독료</span>
                    <p
                      style={{
                        marginTop: 4,
                        fontSize: 15,
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {result.annualSubscription > 0
                        ? `${fmt(result.annualSubscription)}원`
                        : '무료'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>순 연간 절감</span>
                    <p
                      style={{
                        marginTop: 4,
                        fontSize: 15,
                        fontWeight: 700,
                        color: COLORS.green,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {fmt(animatedNetSaving)}원
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>ROI</span>
                    <p
                      style={{
                        marginTop: 4,
                        fontSize: 15,
                        fontWeight: 700,
                        color: COLORS.blue,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {animatedRoi > 0 ? `${animatedRoi}%` : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 액션 버튼 ─── */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginBottom: 24,
              }}
            >
              <button
                onClick={handlePdfDownload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: COLORS.blue,
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3A8FE0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.blue;
                }}
              >
                <Download size={16} />
                PDF 다운로드
              </button>
              <button
                onClick={handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: COLORS.textSecondary,
                  backgroundColor: 'transparent',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.card;
                  e.currentTarget.style.color = COLORS.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = COLORS.textSecondary;
                }}
              >
                <RotateCcw size={16} />
                다시 계산
              </button>
            </div>

            {/* ─── 면책 조항 ─── */}
            <p
              style={{
                textAlign: 'center',
                fontSize: 11,
                color: COLORS.textMuted,
                lineHeight: 1.5,
              }}
            >
              본 분석은 산업 평균 벤치마크 기반 추정치이며, 실제 결과는 운영 환경에 따라
              달라질 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
