import { useState, useMemo, useEffect } from 'react';
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
 * 4단계: 저장 및 완료 — 자동 저장 후 3D 뷰어로 이동
 */
export function WizardStep4({ form, template, onComplete, onBack }: WizardStep4Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);

  const generatedObjects = useMemo(
    () => generateWarehouseLayout(form, template),
    [form, template],
  );

  const rackCount = generatedObjects.filter((o) => o.type.name === 'RACK').length;
  const totalArea = form.areaWidth * form.areaDepth;
  const rackLevels = template.rackPreset?.levels ?? 3;
  const palletsPerLevel = 2;
  const totalPallets = rackCount * rackLevels * palletsPerLevel;
  const industryColor = INDUSTRY_COLORS[form.industry] ?? '#3b82f6';

  const handleSave = async () => {
    setSaving(true);
    setProgress(0);

    // 진행률 시뮬레이션
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 90));
    }, 200);

    // TODO: 실제 API 호출로 전체 레이아웃 DB 저장
    await new Promise((r) => setTimeout(r, 1200));

    clearInterval(interval);
    setProgress(100);

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

  // 저장 완료 후 2초 뒤 자동으로 3D 뷰어 이동
  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saved, onComplete]);

  if (saved) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-16">
        {/* 성공 아이콘 */}
        <div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)' }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="16" stroke="#10b981" strokeWidth="2" />
            <path d="M13 20l5 5 10-11" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#F0F6FC', letterSpacing: '-0.02em' }}>
          창고 생성 완료!
        </h2>
        <p className="mt-3 text-center text-sm text-gray-400 leading-relaxed">
          <span className="font-semibold text-white">{form.warehouseName}</span>이 성공적으로 생성되었습니다.
          <br />
          <span className="font-mono">{rackCount}</span>개 랙, <span className="font-mono">{totalPallets}</span>개 팔레트 위치가 배치되었습니다.
        </p>

        {/* 요약 그리드 */}
        <div
          className="mt-8 w-full rounded-xl p-5"
          style={{ background: '#161B22', border: '1px solid #21262D' }}
        >
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="총 면적" value={`${totalArea.toLocaleString()} m²`} />
            <StatBlock label="랙" value={`${rackCount}개`} />
            <StatBlock label="팔레트 위치" value={`${totalPallets}개`} />
            <StatBlock label="총 객체" value={`${generatedObjects.length}개`} />
          </div>
        </div>

        {/* 자동 이동 안내 */}
        <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          3D 뷰어로 자동 이동합니다...
        </div>

        <button
          onClick={onComplete}
          className="mt-4 rounded-xl px-8 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #2D7DD2, #3FB950)',
            boxShadow: '0 4px 16px rgba(45,125,210,0.3)',
          }}
        >
          지금 바로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      {/* 헤더 */}
      <div className="text-center">
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F0F6FC', letterSpacing: '-0.02em' }}>
          저장 및 완료
        </h2>
        <p className="mt-2 text-sm text-gray-400">아래 내용을 확인하고 저장하세요</p>
      </div>

      {/* 요약 카드 */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid #21262D' }}
      >
        {/* 상단 헤더 */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ background: `${industryColor}08`, borderBottom: '1px solid #21262D' }}
        >
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: industryColor }}
          />
          <h3 className="text-lg font-bold text-white">{form.warehouseName}</h3>
          <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${industryColor}20`, color: industryColor }}>
            {INDUSTRY_LABELS[form.industry]}
          </span>
        </div>

        {/* 기본 정보 */}
        <div className="px-5 py-4" style={{ background: '#161B22' }}>
          <div className="grid grid-cols-3 gap-4">
            <StatBlock label="면적" value={`${form.areaWidth} × ${form.areaDepth}m`} />
            <StatBlock label="총 면적" value={`${totalArea.toLocaleString()} m²`} />
            <StatBlock label="천장 높이" value={`${form.ceilingHeight}m`} />
          </div>
        </div>

        {/* 템플릿 구성 */}
        <div className="px-5 py-4" style={{ background: '#161B22', borderTop: '1px solid #21262D' }}>
          <h4 className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">템플릿 구성</h4>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="템플릿" value={template.name} />
            <StatBlock label="랙" value={template.rackPreset?.name ?? '-'} />
            <StatBlock label="배치" value={template.rackLayout === 'BACK_TO_BACK' ? '등지기' : '단열'} />
            <StatBlock label="통로" value={`${template.aisleWidth}m`} />
          </div>
        </div>

        {/* 생성 레이아웃 */}
        <div className="px-5 py-4" style={{ background: '#161B22', borderTop: '1px solid #21262D' }}>
          <h4 className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">생성될 레이아웃</h4>
          <div className="grid grid-cols-3 gap-4">
            <StatBlock label="총 객체" value={`${generatedObjects.length}개`} />
            <StatBlock label="랙" value={`${rackCount}개`} />
            <StatBlock label="팔레트 위치" value={`${totalPallets}개`} />
          </div>
        </div>
      </div>

      {/* 저장 진행률 바 */}
      {saving && (
        <div className="rounded-lg p-4" style={{ background: '#161B22', border: '1px solid #21262D' }}>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-gray-400">저장 중...</span>
            <span className="font-mono text-gray-300">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #2D7DD2, #3FB950)',
              }}
            />
          </div>
        </div>
      )}

      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={saving}
          className="group flex items-center gap-2 rounded-xl border border-gray-700 px-6 py-3 text-sm text-gray-400 transition-all hover:border-gray-500 hover:text-gray-200 disabled:opacity-40"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          이전
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="group flex items-center gap-2 rounded-xl px-10 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
          }}
        >
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
              </svg>
              저장 중...
            </>
          ) : (
            <>
              저장 및 완료
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] font-medium tracking-wider text-gray-600 uppercase">{label}</span>
      <p className="mt-0.5 text-sm font-semibold text-gray-200">{value}</p>
    </div>
  );
}
