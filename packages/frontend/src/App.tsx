import { useState, useMemo } from 'react';
import { WarehouseViewer } from './components/warehouse-viewer';
import { WarehouseWizard } from './components/warehouse-wizard';
import { MOCK_WAREHOUSE } from './data/mock-warehouse';
import { generateWarehouseLayout } from './utils/layout-generator';
import type { WizardFormData, WarehouseTemplate } from './types/warehouse-template';
import type { SpatialObject } from './types/spatial';
import './index.css';

type AppMode = 'wizard' | 'viewer';

function App() {
  const [mode, setMode] = useState<AppMode>('wizard');
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

  if (mode === 'wizard') {
    return (
      <div className="relative">
        <WarehouseWizard onComplete={handleWizardComplete} />
        {/* 데모 모드 바로가기 */}
        <button
          onClick={() => setMode('viewer')}
          className="fixed bottom-4 right-4 rounded-lg border border-gray-700 bg-gray-900/90 px-4 py-2 text-xs text-gray-400 backdrop-blur transition-colors hover:text-white"
        >
          데모 모드로 보기
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-950">
      <WarehouseViewer objects={objects} />
      {/* 마법사로 돌아가기 */}
      <button
        onClick={() => setMode('wizard')}
        className="fixed bottom-4 left-4 rounded-lg border border-gray-700 bg-gray-900/90 px-4 py-2 text-xs text-gray-400 backdrop-blur transition-colors hover:text-white"
      >
        새 창고 만들기
      </button>
    </div>
  );
}

export default App;
