import { useState, useCallback } from 'react';
import { X, RotateCcw, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { SpatialObject } from '../../types/spatial';
import type { BinOccupancy } from './BinPlacement';

// warehouse-standards.md 기준 기본 층 높이
const DEFAULT_LEVEL_HEIGHTS: Record<string, number> = {
  KR_STANDARD: 1.5,
  KR_LARGE: 1.4,
  KR_HEAVY: 1.4,
  KR_HIGH: 1.4,
  EU_STANDARD: 1.4,
  EU_LARGE: 1.5,
  US_STANDARD: 1.4,
  US_LARGE: 1.4,
  DRIVE_IN: 1.4,
  FLOW_RACK: 1.4,
  CANTILEVER: 0.9,
};

interface RackDetailPanelProps {
  rack: SpatialObject;
  occupancy: BinOccupancy[];
  onClose: () => void;
  onUpdateRack: (updated: SpatialObject) => void;
  onAddBinItem?: (rackId: string, level: number) => void;
  onRemoveBinItem?: (rackId: string, level: number) => void;
}

/**
 * 랙 상세 정보 패널 — 더블클릭 시 우측 슬라이드인
 * - 기본 정보 (이름, 위치, 규격)
 * - 층별 현황 테이블 (높이 조절 슬라이더)
 * - 총 적재율 게이지
 * - 층별 팔레트/박스 목록
 * - 팔레트 추가 / 박스 추가 / 비우기 버튼
 */
export function RackDetailPanel({
  rack,
  occupancy,
  onClose,
  onUpdateRack,
  onAddBinItem,
  onRemoveBinItem,
}: RackDetailPanelProps) {
  const meta = rack.metadata as Record<string, unknown> | null;
  const levels = (meta?.levels as number) ?? 3;
  const levelHeight = (meta?.levelHeight as number) ?? 1.5;
  const loadPerLevel = (meta?.loadPerLevel as number) ?? 1000;
  const presetCode = (meta?.presetCode as string) ?? '';

  // 층별 높이 상태 (초기값: metadata.levelHeights 또는 기본값)
  const initialHeights = (meta?.levelHeights as number[]) ?? Array.from({ length: levels }, () => levelHeight);
  const [levelHeights, setLevelHeights] = useState<number[]>(initialHeights);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  const rackOccupancy = occupancy.filter((o) => o.rackId === rack.id);
  const occupancyRate = levels > 0 ? Math.round((rackOccupancy.length / levels) * 100) : 0;

  // 적재율 색상
  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return '#F85149';
    if (rate >= 70) return '#F59E0B';
    return '#3FB950';
  };

  // 층 높이 변경
  const handleLevelHeightChange = useCallback((levelIdx: number, newHeight: number) => {
    // 최소 높이: 해당 층 오브젝트 높이 + 0.1m
    const item = rackOccupancy.find((o) => o.level === levelIdx);
    const minHeight = item ? item.height + 0.1 : 0.3;
    const clampedHeight = Math.max(minHeight, Math.min(3.0, newHeight));

    setLevelHeights((prev) => {
      const updated = [...prev];
      updated[levelIdx] = clampedHeight;
      return updated;
    });
  }, [rackOccupancy]);

  // 높이 변경 적용 → 3D 업데이트
  const handleApplyHeights = useCallback(() => {
    const totalHeight = levelHeights.reduce((sum, h) => sum + h, 0);
    const updatedMeta = { ...meta, levelHeights, levelHeight: levelHeights[0] };
    onUpdateRack({
      ...rack,
      scaleY: totalHeight,
      positionY: totalHeight / 2,
      metadata: updatedMeta,
    });
  }, [rack, levelHeights, meta, onUpdateRack]);

  // warehouse-standards.md 기준값으로 리셋
  const handleResetHeights = useCallback(() => {
    const defaultH = DEFAULT_LEVEL_HEIGHTS[presetCode] ?? levelHeight;
    const resetHeights = Array.from({ length: levels }, () => defaultH);
    setLevelHeights(resetHeights);
  }, [presetCode, levelHeight, levels]);

  // 층 클릭 토글
  const toggleLevel = (idx: number) => {
    setExpandedLevel((prev) => (prev === idx ? null : idx));
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#1A1D24', color: '#E6EDF3', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #2A2F38', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>랙 상세</h3>
          <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'monospace' }}>{rack.code}</span>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #30363D', background: 'transparent', color: '#8B949E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 기본 정보 */}
        <Section title="기본 정보">
          <InfoRow label="이름" value={rack.name} />
          <InfoRow label="규격" value={`${rack.scaleX.toFixed(1)} × ${rack.scaleY.toFixed(1)} × ${rack.scaleZ.toFixed(1)} m`} />
          <InfoRow label="위치" value={`X ${rack.positionX.toFixed(1)}  Y ${rack.positionY.toFixed(1)}  Z ${rack.positionZ.toFixed(1)}`} />
          <InfoRow label="층 수" value={`${levels}단`} />
          <InfoRow label="단당 하중" value={`${loadPerLevel} kg`} />
        </Section>

        {/* 총 적재율 게이지 */}
        <Section title="적재 현황">
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
              <span style={{ color: '#8B949E' }}>총 적재율</span>
              <span style={{ fontWeight: 700, color: getOccupancyColor(occupancyRate) }}>
                {occupancyRate}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#12151A' }}>
              <div style={{
                height: '100%',
                width: `${occupancyRate}%`,
                borderRadius: 4,
                background: `linear-gradient(90deg, ${getOccupancyColor(occupancyRate)}, ${getOccupancyColor(occupancyRate)}aa)`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#484F58' }}>
            {rackOccupancy.length} / {levels} 슬롯 사용 중
          </div>
        </Section>

        {/* 층별 현황 */}
        <Section title="층별 현황">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from({ length: levels }, (_, i) => {
              const levelIdx = levels - 1 - i; // 위에서 아래 순서
              const item = rackOccupancy.find((o) => o.level === levelIdx);
              const height = levelHeights[levelIdx] ?? levelHeight;
              const isExpanded = expandedLevel === levelIdx;
              const minH = item ? item.height + 0.1 : 0.3;

              return (
                <div key={levelIdx} style={{ borderRadius: 8, border: `1px solid ${item ? 'rgba(63,185,80,0.2)' : '#21262D'}`, background: item ? 'rgba(63,185,80,0.05)' : '#12151A', overflow: 'hidden' }}>
                  {/* 층 헤더 */}
                  <button
                    onClick={() => toggleLevel(levelIdx)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', background: 'transparent', color: '#E6EDF3', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', textAlign: 'left' }}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span style={{ fontWeight: 700, color: '#484F58', minWidth: 28, fontFamily: 'monospace' }}>L{levelIdx + 1}</span>
                    <span style={{ flex: 1, color: item ? '#E6EDF3' : '#484F58' }}>
                      {item ? item.itemName : '빈 슬롯'}
                    </span>
                    <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'monospace' }}>
                      {height.toFixed(2)}m
                    </span>
                    {item && (
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: item.itemColor, flexShrink: 0 }} />
                    )}
                  </button>

                  {/* 확장 영역 */}
                  {isExpanded && (
                    <div style={{ padding: '8px 10px 12px', borderTop: '1px solid #21262D' }}>
                      {/* 층 높이 슬라이더 */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: '#8B949E' }}>층 높이</span>
                          <input
                            type="number"
                            step="0.05"
                            min={minH}
                            max={3.0}
                            value={height.toFixed(2)}
                            onChange={(e) => handleLevelHeightChange(levelIdx, parseFloat(e.target.value) || minH)}
                            style={{ width: 60, padding: '3px 6px', borderRadius: 4, border: '1px solid #30363D', background: '#0D1117', color: '#E6EDF3', fontSize: 11, fontFamily: 'monospace', textAlign: 'center', outline: 'none' }}
                          />
                        </div>
                        <input
                          type="range"
                          min={minH}
                          max={3.0}
                          step={0.05}
                          value={height}
                          onChange={(e) => handleLevelHeightChange(levelIdx, parseFloat(e.target.value))}
                          style={{ width: '100%', height: 4, accentColor: '#2D7DD2' }}
                        />
                      </div>

                      {/* 적재 아이템 정보 */}
                      {item ? (
                        <div style={{ fontSize: 10, color: '#8B949E', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>타입</span>
                            <span style={{ color: '#E6EDF3' }}>{item.itemType === 'pallet' ? '팔레트' : '박스'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>크기</span>
                            <span style={{ color: '#E6EDF3' }}>{item.width} × {item.depth} × {item.height}m</span>
                          </div>
                          {item.height > height && (
                            <div style={{ padding: '4px 8px', borderRadius: 4, background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: '#F85149', fontSize: 10 }}>
                              높이 초과 ({item.height.toFixed(2)}m &gt; {height.toFixed(2)}m)
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => onAddBinItem?.(rack.id, levelIdx)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px', borderRadius: 6, border: '1px solid rgba(45,125,210,0.3)', background: 'rgba(45,125,210,0.08)', color: '#2D7DD2', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            <Plus size={10} /> 추가
                          </button>
                        </div>
                      )}

                      {/* 비우기 버튼 */}
                      {item && (
                        <button
                          onClick={() => onRemoveBinItem?.(rack.id, levelIdx)}
                          style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px', borderRadius: 6, border: '1px solid rgba(248,81,73,0.2)', background: 'transparent', color: '#F85149', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <Trash2 size={10} /> 비우기
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* 높이 조절 액션 */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleApplyHeights}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#2D7DD2', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            높이 적용
          </button>
          <button
            onClick={handleResetHeights}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #30363D', background: 'transparent', color: '#8B949E', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
          >
            <RotateCcw size={12} /> 리셋
          </button>
        </div>
      </div>
    </div>
  );
}

// 섹션 컴포넌트
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 style={{ fontSize: 11, fontWeight: 600, color: '#484F58', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, margin: 0, marginBottom: 8 }}>{title}</h4>
      {children}
    </div>
  );
}

// 정보 행
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 11 }}>
      <span style={{ color: '#8B949E' }}>{label}</span>
      <span style={{ color: '#E6EDF3', fontFamily: 'monospace', fontSize: 10 }}>{value}</span>
    </div>
  );
}
