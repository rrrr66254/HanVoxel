/**
 * 업체 상세 컴포넌트
 * 탭: 기본정보 | 담당자 | 계좌정보 | 거래내역 | 기사관리
 */
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Edit2, Save, X, Plus, Trash2,
  Building2, User, CreditCard, BarChart2, Truck,
  Phone, Mail, MapPin, FileText, CheckCircle,
  Star, AlertCircle, RefreshCw,
} from 'lucide-react';
import type {
  Partner,
  PartnerContact,
  PartnerBankAccount,
  DeliveryDriver,
  PartnerTransactionSummary,
} from '../../api/partner-api';

// ── Props ────────────────────────────────────────────────────
interface PartnerDetailProps {
  partnerId: string;
  onBack: () => void;
}

// ── 탭 키 타입 ───────────────────────────────────────────────
type TabKey = 'info' | 'contacts' | 'banks' | 'transactions' | 'drivers';

// ── 레이블 매핑 ──────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  SUPPLIER: '공급업체',
  CUSTOMER: '고객사',
  BOTH: '공급+고객',
};
const TYPE_COLOR: Record<string, string> = {
  SUPPLIER: 'var(--accent-blue)',
  CUSTOMER: 'var(--accent-green)',
  BOTH: 'var(--accent-orange)',
};

// ── 숫자 포매터 ──────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);
const fmtMoney = (s: string | number) => {
  const n = typeof s === 'string' ? parseFloat(s) : s;
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(n);
};
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';

// ── Mock 데이터 ──────────────────────────────────────────────
const MOCK_PARTNER: Partner = {
  id: 'pt-mock-1',
  companyId: 'company-1',
  type: 'BOTH',
  name: '(주)한진부품',
  code: 'SUP-001',
  bizNo: '123-45-67890',
  ceoName: '김한진',
  bizType: '제조업',
  bizCategory: '전자부품 / 자동차 부품',
  address: '서울특별시 강남구 테헤란로 123, 15층',
  phone: '02-1234-5678',
  email: 'contact@hanjinparts.co.kr',
  contactName: '이담당',
  paymentTerms: 'NET30',
  note: '주요 전자부품 공급업체. 월말 일괄 결제 협의 완료.',
  isActive: true,
  createdAt: '2026-01-15T09:00:00Z',
  updatedAt: '2026-03-10T14:30:00Z',
  contacts: [
    {
      id: 'ct-1', partnerId: 'pt-mock-1', name: '이담당', department: '영업부', position: '부장',
      phone: '010-1111-2222', email: 'lee@hanjinparts.co.kr', isPrimary: true,
    },
    {
      id: 'ct-2', partnerId: 'pt-mock-1', name: '박물류', department: '물류팀', position: '과장',
      phone: '010-3333-4444', email: 'park@hanjinparts.co.kr', isPrimary: false,
    },
    {
      id: 'ct-3', partnerId: 'pt-mock-1', name: '최회계', department: '경리부', position: '대리',
      phone: '010-5555-6666', email: 'choi@hanjinparts.co.kr', isPrimary: false,
    },
  ],
  bankAccounts: [
    { id: 'ba-1', partnerId: 'pt-mock-1', bankName: '국민은행', accountNo: '123456-78-901234', holder: '(주)한진부품', isPrimary: true },
    { id: 'ba-2', partnerId: 'pt-mock-1', bankName: '신한은행', accountNo: '110-333-444555', holder: '(주)한진부품', isPrimary: false },
  ],
  transactionSummary: {
    id: 'ts-1', partnerId: 'pt-mock-1',
    totalInbound: 245,
    totalOutbound: 178,
    totalPurchase: '128500000',
    totalSales: '89700000',
    receivables: '12300000',
    payables: '5600000',
    avgDeliveryRate: 96.4,
    avgQualityScore: 94.8,
    lastTransactionAt: '2026-03-15T11:20:00Z',
  },
  drivers: [
    { id: 'dr-1', partnerId: 'pt-mock-1', name: '홍길동', phone: '010-7777-8888', vehicleNo: '12가 3456', vehicleType: '1톤 트럭', note: null, isActive: true, createdAt: '2026-02-01T08:00:00Z' },
    { id: 'dr-2', partnerId: 'pt-mock-1', name: '김배달', phone: '010-9999-0000', vehicleNo: '34나 5678', vehicleType: '5톤 트럭', note: '야간 배송 가능', isActive: true, createdAt: '2026-02-15T08:00:00Z' },
  ],
};

