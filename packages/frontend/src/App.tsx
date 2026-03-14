import { useState, useMemo } from 'react';
import { WarehouseViewer } from './components/warehouse-viewer';
import { WarehouseWizard } from './components/warehouse-wizard';
import { RoiCalculator } from './components/roi-calculator';
import { TrialBanner } from './components/trial-banner';
import { AlertPanel } from './components/alert-panel';
import { SlaDashboard } from './components/sla-dashboard';
import { MOCK_WAREHOUSE } from './data/mock-warehouse';
import { generateWarehouseLayout } from './utils/layout-generator';
import type { WizardFormData, WarehouseTemplate } from './types/warehouse-template';
import type { SpatialObject } from './types/spatial';
import './index.css';

type AppMode = 'wizard' | 'viewer' | 'roi' | 'sla';

// 데모용 트라이얼 상태 (실제 운영 시 API에서 가져옴)
const DEMO_TRIAL = {
  planType: 'STARTER',
  trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 후 만료
};

function App() {
  const [mode, setMode] = useState<AppMode>('wizard');
  const [alertOpen, setAlertOpen] = useState(false);
  const [wizardResult, setWizardResult] = useState<{
    form: WizardFormData;
    template: WarehouseTemplate;
  } | null>(null);

  // 마법사 완료 시 생성된 레이아웃 또는 기존 mock 데이터
  const objects: SpatialObject[] = useMemo(() => {
    if (wizardResult) {
      return generateWarehouseLayout(wizardResult.form, wizardResult.template);
    }
    return MOCK_WAREHOUSE;
  }, [wizardResult]);

  const handleWizardComplete = (form: WizardFormData, template: WarehouseTemplate) => {
    setWizardResult({ form, template });
    setMode('viewer');
  };

  if (mode === 'sla') {
    return <SlaDashboard onBack={() => setMode('viewer')} />;
  }

  if (mode === 'roi') {
    return <RoiCalculator onBack={() => setMode('wizard')} />;
  }

  if (mode === 'wizard') {
    return (
      <div className="relative">
        <WarehouseWizard onComplete={handleWizardComplete} />
        {/* 하단 네비게이션 */}
        <div className="fixed bottom-4 right-4 flex gap-2">
          <button
            onClick={() => setMode('roi')}
            className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-4 py-2 text-xs text-emerald-300 backdrop-blur transition-colors hover:bg-emerald-900/50"
          >
            ROI 계산기
          </button>
          <button
            onClick={() => setMode('viewer')}
            className="rounded-lg border border-gray-700 bg-gray-900/90 px-4 py-2 text-xs text-gray-400 backdrop-blur transition-colors hover:text-white"
          >
            데모 모드로 보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-950">
      {/* 트라이얼 만료 배너 */}
      <TrialBanner
        planType={DEMO_TRIAL.planType}
        trialEndsAt={DEMO_TRIAL.trialEndsAt}
        onUpgrade={() => alert('Stripe 결제 페이지로 이동 예정 (Phase 2)')}
      />

      {/* 3D 뷰어 */}
      <div className="flex-1">
        <WarehouseViewer objects={objects} />
      </div>

      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setAlertOpen(true)}
        className="fixed top-4 right-4 z-40 flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-2 text-sm text-gray-300 backdrop-blur transition-colors hover:text-white"
      >
        <span>알림</span>
        <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      </button>

      {/* 알림 패널 */}
      <AlertPanel isOpen={alertOpen} onClose={() => setAlertOpen(false)} />

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setMode('wizard')}
          className="rounded-lg border border-gray-700 bg-gray-900/90 px-4 py-2 text-xs text-gray-400 backdrop-blur transition-colors hover:text-white"
        >
          새 창고 만들기
        </button>
        <button
          onClick={() => setMode('roi')}
          className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-4 py-2 text-xs text-emerald-300 backdrop-blur transition-colors hover:bg-emerald-900/50"
        >
          ROI 계산기
        </button>
        <button
          onClick={() => setMode('sla')}
          className="rounded-lg border border-blue-700/50 bg-blue-900/30 px-4 py-2 text-xs text-blue-300 backdrop-blur transition-colors hover:bg-blue-900/50"
        >
          SLA 모니터링
        </button>
      </div>
    </div>
  );
}

export default App;
