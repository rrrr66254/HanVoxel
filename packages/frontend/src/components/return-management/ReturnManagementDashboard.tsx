/**
 * HanVoxel — 반품/불량 관리 대시보드 (다크 테마)
 *
 * 기능:
 *   - 반품 목록 (상태/유형별 필터 + 상세 모달)
 *   - 반품 접수 폼 (고객반품/공급업체클레임)
 *   - 반품 분석 (KPI + 월별 추이 + 사유 파이차트 + 거래처별 반품률)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ─── 타입 정의 ───

/** 반품 상태 */
type ReturnStatus = 'RECEIVED' | 'INSPECTING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

/** 반품 유형 */
type ReturnType = 'CUSTOMER_RETURN' | 'SUPPLIER_CLAIM';

/** 반품 사유 */
type ReturnReason = 'DEFECT' | 'WRONG_ITEM' | 'DAMAGE' | 'OVER_DELIVERY' | 'OTHER';

/** 반품 품목 */
interface ReturnLineItem {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  unitPrice: number;
  description: string;
}

/** 반품 레코드 */
interface ReturnRecord {
  id: string;
  returnNo: string;
  type: ReturnType;
  partnerId: string;
  partnerName: string;
  reason: ReturnReason;
  reasonDetail: string;
  items: ReturnLineItem[];
  status: ReturnStatus;
  totalQty: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

/** 거래처 */
interface Partner {
  id: string;
  name: string;
  type: 'CUSTOMER' | 'SUPPLIER';
}

/** 월별 추이 데이터 */
interface MonthlyTrend {
  month: string;
  count: number;
  amount: number;
}

/** 컴포넌트 Props */
interface ReturnManagementDashboardProps {
  onBack: () => void;
}

// ─── 디자인 토큰 ───

const C = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  blue: '#58A6FF',
  green: '#3FB950',
  orange: '#D29922',
  red: '#F85149',
  purple: '#8B5CF6',
} as const;

// ─── 상수 맵 ───

const STATUS_MAP: Record<ReturnStatus, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: C.blue },
  INSPECTING: { label: '검수중', color: C.orange },
  PROCESSING: { label: '처리중', color: C.purple },
  COMPLETED: { label: '완료', color: C.green },
  REJECTED: { label: '반려', color: C.red },
};

const TYPE_MAP: Record<ReturnType, { label: string; color: string }> = {
  CUSTOMER_RETURN: { label: '고객반품', color: C.blue },
  SUPPLIER_CLAIM: { label: '공급업체클레임', color: C.orange },
};

const REASON_MAP: Record<ReturnReason, string> = {
  DEFECT: '제품 불량',
  WRONG_ITEM: '오배송',
  DAMAGE: '파손/훼손',
  OVER_DELIVERY: '과잉 납품',
  OTHER: '기타',
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'RECEIVED', label: '접수' },
  { value: 'INSPECTING', label: '검수중' },
  { value: 'PROCESSING', label: '처리중' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'REJECTED', label: '반려' },
];

const TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'CUSTOMER_RETURN', label: '고객반품' },
  { value: 'SUPPLIER_CLAIM', label: '공급업체클레임' },
];

// ─── localStorage 키 ───

const STORAGE_KEY = 'hanvoxel_return_records';

// ─── Mock 거래처 ───

const MOCK_PARTNERS: Partner[] = [
  { id: 'p-1', name: '현대모비스', type: 'CUSTOMER' },
  { id: 'p-2', name: 'BMW Munich', type: 'CUSTOMER' },
  { id: 'p-3', name: '롯데케미칼', type: 'CUSTOMER' },
  { id: 'p-4', name: '삼성전자', type: 'CUSTOMER' },
  { id: 'p-5', name: '동국제강', type: 'SUPPLIER' },
  { id: 'p-6', name: 'POSCO', type: 'SUPPLIER' },
  { id: 'p-7', name: '한화솔루션', type: 'SUPPLIER' },
  { id: 'p-8', name: 'LG에너지솔루션', type: 'SUPPLIER' },
];

// ─── Mock 반품 데이터 ───

