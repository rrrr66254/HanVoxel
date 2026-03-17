/**
 * HanVoxel — 통합 입출고 달력 (다크 테마)
 *
 * 월간 뷰: 날짜별 입고(파랑)/출고(주황) 건수 뱃지
 * 필터: 전체 / 입고만 / 출고만
 * 우측 사이드 패널: 선택 날짜 상세 목록
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Package,
  Truck,
  Filter,
} from 'lucide-react';
import type { CalendarEntry } from '../../api/inbound-api';

// --- 디자인 토큰 ---
const C = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  accent: '#58A6FF',
  inbound: '#3B82F6',
  outbound: '#F97316',
  completed: '#10B981',
  delayed: '#EF4444',
  arrived: '#F59E0B',
} as const;

// --- Mock 데이터 ---
function generateMockCalendar(year: number, month: number): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const statuses = ['SCHEDULED', 'ARRIVED', 'COMPLETED'];
  const vendors = ['현대모비스', '삼성SDI', 'LG화학', '포스코'];
  const customers = ['쿠팡', '네이버', '롯데물류', 'CJ대한통운'];
  const types = ['PICKING', 'PALLET', 'CONTAINER', 'DIRECT'];
  const slots = ['AM', 'PM', 'NIGHT'];

  for (let d = 1; d <= daysInMonth; d++) {
    const inCount = Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0;
    const outCount = Math.random() > 0.4 ? Math.floor(Math.random() * 4) + 1 : 0;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    for (let i = 0; i < inCount; i++) {
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      entries.push({
        id: `in-${d}-${i}`,
        siteId: 'demo',
        type: 'INBOUND',
        scheduledDate: dateStr,
        timeSlot: slots[Math.floor(Math.random() * slots.length)],
        status: st,
        colorCode: st === 'COMPLETED' ? C.completed : st === 'ARRIVED' ? C.arrived : C.inbound,
        inboundOrder: {
          id: `ibo-${d}-${i}`,
          vendorName: vendors[Math.floor(Math.random() * vendors.length)],
          status: st === 'COMPLETED' ? 'STOCKED' : st === 'ARRIVED' ? 'QC_PENDING' : 'ORDERED',
          expectedDate: dateStr,
        },
      });
    }
    for (let i = 0; i < outCount; i++) {
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      entries.push({
        id: `out-${d}-${i}`,
        siteId: 'demo',
        type: 'OUTBOUND',
        scheduledDate: dateStr,
        timeSlot: slots[Math.floor(Math.random() * slots.length)],
        status: st,
        colorCode: st === 'COMPLETED' ? C.completed : C.outbound,
        outboundOrder: {
          id: `obo-${d}-${i}`,
          type: types[Math.floor(Math.random() * types.length)],
          customerName: customers[Math.floor(Math.random() * customers.length)],
          status: st === 'COMPLETED' ? 'DISPATCHED' : 'PLANNED',
          manifestNumber: `OUT-${dateStr.replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
          timeSlot: slots[Math.floor(Math.random() * slots.length)],
        },
      });
    }
  }
  return entries;
}

// --- 유틸 ---
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

type FilterType = 'ALL' | 'INBOUND' | 'OUTBOUND';

interface InOutCalendarProps {
  onBack: () => void;
}

export function InOutCalendar({ onBack }: InOutCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [entries, setEntries] = useState<CalendarEntry[]>([]);

  // API 호출 (mock fallback)
  useEffect(() => {
    (async () => {
      try {
        const { getCalendarAll } = await import('../../api/outbound-api');
        const data = await getCalendarAll('demo', year, month, filter === 'ALL' ? undefined : filter);
        if (data.length > 0) { setEntries(data); return; }
      } catch { /* API 미연결 */ }
      setEntries(generateMockCalendar(year, month));
    })();
  }, [year, month, filter]);

  // 필터링된 엔트리
  const filtered = useMemo(() => {
    if (filter === 'ALL') return entries;
    return entries.filter((e) => e.type === filter);
  }, [entries, filter]);

  // 날짜별 그룹핑
  const grouped = useMemo(() => {
    const map: Record<string, { inbound: number; outbound: number; entries: CalendarEntry[] }> = {};
    for (const e of filtered) {
      const d = e.scheduledDate.slice(0, 10);
      if (!map[d]) map[d] = { inbound: 0, outbound: 0, entries: [] };
      if (e.type === 'INBOUND') map[d].inbound++;
      else map[d].outbound++;
      map[d].entries.push(e);
    }
    return map;
  }, [filtered]);

  // 선택 날짜의 엔트리
  const selectedEntries = useMemo(() => {
    if (!selectedDate) return [];
    return grouped[selectedDate]?.entries ?? [];
  }, [selectedDate, grouped]);

  // 월 이동
  const prevMonth = useCallback(() => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
    setSelectedDate(null);
  }, [year, month]);

  const nextMonth = useCallback(() => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  }, [year, month]);

  const goToday = useCallback(() => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDate(null);
  }, []);

  // 달력 그리드 생성
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // D-day 계산
  const getDDay = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-Day';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', background: C.bg }}>
      {/* 좌측: 달력 */}
      <div style={{ flex: 1, padding: '24px 28px', overflow: 'auto' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <Calendar size={22} style={{ color: C.accent }} />
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>입출고 달력</h2>
        </div>

        {/* 컨트롤 바 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={prevMonth} style={navBtn}><ChevronLeft size={18} /></button>
            <span style={{ color: C.text, fontSize: 16, fontWeight: 600, minWidth: 120, textAlign: 'center' }}>
              {year}년 {MONTH_NAMES[month - 1]}
            </span>
            <button onClick={nextMonth} style={navBtn}><ChevronRight size={18} /></button>
            <button onClick={goToday} style={{ ...navBtn, fontSize: 12, padding: '4px 10px' }}>오늘</button>
          </div>

          {/* 필터 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <Filter size={14} style={{ color: C.textMuted, marginRight: 4, marginTop: 6 }} />
            {(['ALL', 'INBOUND', 'OUTBOUND'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: `1px solid ${filter === f ? C.accent : C.border}`,
                  background: filter === f ? 'rgba(88,166,255,0.15)' : 'transparent',
                  color: filter === f ? C.accent : C.textMuted,
                  cursor: 'pointer',
                }}
              >
                {f === 'ALL' ? '전체' : f === 'INBOUND' ? '입고' : '출고'}
              </button>
            ))}
          </div>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          {[
            { color: C.inbound, label: '입고 예정' },
            { color: C.outbound, label: '출고 예정' },
            { color: C.arrived, label: '도착' },
            { color: C.completed, label: '완료' },
            { color: C.delayed, label: '지연' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
              <span style={{ fontSize: 11, color: C.textMuted }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
          {/* 요일 헤더 */}
          {DAY_NAMES.map((d, i) => (
            <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : C.textMuted, background: C.card }}>
              {d}
            </div>
          ))}

          {/* 날짜 셀 */}
          {Array.from({ length: totalCells }).map((_, idx) => {
            const dayNum = idx - firstDay + 1;
            const isValid = dayNum >= 1 && dayNum <= daysInMonth;
            const dateStr = isValid ? `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : '';
            const dayData = isValid ? grouped[dateStr] : undefined;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayOfWeek = idx % 7;

            return (
              <div
                key={idx}
                onClick={() => isValid && setSelectedDate(dateStr)}
                style={{
                  padding: '6px 8px',
                  minHeight: 72,
                  background: isSelected ? 'rgba(88,166,255,0.08)' : C.card,
                  cursor: isValid ? 'pointer' : 'default',
                  borderLeft: isSelected ? `2px solid ${C.accent}` : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {isValid && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 13,
                        fontWeight: isToday ? 700 : 400,
                        color: isToday ? C.accent : dayOfWeek === 0 ? '#EF4444' : dayOfWeek === 6 ? '#3B82F6' : C.text,
                        background: isToday ? 'rgba(88,166,255,0.2)' : 'transparent',
                        borderRadius: '50%',
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {dayNum}
                      </span>
                    </div>
                    {dayData && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {dayData.inbound > 0 && (
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(59,130,246,0.2)', color: C.inbound }}>
                            📥{dayData.inbound}
                          </span>
                        )}
                        {dayData.outbound > 0 && (
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(249,115,22,0.2)', color: C.outbound }}>
                            📤{dayData.outbound}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 우측: 사이드 패널 */}
      <div style={{
        width: 340,
        borderLeft: `1px solid ${C.border}`,
        background: C.card,
        padding: '24px 20px',
        overflow: 'auto',
      }}>
        <h3 style={{ color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 16, margin: 0 }}>
          {selectedDate ? `${selectedDate.slice(5).replace('-', '/')} 상세` : '날짜를 선택하세요'}
        </h3>

        {selectedDate && (
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
            {getDDay(selectedDate)} · {selectedEntries.length}건
          </div>
        )}

        {selectedEntries.length === 0 && selectedDate && (
          <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            해당 날짜에 예정된 입출고가 없습니다
          </div>
        )}

        {selectedEntries.map((entry) => (
          <div key={entry.id} style={{
            padding: '12px 14px',
            marginBottom: 8,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.bg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {entry.type === 'INBOUND' ? (
                <Package size={14} style={{ color: C.inbound }} />
              ) : (
                <Truck size={14} style={{ color: C.outbound }} />
              )}
              <span style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 4,
                background: entry.type === 'INBOUND' ? 'rgba(59,130,246,0.2)' : 'rgba(249,115,22,0.2)',
                color: entry.type === 'INBOUND' ? C.inbound : C.outbound,
                fontWeight: 600,
              }}>
                {entry.type === 'INBOUND' ? '입고' : '출고'}
              </span>
              <span style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 4,
                background: entry.colorCode ? `${entry.colorCode}22` : 'transparent',
                color: entry.colorCode ?? C.textMuted,
              }}>
                {entry.status}
              </span>
              {entry.timeSlot && (
                <span style={{ fontSize: 10, color: C.textMuted }}>{entry.timeSlot}</span>
              )}
            </div>

            {entry.inboundOrder && (
              <div style={{ fontSize: 12, color: C.text }}>
                <div>공급: <strong>{entry.inboundOrder.vendorName ?? '미지정'}</strong></div>
                <div style={{ color: C.textMuted, fontSize: 11 }}>상태: {entry.inboundOrder.status}</div>
              </div>
            )}

            {entry.outboundOrder && (
              <div style={{ fontSize: 12, color: C.text }}>
                <div>고객: <strong>{entry.outboundOrder.customerName ?? '미지정'}</strong></div>
                <div style={{ color: C.textMuted, fontSize: 11 }}>
                  {entry.outboundOrder.type} · {entry.outboundOrder.manifestNumber}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 스타일 ---
const navBtn: React.CSSProperties = {
  background: '#161B22',
  border: '1px solid #30363D',
  color: '#C9D1D9',
  cursor: 'pointer',
  borderRadius: 6,
  padding: '4px 8px',
  display: 'flex',
  alignItems: 'center',
};
