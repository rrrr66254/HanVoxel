import { useState, useCallback } from 'react';
import { WizardStep1 } from './WizardStep1';
import { WizardStep2 } from './WizardStep2';
import { WizardStep3 } from './WizardStep3';
import { WizardStep4 } from './WizardStep4';
import type { WizardFormData, WarehouseTemplate } from '../../types/warehouse-template';
import { EMPTY_WAREHOUSE_TEMPLATE } from '../../types/warehouse-template';
import { MOCK_TEMPLATES } from '../../data/mock-templates';

interface WarehouseWizardProps {
  onComplete: (form: WizardFormData, template: WarehouseTemplate) => void;
}

const STEP_LABELS = ['기본 정보', '템플릿 선택', '3D 확인', '저장 완료'];
const STEP_ICONS = [
  // 기본 정보
  'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  // 템플릿 선택
  'M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5zm-10 9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-5z',
  // 3D 확인
  'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  // 저장 완료
  'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z',
];

const DEFAULT_FORM: WizardFormData = {
  warehouseName: '',
  areaWidth: 60,
  areaDepth: 45,
  ceilingHeight: 8,
  floorCount: 1,
  floorConfigs: [],
  industry: '',
  templateId: null,
};

/**
 * 창고 초기 세팅 마법사 — 4단계 온보딩 플로우
 */
export function WarehouseWizard({ onComplete }: WarehouseWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormData>(DEFAULT_FORM);

  // 선택된 템플릿 조회 (빈 창고 포함)
  const isEmptyWarehouse = form.isEmptyWarehouse === true;
  const selectedTemplate = isEmptyWarehouse
    ? EMPTY_WAREHOUSE_TEMPLATE
    : (MOCK_TEMPLATES.find((t) => t.id === form.templateId) ?? null);

  const handleComplete = useCallback(() => {
    if (selectedTemplate) {
      onComplete(form, selectedTemplate);
    }
  }, [form, selectedTemplate, onComplete]);

  // 3단계(3D 확인)는 전체 화면
  const isFullScreen = step === 2;

  return (
    <div className={`flex h-full w-full flex-col bg-gray-950 ${isFullScreen ? '' : 'overflow-auto'}`}>
      {/* 상단 스텝 인디케이터 (3단계 제외) */}
      {!isFullScreen && (
        <div
          className="shrink-0 px-8 py-4"
          style={{
            borderBottom: '1px solid var(--border-muted)',
            background: 'rgba(22,27,34,0.9)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="mx-auto flex items-center justify-between" style={{ maxWidth: 960 }}>
            {/* 로고 */}
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'var(--accent-blue)', boxShadow: '0 0 12px rgba(45,125,210,0.35)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                <span className="text-blue-400">Han</span>Voxel
              </span>
            </div>

            {/* 스텝 바 */}
            <div className="flex items-center gap-0">
              {STEP_LABELS.map((label, i) => {
                const isActive = i === step;
                const isDone = i < step;
                return (
                  <div key={i} className="flex items-center">
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      {/* 스텝 아이콘/번호 */}
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg transition-all"
                        style={{
                          background: isDone ? 'var(--accent-green)' : isActive ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                          boxShadow: isActive ? '0 0 12px rgba(45,125,210,0.4)' : 'none',
                        }}
                      >
                        {isDone ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isActive ? 'white' : 'var(--text-muted)'} strokeWidth="2">
                            <path d={STEP_ICONS[i]} />
                          </svg>
                        )}
                      </div>

                      {/* 라벨 */}
                      <span
                        className="hidden text-xs font-medium sm:inline"
                        style={{
                          color: isDone ? 'var(--accent-green)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}
                      >
                        {label}
                      </span>
                    </div>

                    {/* 연결선 */}
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className="mx-1 h-px w-8"
                        style={{ background: isDone ? 'var(--accent-green)' : 'var(--bg-tertiary)' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 스텝 컨텐츠 */}
      <div className={isFullScreen ? 'flex-1 overflow-hidden' : 'flex-1'} style={isFullScreen ? undefined : { padding: '24px 0' }}>
        {step === 0 && (
          <WizardStep1
            form={form}
            onChange={setForm}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <WizardStep2
            form={form}
            onChange={setForm}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && selectedTemplate && (
          <WizardStep3
            form={form}
            template={selectedTemplate}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && selectedTemplate && (
          <WizardStep4
            form={form}
            template={selectedTemplate}
            onComplete={handleComplete}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
}
