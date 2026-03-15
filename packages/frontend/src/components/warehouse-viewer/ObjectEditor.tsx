import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Save, Trash2, Bookmark, RotateCcw } from 'lucide-react';
import type { SpatialObject } from '../../types/spatial';

interface ObjectEditorProps {
  object: SpatialObject;
  onUpdate: (updated: SpatialObject) => void;
  onPreview?: (updated: SpatialObject) => void;
  onSavePreset: (object: SpatialObject) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

// 오브젝트 타입 분류
type ObjectCategory = 'rack' | 'pallet' | 'loadedPallet' | 'box' | 'container' | 'aisle' | 'floor' | 'wall' | 'door' | 'generic';

function getObjectCategory(typeName: string, meta: Record<string, unknown>, code: string): ObjectCategory {
  if (meta.floorStyle) return 'floor';
  if (meta.doorStyle) return 'door';
  if (meta.wallStyle) return 'wall';
  if (typeName === 'FLOOR') return 'floor';
  if (typeName === 'WALL') return 'wall';
  if (typeName === 'AISLE' || meta.aisleType || code.includes('AISLE')) return 'aisle';
  if (typeName === 'RACK' && meta.levels) return 'rack';
  if (code.includes('LOADED')) return 'loadedPallet';
  if (meta.itemType === 'pallet' || code.includes('PALLET') || code.includes('T11') || code.includes('T12') || code.includes('T08')) return 'pallet';
  if (meta.itemType === 'box' || code.includes('BOX_')) return 'box';
  if ((meta.type as string)?.includes?.('FT') || code.includes('REEFER')) return 'container';
  if (typeName === 'RACK') return 'rack';
  return 'generic';
}

// 카테고리 → 한국어 라벨
const CATEGORY_LABELS: Record<ObjectCategory, string> = {
  rack: '랙', pallet: '팔레트', loadedPallet: '적재 팔레트', box: '제품 박스',
  container: '컨테이너', aisle: '통로', floor: '바닥', wall: '벽', door: '출입문', generic: '오브젝트',
};

// 카테고리 → 배지 색상
const CATEGORY_BADGE: Record<ObjectCategory, { bg: string; color: string }> = {
  rack: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  pallet: { bg: 'rgba(139,105,20,0.15)', color: '#B8956A' },
  loadedPallet: { bg: 'rgba(139,105,20,0.15)', color: '#B8956A' },
  box: { bg: 'rgba(180,140,90,0.15)', color: '#D4A44A' },
  container: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
  aisle: { bg: 'rgba(107,114,128,0.15)', color: '#6B7280' },
  floor: { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
  wall: { bg: 'rgba(120,130,150,0.15)', color: '#788296' },
  door: { bg: 'rgba(63,185,80,0.15)', color: '#3FB950' },
  generic: { bg: 'rgba(45,125,210,0.15)', color: '#2D7DD2' },
};

/**
 * 타입별 오브젝트 편집 패널
 * 각 오브젝트 타입에 맞는 전용 필드 표시 + 실시간 프리뷰
 */
export function ObjectEditor({ object, onUpdate, onPreview, onSavePreset, onDelete, onClose }: ObjectEditorProps) {
  const typeName = object.type.name;
  const meta = (object.metadata ?? {}) as Record<string, unknown>;
  const code = object.code?.toUpperCase() ?? '';
  const category = getObjectCategory(typeName, meta, code);

  // 공통 필드
  const [name, setName] = useState(object.name);
  const [scaleX, setScaleX] = useState(object.scaleX);
  const [scaleY, setScaleY] = useState(object.scaleY);
  const [scaleZ, setScaleZ] = useState(object.scaleZ);
  const [positionX, setPositionX] = useState(object.positionX);
  const [positionY, setPositionY] = useState(object.positionY);
  const [positionZ, setPositionZ] = useState(object.positionZ);
  const [rotationY, setRotationY] = useState(object.rotationY * (180 / Math.PI));
  const [opacity, setOpacity] = useState(object.opacity);

  // 랙 전용
  const [rackLevels, setRackLevels] = useState<number>((meta.levels as number) ?? 3);
  const [rackLevelHeight, setRackLevelHeight] = useState<number>((meta.levelHeight as number) ?? 1.5);
  const [rackLoadPerLevel, setRackLoadPerLevel] = useState<number>((meta.loadPerLevel as number) ?? 1000);

  // 팔레트 전용
  const [palletBoxCount, setPalletBoxCount] = useState<number>((meta.boxCount as number) ?? 0);
  const [palletMaxLoad, setPalletMaxLoad] = useState<number>((meta.maxLoad as number) ?? 1000);
  const [palletInDate, setPalletInDate] = useState<string>((meta.inDate as string) ?? '');
  const [palletOutDate, setPalletOutDate] = useState<string>((meta.outDate as string) ?? '');

  // 박스 전용
  const [boxSku, setBoxSku] = useState<string>((meta.skuCode as string) ?? '');
  const [boxQty, setBoxQty] = useState<number>((meta.quantity as number) ?? 1);
  const [boxWeight, setBoxWeight] = useState<number>((meta.weight as number) ?? 0);
  const [boxInDate, setBoxInDate] = useState<string>((meta.inDate as string) ?? '');
  const [boxExpiry, setBoxExpiry] = useState<string>((meta.expiryDate as string) ?? '');

  // 컨테이너 전용
  const [containerPalletCount, setContainerPalletCount] = useState<number>((meta.palletCount as number) ?? 0);
  const [containerOrigin, setContainerOrigin] = useState<string>((meta.origin as string) ?? '');
  const [containerDest, setContainerDest] = useState<string>((meta.destination as string) ?? '');

  // 객체가 변경되면 상태 리셋
  useEffect(() => {
    setName(object.name);
    setScaleX(object.scaleX);
    setScaleY(object.scaleY);
    setScaleZ(object.scaleZ);
    setPositionX(object.positionX);
    setPositionY(object.positionY);
    setPositionZ(object.positionZ);
    setRotationY(object.rotationY * (180 / Math.PI));
    setOpacity(object.opacity);
    const m = (object.metadata ?? {}) as Record<string, unknown>;
    setRackLevels((m.levels as number) ?? 3);
    setRackLevelHeight((m.levelHeight as number) ?? 1.5);
    setRackLoadPerLevel((m.loadPerLevel as number) ?? 1000);
    setPalletBoxCount((m.boxCount as number) ?? 0);
    setPalletMaxLoad((m.maxLoad as number) ?? 1000);
    setPalletInDate((m.inDate as string) ?? '');
    setPalletOutDate((m.outDate as string) ?? '');
    setBoxSku((m.skuCode as string) ?? '');
    setBoxQty((m.quantity as number) ?? 1);
    setBoxWeight((m.weight as number) ?? 0);
    setBoxInDate((m.inDate as string) ?? '');
    setBoxExpiry((m.expiryDate as string) ?? '');
    setContainerPalletCount((m.palletCount as number) ?? 0);
    setContainerOrigin((m.origin as string) ?? '');
    setContainerDest((m.destination as string) ?? '');
  }, [object.id]);

  // 현재 상태로 업데이트 객체 생성
  const buildUpdated = useCallback((): SpatialObject => {
    const updatedMeta = { ...meta };

    // 타입별 메타데이터만 업데이트 (다른 타입 필드는 건드리지 않음)
    switch (category) {
      case 'rack':
        updatedMeta.levels = rackLevels;
        updatedMeta.levelHeight = rackLevelHeight;
        updatedMeta.loadPerLevel = rackLoadPerLevel;
        break;
      case 'pallet':
      case 'loadedPallet':
        updatedMeta.boxCount = palletBoxCount;
        updatedMeta.maxLoad = palletMaxLoad;
        updatedMeta.inDate = palletInDate;
        updatedMeta.outDate = palletOutDate;
        break;
      case 'box':
        updatedMeta.skuCode = boxSku;
        updatedMeta.quantity = boxQty;
        updatedMeta.weight = boxWeight;
        updatedMeta.inDate = boxInDate;
        updatedMeta.expiryDate = boxExpiry;
        break;
      case 'container':
        updatedMeta.palletCount = containerPalletCount;
        updatedMeta.origin = containerOrigin;
        updatedMeta.destination = containerDest;
        break;
      // floor, wall, door, aisle, generic — 공통 필드만 업데이트 (메타데이터 변경 없음)
      default: break;
    }

    return {
      ...object,
      name,
      scaleX, scaleY, scaleZ,
      positionX, positionY, positionZ,
      rotationY: rotationY * (Math.PI / 180),
      opacity,
      metadata: updatedMeta,
    };
  }, [object, name, scaleX, scaleY, scaleZ, positionX, positionY, positionZ, rotationY, opacity, meta, category, rackLevels, rackLevelHeight, rackLoadPerLevel, palletBoxCount, palletMaxLoad, palletInDate, palletOutDate, boxSku, boxQty, boxWeight, boxInDate, boxExpiry, containerPalletCount, containerOrigin, containerDest]);

  // 실시간 프리뷰 (디바운스 50ms)
  const previewTimer = useRef<ReturnType<typeof setTimeout>>();
  const emitPreview = useCallback(() => {
    if (!onPreview) return;
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      onPreview(buildUpdated());
    }, 50);
  }, [onPreview, buildUpdated]);

