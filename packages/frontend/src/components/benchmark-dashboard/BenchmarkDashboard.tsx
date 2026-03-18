/**
 * 업계 벤치마크 대시보드 — 다크 테마 UI
 * - 레이더 차트로 내 창고 vs 업계 평균 비교 (recharts)
 * - 지표별 KPI 비교 바 차트 + 분포 시각화
 * - 월별 트렌드 라인차트 (6개월)
 * - 개선 권고 + 우선순위 뱃지
 * - 애니메이션 카운터
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  BarChart3,
  Target,
  Award,
  Lightbulb,
} from 'lucide-react';
import type {
  BenchmarkData,
  BenchmarkReport,
  CompanyBenchmarkHistory,
  RecommendationItem,
} from '../../api/benchmark-api';
import {
  getMyBenchmark,
  generateReport,
  getReports,
  getBenchmarkHistory,
} from '../../api/benchmark-api';

// ── 디자인 토큰 (CSS 변수 참조) ──
const COLORS = {
  bg: 'var(--bg-primary)',
  card: 'var(--bg-secondary)',
  border: 'var(--border-default)',
  text: 'var(--text-primary)',
  textMuted: 'var(--text-secondary)',
  textDim: 'var(--text-muted)',
  grid: 'var(--bg-tertiary)',
  accent: 'var(--accent-blue)',
  accentGreen: 'var(--accent-green)',
  accentOrange: 'var(--accent-orange)',
  accentRed: 'var(--accent-red)',
  accentPurple: 'var(--accent-purple)',
  radarMine: 'var(--accent-blue)',
  radarIndustry: 'var(--text-secondary)',
} as const;

interface Props {
  onBack: () => void;
}

type Tab = 'overview' | 'details' | 'reports';

const DEMO_COMPANY = 'demo-company-001';
const DEMO_SITE = 'demo-site-001';

// KPI 메타 정보
const KPI_META: Record<string, { label: string; unit: string; higherIsBetter: boolean; icon: typeof Trophy; color: string }> = {
  picking_accuracy: { label: '피킹 정확도', unit: '%', higherIsBetter: true, icon: Target, color: 'var(--accent-blue)' },
  inventory_turnover: { label: '재고회전율', unit: '회/년', higherIsBetter: true, icon: TrendingUp, color: 'var(--accent-green)' },
  space_utilization: { label: '공간활용률', unit: '%', higherIsBetter: true, icon: BarChart3, color: 'var(--accent-purple)' },
  on_time_delivery: { label: '납기준수율', unit: '%', higherIsBetter: true, icon: Trophy, color: 'var(--accent-orange)' },
  receiving_time: { label: '입고처리 시간', unit: '시간', higherIsBetter: false, icon: Award, color: 'var(--accent-orange)' },
  order_cycle_time: { label: '주문처리 시간', unit: '시간', higherIsBetter: false, icon: Lightbulb, color: 'var(--accent-red)' },
};
const KPI_KEYS = Object.keys(KPI_META);

// ── 등급 유틸 ──
function gradeFromScore(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function gradeColor(grade: string): string {
  const map: Record<string, string> = {
    S: 'var(--accent-orange)', A: 'var(--accent-green)', B: 'var(--accent-blue)',
    C: 'var(--text-secondary)', D: 'var(--accent-orange)', F: 'var(--accent-red)',
  };
  return map[grade] ?? 'var(--text-secondary)';
}

// ── 애니메이션 카운터 훅 ──
function useAnimatedCounter(target: number, duration: number = 1200): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo 커브
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(eased * target);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ── 애니메이션 숫자 컴포넌트 ──
function AnimatedNumber({ value, decimals = 1, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const animated = useAnimatedCounter(value);
  return <>{animated.toFixed(decimals)}{suffix}</>;
}

// ── 메인 대시보드 ──
export function BenchmarkDashboard({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [reports, setReports] = useState<BenchmarkReport[]>([]);
  const [history, setHistory] = useState<CompanyBenchmarkHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMyBenchmark(DEMO_COMPANY, DEMO_SITE, period);
      if (result) {
        setData(result);
      } else {
        // 데모용 mock 데이터 사용
        setData(MOCK_BENCHMARK_DATA);
      }
    } catch {
      setData(MOCK_BENCHMARK_DATA);
    }
    try {
      const [reps, hist] = await Promise.all([
        getReports(DEMO_COMPANY),
        getBenchmarkHistory(DEMO_COMPANY, DEMO_SITE, 6),
      ]);
      setReports(reps.length > 0 ? reps : MOCK_REPORTS);
      setHistory(hist.length > 0 ? hist : MOCK_HISTORY);
    } catch {
      setReports(MOCK_REPORTS);
      setHistory(MOCK_HISTORY);
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      await generateReport(DEMO_COMPANY, DEMO_SITE, period);
      const reps = await getReports(DEMO_COMPANY);
      setReports(reps);
    } catch {
      setError('리포트 생성에 실패했습니다.');
    }
    setLoading(false);
  };

  const grade = data ? gradeFromScore(data.rank.overallScore) : 'C';

  const TAB_ITEMS: { key: Tab; label: string; icon: typeof Trophy }[] = [
    { key: 'overview', label: '종합비교', icon: BarChart3 },
    { key: 'details', label: '지표상세', icon: Target },
    { key: 'reports', label: '리포트', icon: Lightbulb },
  ];

  return (
    <div className="flex min-h-screen flex-col" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* 헤더 */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold" style={{ color: COLORS.text }}>
            업계 벤치마크
          </h1>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted,
            }}
          >
            {getLast6Months().map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {data && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs" style={{ color: COLORS.textDim }}>종합 점수</p>
              <p className="text-2xl font-bold">
                <AnimatedNumber value={data.rank.overallScore} />
              </p>
            </div>
            <div
              className="text-4xl font-black"
              style={{ color: gradeColor(grade) }}
            >
              {grade}
            </div>
          </div>
        )}
      </header>

      {/* 탭 네비게이션 */}
      <div
        className="flex gap-1 px-6"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        {TAB_ITEMS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors"
              style={{
                color: isActive ? COLORS.accent : COLORS.textDim,
                borderBottom: isActive ? `2px solid ${COLORS.accent}` : '2px solid transparent',
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div
          className="mx-6 mt-4 flex items-center justify-between rounded-lg px-4 py-2 text-sm"
          style={{
            background: 'rgba(248,81,73,0.1)',
            border: '1px solid rgba(248,81,73,0.25)',
            color: COLORS.accentRed,
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 hover:opacity-80"
            style={{ color: COLORS.accentRed }}
          >
            닫기
          </button>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--accent-blue) transparent transparent transparent' }}
            />
          </div>
        ) : data ? (
          <>
            {tab === 'overview' && <OverviewTab data={data} history={history} />}
            {tab === 'details' && <DetailsTab data={data} />}
            {tab === 'reports' && (
              <ReportsTab
                reports={reports}
                recommendations={data.recommendations}
                onGenerate={handleGenerateReport}
              />
            )}
          </>
        ) : (
          <EmptyState message="벤치마크 데이터가 충분하지 않습니다 (동일 업종 최소 5개 회사 필요)" />
        )}
      </div>
    </div>
  );
}

