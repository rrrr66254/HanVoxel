/**
 * HanVoxel — 업체 목록 컴포넌트 (다크 테마)
 *
 * 기능:
 *   - 업체 목록 카드/테이블 토글 뷰
 *   - 검색 + 유형 필터 (ALL / SUPPLIER / CUSTOMER / BOTH)
 *   - 활성/비활성 토글
 *   - 신규 등록 버튼
 *   - 거래 요약 통계 표시 (입출고 건수, 마지막 거래일)
 *   - API 미연결 시 mock 데이터 fallback
 *   - 페이지네이션
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  LayoutGrid,
  List,
  Building2,
  Phone,
  User,
  Hash,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  WifiOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Partner } from '../../api/partner-api';
import { MOCK_COMPANY_ID } from '../../constants/mock-ids';

// ── 디자인 토큰 ──────────────────────────────────────────
const C = {
  bg: '#0D1117',
  card: '#161B22',
  cardHover: '#1C2128',
  border: '#30363D',
  borderMuted: '#21262D',
  text: '#C9D1D9',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
  accent: '#58A6FF',
  green: '#3FB950',
  red: '#F85149',
  orange: '#D29922',
  purple: '#BC8CFF',
  input: '#0D1117',
  tag: '#1F2937',
} as const;

// ── 유형 뱃지 설정 ───────────────────────────────────────
const TYPE_META: Record<Partner['type'], { label: string; color: string; bg: string }> = {
  SUPPLIER: { label: '공급업체', color: C.accent, bg: 'rgba(88,166,255,0.12)' },
  CUSTOMER: { label: '고객사',   color: C.green,  bg: 'rgba(63,185,80,0.12)'  },
  BOTH:     { label: '양쪽',     color: C.purple, bg: 'rgba(188,140,255,0.12)' },
};

// ── 업체 유형 필터 탭 ────────────────────────────────────
type TypeFilter = 'ALL' | 'SUPPLIER' | 'CUSTOMER' | 'BOTH';

const TYPE_TABS: { key: TypeFilter; label: string }[] = [
  { key: 'ALL',      label: '전체' },
  { key: 'SUPPLIER', label: '공급업체' },
  { key: 'CUSTOMER', label: '고객사' },
  { key: 'BOTH',     label: '양쪽' },
];

// ── 뷰 모드 ──────────────────────────────────────────────
type ViewMode = 'card' | 'table';

// ── Mock 데이터 ──────────────────────────────────────────
const MOCK_PARTNERS: Partner[] = [
  {
    id: 'pt-001',
    companyId: MOCK_COMPANY_ID,
    type: 'SUPPLIER',
    name: '(주)현대모비스',
    code: 'SUP-001',
    bizNo: '123-45-67890',
    ceoName: '김현대',
    bizType: '제조업',
    bizCategory: '자동차부품',
    address: '경기도 용인시 기흥구',
    phone: '031-1234-5678',
    email: 'procurement@mobis.co.kr',
    contactName: '이담당',
    paymentTerms: 'NET30',
    note: '주요 자동차 부품 공급업체',
    isActive: true,
    createdAt: '2025-06-10T09:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    transactionSummary: {
      id: 'ts-001',
      partnerId: 'pt-001',
      totalInbound: 48,
      totalOutbound: 0,
      totalPurchase: '580000000',
      totalSales: '0',
      receivables: '0',
      payables: '45000000',
      avgDeliveryRate: 97.5,
      avgQualityScore: 88.3,
      lastTransactionAt: '2026-03-15T14:00:00Z',
    },
  },
  {
    id: 'pt-002',
    companyId: MOCK_COMPANY_ID,
    type: 'CUSTOMER',
    name: 'CJ대한통운',
    code: 'CUS-001',
    bizNo: '234-56-78901',
    ceoName: '박물류',
    bizType: '물류업',
    bizCategory: '창고/운송',
    address: '서울시 중구 청계천로',
    phone: '02-9876-5432',
    email: 'wms@cjlogistics.com',
    contactName: '최팀장',
    paymentTerms: 'NET60',
    note: null,
    isActive: true,
    createdAt: '2025-07-20T09:00:00Z',
    updatedAt: '2026-02-28T11:00:00Z',
    transactionSummary: {
      id: 'ts-002',
      partnerId: 'pt-002',
      totalInbound: 0,
      totalOutbound: 72,
      totalPurchase: '0',
      totalSales: '920000000',
      receivables: '87000000',
      payables: '0',
      avgDeliveryRate: 99.1,
      avgQualityScore: null,
      lastTransactionAt: '2026-03-17T09:00:00Z',
    },
  },
  {
    id: 'pt-003',
    companyId: MOCK_COMPANY_ID,
    type: 'SUPPLIER',
    name: '영진포장(주)',
    code: 'SUP-002',
    bizNo: '345-67-89012',
    ceoName: '정대표',
    bizType: '제조업',
    bizCategory: '포장재',
    address: '인천시 남동구 논현동',
    phone: '032-5555-6666',
    email: null,
    contactName: null,
    paymentTerms: 'COD',
    note: null,
    isActive: true,
    createdAt: '2025-08-05T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
    transactionSummary: {
      id: 'ts-003',
      partnerId: 'pt-003',
      totalInbound: 22,
      totalOutbound: 0,
      totalPurchase: '35000000',
      totalSales: '0',
      receivables: '0',
      payables: '8500000',
      avgDeliveryRate: 92.0,
      avgQualityScore: 76.0,
      lastTransactionAt: '2026-02-20T10:00:00Z',
    },
  },
  {
    id: 'pt-004',
    companyId: MOCK_COMPANY_ID,
    type: 'BOTH',
    name: '(주)삼성SDI',
    code: 'BOTH-001',
    bizNo: '456-78-90123',
    ceoName: '이삼성',
    bizType: '제조업',
    bizCategory: '전자부품/배터리',
    address: '경기도 수원시 영통구',
    phone: '031-8800-0000',
    email: 'biz@samsungsdi.com',
    contactName: '한과장',
    paymentTerms: 'NET45',
    note: '공급 + 수요 양방향 거래',
    isActive: true,
    createdAt: '2025-05-01T09:00:00Z',
    updatedAt: '2026-03-10T12:00:00Z',
    transactionSummary: {
      id: 'ts-004',
      partnerId: 'pt-004',
      totalInbound: 31,
      totalOutbound: 15,
      totalPurchase: '420000000',
      totalSales: '195000000',
      receivables: '32000000',
      payables: '18000000',
      avgDeliveryRate: 98.0,
      avgQualityScore: 91.5,
      lastTransactionAt: '2026-03-12T16:00:00Z',
    },
  },
  {
    id: 'pt-005',
    companyId: MOCK_COMPANY_ID,
    type: 'CUSTOMER',
    name: '롯데글로벌로지스',
    code: 'CUS-002',
    bizNo: '567-89-01234',
    ceoName: '정롯데',
    bizType: '물류업',
    bizCategory: '3PL',
    address: '서울시 강남구 역삼동',
    phone: '02-3456-7890',
    email: 'ops@lglogistics.com',
    contactName: '유매니저',
    paymentTerms: 'NET30',
    note: null,
    isActive: true,
    createdAt: '2025-09-15T09:00:00Z',
    updatedAt: '2026-03-05T14:00:00Z',
    transactionSummary: {
      id: 'ts-005',
      partnerId: 'pt-005',
      totalInbound: 0,
      totalOutbound: 44,
      totalPurchase: '0',
      totalSales: '380000000',
      receivables: '22000000',
      payables: '0',
      avgDeliveryRate: 96.8,
      avgQualityScore: null,
      lastTransactionAt: '2026-03-16T11:00:00Z',
    },
  },
  {
    id: 'pt-006',
    companyId: MOCK_COMPANY_ID,
    type: 'SUPPLIER',
    name: 'LG화학(주)',
    code: 'SUP-003',
    bizNo: '678-90-12345',
    ceoName: '신LG',
    bizType: '화학업',
    bizCategory: '화학원료/소재',
    address: '서울시 영등포구 여의대로',
    phone: '02-6987-0000',
    email: 'supply@lgchem.com',
    contactName: '조부장',
    paymentTerms: 'NET30',
    note: '화학원료 정기 공급',
    isActive: false,
    createdAt: '2025-04-01T09:00:00Z',
    updatedAt: '2025-12-31T09:00:00Z',
    transactionSummary: {
      id: 'ts-006',
      partnerId: 'pt-006',
      totalInbound: 12,
      totalOutbound: 0,
      totalPurchase: '145000000',
      totalSales: '0',
      receivables: '0',
      payables: '0',
      avgDeliveryRate: 95.0,
      avgQualityScore: 83.0,
      lastTransactionAt: '2025-12-20T10:00:00Z',
    },
  },
  {
    id: 'pt-007',
    companyId: MOCK_COMPANY_ID,
    type: 'CUSTOMER',
    name: '(주)포스코인터내셔널',
    code: 'CUS-003',
    bizNo: '789-01-23456',
    ceoName: '강포스코',
    bizType: '무역업',
    bizCategory: '철강/소재 무역',
    address: '서울시 강남구 테헤란로',
    phone: '02-1111-2222',
    email: 'trade@poscoint.com',
    contactName: '문차장',
    paymentTerms: 'NET60',
    note: null,
    isActive: true,
    createdAt: '2025-10-01T09:00:00Z',
    updatedAt: '2026-03-08T09:00:00Z',
    transactionSummary: {
      id: 'ts-007',
      partnerId: 'pt-007',
      totalInbound: 0,
      totalOutbound: 28,
      totalPurchase: '0',
      totalSales: '675000000',
      receivables: '95000000',
      payables: '0',
      avgDeliveryRate: 100,
      avgQualityScore: null,
      lastTransactionAt: '2026-03-18T09:00:00Z',
    },
  },
  {
    id: 'pt-008',
    companyId: MOCK_COMPANY_ID,
    type: 'SUPPLIER',
    name: '(주)경신',
    code: 'SUP-004',
    bizNo: '890-12-34567',
    ceoName: '배경신',
    bizType: '제조업',
    bizCategory: '와이어 하네스',
    address: '경기도 안산시 단원구',
    phone: '031-4444-5555',
    email: 'ks@kyungshin.com',
    contactName: '임주임',
    paymentTerms: 'NET15',
    note: '와이어 하네스 전담 공급',
    isActive: true,
    createdAt: '2025-11-15T09:00:00Z',
    updatedAt: '2026-03-14T08:00:00Z',
    transactionSummary: {
      id: 'ts-008',
      partnerId: 'pt-008',
      totalInbound: 19,
      totalOutbound: 0,
      totalPurchase: '98000000',
      totalSales: '0',
      receivables: '0',
      payables: '12000000',
      avgDeliveryRate: 93.7,
      avgQualityScore: 80.5,
      lastTransactionAt: '2026-03-14T08:30:00Z',
    },
  },
];

// ── 유틸 함수 ────────────────────────────────────────────

/** 날짜 포맷 (YYYY-MM-DD) */
function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** 금액 포맷 (억 단위로 간략화) */
function formatAmount(numStr: string): string {
  const n = Number(numStr);
  if (!n) return '0원';
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return `${n.toLocaleString()}원`;
}

