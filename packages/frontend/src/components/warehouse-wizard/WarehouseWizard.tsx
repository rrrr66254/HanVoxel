import { useState, useCallback } from 'react';
import { WizardStep1 } from './WizardStep1';
import { WizardStep2 } from './WizardStep2';
import { WizardStep3 } from './WizardStep3';
import { WizardStep4 } from './WizardStep4';
import type { WizardFormData, WarehouseTemplate } from '../../types/warehouse-template';
import { MOCK_TEMPLATES } from '../../data/mock-templates';

interface WarehouseWizardProps {
  onComplete: (form: WizardFormData, template: WarehouseTemplate) => void;
}

const STEP_LABELS = ['기본 정보', '템플릿 선택', '3D 확인', '저장 완료'];

const DEFAULT_FORM: WizardFormData = {
  warehouseName: '',
  areaWidth: 60,
  areaDepth: 45,
  ceilingHeight: 8,
  industry: '',
  templateId: null,
};

/**
 * 창고 초기 세팅 마법사 — 4단계 온보딩 플로우
 */
export function WarehouseWizard({ onComplete }: WarehouseWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormData>(DEFAULT_FORM);

  // 선택된 템플릿 조회
  const selectedTemplate = MOCK_TEMPLATES.find((t) => t.id === form.templateId) ?? null;

  const handleComplete = useCallback(() => {
    if (selectedTemplate) {
      onComplete(form, selectedTemplate);
    }
  }, [form, selectedTemplate, onComplete]);

  // 3단계는 전체 화면 필요
  const isFullScreen = step === 2;

  return (
    <div className={`flex h-screen w-screen flex-col bg-gray-950 ${isFullScreen ? '' : 'overflow-auto'}`}>
      {/* 상단 스텝 인디케이터 (3단계 제외) */}
      {!isFullScreen && (
        <div className="border-b border-gray-800 bg-gray-900/80 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex items-center justify-between" style={{ maxWidth: 800 }}>
            {/* 로고 */}
            <div className="text-lg font-bold text-white">
              <span className="text-blue-500">Han</span>Voxel
            </div>

            {/* 스텝 바 */}
            <div className="flex items-center gap-1">
              {STEP_LABELS.map((label, i) => (
                <div key={i} className="flex items-center">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                    i === step
                      ? 'bg-blue-600 text-white font-semibold'
                      : i < step
                        ? 'bg-gray-700 text-gray-300'
                        : 'text-gray-600'
                  }`}>
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: i < step ? '#3FB950' : i === step ? '#fff' : '#21262D',
                        color: i < step ? '#fff' : i === step ? '#2D7DD2' : '#484F58',
                        boxShadow: i === step ? '0 0 8px rgba(45,125,210,0.4)' : 'none',
                      }}
                    >
                      {i < step ? '✓' : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className="mx-1 h-px w-8"
                      style={{ background: i < step ? '#3FB950' : '#30363D' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 스텝 컨텐츠 */}
      <div className={isFullScreen ? 'flex-1' : 'flex-1'} style={isFullScreen ? undefined : { padding: '32px' }}>
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
