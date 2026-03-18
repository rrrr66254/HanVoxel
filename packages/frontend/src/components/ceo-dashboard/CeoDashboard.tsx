import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Factory, Package,
  Clock, AlertTriangle, Bell, ChevronRight, RefreshCw, Calendar,
  ShoppingCart, Truck, Wrench, ClipboardList, ArrowUpRight,
  ArrowDownRight, CheckCircle, XCircle, AlertCircle, Activity,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

// ── 타입 ──
interface KpiItem {
  label: string;
  value: string;
  sub: string;
  trend?: number;
  color: string;
  icon: typeof DollarSign;
}

interface TimelineEvent {
  time: string;
  icon: typeof Package;
  iconColor: string;
  text: string;
}

interface UrgentItem {
  level: 'critical' | 'high' | 'normal';
  text: string;
  action: string;
  actionMode?: string;
}

interface TrendPoint {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface TopPartner {
  name: string;
  amount: string;
}

// ── Mock 데이터 ──
const MOCK_KPIS: KpiItem[] = [
  { label: '오늘 매출', value: '1,320만원', sub: '▲12% 어제 대비', trend: 12, color: 'var(--accent-blue)', icon: DollarSign },
  { label: '오늘 매입', value: '720만원', sub: '▼5% 어제 대비', trend: -5, color: 'var(--accent-orange)', icon: ShoppingCart },
  { label: '이번달 손익', value: '+4,200만원', sub: '목표 대비 82%', trend: 82, color: 'var(--accent-green)', icon: TrendingUp },
  { label: '생산 달성률', value: '78%', sub: '계획 대비', trend: 78, color: 'var(--accent-purple)', icon: Factory },
  { label: '재고 현황', value: '정상 92%', sub: '부족 2종', trend: 92, color: 'var(--accent-blue)', icon: Package },
  { label: '납기 준수율', value: '96.8%', sub: '목표 98%', trend: -1.2, color: 'var(--accent-orange)', icon: Clock },
];

const MOCK_TIMELINE: TimelineEvent[] = [
  { time: '09:00', icon: Package, iconColor: 'var(--accent-green)', text: '강남철강 철판 600kg 입고 예정' },
  { time: '10:30', icon: Factory, iconColor: 'var(--accent-blue)', text: 'WO-001 브레이크 패드 생산 시작' },
  { time: '13:00', icon: Truck, iconColor: 'var(--accent-purple)', text: '쿠팡 출고 오후 픽업 예정' },
  { time: '14:00', icon: ClipboardList, iconColor: 'var(--accent-orange)', text: 'SO-20260318-008 수주 검토 필요' },
  { time: '17:00', icon: Wrench, iconColor: 'var(--accent-red)', text: '2호 프레스 정기 점검 예정' },
];

const MOCK_URGENT: UrgentItem[] = [
  { level: 'critical', text: '철판 재고 부족 — SO-006 납기 위험', action: '발주 승인', actionMode: 'reorder' },
  { level: 'high', text: '납기 D-7: 현대모비스 SO-006', action: '생산 계획 확인', actionMode: 'production-plan' },
  { level: 'high', text: '쿠팡 출고 기사 미배정', action: '기사 배정', actionMode: 'driver' },
];

const MOCK_TREND: TrendPoint[] = [
  { month: '10월', revenue: 8200, cost: 5100, profit: 3100 },
  { month: '11월', revenue: 9100, cost: 5800, profit: 3300 },
  { month: '12월', revenue: 10500, cost: 6200, profit: 4300 },
  { month: '1월', revenue: 9800, cost: 6000, profit: 3800 },
  { month: '2월', revenue: 11200, cost: 6500, profit: 4700 },
  { month: '3월', revenue: 12300, cost: 7100, profit: 5200 },
];

const MOCK_TOP_SALES: TopPartner[] = [
  { name: '현대모비스', amount: '4,800만' },
  { name: '기아부품물류', amount: '2,200만' },
  { name: '쿠팡', amount: '1,100만' },
];

const MOCK_TOP_PURCHASE: TopPartner[] = [
  { name: '강남철강', amount: '1,200만' },
  { name: '한국고무', amount: '680만' },
  { name: '동방볼트', amount: '420만' },
];

const MOCK_WORK_CENTERS = [
  { name: '1호 프레스', status: 'running' as const },
  { name: '2호 프레스', status: 'idle' as const },
  { name: '용접 A', status: 'running' as const },
  { name: '도장', status: 'breakdown' as const },
  { name: '조립', status: 'idle' as const },
  { name: '검사', status: 'running' as const },
];

const MOCK_ALERTS = [
  { id: '1', text: '철판 재고 안전재고 이하', severity: 'critical', time: '10분 전', read: false },
  { id: '2', text: 'SLA 위반 위험: 현대모비스 납기', severity: 'high', time: '25분 전', read: false },
  { id: '3', text: '2호 프레스 유압 점검 완료', severity: 'info', time: '1시간 전', read: true },
  { id: '4', text: 'WO-003 에어필터 생산 완료', severity: 'info', time: '2시간 전', read: true },
  { id: '5', text: '자동 발주 추천 3건 생성됨', severity: 'normal', time: '3시간 전', read: true },
];

const MOCK_SALES_SUMMARY = { thisMonth: 8, target: 10, inProgress: 3, overdue: 1, receivable: '2,840만원' };
const MOCK_PROD_SUMMARY = { todayPlanned: 5, todayActual: 4, achievementRate: 78, defectRate: 2.3, inProgress: 4 };
const MOCK_INVENTORY_SUMMARY = { utilization: 87, shortage: 2, todayInbound: 1, todayOutbound: 2 };

// ── Props ──
interface CeoDashboardProps {
  onBack: () => void;
  onNavigate: (mode: string) => void;
}

export function CeoDashboard({ onBack, onNavigate }: CeoDashboardProps) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // 5분 자동 새로고침
  useEffect(() => {
    const iv = setInterval(() => setLastRefresh(new Date()), 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const refresh = useCallback(() => setLastRefresh(new Date()), []);

  const today = new Date();
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${dayNames[today.getDay()]}`;

  const wcStatusColor = (s: string) =>
    s === 'running' ? 'var(--accent-green)' : s === 'idle' ? 'var(--accent-orange)' : 'var(--accent-red)';
  const wcStatusLabel = (s: string) =>
    s === 'running' ? '가동중' : s === 'idle' ? '대기' : '고장';

  const urgencyBorder = (l: string) =>
    l === 'critical' ? 'var(--accent-red)' : l === 'high' ? 'var(--accent-orange)' : 'var(--border-default)';
  const urgencyIcon = (l: string) =>
    l === 'critical' ? XCircle : l === 'high' ? AlertCircle : CheckCircle;
  const urgencyColor = (l: string) =>
    l === 'critical' ? 'var(--accent-red)' : l === 'high' ? 'var(--accent-orange)' : 'var(--accent-green)';

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            안녕하세요, 홍길동 대표님
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {dateStr} &nbsp;|&nbsp; 오늘 처리 필요 항목: 긴급 알림 {MOCK_URGENT.filter(u => u.level === 'critical').length}건 · 승인 대기 {MOCK_URGENT.length}건
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* 기간 선택 */}
          {(['today', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: period === p ? '1px solid var(--accent-blue)' : '1px solid var(--border-default)',
                background: period === p ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                color: period === p ? '#fff' : 'var(--text-secondary)',
                fontFamily: 'inherit',
              }}
            >
              {p === 'today' ? '오늘' : p === 'week' ? '이번주' : '이번달'}
            </button>
          ))}
          <button
            onClick={refresh}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: '1px solid var(--border-default)', background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title={`마지막 새로고침: ${lastRefresh.toLocaleTimeString()}`}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 섹션 1: KPI 카드 6개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {MOCK_KPIS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12,
              padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{kpi.label}</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 4px' }}>{kpi.value}</div>
                <span style={{
                  fontSize: 11,
                  color: kpi.trend && kpi.trend > 0 ? 'var(--accent-green)' : 'var(--accent-orange)',
                  fontWeight: 500,
                }}>{kpi.sub}</span>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `color-mix(in srgb, ${kpi.color} 12%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} style={{ color: kpi.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 섹션 2: 오늘의 흐름 타임라인 */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12,
        padding: 20, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Calendar size={16} style={{ color: 'var(--accent-blue)' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>오늘의 흐름</h3>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {MOCK_TIMELINE.map((ev, i) => {
            const Icon = ev.icon;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 40,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `color-mix(in srgb, ${ev.iconColor} 15%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={14} style={{ color: ev.iconColor }} />
                  </div>
                  {i < MOCK_TIMELINE.length - 1 && (
                    <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
                  )}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)' }}>{ev.time}</span>
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: '2px 0 0', lineHeight: 1.4 }}>{ev.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 섹션 3: 3분할 현황 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* 수주/영업 */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClipboardList size={14} style={{ color: 'var(--accent-blue)' }} /> 수주 / 영업
            </h4>
            <button onClick={() => onNavigate('sales-order')} style={{
              background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 2
            }}>
              상세 <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2 }}>
            <div>이번달 수주: <b style={{ color: 'var(--text-primary)' }}>{MOCK_SALES_SUMMARY.thisMonth}건</b> / 목표 {MOCK_SALES_SUMMARY.target}건</div>
            <div>진행중 수주: <b style={{ color: 'var(--text-primary)' }}>{MOCK_SALES_SUMMARY.inProgress}건</b></div>
            <div>미수금 합계: <b style={{ color: 'var(--accent-orange)' }}>{MOCK_SALES_SUMMARY.receivable}</b></div>
            {MOCK_SALES_SUMMARY.overdue > 0 && (
              <div style={{ color: 'var(--accent-red)' }}>납기 초과: {MOCK_SALES_SUMMARY.overdue}건</div>
            )}
          </div>
        </div>

        {/* 생산 */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Factory size={14} style={{ color: 'var(--accent-green)' }} /> 생산
            </h4>
            <button onClick={() => onNavigate('production-board')} style={{
              background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 2
            }}>
              상세 <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2 }}>
            <div>오늘 생산 달성: <b style={{ color: 'var(--text-primary)' }}>{MOCK_PROD_SUMMARY.achievementRate}%</b></div>
            <div>진행중 WO: <b style={{ color: 'var(--text-primary)' }}>{MOCK_PROD_SUMMARY.inProgress}건</b></div>
            <div>불량률: <b style={{ color: MOCK_PROD_SUMMARY.defectRate > 3 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{MOCK_PROD_SUMMARY.defectRate}%</b></div>
          </div>
        </div>

        {/* 재고/물류 */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={14} style={{ color: 'var(--accent-purple)' }} /> 재고 / 물류
            </h4>
            <button onClick={() => onNavigate('inbound')} style={{
              background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 2
            }}>
              상세 <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2 }}>
            <div>창고 가동률: <b style={{ color: 'var(--text-primary)' }}>{MOCK_INVENTORY_SUMMARY.utilization}%</b></div>
            <div>부족 자재: <b style={{ color: 'var(--accent-red)' }}>{MOCK_INVENTORY_SUMMARY.shortage}종</b></div>
            <div>오늘 입고: <b style={{ color: 'var(--text-primary)' }}>{MOCK_INVENTORY_SUMMARY.todayInbound}건</b> · 출고: <b style={{ color: 'var(--text-primary)' }}>{MOCK_INVENTORY_SUMMARY.todayOutbound}건</b></div>
          </div>
        </div>
      </div>

      {/* 섹션 4: 매출/매입 추이 + 섹션 5: 업체별 거래 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* 매출/매입 추이 차트 */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>매출 / 매입 추이 (최근 6개월)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MOCK_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => `${v / 10}천만`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                formatter={(v: number) => [`${(v / 10).toFixed(0)}천만원`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue" name="매출" stroke="#2D7DD2" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="cost" name="매입" stroke="#D29922" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="profit" name="순이익" stroke="#3FB950" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            이번달 예상 순이익: <b style={{ color: 'var(--accent-green)' }}>+3,480만원</b>
          </div>
        </div>

        {/* 업체별 거래 현황 */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>업체별 거래 현황</h3>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowUpRight size={12} style={{ color: 'var(--accent-green)' }} /> 매출 TOP 3
            </div>
            {MOCK_TOP_SALES.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--border-muted)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{i + 1}. {p.name}</span>
                <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{p.amount}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowDownRight size={12} style={{ color: 'var(--accent-orange)' }} /> 매입 TOP 3
            </div>
            {MOCK_TOP_PURCHASE.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--border-muted)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{i + 1}. {p.name}</span>
                <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{p.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 섹션 6: 긴급 처리 필요 항목 */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12,
        padding: 20, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>긴급 처리 필요</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_URGENT.map((item, i) => {
            const UIcon = urgencyIcon(item.level);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 8,
                border: `1px solid ${urgencyBorder(item.level)}`,
                background: 'var(--bg-primary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UIcon size={16} style={{ color: urgencyColor(item.level) }} />
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: urgencyColor(item.level), textTransform: 'uppercase' }}>
                      {item.level === 'critical' ? '즉시' : '오늘'}
                    </span>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: '2px 0 0' }}>{item.text}</p>
                  </div>
                </div>
                <button
                  onClick={() => item.actionMode && onNavigate(item.actionMode)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${urgencyBorder(item.level)}`,
                    background: `color-mix(in srgb, ${urgencyColor(item.level)} 10%, transparent)`,
                    color: urgencyColor(item.level),
                    fontFamily: 'inherit',
                  }}
                >
                  {item.action}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 섹션 7: 생산 현황 미니 뷰 + 섹션 8: 최근 알림 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 작업장 현재 상태 */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} style={{ color: 'var(--accent-blue)' }} /> 작업장 현재 상태
            </h3>
            <button onClick={() => onNavigate('work-centers')} style={{
              background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 2
            }}>
              관리 <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {MOCK_WORK_CENTERS.map((wc, i) => (
              <div key={i} style={{
                padding: '12px', borderRadius: 8,
                border: `1px solid var(--border-muted)`,
                background: 'var(--bg-primary)',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: wcStatusColor(wc.status),
                  margin: '0 auto 6px',
                  boxShadow: `0 0 8px ${wcStatusColor(wc.status)}`,
                }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{wc.name}</div>
                <div style={{ fontSize: 10, color: wcStatusColor(wc.status), fontWeight: 500, marginTop: 2 }}>{wcStatusLabel(wc.status)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 알림 */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} style={{ color: 'var(--accent-orange)' }} /> 최근 알림
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_ALERTS.map(alert => {
              const sColor = alert.severity === 'critical' ? 'var(--accent-red)' : alert.severity === 'high' ? 'var(--accent-orange)' : 'var(--text-secondary)';
              return (
                <div key={alert.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 6,
                  background: alert.read ? 'transparent' : 'var(--bg-primary)',
                  border: alert.read ? 'none' : '1px solid var(--border-muted)',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sColor, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: alert.read ? 'var(--text-secondary)' : 'var(--text-primary)', margin: 0, fontWeight: alert.read ? 400 : 500 }}>{alert.text}</p>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{alert.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
