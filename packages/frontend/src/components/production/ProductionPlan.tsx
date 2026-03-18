import React, { useState, useMemo } from 'react';
import { Plus, Clock, AlertTriangle, ChevronLeft, ChevronRight, X, Cpu } from 'lucide-react';
import { BomProductSearch } from './BomProductSearch';
import type { BomProduct } from './BomProductSearch';
import { ProductionSuggestions } from './ProductionSuggestions';

// 간트 차트 작업 데이터 타입
interface GanttOrder {
  id: string;
  orderNo: string;
  product: string;
  workCenter: string;
  workCenterName: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  start: string;
  end: string;
  progress: number;
  status: string;
}

interface WorkCenter {
  id: string;
  name: string;
  load: number;
}

interface Props {
  onBack: () => void;
}

// 우선순위별 색상 매핑
const PRIORITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  URGENT: { bg: 'var(--accent-red)', border: 'var(--accent-red)', text: '#ffffff' },
  HIGH: { bg: 'var(--accent-orange)', border: 'var(--accent-orange)', text: '#ffffff' },
  NORMAL: { bg: 'var(--accent-blue)', border: 'var(--accent-blue)', text: '#ffffff' },
  LOW: { bg: 'var(--text-muted)', border: 'var(--text-muted)', text: '#ffffff' },
};

// 우선순위 한글 라벨
const PRIORITY_LABELS: Record<string, string> = {
  URGENT: '긴급', HIGH: '높음', NORMAL: '보통', LOW: '낮음',
};

// 목업 데이터
const MOCK_GANTT: GanttOrder[] = [
  { id: 'wo-1', orderNo: 'WO-20260318-001', product: '브레이크 패드', workCenter: 'wc-1', workCenterName: '1호 프레스', priority: 'HIGH', start: '2026-03-18T09:00', end: '2026-03-18T17:00', progress: 40, status: 'IN_PROGRESS' },
  { id: 'wo-2', orderNo: 'WO-20260318-002', product: '엔진 밸브', workCenter: 'wc-4', workCenterName: '조립 라인 B', priority: 'NORMAL', start: '2026-03-18T08:00', end: '2026-03-18T16:00', progress: 79, status: 'IN_PROGRESS' },
  { id: 'wo-3', orderNo: 'WO-20260318-003', product: '서스펜션 암', workCenter: 'wc-2', workCenterName: '용접 라인 A', priority: 'URGENT', start: '2026-03-18T08:00', end: '2026-03-18T14:00', progress: 56, status: 'IN_PROGRESS' },
  { id: 'wo-4', orderNo: 'WO-20260319-001', product: '배기 매니폴드', workCenter: 'wc-1', workCenterName: '1호 프레스', priority: 'NORMAL', start: '2026-03-19T09:00', end: '2026-03-19T17:00', progress: 0, status: 'PLANNED' },
  { id: 'wo-5', orderNo: 'WO-20260319-002', product: '터보차저 하우징', workCenter: 'wc-2', workCenterName: '용접 라인 A', priority: 'HIGH', start: '2026-03-19T08:00', end: '2026-03-20T12:00', progress: 0, status: 'PLANNED' },
  { id: 'wo-6', orderNo: 'WO-20260320-001', product: '실린더 블록', workCenter: 'wc-3', workCenterName: '도장 공정', priority: 'NORMAL', start: '2026-03-20T09:00', end: '2026-03-21T17:00', progress: 0, status: 'PLANNED' },
];

const MOCK_WORK_CENTERS: WorkCenter[] = [
  { id: 'wc-1', name: '1호 프레스', load: 85 },
  { id: 'wc-2', name: '용접 라인 A', load: 92 },
  { id: 'wc-3', name: '도장 공정', load: 40 },
  { id: 'wc-4', name: '조립 라인 B', load: 110 },
  { id: 'wc-5', name: '검사 공정', load: 25 },
  { id: 'wc-6', name: '2호 프레스', load: 0 },
];

// 간트 차트 상수
const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 48;
const HOURS_PER_DAY = 8; // 근무시간 08:00~16:00 기준
const WORK_START_HOUR = 8;
const DAYS_VISIBLE = 7;
const HOUR_WIDTH = 60; // 시간당 픽셀 너비
const DAY_WIDTH = HOURS_PER_DAY * HOUR_WIDTH;
const TOTAL_WIDTH = DAYS_VISIBLE * DAY_WIDTH;
const LABEL_WIDTH = 180;