// ── 빈 상태 컴포넌트 ──
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <BarChart3 size={48} style={{ color: COLORS.textDim }} />
      <p className="mt-4 text-sm" style={{ color: COLORS.textMuted }}>
        {message}
      </p>
    </div>
  );
}

// ── 종합비교 탭 ──
function OverviewTab({ data, history }: { data: BenchmarkData; history: CompanyBenchmarkHistory[] }) {
  // 레이더 차트 데이터 준비
  const radarData = KPI_KEYS.map((kpi) => {
    const meta = KPI_META[kpi];
    const myVal = data.rank.metrics[kpi] ?? 0;
    const avgVal = data.benchmark.averages[kpi] ?? 0;
    const pct = data.benchmark.percentiles[kpi];
    const p90 = pct?.p90 ?? Math.max(myVal, avgVal) * 1.2;

    let myNorm: number;
    let avgNorm: number;
    if (meta.higherIsBetter) {
      myNorm = p90 > 0 ? Math.min(100, (myVal / p90) * 100) : 50;
      avgNorm = p90 > 0 ? Math.min(100, (avgVal / p90) * 100) : 50;
    } else {
      myNorm = p90 > 0 ? Math.min(100, Math.max(0, (1 - myVal / p90) * 100)) : 50;
      avgNorm = p90 > 0 ? Math.min(100, Math.max(0, (1 - avgVal / p90) * 100)) : 50;
    }

    return {
      label: meta.label,
      mine: Math.round(myNorm),
      industry: Math.round(avgNorm),
    };
  });

  return (
    <div className="space-y-6">
      {/* 상단 그리드: 레이더 차트 + 순위 카드 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 레이더 차트 카드 */}
        <DarkCard title="내 창고 vs 업계 평균">
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke={COLORS.grid} />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: COLORS.textDim, fontSize: 9 }}
                  axisLine={false}
                />
                <Radar
                  name="업계 평균"
                  dataKey="industry"
                  stroke={COLORS.radarIndustry}
                  fill={COLORS.radarIndustry}
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                />
                <Radar
                  name="내 창고"
                  dataKey="mine"
                  stroke={COLORS.radarMine}
                  fill={COLORS.radarMine}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: COLORS.textMuted }}
                  iconType="circle"
                  iconSize={8}
                />
                <Tooltip
                  contentStyle={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    color: COLORS.text,
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </DarkCard>

        {/* 순위 카드 영역 */}
        <div className="space-y-4">
          {/* KPI 순위 카드 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {KPI_KEYS.map((kpi) => {
              const meta = KPI_META[kpi];
              const rank = data.rank.percentileRanks[kpi] ?? 50;
              const myVal = data.rank.metrics[kpi] ?? 0;
              const avgVal = data.benchmark.averages[kpi] ?? 0;
              const diff = meta.higherIsBetter ? myVal - avgVal : avgVal - myVal;
              const isPositive = diff >= 0;
              const Icon = meta.icon;

              return (
                <div
                  key={kpi}
                  className="relative overflow-hidden rounded-lg p-4"
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderTop: `3px solid ${meta.color}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: meta.color }} />
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold">
                    <AnimatedNumber value={myVal} suffix={meta.unit === '%' ? '%' : ''} />
                    {meta.unit !== '%' && (
                      <span className="ml-0.5 text-xs" style={{ color: COLORS.textDim }}>
                        {meta.unit}
                      </span>
                    )}
                  </p>
                  <p
                    className="mt-0.5 text-xs font-medium"
                    style={{ color: isPositive ? COLORS.accentGreen : COLORS.accentRed }}
                  >
                    {isPositive ? '▲' : '▼'} 상위 {rank.toFixed(0)}%
                  </p>
                </div>
              );
            })}
          </div>

          {/* 참여 정보 카드 */}
          <div
            className="rounded-lg p-4"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: COLORS.textMuted }}>참여 회사 수</span>
              <span className="text-lg font-bold">{data.benchmark.participantCount}개사</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm" style={{ color: COLORS.textMuted }}>업종</span>
              <span className="text-sm" style={{ color: COLORS.text }}>{data.benchmark.industry}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm" style={{ color: COLORS.textMuted }}>기간</span>
              <span className="text-sm" style={{ color: COLORS.text }}>{data.benchmark.period}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 월별 트렌드 차트 */}
      {history.length > 1 && (
        <DarkCard title="종합 점수 추이 (6개월)">
          <MonthlyTrendChart history={history} />
        </DarkCard>
      )}

      {/* 개선 권고 (상위 3개) */}
      {data.recommendations.length > 0 && (
        <DarkCard title="개선 권고">
          <div className="space-y-3">
            {data.recommendations.slice(0, 3).map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </DarkCard>
      )}
    </div>
  );
}

