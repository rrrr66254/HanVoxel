/**
 * 업계 벤치마크 대시보드
 * - 레이더 차트로 내 창고 vs 업계 평균 비교
 * - 지표별 상세 비교 + "업계 상위 몇 %" 표시
 * - 월별 리포트 생성 (경영진 보고용)
 * - 개선 권고 자동 표시
 */
import { useState, useEffect, useCallback } from 'react';
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

interface Props {
  onBack: () => void;
}

type Tab = 'overview' | 'details' | 'reports';

const DEMO_COMPANY = 'demo-company-001';
const DEMO_SITE = 'demo-site-001';

// KPI 메타
const KPI_META: Record<string, { label: string; unit: string; higherIsBetter: boolean }> = {
  picking_accuracy: { label: '피킹 정확도', unit: '%', higherIsBetter: true },
  inventory_turnover: { label: '재고회전율', unit: '회/년', higherIsBetter: true },
  space_utilization: { label: '공간활용률', unit: '%', higherIsBetter: true },
  on_time_delivery: { label: '납기준수율', unit: '%', higherIsBetter: true },
  receiving_time: { label: '입고처리 시간', unit: '시간', higherIsBetter: false },
  order_cycle_time: { label: '주문처리 시간', unit: '시간', higherIsBetter: false },
};
const KPI_KEYS = Object.keys(KPI_META);

// 등급 색상
function gradeColor(grade: string): string {
  const map: Record<string, string> = {
    S: 'text-yellow-400', A: 'text-emerald-400', B: 'text-blue-400',
    C: 'text-gray-300', D: 'text-orange-400', F: 'text-red-400',
  };
  return map[grade] ?? 'text-gray-400';
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

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

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            뒤로
          </button>
          <h1 className="text-xl font-bold">업계 벤치마크</h1>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300"
          >
            {getLast6Months().map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {data && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">종합 점수</p>
              <p className="text-2xl font-bold">{data.rank.overallScore.toFixed(1)}</p>
            </div>
            <div className={`text-4xl font-black ${gradeColor(grade)}`}>{grade}</div>
          </div>
        )}
      </header>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-800 px-6">
        {[
          { key: 'overview' as Tab, label: '종합 비교' },
          { key: 'details' as Tab, label: '지표 상세' },
          { key: 'reports' as Tab, label: '리포트' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-pink-500 text-pink-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">닫기</button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
          </div>
        ) : data ? (
          <>
            {tab === 'overview' && (
              <OverviewTab data={data} history={history} />
            )}
            {tab === 'details' && (
              <DetailsTab data={data} />
            )}
            {tab === 'reports' && (
              <ReportsTab
                reports={reports}
                recommendations={data.recommendations}
                onGenerate={handleGenerateReport}
              />
            )}
          </>
        ) : (
          <div className="py-20 text-center text-gray-500">
            벤치마크 데이터가 충분하지 않습니다 (동일 업종 최소 5개 회사 필요)
          </div>
        )}
      </div>
    </div>
  );
}

// ── 종합 비교 탭 ──

