import React, { useState, useEffect } from 'react';
import {
  Maximize, RefreshCw, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, Activity, Target, Gauge
} from 'lucide-react';

// ── 타입 정의 ──
interface ProductionBoardProps {
  onBack: () => void;
}

type WcStatus = 'RUNNING' | 'BREAKDOWN' | 'IDLE' | 'MAINTENANCE';
type OrderStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SHIPPING';
type Priority = 'URGENT' | 'HIGH' | 'NORMAL';

interface WorkCenter {
  id: string; code: string; name: string; status: WcStatus;
  currentWo: string | null; product: string | null;
  actual: number; planned: number; remaining: string;
}

interface WorkOrder {
  id: string; orderNo: string; product: string; workCenter: string;
  status: OrderStatus; priority: Priority;
  planned: number; actual: number; defect: number;
}

// ── 목 데이터 ──
const MOCK_WORK_CENTERS: WorkCenter[] = [
  { id: 'wc-1', code: 'WC-001', name: '1호 프레스', status: 'RUNNING', currentWo: 'WO-20260318-001', product: '브레이크 패드', actual: 72, planned: 180, remaining: '3.5h' },
  { id: 'wc-2', code: 'WC-002', name: '용접 라인 A', status: 'RUNNING', currentWo: 'WO-20260318-003', product: '서스펜션 암', actual: 28, planned: 50, remaining: '2.1h' },
  { id: 'wc-3', code: 'WC-003', name: '도장 공정', status: 'BREAKDOWN', currentWo: null, product: null, actual: 0, planned: 0, remaining: 'ETA 14:00' },
  { id: 'wc-4', code: 'WC-004', name: '조립 라인 B', status: 'RUNNING', currentWo: 'WO-20260318-002', product: '엔진 밸브 세트', actual: 95, planned: 120, remaining: '1.2h' },
  { id: 'wc-5', code: 'WC-005', name: '검사 공정', status: 'IDLE', currentWo: null, product: null, actual: 0, planned: 0, remaining: '-' },
  { id: 'wc-6', code: 'WC-006', name: '2호 프레스', status: 'MAINTENANCE', currentWo: null, product: null, actual: 0, planned: 0, remaining: '점검중' },
];

const MOCK_ORDERS: WorkOrder[] = [
  { id: 'wo-1', orderNo: 'WO-20260318-001', product: '브레이크 패드 세트', workCenter: '1호 프레스', status: 'IN_PROGRESS', priority: 'HIGH', planned: 180, actual: 72, defect: 3 },
  { id: 'wo-2', orderNo: 'WO-20260318-002', product: '엔진 밸브 세트', workCenter: '조립 라인 B', status: 'IN_PROGRESS', priority: 'NORMAL', planned: 120, actual: 95, defect: 1 },
  { id: 'wo-3', orderNo: 'WO-20260318-003', product: '서스펜션 암', workCenter: '용접 라인 A', status: 'IN_PROGRESS', priority: 'URGENT', planned: 50, actual: 28, defect: 2 },
  { id: 'wo-4', orderNo: 'WO-20260318-004', product: '배기 매니폴드', workCenter: '2호 프레스', status: 'PLANNED', priority: 'NORMAL', planned: 200, actual: 0, defect: 0 },
  { id: 'wo-5', orderNo: 'WO-20260317-008', product: '실린더 헤드', workCenter: '1호 프레스', status: 'COMPLETED', priority: 'HIGH', planned: 100, actual: 98, defect: 4 },
  { id: 'wo-6', orderNo: 'WO-20260317-009', product: '크랭크샤프트', workCenter: '조립 라인 B', status: 'COMPLETED', priority: 'NORMAL', planned: 80, actual: 80, defect: 0 },
  { id: 'wo-7', orderNo: 'WO-20260317-010', product: '오일 펌프', workCenter: '검사 공정', status: 'SHIPPING', priority: 'HIGH', planned: 60, actual: 60, defect: 1 },
];

