import { useState, useEffect, useMemo } from 'react';
import { PresetCard } from './PresetCard';
import { getPresetCategories, getSpatialPresets } from '../../api/preset-api';
import type { PresetCategory, SpatialPreset } from '../../types/preset';

interface PresetCatalogProps {
  visible: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: SpatialPreset) => void;
}

// 카테고리별 아이콘 + 색상 매핑
const CATEGORY_META: Record<string, { icon: string; color: string; group: string }> = {
  RACK:           { icon: '🏗️', color: '#f59e0b', group: '보관' },
  PALLET:         { icon: '📦', color: '#8b5cf6', group: '보관' },
  LOADED_PALLET:  { icon: '📦', color: '#a78bfa', group: '보관' },
  CONTAINER:      { icon: '🚢', color: '#3b82f6', group: '보관' },
  PRODUCT_BOX:    { icon: '📋', color: '#22c55e', group: '보관' },
  AISLE:          { icon: '🛤️', color: '#64748b', group: '공간' },
  EQUIPMENT:      { icon: '🔧', color: '#06b6d4', group: '장비' },
  SAFETY:         { icon: '🧯', color: '#ef4444', group: '장비' },
  FACILITY:       { icon: '🏛️', color: '#9ca3af', group: '장비' },
  FLOOR:          { icon: '⬜', color: '#6b7b8d', group: '공간' },
  WALL:           { icon: '🧱', color: '#9a978f', group: '공간' },
  DOOR:           { icon: '🚪', color: '#6b7280', group: '공간' },
};

/**
 * 프리셋 카탈로그 패널 — 그룹별 카테고리 탭 + 프리셋 카드 목록
 */
export function PresetCatalog({ visible, onClose, onSelectPreset }: PresetCatalogProps) {
  const [categories, setCategories] = useState<PresetCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [presets, setPresets] = useState<SpatialPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  // 그룹별 카테고리 분류
  const groupedCategories = useMemo(() => {
    const groups: Record<string, PresetCategory[]> = {};
    for (const cat of categories) {
      const meta = CATEGORY_META[cat.name] ?? { group: '기타' };
      if (!groups[meta.group]) groups[meta.group] = [];
      groups[meta.group].push(cat);
    }
    return groups;
  }, [categories]);

  // 검색 필터링
  const filteredPresets = useMemo(() => {
    if (!searchTerm.trim()) return presets;
    const term = searchTerm.toLowerCase();
    return presets.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      (p.code ?? '').toLowerCase().includes(term) ||
      (p.standard ?? '').toLowerCase().includes(term)
    );
  }, [presets, searchTerm]);

  if (!visible) return null;

  const activeCategoryData = categories.find((c) => c.id === activeCategory);
  const activeMeta = activeCategoryData ? (CATEGORY_META[activeCategoryData.name] ?? { icon: '📁', color: '#6b7280' }) : null;

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

      {/* 그룹별 카테고리 섹션 */}
      <div className="border-b border-gray-700 px-3 py-2 space-y-1.5">
        {Object.entries(groupedCategories).map(([groupName, cats]) => (
          <div key={groupName}>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">
              {groupName}
            </div>
            <div className="flex flex-wrap gap-1">
              {cats.map((cat) => {
                const meta = CATEGORY_META[cat.name] ?? { icon: '📁', color: '#6b7280' };
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setSearchTerm(''); }}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-gray-200'
                    }`}
                    style={isActive ? { background: `${meta.color}22`, borderLeft: `2px solid ${meta.color}` } : {}}
                  >
                    <span className="text-xs">{meta.icon}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 활성 카테고리 타이틀 + 검색 */}
      <div className="border-b border-gray-800 px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          {activeMeta && <span className="text-base">{activeMeta.icon}</span>}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {activeCategoryData?.label ?? '카테고리'}
            </div>
            {activeCategoryData?.description && (
              <div className="text-[10px] text-gray-500 truncate">{activeCategoryData.description}</div>
            )}
          </div>
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
            {filteredPresets.length}
          </span>
        </div>

        {/* 검색 입력 */}
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04Z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="프리셋 검색..."
            className="w-full rounded-md border border-gray-700 bg-gray-800/60 py-1.5 pl-7 pr-2 text-[11px] text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* 프리셋 카드 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex h-20 items-center justify-center text-xs text-gray-500">
            로딩 중...
          </div>
        ) : filteredPresets.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-xs text-gray-500">
            {searchTerm ? '검색 결과 없음' : '프리셋이 없습니다'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPresets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} onSelect={onSelectPreset} />
            ))}
          </div>
        )}
      </div>

      {/* 하단 요약 */}
      <div className="border-t border-gray-700 px-4 py-2 text-[11px] text-gray-500">
        {filteredPresets.length}개 규격 · warehouse-standards.md 기반
      </div>
    </div>
  );
}
