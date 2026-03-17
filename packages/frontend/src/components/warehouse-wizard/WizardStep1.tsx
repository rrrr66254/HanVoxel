import type { WizardFormData } from '../../types/warehouse-template';
import { INDUSTRY_LABELS, INDUSTRY_COLORS } from '../../types/warehouse-template';

interface WizardStep1Props {
  form: WizardFormData;
  onChange: (form: WizardFormData) => void;
  onNext: () => void;
}

const INDUSTRIES = Object.entries(INDUSTRY_LABELS);

// 업종별 아이콘 (SVG path)
const INDUSTRY_ICONS: Record<string, string> = {
  FOOD_BEVERAGE: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  AUTO_PARTS: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
  ELECTRONICS_FC: 'M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
  COLD_CHAIN: 'M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z',
  CHEMICAL: 'M7 2v2h1v14c0 2.21 1.79 4 4 4s4-1.79 4-4V4h1V2H7zm8 16c0 1.1-.9 2-2 2s-2-.9-2-2v-6h4v6zm0-8H9V4h6v6z',
  PHARMACEUTICAL: 'M6 3h12v2H6V3zm6 4c-3.31 0-6 2.69-6 6v8h12v-8c0-3.31-2.69-6-6-6zm3 11H9v-2h6v2zm0-4H9v-2h6v2z',
  EXPORT_EU: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
};

/**
 * 1단계: 창고 기본 정보 입력 — 모던 SaaS UI
 */
export function WizardStep1({ form, onChange, onNext }: WizardStep1Props) {
  const set = (field: keyof WizardFormData, value: string | number) =>
    onChange({ ...form, [field]: value });

  const isValid = form.warehouseName.trim() && form.areaWidth > 0 && form.areaDepth > 0 && form.industry;
  const totalArea = form.areaWidth * form.areaDepth;

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 960, padding: '0 16px' }}>
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #2D7DD2, #3FB950)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F0F6FC', letterSpacing: '-0.02em' }}>
          새 창고 만들기
        </h2>
        <p style={{ fontSize: 14, color: '#7D8590', marginTop: 8 }}>
          창고의 기본 정보를 입력하세요. 다음 단계에서 업종에 맞는 템플릿을 선택합니다.
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* 왼쪽 컬럼 — 기본 정보 */}
        <div className="space-y-5">
          {/* 창고 이름 */}
          <div
            className="rounded-xl p-5"
            style={{ background: '#161B22', border: '1px solid #21262D' }}
          >
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7D8590" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              창고 이름
            </label>
            <input
              type="text"
              value={form.warehouseName}
              onChange={(e) => set('warehouseName', e.target.value)}
              placeholder="예: 김포 물류센터 A동"
              className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-600"
              style={{ background: '#0D1117', border: '1px solid #30363D' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2D7DD2';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,125,210,0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#30363D';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* 창고 크기 */}
          <div
            className="rounded-xl p-5"
            style={{ background: '#161B22', border: '1px solid #21262D' }}
          >
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7D8590" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              창고 크기
            </label>

            <div className="grid grid-cols-4 gap-3">
              <DimensionInput
                label="가로"
                unit="m"
                value={form.areaWidth}
                min={10}
                max={500}
                onChange={(v) => set('areaWidth', v)}
              />
              <DimensionInput
                label="세로"
                unit="m"
                value={form.areaDepth}
                min={10}
                max={500}
                onChange={(v) => set('areaDepth', v)}
              />
              <DimensionInput
                label="천장 높이"
                unit="m"
                value={form.ceilingHeight}
                min={3}
                max={30}
                step={0.5}
                onChange={(v) => set('ceilingHeight', v)}
              />
              <DimensionInput
                label="층 수"
                unit="층"
                value={form.floorCount}
                min={1}
                max={10}
                onChange={(v) => set('floorCount', v)}
              />
            </div>

            {/* 면적 표시 바 */}
            {form.areaWidth > 0 && form.areaDepth > 0 && (
              <div
                className="mt-4 flex items-center justify-between rounded-lg px-4 py-2.5"
                style={{ background: '#0D1117', border: '1px solid #21262D' }}
              >
                <span className="text-xs text-gray-500">
                  {form.floorCount > 1 ? `층당 면적 ${totalArea.toLocaleString()} m² · 총` : '총 면적'}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-lg font-bold text-white">
                    {(totalArea * form.floorCount).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">m²</span>
                  {form.floorCount > 1 && (
                    <span className="ml-1 text-xs text-blue-400">({form.floorCount}개 층)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽 컬럼 — 업종 선택 */}
        <div
          className="rounded-xl p-5"
          style={{ background: '#161B22', border: '1px solid #21262D' }}
        >
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7D8590" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            업종 선택
          </label>
          <p className="mb-4 text-xs text-gray-500">
            업종을 선택하면 최적화된 창고 템플릿을 추천합니다
          </p>
          <div className="space-y-2">
            {INDUSTRIES.map(([code, label]) => {
              const isSelected = form.industry === code;
              const color = INDUSTRY_COLORS[code];
              return (
                <button
                  key={code}
                  onClick={() => set('industry', code)}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-all"
                  style={{
                    border: isSelected ? `1px solid ${color}` : '1px solid #21262D',
                    background: isSelected ? `${color}12` : '#0D1117',
                    color: isSelected ? '#F0F6FC' : '#8B949E',
                    boxShadow: isSelected ? `0 0 16px ${color}20` : 'none',
                  }}
                >
                  {/* 업종 아이콘 */}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: isSelected ? `${color}25` : '#161B22',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isSelected ? color : '#484F58'}>
                      <path d={INDUSTRY_ICONS[code]} />
                    </svg>
                  </div>

                  {/* 라벨 */}
                  <span className="flex-1 font-medium">{label}</span>

                  {/* 선택 표시 */}
                  {isSelected && (
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ background: color }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 다음 버튼 */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          {isValid ? (
            <span className="text-emerald-500">모든 항목이 입력되었습니다</span>
          ) : (
            <span>모든 필수 항목을 입력해주세요</span>
          )}
        </div>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="group flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all"
          style={{
            background: isValid ? 'linear-gradient(135deg, #2D7DD2, #3FB950)' : '#21262D',
            color: isValid ? '#fff' : '#484F58',
            cursor: isValid ? 'pointer' : 'not-allowed',
            boxShadow: isValid ? '0 4px 16px rgba(45,125,210,0.3)' : 'none',
          }}
        >
          다음: 템플릿 선택
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform group-hover:translate-x-0.5"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function DimensionInput({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-gray-500">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-lg px-3 py-2.5 pr-8 font-mono text-sm text-white outline-none transition-all placeholder:text-gray-600"
          style={{ background: '#0D1117', border: '1px solid #30363D' }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2D7DD2';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,125,210,0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#30363D';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">
          {unit}
        </span>
      </div>
    </div>
  );
}
