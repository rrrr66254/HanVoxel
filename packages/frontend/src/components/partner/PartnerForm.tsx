/**
 * 거래처 등록/수정 폼
 * partnerId가 있으면 수정 모드, 없으면 신규 등록 모드
 */
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Plus, Trash2, Star, Search,
  Building2, Phone, MapPin, CreditCard, Truck, Users, Tag, FileText,
} from 'lucide-react';

// ── 타입 정의 ──────────────────────────────────────────
type PartnerType = 'SUPPLIER' | 'CUSTOMER' | 'BOTH';
type PaymentTerms = 'COD' | 'NET30' | 'NET60' | 'BILL';
type Currency = 'KRW' | 'USD' | 'EUR';
type TaxType = 'TAXABLE' | 'TAX_FREE' | 'ZERO_RATE';
type QualityGrade = 'A' | 'B' | 'C' | 'D';

interface ContactPerson {
  id: string;
  department: string;
  name: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

// 계좌 정보
interface BankAccountEntry {
  id: string;
  bankName: string;
  accountNo: string;
  accountHolder: string;
  isPrimary: boolean;
}

// 첨부파일 정보
interface AttachmentEntry {
  id: string;
  fileType: string; // 사업자등록증 / 통장사본 / 계약서 / 기타
  fileName: string;
}

interface PartnerFormState {
  // 기본 정보
  type: PartnerType;
  code: string;
  bizNo: string;
  name: string;
  ceoName: string;
  bizType: string;
  bizCategory: string;
  // 연락처
  phone: string;
  fax: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  // 주소
  zipCode: string;
  address: string;
  addressDetail: string;
  sameAsAddress: boolean;
  shippingAddress: string;
  shippingMemo: string;
  // 거래 조건
  paymentTerms: PaymentTerms;
  creditLimit: string;
  currency: Currency;
  taxType: TaxType;
  // 공급업체 전용
  defaultLeadTime: string;
  minOrderQty: string;
  qualityGrade: QualityGrade;
  // 담당자 목록
  contacts: ContactPerson[];
  // 계좌 정보
  bankAccounts: BankAccountEntry[];
  // 첨부파일
  attachments: AttachmentEntry[];
  // 메모/태그
  memo: string;
  tags: string;
}

interface PartnerFormProps {
  partnerId?: string;
  onBack: () => void;
  onSave?: () => void;
}

// ── Mock 데이터 (수정 모드용) ──────────────────────────
const MOCK_PARTNERS: Record<string, PartnerFormState> = {
  'pt-1': {
    type: 'SUPPLIER',
    code: 'SUP-001',
    bizNo: '123-45-67890',
    name: '(주)한진부품',
    ceoName: '김공급',
    bizType: '제조업',
    bizCategory: '전자부품',
    phone: '02-1234-5678',
    fax: '02-1234-5679',
    contactName: '이담당',
    contactPhone: '010-1111-2222',
    contactEmail: 'lee@hanjin.co.kr',
    zipCode: '06123',
    address: '서울시 강남구 테헤란로 123',
    addressDetail: '한진빌딩 5층',
    sameAsAddress: true,
    shippingAddress: '',
    shippingMemo: '',
    paymentTerms: 'NET30',
    creditLimit: '5000',
    currency: 'KRW',
    taxType: 'TAXABLE',
    defaultLeadTime: '7',
    minOrderQty: '100',
    qualityGrade: 'A',
    contacts: [
      { id: 'c1', department: '영업팀', name: '이담당', phone: '010-1111-2222', email: 'lee@hanjin.co.kr', isPrimary: true },
      { id: 'c2', department: '품질팀', name: '박품질', phone: '010-3333-4444', email: 'park@hanjin.co.kr', isPrimary: false },
    ],
    bankAccounts: [
      { id: 'ba1', bankName: '국민', accountNo: '123-456-789012', accountHolder: '(주)한진부품', isPrimary: true },
      { id: 'ba2', bankName: '신한', accountNo: '987-654-321098', accountHolder: '김공급', isPrimary: false },
    ],
    attachments: [
      { id: 'att1', fileType: '사업자등록증', fileName: '한진부품_사업자등록증.pdf' },
      { id: 'att2', fileType: '통장사본', fileName: '한진부품_국민은행_통장사본.pdf' },
    ],
    memo: '주요 전자부품 공급업체. 월 2회 정기 입고.',
    tags: '전자부품,주요거래처,서울',
  },
  'pt-2': {
    type: 'CUSTOMER',
    code: 'CUS-001',
    bizNo: '234-56-78901',
    name: 'CJ물류센터',
    ceoName: '박고객',
    bizType: '물류업',
    bizCategory: '창고운영',
    phone: '031-9876-5432',
    fax: '031-9876-5433',
    contactName: '최매니저',
    contactPhone: '010-5555-6666',
    contactEmail: 'choi@cjlogistics.com',
    zipCode: '16954',
    address: '경기도 용인시 처인구 물류로 456',
    addressDetail: 'CJ물류센터 1동',
    sameAsAddress: false,
    shippingAddress: '경기도 용인시 처인구 배송로 789',
    shippingMemo: '정문 입고, 도크 3번 사용',
    paymentTerms: 'NET60',
    creditLimit: '10000',
    currency: 'KRW',
    taxType: 'TAXABLE',
    defaultLeadTime: '',
    minOrderQty: '',
    qualityGrade: 'A',
    contacts: [
      { id: 'c3', department: '물류팀', name: '최매니저', phone: '010-5555-6666', email: 'choi@cjlogistics.com', isPrimary: true },
    ],
    bankAccounts: [],
    attachments: [],
    memo: '',
    tags: '물류,용인',
  },
};

// ── 초기 폼 상태 ──────────────────────────────────────
const INITIAL_STATE: PartnerFormState = {
  type: 'SUPPLIER',
  code: '',
  bizNo: '',
  name: '',
  ceoName: '',
  bizType: '',
  bizCategory: '',
  phone: '',
  fax: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  zipCode: '',
  address: '',
  addressDetail: '',
  sameAsAddress: false,
  shippingAddress: '',
  shippingMemo: '',
  paymentTerms: 'NET30',
  creditLimit: '',
  currency: 'KRW',
  taxType: 'TAXABLE',
  defaultLeadTime: '',
  minOrderQty: '',
  qualityGrade: 'A',
  contacts: [],
  bankAccounts: [],
  attachments: [],
  memo: '',
  tags: '',
};

// ── 공통 스타일 ──────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto' as React.CSSProperties['appearance'],
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-muted)',
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 20,
};

