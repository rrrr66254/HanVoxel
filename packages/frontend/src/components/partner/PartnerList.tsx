/**
 * 업체 관리 목록 페이지
 * 탭: 전체 / 매입처 / 매출처
 * 뷰: 카드뷰 / 테이블뷰
 * 검색: 업체명 / 사업자번호
 */
import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Building2,
  Factory,
  Truck,
  Phone,
  Clock,
  Award,
  TrendingUp,
  ChevronRight,
  Users,
} from 'lucide-react';

// ── 타입 정의 ──────────────────────────────────────────
type PartnerType = 'SUPPLIER' | 'CUSTOMER' | 'BOTH';
type TabKey = 'ALL' | 'SUPPLIER' | 'CUSTOMER';
type ViewMode = 'card' | 'table';
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type GradeFilter = 'ALL' | 'A' | 'B' | 'C' | 'D';

interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  bizNo: string;
  contactName: string;
  contactPhone: string;
  address: string;
  monthlyPurchase: number;
  totalPurchase: number;
  monthlySales: number;
  totalSales: number;
  deliveryRate: number | null;
  qualityGrade: string | null;
  avgLeadTimeDays: number | null;
  lastTransactionDate: string;
  isActive: boolean;
  creditScore: number;
}

// ── 신용 점수 계산 ──────────────────────────────────────
/** 품질등급을 점수로 변환 */
function qualityGradeScore(grade: string | null): number {
  if (!grade) return 0;
  if (grade === 'A+' || grade === 'A') return 100;
  if (grade === 'B+' || grade === 'B') return 75;
  if (grade === 'C') return 50;
  return 25;
}

/** 최근 거래일 기준 점수 계산 */
function transactionRecencyScore(dateStr: string): number {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 30) return 100;
  if (diffDays <= 60) return 70;
  if (diffDays <= 90) return 40;
  return 10;
}

/** 매입처(공급업체) 신용 점수 계산 */
function calcSupplierCreditScore(p: Omit<Partner, 'creditScore'>): number {
  const delivery = (p.deliveryRate ?? 0) * 0.4;
  const quality = qualityGradeScore(p.qualityGrade) * 0.3;
  const recency = transactionRecencyScore(p.lastTransactionDate) * 0.2;
  return Math.round(delivery + quality + recency + 10);
}

/** 매출처(고객사) 신용 점수 계산 — 거래 최근성 + 총 매출 규모 기반 */
function calcCustomerCreditScore(p: Omit<Partner, 'creditScore'>): number {
  const recency = transactionRecencyScore(p.lastTransactionDate);
  // 누적 매출 1억 이상 = 100, 5000만 이상 = 75, 1000만 이상 = 50, 그 외 25
  let volumeScore = 25;
  if (p.totalSales >= 100000000) volumeScore = 100;
  else if (p.totalSales >= 50000000) volumeScore = 75;
  else if (p.totalSales >= 10000000) volumeScore = 50;
  return Math.round(recency * 0.5 + volumeScore * 0.5);
}

