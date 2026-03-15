/**
 * HanVoxel — 무역 인텔리전스 대시보드 (다크 테마 리디자인)
 *
 * HS 코드 검색 + 국가 선택 + 수출입 추이 AreaChart + 교역국 BarChart
 * KPI 카드 + 커버리지 상태 + 인기 코드 테이블
 * API 미연결 시 mock 데이터 fallback
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Search,
  Globe,
  TrendingUp,
  BarChart3,
  Star,
  Database,
  ArrowLeft,
} from 'lucide-react';
import { HsCodeSearch } from './HsCodeSearch';
import { CountrySelector } from './CountrySelector';
import type { TradeRecord, WatchItem, CoverageStats } from '../../api/trade-api';
import * as tradeApi from '../../api/trade-api';

// --- 디자인 토큰 ---
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  hoverRow: '#1C2128',
  gridLine: '#21262D',
  textMuted: '#8B949E',
  textDim: '#484F58',
  accent: '#58A6FF',
  teal: '#3FB950',
  export: '#58A6FF',
  import: '#F0883E',
  danger: '#F85149',
  purple: '#BC8CFF',
  yellow: '#D29922',
} as const;

// 국가별 차트 색상
const COUNTRY_CHART_COLORS: Record<string, string> = {
  KOR: '#3FB950',
  USA: '#58A6FF',
  CHN: '#F85149',
  DEU: '#D29922',
  JPN: '#BC8CFF',
  VNM: '#39D353',
  W00: '#8B949E',
};

// 국가 이름 매핑
const COUNTRY_NAMES: Record<string, string> = {
  W00: '전 세계', KOR: '한국', USA: '미국', CHN: '중국', JPN: '일본',
  DEU: '독일', VNM: '베트남', TWN: '대만', GBR: '영국', FRA: '프랑스',
  IND: '인도', AUS: '호주', THA: '태국', IDN: '인도네시아', MYS: '말레이시아',
  SGP: '싱가포르', NLD: '네덜란드', ITA: '이탈리아', CAN: '캐나다',
  MEX: '멕시코', BRA: '브라질', PHL: '필리핀',
};

// 국가 플래그
const COUNTRY_FLAGS: Record<string, string> = {
  W00: '\uD83C\uDF10', KOR: '\uD83C\uDDF0\uD83C\uDDF7', USA: '\uD83C\uDDFA\uD83C\uDDF8',
  CHN: '\uD83C\uDDE8\uD83C\uDDF3', JPN: '\uD83C\uDDEF\uD83C\uDDF5', DEU: '\uD83C\uDDE9\uD83C\uDDEA',
  VNM: '\uD83C\uDDFB\uD83C\uDDF3', TWN: '\uD83C\uDDF9\uD83C\uDDFC', GBR: '\uD83C\uDDEC\uD83C\uDDE7',
  FRA: '\uD83C\uDDEB\uD83C\uDDF7', IND: '\uD83C\uDDEE\uD83C\uDDF3', AUS: '\uD83C\uDDE6\uD83C\uDDFA',
  THA: '\uD83C\uDDF9\uD83C\uDDED', IDN: '\uD83C\uDDEE\uD83C\uDDE9', MYS: '\uD83C\uDDF2\uD83C\uDDFE',
  SGP: '\uD83C\uDDF8\uD83C\uDDEC', NLD: '\uD83C\uDDF3\uD83C\uDDF1', ITA: '\uD83C\uDDEE\uD83C\uDDF9',
  CAN: '\uD83C\uDDE8\uD83C\uDDE6', MEX: '\uD83C\uDDF2\uD83C\uDDFD', BRA: '\uD83C\uDDE7\uD83C\uDDF7',
  PHL: '\uD83C\uDDF5\uD83C\uDDED',
};

// --- 애니메이션 카운터 훅 ---
function useAnimatedNumber(target: number, duration = 800): number {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

// --- 애니메이션 숫자 표시 컴포넌트 ---
function AnimatedValue({
  value,
  format = 'number',
  suffix = '',
  className = '',
}: {
  value: number;
  format?: 'number' | 'currency' | 'percent';
  suffix?: string;
  className?: string;
}) {
  const animated = useAnimatedNumber(value);

  const formatted = useMemo(() => {
    if (format === 'percent') return `${animated.toFixed(1)}%`;
    if (format === 'currency') return formatUsd(animated);
    return Math.round(animated).toLocaleString();
  }, [animated, format]);

  return (
    <span className={className}>
      {formatted}
      {suffix}
    </span>
  );
}

// --- Mock 데이터 ---
const MOCK_RECORDS: TradeRecord[] = generateMockRecords();

function generateMockRecords(): TradeRecord[] {
  const records: TradeRecord[] = [];
  const countries = ['USA', 'CHN', 'DEU', 'JPN', 'VNM'];
  const baseValues: Record<string, number> = {
    USA: 5_200_000_000, CHN: 8_100_000_000, DEU: 2_300_000_000,
    JPN: 3_800_000_000, VNM: 1_500_000_000,
  };

  for (let m = 1; m <= 12; m++) {
    const month = String(m).padStart(2, '0');
    for (const country of countries) {
      const base = baseValues[country];
      // 약간의 변동 추가
      const variation = 1 + (Math.sin(m * 0.5 + countries.indexOf(country)) * 0.15);

      records.push({
        hsCode: '870323',
        reporterIso: 'KOR',
        partnerIso: country,
        period: `2025-${month}`,
        flowType: 'EXPORT',
        valueUsd: Math.round(base * variation * 0.08),
        weightKg: Math.round(base * variation * 0.001),
        source: 'UN_COMTRADE',
      });
      records.push({
        hsCode: '870323',
        reporterIso: 'KOR',
        partnerIso: country,
        period: `2025-${month}`,
        flowType: 'IMPORT',
        valueUsd: Math.round(base * variation * 0.04),
        weightKg: Math.round(base * variation * 0.0005),
        source: 'UN_COMTRADE',
      });
    }
  }

  // 전년도 비교용
  for (let m = 1; m <= 12; m++) {
    const month = String(m).padStart(2, '0');
    for (const country of countries) {
      const base = baseValues[country] * 0.9;
      const variation = 1 + (Math.sin(m * 0.5 + countries.indexOf(country)) * 0.12);
      records.push({
        hsCode: '870323',
        reporterIso: 'KOR',
        partnerIso: country,
        period: `2024-${month}`,
        flowType: 'EXPORT',
        valueUsd: Math.round(base * variation * 0.08),
        weightKg: null,
        source: 'UN_COMTRADE',
      });
    }
  }

  return records;
}

const MOCK_WATCH_LIST: WatchItem[] = [
  {
    id: 'w1', companyId: 'demo', hsCode: '870323',
    description: '가솔린 승용차 (1,500~3,000cc)',
    descriptionEn: 'Passenger vehicles, 1500-3000cc',
    isMain: true, createdAt: new Date().toISOString(),
  },
  {
    id: 'w2', companyId: 'demo', hsCode: '854232',
    description: '메모리 (집적회로)',
    descriptionEn: 'Electronic integrated circuits: memories',
    isMain: false, createdAt: new Date().toISOString(),
  },
];

const MOCK_COVERAGE: CoverageStats = {
  totalCodes: 148,
  popularCodes: 23,
  totalSearches: 1_247,
  avgCacheHitRate: 68.5,
  topCodes: [
    { hsCode: '870323', searchCount: 89, fetchCount: 12, isPopular: true },
    { hsCode: '854232', searchCount: 67, fetchCount: 8, isPopular: true },
    { hsCode: '850760', searchCount: 45, fetchCount: 6, isPopular: true },
  ],
};

// --- 유틸리티 ---
function formatUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

// --- 커스텀 Tooltip ---
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: '10px 14px',
      }}
    >
      <p style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, fontSize: 13, margin: '2px 0' }}>
          {entry.name}: {formatUsd(entry.value)}
        </p>
      ))}
    </div>
  );
}

// --- 교역국 순위 데이터 타입 ---
interface CountryRankItem {
  partnerIso: string;
  name: string;
  flag: string;
  totalValue: number;
  share: number;
  yoyChange: number | null;
}

// --- KPI 카드 ---
function KpiCard({
  icon: Icon,
  label,
  value,
  format = 'number',
  suffix = '',
  change,
  accentColor,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  format?: 'number' | 'currency' | 'percent';
  suffix?: string;
  change?: number | null;
  accentColor: string;
}) {
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderTop: `3px solid ${accentColor}`,
      }}
      className="rounded-lg p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon size={16} style={{ color: accentColor }} />
        <span style={{ color: COLORS.textMuted }} className="text-xs font-medium">
          {label}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <AnimatedValue
          value={value}
          format={format}
          suffix={suffix}
          className="text-2xl font-bold text-white"
        />
        {change !== undefined && change !== null && (
          <span
            className="mb-0.5 text-xs font-medium"
            style={{ color: change >= 0 ? '#3FB950' : '#F85149' }}
          >
            {change >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// --- 메인 대시보드 ---
interface TradeDashboardProps {
  onBack: () => void;
}

export function TradeDashboard({ onBack }: TradeDashboardProps) {
  const [selectedHsCode, setSelectedHsCode] = useState('870323');
  const [selectedDescription, setSelectedDescription] = useState('가솔린 승용차 (1,500~3,000cc)');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['KOR']);
  const [records, setRecords] = useState<TradeRecord[]>(MOCK_RECORDS);
  const [watchList, setWatchList] = useState<WatchItem[]>(MOCK_WATCH_LIST);
  const [coverage, setCoverage] = useState<CoverageStats>(MOCK_COVERAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMock, setUseMock] = useState(true);
  const [flowFilter, setFlowFilter] = useState<'EXPORT' | 'IMPORT'>('EXPORT');

  // 초기 로드 시 API 연결 시도
  useEffect(() => {
    (async () => {
      try {
        const stats = await tradeApi.getCoverageStats();
        setCoverage(stats);
        setUseMock(false);
      } catch {
        setUseMock(true);
      }
    })();
  }, []);

  // HS 코드 선택 -> 데이터 조회
  const handleSelectHsCode = useCallback(
    async (hsCode: string, description: string) => {
      setSelectedHsCode(hsCode);
      setSelectedDescription(description);
      setError(null);
      setLoading(true);

      if (useMock) {
        setTimeout(() => {
          setRecords(MOCK_RECORDS);
          setLoading(false);
        }, 500);
        return;
      }

      try {
        const data = await tradeApi.getTradeData({
          hsCode,
          reporterIsos: selectedCountries.filter((c) => c !== 'W00'),
          companyId: 'demo',
        });
        setRecords(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : '데이터 조회 실패');
        setRecords(MOCK_RECORDS);
      } finally {
        setLoading(false);
      }
    },
    [selectedCountries, useMock]
  );

  // HS 코드 검색 함수
  const searchFn = useCallback(async (query: string) => {
    try {
      return await tradeApi.searchHsCodes(query);
    } catch {
      return [
        { hsCode: '870321', description: '가솔린 승용차 (1,000cc 이하)', descriptionEn: 'Passenger vehicles, ≤1000cc', chapter: '87', heading: '8703' },
        { hsCode: '870322', description: '가솔린 승용차 (1,000~1,500cc)', descriptionEn: 'Passenger vehicles, 1000-1500cc', chapter: '87', heading: '8703' },
        { hsCode: '870323', description: '가솔린 승용차 (1,500~3,000cc)', descriptionEn: 'Passenger vehicles, 1500-3000cc', chapter: '87', heading: '8703' },
        { hsCode: '870324', description: '가솔린 승용차 (3,000cc 초과)', descriptionEn: 'Passenger vehicles, >3000cc', chapter: '87', heading: '8703' },
        { hsCode: '870340', description: '전기 구동 승용차', descriptionEn: 'Electric motor vehicles', chapter: '87', heading: '8703' },
      ].filter(
        (r) =>
          r.hsCode.includes(query) ||
          r.description.includes(query) ||
          r.descriptionEn.toLowerCase().includes(query.toLowerCase())
      );
    }
  }, []);

  // 즐겨찾기 추가
  const handleAddWatch = useCallback(
    async (hsCode: string, description: string, descriptionEn?: string) => {
      if (watchList.length >= 5) return;
      try {
        if (!useMock) {
          await tradeApi.addWatch('demo', hsCode, description, descriptionEn);
        }
        setWatchList((prev) => [
          ...prev,
          {
            id: `w-${Date.now()}`,
            companyId: 'demo',
            hsCode,
            description,
            descriptionEn: descriptionEn ?? null,
            isMain: prev.length === 0,
            createdAt: new Date().toISOString(),
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : '즐겨찾기 추가 실패');
      }
    },
    [watchList.length, useMock]
  );

  // 즐겨찾기 삭제
  const handleRemoveWatch = useCallback(
    async (hsCode: string) => {
      try {
        if (!useMock) {
          await tradeApi.removeWatch('demo', hsCode);
        }
        setWatchList((prev) => prev.filter((w) => w.hsCode !== hsCode));
      } catch (e) {
        setError(e instanceof Error ? e.message : '즐겨찾기 삭제 실패');
      }
    },
    [useMock]
  );

  // --- 차트 데이터: 월별 수출입 추이 (AreaChart용) ---
  const areaChartData = useMemo(() => {
    const filtered = records.filter((r) => r.period.startsWith('2025'));
    const byPeriod = new Map<string, { period: string; export: number; import: number }>();

    for (const r of filtered) {
      if (!byPeriod.has(r.period)) {
        byPeriod.set(r.period, { period: r.period, export: 0, import: 0 });
      }
      const entry = byPeriod.get(r.period)!;
      if (r.flowType === 'EXPORT') entry.export += r.valueUsd;
      else entry.import += r.valueUsd;
    }

    return Array.from(byPeriod.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );
  }, [records]);

  // --- 교역국 순위 데이터 (수평 BarChart용) ---
  const partnerRankings = useMemo<CountryRankItem[]>(() => {
    const filtered = records.filter(
      (r) => r.flowType === flowFilter && r.partnerIso !== 'W00'
    );

    const byCountry = new Map<string, { total: number; recent: number; older: number }>();
    for (const r of filtered) {
      if (!byCountry.has(r.partnerIso)) {
        byCountry.set(r.partnerIso, { total: 0, recent: 0, older: 0 });
      }
      const entry = byCountry.get(r.partnerIso)!;
      entry.total += r.valueUsd;
      const year = parseInt(r.period.slice(0, 4));
      const currentYear = new Date().getFullYear();
      if (year >= currentYear - 1) entry.recent += r.valueUsd;
      else entry.older += r.valueUsd;
    }

    const totalAll = Array.from(byCountry.values()).reduce(
      (sum, v) => sum + v.total, 0
    );

    return Array.from(byCountry.entries())
      .map(([iso, data]) => ({
        partnerIso: iso,
        name: `${COUNTRY_FLAGS[iso] ?? ''} ${COUNTRY_NAMES[iso] ?? iso}`,
        flag: COUNTRY_FLAGS[iso] ?? '',
        totalValue: data.total,
        share: totalAll > 0 ? (data.total / totalAll) * 100 : 0,
        yoyChange:
          data.older > 0
            ? ((data.recent - data.older) / data.older) * 100
            : null,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 8);
  }, [records, flowFilter]);

  // --- KPI 집계 ---
  const kpiData = useMemo(() => {
    const exportTotal = records
      .filter((r) => r.flowType === 'EXPORT' && r.period.startsWith('2025'))
      .reduce((s, r) => s + r.valueUsd, 0);
    const importTotal = records
      .filter((r) => r.flowType === 'IMPORT' && r.period.startsWith('2025'))
      .reduce((s, r) => s + r.valueUsd, 0);

    const exportPrev = records
      .filter((r) => r.flowType === 'EXPORT' && r.period.startsWith('2024'))
      .reduce((s, r) => s + r.valueUsd, 0);

    const exportChange = exportPrev > 0
      ? ((exportTotal - exportPrev) / exportPrev) * 100
      : null;

    const partnerCount = new Set(
      records.filter((r) => r.period.startsWith('2025')).map((r) => r.partnerIso)
    ).size;

    return { exportTotal, importTotal, exportChange, partnerCount };
  }, [records]);

  // --- 렌더 ---
  return (
    <div className="flex h-screen flex-col" style={{ background: COLORS.bg }}>
      {/* 헤더 */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-white/5"
            style={{ color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}
          >
            <ArrowLeft size={14} />
            뒤로
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Globe size={18} style={{ color: COLORS.accent }} />
              <h1 className="text-lg font-bold text-white">무역 인텔리전스</h1>
              {useMock && (
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: 'rgba(210, 153, 34, 0.15)', color: COLORS.yellow }}
                >
                  DEMO
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: COLORS.textDim }}>
              HS 코드 기반 글로벌 수출입 데이터 분석
            </p>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* 에러 표시 */}
          {error && (
            <div
              className="flex items-center justify-between rounded-lg px-4 py-3 text-sm"
              style={{
                background: 'rgba(248, 81, 73, 0.1)',
                border: `1px solid rgba(248, 81, 73, 0.3)`,
                color: '#F85149',
              }}
            >
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-4 text-sm opacity-60 hover:opacity-100"
              >
                닫기
              </button>
            </div>
          )}

          {/* HS 코드 검색 바 (대형) */}
          <div
            className="rounded-xl p-6"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div className="mb-1 flex items-center gap-2">
              <Search size={16} style={{ color: COLORS.accent }} />
              <span className="text-sm font-semibold text-white">HS 코드 검색</span>
            </div>
            <p className="mb-4 text-xs" style={{ color: COLORS.textDim }}>
              HS 코드 또는 품목명으로 검색하세요
            </p>
            <HsCodeSearch
              onSelect={handleSelectHsCode}
              watchList={watchList}
              onAddWatch={handleAddWatch}
              onRemoveWatch={handleRemoveWatch}
              searchFn={searchFn}
            />
          </div>

          {/* 선택된 코드 + 국가 선택 */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* 현재 선택 코드 카드 */}
            <div
              className="rounded-xl p-5 lg:col-span-3"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span
                    className="font-mono text-2xl font-bold"
                    style={{ color: COLORS.accent }}
                  >
                    {selectedHsCode}
                  </span>
                  <p className="mt-1 text-sm" style={{ color: COLORS.textMuted }}>
                    {selectedDescription}
                  </p>
                </div>
                <button
                  onClick={() => handleSelectHsCode(selectedHsCode, selectedDescription)}
                  disabled={loading}
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: '#238636' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      조회 중...
                    </span>
                  ) : (
                    '데이터 조회'
                  )}
                </button>
              </div>
            </div>

            {/* 국가 선택 카드 */}
            <div
              className="rounded-xl p-5 lg:col-span-2"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <CountrySelector
                selected={selectedCountries}
                onChange={setSelectedCountries}
              />
            </div>
          </div>

          {/* KPI 카드 4개 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              icon={TrendingUp}
              label="총 수출액"
              value={kpiData.exportTotal}
              format="currency"
              change={kpiData.exportChange}
              accentColor={COLORS.accent}
            />
            <KpiCard
              icon={BarChart3}
              label="총 수입액"
              value={kpiData.importTotal}
              format="currency"
              accentColor={COLORS.import}
            />
            <KpiCard
              icon={Globe}
              label="교역국 수"
              value={kpiData.partnerCount}
              suffix="개국"
              accentColor={COLORS.teal}
            />
            <KpiCard
              icon={Database}
              label="캐시 히트율"
              value={coverage.avgCacheHitRate}
              format="percent"
              accentColor={COLORS.purple}
            />
          </div>

          {/* 로딩 상태 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="mb-3 h-10 w-10 animate-spin rounded-full border-[3px] border-t-transparent"
                style={{ borderColor: `${COLORS.border}`, borderTopColor: COLORS.accent }}
              />
              <span className="text-sm" style={{ color: COLORS.textMuted }}>
                4개 API 동시 조회 중...
              </span>
            </div>
          )}

          {/* 차트 영역 */}
          {!loading && records.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-5">
              {/* 수출입 추이 AreaChart */}
              <div
                className="rounded-xl p-5 lg:col-span-3"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} style={{ color: COLORS.accent }} />
                    <h3 className="text-sm font-semibold text-white">월별 수출입 추이</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-4 rounded-sm" style={{ background: COLORS.export }} />
                      <span className="text-[11px]" style={{ color: COLORS.textMuted }}>수출</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-4 rounded-sm" style={{ background: COLORS.import }} />
                      <span className="text-[11px]" style={{ color: COLORS.textMuted }}>수입</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={areaChartData}>
                    <defs>
                      <linearGradient id="gradExport" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.export} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.export} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradImport" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.import} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.import} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={COLORS.gridLine}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(5)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                      tickFormatter={(v: number) => formatUsd(v)}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="export"
                      name="수출"
                      stroke={COLORS.export}
                      fill="url(#gradExport)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="import"
                      name="수입"
                      stroke={COLORS.import}
                      fill="url(#gradImport)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 교역국 점유율 수평 BarChart */}
              <div
                className="rounded-xl p-5 lg:col-span-2"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} style={{ color: COLORS.teal }} />
                    <h3 className="text-sm font-semibold text-white">교역국 점유율</h3>
                  </div>
                  {/* 수출/수입 토글 */}
                  <div
                    className="flex gap-0.5 rounded-lg p-0.5"
                    style={{ background: COLORS.bg }}
                  >
                    {(['EXPORT', 'IMPORT'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFlowFilter(f)}
                        className="rounded-md px-3 py-1 text-xs transition-colors"
                        style={{
                          background: flowFilter === f ? COLORS.accent : 'transparent',
                          color: flowFilter === f ? '#ffffff' : COLORS.textMuted,
                        }}
                      >
                        {f === 'EXPORT' ? '수출' : '수입'}
                      </button>
                    ))}
                  </div>
                </div>

                {partnerRankings.length === 0 ? (
                  <EmptyState message="교역국 데이터가 없습니다" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={partnerRankings}
                      layout="vertical"
                      margin={{ left: 0, right: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={COLORS.gridLine}
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: COLORS.textMuted, fontSize: 10 }}
                        tickFormatter={(v: number) => formatUsd(v)}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={110}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="totalValue"
                        name={flowFilter === 'EXPORT' ? '수출액' : '수입액'}
                        fill={flowFilter === 'EXPORT' ? COLORS.export : COLORS.import}
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {/* YoY 변동 목록 */}
                {partnerRankings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {partnerRankings.slice(0, 5).map((item) => (
                      <div
                        key={item.partnerIso}
                        className="flex items-center justify-between text-xs"
                      >
                        <span style={{ color: COLORS.textMuted }}>
                          {item.flag} {COUNTRY_NAMES[item.partnerIso] ?? item.partnerIso}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-white">{item.share.toFixed(1)}%</span>
                          {item.yoyChange !== null && (
                            <span
                              style={{
                                color: item.yoyChange >= 0 ? '#3FB950' : '#F85149',
                              }}
                            >
                              {item.yoyChange >= 0 ? '\u25B2' : '\u25BC'}
                              {Math.abs(item.yoyChange).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 빈 상태 (데이터 없을 때) */}
          {!loading && records.length === 0 && (
            <EmptyState
              message="HS 코드를 검색하고 데이터를 조회하세요"
              large
            />
          )}

          {/* 하단: 커버리지 상태 + 인기 코드 테이블 */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* 데이터 커버리지 상태 카드 */}
            <div
              className="rounded-xl p-5 lg:col-span-2"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Database size={16} style={{ color: COLORS.purple }} />
                <h3 className="text-sm font-semibold text-white">데이터 커버리지</h3>
              </div>
              <div className="space-y-4">
                {/* 보유 코드 */}
                <CoverageRow
                  label="보유 HS 코드"
                  value={coverage.totalCodes}
                  max={500}
                  color={COLORS.accent}
                />
                {/* 인기 코드 */}
                <CoverageRow
                  label="인기 코드 (10회+)"
                  value={coverage.popularCodes}
                  max={coverage.totalCodes || 1}
                  color={COLORS.teal}
                />
                {/* 캐시 히트율 */}
                <CoverageRow
                  label="캐시 히트율"
                  value={coverage.avgCacheHitRate}
                  max={100}
                  color={COLORS.purple}
                  suffix="%"
                />
                {/* 총 검색 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: COLORS.textMuted }}>
                    총 검색 수
                  </span>
                  <AnimatedValue
                    value={coverage.totalSearches}
                    className="text-sm font-semibold text-white"
                  />
                </div>
              </div>
            </div>

            {/* 인기 HS 코드 테이블 */}
            <div
              className="rounded-xl p-5 lg:col-span-3"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Star size={16} style={{ color: COLORS.yellow }} />
                <h3 className="text-sm font-semibold text-white">인기 HS 코드</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: COLORS.card }}>
                      <th
                        className="px-3 py-2.5 text-left font-medium"
                        style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}
                      >
                        HS 코드
                      </th>
                      <th
                        className="px-3 py-2.5 text-right font-medium"
                        style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}
                      >
                        검색 수
                      </th>
                      <th
                        className="px-3 py-2.5 text-right font-medium"
                        style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}
                      >
                        수집 수
                      </th>
                      <th
                        className="px-3 py-2.5 text-center font-medium"
                        style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}
                      >
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.topCodes.map((code, idx) => (
                      <tr
                        key={code.hsCode}
                        className="transition-colors"
                        style={{
                          background: idx % 2 === 1 ? 'rgba(22, 27, 34, 0.5)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = COLORS.hoverRow;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            idx % 2 === 1 ? 'rgba(22, 27, 34, 0.5)' : 'transparent';
                        }}
                      >
                        <td
                          className="px-3 py-2.5"
                          style={{ borderBottom: `1px solid ${COLORS.gridLine}` }}
                        >
                          <button
                            onClick={() => handleSelectHsCode(code.hsCode, '')}
                            className="font-mono transition-colors hover:underline"
                            style={{ color: COLORS.accent }}
                          >
                            {code.hsCode}
                          </button>
                        </td>
                        <td
                          className="px-3 py-2.5 text-right text-white"
                          style={{ borderBottom: `1px solid ${COLORS.gridLine}` }}
                        >
                          <AnimatedValue value={code.searchCount} />
                        </td>
                        <td
                          className="px-3 py-2.5 text-right text-white"
                          style={{ borderBottom: `1px solid ${COLORS.gridLine}` }}
                        >
                          <AnimatedValue value={code.fetchCount} />
                        </td>
                        <td
                          className="px-3 py-2.5 text-center"
                          style={{ borderBottom: `1px solid ${COLORS.gridLine}` }}
                        >
                          {code.isPopular ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                background: 'rgba(210, 153, 34, 0.15)',
                                color: COLORS.yellow,
                              }}
                            >
                              <Star size={10} fill={COLORS.yellow} />
                              인기
                            </span>
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
        </div>
      </div>
    </div>
  );
}

// --- 커버리지 진행 바 행 ---
function CoverageRow({
  label,
  value,
  max,
  color,
  suffix = '',
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs" style={{ color: COLORS.textMuted }}>
          {label}
        </span>
        <AnimatedValue
          value={value}
          className="text-xs font-semibold text-white"
          suffix={suffix}
        />
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: COLORS.gridLine }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// --- 빈 상태 컴포넌트 ---
function EmptyState({
  message,
  large = false,
}: {
  message: string;
  large?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${large ? 'py-16' : 'py-8'}`}
    >
      <Search
        size={large ? 48 : 32}
        style={{ color: COLORS.textDim }}
        className="mb-3"
      />
      <p
        className={large ? 'text-sm' : 'text-xs'}
        style={{ color: COLORS.textMuted }}
      >
        {message}
      </p>
    </div>
  );
}