// ── 상태 색상/라벨 매핑 ──
const WC_STATUS: Record<WcStatus, { icon: string; label: string; color: string }> = {
  RUNNING:     { icon: '🟢', label: '가동중', color: 'var(--accent-green)' },
  BREAKDOWN:   { icon: '🔴', label: '고장',   color: 'var(--accent-red)' },
  IDLE:        { icon: '⚪', label: '유휴',   color: 'var(--text-muted)' },
  MAINTENANCE: { icon: '🟡', label: '점검',   color: 'var(--accent-orange)' },
};

const PRIORITY_STYLE: Record<Priority, { label: string; bg: string; color: string }> = {
  URGENT: { label: '긴급', bg: 'var(--accent-red)',    color: '#fff' },
  HIGH:   { label: '높음', bg: 'var(--accent-orange)', color: '#fff' },
  NORMAL: { label: '보통', bg: 'var(--bg-hover)',      color: 'var(--text-secondary)' },
};

const KANBAN_COLUMNS: { key: OrderStatus; label: string; accent: string }[] = [
  { key: 'PLANNED',     label: '계획',     accent: 'var(--text-muted)' },
  { key: 'IN_PROGRESS', label: '진행중',   accent: 'var(--accent-blue)' },
  { key: 'COMPLETED',   label: '완료',     accent: 'var(--accent-green)' },
  { key: 'SHIPPING',    label: '출하대기', accent: 'var(--accent-orange)' },
];

// ── KPI 계산 헬퍼 ──
function computeKpis(orders: WorkOrder[], centers: WorkCenter[]) {
  const totalPlanned = orders.reduce((s, o) => s + o.planned, 0);
  const totalActual  = orders.reduce((s, o) => s + o.actual, 0);
  const totalDefect  = orders.reduce((s, o) => s + o.defect, 0);
  const achievement   = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
  const defectRate    = totalActual > 0 ? (totalDefect / totalActual) * 100 : 0;
  const running       = centers.filter(c => c.status === 'RUNNING').length;
  const utilization   = centers.length > 0 ? (running / centers.length) * 100 : 0;
  // OEE = 가용률 × 성능률 × 양품률 (간이 계산)
  const availability = utilization / 100;
  const performance  = Math.min(achievement / 100, 1);
  const quality      = totalActual > 0 ? (totalActual - totalDefect) / totalActual : 1;
  const oee          = availability * performance * quality * 100;
  return { achievement, defectRate, utilization, oee };
}

