import { useMemo, useEffect, useState } from 'react';
import { WarehouseViewer } from '../warehouse-viewer';
import type { SpatialObject } from '../../types/spatial';
import type { WarehouseTemplate, WizardFormData } from '../../types/warehouse-template';
import { generateWarehouseLayout } from '../../utils/layout-generator';

interface WizardStep3Props {
  form: WizardFormData;
  template: WarehouseTemplate;
  onNext: () => void;
  onBack: () => void;
}

/**
 * 3단계: 3D 뷰어에서 레이아웃 확인 — 윈도우 크기에 자동 맞춤
 */
export function WizardStep3({ form, template, onNext, onBack }: WizardStep3Props) {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [currentFloor, setCurrentFloor] = useState(1);

  // 윈도우 리사이즈 감지
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 레이아웃 생성 (form/template/currentFloor 변경 시 재생성)
  const generatedObjects: SpatialObject[] = useMemo(
    () => generateWarehouseLayout(form, template, currentFloor),
    [form, template, currentFloor],
  );

  // 레이아웃 통계
  const rackCount = generatedObjects.filter((o) => o.type.name === 'RACK').length;
  const aisleCount = generatedObjects.filter((o) => o.type.name === 'AISLE').length;
  const totalArea = form.areaWidth * form.areaDepth;

  // 상단 바 + 하단 힌트 높이를 제외한 뷰어 영역 계산
  const topBarHeight = 56;
  const bottomBarHeight = 36;
  const viewerHeight = windowSize.height - topBarHeight - bottomBarHeight;

  return (
    <div className="flex flex-col" style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* 상단 바 */}
      <div
        className="flex shrink-0 items-center justify-between px-6"
        style={{
          height: topBarHeight,
          borderBottom: '1px solid #30363D',
          background: 'rgba(13,17,23,0.95)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-base font-bold text-white">3D 레이아웃 확인</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="rounded bg-gray-800 px-2 py-1 font-mono text-gray-300">
              {form.areaWidth}m × {form.areaDepth}m
            </span>
            {form.floorCount > 1 && <span className="text-blue-400 font-semibold">{currentFloor}층</span>}
            <span>랙 {rackCount}개</span>
            <span>통로 {aisleCount}개</span>
            <span>{totalArea.toLocaleString()} m²</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-gray-600 px-4 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-800"
          >
            이전
          </button>
          <button
            onClick={onNext}
            className="rounded-lg px-6 py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #2D7DD2, #3FB950)',
              boxShadow: '0 2px 8px rgba(45,125,210,0.3)',
            }}
          >
            저장 및 완료
          </button>
        </div>
      </div>

      {/* 3D 뷰어 — 남은 영역 전체, 윈도우 크기에 맞춤 */}
      <div style={{ width: '100%', height: viewerHeight, position: 'relative', overflow: 'hidden' }}>
        <WarehouseViewer
          objects={generatedObjects}
          onSave={onNext}
          onBack={onBack}
          floorCount={form.floorCount}
          currentFloor={currentFloor}
          onFloorChange={setCurrentFloor}
        />
      </div>

      {/* 하단 힌트 */}
      <div
        className="flex shrink-0 items-center justify-center text-[11px] text-gray-600"
        style={{
          height: bottomBarHeight,
          borderTop: '1px solid #21262D',
          background: 'rgba(13,17,23,0.95)',
        }}
      >
        드래그로 회전 · 스크롤로 줌 · 객체 클릭으로 정보 확인
      </div>
    </div>
  );
}
