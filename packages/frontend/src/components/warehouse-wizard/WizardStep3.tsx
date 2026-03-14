import { useMemo } from 'react';
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
 * 3단계: 3D 뷰어에서 레이아웃 확인 및 수정
 */
export function WizardStep3({ form, template, onNext, onBack }: WizardStep3Props) {
  // 레이아웃 생성 (form/template 변경 시 재생성)
  const generatedObjects: SpatialObject[] = useMemo(
    () => generateWarehouseLayout(form, template),
    [form, template],
  );

  // 레이아웃 통계
  const rackCount = generatedObjects.filter((o) => o.type.name === 'RACK').length;
  const aisleCount = generatedObjects.filter((o) => o.type.name === 'AISLE').length;
  const totalArea = form.areaWidth * form.areaDepth;

  return (
    <div className="flex h-full flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900 px-6 py-3">
        <div>
          <h2 className="text-lg font-bold text-white">3D 레이아웃 확인</h2>
          <p className="text-xs text-gray-400">
            {form.warehouseName} — {form.areaWidth}m × {form.areaDepth}m ·
            랙 {rackCount}개 · 통로 {aisleCount}개 · {totalArea.toLocaleString()} m²
          </p>
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
            className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
          >
            저장 및 완료
          </button>
        </div>
      </div>

      {/* 3D 뷰어 (남은 영역 전체) */}
      <div className="flex-1">
        <WarehouseViewer objects={generatedObjects} />
      </div>

      {/* 하단 힌트 */}
      <div className="border-t border-gray-700 bg-gray-900/90 px-6 py-2 text-center text-[11px] text-gray-500">
        드래그로 회전 · 스크롤로 줌 · 객체 클릭으로 정보 확인 · 프리셋 카탈로그에서 추가 배치 가능
      </div>
    </div>
  );
}