// 공통 스타일
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-default)',
  background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box',
};

export function ProductionPlan({ onBack }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [ganttOrders, setGanttOrders] = useState<GanttOrder[]>(MOCK_GANTT);
  const [showCreate, setShowCreate] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 수주 기반 생산 계획 추천 건수 (목업)
  const pendingSuggestionCount = 4;
  // 긴급 추천 존재 여부 (CRITICAL 있으면 오렌지 배경)
  const hasCriticalSuggestion = true;

  // 오늘 날짜 기준으로 7일 생성
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const visibleDays = useMemo(() => {
    return Array.from({ length: DAYS_VISIBLE }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [today]);

  // 간트 시작 시각 (첫째 날 근무 시작)
  const ganttStart = useMemo(() => {
    const d = new Date(today);
    d.setHours(WORK_START_HOUR, 0, 0, 0);
    return d;
  }, [today]);

  // 시간을 X 좌표(px)로 변환
  const timeToX = (dateStr: string): number => {
    const d = new Date(dateStr);
    const diffMs = d.getTime() - ganttStart.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    // 근무일/근무시간 기준 계산
    const dayOffset = Math.floor(diffHours / 24);
    const hourInDay = d.getHours() - WORK_START_HOUR;
    const clampedHour = Math.max(0, Math.min(hourInDay, HOURS_PER_DAY));
    return (dayOffset * DAY_WIDTH) + (clampedHour * HOUR_WIDTH);
  };

  // 오늘 현재 시각의 X 위치
  const nowX = useMemo(() => {
    const now = new Date();
    const diffMs = now.getTime() - ganttStart.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const dayOffset = Math.floor(diffHours / 24);
    const hourInDay = now.getHours() - WORK_START_HOUR;
    if (hourInDay < 0 || hourInDay > HOURS_PER_DAY) return dayOffset * DAY_WIDTH;
    return (dayOffset * DAY_WIDTH) + (hourInDay * HOUR_WIDTH);
  }, [ganttStart]);

  // 워크센터별 주문 그룹핑
  const ordersByWorkCenter = useMemo(() => {
    const map: Record<string, GanttOrder[]> = {};
    MOCK_WORK_CENTERS.forEach(wc => { map[wc.id] = []; });
    ganttOrders.forEach(order => {
      if (map[order.workCenter]) map[order.workCenter].push(order);
    });
    return map;
  }, [ganttOrders]);

  // 날짜 포매팅
  const formatDate = (d: Date): string => {
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${month}/${day} (${weekdays[d.getDay()]})`;
  };

  // 부하율 색상
  const getLoadColor = (load: number): string => {
    if (load >= 100) return 'var(--accent-red)';
    if (load >= 80) return 'var(--accent-orange)';
    if (load >= 50) return 'var(--accent-blue)';
    return 'var(--accent-green)';
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>생산 계획</h1>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
            {formatDate(today)} ~ {formatDate(visibleDays[DAYS_VISIBLE - 1])}
          </span>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <Plus size={16} />
          생산 계획 생성
        </button>
      </div>

      {/* 수주 기반 생산 계획 추천 배너 */}
      {pendingSuggestionCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 24px', flexShrink: 0,
          background: hasCriticalSuggestion ? 'var(--accent-orange)' : 'var(--accent-blue)',
          color: '#ffffff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <Cpu size={16} />
            <span>
              수주 기반 생산 계획 추천 {pendingSuggestionCount}건이 있습니다
            </span>
          </div>
          <button
            onClick={() => setShowSuggestions(true)}
            style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', border: '1.5px solid rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.15)', color: '#ffffff',
            }}
          >
            지금 확인하기
          </button>
        </div>
      )}

      {/* 우선순위 범례 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 24px', borderBottom: '1px solid var(--border-muted)', fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
        <span>우선순위:</span>
        {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: PRIORITY_COLORS[key].bg }} />
            <span>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 16 }}>
          <div style={{ width: 16, height: 0, borderTop: '2px dashed var(--accent-red)' }} />
          <span>현재 시각</span>
        </div>
      </div>

      {/* 간트 차트 영역 */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', minWidth: LABEL_WIDTH + TOTAL_WIDTH }}>
          {/* 왼쪽: 워크센터 라벨 */}
          <div style={{ width: LABEL_WIDTH, flexShrink: 0, borderRight: '1px solid var(--border-default)', position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg-primary)' }}>
            {/* 라벨 헤더 */}
            <div style={{ height: HEADER_HEIGHT, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid var(--border-default)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
              워크센터
            </div>
            {/* 워크센터 행 */}
            {MOCK_WORK_CENTERS.map(wc => (
              <div key={wc.id} style={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid var(--border-muted)', fontSize: 13, fontWeight: 500 }}>
                {wc.name}
              </div>
            ))}
          </div>

          {/* 오른쪽: 간트 그리드 + 바 */}
          <div style={{ flex: 1, position: 'relative' }}>
            {/* 날짜/시간 헤더 */}
            <div style={{ display: 'flex', height: HEADER_HEIGHT, borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 5 }}>
              {visibleDays.map((day, di) => (
                <div key={di} style={{ width: DAY_WIDTH, flexShrink: 0, borderRight: '1px solid var(--border-muted)' }}>
                  {/* 날짜 */}
                  <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', padding: '4px 0 2px', color: di === 0 ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-muted)' }}>
                    {formatDate(day)}
                  </div>
                  {/* 시간 슬롯 */}
                  <div style={{ display: 'flex', height: HEADER_HEIGHT - 24 }}>
                    {Array.from({ length: HOURS_PER_DAY }, (_, hi) => (
                      <div key={hi} style={{ width: HOUR_WIDTH, fontSize: 10, textAlign: 'center', color: 'var(--text-muted)', borderRight: hi < HOURS_PER_DAY - 1 ? '1px solid var(--border-muted)' : 'none', lineHeight: `${HEADER_HEIGHT - 24}px` }}>
                        {WORK_START_HOUR + hi}:00
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 간트 행: 그리드 + 바 */}
            <div style={{ position: 'relative' }}>
              {/* 그리드 배경선 */}
              {MOCK_WORK_CENTERS.map((wc, ri) => (
                <div key={wc.id} style={{ height: ROW_HEIGHT, borderBottom: '1px solid var(--border-muted)', display: 'flex' }}>
                  {visibleDays.map((_, di) => (
                    <div key={di} style={{ width: DAY_WIDTH, flexShrink: 0, display: 'flex' }}>
                      {Array.from({ length: HOURS_PER_DAY }, (_, hi) => (
                        <div key={hi} style={{ width: HOUR_WIDTH, borderRight: '1px solid var(--border-muted)', background: ri % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', opacity: 0.3 }} />
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              {/* 간트 바 오버레이 */}
              {MOCK_WORK_CENTERS.map((wc, ri) => {
                const orders = ordersByWorkCenter[wc.id] || [];
                return orders.map(order => {
                  const x = timeToX(order.start);
                  const xEnd = timeToX(order.end);
                  const barWidth = Math.max(xEnd - x, 40);
                  const y = ri * ROW_HEIGHT + 8;
                  const colors = PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.NORMAL;
                  const isSelected = selectedOrder === order.id;

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(isSelected ? null : order.id)}
                      title={`${order.orderNo}\n${order.product}\n진행률: ${order.progress}%\n우선순위: ${PRIORITY_LABELS[order.priority]}`}
                      style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: barWidth,
                        height: ROW_HEIGHT - 16,
                        borderRadius: 4,
                        border: `1.5px solid ${colors.border}`,
                        background: isSelected ? colors.border : 'var(--bg-primary)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        zIndex: isSelected ? 4 : 2,
                        transition: 'box-shadow 0.15s',
                        boxShadow: isSelected ? `0 0 0 2px ${colors.border}40` : 'none',
                      }}
                    >
                      {/* 진행률 배경 */}
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${order.progress}%`,
                        background: colors.bg,
                        opacity: 0.25,
                      }} />
                      {/* 진행률 하단 바 */}
                      <div style={{
                        position: 'absolute', left: 0, bottom: 0, height: 3,
                        width: `${order.progress}%`,
                        background: colors.bg,
                      }} />
                      {/* 텍스트 */}
                      <div style={{ position: 'relative', padding: '4px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {order.product}
                        </div>
                        <div style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {order.orderNo} · {order.progress}%
                        </div>
                      </div>
                    </div>
                  );
                });
              })}

              {/* 현재 시각 마커 */}
              {nowX >= 0 && nowX <= TOTAL_WIDTH && (
                <div style={{
                  position: 'absolute', left: nowX, top: 0,
                  width: 0, height: MOCK_WORK_CENTERS.length * ROW_HEIGHT,
                  borderLeft: '2px dashed var(--accent-red)',
                  zIndex: 3, pointerEvents: 'none',
                }}>
                  <div style={{ position: 'absolute', top: -6, left: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 워크센터 부하 현황 */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-default)', padding: '16px 24px', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>워크센터 주간 부하 현황</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {MOCK_WORK_CENTERS.map(wc => {
            const overloaded = wc.load > 100;
            const loadColor = getLoadColor(wc.load);
            return (
              <div key={wc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: 'var(--bg-primary)', border: `1px solid ${overloaded ? 'var(--accent-red)' : 'var(--border-muted)'}` }}>
                <span style={{ fontSize: 12, fontWeight: 500, width: 80, flexShrink: 0, color: 'var(--text-primary)' }}>{wc.name}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--border-muted)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${Math.min(wc.load, 100)}%`, height: '100%', borderRadius: 4, background: loadColor, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: loadColor, minWidth: 36, textAlign: 'right' }}>
                  {wc.load}%
                </span>
                {overloaded && <AlertTriangle size={14} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 생산 계획 생성 모달 */}
      {showCreate && (
        <PlanCreateModal
          workCenters={MOCK_WORK_CENTERS}
          onClose={() => setShowCreate(false)}
          onAdd={(order) => { setGanttOrders(prev => [...prev, order]); setShowCreate(false); }}
        />
      )}

      {/* 수주 기반 생산 계획 추천 모달 */}
      <ProductionSuggestions
        isOpen={showSuggestions}
        onClose={() => setShowSuggestions(false)}
      />
    </div>
  );
}

/* ── 생산 계획 생성 모달 (BOM 검색 통합) ── */
function PlanCreateModal({ workCenters, onClose, onAdd }: {
  workCenters: WorkCenter[];
  onClose: () => void;
  onAdd: (order: GanttOrder) => void;
}) {
  const [product, setProduct] = useState('');
  const [wcId, setWcId] = useState(workCenters[0]?.id || '');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  // BOM 검색 상태
  const [bomQty, setBomQty] = useState(100);

  // BOM 제품 선택 시 제품명 자동 채우기
  const handleBomSelect = (bomProduct: BomProduct) => {
    setProduct(bomProduct.name);
  };

  const handleSubmit = () => {
    if (!product || !startAt || !endAt) return;
    const wc = workCenters.find(w => w.id === wcId);
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    const now = new Date();
    const orderNo = `WO-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${seq}`;
    onAdd({
      id: `wo-${Date.now()}`,
      orderNo,
      product,
      workCenter: wcId,
      workCenterName: wc?.name || '',
      priority,
      start: startAt,
      end: endAt,
      progress: 0,
      status: 'PLANNED',
    });
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
    borderRadius: 12, padding: 24, width: 560, maxHeight: '85vh', overflowY: 'auto',
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>생산 계획 생성</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* BOM 제품 검색 */}
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-muted)' }}>
          <BomProductSearch
            siteId="demo"
            onProductSelect={handleBomSelect}
            plannedQty={bomQty}
            onQtyChange={setBomQty}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>제품명 *</label>
            <input style={inputStyle} placeholder="제품명 입력" value={product} onChange={e => setProduct(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>작업장</label>
            <select style={inputStyle} value={wcId} onChange={e => setWcId(e.target.value)}>
              {workCenters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>우선순위</label>
            <select style={inputStyle} value={priority} onChange={e => setPriority(e.target.value as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW')}>
              <option value="URGENT">긴급</option>
              <option value="HIGH">높음</option>
              <option value="NORMAL">보통</option>
              <option value="LOW">낮음</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>시작 일시 *</label>
              <input style={inputStyle} type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>종료 일시 *</label>
              <input style={inputStyle} type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>취소</button>
          <button onClick={handleSubmit} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent-blue)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> 생성
          </button>
        </div>
      </div>
    </div>
  );
}
