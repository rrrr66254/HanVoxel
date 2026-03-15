/**
 * HanVoxel — 자동 발주 추천 대시보드
 *
 * 탭:
 *   1. 추천 목록 — 긴급도별 발주 추천 + 수락/무시 액션
 *   2. 수요 예측 — SKU별 수요 예측 차트
 *   3. 리드타임 — 공급업체별 리드타임 통계
 *
 * API 미연결 시 mock 데이터 fallback
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ReorderRecommendation, ReorderSummary } from '../../api/reorder-api';
import * as reorderApi from '../../api/reorder-api';

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

// --- 긴급도 배지 ---

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: 'bg-red-900/30 border-red-700/50', text: 'text-red-300', label: '긴급' },
  HIGH: { bg: 'bg-orange-900/30 border-orange-700/50', text: 'text-orange-300', label: '높음' },
  MEDIUM: { bg: 'bg-yellow-900/30 border-yellow-700/50', text: 'text-yellow-300', label: '보통' },
  LOW: { bg: 'bg-green-900/30 border-green-700/50', text: 'text-green-300', label: '낮음' },
};

interface ReorderDashboardProps {
  onBack: () => void;
}

type TabType = 'recommendations' | 'forecast' | 'leadtime';

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
    <div className="flex h-screen flex-col bg-gray-950">
      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            ← 뒤로
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">자동 발주 추천</h1>
            <p className="text-xs text-gray-500">
              ML 수요 예측 + 리드타임 학습 기반 자동 발주
              {useMock && (
                <span className="ml-2 rounded bg-yellow-900/30 px-1.5 py-0.5 text-yellow-400">
                  DEMO
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 요약 통계 */}
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{summary.urgentCount}</div>
            <div className="text-xs text-gray-500">긴급 대기</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{summary.pendingCount}</div>
            <div className="text-xs text-gray-500">전체 대기</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{summary.autoOrderedLast30d}</div>
            <div className="text-xs text-gray-500">자동발주(30일)</div>
          </div>
        </div>
      </header>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-800 px-6">
        {([
          ['recommendations', '발주 추천'],
          ['forecast', '수요 예측'],
          ['leadtime', '리드타임'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm transition-colors ${
              tab === key
                ? 'border-b-2 border-indigo-500 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
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
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'ALL' ? '전체' : URGENCY_STYLES[f]?.label ?? f}
            </button>
          ))}
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? '분석 중...' : '추천 새로고침'}
        </button>
      </div>

      {/* 추천 카드 목록 */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          발주 추천 항목이 없습니다
        </div>
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

  // 재고 잔량 바
  const maxQty = Math.max(rec.currentQty, rec.safetyStock, rec.reorderQty);
  const currentPct = (rec.currentQty / maxQty) * 100;
  const safetyPct = (rec.safetyStock / maxQty) * 100;

  return (
    <div className={`rounded-xl border p-4 ${urgStyle.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 헤더 */}
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${urgStyle.text}`}>
              {urgStyle.label}
            </span>
            <span className="font-mono text-sm font-bold text-white">{rec.sku}</span>
            <span className="text-sm text-gray-300">{rec.itemName}</span>
            {rec.status !== 'PENDING' && (
              <span className={`rounded px-2 py-0.5 text-xs ${
                rec.status === 'AUTO_ORDERED'
                  ? 'bg-blue-900/30 text-blue-300'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {rec.status === 'AUTO_ORDERED' ? '발주 완료' : '무시됨'}
              </span>
            )}
          </div>

          {/* 핵심 메시지 */}
          <p className="mt-2 text-sm text-gray-200">
            {rec.daysUntilOut !== null && rec.daysUntilOut <= 0
              ? '재고가 이미 소진되었습니다!'
              : `${rec.daysUntilOut ?? '?'}일 후 재고 소진 예정`}
            {rec.partnerName && rec.avgLeadDays && (
              <>, {rec.partnerName}에 지금 발주하면 {rec.avgLeadDays}일 후 입고</>
            )}
          </p>

          {/* 수량 정보 */}
          <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-gray-500">현재 재고</div>
              <div className="font-bold text-white">{rec.currentQty.toLocaleString()}개</div>
            </div>
            <div>
              <div className="text-gray-500">안전 재고</div>
              <div className="font-bold text-yellow-300">{rec.safetyStock.toLocaleString()}개</div>
            </div>
            <div>
              <div className="text-gray-500">추천 발주량</div>
              <div className="font-bold text-indigo-300">{rec.reorderQty.toLocaleString()}개</div>
            </div>
            <div>
              <div className="text-gray-500">소진 예정일</div>
              <div className="font-bold text-white">{rec.stockoutDate ?? '-'}</div>
            </div>
          </div>

          {/* 재고 바 */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-gray-700">
              <div
                className={`h-full rounded-full transition-all ${
                  currentPct < safetyPct ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(currentPct, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {Math.round(currentPct)}% / 안전선 {Math.round(safetyPct)}%
            </span>
          </div>

          {/* 예측 정보 */}
          {rec.forecastMeta && (
            <div className="mt-2 flex gap-3 text-xs text-gray-500">
              <span>모델: {rec.forecastMeta.model}</span>
              <span>일평균: {rec.forecastMeta.dailyAvg}개</span>
              {rec.forecastMeta.mape !== null && (
                <span>정확도: MAPE {rec.forecastMeta.mape}%</span>
              )}
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        {isPending && (
          <div className="ml-4 flex flex-col gap-2">
            <button
              onClick={() => onAccept(rec.id)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              발주 수락
            </button>
            <button
              onClick={() => onDismiss(rec.id)}
              className="rounded-lg border border-gray-600 px-4 py-2 text-xs text-gray-400 hover:text-white"
            >
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
  const mockDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const base = 15 + Math.sin(i * 0.3) * 5;
    return {
      date: d.toISOString().slice(5, 10),
      qty: Math.max(0, Math.round(base + (Math.random() - 0.5) * 4)),
    };
  });

  const maxQty = Math.max(...mockDays.map((d) => d.qty));
  const chartH = 120;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">SKU-2891 가솔린 엔진 밸브 — 30일 수요 예측</h3>
          <span className="rounded bg-indigo-900/30 px-2 py-1 text-xs text-indigo-300">LINEAR 모델 | MAPE 12.3%</span>
        </div>

        {/* SVG 바 차트 */}
        <svg viewBox={`0 0 600 ${chartH + 30}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          {mockDays.map((d, i) => {
            const barW = 600 / mockDays.length - 2;
            const barH = maxQty > 0 ? (d.qty / maxQty) * chartH : 0;
            const x = i * (600 / mockDays.length) + 1;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={chartH - barH}
                  width={barW}
                  height={barH}
                  fill="#6366f1"
                  opacity={0.7}
                  rx={1}
                />
                {i % 5 === 0 && (
                  <text
                    x={x + barW / 2}
                    y={chartH + 15}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#6b7280"
                  >
                    {d.date}
                  </text>
                )}
              </g>
            );
          })}
          {/* 평균선 */}
          <line
            x1={0}
            y1={chartH - (15 / maxQty) * chartH}
            x2={600}
            y2={chartH - (15 / maxQty) * chartH}
            stroke="#f59e0b"
            strokeDasharray="4"
            strokeWidth={1}
          />
        </svg>

        <div className="mt-3 grid grid-cols-4 gap-3 text-center text-xs">
          <div>
            <div className="text-gray-500">일평균 예측</div>
            <div className="font-bold text-indigo-300">15개</div>
          </div>
          <div>
            <div className="text-gray-500">30일 합계</div>
            <div className="font-bold text-white">450개</div>
          </div>
          <div>
            <div className="text-gray-500">현재 재고</div>
            <div className="font-bold text-red-300">45개</div>
          </div>
          <div>
            <div className="text-gray-500">소진 예상일</div>
            <div className="font-bold text-red-300">3일 후</div>
          </div>
        </div>
      </div>

      {/* 모델 비교 */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">예측 모델 비교</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
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
                <tr key={row.model} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-3 py-2 font-mono text-indigo-300">{row.model}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{row.d7}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{row.d14}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{row.d30}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{row.mape}%</td>
                  <td className="px-3 py-2 text-center">
                    {row.best ? (
                      <span className="text-yellow-400">★</span>
                    ) : (
                      <span className="text-gray-600">-</span>
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">공급업체 리드타임 통계</h3>
        <div className="space-y-3">
          {mockStats.map((s) => (
            <div key={s.partner} className="rounded-lg border border-gray-700 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">{s.partner}</span>
                  <span className="text-xs text-gray-500">{s.samples}건 학습</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-400">
                    {s.minDays}~{s.maxDays}일
                  </span>
                  <span className="font-bold text-indigo-300">평균 {s.avgDays}일</span>
                  <span className={s.trend < 0 ? 'text-green-400' : s.trend > 0 ? 'text-red-400' : 'text-gray-500'}>
                    {s.trend > 0 ? '▲' : s.trend < 0 ? '▼' : '—'}
                    {Math.abs(s.trend).toFixed(1)}일
                  </span>
                </div>
              </div>
              {/* 신뢰도 바 */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">신뢰도</span>
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-gray-700">
                  <div
                    className={`h-full rounded-full ${
                      s.reliability >= 80 ? 'bg-green-500' : s.reliability >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${s.reliability}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{s.reliability}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 리드타임 히스토리 */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">최근 발주-입고 이력</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="px-3 py-2 text-left">공급업체</th>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-right">발주일</th>
                <th className="px-3 py-2 text-right">입고일</th>
                <th className="px-3 py-2 text-right">소요일</th>
                <th className="px-3 py-2 text-right">수량</th>
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
                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-3 py-2 text-gray-300">{r.partner}</td>
                  <td className="px-3 py-2 font-mono text-indigo-300">{r.sku}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{r.ordered}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{r.received}</td>
                  <td className="px-3 py-2 text-right font-bold text-white">{r.days}일</td>
                  <td className="px-3 py-2 text-right text-gray-300">{r.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