  // 크기/위치 변경 시 실시간 프리뷰
  useEffect(() => { emitPreview(); }, [scaleX, scaleY, scaleZ, positionX, positionY, positionZ, rotationY, rackLevels, rackLevelHeight, rackLoadPerLevel, opacity]);

  // 적용 (DB 저장)
  const handleApply = useCallback(() => {
    onUpdate(buildUpdated());
  }, [buildUpdated, onUpdate]);

  // 리셋
  const handleReset = useCallback(() => {
    setName(object.name);
    setScaleX(object.scaleX);
    setScaleY(object.scaleY);
    setScaleZ(object.scaleZ);
    setPositionX(object.positionX);
    setPositionY(object.positionY);
    setPositionZ(object.positionZ);
    setRotationY(object.rotationY * (180 / Math.PI));
    setOpacity(1.0);
    emitPreview();
  }, [object, emitPreview]);

  const badge = CATEGORY_BADGE[category];

  // 크기 라벨 (타입별)
  const sizeLabels = category === 'floor'
    ? { x: '가로', y: '', z: '세로' }
    : category === 'wall'
    ? { x: '너비', y: '높이', z: '두께' }
    : { x: 'W', y: 'H', z: 'D' };

  // 바닥은 높이 편집 불필요
  const showHeight = category !== 'floor';

