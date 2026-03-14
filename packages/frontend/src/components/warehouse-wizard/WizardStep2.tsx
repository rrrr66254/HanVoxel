import { useState, useEffect } from 'react';
import type { WarehouseTemplate, WizardFormData } from '../../types/warehouse-template';
import { INDUSTRY_LABELS, INDUSTRY_COLORS } from '../../types/warehouse-template';
import { getWarehouseTemplates } from '../../api/warehouse-template-api';

interface WizardStep2Props {
  form: WizardFormData;
  onChange: (form: WizardFormData) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * 2단계: 창고 템플릿 선택
 */
export function WizardStep2({ form, onChange, onNext, onBack }: WizardStep2Props) {
  const [templates, setTemplates] = useState<WarehouseTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getWarehouseTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  // 업종 매칭 템플릿 우선, 나머지 표시
  const matchedTemplates = templates.filter((t) => t.industry === form.industry);
  const otherTemplates = templates.filter((t) => t.industry !== form.industry);

  const selectedTemplate = templates.find((t) => t.id === form.templateId);

  const handleSelect = (tpl: WarehouseTemplate) => {
    onChange({ ...form, templateId: tpl.id });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* 제목 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">창고 템플릿 선택</h2>
        <p className="mt-2 text-sm text-gray-400">
          <span style={{ color: INDUSTRY_COLORS[form.industry] }} className="font-semibold">
            {INDUSTRY_LABELS[form.industry]}
          </span>
          {' '}업종에 최적화된 템플릿을 추천합니다
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-500">로딩 중...</div>
      ) : (
        <>
          {/* 추천 템플릿 */}
          {matchedTemplates.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-blue-400 uppercase">추천 템플릿</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {matchedTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    selected={form.templateId === tpl.id}
                    recommended
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 기타 템플릿 */}
          {otherTemplates.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">기타 템플릿</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {otherTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    selected={form.templateId === tpl.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 선택된 템플릿 상세 */}
      {selectedTemplate && (
        <div className="rounded-lg border border-blue-600/30 bg-blue-900/10 p-4">
          <h4 className="text-sm font-bold text-blue-300">{selectedTemplate.name} 상세 스펙</h4>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400">
            <SpecLine label="랙" value={selectedTemplate.rackPreset?.name ?? '-'} />
            <SpecLine label="팔레트" value={selectedTemplate.palletPreset?.name ?? '-'} />
            <SpecLine label="랙 배치" value={selectedTemplate.rackLayout === 'BACK_TO_BACK' ? '등지기(Back-to-Back)' : '단열(Single)'} />
            <SpecLine label="통로 폭" value={`${selectedTemplate.aisleWidth}m (${selectedTemplate.aisleType})`} />
            <SpecLine label="주 통로" value={`${selectedTemplate.mainAisleWidth}m`} />
            {selectedTemplate.rackPreset?.levels && (
              <SpecLine label="랙 단수" value={`${selectedTemplate.rackPreset.levels}단 (단간 ${selectedTemplate.rackPreset.levelHeight}m)`} />
            )}
            {selectedTemplate.rackPreset?.loadPerLevel && (
              <SpecLine label="단당 하중" value={`${selectedTemplate.rackPreset.loadPerLevel.toLocaleString()}kg`} />
            )}
          </div>
        </div>
      )}

      {/* 네비게이션 */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-600 px-6 py-3 text-sm text-gray-300 transition-colors hover:bg-gray-800"
        >
          이전
        </button>
        <button
          onClick={onNext}
          disabled={!form.templateId}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음: 3D 미리보기
        </button>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  recommended,
  onSelect,
}: {
  template: WarehouseTemplate;
  selected: boolean;
  recommended?: boolean;
  onSelect: (t: WarehouseTemplate) => void;
}) {
  const areaText = template.areaMin && template.areaMax
    ? `${template.areaMin.toLocaleString()}~${template.areaMax.toLocaleString()} m²`
    : '-';

  return (
    <button
      onClick={() => onSelect(template)}
      className={`rounded-lg border p-4 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-500/10'
          : 'border-gray-700 bg-gray-800/60 hover:border-gray-500'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white">{template.name}</h4>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: INDUSTRY_COLORS[template.industry] }}
            />
            <span className="text-[11px] text-gray-400">{INDUSTRY_LABELS[template.industry]}</span>
          </div>
        </div>
        {recommended && (
          <span className="rounded bg-blue-600/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">추천</span>
        )}
      </div>

      <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">{template.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag>{template.rackPreset?.name ?? template.code}</Tag>
        <Tag>{template.rackLayout === 'BACK_TO_BACK' ? '등지기' : '단열'}</Tag>
        <Tag>{areaText}</Tag>
      </div>

      {selected && (
        <div className="mt-2 text-center text-[10px] font-semibold text-blue-400">선택됨</div>
      )}
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-gray-700/80 px-1.5 py-0.5 text-[10px] text-gray-400">
      {children}
    </span>
  );
}

function SpecLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono text-gray-300">{value}</span>
    </div>
  );
}