const gridStyle = (cols: number): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gap: 16,
});

const buttonStyle = (variant: 'primary' | 'secondary' | 'danger' | 'ghost'): React.CSSProperties => {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  };
  switch (variant) {
    case 'primary':
      return { ...base, background: 'var(--accent-blue)', color: '#fff' };
    case 'secondary':
      return { ...base, background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' };
    case 'danger':
      return { ...base, background: 'transparent', color: 'var(--accent-red)', padding: '6px 10px' };
    case 'ghost':
      return { ...base, background: 'transparent', color: 'var(--text-secondary)', padding: '6px 12px' };
  }
};

// ── 사업자등록번호 포맷 마스크 ──────────────────────────
function formatBizNo(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

// ── 업체 코드 자동 생성 ──────────────────────────────
function generateCode(type: PartnerType): string {
  const num = String(Math.floor(Math.random() * 900) + 100);
  if (type === 'CUSTOMER') return `CUS-${num}`;
  return `SUP-${num}`;
}

// ── 컴포넌트 ──────────────────────────────────────────
export function PartnerForm({ partnerId, onBack, onSave }: PartnerFormProps) {
  const isEditMode = Boolean(partnerId);
  const [form, setForm] = useState<PartnerFormState>(INITIAL_STATE);

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (partnerId && MOCK_PARTNERS[partnerId]) {
      setForm(MOCK_PARTNERS[partnerId]);
    } else if (!partnerId) {
      // 신규 등록: 코드 자동 생성
      setForm((prev) => ({ ...prev, code: generateCode(prev.type) }));
    }
  }, [partnerId]);

  // 필드 변경 핸들러
  const updateField = <K extends keyof PartnerFormState>(key: K, value: PartnerFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // 업체 유형 변경 시 코드 재생성 (신규 등록만)
      if (key === 'type' && !isEditMode) {
        next.code = generateCode(value as PartnerType);
      }
      // "기본 주소와 동일" 체크 시 배송지 동기화
      if (key === 'sameAsAddress' && value === true) {
        next.shippingAddress = `${prev.address} ${prev.addressDetail}`.trim();
      }
      return next;
    });
  };

  // 사업자등록번호 입력 핸들러
  const handleBizNoChange = (rawValue: string) => {
    updateField('bizNo', formatBizNo(rawValue));
  };

  // 사업자등록번호 조회 (플레이스홀더)
  const handleBizNoLookup = () => {
    alert('사업자등록번호 조회 기능은 준비 중입니다.');
  };

  // 주소 검색 (플레이스홀더)
  const handleAddressSearch = () => {
    alert('주소 검색 기능은 준비 중입니다.');
  };

  // 담당자 추가
  const addContact = () => {
    const newContact: ContactPerson = {
      id: `c-${Date.now()}`,
      department: '',
      name: '',
      phone: '',
      email: '',
      isPrimary: form.contacts.length === 0,
    };
    updateField('contacts', [...form.contacts, newContact]);
  };

  // 담당자 수정
  const updateContact = (id: string, field: keyof ContactPerson, value: string | boolean) => {
    const updated = form.contacts.map((c) => {
      if (c.id !== id) {
        // 대표 지정 시 다른 담당자 해제
        if (field === 'isPrimary' && value === true) {
          return { ...c, isPrimary: false };
        }
        return c;
      }
      return { ...c, [field]: value };
    });
    updateField('contacts', updated);
  };

  // 담당자 삭제
  const removeContact = (id: string) => {
    const filtered = form.contacts.filter((c) => c.id !== id);
    // 삭제 후 대표가 없으면 첫 번째를 대표로
    if (filtered.length > 0 && !filtered.some((c) => c.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    updateField('contacts', filtered);
  };

  // 계좌 추가
  const addBankAccount = () => {
    const newAccount: BankAccountEntry = {
      id: `ba-${Date.now()}`,
      bankName: '국민',
      accountNo: '',
      accountHolder: '',
      isPrimary: form.bankAccounts.length === 0,
    };
    updateField('bankAccounts', [...form.bankAccounts, newAccount]);
  };

  // 계좌 수정
  const updateBankAccount = (id: string, field: keyof BankAccountEntry, value: string | boolean) => {
    const updated = form.bankAccounts.map((acc) => {
      if (acc.id !== id) {
        // 대표 지정 시 다른 계좌 해제
        if (field === 'isPrimary' && value === true) {
          return { ...acc, isPrimary: false };
        }
        return acc;
      }
      return { ...acc, [field]: value };
    });
    updateField('bankAccounts', updated);
  };

  // 계좌 삭제
  const removeBankAccount = (id: string) => {
    const filtered = form.bankAccounts.filter((acc) => acc.id !== id);
    // 삭제 후 대표가 없으면 첫 번째를 대표로
    if (filtered.length > 0 && !filtered.some((acc) => acc.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    updateField('bankAccounts', filtered);
  };

  // 첨부파일 추가 (플레이스홀더)
  const addAttachment = () => {
    alert('파일 업로드 기능은 준비 중입니다.');
  };

  // 첨부파일 삭제
  const removeAttachment = (id: string) => {
    updateField('attachments', form.attachments.filter((att) => att.id !== id));
  };

  // 첨부파일 유형 변경
  const updateAttachmentType = (id: string, fileType: string) => {
    const updated = form.attachments.map((att) =>
      att.id === id ? { ...att, fileType } : att
    );
    updateField('attachments', updated);
  };

  // 저장 핸들러
  const handleSave = () => {
    onSave?.();
  };

  // 공급업체 전용 섹션 표시 여부
  const showSupplierSection = form.type === 'SUPPLIER' || form.type === 'BOTH';

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            ...buttonStyle('ghost'),
            padding: '8px',
            borderRadius: 8,
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {isEditMode ? '거래처 수정' : '거래처 등록'}
        </h1>
      </div>

      {/* 섹션 1: 기본 정보 */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Building2 size={18} color="var(--accent-blue)" />
          기본 정보
        </div>

        {/* 업체 유형 라디오 */}
        <div style={{ marginBottom: 16 }}>
          <span style={labelStyle}>업체 유형</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {([
              ['SUPPLIER', '매입처'],
              ['CUSTOMER', '매출처'],
              ['BOTH', '양방향'],
            ] as [PartnerType, string][]).map(([val, label]) => (
              <label
                key={val}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                }}
              >
                <input
                  type="radio"
                  name="partnerType"
                  checked={form.type === val}
                  onChange={() => updateField('type', val)}
                  style={{ accentColor: 'var(--accent-blue)' }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={gridStyle(2)}>
          {/* 업체 코드 */}
          <div>
            <span style={labelStyle}>업체 코드</span>
            <input
              type="text"
              value={form.code}
              readOnly
              style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

          {/* 사업자등록번호 */}
          <div>
            <span style={labelStyle}>사업자등록번호</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={form.bizNo}
                onChange={(e) => handleBizNoChange(e.target.value)}
                placeholder="000-00-00000"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleBizNoLookup}
                style={{ ...buttonStyle('secondary'), whiteSpace: 'nowrap' }}
              >
                <Search size={14} />
                조회
              </button>
            </div>
          </div>
        </div>

        <div style={{ ...gridStyle(2), marginTop: 16 }}>
          <div>
            <span style={labelStyle}>업체명</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="업체명을 입력하세요"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>대표자명</span>
            <input
              type="text"
              value={form.ceoName}
              onChange={(e) => updateField('ceoName', e.target.value)}
              placeholder="대표자명"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ ...gridStyle(2), marginTop: 16 }}>
          <div>
            <span style={labelStyle}>업태</span>
            <input
              type="text"
              value={form.bizType}
              onChange={(e) => updateField('bizType', e.target.value)}
              placeholder="예: 제조업"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>종목</span>
            <input
              type="text"
              value={form.bizCategory}
              onChange={(e) => updateField('bizCategory', e.target.value)}
              placeholder="예: 전자부품"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* 섹션 2: 연락처 */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Phone size={18} color="var(--accent-blue)" />
          연락처
        </div>

        <div style={gridStyle(2)}>
          <div>
            <span style={labelStyle}>대표 전화</span>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="02-0000-0000"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>팩스</span>
            <input
              type="text"
              value={form.fax}
              onChange={(e) => updateField('fax', e.target.value)}
              placeholder="02-0000-0000"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ ...gridStyle(3), marginTop: 16 }}>
          <div>
            <span style={labelStyle}>담당자명</span>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => updateField('contactName', e.target.value)}
              placeholder="담당자명"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>담당자 연락처</span>
            <input
              type="text"
              value={form.contactPhone}
              onChange={(e) => updateField('contactPhone', e.target.value)}
              placeholder="010-0000-0000"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>담당자 이메일</span>
            <input
              type="text"
              value={form.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder="email@company.com"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* 섹션 3: 주소 */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <MapPin size={18} color="var(--accent-blue)" />
          주소
        </div>

        {/* 우편번호 + 주소 검색 */}
        <div style={{ marginBottom: 16 }}>
          <span style={labelStyle}>우편번호</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={form.zipCode}
              onChange={(e) => updateField('zipCode', e.target.value)}
              placeholder="우편번호"
              style={{ ...inputStyle, maxWidth: 160 }}
            />
            <button
              onClick={handleAddressSearch}
              style={{ ...buttonStyle('secondary'), whiteSpace: 'nowrap' }}
            >
              <Search size={14} />
              주소 검색
            </button>
          </div>
        </div>

        <div style={gridStyle(2)}>
          <div>
            <span style={labelStyle}>기본 주소</span>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="기본 주소"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>상세 주소</span>
            <input
              type="text"
              value={form.addressDetail}
              onChange={(e) => updateField('addressDetail', e.target.value)}
              placeholder="상세 주소"
              style={inputStyle}
            />
          </div>
        </div>

        {/* 배송지 */}
        <div style={{ marginTop: 16 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            <input
              type="checkbox"
              checked={form.sameAsAddress}
              onChange={(e) => updateField('sameAsAddress', e.target.checked)}
              style={{ accentColor: 'var(--accent-blue)' }}
            />
            기본 주소와 동일
          </label>
          <div style={gridStyle(2)}>
            <div>
              <span style={labelStyle}>배송지 주소</span>
              <input
                type="text"
                value={form.sameAsAddress ? `${form.address} ${form.addressDetail}`.trim() : form.shippingAddress}
                onChange={(e) => updateField('shippingAddress', e.target.value)}
                disabled={form.sameAsAddress}
                placeholder="배송지 주소"
                style={{
                  ...inputStyle,
                  ...(form.sameAsAddress ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                }}
              />
            </div>
            <div>
              <span style={labelStyle}>배송 메모</span>
              <input
                type="text"
                value={form.shippingMemo}
                onChange={(e) => updateField('shippingMemo', e.target.value)}
                placeholder="출고 시 자동으로 이 메모가 채워집니다"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 섹션 4: 거래 조건 */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <CreditCard size={18} color="var(--accent-blue)" />
          거래 조건
        </div>

        <div style={gridStyle(4)}>
          <div>
            <span style={labelStyle}>결제 조건</span>
            <select
              value={form.paymentTerms}
              onChange={(e) => updateField('paymentTerms', e.target.value as PaymentTerms)}
              style={selectStyle}
            >
              <option value="COD">즉시</option>
              <option value="NET30">30일</option>
              <option value="NET60">60일</option>
              <option value="BILL">어음</option>
            </select>
          </div>
          <div>
            <span style={labelStyle}>여신 한도 (만원)</span>
            <input
              type="number"
              value={form.creditLimit}
              onChange={(e) => updateField('creditLimit', e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>거래 통화</span>
            <select
              value={form.currency}
              onChange={(e) => updateField('currency', e.target.value as Currency)}
              style={selectStyle}
            >
              <option value="KRW">KRW (원)</option>
              <option value="USD">USD (달러)</option>
              <option value="EUR">EUR (유로)</option>
            </select>
          </div>
          <div>
            <span style={labelStyle}>과세 유형</span>
            <select
              value={form.taxType}
              onChange={(e) => updateField('taxType', e.target.value as TaxType)}
              style={selectStyle}
            >
              <option value="TAXABLE">과세</option>
              <option value="TAX_FREE">면세</option>
              <option value="ZERO_RATE">영세율</option>
            </select>
          </div>
        </div>
      </div>

      {/* 섹션 5: 공급업체 전용 */}
      {showSupplierSection && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <Truck size={18} color="var(--accent-blue)" />
            공급업체 전용
          </div>

          <div style={gridStyle(3)}>
            <div>
              <span style={labelStyle}>기본 리드타임 (일)</span>
              <input
                type="number"
                value={form.defaultLeadTime}
                onChange={(e) => updateField('defaultLeadTime', e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <span style={labelStyle}>최소 발주량</span>
              <input
                type="number"
                value={form.minOrderQty}
                onChange={(e) => updateField('minOrderQty', e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <span style={labelStyle}>품질 등급</span>
              <select
                value={form.qualityGrade}
                onChange={(e) => updateField('qualityGrade', e.target.value as QualityGrade)}
                style={selectStyle}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 섹션 6: 담당자 등록 */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={sectionTitleStyle}>
            <Users size={18} color="var(--accent-blue)" />
            담당자 등록
          </div>
          <button onClick={addContact} style={buttonStyle('secondary')}>
            <Plus size={14} />
            담당자 추가
          </button>
        </div>

        {form.contacts.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 0',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            등록된 담당자가 없습니다. [+ 담당자 추가] 버튼을 눌러 추가하세요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.contacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${contact.isPrimary ? 'var(--accent-blue)' : 'var(--border-muted)'}`,
                  background: contact.isPrimary ? 'rgba(45,125,210,0.06)' : 'transparent',
                }}
              >
                <input
                  type="text"
                  value={contact.department}
                  onChange={(e) => updateContact(contact.id, 'department', e.target.value)}
                  placeholder="부서"
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                />
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                  placeholder="이름"
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                />
                <input
                  type="text"
                  value={contact.phone}
                  onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                  placeholder="연락처"
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                />
                <input
                  type="text"
                  value={contact.email}
                  onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                  placeholder="이메일"
                  style={{ ...inputStyle, flex: 1.5, minWidth: 0 }}
                />
                {/* 대표 지정 토글 */}
                <button
                  onClick={() => updateContact(contact.id, 'isPrimary', !contact.isPrimary)}
                  title={contact.isPrimary ? '대표 담당자' : '대표 지정'}
                  style={{
                    ...buttonStyle('ghost'),
                    padding: 6,
                    color: contact.isPrimary ? 'var(--accent-blue)' : 'var(--text-muted)',
                  }}
                >
                  <Star size={16} fill={contact.isPrimary ? 'var(--accent-blue)' : 'none'} />
                </button>
                {/* 삭제 */}
                <button
                  onClick={() => removeContact(contact.id)}
                  title="담당자 삭제"
                  style={buttonStyle('danger')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 섹션 7: 계좌 등록 */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={sectionTitleStyle}>
            <CreditCard size={18} color="var(--accent-blue)" />
            계좌 등록
          </div>
          <button onClick={addBankAccount} style={buttonStyle('secondary')}>
            <Plus size={14} />
            계좌 추가
          </button>
        </div>

        {form.bankAccounts.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 0',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            등록된 계좌가 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.bankAccounts.map((account) => (
              <div
                key={account.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${account.isPrimary ? 'var(--accent-blue)' : 'var(--border-muted)'}`,
                  background: account.isPrimary ? 'rgba(45,125,210,0.06)' : 'transparent',
                }}
              >
                {/* 은행 선택 */}
                <select
                  value={account.bankName}
                  onChange={(e) => updateBankAccount(account.id, 'bankName', e.target.value)}
                  style={{ ...selectStyle, flex: 0.8, minWidth: 0 }}
                >
                  <option value="국민">국민</option>
                  <option value="신한">신한</option>
                  <option value="우리">우리</option>
                  <option value="하나">하나</option>
                  <option value="기업">기업</option>
                  <option value="농협">농협</option>
                  <option value="SC">SC</option>
                  <option value="기타">기타</option>
                </select>
                {/* 계좌번호 */}
                <input
                  type="text"
                  value={account.accountNo}
                  onChange={(e) => updateBankAccount(account.id, 'accountNo', e.target.value)}
                  placeholder="계좌번호"
                  style={{ ...inputStyle, flex: 1.5, minWidth: 0 }}
                />
                {/* 예금주 */}
                <input
                  type="text"
                  value={account.accountHolder}
                  onChange={(e) => updateBankAccount(account.id, 'accountHolder', e.target.value)}
                  placeholder="예금주"
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                />
                {/* 대표 계좌 토글 */}
                <button
                  onClick={() => updateBankAccount(account.id, 'isPrimary', !account.isPrimary)}
                  title={account.isPrimary ? '대표 계좌' : '대표 지정'}
                  style={{
                    ...buttonStyle('ghost'),
                    padding: 6,
                    color: account.isPrimary ? 'var(--accent-blue)' : 'var(--text-muted)',
                  }}
                >
                  <Star size={16} fill={account.isPrimary ? 'var(--accent-blue)' : 'none'} />
                </button>
                {/* 삭제 */}
                <button
                  onClick={() => removeBankAccount(account.id)}
                  title="계좌 삭제"
                  style={buttonStyle('danger')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 섹션 8: 첨부파일 */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={sectionTitleStyle}>
            <FileText size={18} color="var(--accent-blue)" />
            첨부파일
          </div>
          <button onClick={addAttachment} style={buttonStyle('secondary')}>
            <Plus size={14} />
            파일 추가
          </button>
        </div>

        {form.attachments.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 0',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            첨부된 파일이 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.attachments.map((attachment) => (
              <div
                key={attachment.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--border-muted)',
                }}
              >
                {/* 파일 유형 */}
                <select
                  value={attachment.fileType}
                  onChange={(e) => updateAttachmentType(attachment.id, e.target.value)}
                  style={{ ...selectStyle, flex: 0.8, minWidth: 0 }}
                >
                  <option value="사업자등록증">사업자등록증</option>
                  <option value="통장사본">통장사본</option>
                  <option value="계약서">계약서</option>
                  <option value="기타">기타</option>
                </select>
                {/* 파일명 */}
                <span
                  style={{
                    flex: 2,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {attachment.fileName}
                </span>
                {/* 삭제 */}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  title="파일 삭제"
                  style={buttonStyle('danger')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 섹션 9: 메모/태그 */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Tag size={18} color="var(--accent-blue)" />
          메모 / 태그
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={labelStyle}>메모</span>
          <textarea
            value={form.memo}
            onChange={(e) => updateField('memo', e.target.value)}
            placeholder="거래처에 대한 메모를 입력하세요"
            rows={4}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div>
          <span style={labelStyle}>태그 (쉼표로 구분)</span>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => updateField('tags', e.target.value)}
            placeholder="예: 주요거래처, 서울, 전자부품"
            style={inputStyle}
          />
          {/* 태그 미리보기 */}
          {form.tags && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {form.tags.split(',').filter((t) => t.trim()).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 12,
                    background: 'var(--bg-hover)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                  }}
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 푸터 액션 버튼 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          paddingTop: 8,
          paddingBottom: 40,
        }}
      >
        <button onClick={onBack} style={buttonStyle('secondary')}>
          취소
        </button>
        <button onClick={handleSave} style={buttonStyle('primary')}>
          <Save size={16} />
          저장
        </button>
      </div>
    </div>
  );
}
