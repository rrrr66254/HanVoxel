/**
 * HanVoxel — 자동 발주 추천 대시보드 (다크 테마)
 *
 * 탭:
 *   1. 발주 추천 — 긴급도별 발주 추천 + 수락/무시 액션
 *   2. 수요 예측 — SKU별 수요 예측 recharts 차트
 *   3. 리드타임 — 공급업체별 리드타임 통계
 *
 * API 미연결 시 mock 데이터 fallback
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart,
  AlertTriangle,
  Clock,
  TrendingUp,
  Package,
  Check,
  X,
} from 'lucide-react';
import type { ReorderRecommendation, ReorderSummary } from '../../api/reorder-api';
import * as reorderApi from '../../api/reorder-api';

// --- 디자인 토큰 ---

const COLORS = {
  bg: 'var(--bg-primary)',
  card: 'var(--bg-secondary)',
  border: 'var(--border-default)',
  text: 'var(--text-primary)',
  textMuted: 'var(--text-secondary)',
  textDim: 'var(--text-muted)',
  grid: 'var(--bg-tertiary)',
  accent: 'var(--accent-blue)',
} as const;

// --- Mock 데이터 ---

const MOCK_RECOMMENDATIONS: ReorderRecommendation[] = [
  {
    id: 'r1', siteId: 'demo', sku: 'SKU-2891', itemName: '가솔린 엔진 밸브',
    currentQty: 45, safetyStock: 120, stockoutDate: '2026-03-18', daysUntilOut: 3,
    reorderQty: 500, partnerId: 'p1', partnerName: '현대모비스', avgLeadDays: 5,
    orderByDate: '2026-03-13', urgency: 'CRITICAL', status: 'PENDING', voucherId: null,
    forecastMeta: { model: 'LINEAR', horizon: 30, totalForecast: 450, mape: 12.3, dailyAvg: 15 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r2', siteId: 'demo', sku: 'SKU-1044', itemName: 'LED 헤드라이트 모듈',
    currentQty: 180, safetyStock: 200, stockoutDate: '2026-03-22', daysUntilOut: 7,
    reorderQty: 300, partnerId: 'p2', partnerName: 'SL', avgLeadDays: 3,
    orderByDate: '2026-03-19', urgency: 'HIGH', status: 'PENDING', voucherId: null,
    forecastMeta: { model: 'MOVING_AVG', horizon: 30, totalForecast: 780, mape: 8.5, dailyAvg: 26 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r3', siteId: 'demo', sku: 'SKU-3320', itemName: '와이어 하네스 (메인)',
    currentQty: 520, safetyStock: 300, stockoutDate: '2026-03-29', daysUntilOut: 14,
    reorderQty: 1000, partnerId: 'p3', partnerName: '경신', avgLeadDays: 7,
    orderByDate: '2026-03-22', urgency: 'MEDIUM', status: 'PENDING', voucherId: null,
    forecastMeta: { model: 'LINEAR', horizon: 30, totalForecast: 1200, mape: 15.1, dailyAvg: 40 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r4', siteId: 'demo', sku: 'SKU-0887', itemName: '브레이크 패드 세트',
    currentQty: 890, safetyStock: 250, stockoutDate: '2026-04-14', daysUntilOut: 30,
    reorderQty: 600, partnerId: 'p1', partnerName: '현대모비스', avgLeadDays: 5,
    orderByDate: '2026-04-09', urgency: 'LOW', status: 'PENDING', voucherId: null,
    forecastMeta: { model: 'MOVING_AVG', horizon: 30, totalForecast: 900, mape: 10.0, dailyAvg: 30 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r5', siteId: 'demo', sku: 'SKU-5501', itemName: '에어필터 (승용)',
    currentQty: 30, safetyStock: 100, stockoutDate: '2026-03-17', daysUntilOut: 2,
    reorderQty: 400, partnerId: 'p4', partnerName: '만도', avgLeadDays: 4,
    orderByDate: '2026-03-13', urgency: 'CRITICAL', status: 'PENDING', voucherId: null,
    forecastMeta: { model: 'LINEAR', horizon: 30, totalForecast: 600, mape: 9.8, dailyAvg: 20 },
    createdAt: new Date().toISOString(),
  },
];

const MOCK_SUMMARY: ReorderSummary = {
  pendingCount: 5,
  totalCount: 12,
  urgentCount: 3,
  autoOrderedLast30d: 7,
};

// --- 긴급도 스타일 ---

interface UrgencyStyle {
  border: string;
  shadow: string;
  badge: string;
  badgeText: string;
  label: string;
  dot: string;
}

const URGENCY_STYLES: Record<string, UrgencyStyle> = {
  CRITICAL: {
    border: 'border-[#F85149]',
    shadow: '0 0 20px rgba(248,81,73,0.3)',
    badge: 'bg-[#F85149]/15',
    badgeText: 'text-[#F85149]',
    label: '긴급',
    dot: 'bg-[#F85149]',
  },
  HIGH: {
    border: 'border-[#D29922]',
    shadow: '0 0 12px rgba(210,153,34,0.2)',
    badge: 'bg-[#D29922]/15',
    badgeText: 'text-[#D29922]',
    label: '높음',
    dot: 'bg-[#D29922]',
  },
  MEDIUM: {
    border: 'border-[#E3B341]',
    shadow: '0 0 8px rgba(227,179,65,0.15)',
    badge: 'bg-[#E3B341]/15',
    badgeText: 'text-[#E3B341]',
    label: '보통',
    dot: 'bg-[#E3B341]',
  },
  LOW: {
    border: 'border-[#8B949E]',
    shadow: 'none',
    badge: 'bg-[#8B949E]/15',
    badgeText: 'text-[#8B949E]',
    label: '낮음',
    dot: 'bg-[#8B949E]',
  },
};

// --- 애니메이션 카운터 훅 ---

function useAnimatedCounter(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    const diff = target - start;
    if (diff === 0) {
      setValue(target);
      return;
    }

    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// --- KPI 카드 ---

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  trend?: { value: number; up: boolean } | null;
}

function KpiCard({ icon, label, value, color, trend }: KpiCardProps) {
  const animatedValue = useAnimatedCounter(value);

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* 상단 3px 컬러 라인 */}
      <div className="h-[3px] w-full" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs" style={{ color: COLORS.textMuted }}>
            {label}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white">
              {animatedValue.toLocaleString()}
            </span>
            {trend && (
              <span
                className="text-xs font-medium"
                style={{ color: trend.up ? 'var(--accent-red)' : 'var(--accent-green)' }}
              >
                {trend.up ? '▲' : '▼'} {Math.abs(trend.value)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 메인 대시보드 ---

interface ReorderDashboardProps {
  onBack: () => void;
}

type TabType = 'recommendations' | 'forecast' | 'leadtime';

const TAB_CONFIG: ReadonlyArray<{ key: TabType; label: string; icon: React.ReactNode }> = [
  { key: 'recommendations', label: '발주 추천', icon: <ShoppingCart size={14} /> },
  { key: 'forecast', label: '수요 예측', icon: <TrendingUp size={14} /> },
  { key: 'leadtime', label: '리드타임', icon: <Clock size={14} /> },
];

export function ReorderDashboard({ onBack }: ReorderDashboardProps) {
  const [tab, setTab] = useState<TabType>('recommendations');
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>(MOCK_RECOMMENDATIONS);
  const [summary, setSummary] = useState<ReorderSummary>(MOCK_SUMMARY);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(true);

  // 초기 API 연결 시도
  useEffect(() => {
    (async () => {
      try {
        const s = await reorderApi.getReorderSummary('demo');
        setSummary(s);
        const recs = await reorderApi.getRecommendations('demo');
        setRecommendations(recs);
        setUseMock(false);
      } catch {
        setUseMock(true);
      }
    })();
  }, []);

  // 추천 생성
  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      if (!useMock) {
        await reorderApi.generateRecommendations('demo');
        const recs = await reorderApi.getRecommendations('demo');
        setRecommendations(recs);
      }
    } catch {
      // mock 유지
    }
    setLoading(false);
  }, [useMock]);

  // 추천 수락
  const handleAccept = useCallback(async (id: string) => {
    if (useMock) {
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'AUTO_ORDERED' as const } : r))
      );
      return;
    }
    await reorderApi.acceptRecommendation(id);
    const recs = await reorderApi.getRecommendations('demo');
    setRecommendations(recs);
  }, [useMock]);

  // 추천 무시
  const handleDismiss = useCallback(async (id: string) => {
    if (useMock) {
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'DISMISSED' as const } : r))
      );
      return;
    }
    await reorderApi.dismissRecommendation(id);
    const recs = await reorderApi.getRecommendations('demo');
    setRecommendations(recs);
  }, [useMock]);

  // 필터링
  const filtered = useMemo(() => {
    if (filter === 'ALL') return recommendations;
    return recommendations.filter((r) => r.urgency === filter);
  }, [recommendations, filter]);

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: COLORS.bg }}>
      {/* 헤더 */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">자동 발주 추천</h1>
            <p className="text-xs" style={{ color: COLORS.textDim }}>
              ML 수요 예측 + 리드타임 학습 기반 자동 발주
              {useMock && (
                <span className="ml-2 inline-block rounded bg-[#D29922]/15 px-1.5 py-0.5 text-[#D29922]">
                  DEMO
                </span>
              )}
            </p>
          </div>
        </div>

        {/* KPI 카드 */}
        <div className="flex gap-3">
          <KpiCard
            icon={<AlertTriangle size={16} />}
            label="긴급 대기"
            value={summary.urgentCount}
            color="var(--accent-red)"
            trend={{ value: 1, up: true }}
          />
          <KpiCard
            icon={<Package size={16} />}
            label="전체 대기"
            value={summary.pendingCount}
            color="var(--accent-orange)"
          />
          <KpiCard
            icon={<ShoppingCart size={16} />}
            label="자동발주(30일)"
            value={summary.autoOrderedLast30d}
            color="var(--accent-green)"
            trend={{ value: 2, up: false }}
          />
        </div>
      </header>

      {/* 탭 */}
      <div
        className="flex gap-1 px-6"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        {TAB_CONFIG.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors ${
              tab === key
                ? 'border-b-2 border-[var(--accent-blue)] text-white'
                : 'text-[#8B949E] hover:text-[var(--text-primary)]'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          {tab === 'recommendations' && (
            <RecommendationsTab
              items={filtered}
              filter={filter}
              onFilterChange={setFilter}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
              onGenerate={handleGenerate}
              loading={loading}
            />
          )}
          {tab === 'forecast' && <ForecastTab />}
          {tab === 'leadtime' && <LeadTimeTab />}
        </div>
      </div>
    </div>
  );
}

// === 추천 목록 탭 ===

interface RecommendationsTabProps {
  items: ReorderRecommendation[];
  filter: string;
  onFilterChange: (f: string) => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

function RecommendationsTab({
  items, filter, onFilterChange, onAccept, onDismiss, onGenerate, loading,
}: RecommendationsTabProps) {
  return (
    <div className="space-y-4">
      {/* 필터 + 생성 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((f) => {
            const isActive = filter === f;
            const style = f !== 'ALL' ? URGENCY_STYLES[f] : null;
            return (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#58A6FF]/15 text-[#58A6FF]'
                    : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-white/5'
                }`}
                style={{
                  border: `1px solid ${isActive ? 'var(--accent-blue)' : COLORS.border}`,
                }}
              >
                {style && (
                  <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
                )}
                {f === 'ALL' ? '전체' : style?.label ?? f}
              </button>
            );
          })}
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="rounded-lg bg-[#238636] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2EA043] disabled:opacity-50"
        >
          {loading ? '분석 중...' : '추천 새로고침'}
        </button>
      </div>

      {/* 추천 카드 목록 또는 빈 상태 */}
      {items.length === 0 ? (
        <EmptyState
          icon={<Package size={48} />}
          message="발주 추천 항목이 없습니다"
          sub="현재 필터 조건에 해당하는 추천이 없습니다."
        />
      ) : (
        <div className="space-y-3">
          {items.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onAccept={onAccept}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// === 빈 상태 컴포넌트 ===

function EmptyState({
  icon,
  message,
  sub,
}: {
  icon: React.ReactNode;
  message: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div style={{ color: COLORS.textDim }}>{icon}</div>
      <p className="mt-4 text-sm font-medium" style={{ color: COLORS.textMuted }}>
        {message}
      </p>
      {sub && (
        <p className="mt-1 text-xs" style={{ color: COLORS.textDim }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// === 추천 카드 ===

function RecommendationCard({
  rec, onAccept, onDismiss,
}: {
  rec: ReorderRecommendation;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const urgStyle = URGENCY_STYLES[rec.urgency] ?? URGENCY_STYLES.LOW;
  const isPending = rec.status === 'PENDING';

  // 재고 잔량 바 비율
  const maxQty = Math.max(rec.currentQty, rec.safetyStock, rec.reorderQty);
  const currentPct = (rec.currentQty / maxQty) * 100;
  const safetyPct = (rec.safetyStock / maxQty) * 100;

  // 소진 타임라인 비율 (최대 30일 기준)
  const timelinePct = rec.daysUntilOut !== null ? Math.min((rec.daysUntilOut / 30) * 100, 100) : 0;
  const timelineColor =
    rec.daysUntilOut !== null && rec.daysUntilOut <= 3
      ? 'var(--accent-red)'
      : rec.daysUntilOut !== null && rec.daysUntilOut <= 7
        ? 'var(--accent-orange)'
        : 'var(--accent-green)';

  return (
    <div
      className={`rounded-xl border p-5 transition-all hover:translate-y-[-1px] ${urgStyle.border}`}
      style={{
        backgroundColor: COLORS.card,
        boxShadow: urgStyle.shadow,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 헤더 */}
          <div className="flex items-center gap-2.5">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-bold ${urgStyle.badge} ${urgStyle.badgeText}`}
            >
              {urgStyle.label}
            </span>
            <span className="font-mono text-sm font-bold text-white">{rec.sku}</span>
            <span className="text-sm" style={{ color: COLORS.text }}>
              {rec.itemName}
            </span>
            {rec.status !== 'PENDING' && (
              <span
                className="rounded-md px-2 py-0.5 text-xs"
                style={{
                  backgroundColor:
                    rec.status === 'AUTO_ORDERED' ? 'rgba(56,139,253,0.15)' : 'rgba(139,148,158,0.15)',
                  color: rec.status === 'AUTO_ORDERED' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}
              >
                {rec.status === 'AUTO_ORDERED' ? '발주 완료' : '무시됨'}
              </span>
            )}
          </div>

          {/* 핵심 메시지 */}
          <p className="mt-2.5 text-sm" style={{ color: COLORS.text }}>
            {rec.daysUntilOut !== null && rec.daysUntilOut <= 0
              ? '재고가 이미 소진되었습니다!'
              : `${rec.daysUntilOut ?? '?'}일 후 재고 소진 예정`}
            {rec.partnerName && rec.avgLeadDays && (
              <>, {rec.partnerName}에 지금 발주하면 {rec.avgLeadDays}일 후 입고</>
            )}
          </p>

          {/* 소진 타임라인 시각화 */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: COLORS.textMuted }}>
              소진 타임라인
            </span>
            <div
              className="relative h-2 flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: COLORS.grid }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${timelinePct}%`,
                  backgroundColor: timelineColor,
                  boxShadow: `0 0 6px ${timelineColor}40`,
                }}
              />
              {/* 현재 위치 마커 */}
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white"
                style={{
                  left: `${Math.max(timelinePct - 1, 0)}%`,
                  backgroundColor: timelineColor,
                }}
              />
            </div>
            <span className="whitespace-nowrap text-xs font-bold" style={{ color: timelineColor }}>
              {rec.daysUntilOut ?? '-'}일
            </span>
          </div>

          {/* 수량 정보 */}
          <div className="mt-3 grid grid-cols-4 gap-4 text-xs">
            <div>
              <div style={{ color: COLORS.textDim }}>현재 재고</div>
              <div className="mt-0.5 font-bold text-white">{rec.currentQty.toLocaleString()}개</div>
            </div>
            <div>
              <div style={{ color: COLORS.textDim }}>안전 재고</div>
              <div className="mt-0.5 font-bold text-[#E3B341]">
                {rec.safetyStock.toLocaleString()}개
              </div>
            </div>
            <div>
              <div style={{ color: COLORS.textDim }}>추천 발주량</div>
              <div className="mt-0.5 font-bold text-[var(--accent-blue)]">
                {rec.reorderQty.toLocaleString()}개
              </div>
            </div>
            <div>
              <div style={{ color: COLORS.textDim }}>소진 예정일</div>
              <div className="mt-0.5 font-bold text-white">{rec.stockoutDate ?? '-'}</div>
            </div>
          </div>

          {/* 재고 바 */}
          <div className="mt-2.5 flex items-center gap-2">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: COLORS.grid }}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  currentPct < safetyPct ? 'bg-[#F85149]' : 'bg-[var(--accent-green)]'
                }`}
                style={{ width: `${Math.min(currentPct, 100)}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-xs" style={{ color: COLORS.textDim }}>
              {Math.round(currentPct)}% / 안전선 {Math.round(safetyPct)}%
            </span>
          </div>

          {/* 예측 정보 */}
          {rec.forecastMeta && (
            <div className="mt-2 flex gap-3 text-xs" style={{ color: COLORS.textDim }}>
              <span>모델: {rec.forecastMeta.model}</span>
              <span>일평균: {rec.forecastMeta.dailyAvg}개</span>
              {rec.forecastMeta.mape !== null && (
                <span>정확도: MAPE {rec.forecastMeta.mape}%</span>
              )}
            </div>
          )}
        </div>

        {/* 액션 버튼 — Accept=녹색, Ignore=회색 아웃라인 */}
        {isPending && (
          <div className="ml-5 flex flex-col gap-2">
            <button
              onClick={() => onAccept(rec.id)}
              className="flex items-center gap-1.5 rounded-lg bg-[#238636] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#2EA043]"
            >
              <Check size={13} />
              수락
            </button>
            <button
              onClick={() => onDismiss(rec.id)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:bg-white/5"
              style={{
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textMuted,
              }}
            >
              <X size={13} />
              무시
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// === 수요 예측 탭 ===

function ForecastTab() {
  // Mock 수요 예측 차트 데이터
  const mockDays = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        const base = 15 + Math.sin(i * 0.3) * 5;
        return {
          date: d.toISOString().slice(5, 10),
          forecast: Math.max(0, Math.round(base + (Math.random() - 0.5) * 4)),
          actual: i < 7 ? Math.max(0, Math.round(base + (Math.random() - 0.5) * 6)) : undefined,
        };
      }),
    []
  );

  // 커스텀 툴팁
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="rounded-lg px-3 py-2 text-xs shadow-xl"
        style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="mb-1 font-medium text-white">{label}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span style={{ color: COLORS.textMuted }}>
              {entry.dataKey === 'forecast' ? '예측' : '실제'}:
            </span>
            <span className="font-bold text-white">{entry.value}개</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 수요 예측 라인 차트 */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              SKU-2891 가솔린 엔진 밸브 — 30일 수요 예측
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: COLORS.textDim }}>
              실제 소비량과 예측치 비교
            </p>
          </div>
          <span
            className="rounded-md px-2.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: 'rgba(88,166,255,0.1)',
              color: 'var(--accent-blue)',
              border: '1px solid rgba(88,166,255,0.2)',
            }}
          >
            LINEAR 모델 | MAPE 12.3%
          </span>
        </div>

        {/* recharts 라인 차트 */}
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={mockDays}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="date"
              stroke={COLORS.textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: COLORS.border }}
              interval={4}
            />
            <YAxis
              stroke={COLORS.textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: COLORS.border }}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="var(--accent-blue)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent-blue)', stroke: COLORS.card, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--accent-green)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: 'var(--accent-green)', stroke: COLORS.card, strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* 요약 통계 */}
        <div className="mt-4 grid grid-cols-4 gap-4 text-center text-xs">
          <div>
            <div style={{ color: COLORS.textDim }}>일평균 예측</div>
            <div className="mt-1 text-base font-bold text-[var(--accent-blue)]">15개</div>
          </div>
          <div>
            <div style={{ color: COLORS.textDim }}>30일 합계</div>
            <div className="mt-1 text-base font-bold text-white">450개</div>
          </div>
          <div>
            <div style={{ color: COLORS.textDim }}>현재 재고</div>
            <div className="mt-1 text-base font-bold text-[#F85149]">45개</div>
          </div>
          <div>
            <div style={{ color: COLORS.textDim }}>소진 예상일</div>
            <div className="mt-1 text-base font-bold text-[#F85149]">3일 후</div>
          </div>
        </div>
      </div>

      {/* 모델 비교 */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <h3 className="mb-4 text-sm font-semibold text-white">예측 모델 비교</h3>

        {/* recharts 바 차트 — 모델별 MAPE 비교 */}
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={[
              { model: 'MOVING_AVG', d7: 105, d14: 210, d30: 450, mape: 18.2 },
              { model: 'LINEAR', d7: 112, d14: 224, d30: 450, mape: 12.3 },
              { model: 'PROPHET', d7: 108, d14: 218, d30: 462, mape: 9.8 },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="model"
              stroke={COLORS.textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: COLORS.border }}
            />
            <YAxis
              stroke={COLORS.textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: COLORS.border }}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                fontSize: 12,
                color: COLORS.text,
              }}
              labelStyle={{ color: 'white', fontWeight: 600 }}
            />
            <Bar dataKey="d7" name="7일 예측" fill="var(--accent-blue)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="d14" name="14일 예측" fill="#388BFD50" radius={[3, 3, 0, 0]} />
            <Bar dataKey="d30" name="30일 예측" fill="#388BFD25" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* 테이블 */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
                <th className="px-3 py-2 text-left">모델</th>
                <th className="px-3 py-2 text-right">7일 예측</th>
                <th className="px-3 py-2 text-right">14일 예측</th>
                <th className="px-3 py-2 text-right">30일 예측</th>
                <th className="px-3 py-2 text-right">MAPE (%)</th>
                <th className="px-3 py-2 text-center">추천</th>
              </tr>
            </thead>
            <tbody>
              {[
                { model: 'MOVING_AVG', d7: 105, d14: 210, d30: 450, mape: 18.2, best: false },
                { model: 'LINEAR', d7: 112, d14: 224, d30: 450, mape: 12.3, best: true },
                { model: 'PROPHET', d7: 108, d14: 218, d30: 462, mape: 9.8, best: false },
              ].map((row) => (
                <tr
                  key={row.model}
                  className="transition-colors hover:bg-white/[0.03]"
                  style={{ borderBottom: `1px solid ${COLORS.grid}` }}
                >
                  <td className="px-3 py-2.5 font-mono text-[var(--accent-blue)]">{row.model}</td>
                  <td className="px-3 py-2.5 text-right" style={{ color: COLORS.text }}>
                    {row.d7}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: COLORS.text }}>
                    {row.d14}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: COLORS.text }}>
                    {row.d30}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: COLORS.text }}>
                    {row.mape}%
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.best ? (
                      <span className="text-[#E3B341]">★</span>
                    ) : (
                      <span style={{ color: COLORS.textDim }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// === 리드타임 탭 ===

function LeadTimeTab() {
  const mockStats = [
    {
      partner: '현대모비스', avgDays: 5.2, minDays: 3, maxDays: 8,
      reliability: 82, trend: -0.3, samples: 24,
    },
    {
      partner: 'SL', avgDays: 3.1, minDays: 2, maxDays: 5,
      reliability: 91, trend: 0.0, samples: 18,
    },
    {
      partner: '경신', avgDays: 7.4, minDays: 5, maxDays: 12,
      reliability: 68, trend: 1.2, samples: 15,
    },
    {
      partner: '만도', avgDays: 4.0, minDays: 3, maxDays: 6,
      reliability: 88, trend: -0.5, samples: 31,
    },
  ];

  // 리드타임 바 차트 데이터
  const barData = mockStats.map((s) => ({
    name: s.partner,
    avg: s.avgDays,
    min: s.minDays,
    max: s.maxDays,
  }));

  return (
    <div className="space-y-4">
      {/* 리드타임 바 차트 */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <h3 className="mb-4 text-sm font-semibold text-white">공급업체 리드타임 비교</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
            <XAxis
              type="number"
              stroke={COLORS.textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: COLORS.border }}
              unit="일"
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke={COLORS.textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: COLORS.border }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                fontSize: 12,
                color: COLORS.text,
              }}
              labelStyle={{ color: 'white', fontWeight: 600 }}
            />
            <Bar dataKey="avg" name="평균" fill="var(--accent-blue)" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 공급업체 리드타임 통계 카드 */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <h3 className="mb-4 text-sm font-semibold text-white">공급업체 리드타임 통계</h3>
        <div className="space-y-3">
          {mockStats.map((s) => {
            const reliabilityColor =
              s.reliability >= 80 ? 'var(--accent-green)' : s.reliability >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)';

            return (
              <div
                key={s.partner}
                className="rounded-lg p-4 transition-colors hover:bg-white/[0.02]"
                style={{ border: `1px solid ${COLORS.border}` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: 'rgba(88,166,255,0.08)' }}
                    >
                      <Clock size={14} style={{ color: COLORS.accent }} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">{s.partner}</span>
                      <div className="text-xs" style={{ color: COLORS.textDim }}>
                        {s.samples}건 학습
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-xs">
                    <span style={{ color: COLORS.textMuted }}>
                      {s.minDays}~{s.maxDays}일
                    </span>
                    <span className="text-sm font-bold text-[var(--accent-blue)]">평균 {s.avgDays}일</span>
                    <span
                      className="flex items-center gap-0.5 font-medium"
                      style={{
                        color: s.trend < 0 ? 'var(--accent-green)' : s.trend > 0 ? 'var(--accent-red)' : COLORS.textDim,
                      }}
                    >
                      {s.trend > 0 ? '▲' : s.trend < 0 ? '▼' : '—'}
                      {Math.abs(s.trend).toFixed(1)}일
                    </span>
                  </div>
                </div>
                {/* 신뢰도 바 */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs" style={{ color: COLORS.textDim }}>
                    신뢰도
                  </span>
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: COLORS.grid }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.reliability}%`,
                        backgroundColor: reliabilityColor,
                        boxShadow: `0 0 6px ${reliabilityColor}40`,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: reliabilityColor }}
                  >
                    {s.reliability}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 리드타임 히스토리 */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <h3 className="mb-4 text-sm font-semibold text-white">최근 발주-입고 이력</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
                <th className="px-3 py-2.5 text-left">공급업체</th>
                <th className="px-3 py-2.5 text-left">SKU</th>
                <th className="px-3 py-2.5 text-right">발주일</th>
                <th className="px-3 py-2.5 text-right">입고일</th>
                <th className="px-3 py-2.5 text-right">소요일</th>
                <th className="px-3 py-2.5 text-right">수량</th>
              </tr>
            </thead>
            <tbody>
              {[
                { partner: '현대모비스', sku: 'SKU-2891', ordered: '03-01', received: '03-06', days: 5, qty: 500 },
                { partner: 'SL', sku: 'SKU-1044', ordered: '03-03', received: '03-06', days: 3, qty: 300 },
                { partner: '경신', sku: 'SKU-3320', ordered: '02-25', received: '03-04', days: 7, qty: 1000 },
                { partner: '만도', sku: 'SKU-5501', ordered: '03-05', received: '03-09', days: 4, qty: 400 },
                { partner: '현대모비스', sku: 'SKU-0887', ordered: '02-28', received: '03-05', days: 5, qty: 600 },
              ].map((r, i) => (
                <tr
                  key={i}
                  className="transition-colors hover:bg-white/[0.03]"
                  style={{ borderBottom: `1px solid ${COLORS.grid}` }}
                >
                  <td className="px-3 py-2.5" style={{ color: COLORS.text }}>
                    {r.partner}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[var(--accent-blue)]">{r.sku}</td>
                  <td className="px-3 py-2.5 text-right" style={{ color: COLORS.textMuted }}>
                    {r.ordered}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: COLORS.textMuted }}>
                    {r.received}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-white">{r.days}일</td>
                  <td className="px-3 py-2.5 text-right" style={{ color: COLORS.text }}>
                    {r.qty.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
