import { useState, useEffect } from 'react';
import {
  Package,
  Container,
  LayoutGrid,
  Route,
  ShieldAlert,
  Layers,
  Eye,
  EyeOff,
  ChevronLeft,
  Square,
  PanelTop,
  DoorOpen,
} from 'lucide-react';
import { PresetCard } from '../preset-catalog/PresetCard';
import { getPresetCategories, getSpatialPresets } from '../../api/preset-api';
import type { PresetCategory, SpatialPreset } from '../../types/preset';
import type { ZoneType } from './ZoneDrawing';

// 좌측 탭 정의
type SidebarTab = 'catalog' | 'zones' | 'layers';

interface EditorLeftSidebarProps {
  onSelectPreset?: (preset: SpatialPreset) => void;
  layerVisibility: { racks: boolean; aisles: boolean; zones: boolean };
  onLayerToggle: (layer: 'racks' | 'aisles' | 'zones') => void;
  onDrawZone: (type: ZoneType) => void;
  zones: Array<{ id: string; name: string; type: ZoneType }>;
  onDeleteZone: (id: string) => void;
}

const ZONE_COLORS: Record<ZoneType, string> = {
  STORAGE: '#3B82F6',
  PICKING: '#10B981',
  STAGING: '#F59E0B',
  SAFETY: '#EF4444',
};

const ZONE_LABELS: Record<ZoneType, string> = {
  STORAGE: '보관',
  PICKING: '피킹',
  STAGING: '스테이징',
  SAFETY: '안전',
};

/**
 * 좌측 사이드바 — 오늘의집 스타일
 * 아이콘 탭 (56px) + 확장 패널 (280px)
 */
