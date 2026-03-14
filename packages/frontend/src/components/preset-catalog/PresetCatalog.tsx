import { useState, useEffect } from 'react';
import { PresetCard } from './PresetCard';
import { getPresetCategories, getSpatialPresets } from '../../api/preset-api';
import type { PresetCategory, SpatialPreset } from '../../types/preset';

interface PresetCatalogProps {
  visible: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: SpatialPreset) => void;
}

/**
 * 프리셋 카탈로그 패널 — 카테고리 탭 + 프리셋 카드 목록
 */
export function PresetCatalog({ visible, onClose, onSelectPreset }: PresetCatalogProps) {
  const [categories, setCategories] = useState<PresetCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [presets, setPresets] = useState<SpatialPreset[]>([]);
  const [loading, setLoading] = useState(true);

  // 카테고리 로드
  useEffect(() => {
    getPresetCategories().then((data) => {
      setCategories(data);
      if (data.length > 0 && !activeCategory) {
        setActiveCategory(data[0].id);
      }
    });
  }, []);

  // 프리셋 로드 (카테고리 변경 시)
  useEffect(() => {
    if (!activeCategory) return;
    setLoading(true);
    getSpatialPresets(activeCategory).then((data) => {
      setPresets(data);
      setLoading(false);
    });
  }, [activeCategory]);

  if (!visible) return null;

  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  return (
    <div className="absolute top-0 right-0 flex h-full w-80 flex-col border-l border-gray-700 bg-gray-900/95 text-white backdrop-blur">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <h2 className="text-sm font-bold">표준 규격 카탈로그</h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          aria-label="닫기"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-1 border-b border-gray-700 px-3 py-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 카테고리 설명 */}
      {activeCategoryData?.description && (
        <div className="border-b border-gray-800 px-4 py-2">
          <p className="text-[11px] text-gray-500">{activeCategoryData.description}</p>
        </div>
      )}

      {/* 프리셋 카드 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex h-20 items-center justify-center text-xs text-gray-500">
            로딩 중...
          </div>
        ) : presets.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-xs text-gray-500">
            프리셋이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} onSelect={onSelectPreset} />
            ))}
          </div>
        )}
      </div>

      {/* 하단 요약 */}
      <div className="border-t border-gray-700 px-4 py-2 text-[11px] text-gray-500">
        {presets.length}개 규격 · warehouse-standards.md 기반
      </div>
    </div>
  );
}
