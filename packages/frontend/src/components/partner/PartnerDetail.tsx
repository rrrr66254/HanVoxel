/**
 * 거래처 상세 정보 패널
 * 탭: 기본정보 | 거래현황 | 품질/납기 | 미수금/미지급
 */
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import {
  ArrowLeft, Edit, Building2, Phone, Mail, MapPin,
  CreditCard, Tag, StickyNote, TrendingUp, TrendingDown,
  Calendar, Package, AlertTriangle, Clock, CheckCircle,
  XCircle, DollarSign, Truck, ClipboardCheck, Users,
  Star, FileText,
} from 'lucide-react';

// ── 타입 정의 ──────────────────────────────────────────
type PartnerType = 'SUPPLIER' | 'CUSTOMER' | 'BOTH';
type TabKey = 'info' | 'transactions' | 'quality' | 'receivables';
type PeriodFilter = 'month' | '3month' | '6month' | '1year' | 'all';

interface ContactPerson {
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

interface BankAccount {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

interface Transaction {
  date: string;
  type: '입고' | '출고';
  item: string;
  qty: number;
  amount: number;
  status: '완료' | '진행중' | '취소';
}

interface QcRecord {
  date: string;
  lotNo: string;
  item: string;
  totalQty: number;
  defectQty: number;
  defectRate: number;
  result: '합격' | '불합격' | '조건부';
}

interface Outstanding {
  voucherNo: string;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainAmount: number;
  overdueDays: number;
}

interface PartnerMockData {
  id: string;
  name: string;
  code: string;
  type: PartnerType;
  bizNo: string;
  ceoName: string;
  bizType: string;
  bizCategory: string;
  address: string;
  shippingAddress: string;
  phone: string;
  fax: string;
  creditScore: number;
  tags: string[];
  memo: string;
  contacts: ContactPerson[];
  bankAccounts: BankAccount[];
  totalTransaction: number;
  monthlyTransaction: number;
  outstanding: number;
  lastTransactionDate: string;
  monthlyChartData: { month: string; amount: number }[];
  transactions: Transaction[];
  deliveryRateData: { month: string; rate: number }[];
  avgLeadTime: number;
  minLeadTime: number;
  maxLeadTime: number;
  qcRecords: QcRecord[];
  outstandingList: Outstanding[];
}

// ── Mock 데이터 (한국 자동차 부품 공급업체) ────────────────
const MOCK_PARTNER: PartnerMockData = {
  id: 'partner-001',
  name: '(주)한진오토파츠',
  code: 'SUP-0012',
  type: 'SUPPLIER',
  bizNo: '128-86-45123',
  ceoName: '김정훈',
  bizType: '제조업',
  bizCategory: '자동차부품',
  address: '경기도 화성시 동탄산단로 158, 한진빌딩 3층',
  shippingAddress: '경기도 평택시 포승읍 평택항로 210, 물류센터 B동',
  phone: '031-8015-7890',
  fax: '031-8015-7891',
  creditScore: 82,
  tags: ['자동차부품', '1차협력사', 'ISO9001', 'IATF16949'],
  memo: '2024년 신규 등록 업체. 브레이크 패드 및 디스크 전문. 현대·기아 1차 협력사. 월 납품 한도 5억 원.',
  contacts: [
    { name: '박영수', department: '영업부', position: '부장', phone: '010-3456-7890', email: 'park.ys@hanjinap.co.kr', isPrimary: true },
    { name: '이수진', department: '영업부', position: '대리', phone: '010-8765-4321', email: 'lee.sj@hanjinap.co.kr', isPrimary: false },
    { name: '최민호', department: '품질관리부', position: '과장', phone: '010-5678-1234', email: 'choi.mh@hanjinap.co.kr', isPrimary: false },
    { name: '정혜원', department: '경리부', position: '과장', phone: '010-2345-6789', email: 'jung.hw@hanjinap.co.kr', isPrimary: false },
  ],
  bankAccounts: [
    { bank: '국민은행', accountNumber: '123-456-789012', accountHolder: '(주)한진오토파츠' },
    { bank: '기업은행', accountNumber: '456-012345-01-019', accountHolder: '(주)한진오토파츠' },
  ],
  totalTransaction: 2847000000,
  monthlyTransaction: 312000000,
  outstanding: 156000000,
  lastTransactionDate: '2026-03-15',
  monthlyChartData: [
    { month: '2025-04', amount: 198000000 },
    { month: '2025-05', amount: 245000000 },
    { month: '2025-06', amount: 267000000 },
    { month: '2025-07', amount: 189000000 },
    { month: '2025-08', amount: 312000000 },
    { month: '2025-09', amount: 278000000 },
    { month: '2025-10', amount: 345000000 },
    { month: '2025-11', amount: 301000000 },
    { month: '2025-12', amount: 256000000 },
    { month: '2026-01', amount: 223000000 },
    { month: '2026-02', amount: 289000000 },
    { month: '2026-03', amount: 312000000 },
  ],
  transactions: [
    { date: '2026-03-15', type: '입고', item: '브레이크 패드 (HJ-BP4510)', qty: 2000, amount: 86000000, status: '완료' },
    { date: '2026-03-12', type: '입고', item: '디스크 로터 (HJ-DR2200)', qty: 500, amount: 125000000, status: '완료' },
    { date: '2026-03-08', type: '입고', item: '브레이크 캘리퍼 (HJ-BC330)', qty: 300, amount: 54000000, status: '진행중' },
    { date: '2026-03-01', type: '입고', item: '브레이크 패드 (HJ-BP4510)', qty: 1500, amount: 64500000, status: '완료' },
    { date: '2026-02-25', type: '입고', item: '브레이크 호스 (HJ-BH110)', qty: 3000, amount: 27000000, status: '완료' },
    { date: '2026-02-18', type: '입고', item: '디스크 로터 (HJ-DR2200)', qty: 800, amount: 200000000, status: '완료' },
    { date: '2026-02-10', type: '입고', item: '마스터 실린더 (HJ-MC550)', qty: 200, amount: 46000000, status: '완료' },
    { date: '2026-01-28', type: '입고', item: '브레이크 패드 (HJ-BP4510)', qty: 1800, amount: 77400000, status: '완료' },
  ],
  deliveryRateData: [
    { month: '2025-04', rate: 94.2 },
    { month: '2025-05', rate: 96.1 },
    { month: '2025-06', rate: 92.8 },
    { month: '2025-07', rate: 97.5 },
    { month: '2025-08', rate: 95.3 },
    { month: '2025-09', rate: 98.1 },
    { month: '2025-10', rate: 96.7 },
    { month: '2025-11', rate: 93.4 },
    { month: '2025-12', rate: 97.8 },
    { month: '2026-01', rate: 95.9 },
    { month: '2026-02', rate: 98.5 },
    { month: '2026-03', rate: 96.2 },
  ],
  avgLeadTime: 4.8,
  minLeadTime: 3,
  maxLeadTime: 7,
  qcRecords: [
    { date: '2026-03-15', lotNo: 'LOT-20260315-001', item: '브레이크 패드 (HJ-BP4510)', totalQty: 2000, defectQty: 12, defectRate: 0.6, result: '합격' },
    { date: '2026-03-12', lotNo: 'LOT-20260312-001', item: '디스크 로터 (HJ-DR2200)', totalQty: 500, defectQty: 3, defectRate: 0.6, result: '합격' },
    { date: '2026-03-08', lotNo: 'LOT-20260308-001', item: '브레이크 캘리퍼 (HJ-BC330)', totalQty: 300, defectQty: 8, defectRate: 2.67, result: '조건부' },
    { date: '2026-03-01', lotNo: 'LOT-20260301-001', item: '브레이크 패드 (HJ-BP4510)', totalQty: 1500, defectQty: 6, defectRate: 0.4, result: '합격' },
    { date: '2026-02-25', lotNo: 'LOT-20260225-001', item: '브레이크 호스 (HJ-BH110)', totalQty: 3000, defectQty: 45, defectRate: 1.5, result: '조건부' },
    { date: '2026-02-18', lotNo: 'LOT-20260218-001', item: '디스크 로터 (HJ-DR2200)', totalQty: 800, defectQty: 2, defectRate: 0.25, result: '합격' },
  ],
  outstandingList: [
    { voucherNo: 'PUR-20260315-001', date: '2026-03-15', dueDate: '2026-04-15', amount: 86000000, paidAmount: 0, remainAmount: 86000000, overdueDays: 0 },
    { voucherNo: 'PUR-20260312-001', date: '2026-03-12', dueDate: '2026-04-12', amount: 125000000, paidAmount: 50000000, remainAmount: 75000000, overdueDays: 0 },
    { voucherNo: 'PUR-20260208-002', date: '2026-02-08', dueDate: '2026-03-08', amount: 54000000, paidAmount: 30000000, remainAmount: 24000000, overdueDays: 10 },
    { voucherNo: 'PUR-20260115-003', date: '2026-01-15', dueDate: '2026-02-15', amount: 77400000, paidAmount: 45000000, remainAmount: 32400000, overdueDays: 31 },
    { voucherNo: 'PUR-20251218-001', date: '2025-12-18', dueDate: '2026-01-18', amount: 46000000, paidAmount: 46000000, remainAmount: 0, overdueDays: 0 },
  ],
};

// ── 금액 포맷 함수 (한국식) ────────────────────────────────
function formatKrw(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 100000000) {
    const eok = abs / 100000000;
    return `${amount < 0 ? '-' : ''}${eok.toFixed(1)}억원`;
  }
  if (abs >= 10000) {
    const man = abs / 10000;
    return `${amount < 0 ? '-' : ''}${man.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원`;
  }
  return `${amount.toLocaleString('ko-KR')}원`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// ── 신용점수 배지 ──────────────────────────────────────
function getCreditBadge(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: '우수', color: 'var(--accent-green)', bg: 'rgba(63, 185, 80, 0.15)' };
  if (score >= 60) return { label: '양호', color: 'var(--accent-blue)', bg: 'rgba(45, 125, 210, 0.15)' };
  if (score >= 40) return { label: '주의', color: 'var(--accent-orange)', bg: 'rgba(210, 153, 34, 0.15)' };
  return { label: '위험', color: 'var(--accent-red)', bg: 'rgba(248, 81, 73, 0.15)' };
}

// ── 스타일 상수 ────────────────────────────────────────
const styles = {
  panel: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-secondary)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  } as React.CSSProperties,
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid var(--border-default)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  } as React.CSSProperties,
  tabBar: {
    display: 'flex',
    gap: 0,
    padding: '0 24px',
    borderBottom: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-secondary)',
  } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
    borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: active ? 'var(--accent-blue)' : 'transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }),
  content: {
    padding: 24,
  } as React.CSSProperties,
  card: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 12,
    border: '1px solid var(--border-default)',
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  } as React.CSSProperties,
  th: {
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border-default)',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-muted)',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 20,
  } as React.CSSProperties,
  kpiCard: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 12,
    border: '1px solid var(--border-default)',
    padding: 16,
  } as React.CSSProperties,
  kpiLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginBottom: 4,
  } as React.CSSProperties,
  kpiValue: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  infoRow: {
    display: 'flex',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-muted)',
    fontSize: 13,
  } as React.CSSProperties,
  infoLabel: {
    width: 120,
    flexShrink: 0,
    color: 'var(--text-muted)',
    fontWeight: 500,
  } as React.CSSProperties,
  infoValue: {
    color: 'var(--text-primary)',
    flex: 1,
  } as React.CSSProperties,
  badge: (color: string, bg: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color,
    backgroundColor: bg,
  }),
  filterBtn: (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    color: active ? '#fff' : 'var(--text-secondary)',
    backgroundColor: active ? 'var(--accent-blue)' : 'transparent',
    border: active ? 'none' : '1px solid var(--border-default)',
    cursor: 'pointer',
  }),
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(45, 125, 210, 0.12)',
    marginRight: 6,
    marginBottom: 4,
  } as React.CSSProperties,
  overdueWarning: (level: 'low' | 'mid' | 'high'): React.CSSProperties => {
    const colors = {
      low: { color: 'var(--accent-orange)', bg: 'rgba(210, 153, 34, 0.12)' },
      mid: { color: 'var(--accent-red)', bg: 'rgba(248, 81, 73, 0.10)' },
      high: { color: '#ff4444', bg: 'rgba(255, 68, 68, 0.15)' },
    };
    const c = colors[level];
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      color: c.color,
      backgroundColor: c.bg,
    };
  },
} as const;