// ── 인라인 스타일 상수 ────────────────────────────────────────
const S = {
  container: {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    minHeight: '100vh',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  header: {
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-default)',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,

  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-default)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background-color 0.15s',
  } as React.CSSProperties,

  tabs: {
    display: 'flex',
    gap: '0',
    borderBottom: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-secondary)',
    padding: '0 24px',
  } as React.CSSProperties,

  tabBtn: (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
    borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    transition: 'color 0.15s',
    whiteSpace: 'nowrap' as const,
  }),

  content: {
    padding: '24px',
    maxWidth: '1100px',
  } as React.CSSProperties,

  card: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,

  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  } as React.CSSProperties,

  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  } as React.CSSProperties,

  label: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  value: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    padding: '6px 0',
    borderBottom: '1px solid transparent',
  } as React.CSSProperties,

  input: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: '6px',
    padding: '6px 10px',
    width: '100%',
    outline: 'none',
  } as React.CSSProperties,

  textarea: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: '6px',
    padding: '6px 10px',
    width: '100%',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '72px',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  } as React.CSSProperties,

  th: {
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid var(--border-default)',
    letterSpacing: '0.4px',
  } as React.CSSProperties,

  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-muted)',
    color: 'var(--text-primary)',
    verticalAlign: 'middle' as const,
  } as React.CSSProperties,

  primaryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(88, 166, 255, 0.3)',
  } as React.CSSProperties,

  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '6px',
    border: '1px solid var(--border-default)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background-color 0.15s',
  } as React.CSSProperties,

  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'var(--accent-blue)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  } as React.CSSProperties,

  editBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '6px',
    border: '1px solid var(--border-default)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '13px',
  } as React.CSSProperties,

  cancelBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '6px',
    border: '1px solid var(--border-default)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '13px',
  } as React.CSSProperties,

  iconBtn: {
    padding: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  } as React.CSSProperties,

  summaryCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-muted)',
    borderRadius: '8px',
    padding: '16px',
  } as React.CSSProperties,

  summaryLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
  } as React.CSSProperties,

  summaryValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  } as React.CSSProperties,

  driverCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-muted)',
    borderRadius: '8px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    transition: 'background-color 0.15s',
  } as React.CSSProperties,

  inlineFormRow: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--accent-blue)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  } as React.CSSProperties,
};

// ── 편집 가능한 기본정보 타입 ────────────────────────────────
interface EditableInfo {
  name: string;
  code: string;
  bizNo: string;
  ceoName: string;
  bizType: string;
  bizCategory: string;
  address: string;
  phone: string;
  email: string;
  contactName: string;
  paymentTerms: string;
  note: string;
}

// ── 새 담당자 폼 타입 ─────────────────────────────────────────
interface NewContactForm {
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

// ── 새 계좌 폼 타입 ───────────────────────────────────────────
interface NewBankForm {
  bankName: string;
  accountNo: string;
  holder: string;
  isPrimary: boolean;
}

// ── 새 기사 폼 타입 ───────────────────────────────────────────
interface NewDriverForm {
  name: string;
  phone: string;
  vehicleNo: string;
  vehicleType: string;
  note: string;
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export function PartnerDetail({ partnerId, onBack }: PartnerDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  // 기본정보 편집 상태
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditableInfo>({
    name: '', code: '', bizNo: '', ceoName: '', bizType: '',
    bizCategory: '', address: '', phone: '', email: '',
    contactName: '', paymentTerms: '', note: '',
  });

  // 담당자 추가 폼
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState<NewContactForm>({
    name: '', department: '', position: '', phone: '', email: '', isPrimary: false,
  });

  // 계좌 추가 폼
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState<NewBankForm>({
    bankName: '', accountNo: '', holder: '', isPrimary: false,
  });

  // 기사 추가 폼
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState<NewDriverForm>({
    name: '', phone: '', vehicleNo: '', vehicleType: '', note: '',
  });

  // ── 데이터 로드 (API 시도 → 실패 시 Mock) ────────────────
  const loadPartner = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import('../../api/partner-api');
      const data = await mod.getPartner(partnerId);
      setPartner(data);
    } catch {
      // API 미구성 시 Mock 데이터 사용
      setPartner({ ...MOCK_PARTNER, id: partnerId });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    loadPartner();
  }, [loadPartner]);

