import { useState, useEffect } from 'react';
import type { WarehouseTemplate, WizardFormData } from '../../types/warehouse-template';
import { INDUSTRY_LABELS, INDUSTRY_COLORS, EMPTY_WAREHOUSE_TEMPLATE } from '../../types/warehouse-template';
import { getWarehouseTemplates } from '../../api/warehouse-template-api';
import { TemplatePreview } from './TemplatePreview';

interface WizardStep2Props {
  form: WizardFormData;
  onChange: (form: WizardFormData) => void;
  onNext: () => void;
  onBack: () => void;
}

// 템플릿 변형 라벨
const VARIANT_LABELS: Record<string, string> = {
  standard: '표준형',
  'standard-safety': '안전 표준형',
  'high-density': '고밀도형',
  'picking-optimized': '피킹 최적형',
  'heavy-parts': '중량부품형',
  'small-parts': '소형부품형',
  'long-parts': '장척물형',
  fulfillment: '풀필먼트형',
  'high-rise': '고층 자동화형',
  'bulk-frozen': '냉동 대량형',
  'fresh-distribution': '신선 유통형',
  'bulk-storage': '대량 보관형',
  'specialty-repack': '특수 소분형',
  'gmp-standard': 'GMP 표준형',
  distribution: '유통형',
  'cold-pharma': '냉장 보관형',
  'eu-standard': 'EU 표준형',
  'container-staging': '컨테이너형',
  'cross-dock': '크로스도크형',
};

