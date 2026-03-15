import type { WizardFormData } from '../../types/warehouse-template';
import { INDUSTRY_LABELS, INDUSTRY_COLORS } from '../../types/warehouse-template';

interface WizardStep1Props {
  form: WizardFormData;
  onChange: (form: WizardFormData) => void;
  onNext: () => void;
}

const INDUSTRIES = Object.entries(INDUSTRY_LABELS);

/**
 * 1단계: 창고 기본 정보 입력
 */
export function WizardStep1({ form, onChange, onNext }: WizardStep1Props) {
  const set = (field: keyof WizardFormData, value: string | number) =>
    onChange({ ...form, [field]: value });

  const isValid = form.warehouseName.trim() && form.areaWidth > 0 && form.areaDepth > 0 && form.industry;

  return (
    <div className="mx-auto space-y-8" style={{ maxWidth: 800 }}>
      {/* 제목 */}
      <div className="text-center">
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#E6EDF3', marginBottom: 8 }}>창고 기본 정보</h2>
        <p style={{ fontSize: 14, color: '#8B949E' }}>새 창고의 기본 정보를 입력해주세요</p>
      </div>

      {/* 창고 이름 */}
      <FieldGroup label="창고 이름">
        <input
          type="text"
          value={form.warehouseName}
          onChange={(e) => set('warehouseName', e.target.value)}
          placeholder="예: 김포 물류센터 A동"
          className="w-full rounded-lg px-4 py-3 text-white outline-none transition-all placeholder:text-gray-500"
              style={{ background: '#0D1117', border: '1px solid #30363D', fontSize: 14 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,125,210,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </FieldGroup>

      {/* 창고 면적 */}
      <FieldGroup label="창고 크기">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">가로 (m)</label>
            <input
              type="number"
              min={10}
              max={500}
              value={form.areaWidth || ''}
              onChange={(e) => set('areaWidth', parseFloat(e.target.value) || 0)}
              placeholder="60"
              className="w-full rounded-lg px-3 py-2.5 font-mono text-white outline-none transition-all placeholder:text-gray-500"
              style={{ background: '#0D1117', border: '1px solid #30363D', fontSize: 14 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,125,210,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">세로 (m)</label>
            <input
              type="number"
              min={10}
              max={500}
              value={form.areaDepth || ''}
              onChange={(e) => set('areaDepth', parseFloat(e.target.value) || 0)}
              placeholder="45"
              className="w-full rounded-lg px-3 py-2.5 font-mono text-white outline-none transition-all placeholder:text-gray-500"
              style={{ background: '#0D1117', border: '1px solid #30363D', fontSize: 14 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,125,210,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">천장 높이 (m)</label>
            <input
              type="number"
              min={3}
              max={30}
              step={0.5}
              value={form.ceilingHeight || ''}
              onChange={(e) => set('ceilingHeight', parseFloat(e.target.value) || 0)}
              placeholder="8"
              className="w-full rounded-lg px-3 py-2.5 font-mono text-white outline-none transition-all placeholder:text-gray-500"
              style={{ background: '#0D1117', border: '1px solid #30363D', fontSize: 14 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,125,210,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
        {form.areaWidth > 0 && form.areaDepth > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            총 면적: <span className="font-mono text-gray-300">{(form.areaWidth * form.areaDepth).toLocaleString()}</span> m²
          </p>
        )}
      </FieldGroup>

      {/* 업종 선택 */}
      <FieldGroup label="업종">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INDUSTRIES.map(([code, label]) => (
            <button
              key={code}
              onClick={() => set('industry', code)}
              className="rounded-lg px-4 py-3 text-left text-sm transition-all"
              style={{
                border: form.industry === code ? '1px solid #2D7DD2' : '1px solid #30363D',
                background: form.industry === code ? 'rgba(45,125,210,0.12)' : '#0D1117',
                color: form.industry === code ? '#E6EDF3' : '#8B949E',
                boxShadow: form.industry === code ? '0 0 12px rgba(45,125,210,0.2)' : 'none',
              }}
            >
              <span
                className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: INDUSTRY_COLORS[code] }}
              />
              {label}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* 다음 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!isValid}
          style={{
            padding: '12px 32px',
            borderRadius: 10,
            border: 'none',
            background: isValid ? 'linear-gradient(135deg, #2D7DD2, #3FB950)' : '#21262D',
            color: isValid ? '#fff' : '#484F58',
            fontSize: 14,
            fontWeight: 600,
            cursor: isValid ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => { if (isValid) e.currentTarget.style.transform = 'scale(1.03)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          다음: 템플릿 선택
        </button>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#161B22',
        border: '1px solid #21262D',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#E6EDF3', marginBottom: 12 }}>{label}</label>
      {children}
    </div>
  );
}
