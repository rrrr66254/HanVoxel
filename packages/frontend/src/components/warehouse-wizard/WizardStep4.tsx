import { useState, useMemo } from 'react';
import type { WarehouseTemplate, WizardFormData } from '../../types/warehouse-template';
import { INDUSTRY_LABELS, INDUSTRY_COLORS } from '../../types/warehouse-template';
import { generateWarehouseLayout } from '../../utils/layout-generator';

interface WizardStep4Props {
  form: WizardFormData;
  template: WarehouseTemplate;
  onComplete: () => void;
  onBack: () => void;
}

/**
 * 4단계: 저장 및 완료
 */
export function WizardStep4({ form, template, onComplete, onBack }: WizardStep4Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const generatedObjects = useMemo(
    () => generateWarehouseLayout(form, template),
    [form, template],
  );

  const rackCount = generatedObjects.filter((o) => o.type.name === 'RACK').length;
  const totalArea = form.areaWidth * form.areaDepth;
  const rackLevels = template.rackPreset?.levels ?? 3;
  const palletsPerLevel = 2;
  const totalPallets = rackCount * rackLevels * palletsPerLevel;

  const handleSave = async () => {
    setSaving(true);

    // TODO: 실제 API 호출로 전체 레이아웃 DB 저장
    // 현재는 시뮬레이션 (0.8초 딜레이)
    await new Promise((r) => setTimeout(r, 800));

    console.log('[HanVoxel] 창고 초기 세팅 저장:', {
      warehouse: form,
      template: template.code,
      objectCount: generatedObjects.length,
      rackCount,
      totalPallets,
    });

    setSaving(false);
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-20">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-900/30 text-4xl">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#10b981" strokeWidth="2.5" />
            <path d="M12 20l6 6 12-13" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">창고 세팅 완료!</h2>
        <p className="mt-3 text-center text-sm text-gray-400 leading-relaxed">
          <span className="font-semibold text-white">{form.warehouseName}</span>이 성공적으로 생성되었습니다.
          <br />
          {rackCount}개 랙, {totalPallets}개 팔레트 위치가 배치되었습니다.
        </p>

        <div className="mt-8 w-full rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <h4 className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">생성 요약</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <SummaryItem label="창고 이름" value={form.warehouseName} />
            <SummaryItem label="면적" value={`${form.areaWidth}m × ${form.areaDepth}m (${totalArea.toLocaleString()} m²)`} />
            <SummaryItem label="업종" value={INDUSTRY_LABELS[form.industry]} color={INDUSTRY_COLORS[form.industry]} />
            <SummaryItem label="템플릿" value={template.name} />
            <SummaryItem label="총 랙" value={`${rackCount}개`} />
            <SummaryItem label="팔레트 위치" value={`${totalPallets}개`} />
            <SummaryItem label="총 객체" value={`${generatedObjects.length}개`} />
            <SummaryItem label="천장 높이" value={`${form.ceilingHeight}m`} />
          </div>
        </div>

        <button
          onClick={onComplete}
          className="mt-8 rounded-lg bg-blue-600 px-10 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          3D 뷰어로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 py-8">
      {/* 제목 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">저장 및 완료</h2>
        <p className="mt-2 text-sm text-gray-400">아래 내용을 확인하고 저장해주세요</p>
      </div>

      {/* 요약 카드 */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: INDUSTRY_COLORS[form.industry] }}
          />
          <h3 className="text-lg font-bold text-white">{form.warehouseName}</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <SummaryItem label="면적" value={`${form.areaWidth}m × ${form.areaDepth}m`} />
          <SummaryItem label="총 면적" value={`${totalArea.toLocaleString()} m²`} />
          <SummaryItem label="천장 높이" value={`${form.ceilingHeight}m`} />
          <SummaryItem label="업종" value={INDUSTRY_LABELS[form.industry]} color={INDUSTRY_COLORS[form.industry]} />
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">템플릿 구성</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SummaryItem label="템플릿" value={template.name} />
            <SummaryItem label="랙" value={template.rackPreset?.name ?? '-'} />
            <SummaryItem label="배치 방식" value={template.rackLayout === 'BACK_TO_BACK' ? '등지기' : '단열'} />
            <SummaryItem label="통로 폭" value={`${template.aisleWidth}m`} />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">생성될 레이아웃</h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <SummaryItem label="총 객체" value={`${generatedObjects.length}개`} />
            <SummaryItem label="랙" value={`${rackCount}개`} />
            <SummaryItem label="팔레트 위치" value={`${totalPallets}개`} />
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-600 px-6 py-3 text-sm text-gray-300 transition-colors hover:bg-gray-800"
        >
          이전
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-10 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장 및 완료'}
        </button>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <p className="font-mono text-gray-200" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}
