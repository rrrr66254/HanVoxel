/**
 * HanVoxel — 무역 인텔리전스 대시보드 (메인)
 *
 * HsCodeSearch + CountrySelector + TradeChart + TradeCountryRank 통합
 * API 미연결 시 mock 데이터 fallback
 * 로딩/에러 상태 처리
 */

import { useState, useCallback, useEffect } from 'react';
import { HsCodeSearch } from './HsCodeSearch';
import { CountrySelector } from './CountrySelector';
import { TradeChart } from './TradeChart';
import { TradeCountryRank } from './TradeCountryRank';
import type { TradeRecord, WatchItem, CoverageStats } from '../../api/trade-api';
import * as tradeApi from '../../api/trade-api';

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

  // HS 코드 선택 → 데이터 조회
  const handleSelectHsCode = useCallback(
    async (hsCode: string, description: string) => {
      setSelectedHsCode(hsCode);
      setSelectedDescription(description);
      setError(null);
      setLoading(true);

      if (useMock) {
        // mock 데이터 사용
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
      // mock fallback
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
            <h1 className="text-lg font-bold text-white">무역 인텔리전스</h1>
            <p className="text-xs text-gray-500">
              HS 코드 기반 글로벌 수출입 데이터 분석
              {useMock && (
                <span className="ml-2 rounded bg-yellow-900/30 px-1.5 py-0.5 text-yellow-400">
                  DEMO
                </span>
              )}
            </p>
          </div>
        </div>
        {/* 커버리지 요약 */}
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-teal-400">{coverage.totalCodes}</div>
            <div className="text-xs text-gray-500">보유 코드</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{coverage.totalSearches.toLocaleString()}</div>
            <div className="text-xs text-gray-500">총 검색</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{coverage.avgCacheHitRate}%</div>
            <div className="text-xs text-gray-500">캐시 히트</div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* 에러 표시 */}
          {error && (
            <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-2 text-sm text-red-300">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-400 hover:text-red-200"
              >
                x
              </button>
            </div>
          )}

          {/* 검색 + 국가 선택 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-gray-300">HS 코드 검색</h2>
              <HsCodeSearch
                onSelect={handleSelectHsCode}
                watchList={watchList}
                onAddWatch={handleAddWatch}
                onRemoveWatch={handleRemoveWatch}
                searchFn={searchFn}
              />
            </div>
            <div className="space-y-3">
              <CountrySelector
                selected={selectedCountries}
                onChange={setSelectedCountries}
              />
            </div>
          </div>

          {/* 선택된 코드 + 조회 버튼 */}
          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/30 px-4 py-3">
            <div>
              <span className="font-mono text-lg text-teal-400">{selectedHsCode}</span>
              <span className="ml-3 text-sm text-gray-300">{selectedDescription}</span>
            </div>
            <button
              onClick={() => handleSelectHsCode(selectedHsCode, selectedDescription)}
              disabled={loading}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-50"
            >
              {loading ? '조회 중...' : '데이터 조회'}
            </button>
          </div>

          {/* 로딩 */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
              <span className="ml-3 text-sm text-gray-400">4개 API 동시 조회 중...</span>
            </div>
          )}

          {/* 차트 영역 */}
          {!loading && (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* 월별 추이 */}
              <TradeChart
                records={records}
                selectedCountries={['KOR']}
              />

              {/* 수출 국가 순위 */}
              <TradeCountryRank records={records} flowType="EXPORT" />
            </div>
          )}

          {/* 수입 국가 순위 */}
          {!loading && (
            <TradeCountryRank records={records} flowType="IMPORT" />
          )}

          {/* 인기 코드 */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">인기 HS 코드 (검색 상위)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="px-3 py-2 text-left">HS 코드</th>
                    <th className="px-3 py-2 text-right">검색 수</th>
                    <th className="px-3 py-2 text-right">수집 수</th>
                    <th className="px-3 py-2 text-center">인기</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.topCodes.map((code) => (
                    <tr
                      key={code.hsCode}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30"
                    >
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleSelectHsCode(code.hsCode, '')}
                          className="font-mono text-teal-400 hover:text-teal-300"
                        >
                          {code.hsCode}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {code.searchCount}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {code.fetchCount}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {code.isPopular ? (
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
      </div>
    </div>
  );
}