const MOCK_RETURNS: ReturnRecord[] = [
  {
    id: 'ret-1',
    returnNo: 'RTN-20260301-0001',
    type: 'CUSTOMER_RETURN',
    partnerId: 'p-1',
    partnerName: '현대모비스',
    reason: 'DEFECT',
    reasonDetail: '가솔린 엔진 밸브 치수 불량 — 내경 0.3mm 초과',
    items: [
      { id: 'li-1', sku: 'SKU-2891', productName: '가솔린 엔진 밸브', qty: 15, unitPrice: 15000, description: '치수 불량' },
    ],
    status: 'COMPLETED',
    totalQty: 15,
    totalAmount: 225000,
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-05T14:00:00Z',
  },
  {
    id: 'ret-2',
    returnNo: 'RTN-20260305-0001',
    type: 'SUPPLIER_CLAIM',
    partnerId: 'p-6',
    partnerName: 'POSCO',
    reason: 'DAMAGE',
    reasonDetail: '냉연강판 코일 운송 중 찍힘 — 3개 코일 표면 손상',
    items: [
      { id: 'li-2', sku: 'SKU-7200', productName: '냉연강판 코일', qty: 3, unitPrice: 350000, description: '표면 찍힘' },
    ],
    status: 'PROCESSING',
    totalQty: 3,
    totalAmount: 1050000,
    createdAt: '2026-03-05T10:30:00Z',
    updatedAt: '2026-03-10T11:00:00Z',
  },
  {
    id: 'ret-3',
    returnNo: 'RTN-20260308-0001',
    type: 'CUSTOMER_RETURN',
    partnerId: 'p-4',
    partnerName: '삼성전자',
    reason: 'WRONG_ITEM',
    reasonDetail: '리튬이온 배터리 셀 규격 오배송 — 21700 주문에 18650 납품',
    items: [
      { id: 'li-3', sku: 'SKU-4501', productName: '리튬이온 배터리 셀', qty: 200, unitPrice: 48000, description: '규격 오배송' },
    ],
    status: 'INSPECTING',
    totalQty: 200,
    totalAmount: 9600000,
    createdAt: '2026-03-08T14:00:00Z',
    updatedAt: '2026-03-09T10:00:00Z',
  },
  {
    id: 'ret-4',
    returnNo: 'RTN-20260310-0001',
    type: 'SUPPLIER_CLAIM',
    partnerId: 'p-7',
    partnerName: '한화솔루션',
    reason: 'OVER_DELIVERY',
    reasonDetail: '양극재 분말 과잉 납품 — 500kg 주문에 650kg 입고',
    items: [
      { id: 'li-4', sku: 'SKU-1120', productName: '양극재 분말', qty: 150, unitPrice: 95000, description: '과잉 납품 150kg' },
    ],
    status: 'RECEIVED',
    totalQty: 150,
    totalAmount: 14250000,
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
  },
  {
    id: 'ret-5',
    returnNo: 'RTN-20260312-0001',
    type: 'CUSTOMER_RETURN',
    partnerId: 'p-2',
    partnerName: 'BMW Munich',
    reason: 'DEFECT',
    reasonDetail: '전자부품 커넥터 접촉 불량 — 저항값 규격 초과',
    items: [
      { id: 'li-5', sku: 'SKU-3300', productName: '전자부품 커넥터', qty: 50, unitPrice: 8500, description: '접촉 불량' },
    ],
    status: 'INSPECTING',
    totalQty: 50,
    totalAmount: 425000,
    createdAt: '2026-03-12T11:00:00Z',
    updatedAt: '2026-03-13T09:00:00Z',
  },
  {
    id: 'ret-6',
    returnNo: 'RTN-20260315-0001',
    type: 'CUSTOMER_RETURN',
    partnerId: 'p-3',
    partnerName: '롯데케미칼',
    reason: 'DAMAGE',
    reasonDetail: '화학 소재 포장 파손 — 운송 중 누출 발생',
    items: [
      { id: 'li-6', sku: 'SKU-5100', productName: '화학 첨가제 드럼', qty: 5, unitPrice: 280000, description: '포장 파손/누출' },
    ],
    status: 'RECEIVED',
    totalQty: 5,
    totalAmount: 1400000,
    createdAt: '2026-03-15T16:00:00Z',
    updatedAt: '2026-03-15T16:00:00Z',
  },
  {
    id: 'ret-7',
    returnNo: 'RTN-20260317-0001',
    type: 'SUPPLIER_CLAIM',
    partnerId: 'p-5',
    partnerName: '동국제강',
    reason: 'DEFECT',
    reasonDetail: '철근 강도 시험 불합격 — 인장강도 기준 미달',
    items: [
      { id: 'li-7', sku: 'SKU-6800', productName: '철근 D25', qty: 80, unitPrice: 12000, description: '인장강도 미달' },
    ],
    status: 'REJECTED',
    totalQty: 80,
    totalAmount: 960000,
    createdAt: '2026-03-17T09:00:00Z',
    updatedAt: '2026-03-18T10:00:00Z',
  },
];