const PAGE_SIZE = 12;

// ── Props ─────────────────────────────────────────────────
interface PartnerListProps {
  onBack: () => void;
  onSelectPartner: (id: string) => void;
  onCreateNew: () => void;
  onDrivers?: () => void;
}

// ── 컴포넌트 ─────────────────────────────────────────────
export function PartnerList({ onBack, onSelectPartner, onCreateNew, onDrivers }: PartnerListProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOffline, setApiOffline] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const isUsingMock = useRef(false);

  // ── 데이터 로드 ─────────────────────────────────────────
  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      const { getPartners } = await import('../../api/partner-api');
      const result = await getPartners(MOCK_COMPANY_ID, {
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        search: search || undefined,
        isActive: showActiveOnly ? true : undefined,
        page,
        limit: PAGE_SIZE,
      });
      setPartners(result.partners);
      setTotal(result.total);
      setApiOffline(false);
      isUsingMock.current = false;
    } catch {
      console.warn(
        '%c[HanVoxel] 업체 API 연결 실패 — 데모 데이터를 사용합니다',
        'color: #F59E0B; font-weight: bold; font-size: 14px;',
      );
      setApiOffline(true);
      isUsingMock.current = true;

      // mock 데이터 필터링
      let filtered = MOCK_PARTNERS;
      if (typeFilter !== 'ALL') {
        filtered = filtered.filter((p) => p.type === typeFilter);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.bizNo ?? '').includes(q) ||
            (p.contactName ?? '').toLowerCase().includes(q),
        );
      }
      if (showActiveOnly) {
        filtered = filtered.filter((p) => p.isActive);
      }
      setTotal(filtered.length);
      const start = (page - 1) * PAGE_SIZE;
      setPartners(filtered.slice(start, start + PAGE_SIZE));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, showActiveOnly, page]);

  useEffect(() => {
    // 필터 변경 시 첫 페이지로 리셋
    setPage(1);
  }, [typeFilter, search, showActiveOnly]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  // ── 페이지네이션 계산 ────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── 업체 유형 카운트 (mock 기준) ─────────────────────────
  const typeCounts: Record<TypeFilter, number> = {
    ALL: MOCK_PARTNERS.length,
    SUPPLIER: MOCK_PARTNERS.filter((p) => p.type === 'SUPPLIER').length,
    CUSTOMER: MOCK_PARTNERS.filter((p) => p.type === 'CUSTOMER').length,
    BOTH: MOCK_PARTNERS.filter((p) => p.type === 'BOTH').length,
  };

  // ── 공통 스타일 ───────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? C.accent : 'transparent',
    color: active ? '#0D1117' : C.textSecondary,
    border: `1px solid ${active ? C.accent : C.border}`,
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  // ── 카드 렌더 ────────────────────────────────────────────
  function renderCard(p: Partner) {
    const meta = TYPE_META[p.type];
    const ts = p.transactionSummary;

    return (
      <div
        key={p.id}
        onClick={() => onSelectPartner(p.id)}
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '18px 20px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          opacity: p.isActive ? 1 : 0.55,
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = C.cardHover;
          (e.currentTarget as HTMLDivElement).style.borderColor = C.accent;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = C.card;
          (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
        }}
      >
        {/* 비활성 배지 */}
        {!p.isActive && (
          <span
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(248,81,73,0.15)',
              color: C.red,
              border: `1px solid ${C.red}`,
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            비활성
          </span>
        )}

        {/* 헤더: 이름 + 유형 뱃지 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: meta.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={18} style={{ color: meta.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {p.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>{p.code}</span>
              <span
                style={{
                  background: meta.bg,
                  color: meta.color,
                  border: `1px solid ${meta.color}33`,
                  borderRadius: 4,
                  padding: '1px 6px',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {meta.label}
              </span>
            </div>
          </div>
        </div>

        {/* 기본 정보 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
          {p.bizNo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Hash size={12} style={{ color: C.textMuted, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.textSecondary }}>{p.bizNo}</span>
            </div>
          )}
          {p.contactName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={12} style={{ color: C.textMuted, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.textSecondary }}>{p.contactName}</span>
            </div>
          )}
          {p.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={12} style={{ color: C.textMuted, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.textSecondary }}>{p.phone}</span>
            </div>
          )}
        </div>

        {/* 거래 요약 */}
        {ts && (
          <div
            style={{
              borderTop: `1px solid ${C.borderMuted}`,
              paddingTop: 10,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            {ts.totalInbound > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <ArrowDownToLine size={11} style={{ color: C.green }} />
                <span style={{ fontSize: 11, color: C.textSecondary }}>
                  입고 <strong style={{ color: C.text }}>{ts.totalInbound}</strong>건
                </span>
              </div>
            )}
            {ts.totalOutbound > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <ArrowUpFromLine size={11} style={{ color: C.accent }} />
                <span style={{ fontSize: 11, color: C.textSecondary }}>
                  출고 <strong style={{ color: C.text }}>{ts.totalOutbound}</strong>건
                </span>
              </div>
            )}
            {(ts.totalPurchase !== '0' || ts.totalSales !== '0') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Package size={11} style={{ color: C.orange }} />
                <span style={{ fontSize: 11, color: C.textSecondary }}>
                  {ts.totalPurchase !== '0'
                    ? `매입 ${formatAmount(ts.totalPurchase)}`
                    : `매출 ${formatAmount(ts.totalSales)}`}
                </span>
              </div>
            )}
            {ts.lastTransactionAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CalendarDays size={11} style={{ color: C.textMuted }} />
                <span style={{ fontSize: 11, color: C.textMuted }}>
                  {formatDate(ts.lastTransactionAt)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── 테이블 렌더 ──────────────────────────────────────────
  function renderTable() {
    return (
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['코드', '업체명', '유형', '사업자번호', '담당자', '전화', '상태'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    color: C.textMuted,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    background: '#131920',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partners.map((p, idx) => {
              const meta = TYPE_META[p.type];
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelectPartner(p.id)}
                  style={{
                    background: idx % 2 === 0 ? C.card : '#131920',
                    borderBottom: `1px solid ${C.borderMuted}`,
                    cursor: 'pointer',
                    opacity: p.isActive ? 1 : 0.55,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = C.cardHover;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      idx % 2 === 0 ? C.card : '#131920';
                  }}
                >
                  <td style={{ padding: '10px 16px', color: C.textMuted, fontFamily: 'monospace' }}>
                    {p.code}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      color: C.text,
                      fontWeight: 600,
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        border: `1px solid ${meta.color}33`,
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: C.textSecondary }}>
                    {p.bizNo ?? '-'}
                  </td>
                  <td style={{ padding: '10px 16px', color: C.textSecondary }}>
                    {p.contactName ?? '-'}
                  </td>
                  <td style={{ padding: '10px 16px', color: C.textSecondary }}>
                    {p.phone ?? '-'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span
                      style={{
                        background: p.isActive
                          ? 'rgba(63,185,80,0.12)'
                          : 'rgba(248,81,73,0.12)',
                        color: p.isActive ? C.green : C.red,
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {p.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {partners.length === 0 && !loading && (
          <div
            style={{
              padding: '48px 0',
              textAlign: 'center',
              color: C.textMuted,
              fontSize: 13,
            }}
          >
            검색 결과가 없습니다
          </div>
        )}
      </div>
    );
  }

  // ── 로딩 스켈레톤 ────────────────────────────────────────
  function renderSkeleton() {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '18px 20px',
              height: 180,
            }}
          >
            <div
              style={{
                background: C.borderMuted,
                borderRadius: 6,
                height: 16,
                width: '60%',
                marginBottom: 10,
                animation: 'pulse 1.5s infinite',
              }}
            />
            <div
              style={{
                background: C.borderMuted,
                borderRadius: 6,
                height: 12,
                width: '40%',
                marginBottom: 8,
              }}
            />
            <div
              style={{
                background: C.borderMuted,
                borderRadius: 6,
                height: 12,
                width: '55%',
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  // ── 렌더 ──────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── 상단 헤더 ── */}
      <div
        style={{
          borderBottom: `1px solid ${C.border}`,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: C.card,
          flexShrink: 0,
        }}
      >
        {/* 뒤로가기 버튼 */}
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.textSecondary,
            padding: '6px 12px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} />
          뒤로
        </button>

        {/* 타이틀 + 카운트 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Building2 size={20} style={{ color: C.accent }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>업체 관리</span>
          <span
            style={{
              background: 'rgba(88,166,255,0.15)',
              color: C.accent,
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {total}개
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* API 오프라인 배지 */}
        {apiOffline && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(210,153,34,0.12)',
              border: `1px solid ${C.orange}`,
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: 11,
              color: C.orange,
            }}
          >
            <WifiOff size={12} />
            데모 모드
          </div>
        )}

        {/* 검색 */}
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: C.textMuted,
            }}
          />
          <input
            type="text"
            placeholder="업체명, 코드, 담당자 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 30, width: 220 }}
          />
        </div>

        {/* 뷰 모드 토글 */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: C.bg,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            padding: 3,
          }}
        >
          <button
            onClick={() => setViewMode('card')}
            title="카드 뷰"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'card' ? C.accent : 'transparent',
              color: viewMode === 'card' ? '#0D1117' : C.textSecondary,
              cursor: 'pointer',
            }}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            title="테이블 뷰"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'table' ? C.accent : 'transparent',
              color: viewMode === 'table' ? '#0D1117' : C.textSecondary,
              cursor: 'pointer',
            }}
          >
            <List size={14} />
          </button>
        </div>

        {/* 기사 관리 버튼 */}
        {onDrivers && (
          <button
            onClick={onDrivers}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            기사 관리
          </button>
        )}

        {/* 신규 등록 버튼 */}
        <button
          onClick={onCreateNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: C.accent,
            border: 'none',
            borderRadius: 8,
            color: '#0D1117',
            padding: '7px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          신규 등록
        </button>
      </div>

      {/* ── 필터 바 ── */}
      <div
        style={{
          borderBottom: `1px solid ${C.border}`,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#0F1319',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* 유형 탭 */}
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            style={btnStyle(typeFilter === tab.key)}
          >
            {tab.label}
            <span
              style={{
                marginLeft: 5,
                background: typeFilter === tab.key ? 'rgba(0,0,0,0.2)' : C.borderMuted,
                borderRadius: 10,
                padding: '0 5px',
                fontSize: 10,
              }}
            >
              {typeCounts[tab.key]}
            </span>
          </button>
        ))}

        <div
          style={{
            width: 1,
            height: 20,
            background: C.border,
            margin: '0 4px',
          }}
        />

        {/* 활성 토글 */}
        <button
          onClick={() => setShowActiveOnly((prev) => !prev)}
          style={{
            ...btnStyle(showActiveOnly),
            background: showActiveOnly ? 'rgba(63,185,80,0.15)' : 'transparent',
            color: showActiveOnly ? C.green : C.textSecondary,
            borderColor: showActiveOnly ? C.green : C.border,
          }}
        >
          활성만 보기
        </button>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 12, color: C.textMuted }}>
          총 {total}개 업체
        </span>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        {loading ? (
          renderSkeleton()
        ) : partners.length === 0 ? (
          // 빈 상태
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 0',
              gap: 16,
            }}
          >
            <Building2 size={48} style={{ color: C.textMuted }} />
            <p style={{ color: C.textMuted, fontSize: 14 }}>
              {search || typeFilter !== 'ALL' ? '조건에 맞는 업체가 없습니다' : '등록된 업체가 없습니다'}
            </p>
            {!search && typeFilter === 'ALL' && (
              <button
                onClick={onCreateNew}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: C.accent,
                  border: 'none',
                  borderRadius: 8,
                  color: '#0D1117',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                첫 번째 업체 등록
              </button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          // 카드 그리드
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {partners.map(renderCard)}
          </div>
        ) : (
          // 테이블 뷰
          renderTable()
        )}
      </div>

      {/* ── 페이지네이션 ── */}
      {!loading && total > PAGE_SIZE && (
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: C.card,
            flexShrink: 0,
          }}
        >
          {/* 이전 페이지 */}
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: page <= 1 ? C.textMuted : C.textSecondary,
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} />
          </button>

          {/* 페이지 번호 */}
          {Array.from({ length: totalPages }).map((_, i) => {
            const pg = i + 1;
            const isActive = pg === page;
            // 현재 페이지 주변 3페이지만 표시
            if (
              pg === 1 ||
              pg === totalPages ||
              (pg >= page - 1 && pg <= page + 1)
            ) {
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: `1px solid ${isActive ? C.accent : C.border}`,
                    background: isActive ? C.accent : 'transparent',
                    color: isActive ? '#0D1117' : C.textSecondary,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {pg}
                </button>
              );
            }
            // 생략 부호
            if (pg === page - 2 || pg === page + 2) {
              return (
                <span key={pg} style={{ color: C.textMuted, fontSize: 13 }}>
                  …
                </span>
              );
            }
            return null;
          })}

          {/* 다음 페이지 */}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: page >= totalPages ? C.textMuted : C.textSecondary,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronRight size={14} />
          </button>

          <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>
            {page} / {totalPages} 페이지
          </span>
        </div>
      )}
    </div>
  );
}