// ── 지표상세 탭 ──
function DetailsTab({ data }: { data: BenchmarkData }) {
  // KPI 비교 바 차트 데이터
  const barData = KPI_KEYS.map((kpi) => {
    const meta = KPI_META[kpi];
    const myVal = data.rank.metrics[kpi] ?? 0;
    const avg = data.benchmark.averages[kpi] ?? 0;
    return {
      label: meta.label,
      '내 창고': myVal,
      '업계 평균': avg,
    };
  });

  return (
    <div className="space-y-6">
      {/* KPI 비교 바 차트 */}
      <DarkCard title="KPI 비교 (내 창고 vs 업계 평균)">
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11 }} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                axisLine={false}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  color: COLORS.text,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: COLORS.textMuted }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="내 창고" fill={COLORS.accent} radius={[0, 4, 4, 0]} barSize={14} />
              <Bar dataKey="업계 평균" fill={COLORS.textDim} radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DarkCard>

      {/* 지표별 상세 카드 */}
      {KPI_KEYS.map((kpi) => {
        const meta = KPI_META[kpi];
        const Icon = meta.icon;
        const myVal = data.rank.metrics[kpi] ?? 0;
        const avg = data.benchmark.averages[kpi] ?? 0;
        const pct = data.benchmark.percentiles[kpi];
        const rank = data.rank.percentileRanks[kpi] ?? 50;

        // 대비 계산
        const vsAvg = meta.higherIsBetter
          ? ((myVal - avg) / Math.max(avg, 0.01)) * 100
          : ((avg - myVal) / Math.max(avg, 0.01)) * 100;

        return (
          <div
            key={kpi}
            className="rounded-lg p-5"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderTop: `3px solid ${meta.color}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: `${meta.color}20` }}
                >
                  <Icon size={18} style={{ color: meta.color }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: COLORS.text }}>{meta.label}</h3>
                  <p className="text-xs" style={{ color: COLORS.textDim }}>
                    {meta.higherIsBetter ? '높을수록 좋음' : '낮을수록 좋음'} | 단위: {meta.unit}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  <AnimatedNumber value={myVal} />
                  <span className="ml-0.5 text-sm" style={{ color: COLORS.textDim }}>{meta.unit}</span>
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: vsAvg >= 0 ? COLORS.accentGreen : COLORS.accentRed }}
                >
                  {vsAvg >= 0 ? '▲' : '▼'} 업계 평균 대비 {vsAvg >= 0 ? '+' : ''}{vsAvg.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* 분포 바 */}
            {pct && (
              <div className="mt-4">
                <div className="relative h-8 overflow-hidden rounded-full" style={{ background: COLORS.grid }}>
                  {/* P25-P75 범위 */}
                  <div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      background: `${COLORS.border}`,
                      left: `${normalize(pct.p25, pct)}%`,
                      width: `${normalize(pct.p75, pct) - normalize(pct.p25, pct)}%`,
                    }}
                  />
                  {/* 업계 평균 마커 */}
                  <div
                    className="absolute top-0 h-full w-0.5"
                    style={{
                      background: COLORS.textDim,
                      left: `${normalize(avg, pct)}%`,
                    }}
                  />
                  {/* 내 위치 마커 */}
                  <div
                    className="absolute top-1 h-6 w-2 rounded-full"
                    style={{
                      background: COLORS.accent,
                      left: `${normalize(myVal, pct)}%`,
                      boxShadow: '0 0 8px rgba(88,166,255,0.5)',
                    }}
                  />
                </div>
                <div
                  className="mt-1 flex justify-between text-xs"
                  style={{ color: COLORS.textDim }}
                >
                  <span>P25: {pct.p25.toFixed(1)}</span>
                  <span>P50: {pct.p50.toFixed(1)}</span>
                  <span>P75: {pct.p75.toFixed(1)}</span>
                  <span>P90: {pct.p90.toFixed(1)}</span>
                </div>
              </div>
            )}

            {/* 상위 % 뱃지 — 크게 표시 */}
            <div className="mt-3 flex items-center gap-3">
              <span
                className="rounded-full px-4 py-1.5 text-sm font-bold"
                style={{
                  background: rank <= 10 ? 'rgba(210,153,34,0.12)' :
                             rank <= 25 ? 'rgba(63,185,80,0.12)' :
                             rank <= 50 ? 'rgba(88,166,255,0.12)' :
                             'rgba(248,81,73,0.12)',
                  color: rank <= 10 ? COLORS.accentOrange :
                         rank <= 25 ? COLORS.accentGreen :
                         rank <= 50 ? COLORS.accent :
                         COLORS.accentRed,
                }}
              >
                상위 {rank.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 리포트 탭 ──
function ReportsTab({
  reports,
  recommendations,
  onGenerate,
}: {
  reports: BenchmarkReport[];
  recommendations: RecommendationItem[];
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>
          월별 벤치마크 리포트
        </h2>
        <button
          onClick={onGenerate}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: COLORS.accent, color: '#FFFFFF' }}
        >
          리포트 생성
        </button>
      </div>

      {/* 개선 권고 전체 목록 */}
      {recommendations.length > 0 && (
        <DarkCard title="개선 권고 사항">
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </DarkCard>
      )}

      {/* 리포트 목록 */}
      <div className="space-y-3">
        {reports.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg p-4"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div>
              <h4 className="font-medium" style={{ color: COLORS.text }}>{r.title}</h4>
              <p className="text-xs" style={{ color: COLORS.textDim }}>
                {r.period} | {new Date(r.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  background: r.status === 'GENERATED'
                    ? 'rgba(63,185,80,0.12)'
                    : r.status === 'FAILED'
                      ? 'rgba(248,81,73,0.12)'
                      : 'rgba(72,79,88,0.12)',
                  color: r.status === 'GENERATED'
                    ? COLORS.accentGreen
                    : r.status === 'FAILED'
                      ? COLORS.accentRed
                      : COLORS.textMuted,
                }}
              >
                {r.status === 'GENERATED' ? '생성 완료' : r.status === 'FAILED' ? '실패' : '대기 중'}
              </span>
            </div>
          </div>
        ))}

        {reports.length === 0 && (
          <EmptyState message="생성된 리포트가 없습니다. '리포트 생성' 버튼을 클릭하세요." />
        )}
      </div>
    </div>
  );
}

// ── 월별 트렌드 라인 차트 ──
function MonthlyTrendChart({ history }: { history: CompanyBenchmarkHistory[] }) {
  const sorted = [...history].sort((a, b) => a.period.localeCompare(b.period));
  const chartData = sorted.map((item) => ({
    period: item.period.slice(5) + '월',
    종합점수: item.overallScore,
  }));

  if (sorted.length < 2) return null;

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            dataKey="period"
            tick={{ fill: COLORS.textMuted, fontSize: 11 }}
            axisLine={{ stroke: COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: COLORS.textDim, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip
            contentStyle={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              color: COLORS.text,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="종합점수"
            stroke={COLORS.accent}
            strokeWidth={2.5}
            dot={{ fill: COLORS.accent, r: 4, strokeWidth: 0 }}
            activeDot={{ fill: COLORS.accent, r: 6, strokeWidth: 2, stroke: '#FFFFFF' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 다크 카드 래퍼 ──
function DarkCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <h3 className="mb-4 text-sm font-medium" style={{ color: COLORS.textMuted }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── 개선 권고 카드 ──
function RecommendationCard({ rec }: { rec: RecommendationItem }) {
  const priorityConfig: Record<string, { text: string; color: string; bg: string }> = {
    HIGH: { text: '긴급', color: 'var(--accent-red)', bg: 'rgba(248,81,73,0.15)' },
    MEDIUM: { text: '보통', color: 'var(--accent-orange)', bg: 'rgba(210,153,34,0.15)' },
    LOW: { text: '낮음', color: 'var(--accent-green)', bg: 'rgba(63,185,80,0.15)' },
  };

  const config = priorityConfig[rec.priority] ?? priorityConfig.LOW;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: config.bg,
        border: `1px solid ${config.color}30`,
      }}
    >
      <div className="flex items-center gap-2">
        <Lightbulb size={14} style={{ color: config.color }} />
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{
            background: `${config.color}25`,
            color: config.color,
          }}
        >
          {config.text}
        </span>
        <span className="text-sm font-medium" style={{ color: COLORS.text }}>
          {rec.kpiLabel}
        </span>
        <span className="text-xs" style={{ color: COLORS.textDim }}>
          격차 {rec.gapPercent.toFixed(1)}%
        </span>
      </div>
      <p className="mt-2 text-sm" style={{ color: COLORS.textMuted }}>
        {rec.message}
      </p>
    </div>
  );
}

// ── 유틸 ──

function normalize(
  value: number,
  pct: { p25: number; p50: number; p75: number; p90: number },
): number {
  const range = pct.p90 - pct.p25;
  if (range <= 0) return 50;
  return Math.min(95, Math.max(5, ((value - pct.p25) / range) * 85 + 5));
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

// ── Mock 데이터 ──

const MOCK_BENCHMARK_DATA: BenchmarkData = {
  myMetrics: {
    companyId: DEMO_COMPANY, siteId: DEMO_SITE,
    pickingAccuracy: 94.2, inventoryTurnover: 8.5,
    spaceUtilization: 72.0, onTimeDelivery: 92.5,
    receivingTime: 2.8, orderCycleTime: 5.5,
  },
  benchmark: {
    period: getCurrentPeriod(), industry: 'AUTO_PARTS',
    companySize: 'MEDIUM', participantCount: 23,
    averages: {
      picking_accuracy: 89.5, inventory_turnover: 7.2,
      space_utilization: 68.0, on_time_delivery: 88.0,
      receiving_time: 3.5, order_cycle_time: 7.0,
    },
    percentiles: {
      picking_accuracy: { p25: 82, p50: 89, p75: 95, p90: 98 },
      inventory_turnover: { p25: 5, p50: 7, p75: 10, p90: 13 },
      space_utilization: { p25: 55, p50: 67, p75: 78, p90: 88 },
      on_time_delivery: { p25: 80, p50: 88, p75: 94, p90: 97 },
      receiving_time: { p25: 2, p50: 3.5, p75: 5, p90: 7 },
      order_cycle_time: { p25: 4, p50: 6.5, p75: 9, p90: 12 },
    },
  },
  rank: {
    companyId: DEMO_COMPANY, siteId: DEMO_SITE,
    metrics: {
      picking_accuracy: 94.2, inventory_turnover: 8.5,
      space_utilization: 72.0, on_time_delivery: 92.5,
      receiving_time: 2.8, order_cycle_time: 5.5,
    },
    percentileRanks: {
      picking_accuracy: 18, inventory_turnover: 28,
      space_utilization: 35, on_time_delivery: 22,
      receiving_time: 20, order_cycle_time: 25,
    },
    overallScore: 75.3,
  },
  recommendations: [
    {
      kpi: 'space_utilization', kpiLabel: '공간활용률', currentValue: 72,
      industryAvg: 68, industryP75: 78, gapPercent: 8.3,
      priority: 'LOW',
      message: '공간활용률이 업계 상위 25% 수준(78%)에 미달합니다. 랙 배치 최적화를 통해 개선하세요.',
    },
  ],
};

const MOCK_REPORTS: BenchmarkReport[] = [
  {
    id: 'rep-1', companyId: DEMO_COMPANY, siteId: DEMO_SITE,
    period: '2026-02', title: '2026년 02월 데모기업 서울창고 업계 벤치마크 리포트',
    reportData: {}, recommendations: [], status: 'GENERATED',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'rep-2', companyId: DEMO_COMPANY, siteId: DEMO_SITE,
    period: '2026-01', title: '2026년 01월 데모기업 서울창고 업계 벤치마크 리포트',
    reportData: {}, recommendations: [], status: 'GENERATED',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
];

const MOCK_HISTORY: CompanyBenchmarkHistory[] = [
  { id: 'h1', period: '2025-10', pickingAccuracy: 88, inventoryTurnover: 6.5, spaceUtilization: 60, onTimeDelivery: 85, receivingTime: 4.2, orderCycleTime: 8, overallScore: 62, percentileRanks: {} },
  { id: 'h2', period: '2025-11', pickingAccuracy: 90, inventoryTurnover: 7.0, spaceUtilization: 63, onTimeDelivery: 87, receivingTime: 3.8, orderCycleTime: 7.5, overallScore: 66, percentileRanks: {} },
  { id: 'h3', period: '2025-12', pickingAccuracy: 91, inventoryTurnover: 7.5, spaceUtilization: 66, onTimeDelivery: 89, receivingTime: 3.5, orderCycleTime: 7.0, overallScore: 69, percentileRanks: {} },
  { id: 'h4', period: '2026-01', pickingAccuracy: 92.5, inventoryTurnover: 8.0, spaceUtilization: 68, onTimeDelivery: 90, receivingTime: 3.2, orderCycleTime: 6.5, overallScore: 71, percentileRanks: {} },
  { id: 'h5', period: '2026-02', pickingAccuracy: 93.5, inventoryTurnover: 8.2, spaceUtilization: 70, onTimeDelivery: 91, receivingTime: 3.0, orderCycleTime: 6.0, overallScore: 73, percentileRanks: {} },
  { id: 'h6', period: '2026-03', pickingAccuracy: 94.2, inventoryTurnover: 8.5, spaceUtilization: 72, onTimeDelivery: 92.5, receivingTime: 2.8, orderCycleTime: 5.5, overallScore: 75.3, percentileRanks: {} },
];