export function EditorLeftSidebar({
  onSelectPreset,
  layerVisibility,
  onLayerToggle,
  onDrawZone,
  zones,
  onDeleteZone,
}: EditorLeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab | null>('catalog');
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

  // 프리셋 로드
  useEffect(() => {
    if (!activeCategory) return;
    setLoading(true);
    getSpatialPresets(activeCategory).then((data) => {
      setPresets(data);
      setLoading(false);
    });
  }, [activeCategory]);

  const expanded = activeTab !== null;

  const handleTabClick = (tab: SidebarTab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  // 카테고리 아이콘 매핑
  const getCategoryIcon = (label: string) => {
    if (label.includes('랙')) return <Package size={16} />;
    if (label.includes('팔레트')) return <LayoutGrid size={16} />;
    if (label.includes('컨테이너')) return <Container size={16} />;
    if (label.includes('통로')) return <Route size={16} />;
    if (label.includes('바닥')) return <Square size={16} />;
    if (label.includes('벽')) return <PanelTop size={16} />;
    if (label.includes('출입문') || label.includes('문')) return <DoorOpen size={16} />;
    return <Package size={16} />;
  };

  return (
    <div className="flex h-full min-h-0 select-none">
      {/* 아이콘 탭 바 (56px) */}
      <div className="flex w-14 flex-col items-center border-r border-[var(--border-muted)] bg-[var(--bg-primary)] py-2">
        <SideTabBtn
          icon={<Package size={18} />}
          label="카탈로그"
          active={activeTab === 'catalog'}
          onClick={() => handleTabClick('catalog')}
        />
        <SideTabBtn
          icon={<ShieldAlert size={18} />}
          label="구역"
          active={activeTab === 'zones'}
          onClick={() => handleTabClick('zones')}
          badge={zones.length > 0 ? zones.length : undefined}
        />
        <SideTabBtn
          icon={<Layers size={18} />}
          label="레이어"
          active={activeTab === 'layers'}
          onClick={() => handleTabClick('layers')}
        />
      </div>

      {/* 확장 패널 (280px) */}
      {expanded && (
        <div className="flex h-full min-h-0 w-72 flex-col overflow-hidden border-r border-[var(--border-muted)] bg-[var(--bg-secondary)]">
          {/* 패널 헤더 */}
          <div className="flex items-center justify-between border-b border-[var(--border-muted)] px-4 py-3">
            <h3 className="text-sm font-semibold text-white">
              {activeTab === 'catalog' && '카탈로그'}
              {activeTab === 'zones' && '구역 관리'}
              {activeTab === 'layers' && '레이어'}
            </h3>
            <button
              onClick={() => setActiveTab(null)}
              className="rounded p-1 text-gray-500 transition-colors hover:bg-[var(--border-muted)] hover:text-gray-300"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          {/* 카탈로그 탭 내용 */}
          {activeTab === 'catalog' && (
            <>
              {/* 카테고리 탭 — 고정 + 가로 스크롤 */}
              <div className="sticky top-0 z-10 flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border-muted)] bg-[var(--bg-secondary)] px-3 py-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                      activeCategory === cat.id
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-gray-500 hover:bg-[var(--bg-tertiary)] hover:text-gray-300'
                    }`}
                  >
                    {getCategoryIcon(cat.label)}
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* 프리셋 카드 목록 */}
              <div className="flex-1 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-default) var(--bg-secondary)' }}>
                {loading ? (
                  <div className="flex h-20 items-center justify-center text-xs text-gray-600">
                    로딩 중...
                  </div>
                ) : presets.length === 0 ? (
                  <div className="flex h-20 items-center justify-center text-xs text-gray-600">
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
              <div className="border-t border-[var(--border-muted)] px-4 py-2 text-[10px] text-gray-600">
                {presets.length}개 규격 · warehouse-standards.md 기반
              </div>
            </>
          )}

          {/* 구역 관리 탭 내용 */}
          {activeTab === 'zones' && (
            <>
              {/* 구역 추가 버튼 */}
              <div className="border-b border-[var(--border-muted)] px-3 py-3">
                <p className="mb-2 text-[11px] text-gray-500">새 구역 그리기</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['STORAGE', 'PICKING', 'STAGING', 'SAFETY'] as ZoneType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => onDrawZone(type)}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium transition-all hover:brightness-125"
                      style={{
                        background: `${ZONE_COLORS[type]}15`,
                        border: `1px solid ${ZONE_COLORS[type]}30`,
                        color: ZONE_COLORS[type],
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: ZONE_COLORS[type] }}
                      />
                      {ZONE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 기존 구역 목록 */}
              <div className="flex-1 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-default) var(--bg-secondary)' }}>
                {zones.length === 0 ? (
                  <div className="flex h-20 items-center justify-center text-xs text-gray-600">
                    구역이 없습니다
                  </div>
                ) : (
                  <div className="space-y-1">
                    {zones.map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-tertiary)]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: ZONE_COLORS[zone.type] }}
                          />
                          <span className="text-xs text-gray-300">{zone.name}</span>
                        </div>
                        <button
                          onClick={() => onDeleteZone(zone.id)}
                          className="rounded p-0.5 text-gray-600 transition-colors hover:bg-red-900/30 hover:text-red-400"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 레이어 탭 내용 */}
          {activeTab === 'layers' && (
            <div className="flex-1 px-3 py-3">
              <div className="space-y-1">
                <LayerRow
                  label="랙"
                  color="#F59E0B"
                  visible={layerVisibility.racks}
                  onToggle={() => onLayerToggle('racks')}
                />
                <LayerRow
                  label="통로"
                  color="#64748B"
                  visible={layerVisibility.aisles}
                  onToggle={() => onLayerToggle('aisles')}
                />
                <LayerRow
                  label="구역·안전"
                  color="#3B82F6"
                  visible={layerVisibility.zones}
                  onToggle={() => onLayerToggle('zones')}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 사이드바 아이콘 탭 버튼
function SideTabBtn({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative mb-1 flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
        active
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-gray-500 hover:bg-[var(--bg-secondary)] hover:text-gray-300'
      }`}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

// 레이어 행
function LayerRow({
  label,
  color,
  visible,
  onToggle,
}: {
  label: string;
  color: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-tertiary)]"
    >
      <span
        className="h-3 w-3 rounded"
        style={{ background: visible ? color : 'var(--border-muted)' }}
      />
      <span className={`flex-1 text-left text-xs ${visible ? 'text-gray-300' : 'text-gray-600'}`}>
        {label}
      </span>
      {visible ? (
        <Eye size={14} className="text-gray-400" />
      ) : (
        <EyeOff size={14} className="text-gray-600" />
      )}
    </button>
  );
}