function OverviewTab({ data, history }: { data: BenchmarkData; history: CompanyBenchmarkHistory[] }) {
  return (
    <div className="space-y-6">
      {/* 상단: 레이더 차트 + 요약 카드 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 레이더 차트 */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="mb-4 text-sm font-medium text-gray-400">내 창고 vs 업계 평균</h3>
          <RadarChart data={data} />
          <div className="mt-4 flex justify-center gap-6 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-pink-500" /> 내 창고
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-500" /> 업계 평균
            </span>
          </div>
        </div>

        {/* 순위 요약 */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <h3 className="mb-3 text-sm font-medium text-gray-400">업계 순위</h3>
            <div className="grid grid-cols-2 gap-4">
              {KPI_KEYS.map((kpi) => {
                const meta = KPI_META[kpi];
                const rank = data.rank.percentileRanks[kpi] ?? 50;
                const isGood = rank <= 25;
                return (
                  <div key={kpi} className="rounded-lg border border-gray-800 p-3">
                    <p className="text-xs text-gray-500">{meta.label}</p>
                    <p className={`text-lg font-bold ${isGood ? 'text-emerald-400' : rank <= 50 ? 'text-blue-400' : 'text-orange-400'}`}>
                      상위 {rank.toFixed(0)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">참여 회사 수</span>
              <span className="text-lg font-bold">{data.benchmark.participantCount}개사</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-gray-400">업종</span>
              <span className="text-sm text-gray-300">{data.benchmark.industry}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-gray-400">기간</span>
              <span className="text-sm text-gray-300">{data.benchmark.period}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 트렌드 차트 */}
      {history.length > 1 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="mb-4 text-sm font-medium text-gray-400">종합 점수 추이</h3>
          <TrendChart history={history} />
        </div>
      )}

      {/* 개선 권고 (있으면) */}
      {data.recommendations.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="mb-4 text-sm font-medium text-gray-400">개선 권고</h3>
          <div className="space-y-3">
            {data.recommendations.slice(0, 3).map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 지표 상세 탭 ──

function DetailsTab({ data }: { data: BenchmarkData }) {
  return (
    <div className="space-y-4">
      {KPI_KEYS.map((kpi) => {
        const meta = KPI_META[kpi];
        const myVal = data.rank.metrics[kpi] ?? 0;
        const avg = data.benchmark.averages[kpi] ?? 0;
        const pct = data.benchmark.percentiles[kpi];
        const rank = data.rank.percentileRanks[kpi] ?? 50;

        // 대비 계산
        const vsAvg = meta.higherIsBetter
          ? ((myVal - avg) / Math.max(avg, 0.01)) * 100
          : ((avg - myVal) / Math.max(avg, 0.01)) * 100;

        return (
          <div key={kpi} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{meta.label}</h3>
                <p className="text-xs text-gray-500">
                  {meta.higherIsBetter ? '높을수록 좋음' : '낮을수록 좋음'} | 단위: {meta.unit}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{myVal.toFixed(1)}<span className="text-sm text-gray-500">{meta.unit}</span></p>
                <p className={`text-xs ${vsAvg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  업계 평균 대비 {vsAvg >= 0 ? '+' : ''}{vsAvg.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* 분포 바 */}
            {pct && (
              <div className="mt-4">
                <div className="relative h-8 rounded-full bg-gray-800">
                  {/* P25-P75 범위 */}
                  <div
                    className="absolute top-0 h-full rounded-full bg-gray-700/50"
                    style={{
                      left: `${normalize(pct.p25, pct)}%`,
                      width: `${normalize(pct.p75, pct) - normalize(pct.p25, pct)}%`,
                    }}
                  />
                  {/* 업계 평균 마커 */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-gray-500"
                    style={{ left: `${normalize(avg, pct)}%` }}
                  />
                  {/* 내 위치 마커 */}
                  <div
                    className="absolute top-1 h-6 w-1.5 rounded-full bg-pink-500"
                    style={{ left: `${normalize(myVal, pct)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-600">
                  <span>P25: {pct.p25.toFixed(1)}</span>
                  <span>P50: {pct.p50.toFixed(1)}</span>
                  <span>P75: {pct.p75.toFixed(1)}</span>
                  <span>P90: {pct.p90.toFixed(1)}</span>
                </div>
              </div>
            )}

            {/* 상위 % 뱃지 */}
            <div className="mt-3 flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                rank <= 10 ? 'bg-yellow-900/30 text-yellow-400' :
                rank <= 25 ? 'bg-emerald-900/30 text-emerald-400' :
                rank <= 50 ? 'bg-blue-900/30 text-blue-400' :
                'bg-orange-900/30 text-orange-400'
              }`}>
                업계 상위 {rank.toFixed(0)}%
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
        <h2 className="text-lg font-semibold">월별 벤치마크 리포트</h2>
        <button
          onClick={onGenerate}
          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium hover:bg-pink-700"
        >
          리포트 생성
        </button>
      </div>

      {/* 개선 권고 전체 목록 */}
      {recommendations.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h3 className="mb-3 text-sm font-medium text-gray-400">개선 권고 사항</h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {/* 리포트 목록 */}
      <div className="space-y-3">
        {reports.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 p-4"
          >
            <div>
              <h4 className="font-medium">{r.title}</h4>
              <p className="text-xs text-gray-500">
                {r.period} | {new Date(r.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                r.status === 'GENERATED'
                  ? 'bg-emerald-900/30 text-emerald-400'
                  : r.status === 'FAILED'
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-gray-800 text-gray-400'
              }`}>
                {r.status === 'GENERATED' ? '생성 완료' : r.status === 'FAILED' ? '실패' : '대기 중'}
              </span>
            </div>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-700 py-12 text-center text-gray-500">
            생성된 리포트가 없습니다. "리포트 생성" 버튼을 클릭하세요.
          </div>
        )}
      </div>
    </div>
  );
}

// ── 레이더 차트 (SVG) ──

function RadarChart({ data }: { data: BenchmarkData }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 110;
  const labels = KPI_KEYS.map((k) => KPI_META[k].label);
  const n = labels.length;

  // 0-100 정규화
  const myNorm: number[] = [];
  const avgNorm: number[] = [];

  KPI_KEYS.forEach((kpi) => {
    const myVal = data.rank.metrics[kpi] ?? 0;
    const avgVal = data.benchmark.averages[kpi] ?? 0;
    const pct = data.benchmark.percentiles[kpi];
    const p90 = pct?.p90 ?? Math.max(myVal, avgVal) * 1.2;
    const meta = KPI_META[kpi];

    if (meta.higherIsBetter) {
      myNorm.push(p90 > 0 ? Math.min(100, (myVal / p90) * 100) : 50);
      avgNorm.push(p90 > 0 ? Math.min(100, (avgVal / p90) * 100) : 50);
    } else {
      myNorm.push(p90 > 0 ? Math.min(100, Math.max(0, (1 - myVal / p90) * 100)) : 50);
      avgNorm.push(p90 > 0 ? Math.min(100, Math.max(0, (1 - avgVal / p90) * 100)) : 50);
    }
  });

  const getPoint = (index: number, value: number): [number, number] => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (value / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const gridLevels = [25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[280px]">
      {/* 그리드 */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={Array.from({ length: n }, (_, i) => getPoint(i, level).join(',')).join(' ')}
          fill="none"
          stroke="#374151"
          strokeWidth="0.5"
        />
      ))}

      {/* 축 */}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#374151" strokeWidth="0.5" />;
      })}

      {/* 업계 평균 폴리곤 */}
      <polygon
        points={avgNorm.map((v, i) => getPoint(i, v).join(',')).join(' ')}
        fill="rgba(107,114,128,0.15)"
        stroke="#6B7280"
        strokeWidth="1.5"
      />

      {/* 내 창고 폴리곤 */}
      <polygon
        points={myNorm.map((v, i) => getPoint(i, v).join(',')).join(' ')}
        fill="rgba(236,72,153,0.15)"
        stroke="#EC4899"
        strokeWidth="2"
      />

      {/* 내 점 */}
      {myNorm.map((v, i) => {
        const [x, y] = getPoint(i, v);
        return <circle key={i} cx={x} cy={y} r="3" fill="#EC4899" />;
      })}

      {/* 라벨 */}
      {labels.map((label, i) => {
        const [x, y] = getPoint(i, 120);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 text-[9px]"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ── 트렌드 차트 (SVG) ──

function TrendChart({ history }: { history: CompanyBenchmarkHistory[] }) {
  const sorted = [...history].sort((a, b) => a.period.localeCompare(b.period));
  const w = 600;
  const h = 120;
  const padding = 30;

  if (sorted.length < 2) return null;

  const scores = sorted.map((h) => h.overallScore);
  const minScore = Math.min(...scores) - 5;
  const maxScore = Math.max(...scores) + 5;

  const points = sorted.map((item, i) => {
    const x = padding + (i / (sorted.length - 1)) * (w - 2 * padding);
    const y = h - padding - ((item.overallScore - minScore) / (maxScore - minScore)) * (h - 2 * padding);
    return { x, y, period: item.period, score: item.overallScore };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* 라인 */}
      <path d={pathD} fill="none" stroke="#EC4899" strokeWidth="2" />
      {/* 점 + 라벨 */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#EC4899" />
          <text x={p.x} y={h - 5} textAnchor="middle" className="fill-gray-500 text-[10px]">
            {p.period.slice(5)}월
          </text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-gray-300 text-[10px]">
            {p.score.toFixed(0)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── 개선 권고 카드 ──

function RecommendationCard({ rec }: { rec: RecommendationItem }) {
  const priorityColors: Record<string, string> = {
    HIGH: 'border-red-800 bg-red-900/10',
    MEDIUM: 'border-yellow-800 bg-yellow-900/10',
    LOW: 'border-blue-800 bg-blue-900/10',
  };
  const priorityLabels: Record<string, { text: string; color: string }> = {
    HIGH: { text: '긴급', color: 'bg-red-900/30 text-red-400' },
    MEDIUM: { text: '보통', color: 'bg-yellow-900/30 text-yellow-400' },
    LOW: { text: '낮음', color: 'bg-blue-900/30 text-blue-400' },
  };

  return (
    <div className={`rounded-lg border p-4 ${priorityColors[rec.priority] ?? ''}`}>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityLabels[rec.priority]?.color}`}>
          {priorityLabels[rec.priority]?.text}
        </span>
        <span className="text-sm font-medium">{rec.kpiLabel}</span>
        <span className="text-xs text-gray-500">격차 {rec.gapPercent.toFixed(1)}%</span>
      </div>
      <p className="mt-2 text-sm text-gray-300">{rec.message}</p>
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