  // 편집 모드 진입 시 폼 초기화
  useEffect(() => {
    if (partner && editMode) {
      setEditForm({
        name: partner.name ?? '',
        code: partner.code ?? '',
        bizNo: partner.bizNo ?? '',
        ceoName: partner.ceoName ?? '',
        bizType: partner.bizType ?? '',
        bizCategory: partner.bizCategory ?? '',
        address: partner.address ?? '',
        phone: partner.phone ?? '',
        email: partner.email ?? '',
        contactName: partner.contactName ?? '',
        paymentTerms: partner.paymentTerms ?? '',
        note: partner.note ?? '',
      });
    }
  }, [partner, editMode]);

  // ── 기본정보 저장 ────────────────────────────────────────
  const handleSaveInfo = async () => {
    if (!partner) return;
    try {
      const mod = await import('../../api/partner-api');
      const updated = await mod.updatePartner(partner.id, editForm);
      setPartner(updated);
    } catch {
      // Mock 업데이트
      setPartner(prev => prev ? { ...prev, ...editForm } : prev);
    }
    setEditMode(false);
  };

  // ── 담당자 추가 ──────────────────────────────────────────
  const handleAddContact = async () => {
    if (!partner || !contactForm.name.trim()) return;
    try {
      const mod = await import('../../api/partner-api');
      const newContact = await mod.addContact(partner.id, contactForm);
      setPartner(prev => prev ? { ...prev, contacts: [...(prev.contacts ?? []), newContact] } : prev);
    } catch {
      const mock: PartnerContact = {
        id: `ct-new-${Date.now()}`, partnerId: partner.id,
        name: contactForm.name, department: contactForm.department || null,
        position: contactForm.position || null, phone: contactForm.phone || null,
        email: contactForm.email || null, isPrimary: contactForm.isPrimary,
      };
      setPartner(prev => prev ? { ...prev, contacts: [...(prev.contacts ?? []), mock] } : prev);
    }
    setContactForm({ name: '', department: '', position: '', phone: '', email: '', isPrimary: false });
    setShowContactForm(false);
  };

  // ── 담당자 삭제 ──────────────────────────────────────────
  const handleDeleteContact = async (contactId: string) => {
    if (!partner) return;
    try {
      const mod = await import('../../api/partner-api');
      await mod.deleteContact(partner.id, contactId);
    } catch {
      // Mock 삭제
    }
    setPartner(prev => prev ? { ...prev, contacts: (prev.contacts ?? []).filter(c => c.id !== contactId) } : prev);
  };

  // ── 계좌 추가 ────────────────────────────────────────────
  const handleAddBank = async () => {
    if (!partner || !bankForm.bankName.trim() || !bankForm.accountNo.trim()) return;
    try {
      const mod = await import('../../api/partner-api');
      const newBank = await mod.addBankAccount(partner.id, bankForm);
      setPartner(prev => prev ? { ...prev, bankAccounts: [...(prev.bankAccounts ?? []), newBank] } : prev);
    } catch {
      const mock: PartnerBankAccount = {
        id: `ba-new-${Date.now()}`, partnerId: partner.id,
        bankName: bankForm.bankName, accountNo: bankForm.accountNo,
        holder: bankForm.holder, isPrimary: bankForm.isPrimary,
      };
      setPartner(prev => prev ? { ...prev, bankAccounts: [...(prev.bankAccounts ?? []), mock] } : prev);
    }
    setBankForm({ bankName: '', accountNo: '', holder: '', isPrimary: false });
    setShowBankForm(false);
  };

  // ── 계좌 삭제 ────────────────────────────────────────────
  const handleDeleteBank = async (accountId: string) => {
    if (!partner) return;
    try {
      const mod = await import('../../api/partner-api');
      await mod.deleteBankAccount(partner.id, accountId);
    } catch {
      // Mock 삭제
    }
    setPartner(prev => prev ? { ...prev, bankAccounts: (prev.bankAccounts ?? []).filter(b => b.id !== accountId) } : prev);
  };