// ─── Mock 월별 추이 ───

const MOCK_MONTHLY_TREND: MonthlyTrend[] = [
  { month: '2025-10', count: 8, amount: 5200000 },
  { month: '2025-11', count: 12, amount: 8100000 },
  { month: '2025-12', count: 6, amount: 3400000 },
  { month: '2026-01', count: 10, amount: 7800000 },
  { month: '2026-02', count: 14, amount: 12500000 },
  { month: '2026-03', count: 7, amount: 27910000 },
];

// ─── 유틸리티 ───

/** 숫자 포맷 (원화) */
const formatKRW = (v: number): string =>
  v >= 10000 ? `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}만` : v.toLocaleString();

/** 날짜 포맷 */
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 고유 ID 생성 */
const genId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─── localStorage 헬퍼 ───

const loadRecords = (): ReturnRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ReturnRecord[];
  } catch {
    // localStorage 접근 실패 시 무시
  }
  return [...MOCK_RETURNS];
};

const saveRecords = (records: ReturnRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // localStorage 접근 실패 시 무시
  }
};

// ─── 탭 정의 ───

type TabId = 'list' | 'new' | 'analytics';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'list', label: '반품 목록' },
  { id: 'new', label: '반품 접수' },
  { id: 'analytics', label: '반품 분석' },
];

// ════════════════════════════════════════════
//  메인 컴포넌트
// ════════════════════════════════════════════