// ── 컴포넌트 Props ─────────────────────────────────────
interface PartnerDetailProps {
  partnerId: string;
  onBack: () => void;
  onEdit?: (id: string) => void;
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export function PartnerDetail({ partnerId, onBack, onEdit }: PartnerDetailProps) {
  // Mock 데이터 사용 (partnerId 무시, 실제 구현 시 API 호출)
  const partner = useMemo(() => ({ ...MOCK_PARTNER, id: partnerId }), [partnerId]);

  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('1year');

  // 공급업체가 아닌 경우 품질/납기 탭 숨김
  const isSupplier = partner.type === 'SUPPLIER' || partner.type === 'BOTH';

  const tabs: { key: TabKey; label: string; hidden?: boolean }[] = [
    { key: 'info', label: '기본 정보' },
    { key: 'transactions', label: '거래 현황' },
    { key: 'quality', label: '품질/납기', hidden: !isSupplier },
    { key: 'receivables', label: '미수금/미지급' },
  ];

  // 신용점수 배지
  const credit = getCreditBadge(partner.creditScore);

  // 기간 필터 적용된 거래 내역
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    switch (periodFilter) {
      case 'month': cutoff.setMonth(now.getMonth() - 1); break;
      case '3month': cutoff.setMonth(now.getMonth() - 3); break;
      case '6month': cutoff.setMonth(now.getMonth() - 6); break;
      case '1year': cutoff.setFullYear(now.getFullYear() - 1); break;
      case 'all': cutoff.setFullYear(2000); break;
    }
    return partner.transactions.filter(t => new Date(t.date) >= cutoff);
  }, [partner.transactions, periodFilter]);

  // 기간 필터 적용된 차트 데이터
  const filteredChartData = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    switch (periodFilter) {
      case 'month': cutoff.setMonth(now.getMonth() - 1); break;
      case '3month': cutoff.setMonth(now.getMonth() - 3); break;
      case '6month': cutoff.setMonth(now.getMonth() - 6); break;
      case '1year': cutoff.setFullYear(now.getFullYear() - 1); break;
      case 'all': cutoff.setFullYear(2000); break;
    }
    return partner.monthlyChartData.filter(d => {
      const date = new Date(d.month + '-01');
      return date >= cutoff;
    });
  }, [partner.monthlyChartData, periodFilter]);

  return (
    <div style={styles.panel}>
      {/* ── 헤더 ─────────────────────────────────────── */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} title="뒤로">
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{partner.name}</span>
            <span style={styles.badge(
              partner.type === 'SUPPLIER' ? 'var(--accent-orange)' : 'var(--accent-blue)',
              partner.type === 'SUPPLIER' ? 'rgba(210,153,34,0.15)' : 'rgba(45,125,210,0.15)',
            )}>
              {partner.type === 'SUPPLIER' ? '공급업체' : partner.type === 'CUSTOMER' ? '고객사' : '공급+고객'}
            </span>
            <span style={styles.badge(credit.color, credit.bg)}>
              <Star size={12} style={{ marginRight: 3 }} />
              {credit.label} ({partner.creditScore}점)
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            코드: {partner.code}
          </div>
        </div>
        {onEdit && (
          <button
            style={{
              ...styles.backBtn,
              backgroundColor: 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              width: 'auto',
              padding: '8px 16px',
              gap: 6,
              display: 'flex',
            }}
            onClick={() => onEdit(partner.id)}
          >
            <Edit size={14} />
            <span style={{ fontSize: 13 }}>수정</span>
          </button>
        )}
      </div>

      {/* ── 탭 바 ───────────────────────────────────── */}
      <div style={styles.tabBar}>
        {tabs.filter(t => !t.hidden).map(t => (
          <button
            key={t.key}
            style={styles.tab(activeTab === t.key)}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 탭 컨텐츠 ─────────────────────────────── */}
      <div style={styles.content}>
        {activeTab === 'info' && (
          <InfoTab partner={partner} credit={credit} />
        )}
        {activeTab === 'transactions' && (
          <TransactionTab
            partner={partner}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            filteredTransactions={filteredTransactions}
            filteredChartData={filteredChartData}
          />
        )}
        {activeTab === 'quality' && isSupplier && (
          <QualityTab partner={partner} />
        )}
        {activeTab === 'receivables' && (
          <ReceivablesTab partner={partner} />
        )}
      </div>
    </div>
  );
}

// ── Tab 1: 기본 정보 ────────────────────────────────────
function InfoTab({ partner, credit }: {
  partner: PartnerMockData;
  credit: { label: string; color: string; bg: string };
}) {
  return (
    <>
      {/* 사업자 정보 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <Building2 size={16} color="var(--accent-blue)" />
          사업자 정보
        </div>
        <div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>사업자등록번호</span>
            <span style={styles.infoValue}>{partner.bizNo}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>대표자</span>
            <span style={styles.infoValue}>{partner.ceoName}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>업태</span>
            <span style={styles.infoValue}>{partner.bizType}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>종목</span>
            <span style={styles.infoValue}>{partner.bizCategory}</span>
          </div>
        </div>
      </div>

      {/* 연락처 정보 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <Phone size={16} color="var(--accent-blue)" />
          연락처 정보
        </div>
        <div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>주소</span>
            <span style={styles.infoValue}>
              <MapPin size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {partner.address}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>배송지</span>
            <span style={styles.infoValue}>
              <Truck size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {partner.shippingAddress}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>대표전화</span>
            <span style={styles.infoValue}>{partner.phone}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>팩스</span>
            <span style={styles.infoValue}>{partner.fax}</span>
          </div>
        </div>
      </div>

      {/* 담당자 목록 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <Users size={16} color="var(--accent-blue)" />
          담당자 목록
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>이름</th>
              <th style={styles.th}>부서</th>
              <th style={styles.th}>직책</th>
              <th style={styles.th}>연락처</th>
              <th style={styles.th}>이메일</th>
              <th style={styles.th}>대표</th>
            </tr>
          </thead>
          <tbody>
            {partner.contacts.map((c, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                <td style={{ ...styles.td, fontWeight: c.isPrimary ? 600 : 400, color: c.isPrimary ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {c.name}
                </td>
                <td style={styles.td}>{c.department}</td>
                <td style={styles.td}>{c.position}</td>
                <td style={styles.td}>{c.phone}</td>
                <td style={{ ...styles.td, color: 'var(--accent-blue)' }}>{c.email}</td>
                <td style={styles.td}>
                  {c.isPrimary && (
                    <CheckCircle size={16} color="var(--accent-green)" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 계좌 정보 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <CreditCard size={16} color="var(--accent-blue)" />
          계좌 정보
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>은행</th>
              <th style={styles.th}>계좌번호</th>
              <th style={styles.th}>예금주</th>
            </tr>
          </thead>
          <tbody>
            {partner.bankAccounts.map((a, i) => (
              <tr key={i}>
                <td style={styles.td}>{a.bank}</td>
                <td style={{ ...styles.td, fontFamily: 'monospace' }}>{a.accountNumber}</td>
                <td style={styles.td}>{a.accountHolder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 태그 & 메모 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Tag size={16} color="var(--accent-blue)" />
            태그
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {partner.tags.map((tag, i) => (
              <span key={i} style={styles.tag}>{tag}</span>
            ))}
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <StickyNote size={16} color="var(--accent-blue)" />
            메모
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {partner.memo}
          </p>
        </div>
      </div>
    </>
  );
}

// ── Tab 2: 거래 현황 ────────────────────────────────────
function TransactionTab({
  partner,
  periodFilter,
  setPeriodFilter,
  filteredTransactions,
  filteredChartData,
}: {
  partner: PartnerMockData;
  periodFilter: PeriodFilter;
  setPeriodFilter: (p: PeriodFilter) => void;
  filteredTransactions: Transaction[];
  filteredChartData: { month: string; amount: number }[];
}) {
  const periods: { key: PeriodFilter; label: string }[] = [
    { key: 'month', label: '이번달' },
    { key: '3month', label: '3개월' },
    { key: '6month', label: '6개월' },
    { key: '1year', label: '1년' },
    { key: 'all', label: '전체' },
  ];

  // 차트 바 색상: 공급업체=주황, 고객사=파랑
  const barColor = partner.type === 'CUSTOMER' ? 'var(--accent-blue)' : 'var(--accent-orange)';

  return (
    <>
      {/* KPI 카드 4개 */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>총 거래액</div>
          <div style={styles.kpiValue}>{formatKrw(partner.totalTransaction)}</div>
          <div style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <TrendingUp size={12} /> 전년 대비 +12.3%
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>이번 달 거래액</div>
          <div style={styles.kpiValue}>{formatKrw(partner.monthlyTransaction)}</div>
          <div style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <TrendingUp size={12} /> 전월 대비 +8.0%
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>
            {partner.type === 'CUSTOMER' ? '미수금' : '미지급금'}
          </div>
          <div style={{ ...styles.kpiValue, color: partner.outstanding > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
            {formatKrw(partner.outstanding)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            미결제 {partner.outstandingList.filter(o => o.remainAmount > 0).length}건
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>최근 거래일</div>
          <div style={{ ...styles.kpiValue, fontSize: 18 }}>{formatDate(partner.lastTransactionDate)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Calendar size={12} />
            {Math.floor((Date.now() - new Date(partner.lastTransactionDate).getTime()) / 86400000)}일 전
          </div>
        </div>
      </div>

      {/* 기간 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {periods.map(p => (
          <button
            key={p.key}
            style={styles.filterBtn(periodFilter === p.key)}
            onClick={() => setPeriodFilter(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 월별 거래액 차트 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <TrendingUp size={16} color="var(--accent-blue)" />
          월별 {partner.type === 'CUSTOMER' ? '매출' : '매입'} 추이
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredChartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v: number) => formatKrw(v)}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                formatter={(value: number) => [formatKrw(value), partner.type === 'CUSTOMER' ? '매출' : '매입']}
                labelFormatter={(label: string) => `${label}`}
              />
              <Bar
                dataKey="amount"
                fill={barColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 거래 내역 테이블 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <FileText size={16} color="var(--accent-blue)" />
          거래 내역
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
            ({filteredTransactions.length}건)
          </span>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>날짜</th>
              <th style={styles.th}>유형</th>
              <th style={styles.th}>품목</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>수량</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>금액</th>
              <th style={styles.th}>상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                <td style={styles.td}>{formatDate(t.date)}</td>
                <td style={styles.td}>
                  <span style={styles.badge(
                    t.type === '입고' ? 'var(--accent-blue)' : 'var(--accent-green)',
                    t.type === '입고' ? 'rgba(45,125,210,0.15)' : 'rgba(63,185,80,0.15)',
                  )}>
                    {t.type === '입고' ? <Package size={11} style={{ marginRight: 3 }} /> : <Truck size={11} style={{ marginRight: 3 }} />}
                    {t.type}
                  </span>
                </td>
                <td style={{ ...styles.td, color: 'var(--text-primary)' }}>{t.item}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatNumber(t.qty)}
                </td>
                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                  {formatKrw(t.amount)}
                </td>
                <td style={styles.td}>
                  <span style={styles.badge(
                    t.status === '완료' ? 'var(--accent-green)' :
                    t.status === '진행중' ? 'var(--accent-blue)' : 'var(--accent-red)',
                    t.status === '완료' ? 'rgba(63,185,80,0.15)' :
                    t.status === '진행중' ? 'rgba(45,125,210,0.15)' : 'rgba(248,81,73,0.15)',
                  )}>
                    {t.status === '완료' ? <CheckCircle size={11} style={{ marginRight: 3 }} /> :
                     t.status === '취소' ? <XCircle size={11} style={{ marginRight: 3 }} /> :
                     <Clock size={11} style={{ marginRight: 3 }} />}
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Tab 3: 품질/납기 (공급업체 전용) ──────────────────────
function QualityTab({ partner }: { partner: PartnerMockData }) {
  // 평균 납기 준수율 계산
  const avgDeliveryRate = useMemo(() => {
    const sum = partner.deliveryRateData.reduce((acc, d) => acc + d.rate, 0);
    return (sum / partner.deliveryRateData.length).toFixed(1);
  }, [partner.deliveryRateData]);

  return (
    <>
      {/* 납기 준수율 요약 KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>평균 납기 준수율</div>
          <div style={{ ...styles.kpiValue, color: 'var(--accent-green)' }}>{avgDeliveryRate}%</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>리드타임 (평균)</div>
          <div style={styles.kpiValue}>{partner.avgLeadTime}일</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            최단 {partner.minLeadTime}일 / 최장 {partner.maxLeadTime}일
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>평균 불량률</div>
          <div style={{
            ...styles.kpiValue,
            color: (() => {
              const avg = partner.qcRecords.reduce((acc, r) => acc + r.defectRate, 0) / partner.qcRecords.length;
              return avg > 2 ? 'var(--accent-red)' : avg > 1 ? 'var(--accent-orange)' : 'var(--accent-green)';
            })(),
          }}>
            {(partner.qcRecords.reduce((acc, r) => acc + r.defectRate, 0) / partner.qcRecords.length).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* 월별 납기 준수율 추이 차트 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <TrendingUp size={16} color="var(--accent-green)" />
          월별 납기 준수율 추이
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={partner.deliveryRateData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickLine={false}
              />
              <YAxis
                domain={[85, 100]}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v: number) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value}%`, '납기 준수율']}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="var(--accent-green)"
                strokeWidth={2}
                dot={{ r: 4, fill: 'var(--accent-green)' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 리드타임 분포 정보 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <Clock size={16} color="var(--accent-blue)" />
          리드타임 분포
        </div>
        <div style={{ display: 'flex', gap: 32, padding: '12px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-blue)' }}>{partner.avgLeadTime}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>평균 (일)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-green)' }}>{partner.minLeadTime}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>최단 (일)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-orange)' }}>{partner.maxLeadTime}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>최장 (일)</div>
          </div>
          {/* 리드타임 바 시각화 */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100%', position: 'relative', height: 20 }}>
              <div style={{
                width: '100%',
                height: 6,
                backgroundColor: 'var(--border-default)',
                borderRadius: 3,
                position: 'absolute',
                top: 7,
              }} />
              {/* 최단 마커 */}
              <div style={{
                position: 'absolute',
                left: `${(partner.minLeadTime / 10) * 100}%`,
                top: 0,
                width: 8,
                height: 20,
                backgroundColor: 'var(--accent-green)',
                borderRadius: 4,
              }} />
              {/* 평균 마커 */}
              <div style={{
                position: 'absolute',
                left: `${(partner.avgLeadTime / 10) * 100}%`,
                top: 0,
                width: 8,
                height: 20,
                backgroundColor: 'var(--accent-blue)',
                borderRadius: 4,
              }} />
              {/* 최장 마커 */}
              <div style={{
                position: 'absolute',
                left: `${(partner.maxLeadTime / 10) * 100}%`,
                top: 0,
                width: 8,
                height: 20,
                backgroundColor: 'var(--accent-orange)',
                borderRadius: 4,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* QC 검수 이력 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <ClipboardCheck size={16} color="var(--accent-blue)" />
          QC 검수 이력
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>검사일</th>
              <th style={styles.th}>LOT 번호</th>
              <th style={styles.th}>품목</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>검사 수량</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>불량 수량</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>불량률</th>
              <th style={styles.th}>결과</th>
            </tr>
          </thead>
          <tbody>
            {partner.qcRecords.map((r, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                <td style={styles.td}>{formatDate(r.date)}</td>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{r.lotNo}</td>
                <td style={{ ...styles.td, color: 'var(--text-primary)' }}>{r.item}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(r.totalQty)}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: r.defectQty > 0 ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
                  {r.defectQty}
                </td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: r.defectRate > 2 ? 'var(--accent-red)' : r.defectRate > 1 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                  {r.defectRate.toFixed(2)}%
                </td>
                <td style={styles.td}>
                  <span style={styles.badge(
                    r.result === '합격' ? 'var(--accent-green)' :
                    r.result === '조건부' ? 'var(--accent-orange)' : 'var(--accent-red)',
                    r.result === '합격' ? 'rgba(63,185,80,0.15)' :
                    r.result === '조건부' ? 'rgba(210,153,34,0.15)' : 'rgba(248,81,73,0.15)',
                  )}>
                    {r.result === '합격' ? <CheckCircle size={11} style={{ marginRight: 3 }} /> :
                     r.result === '불합격' ? <XCircle size={11} style={{ marginRight: 3 }} /> :
                     <AlertTriangle size={11} style={{ marginRight: 3 }} />}
                    {r.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Tab 4: 미수금/미지급 ────────────────────────────────
function ReceivablesTab({ partner }: { partner: PartnerMockData }) {
  // 연체 구간별 금액 집계
  const overdueStats = useMemo(() => {
    const stats = { current: 0, over30: 0, over60: 0, over90: 0 };
    partner.outstandingList.forEach(o => {
      if (o.remainAmount <= 0) return;
      if (o.overdueDays >= 90) stats.over90 += o.remainAmount;
      else if (o.overdueDays >= 60) stats.over60 += o.remainAmount;
      else if (o.overdueDays >= 30) stats.over30 += o.remainAmount;
      else stats.current += o.remainAmount;
    });
    return stats;
  }, [partner.outstandingList]);

  const totalOutstanding = overdueStats.current + overdueStats.over30 + overdueStats.over60 + overdueStats.over90;

  const isCustomer = partner.type === 'CUSTOMER';
  const label = isCustomer ? '미수금' : '미지급금';

  return (
    <>
      {/* 미결제 요약 */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>총 {label}</div>
          <div style={{ ...styles.kpiValue, color: totalOutstanding > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
            {formatKrw(totalOutstanding)}
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>정상 (30일 이내)</div>
          <div style={{ ...styles.kpiValue, color: 'var(--accent-green)' }}>
            {formatKrw(overdueStats.current)}
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>30일 이상 연체</div>
          <div style={{ ...styles.kpiValue, color: overdueStats.over30 > 0 ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
            {formatKrw(overdueStats.over30)}
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>60일+ / 90일+ 연체</div>
          <div style={{ ...styles.kpiValue, color: (overdueStats.over60 + overdueStats.over90) > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
            {formatKrw(overdueStats.over60 + overdueStats.over90)}
          </div>
        </div>
      </div>

      {/* 연체 경고 배너 */}
      {(overdueStats.over30 + overdueStats.over60 + overdueStats.over90) > 0 && (
        <div style={{
          ...styles.card,
          borderColor: 'var(--accent-red)',
          backgroundColor: 'rgba(248, 81, 73, 0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} color="var(--accent-red)" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-red)' }}>
                연체 {label} 경고
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {overdueStats.over30 > 0 && `30일 이상: ${formatKrw(overdueStats.over30)}`}
                {overdueStats.over60 > 0 && ` | 60일 이상: ${formatKrw(overdueStats.over60)}`}
                {overdueStats.over90 > 0 && ` | 90일 이상: ${formatKrw(overdueStats.over90)}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 미결제 상세 목록 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <DollarSign size={16} color="var(--accent-blue)" />
          {label} 상세 내역
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>전표번호</th>
              <th style={styles.th}>거래일</th>
              <th style={styles.th}>결제기한</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>거래금액</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>수금액</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>잔액</th>
              <th style={styles.th}>상태</th>
            </tr>
          </thead>
          <tbody>
            {partner.outstandingList.map((o, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{o.voucherNo}</td>
                <td style={styles.td}>{formatDate(o.date)}</td>
                <td style={styles.td}>{formatDate(o.dueDate)}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatKrw(o.amount)}
                </td>
                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent-green)' }}>
                  {formatKrw(o.paidAmount)}
                </td>
                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: o.remainAmount > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                  {o.remainAmount === 0 ? '완납' : formatKrw(o.remainAmount)}
                </td>
                <td style={styles.td}>
                  {o.remainAmount === 0 ? (
                    <span style={styles.badge('var(--accent-green)', 'rgba(63,185,80,0.15)')}>
                      <CheckCircle size={11} style={{ marginRight: 3 }} />
                      완납
                    </span>
                  ) : o.overdueDays === 0 ? (
                    <span style={styles.badge('var(--accent-blue)', 'rgba(45,125,210,0.15)')}>
                      <Clock size={11} style={{ marginRight: 3 }} />
                      정상
                    </span>
                  ) : o.overdueDays >= 90 ? (
                    <span style={styles.overdueWarning('high')}>
                      <AlertTriangle size={11} />
                      {o.overdueDays}일 연체
                    </span>
                  ) : o.overdueDays >= 60 ? (
                    <span style={styles.overdueWarning('mid')}>
                      <AlertTriangle size={11} />
                      {o.overdueDays}일 연체
                    </span>
                  ) : (
                    <span style={styles.overdueWarning('low')}>
                      <AlertTriangle size={11} />
                      {o.overdueDays}일 연체
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 결제 일정 정보 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <Calendar size={16} color="var(--accent-blue)" />
          결제 일정
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--bg-primary)', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>이번 주 결제 예정</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-blue)' }}>0건</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>0원</div>
          </div>
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--bg-primary)', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>이번 달 결제 예정</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-orange)' }}>1건</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatKrw(24000000)}</div>
          </div>
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--bg-primary)', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>다음 달 결제 예정</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>2건</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatKrw(161000000)}</div>
          </div>
        </div>
      </div>
    </>
  );
}