  // ── 기사 추가 ────────────────────────────────────────────
  const handleAddDriver = async () => {
    if (!partner || !driverForm.name.trim() || !driverForm.phone.trim()) return;
    try {
      const mod = await import('../../api/partner-api');
      const newDriver = await mod.createDriver({ ...driverForm, partnerId: partner.id });
      setPartner(prev => prev ? { ...prev, drivers: [...(prev.drivers ?? []), newDriver] } : prev);
    } catch {
      const mock: DeliveryDriver = {
        id: `dr-new-${Date.now()}`, partnerId: partner.id,
        name: driverForm.name, phone: driverForm.phone,
        vehicleNo: driverForm.vehicleNo || null, vehicleType: driverForm.vehicleType || null,
        note: driverForm.note || null, isActive: true, createdAt: new Date().toISOString(),
      };
      setPartner(prev => prev ? { ...prev, drivers: [...(prev.drivers ?? []), mock] } : prev);
    }
    setDriverForm({ name: '', phone: '', vehicleNo: '', vehicleType: '', note: '' });
    setShowDriverForm(false);
  };

  // ── 기사 삭제 ────────────────────────────────────────────
  const handleDeleteDriver = async (driverId: string) => {
    if (!partner) return;
    try {
      const mod = await import('../../api/partner-api');
      await mod.deleteDriver(driverId);
    } catch {
      // Mock 삭제
    }
    setPartner(prev => prev ? { ...prev, drivers: (prev.drivers ?? []).filter(d => d.id !== driverId) } : prev);
  };