export function ReturnManagementDashboard({ onBack }: ReturnManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('list');
  const [records, setRecords] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 초기 로드 — API 시도 후 localStorage 폴백
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/returns');
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.success && Array.isArray(json.data)) {
            setRecords(json.data as ReturnRecord[]);
            setLoading(false);
            return;
          }
        }
      } catch {
        // API 호출 실패 — localStorage 폴백
      }
      if (!cancelled) {
        setRecords(loadRecords());
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // 레코드 변경 시 localStorage 동기화
  useEffect(() => {
    if (!loading) saveRecords(records);
  }, [records, loading]);

  /** 새 반품 접수 핸들러 */
  const handleCreateReturn = useCallback((record: ReturnRecord) => {
    setRecords((prev) => [record, ...prev]);
    setActiveTab('list');
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 18, padding: '4px 8px' }} aria-label="뒤로가기">
          &#8592;
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>반품/불량 관리</h1>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, background: C.card, padding: '0 24px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${C.blue}` : '2px solid transparent',
              color: activeTab === tab.id ? C.blue : C.textMuted,
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: 14,
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div style={{ padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.textMuted }}>로딩 중...</div>
        ) : (
          <>
            {activeTab === 'list' && <ReturnListTab records={records} />}
            {activeTab === 'new' && <NewReturnTab onCreate={handleCreateReturn} />}
            {activeTab === 'analytics' && <AnalyticsTab records={records} />}
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  Tab 1: 반품 목록
// ════════════════════════════════════════════

function ReturnListTab({ records }: { records: ReturnRecord[] }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<ReturnRecord | null>(null);

  // 필터 적용
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
      return true;
    });
  }, [records, statusFilter, typeFilter]);

  return (
    <>
      {/* 필터 바 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* 상태 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.textMuted, fontSize: 13 }}>상태:</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: `1px solid ${statusFilter === f.value ? C.blue : C.border}`,
                background: statusFilter === f.value ? `${C.blue}22` : 'transparent',
                color: statusFilter === f.value ? C.blue : C.textMuted,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: statusFilter === f.value ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 유형 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.textMuted, fontSize: 13 }}>유형:</span>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: `1px solid ${typeFilter === f.value ? C.blue : C.border}`,
                background: typeFilter === f.value ? `${C.blue}22` : 'transparent',
                color: typeFilter === f.value ? C.blue : C.textMuted,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: typeFilter === f.value ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['반품번호', '유형', '거래처', '사유', '수량', '상태', '등록일'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: C.textMuted, fontWeight: 600, fontSize: 12 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>
                  해당 조건의 반품 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const st = STATUS_MAP[r.status];
                const tp = TYPE_MAP[r.type];
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${C.blue}0A`; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: C.blue }}>{r.returnNo}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: `${tp.color}22`, color: tp.color, fontSize: 11, fontWeight: 600 }}>
                        {tp.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{r.partnerName}</td>
                    <td style={{ padding: '10px 14px', color: C.textMuted }}>{REASON_MAP[r.reason]}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{r.totalQty}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: `${st.color}22`, color: st.color, fontSize: 11, fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: C.textMuted, fontSize: 12 }}>{formatDate(r.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 상세 모달 */}
      {selectedRecord && (
        <ReturnDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </>
  );
}

// ─── 반품 상세 모달 ───

function ReturnDetailModal({ record, onClose }: { record: ReturnRecord; onClose: () => void }) {
  const st = STATUS_MAP[record.status];
  const tp = TYPE_MAP[record.type];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{record.returnNo}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20 }} aria-label="닫기">
            &#10005;
          </button>
        </div>

        {/* 기본 정보 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <InfoRow label="유형" value={<span style={{ color: tp.color }}>{tp.label}</span>} />
          <InfoRow label="상태" value={<span style={{ padding: '2px 8px', borderRadius: 4, background: `${st.color}22`, color: st.color, fontSize: 12, fontWeight: 600 }}>{st.label}</span>} />
          <InfoRow label="거래처" value={record.partnerName} />
          <InfoRow label="사유" value={REASON_MAP[record.reason]} />
          <InfoRow label="등록일" value={formatDate(record.createdAt)} />
          <InfoRow label="최종 수정일" value={formatDate(record.updatedAt)} />
        </div>

        {/* 사유 상세 */}
        <div style={{ background: C.bg, borderRadius: 8, padding: 12, marginBottom: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>사유 상세</div>
          <div style={{ fontSize: 13 }}>{record.reasonDetail}</div>
        </div>

        {/* 품목 목록 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>품목 목록</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['SKU', '품명', '수량', '단가', '금액', '설명'].map((h) => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.textMuted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {record.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: C.blue }}>{item.sku}</td>
                  <td style={{ padding: '8px 10px' }}>{item.productName}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{item.qty}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{item.unitPrice.toLocaleString()}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{(item.qty * item.unitPrice).toLocaleString()}</td>
                  <td style={{ padding: '8px 10px', color: C.textMuted }}>{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 합계 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 14, fontWeight: 600 }}>
          <span style={{ color: C.textMuted }}>총 수량: <span style={{ color: C.text }}>{record.totalQty}</span></span>
          <span style={{ color: C.textMuted }}>총 금액: <span style={{ color: C.orange }}>{record.totalAmount.toLocaleString()}원</span></span>
        </div>
      </div>
    </div>
  );
}

/** 정보 행 컴포넌트 */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{value}</div>
    </div>
  );
}

// ════════════════════════════════════════════
//  Tab 2: 반품 접수
// ════════════════════════════════════════════

/** 신규 반품 접수 폼에서 사용하는 품목 입력 타입 */
interface LineItemInput {
  tempId: string;
  sku: string;
  productName: string;
  qty: string;
  unitPrice: string;
  description: string;
}

const emptyLine = (): LineItemInput => ({
  tempId: genId(),
  sku: '',
  productName: '',
  qty: '',
  unitPrice: '',
  description: '',
});

function NewReturnTab({ onCreate }: { onCreate: (r: ReturnRecord) => void }) {
  const [type, setType] = useState<ReturnType>('CUSTOMER_RETURN');
  const [partnerId, setPartnerId] = useState('');
  const [reason, setReason] = useState<ReturnReason>('DEFECT');
  const [reasonDetail, setReasonDetail] = useState('');
  const [lines, setLines] = useState<LineItemInput[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 유형에 맞는 거래처 필터
  const filteredPartners = useMemo(() => {
    return MOCK_PARTNERS.filter((p) =>
      type === 'CUSTOMER_RETURN' ? p.type === 'CUSTOMER' : p.type === 'SUPPLIER'
    );
  }, [type]);

  // 유형 변경 시 거래처 초기화
  useEffect(() => {
    setPartnerId('');
  }, [type]);

  /** 품목 행 업데이트 */
  const updateLine = useCallback((tempId: string, field: keyof LineItemInput, value: string) => {
    setLines((prev) => prev.map((l) => (l.tempId === tempId ? { ...l, [field]: value } : l)));
  }, []);

  /** 품목 행 추가 */
  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  /** 품목 행 삭제 */
  const removeLine = useCallback((tempId: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.tempId !== tempId)));
  }, []);

  /** 폼 제출 */
  const handleSubmit = useCallback(async () => {
    setError('');

    // 유효성 검증
    if (!partnerId) { setError('거래처를 선택해주세요.'); return; }
    if (!reasonDetail.trim()) { setError('사유 상세를 입력해주세요.'); return; }

    const validLines = lines.filter((l) => l.sku.trim() && Number(l.qty) > 0);
    if (validLines.length === 0) { setError('품목을 1개 이상 입력해주세요.'); return; }

    const partner = MOCK_PARTNERS.find((p) => p.id === partnerId);
    if (!partner) { setError('유효하지 않은 거래처입니다.'); return; }

    const items: ReturnLineItem[] = validLines.map((l) => ({
      id: genId(),
      sku: l.sku.trim(),
      productName: l.productName.trim() || l.sku.trim(),
      qty: Number(l.qty),
      unitPrice: Number(l.unitPrice) || 0,
      description: l.description.trim(),
    }));

    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const totalAmount = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const now = new Date().toISOString();
    const dateStr = now.slice(0, 10).replace(/-/g, '');
    const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');

    const record: ReturnRecord = {
      id: genId(),
      returnNo: `RTN-${dateStr}-${seq}`,
      type,
      partnerId,
      partnerName: partner.name,
      reason,
      reasonDetail: reasonDetail.trim(),
      items,
      status: 'RECEIVED',
      totalQty,
      totalAmount,
      createdAt: now,
      updatedAt: now,
    };

    setSubmitting(true);

    // API 호출 시도
    try {
      const res = await fetch('/api/v1/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          onCreate(json.data as ReturnRecord);
          resetForm();
          setSubmitting(false);
          return;
        }
      }
    } catch {
      // API 실패 시 로컬 저장으로 폴백
    }

    // 로컬 폴백
    onCreate(record);
    resetForm();
    setSubmitting(false);
  }, [partnerId, reasonDetail, lines, type, reason, onCreate]);

  /** 폼 초기화 */
  const resetForm = () => {
    setType('CUSTOMER_RETURN');
    setPartnerId('');
    setReason('DEFECT');
    setReasonDetail('');
    setLines([emptyLine()]);
    setError('');
  };

  // 공통 입력 스타일
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: `1px solid ${C.border}`,
    background: C.bg,
    color: C.text,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, margin: '0 0 20px' }}>반품 접수</h2>

      {/* 에러 메시지 */}
      {error && (
        <div style={{ background: `${C.red}22`, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: C.red, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* 유형 선택 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 6 }}>유형</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['CUSTOMER_RETURN', 'SUPPLIER_CLAIM'] as ReturnType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: `1px solid ${type === t ? C.blue : C.border}`,
                background: type === t ? `${C.blue}22` : 'transparent',
                color: type === t ? C.blue : C.textMuted,
                cursor: 'pointer',
                fontWeight: type === t ? 600 : 400,
                fontSize: 13,
              }}
            >
              {TYPE_MAP[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* 거래처 선택 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 6 }}>거래처</label>
        <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} style={selectStyle}>
          <option value="">-- 거래처 선택 --</option>
          {filteredPartners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* 반품 사유 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 6 }}>반품 사유</label>
        <select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)} style={selectStyle}>
          {(Object.entries(REASON_MAP) as Array<[ReturnReason, string]>).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* 품목 목록 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 12, color: C.textMuted }}>품목 목록</label>
          <button
            onClick={addLine}
            style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${C.blue}`, background: 'transparent', color: C.blue, cursor: 'pointer', fontSize: 12 }}
          >
            + 품목 추가
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lines.map((line, idx) => (
            <div
              key={line.tempId}
              style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 1fr 32px', gap: 8, alignItems: 'center', background: C.bg, padding: 10, borderRadius: 8, border: `1px solid ${C.border}` }}
            >
              <input
                placeholder="SKU"
                value={line.sku}
                onChange={(e) => updateLine(line.tempId, 'sku', e.target.value)}
                style={{ ...inputStyle, border: 'none', background: 'transparent' }}
              />
              <input
                placeholder="수량"
                type="number"
                min="1"
                value={line.qty}
                onChange={(e) => updateLine(line.tempId, 'qty', e.target.value)}
                style={{ ...inputStyle, border: 'none', background: 'transparent', textAlign: 'right' }}
              />
              <input
                placeholder="단가"
                type="number"
                min="0"
                value={line.unitPrice}
                onChange={(e) => updateLine(line.tempId, 'unitPrice', e.target.value)}
                style={{ ...inputStyle, border: 'none', background: 'transparent', textAlign: 'right' }}
              />
              <input
                placeholder="설명"
                value={line.description}
                onChange={(e) => updateLine(line.tempId, 'description', e.target.value)}
                style={{ ...inputStyle, border: 'none', background: 'transparent' }}
              />
              <button
                onClick={() => removeLine(line.tempId)}
                disabled={lines.length <= 1}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none',
                  background: lines.length <= 1 ? 'transparent' : `${C.red}22`,
                  color: lines.length <= 1 ? C.border : C.red,
                  cursor: lines.length <= 1 ? 'default' : 'pointer',
                  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label={`품목 ${idx + 1} 삭제`}
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 사유 상세 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 6 }}>사유 상세</label>
        <textarea
          value={reasonDetail}
          onChange={(e) => setReasonDetail(e.target.value)}
          placeholder="반품/클레임 사유를 상세히 입력하세요..."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '12px 20px',
          borderRadius: 8,
          border: 'none',
          background: submitting ? C.border : C.blue,
          color: submitting ? C.textMuted : '#fff',
          cursor: submitting ? 'default' : 'pointer',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {submitting ? '접수 중...' : '반품 접수'}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════
//  Tab 3: 반품 분석
// ════════════════════════════════════════════

function AnalyticsTab({ records }: { records: ReturnRecord[] }) {
  // 이번 달 데이터 집계
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-03"
  const thisMonthRecords = useMemo(() => records.filter((r) => r.createdAt.slice(0, 7) === currentMonth), [records, currentMonth]);
  const thisMonthCount = thisMonthRecords.length;
  const thisMonthAmount = thisMonthRecords.reduce((s, r) => s + r.totalAmount, 0);
  const claimsInProgress = records.filter((r) => ['RECEIVED', 'INSPECTING', 'PROCESSING'].includes(r.status)).length;

  // 사유별 집계 (파이차트용)
  const reasonStats = useMemo(() => {
    const map: Record<ReturnReason, number> = { DEFECT: 0, WRONG_ITEM: 0, DAMAGE: 0, OVER_DELIVERY: 0, OTHER: 0 };
    records.forEach((r) => { map[r.reason] += 1; });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ reason: k as ReturnReason, count: v }))
      .sort((a, b) => b.count - a.count);
  }, [records]);

  // 거래처별 반품률 상위 5
  const partnerStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; amount: number }>();
    records.forEach((r) => {
      const existing = map.get(r.partnerId);
      if (existing) {
        existing.count += 1;
        existing.amount += r.totalAmount;
      } else {
        map.set(r.partnerId, { name: r.partnerName, count: 1, amount: r.totalAmount });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [records]);

  return (
    <div>
      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="이번 달 반품 건수" value={`${thisMonthCount}건`} color={C.blue} />
        <KpiCard label="반품 금액" value={`${formatKRW(thisMonthAmount)}원`} color={C.orange} />
        <KpiCard label="클레임 진행중" value={`${claimsInProgress}건`} color={C.red} />
      </div>

      {/* 차트 행 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* 월별 반품 추이 (SVG 라인 차트) */}
        <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>월별 반품 추이</h3>
          <MonthlyTrendChart data={MOCK_MONTHLY_TREND} />
        </div>

        {/* 반품 사유 파이차트 */}
        <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>반품 사유 분포</h3>
          <ReasonPieChart data={reasonStats} total={records.length} />
        </div>
      </div>

      {/* 거래처별 반품률 테이블 */}
      <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>거래처별 반품 상위 5</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['순위', '거래처', '반품 건수', '반품 금액', '비율'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partnerStats.map((p, idx) => {
              const pct = records.length > 0 ? ((p.count / records.length) * 100).toFixed(1) : '0';
              return (
                <tr key={p.name} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: idx === 0 ? C.red : C.textMuted }}>{idx + 1}</td>
                  <td style={{ padding: '8px 12px' }}>{p.name}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{p.count}건</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: C.orange }}>{p.amount.toLocaleString()}원</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: C.blue, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted, minWidth: 40, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {partnerStats.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: C.textMuted }}>데이터가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KPI 카드 ───

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: 20 }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ─── 월별 추이 SVG 라인 차트 ───

function MonthlyTrendChart({ data }: { data: MonthlyTrend[] }) {
  if (data.length === 0) return <div style={{ color: C.textMuted, textAlign: 'center', padding: 20 }}>데이터가 없습니다.</div>;

  const W = 400;
  const H = 180;
  const PX = 40; // 좌측 패딩
  const PY = 20; // 상하 패딩
  const PR = 20; // 우측 패딩

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartW = W - PX - PR;
  const chartH = H - PY * 2;

  // 데이터 좌표 계산
  const points = data.map((d, i) => ({
    x: PX + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
    y: PY + chartH - (d.count / maxCount) * chartH,
    ...d,
  }));

  // 라인 경로
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // 영역 경로 (채움)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PY + chartH} L ${points[0].x} ${PY + chartH} Z`;

  // Y축 눈금
  const yTicks = [0, Math.ceil(maxCount / 2), maxCount];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {/* 배경 그리드 */}
      {yTicks.map((t) => {
        const y = PY + chartH - (t / maxCount) * chartH;
        return (
          <g key={t}>
            <line x1={PX} y1={y} x2={W - PR} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={PX - 6} y={y + 4} fill={C.textMuted} fontSize={10} textAnchor="end">{t}</text>
          </g>
        );
      })}

      {/* 영역 채움 */}
      <path d={areaPath} fill={`${C.blue}15`} />

      {/* 라인 */}
      <path d={linePath} fill="none" stroke={C.blue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* 포인트 + 레이블 */}
      {points.map((p) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r={3.5} fill={C.blue} stroke={C.card} strokeWidth={1.5} />
          <text x={p.x} y={p.y - 8} fill={C.text} fontSize={10} textAnchor="middle" fontWeight={600}>{p.count}</text>
          <text x={p.x} y={H - 2} fill={C.textMuted} fontSize={9} textAnchor="middle">{p.month.slice(5)}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── 반품 사유 SVG 파이차트 ───

const PIE_COLORS = [C.red, C.orange, C.blue, C.green, C.purple];

function ReasonPieChart({ data, total }: { data: Array<{ reason: ReturnReason; count: number }>; total: number }) {
  if (data.length === 0 || total === 0) {
    return <div style={{ color: C.textMuted, textAlign: 'center', padding: 20 }}>데이터가 없습니다.</div>;
  }

  const SIZE = 160;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 60;
  const IR = 35; // 도넛 내경

  // 파이 조각 계산
  let startAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = (d.count / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const ix1 = CX + IR * Math.cos(endAngle);
    const iy1 = CY + IR * Math.sin(endAngle);
    const ix2 = CX + IR * Math.cos(startAngle);
    const iy2 = CY + IR * Math.sin(startAngle);

    const path = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${IR} ${IR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    const result = { path, color: PIE_COLORS[i % PIE_COLORS.length], ...d };
    startAngle = endAngle;
    return result;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        {slices.map((s) => (
          <path key={s.reason} d={s.path} fill={s.color} opacity={0.85} />
        ))}
        {/* 중앙 텍스트 */}
        <text x={CX} y={CY - 4} fill={C.text} fontSize={16} fontWeight={700} textAnchor="middle">{total}</text>
        <text x={CX} y={CY + 12} fill={C.textMuted} fontSize={9} textAnchor="middle">총 건수</text>
      </svg>

      {/* 범례 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((s) => (
          <div key={s.reason} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: C.textMuted }}>{REASON_MAP[s.reason]}</span>
            <span style={{ fontWeight: 600, marginLeft: 'auto' }}>{s.count}건</span>
            <span style={{ color: C.textMuted, fontSize: 11, minWidth: 36, textAlign: 'right' }}>
              {((s.count / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
