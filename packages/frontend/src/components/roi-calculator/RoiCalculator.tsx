import { useState, useMemo } from 'react';
import { calculateRoi, generateRoiPdfHtml } from '../../utils/roi-calculator';
import type { RoiInput } from '../../utils/roi-calculator';

interface RoiCalculatorProps {
  onBack: () => void;
}

const DEFAULT_INPUT: RoiInput = {
  warehouseArea: 3000,
  employeeCount: 15,
  monthlyPickings: 10000,
  currentErrorRate: 2.5,
};

const fmt = (n: number) => n.toLocaleString('ko-KR');

/**
 * ROI 계산기 — HanVoxel 도입 효과 분석
 */
export function RoiCalculator({ onBack }: RoiCalculatorProps) {
  const [input, setInput] = useState<RoiInput>(DEFAULT_INPUT);
  const [showResult, setShowResult] = useState(false);

  const set = (field: keyof RoiInput, raw: string) => {
    const num = parseFloat(raw);
    if (!isNaN(num)) setInput((prev) => ({ ...prev, [field]: num }));
  };

  const result = useMemo(() => calculateRoi(input), [input]);

  const handlePdfDownload = () => {
    const html = generateRoiPdfHtml(input, result);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    // 렌더링 후 인쇄 대화상자 (PDF 저장 가능)
    setTimeout(() => printWindow.print(), 300);
  };

  const isValid = input.warehouseArea > 0 && input.employeeCount > 0 && input.monthlyPickings > 0 && input.currentErrorRate > 0;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* 헤더 */}
      <div className="border-b border-gray-800 bg-gray-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <div className="text-lg font-bold text-white">
              <span className="text-blue-500">Han</span>Voxel
              <span className="ml-2 text-sm font-normal text-gray-400">ROI 계산기</span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="rounded-lg border border-gray-600 px-4 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-800"
          >
            돌아가기
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {!showResult ? (
          /* === 입력 폼 === */
          <div className="mx-auto max-w-xl space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">도입 효과 분석</h1>
              <p className="mt-2 text-sm text-gray-400">
                현재 창고 운영 정보를 입력하면 HanVoxel 도입 시 예상 절감 효과를 계산합니다
              </p>
            </div>

            <InputField
              label="창고 면적"
              unit="m²"
              value={input.warehouseArea}
              onChange={(v) => set('warehouseArea', v)}
              hint="창고 총 면적을 입력하세요"
            />
            <InputField
              label="직원 수"
              unit="명"
              value={input.employeeCount}
              onChange={(v) => set('employeeCount', v)}
              hint="창고 운영 인력 (관리자 + 피킹 + 검수)"
            />
            <InputField
              label="월 피킹 건수"
              unit="건/월"
              value={input.monthlyPickings}
              onChange={(v) => set('monthlyPickings', v)}
              hint="월 평균 피킹(출고 처리) 건수"
            />
            <InputField
              label="현재 오류율"
              unit="%"
              value={input.currentErrorRate}
              onChange={(v) => set('currentErrorRate', v)}
              hint="피킹 오류, 오배송, 재고 불일치 비율"
              step="0.1"
            />

            <button
              onClick={() => setShowResult(true)}
              disabled={!isValid}
              className="w-full rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ROI 분석하기
            </button>
          </div>
        ) : (
          /* === 결과 표시 === */
          <div className="space-y-8">
            {/* 핵심 지표 카드 */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">분석 결과</h2>
              <p className="mt-1 text-sm text-gray-400">{fmt(input.warehouseArea)} m² · {input.employeeCount}명 · 월 {fmt(input.monthlyPickings)}건 기준</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricCard
                label="연간 절감 예상액"
                value={`${fmt(result.annualTotalSaving)}원`}
                accent="blue"
              />
              <MetricCard
                label="피킹 효율 개선"
                value={`+${result.improvedPickingEfficiency.toFixed(0)}%`}
                accent="green"
              />
              <MetricCard
                label="오류율 감소"
                value={`${input.currentErrorRate}% → ${result.improvedErrorRate.toFixed(2)}%`}
                accent="green"
              />
              <MetricCard
                label="투자 회수 기간"
                value={result.paybackMonths > 0 ? `${result.paybackMonths}개월` : '무료'}
                accent="purple"
              />
            </div>

            {/* 상세 분석 */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* 현재 비용 */}
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
                <h3 className="mb-4 text-sm font-bold text-gray-300">현재 연간 비용</h3>
                <DetailRow label="인건비" value={`${fmt(result.currentAnnualLaborCost)}원`} />
                <DetailRow label="오류 비용 (반품/재작업)" value={`${fmt(result.currentAnnualErrorCost)}원`} />
                <DetailRow label="총 비용" value={`${fmt(result.currentAnnualTotalCost)}원`} bold />
              </div>

              {/* 절감 상세 */}
              <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/10 p-5">
                <h3 className="mb-4 text-sm font-bold text-emerald-300">연간 절감 상세</h3>
                <DetailRow label="인건비 절감 (동선 최적화)" value={`${fmt(result.annualLaborSaving)}원`} color="text-emerald-300" />
                <DetailRow label="오류 비용 절감" value={`${fmt(result.annualErrorSaving)}원`} color="text-emerald-300" />
                <DetailRow label="공간 절감 (레이아웃 최적화)" value={`${fmt(result.annualSpaceSaving)}원`} color="text-emerald-300" />
                <DetailRow label="총 절감 예상액" value={`${fmt(result.annualTotalSaving)}원`} bold color="text-emerald-200" />
              </div>
            </div>

            {/* ROI 요약 */}
            <div className="rounded-lg border border-blue-600/30 bg-blue-900/10 p-5">
              <h3 className="mb-4 text-sm font-bold text-blue-300">투자 대비 수익 (ROI)</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <span className="text-xs text-gray-500">월 구독료</span>
                  <p className="font-mono text-sm font-bold text-white">
                    {result.monthlySubscription > 0 ? `${fmt(result.monthlySubscription)}원` : '무료'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">연 구독료</span>
                  <p className="font-mono text-sm font-bold text-white">
                    {result.annualSubscription > 0 ? `${fmt(result.annualSubscription)}원` : '무료'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">순 연간 절감</span>
                  <p className="font-mono text-sm font-bold text-emerald-300">{fmt(result.netAnnualSaving)}원</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">ROI</span>
                  <p className="font-mono text-sm font-bold text-blue-300">
                    {result.roiPercent > 0 ? `${result.roiPercent.toFixed(0)}%` : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handlePdfDownload}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 11v3h12v-3M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                PDF 다운로드
              </button>
              <button
                onClick={() => setShowResult(false)}
                className="rounded-lg border border-gray-600 px-6 py-3 text-sm text-gray-300 transition-colors hover:bg-gray-800"
              >
                다시 계산
              </button>
            </div>

            {/* 면책 조항 */}
            <p className="text-center text-[11px] text-gray-600">
              본 분석은 산업 평균 벤치마크 기반 추정치이며, 실제 결과는 운영 환경에 따라 달라질 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({
  label,
  unit,
  value,
  onChange,
  hint,
  step = '1',
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: string) => void;
  hint: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-300">{label}</label>
      <div className="relative">
        <input
          type="number"
          step={step}
          min={0}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 pr-16 font-mono text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
        />
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-gray-500">{unit}</span>
      </div>
      <p className="mt-1 text-[11px] text-gray-600">{hint}</p>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: 'blue' | 'green' | 'purple' }) {
  const colors = {
    blue: 'border-blue-600/30 bg-blue-900/10 text-blue-300',
    green: 'border-emerald-600/30 bg-emerald-900/10 text-emerald-300',
    purple: 'border-purple-600/30 bg-purple-900/10 text-purple-300',
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[accent]}`}>
      <div className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function DetailRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? 'mt-2 border-t border-gray-600 pt-3' : 'border-b border-gray-700/50'}`}>
      <span className={`text-xs ${bold ? 'font-bold text-gray-200' : 'text-gray-500'}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? 'font-bold' : ''} ${color ?? 'text-gray-300'}`}>{value}</span>
    </div>
  );
}
