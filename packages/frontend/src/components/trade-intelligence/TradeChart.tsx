/**
 * HanVoxel — 월별 수출입 추이 차트
 *
 * - recharts 기반 라인 차트
 * - 선택 국가별 오버레이 라인
 * - 수출/수입 토글
 */

import { useState, useMemo } from 'react';
import type { TradeRecord } from '../../api/trade-api';

// 국가별 색상
const COUNTRY_COLORS: Record<string, string> = {
  KOR: '#14b8a6',
  USA: '#3b82f6',
  CHN: '#ef4444',
  DEU: '#f59e0b',
  JPN: '#8b5cf6',
  VNM: '#22c55e',
  W00: '#6b7280',
};

interface TradeChartProps {
  records: TradeRecord[];
  selectedCountries: string[];
}

export function TradeChart({ records, selectedCountries }: TradeChartProps) {
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'EXPORT' | 'IMPORT'>('ALL');

  // 데이터 가공: 기간별·국가별 합계
  const chartData = useMemo(() => {
    const filtered = records.filter(
      (r) =>
        (flowFilter === 'ALL' || r.flowType === flowFilter) &&
        selectedCountries.includes(r.reporterIso)
    );

    // period별 그룹핑
    const byPeriod = new Map<string, Record<string, number>>();
    for (const r of filtered) {
      if (!byPeriod.has(r.period)) {
        byPeriod.set(r.period, {});
      }
      const entry = byPeriod.get(r.period)!;
      const key = `${r.reporterIso}_${r.flowType}`;
      entry[key] = (entry[key] ?? 0) + r.valueUsd;
    }

    return Array.from(byPeriod.entries())
      .map(([period, values]) => ({ period, ...values }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [records, selectedCountries, flowFilter]);

  // Y축 최대값
  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of chartData) {
      for (const [key, val] of Object.entries(row)) {
        if (key !== 'period' && typeof val === 'number' && val > max) {
          max = val;
        }
      }
    }
    return max;
  }, [chartData]);

  const formatValue = (v: number) => {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
      {/* 헤더 + 토글 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">월별 수출입 추이</h3>
        <div className="flex gap-1 rounded-lg bg-gray-900 p-0.5">
          {(['ALL', 'EXPORT', 'IMPORT'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFlowFilter(f)}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${
                flowFilter === f
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'ALL' ? '전체' : f === 'EXPORT' ? '수출' : '수입'}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 영역 (SVG 기반) */}
      {chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">
          데이터를 조회해주세요
        </div>
      ) : (
        <div className="relative">
          {/* Y축 라벨 */}
          <div className="absolute left-0 top-0 flex h-48 flex-col justify-between text-right">
            <span className="text-xs text-gray-500">{formatValue(maxValue)}</span>
            <span className="text-xs text-gray-500">{formatValue(maxValue / 2)}</span>
            <span className="text-xs text-gray-500">$0</span>
          </div>

          {/* 바 차트 */}
          <div className="ml-16 flex h-48 items-end gap-1 overflow-x-auto">
            {chartData.map((row) => {
              const period = row.period as string;
              return (
                <div key={period} className="flex min-w-[30px] flex-1 flex-col items-center gap-0.5">
                  {/* 바 */}
                  {selectedCountries.map((country) => {
                    const flows = flowFilter === 'ALL' ? ['EXPORT', 'IMPORT'] : [flowFilter];
                    return flows.map((flow) => {
                      const key = `${country}_${flow}`;
                      const val = (row as Record<string, unknown>)[key];
                      const value = typeof val === 'number' ? val : 0;
                      const height = maxValue > 0 ? (value / maxValue) * 160 : 0;
                      const color = COUNTRY_COLORS[country] ?? '#6b7280';
                      return (
                        <div
                          key={key}
                          style={{
                            height: `${Math.max(height, 1)}px`,
                            backgroundColor: color,
                            opacity: flow === 'IMPORT' ? 0.6 : 1,
                          }}
                          className="w-full min-w-[4px] rounded-t"
                          title={`${country} ${flow}: ${formatValue(value)} (${period})`}
                        />
                      );
                    });
                  })}
                  {/* X축 라벨 */}
                  <span className="mt-1 text-[9px] text-gray-500 [writing-mode:vertical-lr]">
                    {period.slice(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="mt-3 flex flex-wrap gap-3">
            {selectedCountries.map((country) => (
              <div key={country} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COUNTRY_COLORS[country] ?? '#6b7280' }}
                />
                <span className="text-xs text-gray-400">{country}</span>
              </div>
            ))}
            {flowFilter === 'ALL' && (
              <>
                <span className="text-xs text-gray-600">|</span>
                <span className="text-xs text-gray-500">진한=수출 / 연한=수입</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