  return (
    <div style={{ width: '100%', height: '100%', background: '#1A1D24', color: '#E6EDF3', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #2A2F38', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{CATEGORY_LABELS[category]} 편집</h3>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: badge.bg, color: badge.color }}>{typeName}</span>
          </div>
          <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'monospace' }}>{object.code}</span>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #30363D', background: 'transparent', color: '#8B949E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 이름 */}
        <FieldRow label="이름">
          <TextInput value={name} onChange={setName} />
        </FieldRow>

        {/* 크기 */}
        <FieldRow label="크기 (m)">
          <div style={{ display: 'flex', gap: 6 }}>
            <NumField label={sizeLabels.x} value={scaleX} onChange={setScaleX} min={0.1} />
            {showHeight && <NumField label={sizeLabels.y} value={scaleY} onChange={setScaleY} min={0.1} />}
            <NumField label={sizeLabels.z} value={scaleZ} onChange={setScaleZ} min={0.1} />
          </div>
        </FieldRow>

        {/* 위치 */}
        <FieldRow label="위치 (m)">
          <div style={{ display: 'flex', gap: 6 }}>
            <NumField label="X" value={positionX} onChange={setPositionX} color="#F85149" />
            <NumField label="Y" value={positionY} onChange={setPositionY} color="#3FB950" />
            <NumField label="Z" value={positionZ} onChange={setPositionZ} color="#2D7DD2" />
          </div>
        </FieldRow>

        {/* 회전 */}
        <FieldRow label="회전 (°)">
          <NumField label="Y" value={rotationY} onChange={setRotationY} />
        </FieldRow>

        {/* 투명도 (바닥/벽/문만) */}
        {(category === 'floor' || category === 'wall' || category === 'door') && (
          <FieldRow label="투명도">
            <input
              type="range" min={0} max={1} step={0.05} value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#2D7DD2' }}
            />
            <span style={{ fontSize: 10, color: '#484F58', textAlign: 'center', display: 'block' }}>{Math.round(opacity * 100)}%</span>
          </FieldRow>
        )}

        {/* 구분선 */}
        <div style={{ height: 1, background: '#2A2F38' }} />

        {/* === 랙 전용 필드 === */}
        {category === 'rack' && (
          <>
            <FieldRow label="층 수">
              <NumField label="단" value={rackLevels} onChange={(v) => setRackLevels(Math.max(1, Math.round(v)))} step={1} min={1} max={10} />
            </FieldRow>
            <FieldRow label="단간 높이 (m)">
              <NumField label="m" value={rackLevelHeight} onChange={setRackLevelHeight} step={0.1} min={0.5} max={3.0} />
            </FieldRow>
            <FieldRow label="단당 하중 (kg)">
              <NumField label="kg" value={rackLoadPerLevel} onChange={setRackLoadPerLevel} step={100} min={100} max={5000} />
            </FieldRow>
          </>
        )}

        {/* === 팔레트 전용 필드 === */}
        {(category === 'pallet' || category === 'loadedPallet') && (
          <>
            <FieldRow label="적재 박스 수">
              <NumField label="개" value={palletBoxCount} onChange={(v) => setPalletBoxCount(Math.max(0, Math.round(v)))} step={1} min={0} />
            </FieldRow>
            <FieldRow label="최대 적재 중량 (kg)">
              <NumField label="kg" value={palletMaxLoad} onChange={setPalletMaxLoad} step={50} min={0} />
            </FieldRow>
            <FieldRow label="입고일">
              <DateInput value={palletInDate} onChange={setPalletInDate} />
            </FieldRow>
            <FieldRow label="출고 예정일">
              <DateInput value={palletOutDate} onChange={setPalletOutDate} />
            </FieldRow>
          </>
        )}

        {/* === 박스 전용 필드 === */}
        {category === 'box' && (
          <>
            <FieldRow label="SKU 코드">
              <TextInput value={boxSku} onChange={setBoxSku} />
            </FieldRow>
            <FieldRow label="수량">
              <NumField label="개" value={boxQty} onChange={(v) => setBoxQty(Math.max(1, Math.round(v)))} step={1} min={1} />
            </FieldRow>
            <FieldRow label="중량 (kg)">
              <NumField label="kg" value={boxWeight} onChange={setBoxWeight} step={1} min={0} />
            </FieldRow>
            <FieldRow label="입고일">
              <DateInput value={boxInDate} onChange={setBoxInDate} />
            </FieldRow>
            <FieldRow label="유통기한">
              <DateInput value={boxExpiry} onChange={setBoxExpiry} />
            </FieldRow>
          </>
        )}

        {/* === 컨테이너 전용 필드 === */}
        {category === 'container' && (
          <>
            <FieldRow label="내부 팔레트 수">
              <NumField label="개" value={containerPalletCount} onChange={(v) => setContainerPalletCount(Math.max(0, Math.round(v)))} step={1} min={0} />
            </FieldRow>
            <FieldRow label="출발지">
              <TextInput value={containerOrigin} onChange={setContainerOrigin} />
            </FieldRow>
            <FieldRow label="목적지">
              <TextInput value={containerDest} onChange={setContainerDest} />
            </FieldRow>
          </>
        )}

        {/* === 통로 전용 정보 === */}
        {category === 'aisle' && (
          <>
            <FieldRow label="통로 타입">
              <div style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #30363D', background: '#0D1117', fontSize: 12, color: '#8B949E' }}>
                {(meta.aisleType as string) ?? '일반 통로'}
              </div>
            </FieldRow>
          </>
        )}

        {/* === 바닥 전용 정보 === */}
        {category === 'floor' && (
          <>
            <FieldRow label="바닥 스타일">
              <div style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #30363D', background: '#0D1117', fontSize: 12, color: '#8B949E' }}>
                {(meta.floorStyle as string) ?? 'EPOXY_GRAY'}
              </div>
            </FieldRow>
            <div style={{ padding: '8px', borderRadius: 6, background: 'rgba(45,125,210,0.08)', border: '1px solid rgba(45,125,210,0.15)', fontSize: 11, color: '#8B949E', lineHeight: 1.6 }}>
              가장자리/모서리 핸들을 드래그하여 크기를 조절할 수 있습니다.
            </div>
          </>
        )}

        {/* === 벽 전용 정보 === */}
        {category === 'wall' && (
          <>
            <FieldRow label="벽 스타일">
              <div style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #30363D', background: '#0D1117', fontSize: 12, color: '#8B949E' }}>
                {(meta.wallStyle as string) ?? 'SANDWICH_PANEL'}
              </div>
            </FieldRow>
            <div style={{ padding: '8px', borderRadius: 6, background: 'rgba(45,125,210,0.08)', border: '1px solid rgba(45,125,210,0.15)', fontSize: 11, color: '#8B949E', lineHeight: 1.6 }}>
              가장자리/모서리 핸들을 드래그하여 크기를 조절할 수 있습니다.
            </div>
          </>
        )}

        {/* === 출입문 전용 정보 === */}
        {category === 'door' && (
          <>
            <FieldRow label="문 스타일">
              <div style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #30363D', background: '#0D1117', fontSize: 12, color: '#8B949E' }}>
                {(meta.doorStyle as string) ?? 'ROLLING_SHUTTER'}
              </div>
            </FieldRow>
          </>
        )}

        {/* 적용 버튼 */}
        <button
          onClick={handleApply}
          style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#2D7DD2', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
        >
          <Save size={14} /> 저장
        </button>

        <div style={{ height: 1, background: '#2A2F38' }} />

        <button onClick={handleReset} style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid rgba(139,148,158,0.2)', background: 'transparent', color: '#8B949E', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
          <RotateCcw size={14} /> 기본값 리셋
        </button>

        <button onClick={() => onSavePreset(object)} style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid rgba(63,185,80,0.3)', background: 'rgba(63,185,80,0.08)', color: '#3FB950', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
          <Bookmark size={14} /> 프리셋 저장
        </button>

        <button onClick={() => onDelete(object.id)} style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid rgba(248,81,73,0.2)', background: 'transparent', color: '#F85149', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
          <Trash2 size={14} /> 삭제
        </button>
      </div>
    </div>
  );
}

// 필드 행
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600, color: '#484F58', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  );
}

// 숫자 입력
function NumField({ label, value, onChange, step = 0.1, min, max, color }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; color?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <span style={{ display: 'block', textAlign: 'center', fontSize: 9, fontWeight: 600, color: color ?? '#484F58', marginBottom: 3 }}>{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={typeof value === 'number' ? parseFloat(value.toFixed(3)) : value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{ width: '100%', borderRadius: 6, border: '1px solid #30363D', background: '#0D1117', padding: '6px 4px', textAlign: 'center', fontSize: 12, fontFamily: 'monospace', color: '#E6EDF3', outline: 'none' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; }}
      />
    </div>
  );
}

// 텍스트 입력
function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', borderRadius: 6, border: '1px solid #30363D', background: '#0D1117', padding: '6px 8px', fontSize: 12, color: '#E6EDF3', outline: 'none', fontFamily: 'inherit' }}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; }}
    />
  );
}

// 날짜 입력
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', borderRadius: 6, border: '1px solid #30363D', background: '#0D1117', padding: '6px 8px', fontSize: 12, color: '#E6EDF3', outline: 'none', fontFamily: 'inherit', colorScheme: 'dark' }}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; }}
    />
  );
}