  // ── 로딩 상태 ────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...S.container, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <div style={{ fontSize: '14px' }}>업체 정보 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div style={{ ...S.container, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <AlertCircle size={28} style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '14px' }}>업체 정보를 불러올 수 없습니다</div>
          <button onClick={onBack} style={{ ...S.backBtn, marginTop: '16px', margin: '16px auto 0' }}>
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const typeBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: `${TYPE_COLOR[partner.type] ?? 'var(--accent-blue)'}22`,
    color: TYPE_COLOR[partner.type] ?? 'var(--accent-blue)',
    border: `1px solid ${TYPE_COLOR[partner.type] ?? 'var(--accent-blue)'}44`,
  };

  const activeBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: partner.isActive ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
    color: partner.isActive ? 'var(--accent-green)' : 'var(--accent-red)',
    border: `1px solid ${partner.isActive ? 'rgba(63, 185, 80, 0.3)' : 'rgba(248, 81, 73, 0.3)'}`,
  };

  return (
    <div style={S.container}>
      {/* ── 헤더 ── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>
          <ArrowLeft size={14} />
          목록으로
        </button>
        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-default)' }} />
        <Building2 size={18} color="var(--accent-blue)" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{partner.name}</span>
            <span style={typeBadgeStyle}>{TYPE_LABEL[partner.type] ?? partner.type}</span>
            <span style={activeBadgeStyle}>
              {partner.isActive ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
              {partner.isActive ? '활성' : '비활성'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {partner.code} · 등록일 {fmtDate(partner.createdAt)}
          </div>
        </div>
      </div>

      {/* ── 탭 바 ── */}
      <div style={S.tabs}>
        {(
          [
            { key: 'info',         label: '기본정보',  Icon: FileText   },
            { key: 'contacts',     label: '담당자',    Icon: User       },
            { key: 'banks',        label: '계좌정보',  Icon: CreditCard },
            { key: 'transactions', label: '거래내역',  Icon: BarChart2  },
            { key: 'drivers',      label: '기사관리',  Icon: Truck      },
          ] as { key: TabKey; label: string; Icon: React.ElementType }[]
        ).map(({ key, label, Icon }) => (
          <button key={key} style={S.tabBtn(activeTab === key)} onClick={() => setActiveTab(key)}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── 탭 컨텐츠 ── */}
      <div style={S.content}>

        {/* ===== 기본정보 탭 ===== */}
        {activeTab === 'info' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>기본 정보</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {editMode ? (
                  <>
                    <button style={S.saveBtn} onClick={handleSaveInfo}>
                      <Save size={14} /> 저장
                    </button>
                    <button style={S.cancelBtn} onClick={() => setEditMode(false)}>
                      <X size={14} /> 취소
                    </button>
                  </>
                ) : (
                  <button style={S.editBtn} onClick={() => setEditMode(true)}>
                    <Edit2 size={14} /> 편집
                  </button>
                )}
              </div>
            </div>

            {/* 사업자 정보 */}
            <div style={S.card}>
              <div style={S.sectionTitle}>
                <Building2 size={15} color="var(--accent-blue)" />
                사업자 정보
              </div>
              <div style={S.grid2}>
                <InfoField label="업체명" value={partner.name} editMode={editMode}
                  editValue={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} />
                <InfoField label="업체 코드" value={partner.code} editMode={editMode}
                  editValue={editForm.code} onChange={v => setEditForm(f => ({ ...f, code: v }))} />
                <InfoField label="사업자 번호" value={partner.bizNo} editMode={editMode}
                  editValue={editForm.bizNo} onChange={v => setEditForm(f => ({ ...f, bizNo: v }))} />
                <InfoField label="대표자명" value={partner.ceoName} editMode={editMode}
                  editValue={editForm.ceoName} onChange={v => setEditForm(f => ({ ...f, ceoName: v }))} />
                <InfoField label="업태" value={partner.bizType} editMode={editMode}
                  editValue={editForm.bizType} onChange={v => setEditForm(f => ({ ...f, bizType: v }))} />
                <InfoField label="종목" value={partner.bizCategory} editMode={editMode}
                  editValue={editForm.bizCategory} onChange={v => setEditForm(f => ({ ...f, bizCategory: v }))} />
              </div>
            </div>

            {/* 연락처 */}
            <div style={S.card}>
              <div style={S.sectionTitle}>
                <Phone size={15} color="var(--accent-green)" />
                연락처 정보
              </div>
              <div style={S.grid2}>
                <InfoField label="주소" value={partner.address} editMode={editMode}
                  editValue={editForm.address} onChange={v => setEditForm(f => ({ ...f, address: v }))} />
                <InfoField label="전화번호" value={partner.phone} editMode={editMode}
                  editValue={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} />
                <InfoField label="이메일" value={partner.email} editMode={editMode}
                  editValue={editForm.email} onChange={v => setEditForm(f => ({ ...f, email: v }))} />
                <InfoField label="담당자명" value={partner.contactName} editMode={editMode}
                  editValue={editForm.contactName} onChange={v => setEditForm(f => ({ ...f, contactName: v }))} />
              </div>
            </div>

            {/* 거래 조건 / 메모 */}
            <div style={S.card}>
              <div style={S.sectionTitle}>
                <FileText size={15} color="var(--accent-orange)" />
                거래 조건 및 메모
              </div>
              <div style={S.grid2}>
                <InfoField label="결제 조건" value={partner.paymentTerms} editMode={editMode}
                  editValue={editForm.paymentTerms} onChange={v => setEditForm(f => ({ ...f, paymentTerms: v }))} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>메모</span>
                    {editMode ? (
                      <textarea
                        style={S.textarea}
                        value={editForm.note}
                        onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="메모를 입력하세요"
                      />
                    ) : (
                      <span style={{ ...S.value, color: partner.note ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {partner.note ?? '—'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== 담당자 탭 ===== */}
        {activeTab === 'contacts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                담당자 목록
                <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ({(partner.contacts ?? []).length}명)
                </span>
              </div>
              <button style={S.addBtn} onClick={() => setShowContactForm(true)}>
                <Plus size={14} /> 담당자 추가
              </button>
            </div>

            {/* 담당자 추가 인라인 폼 */}
            {showContactForm && (
              <div style={S.inlineFormRow}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '12px' }}>새 담당자 등록</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>이름 *</span>
                    <input style={S.input} value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="홍길동" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>부서</span>
                    <input style={S.input} value={contactForm.department} onChange={e => setContactForm(f => ({ ...f, department: e.target.value }))} placeholder="영업부" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>직급</span>
                    <input style={S.input} value={contactForm.position} onChange={e => setContactForm(f => ({ ...f, position: e.target.value }))} placeholder="과장" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>전화번호</span>
                    <input style={S.input} value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>이메일</span>
                    <input style={S.input} value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.com" />
                  </div>
                  <div style={{ ...S.fieldGroup, justifyContent: 'flex-end' }}>
                    <span style={S.label}>주 담당자</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingTop: '6px' }}>
                      <input type="checkbox" checked={contactForm.isPrimary} onChange={e => setContactForm(f => ({ ...f, isPrimary: e.target.checked }))} />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>주 담당자로 설정</span>
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={S.saveBtn} onClick={handleAddContact} disabled={!contactForm.name.trim()}>
                    <Save size={13} /> 저장
                  </button>
                  <button style={S.cancelBtn} onClick={() => { setShowContactForm(false); setContactForm({ name: '', department: '', position: '', phone: '', email: '', isPrimary: false }); }}>
                    <X size={13} /> 취소
                  </button>
                </div>
              </div>
            )}

            <div style={S.card}>
              {(partner.contacts ?? []).length === 0 ? (
                <EmptyState icon={<User size={24} />} text="등록된 담당자가 없습니다" />
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['이름', '부서', '직급', '전화번호', '이메일', '구분', ''].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(partner.contacts ?? []).map(c => (
                      <tr key={c.id} style={{ transition: 'background-color 0.1s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; }}>
                        <td style={S.td}><span style={{ fontWeight: 500 }}>{c.name}</span></td>
                        <td style={{ ...S.td, color: 'var(--text-secondary)' }}>{c.department ?? '—'}</td>
                        <td style={{ ...S.td, color: 'var(--text-secondary)' }}>{c.position ?? '—'}</td>
                        <td style={S.td}>
                          {c.phone ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} color="var(--text-muted)" />{c.phone}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={S.td}>
                          {c.email ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={12} color="var(--text-muted)" />{c.email}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={S.td}>
                          {c.isPrimary ? (
                            <span style={S.primaryBadge}><Star size={10} /> 주담당</span>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>일반</span>
                          )}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <button style={S.iconBtn} onClick={() => handleDeleteContact(c.id)}
                            title="삭제"
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-red)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== 계좌정보 탭 ===== */}
        {activeTab === 'banks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                계좌 정보
                <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ({(partner.bankAccounts ?? []).length}개)
                </span>
              </div>
              <button style={S.addBtn} onClick={() => setShowBankForm(true)}>
                <Plus size={14} /> 계좌 추가
              </button>
            </div>

            {/* 계좌 추가 인라인 폼 */}
            {showBankForm && (
              <div style={S.inlineFormRow}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '12px' }}>새 계좌 등록</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>은행명 *</span>
                    <input style={S.input} value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))} placeholder="국민은행" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>계좌번호 *</span>
                    <input style={S.input} value={bankForm.accountNo} onChange={e => setBankForm(f => ({ ...f, accountNo: e.target.value }))} placeholder="123456-78-000000" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>예금주</span>
                    <input style={S.input} value={bankForm.holder} onChange={e => setBankForm(f => ({ ...f, holder: e.target.value }))} placeholder="(주)업체명" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>주 계좌</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingTop: '6px' }}>
                      <input type="checkbox" checked={bankForm.isPrimary} onChange={e => setBankForm(f => ({ ...f, isPrimary: e.target.checked }))} />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>주 계좌로 설정</span>
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={S.saveBtn} onClick={handleAddBank} disabled={!bankForm.bankName.trim() || !bankForm.accountNo.trim()}>
                    <Save size={13} /> 저장
                  </button>
                  <button style={S.cancelBtn} onClick={() => { setShowBankForm(false); setBankForm({ bankName: '', accountNo: '', holder: '', isPrimary: false }); }}>
                    <X size={13} /> 취소
                  </button>
                </div>
              </div>
            )}

            <div style={S.card}>
              {(partner.bankAccounts ?? []).length === 0 ? (
                <EmptyState icon={<CreditCard size={24} />} text="등록된 계좌가 없습니다" />
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['은행', '계좌번호', '예금주', '구분', ''].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(partner.bankAccounts ?? []).map(ba => (
                      <tr key={ba.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; }}>
                        <td style={S.td}>
                          <span style={{ fontWeight: 500 }}>{ba.bankName}</span>
                        </td>
                        <td style={{ ...S.td, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{ba.accountNo}</td>
                        <td style={{ ...S.td, color: 'var(--text-secondary)' }}>{ba.holder}</td>
                        <td style={S.td}>
                          {ba.isPrimary ? (
                            <span style={S.primaryBadge}><Star size={10} /> 주계좌</span>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>일반</span>
                          )}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <button style={S.iconBtn} onClick={() => handleDeleteBank(ba.id)}
                            title="삭제"
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-red)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== 거래내역 탭 ===== */}
        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>거래 현황 요약</div>
              {partner.transactionSummary?.lastTransactionAt && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  마지막 거래: {fmtDate(partner.transactionSummary.lastTransactionAt)}
                </div>
              )}
            </div>

            {partner.transactionSummary ? (
              <TransactionSummaryView summary={partner.transactionSummary} />
            ) : (
              <div style={S.card}>
                <EmptyState icon={<BarChart2 size={24} />} text="거래 데이터가 없습니다" />
              </div>
            )}
          </div>
        )}

        {/* ===== 기사관리 탭 ===== */}
        {activeTab === 'drivers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                배송 기사
                <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ({(partner.drivers ?? []).length}명)
                </span>
              </div>
              <button style={S.addBtn} onClick={() => setShowDriverForm(true)}>
                <Plus size={14} /> 기사 등록
              </button>
            </div>

            {/* 기사 추가 인라인 폼 */}
            {showDriverForm && (
              <div style={S.inlineFormRow}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '12px' }}>새 기사 등록</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>이름 *</span>
                    <input style={S.input} value={driverForm.name} onChange={e => setDriverForm(f => ({ ...f, name: e.target.value }))} placeholder="홍길동" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>연락처 *</span>
                    <input style={S.input} value={driverForm.phone} onChange={e => setDriverForm(f => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>차량 번호</span>
                    <input style={S.input} value={driverForm.vehicleNo} onChange={e => setDriverForm(f => ({ ...f, vehicleNo: e.target.value }))} placeholder="12가 3456" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>차종</span>
                    <input style={S.input} value={driverForm.vehicleType} onChange={e => setDriverForm(f => ({ ...f, vehicleType: e.target.value }))} placeholder="1톤 트럭" />
                  </div>
                  <div style={S.fieldGroup}>
                    <span style={S.label}>메모</span>
                    <input style={S.input} value={driverForm.note} onChange={e => setDriverForm(f => ({ ...f, note: e.target.value }))} placeholder="야간 배송 가능 등" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={S.saveBtn} onClick={handleAddDriver} disabled={!driverForm.name.trim() || !driverForm.phone.trim()}>
                    <Save size={13} /> 저장
                  </button>
                  <button style={S.cancelBtn} onClick={() => { setShowDriverForm(false); setDriverForm({ name: '', phone: '', vehicleNo: '', vehicleType: '', note: '' }); }}>
                    <X size={13} /> 취소
                  </button>
                </div>
              </div>
            )}

            {(partner.drivers ?? []).length === 0 ? (
              <div style={S.card}>
                <EmptyState icon={<Truck size={24} />} text="등록된 기사가 없습니다" />
              </div>
            ) : (
              (partner.drivers ?? []).map(d => (
                <div key={d.id} style={S.driverCard}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-primary)'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      backgroundColor: 'rgba(88, 166, 255, 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Truck size={16} color="var(--accent-blue)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{d.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <Phone size={11} /> {d.phone}
                        </span>
                        {d.vehicleNo && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {d.vehicleNo}
                          </span>
                        )}
                        {d.vehicleType && (
                          <span style={{
                            fontSize: '11px', padding: '1px 7px', borderRadius: '10px',
                            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)',
                            color: 'var(--text-secondary)',
                          }}>
                            {d.vehicleType}
                          </span>
                        )}
                      </div>
                      {d.note && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{d.note}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      backgroundColor: d.isActive ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                      color: d.isActive ? 'var(--accent-green)' : 'var(--accent-red)',
                      border: `1px solid ${d.isActive ? 'rgba(63, 185, 80, 0.3)' : 'rgba(248, 81, 73, 0.3)'}`,
                    }}>
                      {d.isActive ? '활성' : '비활성'}
                    </span>
                    <button style={S.iconBtn} onClick={() => handleDeleteDriver(d.id)}
                      title="삭제"
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-red)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 서브 컴포넌트: 읽기/편집 필드 ────────────────────────────
interface InfoFieldProps {
  label: string;
  value: string | null | undefined;
  editMode: boolean;
  editValue: string;
  onChange: (v: string) => void;
}

function InfoField({ label, value, editMode, editValue, onChange }: InfoFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{
        fontSize: '11px',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </span>
      {editMode ? (
        <input
          style={{
            fontSize: '14px',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '6px 10px',
            width: '100%',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          value={editValue}
          onChange={e => onChange(e.target.value)}
          placeholder={label}
        />
      ) : (
        <span style={{
          fontSize: '14px',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          padding: '6px 0',
        }}>
          {value ?? '—'}
        </span>
      )}
    </div>
  );
}

// ── 서브 컴포넌트: 거래내역 요약 ────────────────────────────
interface TransactionSummaryViewProps {
  summary: PartnerTransactionSummary;
}

function TransactionSummaryView({ summary }: TransactionSummaryViewProps) {
  return (
    <>
      {/* 물량 요약 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <SummaryCard
          label="총 입고 건수"
          value={`${fmt(summary.totalInbound)}건`}
          color="var(--accent-blue)"
          icon={<BarChart2 size={16} />}
        />
        <SummaryCard
          label="총 출고 건수"
          value={`${fmt(summary.totalOutbound)}건`}
          color="var(--accent-green)"
          icon={<BarChart2 size={16} />}
        />
        <SummaryCard
          label="납기 준수율"
          value={summary.avgDeliveryRate !== null ? `${summary.avgDeliveryRate.toFixed(1)}%` : '—'}
          color={summary.avgDeliveryRate !== null && summary.avgDeliveryRate >= 95 ? 'var(--accent-green)' : 'var(--accent-orange)'}
          icon={<CheckCircle size={16} />}
        />
        <SummaryCard
          label="평균 품질 점수"
          value={summary.avgQualityScore !== null ? `${summary.avgQualityScore.toFixed(1)}점` : '—'}
          color={summary.avgQualityScore !== null && summary.avgQualityScore >= 90 ? 'var(--accent-green)' : 'var(--accent-orange)'}
          icon={<Star size={16} />}
        />
      </div>

      {/* 금액 요약 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <SummaryCard
          label="총 매입액"
          value={fmtMoney(summary.totalPurchase)}
          color="var(--accent-blue)"
          icon={<CreditCard size={16} />}
          small
        />
        <SummaryCard
          label="총 매출액"
          value={fmtMoney(summary.totalSales)}
          color="var(--accent-green)"
          icon={<CreditCard size={16} />}
          small
        />
        <SummaryCard
          label="미수금"
          value={fmtMoney(summary.receivables)}
          color={parseFloat(summary.receivables) > 0 ? 'var(--accent-orange)' : 'var(--text-secondary)'}
          icon={<AlertCircle size={16} />}
          small
        />
        <SummaryCard
          label="미지급금"
          value={fmtMoney(summary.payables)}
          color={parseFloat(summary.payables) > 0 ? 'var(--accent-red)' : 'var(--text-secondary)'}
          icon={<AlertCircle size={16} />}
          small
        />
      </div>
    </>
  );
}

// ── 서브 컴포넌트: 요약 카드 ─────────────────────────────────
interface SummaryCardProps {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
  small?: boolean;
}

function SummaryCard({ label, value, color, icon, small = false }: SummaryCardProps) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-default)',
      borderRadius: '8px',
      padding: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color }}>
        {icon}
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{
        fontSize: small ? '15px' : '20px',
        fontWeight: 700,
        color,
        letterSpacing: '-0.3px',
      }}>
        {value}
      </div>
    </div>
  );
}

// ── 서브 컴포넌트: 빈 상태 ───────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode;
  text: string;
}

function EmptyState({ icon, text }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      color: 'var(--text-muted)',
      gap: '12px',
    }}>
      <div style={{ opacity: 0.4 }}>{icon}</div>
      <span style={{ fontSize: '13px' }}>{text}</span>
    </div>
  );
}
