/**
 * HanVoxel — 국가 다중 선택 컴포넌트
 *
 * - 국가 다중 선택 (최대 5개)
 * - 기본값: 한국 + 전체
 * - 주요 국가 빠른 선택: 미국/중국/독일/일본/베트남
 */

import { useState } from 'react';

interface Country {
  iso3: string;
  flag: string;
  name: string;
  nameEn: string;
}

const QUICK_COUNTRIES: Country[] = [
  { iso3: 'KOR', flag: '\uD83C\uDDF0\uD83C\uDDF7', name: '한국', nameEn: 'Korea' },
  { iso3: 'USA', flag: '\uD83C\uDDFA\uD83C\uDDF8', name: '미국', nameEn: 'USA' },
  { iso3: 'CHN', flag: '\uD83C\uDDE8\uD83C\uDDF3', name: '중국', nameEn: 'China' },
  { iso3: 'DEU', flag: '\uD83C\uDDE9\uD83C\uDDEA', name: '독일', nameEn: 'Germany' },
  { iso3: 'JPN', flag: '\uD83C\uDDEF\uD83C\uDDF5', name: '일본', nameEn: 'Japan' },
  { iso3: 'VNM', flag: '\uD83C\uDDFB\uD83C\uDDF3', name: '베트남', nameEn: 'Vietnam' },
];

const ALL_COUNTRY: Country = {
  iso3: 'W00',
  flag: '\uD83C\uDF10',
  name: '전체',
  nameEn: 'World',
};

interface CountrySelectorProps {
  selected: string[];
  onChange: (countries: string[]) => void;
  maxSelect?: number;
}

export function CountrySelector({
  selected,
  onChange,
  maxSelect = 5,
}: CountrySelectorProps) {
  const [showMore, setShowMore] = useState(false);

  const toggleCountry = (iso3: string) => {
    if (selected.includes(iso3)) {
      // 최소 1개는 유지
      if (selected.length > 1) {
        onChange(selected.filter((c) => c !== iso3));
      }
    } else if (selected.length < maxSelect) {
      onChange([...selected, iso3]);
    }
  };

  const allCountries = [ALL_COUNTRY, ...QUICK_COUNTRIES];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400">
          비교 국가 (최대 {maxSelect}개)
        </label>
        <span className="text-xs text-gray-500">{selected.length}/{maxSelect}</span>
      </div>

      {/* 빠른 선택 버튼 */}
      <div className="flex flex-wrap gap-2">
        {allCountries.map((country) => {
          const isActive = selected.includes(country.iso3);
          return (
            <button
              key={country.iso3}
              onClick={() => toggleCountry(country.iso3)}
              disabled={!isActive && selected.length >= maxSelect}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-all ${
                isActive
                  ? 'border border-teal-500 bg-teal-900/40 text-teal-300'
                  : 'border border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40'
              }`}
            >
              <span>{country.flag}</span>
              <span>{country.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowMore(!showMore)}
          className="rounded-full border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300"
        >
          {showMore ? '접기' : '더보기...'}
        </button>
      </div>

      {/* 추가 국가 (확장 시) */}
      {showMore && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
          <div className="mb-2 text-xs text-gray-500">아시아·태평양</div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { iso3: 'TWN', name: '대만' },
              { iso3: 'THA', name: '태국' },
              { iso3: 'IDN', name: '인도네시아' },
              { iso3: 'IND', name: '인도' },
              { iso3: 'AUS', name: '호주' },
              { iso3: 'MYS', name: '말레이시아' },
              { iso3: 'SGP', name: '싱가포르' },
              { iso3: 'PHL', name: '필리핀' },
            ].map((c) => {
              const isActive = selected.includes(c.iso3);
              return (
                <button
                  key={c.iso3}
                  onClick={() => toggleCountry(c.iso3)}
                  disabled={!isActive && selected.length >= maxSelect}
                  className={`rounded px-2 py-1 text-xs ${
                    isActive
                      ? 'bg-teal-900/40 text-teal-300'
                      : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 disabled:opacity-40'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          <div className="mb-2 mt-3 text-xs text-gray-500">유럽·미주</div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { iso3: 'GBR', name: '영국' },
              { iso3: 'FRA', name: '프랑스' },
              { iso3: 'NLD', name: '네덜란드' },
              { iso3: 'ITA', name: '이탈리아' },
              { iso3: 'CAN', name: '캐나다' },
              { iso3: 'MEX', name: '멕시코' },
              { iso3: 'BRA', name: '브라질' },
            ].map((c) => {
              const isActive = selected.includes(c.iso3);
              return (
                <button
                  key={c.iso3}
                  onClick={() => toggleCountry(c.iso3)}
                  disabled={!isActive && selected.length >= maxSelect}
                  className={`rounded px-2 py-1 text-xs ${
                    isActive
                      ? 'bg-teal-900/40 text-teal-300'
                      : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 disabled:opacity-40'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
