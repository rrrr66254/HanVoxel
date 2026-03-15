import { useRef } from 'react';
import type { SpatialPreset } from '../../types/preset';
import { PresetThumbnail } from './PresetThumbnail';

interface PresetCardProps {
  preset: SpatialPreset;
  onSelect?: (preset: SpatialPreset) => void;
}

// 지역 라벨 매핑
const REGION_LABEL: Record<string, string> = {
  KR: '국내',
  EU: '유럽',
  US: '미국',
  AU: '호주',
  INTL: '국제',
};

// 프리셋 코드에서 카테고리 추론
function inferCategory(preset: SpatialPreset): string {
  const catName = preset.category?.name?.toUpperCase() ?? '';
  if (catName) return catName;
  const code = preset.code?.toUpperCase() ?? '';
  if (code.includes('RACK') || preset.levels) return 'RACK';
  if (code.includes('LOADED')) return 'LOADED_PALLET';
  if (code.includes('PALLET') || code.startsWith('T11') || code.startsWith('T12') || code.startsWith('T08') || code.startsWith('ISO_')) return 'PALLET';
  if (code.includes('CONTAINER') || code.includes('DRY_') || code.includes('HC_') || code.includes('REEFER')) return 'CONTAINER';
  if (code.includes('AISLE')) return 'AISLE';
  if (code.includes('BOX') || code.includes('FOOD') || code.includes('AUTO') || code.includes('PHARMA')) return 'PRODUCT_BOX';
  if (code.includes('FLOOR')) return 'FLOOR';
  if (code.includes('WALL')) return 'WALL';
  if (code.includes('DOOR')) return 'DOOR';
  return 'RACK';
}

/**
 * 개별 프리셋 규격 카드 — 등각 투영 썸네일 + 드래그 앤 드롭
 */
export function PresetCard({ preset, onSelect }: PresetCardProps) {
  const isDraggingRef = useRef(false);
  const category = inferCategory(preset);

  // 치수 포맷 (0인 축은 생략)
  const dims = [preset.width, preset.depth, preset.height]
    .filter((v) => v > 0)
    .map((v) => `${(v * 1000).toFixed(0)}`)
    .join(' × ');

  const handleDragStart = (e: React.DragEvent) => {
    isDraggingRef.current = true;
    e.dataTransfer.setData('application/hanvoxel-preset', JSON.stringify(preset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setTimeout(() => { isDraggingRef.current = false; }, 0);
  };

  const handleClick = () => {
    if (isDraggingRef.current) return;
    onSelect?.(preset);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`rounded-lg border border-gray-700 bg-gray-800/80 p-3 transition-colors hover:border-gray-500 ${onSelect ? 'cursor-pointer hover:border-blue-500/50' : ''}`}
    >
      {/* 상단: 썸네일 + 기본 정보 */}
      <div className="mb-2 flex gap-3">
        {/* 등각 투영 썸네일 */}
        <div className="shrink-0 rounded-md bg-gray-900/60 p-1" style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PresetThumbnail
            category={category}
            code={preset.code ?? ''}
            width={preset.width}
            depth={preset.depth}
            height={preset.height}
            color={preset.color}
            levels={preset.levels}
            size={64}
          />
        </div>

        {/* 이름 + 배지 */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white leading-tight truncate">{preset.name}</h4>

          {/* 코드 + 지역 배지 */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-mono text-gray-300 truncate max-w-[100px]">
              {preset.code}
            </span>
            {preset.region && (
              <span className="rounded bg-blue-900/50 px-1.5 py-0.5 text-[10px] text-blue-300">
                {REGION_LABEL[preset.region] ?? preset.region}
              </span>
            )}
            {preset.standard && (
              <span className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] text-emerald-300">
                {preset.standard}
              </span>
            )}
          </div>

          {/* 치수 (컴팩트) */}
          {dims && (
            <div className="mt-1 text-[11px] text-gray-400">
              <span className="font-mono text-gray-300">{dims}</span>
              <span className="text-gray-500"> mm</span>
            </div>
          )}
        </div>
      </div>

      {/* 상세 스펙 */}
      <div className="space-y-0.5 text-[11px] text-gray-400">
        {preset.levels != null && (
          <SpecRow label="단수" value={`${preset.levels}단`} sub={preset.levelHeight ? `단간 ${(preset.levelHeight * 1000).toFixed(0)}mm` : undefined} />
        )}
        {preset.loadPerLevel != null && (
          <SpecRow label="단당 하중" value={`${preset.loadPerLevel.toLocaleString()}kg`} />
        )}
        {preset.maxLoad != null && (
          <SpecRow label="최대 하중" value={`${preset.maxLoad.toLocaleString()}kg`} />
        )}
        {preset.weight != null && preset.weight > 0 && (
          <SpecRow label="자중" value={`${preset.weight}kg`} />
        )}
        {preset.capacity != null && (
          <SpecRow label="용량" value={`${preset.capacity} CBM`} />
        )}
        {preset.qtyPerPallet != null && (
          <SpecRow label="팔레트당" value={`${preset.qtyPerPallet}개 / ${preset.kgPerPallet}kg`} />
        )}
        {preset.innerWidth != null && (
          <SpecRow
            label="내부"
            value={`${(preset.innerWidth * 1000).toFixed(0)} × ${((preset.innerDepth ?? 0) * 1000).toFixed(0)} × ${((preset.innerHeight ?? 0) * 1000).toFixed(0)} mm`}
          />
        )}
      </div>
    </div>
  );
}

function SpecRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono text-gray-300">
        {value}
        {sub && <span className="ml-1 text-gray-500">({sub})</span>}
      </span>
    </div>
  );
}
