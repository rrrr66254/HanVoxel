/**
 * HanVoxel — HS 코드 검색 + 즐겨찾기 컴포넌트
 *
 * - 입력창 + 자동완성 드롭다운
 * - 즐겨찾기 추가 버튼 (최대 5개)
 * - 등록된 즐겨찾기 태그 표시
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { HsCodeResult, WatchItem } from '../../api/trade-api';

interface HsCodeSearchProps {
  onSelect: (hsCode: string, description: string) => void;
  watchList: WatchItem[];
  onAddWatch: (hsCode: string, description: string, descriptionEn?: string) => void;
  onRemoveWatch: (hsCode: string) => void;
  searchFn: (query: string) => Promise<HsCodeResult[]>;
}

export function HsCodeSearch({
  onSelect,
  watchList,
  onAddWatch,
  onRemoveWatch,
  searchFn,
}: HsCodeSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HsCodeResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // 디바운스 검색
  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      try {
        const data = await searchFn(q);
        setResults(data);
        setIsOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [searchFn]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isWatched = (hsCode: string) => watchList.some((w) => w.hsCode === hsCode);
  const canAddMore = watchList.length < 5;

  return (
    <div className="space-y-3">
      {/* 검색 입력 */}
      <div ref={containerRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="HS 코드 또는 품목명 검색 (예: 8703, 승용차)"
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none"
        />
        {loading && (
          <div className="absolute right-3 top-3 h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        )}

        {/* 자동완성 드롭다운 */}
        {isOpen && (
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-600 bg-gray-800 shadow-xl">
            {results.map((r) => (
              <div
                key={r.hsCode}
                className="flex items-center justify-between border-b border-gray-700 px-4 py-3 last:border-0 hover:bg-gray-700"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(r.hsCode, r.description);
                    setQuery(r.hsCode);
                    setIsOpen(false);
                  }}
                  className="flex-1 text-left"
                >
                  <span className="font-mono text-teal-400">{r.hsCode}</span>
                  <span className="ml-2 text-sm text-gray-300">{r.description}</span>
                  <span className="ml-1 text-xs text-gray-500">({r.descriptionEn})</span>
                </button>
                {/* 즐겨찾기 버튼 */}
                {isWatched(r.hsCode) ? (
                  <button
                    onClick={() => onRemoveWatch(r.hsCode)}
                    className="ml-2 text-yellow-400 hover:text-yellow-300"
                    title="즐겨찾기 해제"
                  >
                    ★
                  </button>
                ) : canAddMore ? (
                  <button
                    onClick={() => onAddWatch(r.hsCode, r.description, r.descriptionEn)}
                    className="ml-2 text-gray-500 hover:text-yellow-400"
                    title="즐겨찾기 추가"
                  >
                    ☆
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 즐겨찾기 태그 */}
      {watchList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {watchList.map((w) => (
            <button
              key={w.hsCode}
              onClick={() => onSelect(w.hsCode, w.description)}
              className="flex items-center gap-1.5 rounded-full border border-yellow-700/50 bg-yellow-900/20 px-3 py-1 text-xs text-yellow-300 transition-colors hover:bg-yellow-900/40"
            >
              <span>★</span>
              <span className="font-mono">{w.hsCode}</span>
              <span className="max-w-[100px] truncate text-yellow-200/70">{w.description}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveWatch(w.hsCode);
                }}
                className="ml-1 text-yellow-500 hover:text-red-400"
              >
                x
              </span>
            </button>
          ))}
          <span className="self-center text-xs text-gray-500">
            {watchList.length}/5
          </span>
        </div>
      )}
    </div>
  );
}
