import type { SpatialPreset } from '../../types/preset';

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

/**
 * 개별 프리셋 규격 카드
 */
export function PresetCard({ preset, onSelect }: PresetCardProps) {
  // 치수 포맷 (0인 축은 생략)
  const dims = [preset.width, preset.depth, preset.height]
    .filter((v) => v > 0)
    .map((v) => `${(v * 1000).toFixed(0)}`)
    .join(' × ');

  return (
    <div
      onClick={() => onSelect?.(preset)}
      className={`rounded-lg border border-gray-700 bg-gray-800/80 p-3 transition-colors hover:border-gray-500 ${onSelect ? 'cursor-pointer hover:border-blue-500/50' : ''}`}
    >
      {/* 헤더 */}
      <div className="mb-2 flex items-start justify-between">
        <h4 className="text-sm font-semibold text-white leading-tight">{preset.name}</h4>
        {preset.color && (
          <span
            className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-gray-600"
            style={{ backgroundColor: preset.color }}
          />
        )}
      </div>

      {/* 코드 + 지역 배지 */}
      <div className="mb-2 flex flex-wrap gap-1">
        <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-mono text-gray-300">
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

      {/* 치수 */}
      {dims && (
        <div className="mb-1 text-xs text-gray-400">
          <span className="text-gray-500">치수</span>{' '}
          <span className="font-mono text-gray-300">{dims}</span>
          <span className="text-gray-500"> mm</span>
        </div>
      )}

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