/** 신용 점수 뱃지 정보 */
function creditBadgeInfo(score: number): { label: string; bg: string; color: string } {
  if (score >= 80) return { label: '우수', bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' };
  if (score >= 60) return { label: '양호', bg: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' };
  if (score >= 40) return { label: '주의', bg: 'rgba(245,158,11,0.15)', color: 'var(--accent-orange)' };
  return { label: '위험', bg: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' };
}

interface PartnerListProps {
  onBack: () => void;
  onSelectPartner?: (id: string) => void;
  onAddPartner?: () => void;
}

// ── Mock 데이터 (신용 점수 포함) ────────────────────────
const MOCK_PARTNERS_RAW: Omit<Partner, 'creditScore'>[] = [
  {
    id: 'p-1', name: '현대모비스', type: 'CUSTOMER', bizNo: '123-45-67890',
    contactName: '김철수', contactPhone: '010-1234-5678', address: '서울시 강남구 테헤란로 330',
    monthlyPurchase: 0, totalPurchase: 0, monthlySales: 48000000, totalSales: 212000000,
    deliveryRate: null, qualityGrade: null, avgLeadTimeDays: null,
    lastTransactionDate: '2026-03-15', isActive: true,
  },
  {
    id: 'p-2', name: '강남철강(주)', type: 'SUPPLIER', bizNo: '234-56-78901',
    contactName: '이영희', contactPhone: '031-456-7890', address: '인천시 남동구 논현로 201',
    monthlyPurchase: 12000000, totalPurchase: 84000000, monthlySales: 0, totalSales: 0,
    deliveryRate: 94, qualityGrade: 'A', avgLeadTimeDays: 4.8,
    lastTransactionDate: '2026-03-12', isActive: true,
  },
  {
    id: 'p-3', name: 'CJ대한통운', type: 'CUSTOMER', bizNo: '345-67-89012',
    contactName: '박민수', contactPhone: '02-3456-7890', address: '서울시 중구 세종대로 39',
    monthlyPurchase: 0, totalPurchase: 0, monthlySales: 35000000, totalSales: 156000000,
    deliveryRate: null, qualityGrade: null, avgLeadTimeDays: null,
    lastTransactionDate: '2026-03-16', isActive: true,
  },
  {
    id: 'p-4', name: '삼성SDI', type: 'BOTH', bizNo: '456-78-90123',
    contactName: '최지원', contactPhone: '031-789-0123', address: '경기도 용인시 기흥구 삼성로 150',
    monthlyPurchase: 28000000, totalPurchase: 195000000, monthlySales: 15000000, totalSales: 98000000,
    deliveryRate: 97, qualityGrade: 'A+', avgLeadTimeDays: 3.2,
    lastTransactionDate: '2026-03-17', isActive: true,
  },
  {
    id: 'p-5', name: '한국포장공업', type: 'SUPPLIER', bizNo: '567-89-01234',
    contactName: '정수현', contactPhone: '032-567-8901', address: '인천시 서구 청라대로 102',
    monthlyPurchase: 5600000, totalPurchase: 42000000, monthlySales: 0, totalSales: 0,
    deliveryRate: 88, qualityGrade: 'B+', avgLeadTimeDays: 6.1,
    lastTransactionDate: '2026-03-10', isActive: true,
  },
  {
    id: 'p-6', name: 'LG화학', type: 'SUPPLIER', bizNo: '678-90-12345',
    contactName: '오진우', contactPhone: '02-678-9012', address: '서울시 영등포구 여의대로 128',
    monthlyPurchase: 45000000, totalPurchase: 320000000, monthlySales: 0, totalSales: 0,
    deliveryRate: 96, qualityGrade: 'A', avgLeadTimeDays: 5.5,
    lastTransactionDate: '2026-03-14', isActive: true,
  },
  {
    id: 'p-7', name: '쿠팡 풀필먼트', type: 'CUSTOMER', bizNo: '789-01-23456',
    contactName: '한지민', contactPhone: '02-789-0123', address: '경기도 이천시 부발읍 경충대로 2091',
    monthlyPurchase: 0, totalPurchase: 0, monthlySales: 62000000, totalSales: 410000000,
    deliveryRate: null, qualityGrade: null, avgLeadTimeDays: null,
    lastTransactionDate: '2026-03-18', isActive: true,
  },
  {
    id: 'p-8', name: '포스코', type: 'SUPPLIER', bizNo: '890-12-34567',
    contactName: '서재혁', contactPhone: '054-220-0114', address: '경북 포항시 남구 동해안로 6261',
    monthlyPurchase: 32000000, totalPurchase: 248000000, monthlySales: 0, totalSales: 0,
    deliveryRate: 92, qualityGrade: 'A', avgLeadTimeDays: 7.2,
    lastTransactionDate: '2026-03-11', isActive: true,
  },
  {
    id: 'p-9', name: '(주)대한전선', type: 'BOTH', bizNo: '901-23-45678',
    contactName: '윤성민', contactPhone: '02-901-2345', address: '경기도 안양시 동안구 시민대로 401',
    monthlyPurchase: 8500000, totalPurchase: 67000000, monthlySales: 22000000, totalSales: 134000000,
    deliveryRate: 91, qualityGrade: 'B+', avgLeadTimeDays: 5.0,
    lastTransactionDate: '2026-03-13', isActive: true,
  },
  {
    id: 'p-10', name: '롯데글로벌로지스', type: 'CUSTOMER', bizNo: '012-34-56789',
    contactName: '강예진', contactPhone: '02-012-3456', address: '서울시 송파구 올림픽로 300',
    monthlyPurchase: 0, totalPurchase: 0, monthlySales: 18000000, totalSales: 72000000,
    deliveryRate: null, qualityGrade: null, avgLeadTimeDays: null,
    lastTransactionDate: '2026-03-09', isActive: false,
  },
];

// 신용 점수를 자동 계산하여 Partner 배열 생성
const MOCK_PARTNERS: Partner[] = MOCK_PARTNERS_RAW.map((p) => {
  const isSupplier = p.type === 'SUPPLIER' || p.type === 'BOTH';
  const creditScore = isSupplier
    ? calcSupplierCreditScore(p)
    : calcCustomerCreditScore(p);
  return { ...p, creditScore };
});

// ── 탭 설정 ────────────────────────────────────────────
const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: 'ALL', label: '전체', icon: Users },
  { key: 'SUPPLIER', label: '매입처', icon: Factory },
  { key: 'CUSTOMER', label: '매출처', icon: Truck },
];

// ── 유틸 함수 ──────────────────────────────────────────
/** 금액을 한국식으로 포맷 (만원, 억원) */
function formatKrw(amount: number): string {
  if (amount === 0) return '0원';
  const absAmount = Math.abs(amount);
  if (absAmount >= 100000000) {
    const eok = Math.floor(absAmount / 100000000);
    const man = Math.floor((absAmount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  if (absAmount >= 10000) {
    const man = Math.floor(absAmount / 10000);
    return `${man.toLocaleString()}만원`;
  }
  return `${absAmount.toLocaleString()}원`;
}

/** 날짜를 "N일 전" 형식으로 변환 */
function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${diff}일 전`;
}

/** 유형 라벨 */
function typeLabel(type: PartnerType): string {
  switch (type) {
    case 'SUPPLIER': return '매입처';
    case 'CUSTOMER': return '매출처';
    case 'BOTH': return '매입/매출';
  }
}

/** 유형 뱃지 색상 */
function typeBadgeColor(type: PartnerType): { bg: string; text: string } {
  switch (type) {
    case 'SUPPLIER': return { bg: 'rgba(59,130,246,0.15)', text: 'var(--accent-blue)' };
    case 'CUSTOMER': return { bg: 'rgba(16,185,129,0.15)', text: 'var(--accent-green)' };
    case 'BOTH': return { bg: 'rgba(168,85,247,0.15)', text: 'var(--accent-purple)' };
  }
}

/** 품질 등급 색상 */
function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'var(--accent-green)';
  if (grade.startsWith('B')) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}

// ── 컴포넌트 ───────────────────────────────────────────
export function PartnerList({ onBack, onSelectPartner, onAddPartner }: PartnerListProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('ALL');

  // 필터링된 업체 목록
  const filtered = useMemo(() => {
    return MOCK_PARTNERS.filter((p) => {
      // 탭 필터
      if (activeTab === 'SUPPLIER' && p.type !== 'SUPPLIER' && p.type !== 'BOTH') return false;
      if (activeTab === 'CUSTOMER' && p.type !== 'CUSTOMER' && p.type !== 'BOTH') return false;

      // 활성/비활성 필터
      if (activeFilter === 'ACTIVE' && !p.isActive) return false;
      if (activeFilter === 'INACTIVE' && p.isActive) return false;

      // 품질등급 필터 (매입처 전용, 매출처는 등급 없으므로 통과)
      if (gradeFilter !== 'ALL') {
        const isSupplier = p.type === 'SUPPLIER' || p.type === 'BOTH';
        if (isSupplier) {
          if (!p.qualityGrade || !p.qualityGrade.startsWith(gradeFilter)) return false;
        }
      }

      // 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.bizNo.includes(q)
        );
      }
      return true;
    });
  }, [activeTab, searchQuery, activeFilter, gradeFilter]);

  // 탭별 카운트
  const counts = useMemo(() => ({
    ALL: MOCK_PARTNERS.length,
    SUPPLIER: MOCK_PARTNERS.filter((p) => p.type === 'SUPPLIER' || p.type === 'BOTH').length,
    CUSTOMER: MOCK_PARTNERS.filter((p) => p.type === 'CUSTOMER' || p.type === 'BOTH').length,
  }), []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '24px',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            업체 관리
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            매입처 / 매출처 통합 관리
          </p>
        </div>
        <button
          onClick={onAddPartner}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--accent-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          업체 추가
        </button>
      </div>

      {/* 탭 + 검색 + 뷰 토글 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {/* 탭 */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'var(--bg-secondary)',
          borderRadius: 10,
          padding: 4,
          border: '1px solid var(--border-default)',
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? 'var(--accent-blue)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                {tab.label}
                <span style={{
                  fontSize: 11,
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)',
                  borderRadius: 10,
                  padding: '2px 7px',
                  marginLeft: 2,
                }}>
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* 검색 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '8px 12px',
            minWidth: 240,
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="업체명 / 사업자번호 검색"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 13,
                width: '100%',
              }}
            />
          </div>

          {/* 거래 활성/비활성 필터 */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">전체 상태</option>
            <option value="ACTIVE">활성</option>
            <option value="INACTIVE">비활성</option>
          </select>

          {/* 품질등급 필터 (매입처 탭일 때만 표시) */}
          {(activeTab === 'SUPPLIER' || activeTab === 'ALL') && (
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value as GradeFilter)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">전체 등급</option>
              <option value="A">A등급</option>
              <option value="B">B등급</option>
              <option value="C">C등급</option>
              <option value="D">D등급</option>
            </select>
          )}

          {/* 뷰 토글 */}
          <div style={{
            display: 'flex',
            gap: 2,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: 3,
          }}>
            {[
              { mode: 'card' as ViewMode, icon: LayoutGrid },
              { mode: 'table' as ViewMode, icon: List },
            ].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === mode ? 'var(--accent-blue)' : 'transparent',
                  color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 결과 카운트 */}
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        검색 결과: {filtered.length}개 업체
      </p>

      {/* 뷰 분기 */}
      {viewMode === 'card' ? (
        <CardView partners={filtered} onSelect={onSelectPartner} />
      ) : (
        <TableView partners={filtered} onSelect={onSelectPartner} />
      )}
    </div>
  );
}

// ── 카드 뷰 ────────────────────────────────────────────
function CardView({
  partners,
  onSelect,
}: {
  partners: Partner[];
  onSelect?: (id: string) => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 16,
    }}>
      {partners.map((p) => (
        <PartnerCard key={p.id} partner={p} onSelect={onSelect} />
      ))}
    </div>
  );
}

function PartnerCard({
  partner: p,
  onSelect,
}: {
  partner: Partner;
  onSelect?: (id: string) => void;
}) {
  const badge = typeBadgeColor(p.type);
  const isSupplier = p.type === 'SUPPLIER' || p.type === 'BOTH';
  const isCustomer = p.type === 'CUSTOMER' || p.type === 'BOTH';

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        padding: 20,
        transition: 'border-color 0.15s',
        opacity: p.isActive ? 1 : 0.6,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-muted)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)';
      }}
    >
      {/* 상단: 업체명 + 유형 뱃지 */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: badge.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isSupplier && !isCustomer ? (
              <Factory size={18} style={{ color: badge.text }} />
            ) : isCustomer && !isSupplier ? (
              <Building2 size={18} style={{ color: badge.text }} />
            ) : (
              <Users size={18} style={{ color: badge.text }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
              {p.name}
            </div>
            {!p.isActive && (
              <span style={{
                fontSize: 11,
                color: 'var(--accent-red)',
                fontWeight: 500,
              }}>
                비활성
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* 신용 점수 뱃지 */}
          {(() => {
            const cb = creditBadgeInfo(p.creditScore);
            return (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 12,
                background: cb.bg,
                color: cb.color,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}>
                <Award size={10} />
                {cb.label} {p.creditScore}
              </span>
            );
          })()}
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 12,
            background: badge.bg,
            color: badge.text,
            whiteSpace: 'nowrap',
          }}>
            {typeLabel(p.type)}
          </span>
        </div>
      </div>

      {/* 담당자 정보 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        color: 'var(--text-secondary)',
        marginBottom: 16,
      }}>
        <Phone size={12} style={{ color: 'var(--text-muted)' }} />
        {p.contactName} / {p.contactPhone}
      </div>

      {/* 거래 금액 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 16,
      }}>
        {isCustomer && (
          <>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                이번 달 매출
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>
                {formatKrw(p.monthlySales)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                누적 매출
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {formatKrw(p.totalSales)}
              </div>
            </div>
          </>
        )}
        {isSupplier && (
          <>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                이번 달 매입
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)' }}>
                {formatKrw(p.monthlyPurchase)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                누적 매입
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {formatKrw(p.totalPurchase)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 공급업체 전용: 납기 준수율 / 품질 등급 / 리드타임 */}
      {isSupplier && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: p.type === 'BOTH' ? '1fr 1fr' : '1fr 1fr',
          gap: 12,
          marginBottom: 16,
        }}>
          {p.deliveryRate !== null && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                납기 준수율
              </div>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: p.deliveryRate >= 95
                  ? 'var(--accent-green)'
                  : p.deliveryRate >= 90
                    ? 'var(--accent-orange)'
                    : 'var(--accent-red)',
              }}>
                {p.deliveryRate}%
              </div>
            </div>
          )}
          {p.qualityGrade !== null && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                품질 등급
              </div>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: gradeColor(p.qualityGrade),
              }}>
                {p.qualityGrade}등급
              </div>
            </div>
          )}
        </div>
      )}

      {/* 하단: 최근 거래 + 리드타임 + 상세보기 */}
      <div style={{
        borderTop: '1px solid var(--border-default)',
        paddingTop: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            <Clock size={12} />
            최근 거래: {daysAgo(p.lastTransactionDate)}
          </div>
          {isSupplier && p.avgLeadTimeDays !== null && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}>
              <TrendingUp size={12} />
              리드타임: {p.avgLeadTimeDays}일
            </div>
          )}
        </div>
        <button
          onClick={() => onSelect?.(p.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            color: 'var(--accent-blue)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          상세보기
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── 테이블 뷰 ──────────────────────────────────────────
function TableView({
  partners,
  onSelect,
}: {
  partners: Partner[];
  onSelect?: (id: string) => void;
}) {
  const columns = ['업체명', '유형', '담당자', '이번달 거래액', '누적 거래액', '납기율', '상태'];

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-default)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    background: 'var(--bg-primary)',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partners.map((p, idx) => {
              const badge = typeBadgeColor(p.type);
              const isSupplier = p.type === 'SUPPLIER' || p.type === 'BOTH';
              const isCustomer = p.type === 'CUSTOMER' || p.type === 'BOTH';

              // 이번달 주요 거래액 (매입 or 매출 중 큰 쪽)
              const monthlyAmount = isCustomer
                ? p.monthlySales
                : p.monthlyPurchase;
              const totalAmount = isCustomer
                ? p.totalSales
                : p.totalPurchase;

              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect?.(p.id)}
                  style={{
                    borderBottom: idx < partners.length - 1 ? '1px solid var(--border-default)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  {/* 업체명 */}
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {p.name}
                    </div>
                  </td>
                  {/* 유형 */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 12,
                      background: badge.bg,
                      color: badge.text,
                      whiteSpace: 'nowrap',
                    }}>
                      {typeLabel(p.type)}
                    </span>
                  </td>
                  {/* 담당자 */}
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {p.contactName}
                  </td>
                  {/* 이번달 거래액 */}
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {formatKrw(monthlyAmount)}
                  </td>
                  {/* 누적 거래액 */}
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {formatKrw(totalAmount)}
                  </td>
                  {/* 납기율 */}
                  <td style={{ padding: '12px 16px' }}>
                    {p.deliveryRate !== null ? (
                      <span style={{
                        fontWeight: 600,
                        color: p.deliveryRate >= 95
                          ? 'var(--accent-green)'
                          : p.deliveryRate >= 90
                            ? 'var(--accent-orange)'
                            : 'var(--accent-red)',
                      }}>
                        {p.deliveryRate}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  {/* 상태 */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      color: p.isActive ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}>
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: p.isActive ? 'var(--accent-green)' : 'var(--accent-red)',
                      }} />
                      {p.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
