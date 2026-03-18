import { useState, useMemo, useCallback } from 'react';
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
import { ReorderDashboard } from './components/reorder-dashboard';
import { ConnectorDashboard } from './components/connector-dashboard';
import { BenchmarkDashboard } from './components/benchmark-dashboard';
import { InOutCalendar, InboundManagement, OutboundManagement } from './components/inout-management';
import { SalesOrderDashboard, BomManager, StockCheckDashboard } from './components/sales-order';
import { SmartReorderDashboard } from './components/smart-reorder';
import { PartnerDashboard } from './components/partner-management';
import { SettingsPage } from './components/settings';
import { Sidebar, Header } from './components/layout';
import { ThemeProvider } from './contexts/ThemeContext';
import { MOCK_WAREHOUSE } from './data/mock-warehouse';
import { generateWarehouseLayout } from './utils/layout-generator';
import type { WizardFormData, WarehouseTemplate } from './types/warehouse-template';
import type { SpatialObject } from './types/spatial';
import './i18n';
import './index.css';

type AppMode = 'wizard' | 'viewer' | 'roi' | 'sla' | 'qc' | 'picking' | 'subscription' | 'erp' | 'trade' | 'reorder' | 'smart-reorder' | 'connector' | 'benchmark' | 'inout-calendar' | 'inbound' | 'outbound' | 'sales-order' | 'bom' | 'stock-check' | 'partners' | 'settings';

// 관리자 모드 — 기본값 ENTERPRISE (하드코딩)
// localStorage에서 adminMode 확인, 없으면 기본 true
function getAdminMode(): boolean {
  const stored = localStorage.getItem('adminMode');
  if (stored !== null) return stored === 'true';
  return true; // 기본값: Enterprise
}

function App() {
  const [mode, setMode] = useState<AppMode>('viewer');
  const [alertOpen, setAlertOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(getAdminMode);
  const [wizardResult, setWizardResult] = useState<{
    form: WizardFormData;
    template: WarehouseTemplate;
  } | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);

  // 플랜 타입 (관리자 모드 시 항상 ENTERPRISE)
  const planType = adminMode ? 'ENTERPRISE' : 'STARTER';
  const trialEndsAt = adminMode
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  // 관리자 모드 토글
  const toggleAdmin = useCallback(() => {
    setAdminMode((prev) => {
      const next = !prev;
      localStorage.setItem('adminMode', String(next));
      return next;
    });
  }, []);

  // 마법사 완료 시 생성된 레이아웃 또는 기존 mock 데이터 (층별 재생성)
  const floorCount = wizardResult?.form.floorCount ?? 1;
  const objects: SpatialObject[] = useMemo(() => {
    if (wizardResult) {
      return generateWarehouseLayout(wizardResult.form, wizardResult.template, currentFloor);
    }
    return MOCK_WAREHOUSE;
  }, [wizardResult, currentFloor]);

  const handleWizardComplete = (form: WizardFormData, template: WarehouseTemplate) => {
    setWizardResult({ form, template });
    setMode('viewer');
  };

  const openUpgrade = () => setUpgradeOpen(true);
  const goBack = () => setMode('viewer');

  // 서브페이지 컨텐츠 렌더링
  const renderSubPage = () => {
    switch (mode) {
      case 'settings':
        return <SettingsPage onBack={goBack} />;
      case 'outbound':
        return <OutboundManagement onBack={goBack} />;
      case 'sales-order':
        return <SalesOrderDashboard onBack={goBack} />;
      case 'bom':
        return <BomManager onBack={goBack} />;
      case 'stock-check':
        return <StockCheckDashboard onBack={goBack} />;
      case 'inbound':
        return <InboundManagement onBack={goBack} />;
      case 'inout-calendar':
        return <InOutCalendar onBack={goBack} />;
      case 'benchmark':
        return <BenchmarkDashboard onBack={goBack} />;
      case 'connector':
        return <ConnectorDashboard onBack={goBack} />;
      case 'reorder':
        return <ReorderDashboard onBack={goBack} />;
      case 'partners':
        return <PartnerDashboard onBack={goBack} />;
      case 'smart-reorder':
        return <SmartReorderDashboard onBack={goBack} />;
      case 'trade':
        return <TradeDashboard onBack={goBack} />;
      case 'erp':
        return <ErpDashboard onBack={goBack} />;
      case 'subscription':
        return <SubscriptionDashboard onBack={goBack} onUpgrade={openUpgrade} />;
      case 'picking':
        return <PickingMobile onBack={goBack} />;
      case 'qc':
        return <QcDashboard onBack={goBack} />;
      case 'sla':
        return <SlaDashboard onBack={goBack} />;
      case 'roi':
        return <RoiCalculator onBack={() => setMode('wizard')} />;
      case 'wizard':
        return <WarehouseWizard onComplete={handleWizardComplete} />;
      default:
        return null;
    }
  };

  // 서브페이지 모드
  const subPage = renderSubPage();
  if (subPage && mode !== 'viewer') {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar activeMode={mode} onModeChange={(m) => setMode(m as AppMode)} planType={planType} onToggleAdmin={toggleAdmin} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginLeft: 24 }}>
          <Header activeMode={mode} onAlertClick={() => setAlertOpen(true)} isEnterprise={adminMode} onNavigateSettings={() => setMode('settings')} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            {subPage}
          </div>
        </div>

        <AlertPanel isOpen={alertOpen} onClose={() => setAlertOpen(false)} />
        <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} currentPlan={planType} />
      </div>
    );
  }

  // 메인 3D 뷰어 모드
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar activeMode={mode} onModeChange={(m) => setMode(m as AppMode)} planType={planType} onToggleAdmin={toggleAdmin} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header activeMode={mode} onAlertClick={() => setAlertOpen(true)} isEnterprise={adminMode} onNavigateSettings={() => setMode('settings')} />

        {!adminMode && (
          <TrialBanner
            planType={planType}
            trialEndsAt={trialEndsAt}
            onUpgrade={openUpgrade}
          />
        )}

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
          <WarehouseViewer
            objects={objects}
            floorCount={floorCount}
            currentFloor={currentFloor}
            onFloorChange={setCurrentFloor}
          />
        </div>
      </div>

      <AlertPanel isOpen={alertOpen} onClose={() => setAlertOpen(false)} />
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} currentPlan={planType} />
    </div>
  );
}

// ThemeProvider로 감싸는 래퍼
function AppWrapper() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default AppWrapper;