// ── 메인 컴포넌트 ──
export function ProductionBoard({ onBack }: ProductionBoardProps) {
  const [now, setNow] = useState(new Date());
  const [refreshCount, setRefreshCount] = useState(30);

  // 1초마다 시계 갱신 + 새로고침 카운트다운
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setRefreshCount(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const kpi = computeKpis(MOCK_ORDERS, MOCK_WORK_CENTERS);

  // 전체화면 토글
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // ── KPI 카드 데이터 ──
  const kpiCards: { label: string; value: string; icon: React.ReactNode; trend: number; unit: string; color: string }[] = [
    { label: '계획 대비 달성률', value: kpi.achievement.toFixed(1), icon: <Target size={22} />, trend: 2.3, unit: '%', color: 'var(--accent-blue)' },
    { label: '불량률',          value: kpi.defectRate.toFixed(2),   icon: <AlertTriangle size={22} />, trend: -0.5, unit: '%', color: 'var(--accent-red)' },
    { label: '설비 가동률',     value: kpi.utilization.toFixed(1),  icon: <Activity size={22} />, trend: 5.0, unit: '%', color: 'var(--accent-green)' },
    { label: 'OEE 점수',       value: kpi.oee.toFixed(1),          icon: <Gauge size={22} />, trend: 1.8, unit: '%', color: 'var(--accent-orange)' },
  ];

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── 헤더 ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>생산 현황판</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: 'var(--text-muted)', fontSize: 13 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} style={{ animation: refreshCount <= 3 ? 'spin 1s linear infinite' : 'none' }} />
            {refreshCount}초 후 갱신
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', minWidth: 80 }}>
            {now.toLocaleTimeString('ko-KR', { hour12: false })}
          </span>
          <button onClick={toggleFullscreen} style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Maximize size={16} /> 전체화면
          </button>
        </div>
      </header>

      {/* ── 본문 ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── KPI 카드 ── */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {kpiCards.map((c, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `3px solid ${c.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.label}</span>
                <span style={{ color: c.color }}>{c.icon}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 800, fontFamily: 'monospace', color: c.color }}>{c.value}</span>
                <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{c.unit}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                {/* 트렌드: 불량률은 감소가 긍정 */}
                {(i === 1 ? c.trend < 0 : c.trend > 0)
                  ? <><TrendingUp size={14} style={{ color: 'var(--accent-green)' }} /><span style={{ color: 'var(--accent-green)' }}>+{Math.abs(c.trend)}%</span></>
                  : <><TrendingDown size={14} style={{ color: 'var(--accent-red)' }} /><span style={{ color: 'var(--accent-red)' }}>-{Math.abs(c.trend)}%</span></>
                }
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>전일 대비</span>
              </div>
            </div>
          ))}
        </section>

        {/* ── 칸반 보드 ── */}
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>작업 지시 현황</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'start' }}>
            {KANBAN_COLUMNS.map(col => {
              const items = MOCK_ORDERS.filter(o => o.status === col.key);
              return (
                <div key={col.key} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
                  {/* 칼럼 헤더 */}
                  <div style={{ padding: '10px 14px', borderBottom: '2px solid ' + col.accent, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{col.label}</span>
                    <span style={{ background: col.accent, color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>{items.length}</span>
                  </div>
                  {/* 카드 목록 */}
                  <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                    {items.map(order => {
                      const pct = order.planned > 0 ? Math.round((order.actual / order.planned) * 100) : 0;
                      const pr = PRIORITY_STYLE[order.priority];
                      return (
                        <div key={order.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-muted)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{order.orderNo}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: pr.bg, color: pr.color }}>{pr.label}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{order.product}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.workCenter}</span>
                          {/* 진행률 바 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: pct >= 100 ? 'var(--accent-green)' : 'var(--accent-blue)', transition: 'width .3s' }} />
                            </div>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', minWidth: 56, textAlign: 'right' }}>{order.actual}/{order.planned}</span>
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>항목 없음</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 작업장별 현황 ── */}
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>작업장별 현황</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {MOCK_WORK_CENTERS.map(wc => {
              const st = WC_STATUS[wc.status];
              const pct = wc.planned > 0 ? Math.round((wc.actual / wc.planned) * 100) : 0;
              const isActive = wc.status === 'RUNNING';
              return (
                <div key={wc.id} style={{
                  background: 'var(--bg-secondary)', border: `1px solid ${wc.status === 'BREAKDOWN' ? 'var(--accent-red)' : 'var(--border-default)'}`,
                  borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
                  boxShadow: wc.status === 'BREAKDOWN' ? '0 0 12px rgba(239,68,68,0.15)' : 'none',
                }}>
                  {/* 상단: 작업장명 + 상태 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{st.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{wc.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: st.color + '22', color: st.color }}>{st.label}</span>
                  </div>

                  {isActive ? (
                    <>
                      {/* WO 정보 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>{wc.currentWo}</span>
                        <span>{wc.product}</span>
                      </div>
                      {/* 생산량/목표량 + 달성률 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-blue)' : 'var(--accent-orange)', transition: 'width .3s' }} />
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: pct >= 80 ? 'var(--accent-green)' : 'var(--text-primary)', minWidth: 38, textAlign: 'right' }}>{pct}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>생산 <strong style={{ color: 'var(--text-primary)' }}>{wc.actual}</strong> / {wc.planned}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}><Clock size={12} /> 잔여 {wc.remaining}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60, color: 'var(--text-muted)', fontSize: 13, gap: 6 }}>
                      {wc.status === 'BREAKDOWN' && <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} />}
                      {wc.status === 'BREAKDOWN' ? `복구 예정: ${wc.remaining}` : wc.status === 'MAINTENANCE' ? '정기 점검 진행중' : '대기중'}
                      {wc.status === 'IDLE' && <CheckCircle size={14} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 스핀 애니메이션 (새로고침 아이콘) */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
