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
  X,
  User,
  Phone,
  MapPin,
  Clock,
  Hash,
} from 'lucide-react';
import type { CalendarEntry } from '../../api/inbound-api';
import { MOCK_SITE_ID } from '../../constants/mock-ids';

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

// --- 시드 기반 난수 생성기 (동일 월에 동일 데이터 보장) ---
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// --- Mock 데이터 ---
function generateMockCalendar(year: number, month: number): CalendarEntry[] {
  const rng = seededRandom(year * 100 + month);
  const entries: CalendarEntry[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const statuses = ['SCHEDULED', 'ARRIVED', 'COMPLETED'];
  const vendors = ['현대모비스', '삼성SDI', 'LG화학', '포스코'];
  const customers = ['쿠팡', '네이버', '롯데물류', 'CJ대한통운'];
  const types = ['PICKING', 'PALLET', 'CONTAINER', 'DIRECT'];
  const slots = ['AM', 'PM', 'NIGHT'];

  for (let d = 1; d <= daysInMonth; d++) {
    const inCount = rng() > 0.5 ? Math.floor(rng() * 3) + 1 : 0;
    const outCount = rng() > 0.4 ? Math.floor(rng() * 4) + 1 : 0;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    for (let i = 0; i < inCount; i++) {
      const st = statuses[Math.floor(rng() * statuses.length)];
      entries.push({
        id: `in-${d}-${i}`,
        siteId: MOCK_SITE_ID,
        type: 'INBOUND',
        scheduledDate: dateStr,
        timeSlot: slots[Math.floor(rng() * slots.length)],
        status: st,
        colorCode: st === 'COMPLETED' ? C.completed : st === 'ARRIVED' ? C.arrived : C.inbound,
        inboundOrder: {
          id: `ibo-${d}-${i}`,
          vendorName: vendors[Math.floor(rng() * vendors.length)],
          status: st === 'COMPLETED' ? 'STOCKED' : st === 'ARRIVED' ? 'QC_PENDING' : 'ORDERED',
          expectedDate: dateStr,
        },
      });
    }
    for (let i = 0; i < outCount; i++) {
      const st = statuses[Math.floor(rng() * statuses.length)];
      entries.push({
        id: `out-${d}-${i}`,
        siteId: MOCK_SITE_ID,
        type: 'OUTBOUND',
        scheduledDate: dateStr,
        timeSlot: slots[Math.floor(rng() * slots.length)],
        status: st,
        colorCode: st === 'COMPLETED' ? C.completed : C.outbound,
        outboundOrder: {
          id: `obo-${d}-${i}`,
          type: types[Math.floor(rng() * types.length)],
          customerName: customers[Math.floor(rng() * customers.length)],
          status: st === 'COMPLETED' ? 'DISPATCHED' : 'PLANNED',
          manifestNumber: `OUT-${dateStr.replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
          timeSlot: slots[Math.floor(rng() * slots.length)],
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
  const [detailEntry, setDetailEntry] = useState<CalendarEntry | null>(null);

  // API 호출 (mock fallback)
  useEffect(() => {
    (async () => {
      try {
        const { getCalendarAll } = await import('../../api/outbound-api');
        const data = await getCalendarAll(MOCK_SITE_ID, year, month, filter === 'ALL' ? undefined : filter);
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
          <div
            key={entry.id}
            onClick={() => setDetailEntry(entry)}
            style={{
              padding: '12px 14px',
              marginBottom: 8,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bg,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
          >
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

      {/* 상세 모달 */}
      {detailEntry && (
        <CalendarDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
      )}
    </div>
  );
}

// --- 달력 카드 상세 모달 ---
function CalendarDetailModal({ entry, onClose }: { entry: CalendarEntry; onClose: () => void }) {
  const isInbound = entry.type === 'INBOUND';
  const accentColor = isInbound ? C.inbound : C.outbound;

  // Mock 추가 정보 (실제 API 연동 시 대체)
  const driverInfo = { name: '김기사', phone: '010-1234-5678', vehicleNo: '서울12가3456' };
  const palletInfo = { qty: isInbound ? 12 : 8, spec: 'T11 (1100×1100)', containerSpec: isInbound ? null : '40ft HC' };

  // 상태 타임라인
  const timeline = isInbound
    ? [
        { label: '주문 접수', done: true },
        { label: '배송 중', done: entry.status !== 'SCHEDULED' },
        { label: '도착', done: ['ARRIVED', 'COMPLETED'].includes(entry.status) },
        { label: 'QC 검수', done: entry.status === 'COMPLETED' },
        { label: '입고 완료', done: entry.status === 'COMPLETED' },
      ]
    : [
        { label: '출고 계획', done: true },
        { label: '피킹 중', done: entry.status !== 'SCHEDULED' },
        { label: '포장 완료', done: ['ARRIVED', 'COMPLETED'].includes(entry.status) },
        { label: '출하', done: entry.status === 'COMPLETED' },
      ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520, maxHeight: '80vh', overflow: 'auto',
          background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
          padding: 0,
        }}
      >
        {/* 헤더 */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isInbound ? <Package size={18} style={{ color: accentColor }} /> : <Truck size={18} style={{ color: accentColor }} />}
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
              {isInbound ? '입고 상세' : '출고 상세'}
            </span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: `${accentColor}22`, color: accentColor, fontWeight: 600,
            }}>
              {entry.status}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* 기본 정보 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <InfoRow icon={<Calendar size={14} />} label="예정일" value={entry.scheduledDate} />
            <InfoRow icon={<Clock size={14} />} label="타임슬롯" value={entry.timeSlot ?? '-'} />
            {isInbound && entry.inboundOrder && (
              <>
                <InfoRow icon={<User size={14} />} label="공급업체" value={entry.inboundOrder.vendorName ?? '미지정'} />
                <InfoRow icon={<Hash size={14} />} label="주문 ID" value={entry.inboundOrder.id.slice(0, 8)} />
              </>
            )}
            {!isInbound && entry.outboundOrder && (
              <>
                <InfoRow icon={<User size={14} />} label="고객" value={entry.outboundOrder.customerName ?? '미지정'} />
                <InfoRow icon={<Hash size={14} />} label="명세표" value={entry.outboundOrder.manifestNumber ?? '-'} />
                <InfoRow icon={<MapPin size={14} />} label="출고유형" value={entry.outboundOrder.type} />
              </>
            )}
          </div>

          {/* 배송 기사 정보 */}
          <SectionTitle title="배송 기사" />
          <div style={{
            padding: '12px 14px', borderRadius: 8, background: C.bg,
            border: `1px solid ${C.border}`, marginBottom: 16,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <InfoRow icon={<User size={14} />} label="기사명" value={driverInfo.name} />
              <InfoRow icon={<Phone size={14} />} label="연락처" value={driverInfo.phone} />
              <InfoRow icon={<Truck size={14} />} label="차량번호" value={driverInfo.vehicleNo} />
            </div>
          </div>

          {/* 팔레트/컨테이너 정보 */}
          <SectionTitle title="팔레트 / 컨테이너" />
          <div style={{
            padding: '12px 14px', borderRadius: 8, background: C.bg,
            border: `1px solid ${C.border}`, marginBottom: 16,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          }}>
            <InfoRow icon={<Package size={14} />} label="팔레트 수량" value={`${palletInfo.qty}개`} />
            <InfoRow icon={<Hash size={14} />} label="팔레트 규격" value={palletInfo.spec} />
            {palletInfo.containerSpec && (
              <InfoRow icon={<Truck size={14} />} label="컨테이너" value={palletInfo.containerSpec} />
            )}
          </div>

          {/* 상태 타임라인 */}
          <SectionTitle title="진행 상태" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16, padding: '8px 0' }}>
            {timeline.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: i < timeline.length - 1 ? 1 : undefined }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: step.done ? accentColor : C.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: step.done ? '#fff' : C.textMuted, fontWeight: 700,
                  }}>
                    {step.done ? '✓' : (i + 1)}
                  </div>
                  <span style={{ fontSize: 10, color: step.done ? C.text : C.textMuted, whiteSpace: 'nowrap' }}>
                    {step.label}
                  </span>
                </div>
                {i < timeline.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, marginBottom: 18,
                    background: step.done ? accentColor : C.border, marginLeft: 4, marginRight: 4,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 정보 행 컴포넌트
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: C.textMuted, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 11, color: C.textMuted, minWidth: 50 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// 섹션 타이틀
function SectionTitle({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8, letterSpacing: '0.3px' }}>
      {title}
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
