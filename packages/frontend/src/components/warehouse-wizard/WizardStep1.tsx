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
    <div className="mx-auto max-w-2xl space-y-8">
      {/* 제목 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">창고 기본 정보</h2>
        <p className="mt-2 text-sm text-gray-400">새 창고의 기본 정보를 입력해주세요</p>
      </div>

      {/* 창고 이름 */}
      <FieldGroup label="창고 이름">
        <input
          type="text"
          value={form.warehouseName}
          onChange={(e) => set('warehouseName', e.target.value)}
          placeholder="예: 김포 물류센터 A동"
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500"
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
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 font-mono text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
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
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 font-mono text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
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
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 font-mono text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
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
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                form.industry === code
                  ? 'border-blue-500 bg-blue-900/30 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
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
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음: 템플릿 선택
        </button>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-300">{label}</label>
      {children}
    </div>
  );
}
