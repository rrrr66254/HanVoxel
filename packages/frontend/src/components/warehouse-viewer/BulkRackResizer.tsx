import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { X, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import type { SpatialObject } from '../../types/spatial';

interface BulkRackResizerProps {
  /** 크기 수정 대상 랙 목록 */
  racks: SpatialObject[];
  /** 씬 내 전체 오브젝트 (충돌 검사용) */
  allObjects: SpatialObject[];
  /** 실시간 프리뷰 (DB 저장 없이) */
  onPreview: (updated: SpatialObject[]) => void;
  /** 저장 (DB 반영) */
  onSave: (updated: SpatialObject[]) => void;
  /** 닫기 (변경 취소) */
  onClose: () => void;
}

// 슬라이더 범위 상수
const RANGE = {
  width:  { min: 1.0, max: 6.0, step: 0.1, label: '너비 (W)' },
  depth:  { min: 0.5, max: 6.0, step: 0.1, label: '깊이 (D)' },
  height: { min: 2.0, max: 12.0, step: 0.1, label: '높이 (H)' },
  levels: { min: 1, max: 10, step: 1, label: '단수' },
  levelHeight: { min: 0.8, max: 3.0, step: 0.05, label: '단간 높이' },
};

/**
 * 오버랩 방지 자동 위치 조정
 * 랙의 크기가 변경되면, 주변 랙과 겹치지 않도록 위치를 재배치한다.
 * 전략: 각 랙의 기존 정렬 방향(행/열)을 감지하고, 간격을 유지하며 재배치
 */
function autoRepositionRacks(
  racks: SpatialObject[],
  allObjects: SpatialObject[],
  excludeIds: Set<string>,
): SpatialObject[] {
  if (racks.length <= 1) return racks;

  // 랙 그룹의 주축 방향 감지 (X축/Z축 정렬 여부)
  // 같은 Z에 있는 랙이 많으면 → X축 정렬 (가로 행)
  // 같은 X에 있는 랙이 많으면 → Z축 정렬 (세로 열)
  const zGroups = new Map<string, SpatialObject[]>();
  const xGroups = new Map<string, SpatialObject[]>();
  for (const r of racks) {
    const zKey = r.positionZ.toFixed(1);
    const xKey = r.positionX.toFixed(1);
    if (!zGroups.has(zKey)) zGroups.set(zKey, []);
    if (!xGroups.has(xKey)) xGroups.set(xKey, []);
    zGroups.get(zKey)!.push(r);
    xGroups.get(xKey)!.push(r);
  }

  // 가장 큰 그룹 기준 주축 결정
  let maxZGroupSize = 0;
  let maxXGroupSize = 0;
  zGroups.forEach((g) => { if (g.length > maxZGroupSize) maxZGroupSize = g.length; });
  xGroups.forEach((g) => { if (g.length > maxXGroupSize) maxXGroupSize = g.length; });

  const result = [...racks];

  // 행 기반 재배치 (같은 Z에 있는 랙들을 X축으로 정렬)
  if (maxZGroupSize >= maxXGroupSize) {
    // Z 기준 그룹별 처리
    zGroups.forEach((group) => {
      if (group.length <= 1) return;
      // X 좌표 순 정렬
      group.sort((a, b) => a.positionX - b.positionX);

      // 기존 간격 계산 (첫 번째 ~ 두 번째 사이 간격 기반)
      const firstRack = group[0];
      const gap = group.length > 1
        ? Math.max(0.2, (group[1].positionX - group[0].positionX) - (group[0].scaleX / 2 + group[1].scaleX / 2))
        : 0.2;

      // 시작점 (첫 번째 랙의 좌측 모서리)
      let currentX = firstRack.positionX;

      for (let i = 0; i < group.length; i++) {
        const rIdx = result.findIndex((r) => r.id === group[i].id);
        if (rIdx < 0) continue;

        if (i === 0) {
          currentX = result[rIdx].positionX;
        } else {
          const prevIdx = result.findIndex((r) => r.id === group[i - 1].id);
          if (prevIdx >= 0) {
            currentX = result[prevIdx].positionX + result[prevIdx].scaleX / 2 + gap + result[rIdx].scaleX / 2;
          }
          result[rIdx] = { ...result[rIdx], positionX: currentX };
        }
      }
    });
  } else {
    // 열 기반 재배치 (같은 X에 있는 랙들을 Z축으로 정렬)
    xGroups.forEach((group) => {
      if (group.length <= 1) return;
      group.sort((a, b) => a.positionZ - b.positionZ);

      const gap = group.length > 1
        ? Math.max(0.2, (group[1].positionZ - group[0].positionZ) - (group[0].scaleZ / 2 + group[1].scaleZ / 2))
        : 0.2;

      let currentZ = group[0].positionZ;

      for (let i = 0; i < group.length; i++) {
        const rIdx = result.findIndex((r) => r.id === group[i].id);
        if (rIdx < 0) continue;

        if (i === 0) {
          currentZ = result[rIdx].positionZ;
        } else {
          const prevIdx = result.findIndex((r) => r.id === group[i - 1].id);
          if (prevIdx >= 0) {
            currentZ = result[prevIdx].positionZ + result[prevIdx].scaleZ / 2 + gap + result[rIdx].scaleZ / 2;
          }
          result[rIdx] = { ...result[rIdx], positionZ: currentZ };
        }
      }
    });
  }

  // 외부 오브젝트와의 충돌 해소 (대상 랙이 아닌 오브젝트와)
  const others = allObjects.filter((o) => {
    if (excludeIds.has(o.id)) return false;
    if (!o.isActive) return false;
    const tn = o.type.name;
    // 바닥/통로/구역은 충돌 무시
    if (tn === 'FLOOR' || tn === 'AISLE' || tn === 'ZONE' || tn === 'SAFETY_ZONE') return false;
    const m = o.metadata as Record<string, unknown> | null;
    if (m?.floorStyle || m?.aisleType) return false;
    return true;
  });

  for (let i = 0; i < result.length; i++) {
    const r = result[i];
    for (const other of others) {
      if (boxOverlaps(r, other)) {
        // 가장 가까운 방향으로 밀어냄
        const dx = r.positionX - other.positionX;
        const dz = r.positionZ - other.positionZ;
        const overlapX = (r.scaleX / 2 + other.scaleX / 2) - Math.abs(dx);
        const overlapZ = (r.scaleZ / 2 + other.scaleZ / 2) - Math.abs(dz);

        if (overlapX < overlapZ) {
          result[i] = { ...result[i], positionX: r.positionX + (dx >= 0 ? overlapX + 0.1 : -(overlapX + 0.1)) };
        } else {
          result[i] = { ...result[i], positionZ: r.positionZ + (dz >= 0 ? overlapZ + 0.1 : -(overlapZ + 0.1)) };
        }
      }
    }
  }

  return result;
}

// AABB 오버랩 검사
function boxOverlaps(a: SpatialObject, b: SpatialObject): boolean {
  const margin = 0.05;
  return (
    a.positionX - a.scaleX / 2 < b.positionX + b.scaleX / 2 - margin &&
    a.positionX + a.scaleX / 2 > b.positionX - b.scaleX / 2 + margin &&
    a.positionY - a.scaleY / 2 < b.positionY + b.scaleY / 2 - margin &&
    a.positionY + a.scaleY / 2 > b.positionY - b.scaleY / 2 + margin &&
    a.positionZ - a.scaleZ / 2 < b.positionZ + b.scaleZ / 2 - margin &&
    a.positionZ + a.scaleZ / 2 > b.positionZ - b.scaleZ / 2 + margin
  );
}

/**
 * 다중 랙 일괄 크기 수정 패널
 * - 슬라이더로 W/D/H/단수/단간높이 일괄 조정
 * - 실시간 3D 프리뷰
 * - 오버랩 방지 자동 위치 조정
 */
export function BulkRackResizer({ racks, allObjects, onPreview, onSave, onClose }: BulkRackResizerProps) {
  // 원본 백업 (취소 시 복원용)
  const originalRacks = useRef(racks.map((r) => ({ ...r }))).current;

  // 초기 평균값 계산
  const initAvg = useMemo(() => {
    let w = 0, d = 0, h = 0, lv = 0, lh = 0;
    for (const r of racks) {
      const meta = r.metadata as Record<string, unknown> | null;
      w += r.scaleX;
      d += r.scaleZ;
      h += r.scaleY;
      lv += (meta?.levels as number) ?? 3;
      lh += (meta?.levelHeight as number) ?? 1.5;
    }
    const n = racks.length;
    return {
      width: parseFloat((w / n).toFixed(2)),
      depth: parseFloat((d / n).toFixed(2)),
      height: parseFloat((h / n).toFixed(2)),
      levels: Math.round(lv / n),
      levelHeight: parseFloat((lh / n).toFixed(2)),
    };
  }, [racks]);

  const [width, setWidth] = useState(initAvg.width);
  const [depth, setDepth] = useState(initAvg.depth);
  const [height, setHeight] = useState(initAvg.height);
  const [levels, setLevels] = useState(initAvg.levels);
  const [levelHeight, setLevelHeight] = useState(initAvg.levelHeight);
  const [autoReposition, setAutoReposition] = useState(true);

  // 프리뷰 디바운스
  const previewTimer = useRef<ReturnType<typeof setTimeout>>();

  // 슬라이더 변경 시 실시간 프리뷰
  const emitPreview = useCallback(() => {
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      const excludeIds = new Set(racks.map((r) => r.id));
      let updated = racks.map((r) => {
        const meta = (r.metadata ?? {}) as Record<string, unknown>;
        return {
          ...r,
          scaleX: width,
          scaleZ: depth,
          scaleY: height,
          // Y 위치 재계산 (바닥 기준)
          positionY: height / 2,
          metadata: {
            ...meta,
            levels,
            levelHeight,
            // 개별 층 높이 배열 초기화
            levelHeights: Array.from({ length: levels }, () => levelHeight),
          },
        };
      });

      // 자동 재배치
      if (autoReposition) {
        updated = autoRepositionRacks(updated, allObjects, excludeIds);
      }

      onPreview(updated);
    }, 30);
  }, [racks, allObjects, width, depth, height, levels, levelHeight, autoReposition, onPreview]);

  useEffect(() => {
    emitPreview();
  }, [width, depth, height, levels, levelHeight, autoReposition]);

  // 저장
  const handleSave = useCallback(() => {
    const excludeIds = new Set(racks.map((r) => r.id));
    let updated = racks.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      return {
        ...r,
        scaleX: width,
        scaleZ: depth,
        scaleY: height,
        positionY: height / 2,
        metadata: {
          ...meta,
          levels,
          levelHeight,
          levelHeights: Array.from({ length: levels }, () => levelHeight),
        },
      };
    });

    if (autoReposition) {
      updated = autoRepositionRacks(updated, allObjects, excludeIds);
    }

    onSave(updated);
  }, [racks, allObjects, width, depth, height, levels, levelHeight, autoReposition, onSave]);

  // 취소 (원본 복원)
  const handleCancel = useCallback(() => {
    onPreview(originalRacks);
    onClose();
  }, [originalRacks, onPreview, onClose]);

  // 리셋 (초기 평균값으로)
  const handleReset = useCallback(() => {
    setWidth(initAvg.width);
    setDepth(initAvg.depth);
    setHeight(initAvg.height);
    setLevels(initAvg.levels);
    setLevelHeight(initAvg.levelHeight);
  }, [initAvg]);

  // 충돌 여부 표시
  const hasOverlap = useMemo(() => {
    if (!autoReposition) {
      // 자동 재배치 비활성 시 수동 충돌 체크
      const excludeIds = new Set(racks.map((r) => r.id));
      const testRacks = racks.map((r) => ({
        ...r,
        scaleX: width, scaleZ: depth, scaleY: height, positionY: height / 2,
      }));
      // 랙 간 충돌
      for (let i = 0; i < testRacks.length; i++) {
        for (let j = i + 1; j < testRacks.length; j++) {
          if (boxOverlaps(testRacks[i], testRacks[j])) return true;
        }
      }
      // 외부 오브젝트 충돌
      const others = allObjects.filter((o) => !excludeIds.has(o.id) && o.isActive && o.type.name !== 'FLOOR' && o.type.name !== 'AISLE');
      for (const r of testRacks) {
        for (const o of others) {
          if (boxOverlaps(r, o)) return true;
        }
      }
    }
    return false;
  }, [racks, allObjects, width, depth, height, autoReposition]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#1A1D24', color: '#E6EDF3', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #2A2F38', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>랙 크기 일괄 수정</h3>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              {racks.length}개
            </span>
          </div>
          <span style={{ fontSize: 10, color: '#484F58' }}>슬라이더를 조절하면 실시간으로 반영됩니다</span>
        </div>
        <button onClick={handleCancel} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #30363D', background: 'transparent', color: '#8B949E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 크기 슬라이더 */}
        <SliderField label={RANGE.width.label} value={width} onChange={setWidth} min={RANGE.width.min} max={RANGE.width.max} step={RANGE.width.step} unit="m" color="#F85149" />
        <SliderField label={RANGE.depth.label} value={depth} onChange={setDepth} min={RANGE.depth.min} max={RANGE.depth.max} step={RANGE.depth.step} unit="m" color="#2D7DD2" />
        <SliderField label={RANGE.height.label} value={height} onChange={setHeight} min={RANGE.height.min} max={RANGE.height.max} step={RANGE.height.step} unit="m" color="#3FB950" />

        <div style={{ height: 1, background: '#2A2F38' }} />

        {/* 단수/단간높이 */}
        <SliderField label={RANGE.levels.label} value={levels} onChange={(v) => setLevels(Math.round(v))} min={RANGE.levels.min} max={RANGE.levels.max} step={RANGE.levels.step} unit="단" color="#F59E0B" />
        <SliderField label={RANGE.levelHeight.label} value={levelHeight} onChange={setLevelHeight} min={RANGE.levelHeight.min} max={RANGE.levelHeight.max} step={RANGE.levelHeight.step} unit="m" color="#A78BFA" />

        <div style={{ height: 1, background: '#2A2F38' }} />

        {/* 자동 재배치 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#E6EDF3' }}>오버랩 방지 자동 배치</div>
            <div style={{ fontSize: 10, color: '#484F58', marginTop: 2 }}>크기 변경 시 랙 간 겹침 자동 해소</div>
          </div>
          <button
            onClick={() => setAutoReposition((v) => !v)}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none',
              background: autoReposition ? '#2D7DD2' : '#30363D',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 8, background: '#fff',
              position: 'absolute', top: 3,
              left: autoReposition ? 21 : 3,
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* 충돌 경고 */}
        {hasOverlap && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 6, background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.25)',
            fontSize: 11, color: '#F85149',
          }}>
            <AlertTriangle size={14} />
            랙이 다른 오브젝트와 겹칩니다. 자동 배치를 켜거나 크기를 줄이세요.
          </div>
        )}

        {/* 현재 값 요약 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          padding: '10px', borderRadius: 8, background: '#0D1117', border: '1px solid #21262D',
        }}>
          <SummaryCell label="W" value={`${width.toFixed(1)}m`} color="#F85149" />
          <SummaryCell label="D" value={`${depth.toFixed(1)}m`} color="#2D7DD2" />
          <SummaryCell label="H" value={`${height.toFixed(1)}m`} color="#3FB950" />
          <SummaryCell label="단수" value={`${levels}단`} color="#F59E0B" />
          <SummaryCell label="단높" value={`${levelHeight.toFixed(2)}m`} color="#A78BFA" />
          <SummaryCell label="하중" value={`${((racks[0]?.metadata as Record<string, unknown> | null)?.loadPerLevel as number ?? 1000)}kg`} color="#8B949E" />
        </div>

        {/* 저장 */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', padding: '10px', borderRadius: 8, border: 'none',
            background: '#2D7DD2', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'inherit',
          }}
        >
          <Save size={14} /> {racks.length}개 랙 일괄 적용
        </button>

        <button onClick={handleReset} style={{
          width: '100%', padding: '9px', borderRadius: 8,
          border: '1px solid rgba(139,148,158,0.2)', background: 'transparent',
          color: '#8B949E', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontFamily: 'inherit',
        }}>
          <RotateCcw size={14} /> 초기값으로 리셋
        </button>
      </div>
    </div>
  );
}

// 슬라이더 필드 컴포넌트
function SliderField({ label, value, onChange, min, max, step, unit, color }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit: string; color: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#8B949E' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            value={typeof value === 'number' ? parseFloat(value.toFixed(step < 1 ? 2 : 0)) : value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            step={step}
            min={min}
            max={max}
            style={{
              width: 56, borderRadius: 4, border: '1px solid #30363D', background: '#0D1117',
              padding: '3px 4px', textAlign: 'center', fontSize: 11, fontFamily: 'monospace',
              color: '#E6EDF3', outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = color; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; }}
          />
          <span style={{ fontSize: 10, color: '#484F58' }}>{unit}</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            width: '100%', height: 4, appearance: 'none', WebkitAppearance: 'none',
            background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #30363D ${((value - min) / (max - min)) * 100}%, #30363D 100%)`,
            borderRadius: 2, outline: 'none', cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
}

// 요약 셀
function SummaryCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#484F58', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}