/**
 * 2단계: 업종별 창고 템플릿 선택 — 3개 카드 비교
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

  // 선택된 업종 매칭 템플릿만 (최대 3개)
  const matchedTemplates = templates.filter((t) => t.industry === form.industry);
  const selectedTemplate = templates.find((t) => t.id === form.templateId);
  const industryColor = INDUSTRY_COLORS[form.industry] ?? '#3b82f6';
  const industryLabel = INDUSTRY_LABELS[form.industry] ?? form.industry;

  const handleSelect = (tpl: WarehouseTemplate) => {
    onChange({ ...form, templateId: tpl.id, isEmptyWarehouse: false });
  };

  const handleSelectEmpty = () => {
    onChange({ ...form, templateId: EMPTY_WAREHOUSE_TEMPLATE.id, isEmptyWarehouse: true });
  };

  const isEmptySelected = form.templateId === EMPTY_WAREHOUSE_TEMPLATE.id;

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 1100, padding: '0 16px' }}>
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${industryColor}20`, border: `1px solid ${industryColor}40` }}
        >
          <div className="h-3 w-3 rounded-full" style={{ background: industryColor }} />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          템플릿 선택
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          <span style={{ color: industryColor }} className="font-semibold">{industryLabel}</span>
          {' '}업종에 최적화된 3가지 창고 레이아웃 중 하나를 선택하세요
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
            </svg>
            템플릿을 불러오는 중...
          </div>
        </div>
      ) : (
        <>
          {/* 템플릿 카드 3개 */}
          <div className="grid gap-4" style={{ gridTemplateColumns: matchedTemplates.length === 3 ? '1fr 1fr 1fr' : `repeat(${matchedTemplates.length}, 1fr)` }}>
            {matchedTemplates.map((tpl, idx) => {
              const isSelected = form.templateId === tpl.id;
              const variant = (tpl.metadata as Record<string, unknown>)?.variant as string ?? '';
              const variantLabel = VARIANT_LABELS[variant] ?? '';

              return (
                <button
                  key={tpl.id}
                  onClick={() => handleSelect(tpl)}
                  className="group relative flex flex-col rounded-2xl p-5 text-left transition-all"
                  style={{
                    border: isSelected ? `2px solid ${industryColor}` : '2px solid var(--bg-tertiary)',
                    background: isSelected ? `${industryColor}08` : 'var(--bg-secondary)',
                    boxShadow: isSelected
                      ? `0 0 24px ${industryColor}20, 0 4px 16px rgba(0,0,0,0.3)`
                      : '0 2px 8px rgba(0,0,0,0.2)',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {/* 추천 뱃지 (첫 번째 = 추천) */}
                  {idx === 0 && (
                    <div
                      className="absolute -top-3 left-4 z-10 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
                      style={{ background: industryColor, color: '#fff' }}
                    >
                      추천
                    </div>
                  )}

                  {/* 선택 표시 */}
                  {isSelected && (
                    <div
                      className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full"
                      style={{ background: industryColor }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}

                  {/* 2D 탑뷰 프리뷰 */}
                  <div className="-mx-5 -mt-5 mb-3">
                    <TemplatePreview
                      template={tpl}
                      form={form}
                      isSelected={isSelected}
                      industryColor={industryColor}
                    />
                  </div>

                  {/* 제목 + 변형 라벨 */}
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-base font-bold text-white leading-tight">{tpl.name}</h3>
                    {variantLabel && (
                      <span
                        className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: isSelected ? `${industryColor}20` : 'var(--bg-tertiary)',
                          color: isSelected ? industryColor : 'var(--text-secondary)',
                        }}
                      >
                        {variantLabel}
                      </span>
                    )}
                  </div>

                  {/* 설명 */}
                  <p className="mb-4 flex-1 text-xs text-gray-500 leading-relaxed">{tpl.description}</p>

                  {/* 스펙 그리드 */}
                  <div
                    className="space-y-2 rounded-lg p-3"
                    style={{ background: 'color-mix(in srgb, var(--bg-primary) 50%, transparent)', border: '1px solid var(--bg-tertiary)' }}
                  >
                    <SpecRow label="랙" value={tpl.rackPreset?.name ?? '-'} />
                    <SpecRow label="배치" value={tpl.rackLayout === 'BACK_TO_BACK' ? '등지기(B2B)' : '단열(Single)'} />
                    <SpecRow label="통로" value={`${tpl.aisleWidth}m`} />
                    <SpecRow label="팔레트" value={tpl.palletPreset?.name ?? '-'} />
                    {tpl.rackPreset?.levels && (
                      <SpecRow label="랙 단수" value={`${tpl.rackPreset.levels}단 (${tpl.rackPreset.loadPerLevel?.toLocaleString()}kg/단)`} />
                    )}
                    {tpl.areaMin && tpl.areaMax && (
                      <SpecRow
                        label="적정 면적"
                        value={`${tpl.areaMin.toLocaleString()}~${tpl.areaMax.toLocaleString()} m²`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 빈 창고 직접 구성 옵션 */}
          <div className="mt-4">
            <button
              onClick={handleSelectEmpty}
              className="group relative flex w-full items-center gap-4 rounded-2xl p-5 text-left transition-all"
              style={{
                border: isEmptySelected ? '2px solid #6B7280' : '2px solid var(--bg-tertiary)',
                background: isEmptySelected ? '#6B728008' : 'var(--bg-secondary)',
                boxShadow: isEmptySelected
                  ? '0 0 24px rgba(107,114,128,0.15), 0 4px 16px rgba(0,0,0,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {/* 선택 표시 */}
              {isEmptySelected && (
                <div className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-gray-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}

              {/* 아이콘 */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: isEmptySelected ? '#6B728020' : 'var(--bg-tertiary)',
                  border: '1px dashed var(--text-muted)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isEmptySelected ? 'var(--text-secondary)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>

              {/* 텍스트 */}
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">빈 창고에서 시작</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  템플릿 없이 빈 공간에서 직접 구성합니다. 프리셋 카탈로그에서 랙·팔레트 등을 자유롭게 배치하세요.
                </p>
              </div>
            </button>
          </div>

          {/* 선택된 템플릿 요약 (하단) */}
          {selectedTemplate && !isEmptySelected && (
            <div
              className="mt-6 flex items-center gap-4 rounded-xl px-5 py-4"
              style={{ background: `${industryColor}08`, border: `1px solid ${industryColor}30` }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${industryColor}20` }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={industryColor} strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{selectedTemplate.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {selectedTemplate.rackPreset?.name} · {selectedTemplate.rackLayout === 'BACK_TO_BACK' ? '등지기' : '단열'} 배치 · 통로 {selectedTemplate.aisleWidth}m
                </p>
              </div>
              <span className="text-xs font-medium" style={{ color: industryColor }}>선택됨</span>
            </div>
          )}
        </>
      )}

      {/* 네비게이션 */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 rounded-xl border border-gray-700 px-6 py-3 text-sm text-gray-400 transition-all hover:border-gray-500 hover:text-gray-200"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform group-hover:-translate-x-0.5"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          이전
        </button>
        <button
          onClick={onNext}
          disabled={!form.templateId}
          className="group flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all"
          style={{
            background: form.templateId ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))' : 'var(--bg-tertiary)',
            color: form.templateId ? '#fff' : 'var(--text-muted)',
            cursor: form.templateId ? 'pointer' : 'not-allowed',
            boxShadow: form.templateId ? '0 4px 16px rgba(45,125,210,0.3)' : 'none',
          }}
        >
          다음: 3D 미리보기
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

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono text-gray-300">{value}</span>
    </div>
  );
}
