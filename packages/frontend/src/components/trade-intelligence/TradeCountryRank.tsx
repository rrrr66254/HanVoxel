/**
 * HanVoxel — 교역 국가 점유율 바 차트
 *
 * - 국가별 교역액 점유율 바
 * - YoY 증감률 표시
 */

import { useMemo } from 'react';
import type { TradeRecord } from '../../api/trade-api';

interface TradeCountryRankProps {
  records: TradeRecord[];
  flowType: 'EXPORT' | 'IMPORT';
}

interface CountryRankItem {
  partnerIso: string;
  totalValue: number;
  share: number;
  yoyChange: number | null;
}

// 국가 이름 매핑
const COUNTRY_NAMES: Record<string, string> = {
  W00: '전 세계', KOR: '한국', USA: '미국', CHN: '중국', JPN: '일본',
  DEU: '독일', VNM: '베트남', TWN: '대만', GBR: '영국', FRA: '프랑스',
  IND: '인도', AUS: '호주', THA: '태국', IDN: '인도네시아', MYS: '말레이시아',
  SGP: '싱가포르', NLD: '네덜란드', ITA: '이탈리아', CAN: '캐나다',
  MEX: '멕시코', BRA: '브라질', PHL: '필리핀',
};

export function TradeCountryRank({ records, flowType }: TradeCountryRankProps) {
  const rankings = useMemo<CountryRankItem[]>(() => {
    const filtered = records.filter(
      (r) => r.flowType === flowType && r.partnerIso !== 'W00'
    );

    // 국가별 합산
    const byCountry = new Map<string, { total: number; recent: number; older: number }>();
    for (const r of filtered) {
      if (!byCountry.has(r.partnerIso)) {
        byCountry.set(r.partnerIso, { total: 0, recent: 0, older: 0 });
      }
      const entry = byCountry.get(r.partnerIso)!;
      entry.total += r.valueUsd;

      // YoY 비교를 위한 연도 분리
      const year = parseInt(r.period.slice(0, 4));
      const currentYear = new Date().getFullYear();
      if (year >= currentYear - 1) {
        entry.recent += r.valueUsd;
      } else {
        entry.older += r.valueUsd;
      }
    }

    const totalAll = Array.from(byCountry.values()).reduce(
      (sum, v) => sum + v.total,
      0
    );

    return Array.from(byCountry.entries())
      .map(([iso, data]) => ({
        partnerIso: iso,
        totalValue: data.total,
        share: totalAll > 0 ? (data.total / totalAll) * 100 : 0,
        yoyChange:
          data.older > 0
            ? ((data.recent - data.older) / data.older) * 100
            : null,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  }, [records, flowType]);

  const formatValue = (v: number) => {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  const maxShare = rankings.length > 0 ? rankings[0].share : 100;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        {flowType === 'EXPORT' ? '수출' : '수입'} 상위 교역국
      </h3>

      {rankings.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          데이터가 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {rankings.map((item, idx) => (
            <div key={item.partnerIso} className="group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-4 text-right text-gray-500">{idx + 1}</span>
                  <span className="font-medium text-gray-200">
                    {COUNTRY_NAMES[item.partnerIso] ?? item.partnerIso}
                  </span>
                  <span className="text-gray-500">({item.partnerIso})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-300">{formatValue(item.totalValue)}</span>
                  <span className="w-12 text-right text-gray-400">
                    {item.share.toFixed(1)}%
                  </span>
                  {item.yoyChange !== null && (
                    <span
                      className={`w-14 text-right text-xs ${
                        item.yoyChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {item.yoyChange >= 0 ? '\u25B2' : '\u25BC'}
                      {Math.abs(item.yoyChange).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              {/* 점유율 바 */}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${(item.share / maxShare) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
