import { useState, useMemo } from 'react';
import { WarehouseViewer } from './components/warehouse-viewer';
import { WarehouseWizard } from './components/warehouse-wizard';
import { RoiCalculator } from './components/roi-calculator';
import { TrialBanner } from './components/trial-banner';
import { AlertPanel } from './components/alert-panel';
import { SlaDashboard } from './components/sla-dashboard';
import { QcDashboard } from './components/qc-dashboard';
import { PickingMobile } from './components/picking-mobile';
import { UpgradeModal } from './components/upgrade-modal';
import { SubscriptionDashboard } from './components/subscription-dashboard';
import { ErpDashboard } from './components/erp-dashboard';
import { TradeDashboard } from './components/trade-intelligence';
import { MOCK_WAREHOUSE } from './data/mock-warehouse';
import { generateWarehouseLayout } from './utils/layout-generator';
import type { WizardFormData, WarehouseTemplate } from './types/warehouse-template';
import type { SpatialObject } from './types/spatial';
import './index.css';

type AppMode = 'wizard' | 'viewer' | 'roi' | 'sla' | 'qc' | 'picking' | 'subscription' | 'erp' | 'trade';

// 데모용 트라이얼 상태 (실제 운영 시 API에서 가져옴)
const DEMO_TRIAL = {
  planType: 'STARTER',
  trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 후 만료
};

function App() {
  const [mode, setMode] = useState<AppMode>('wizard');
  const [alertOpen, setAlertOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
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

  const openUpgrade = () => setUpgradeOpen(true);

  if (mode === 'trade') {
    return <TradeDashboard onBack={() => setMode('viewer')} />;
  }

  if (mode === 'erp') {
    return <ErpDashboard onBack={() => setMode('viewer')} />;
  }

  if (mode === 'subscription') {
    return (
      <SubscriptionDashboard
        onBack={() => setMode('viewer')}
        onUpgrade={openUpgrade}
      />
    );
  }

  if (mode === 'picking') {
    return <PickingMobile onBack={() => setMode('viewer')} />;
  }

  if (mode === 'qc') {
    return <QcDashboard onBack={() => setMode('viewer')} />;
  }

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
        onUpgrade={openUpgrade}
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

      {/* 업그레이드 모달 */}
      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlan={DEMO_TRIAL.planType}
      />

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-4 left-4 flex flex-wrap gap-2">
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
        <button
          onClick={() => setMode('qc')}
          className="rounded-lg border border-orange-700/50 bg-orange-900/30 px-4 py-2 text-xs text-orange-300 backdrop-blur transition-colors hover:bg-orange-900/50"
        >
          품질 검수
        </button>
        <button
          onClick={() => setMode('picking')}
          className="rounded-lg border border-purple-700/50 bg-purple-900/30 px-4 py-2 text-xs text-purple-300 backdrop-blur transition-colors hover:bg-purple-900/50"
        >
          모바일 피킹
        </button>
        <button
          onClick={() => setMode('subscription')}
          className="rounded-lg border border-cyan-700/50 bg-cyan-900/30 px-4 py-2 text-xs text-cyan-300 backdrop-blur transition-colors hover:bg-cyan-900/50"
        >
          구독 관리
        </button>
        <button
          onClick={() => setMode('erp')}
          className="rounded-lg border border-amber-700/50 bg-amber-900/30 px-4 py-2 text-xs text-amber-300 backdrop-blur transition-colors hover:bg-amber-900/50"
        >
          ERP 관리
        </button>
        <button
          onClick={() => setMode('trade')}
          className="rounded-lg border border-teal-700/50 bg-teal-900/30 px-4 py-2 text-xs text-teal-300 backdrop-blur transition-colors hover:bg-teal-900/50"
        >
          무역 인텔리전스
        </button>
      </div>
    </div>
  );
}

export default App;
