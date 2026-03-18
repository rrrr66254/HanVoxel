/**
 * 업체 등록/수정 폼 컴포넌트
 * editPartnerId가 있으면 수정 모드, 없으면 등록 모드로 동작한다.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// ── 타입 ────────────────────────────────────────

interface Props {
  onBack: () => void;
  editPartnerId?: string;
}

type PartnerType = 'SUPPLIER' | 'CUSTOMER' | 'BOTH';
type PaymentTerms = 'COD' | 'NET15' | 'NET30' | 'NET45' | 'NET60';

interface FormData {
  type: PartnerType | '';
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
  paymentTerms: PaymentTerms | '';
  note: string;
}

interface FormErrors {
  type?: string;
  name?: string;
  code?: string;
  bizNo?: string;
}

// ── 상수 ────────────────────────────────────────

const PARTNER_TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'SUPPLIER', label: '공급업체' },
  { value: 'CUSTOMER', label: '고객사' },
  { value: 'BOTH', label: '공급업체 + 고객사' },
];

const PAYMENT_TERMS_OPTIONS: { value: PaymentTerms; label: string }[] = [
  { value: 'COD', label: 'COD (현금 즉시 결제)' },
  { value: 'NET15', label: 'NET 15 (15일 결제)' },
  { value: 'NET30', label: 'NET 30 (30일 결제)' },
  { value: 'NET45', label: 'NET 45 (45일 결제)' },
  { value: 'NET60', label: 'NET 60 (60일 결제)' },
];

// 사업자등록번호 포맷 정규식: xxx-xx-xxxxx
const BIZ_NO_REGEX = /^\d{3}-\d{2}-\d{5}$/;

// ── 스타일 헬퍼 ─────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  padding: '10px 14px',
  color: 'var(--text-primary)',
  width: '100%',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  border: '1px solid var(--accent-red)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

const requiredMarkStyle: React.CSSProperties = {
  color: 'var(--accent-red)',
  marginLeft: 3,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '1px solid var(--border-muted)',
};

const fieldContainerStyle: React.CSSProperties = {
  marginBottom: 16,
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--accent-red)',
  marginTop: 4,
};

// ── 컴포넌트 ─────────────────────────────────────

export function PartnerForm({ onBack, editPartnerId }: Props) {
  const isEditMode = Boolean(editPartnerId);

  const [formData, setFormData] = useState<FormData>({
    type: '',
    name: '',
    code: '',
    bizNo: '',
    ceoName: '',
    bizType: '',
    bizCategory: '',
    address: '',
    phone: '',
    email: '',
    contactName: '',
    paymentTerms: '',
    note: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── 수정 모드: 기존 데이터 로드 ───────────────

  useEffect(() => {
    if (!editPartnerId) return;

    setIsLoading(true);
    (async () => {
      try {
        // partner-api를 동적으로 임포트한다
        const api = await import('../../api/partner-api').catch(() => null);
        if (!api) {
          console.log('[PartnerForm] partner-api 모듈 없음 — 목업 데이터 사용');
          return;
        }
        const partner = await api.getPartner(editPartnerId);
        setFormData({
          type: partner.type,
          name: partner.name,
          code: partner.code,
          bizNo: partner.bizNo ?? '',
          ceoName: partner.ceoName ?? '',
          bizType: partner.bizType ?? '',
          bizCategory: partner.bizCategory ?? '',
          address: partner.address ?? '',
          phone: partner.phone ?? '',
          email: partner.email ?? '',
          contactName: partner.contactName ?? '',
          paymentTerms: (partner.paymentTerms as PaymentTerms | null) ?? '',
          note: partner.note ?? '',
        });
      } catch (err) {
        setErrorMsg('업체 정보를 불러오지 못했습니다.');
        console.error('[PartnerForm] getPartner 오류:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [editPartnerId]);

  // ── 코드 자동 생성 ─────────────────────────────

  const handleAutoGenerateCode = useCallback(() => {
    // 타임스탬프 끝 6자리를 코드로 사용한다
    const suffix = String(Date.now()).slice(-6);
    setFormData((prev) => ({ ...prev, code: `P-${suffix}` }));
    // 코드 에러 초기화
    setErrors((prev) => ({ ...prev, code: undefined }));
  }, []);

  // ── 입력 변경 핸들러 ───────────────────────────

  const handleChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // 입력 시 해당 필드 에러 초기화
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  // ── 사업자등록번호 자동 포맷 ───────────────────
  // 숫자만 입력받아 xxx-xx-xxxxx 형식으로 변환한다

  const handleBizNoChange = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    } else if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    setFormData((prev) => ({ ...prev, bizNo: formatted }));
    setErrors((prev) => ({ ...prev, bizNo: undefined }));
  }, []);

  // ── 유효성 검사 ────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.type) {
      newErrors.type = '업체 유형을 선택해 주세요.';
    }
    if (!formData.name.trim()) {
      newErrors.name = '업체명을 입력해 주세요.';
    }
    if (!formData.code.trim()) {
      newErrors.code = '업체 코드를 입력해 주세요.';
    }
    if (formData.bizNo && !BIZ_NO_REGEX.test(formData.bizNo)) {
      newErrors.bizNo = '사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── 저장 ───────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    // 빈 문자열은 undefined로 변환해 API 전송한다
    const payload: Record<string, unknown> = {
      type: formData.type,
      name: formData.name.trim(),
      code: formData.code.trim(),
      ...(formData.bizNo && { bizNo: formData.bizNo }),
      ...(formData.ceoName.trim() && { ceoName: formData.ceoName.trim() }),
      ...(formData.bizType.trim() && { bizType: formData.bizType.trim() }),
      ...(formData.bizCategory.trim() && { bizCategory: formData.bizCategory.trim() }),
      ...(formData.address.trim() && { address: formData.address.trim() }),
      ...(formData.phone.trim() && { phone: formData.phone.trim() }),
      ...(formData.email.trim() && { email: formData.email.trim() }),
      ...(formData.contactName.trim() && { contactName: formData.contactName.trim() }),
      ...(formData.paymentTerms && { paymentTerms: formData.paymentTerms }),
      ...(formData.note.trim() && { note: formData.note.trim() }),
    };

    try {
      const api = await import('../../api/partner-api').catch(() => null);

      if (api) {
        if (isEditMode && editPartnerId) {
          await api.updatePartner(editPartnerId, payload);
        } else {
          // 신규 생성 시 companyId는 로컬 스토리지 또는 환경에서 가져온다
          const companyId = localStorage.getItem('companyId') ?? 'default';
          await api.createPartner({ companyId, ...(payload as Parameters<typeof api.createPartner>[0]) });
        }
      } else {
        // API 모듈이 없으면 콘솔에 출력한다
        console.log('[PartnerForm] 저장 payload:', payload);
      }

      setSuccessMsg(isEditMode ? '업체 정보가 수정되었습니다.' : '업체가 등록되었습니다.');

      // 1.2초 후 목록으로 이동한다
      setTimeout(() => {
        onBack();
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.';
      setErrorMsg(msg);
      console.error('[PartnerForm] 저장 오류:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── 렌더링 ─────────────────────────────────────

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 300,
          color: 'var(--text-muted)',
          gap: 10,
        }}
      >
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span>업체 정보를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 0 40px' }}>

      {/* ── 헤더 ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          title="목록으로 돌아가기"
        >
          <ArrowLeft size={20} />
        </button>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {isEditMode ? '업체 수정' : '업체 등록'}
        </h2>
      </div>

      {/* ── 성공 메시지 ── */}
      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            color: 'var(--accent-green)',
            fontSize: 14,
          }}
        >
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* ── 오류 메시지 ── */}
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid var(--accent-red)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            color: 'var(--accent-red)',
            fontSize: 14,
          }}
        >
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* ── 섹션 1: 기본정보 ── */}
      <section
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-muted)',
          borderRadius: 12,
          padding: '24px',
          marginBottom: 16,
        }}
      >
        <p style={sectionTitleStyle}>기본정보</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>

          {/* 업체 유형 */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>
              업체 유형<span style={requiredMarkStyle}>*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              style={errors.type ? inputErrorStyle : inputStyle}
            >
              <option value="">유형 선택</option>
              {PARTNER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.type && <p style={errorTextStyle}>{errors.type}</p>}
          </div>

          {/* 업체명 */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>
              업체명<span style={requiredMarkStyle}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="예: (주)한국물류"
              style={errors.name ? inputErrorStyle : inputStyle}
            />
            {errors.name && <p style={errorTextStyle}>{errors.name}</p>}
          </div>

          {/* 업체 코드 */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>
              업체 코드<span style={requiredMarkStyle}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="예: P-001234"
                style={errors.code ? { ...inputErrorStyle, flex: 1 } : { ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleAutoGenerateCode}
                title="코드 자동 생성"
                style={{
                  flexShrink: 0,
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  padding: '0 12px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                <RefreshCw size={14} />
                자동 생성
              </button>
            </div>
            {errors.code && <p style={errorTextStyle}>{errors.code}</p>}
          </div>

          {/* 사업자등록번호 */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>사업자등록번호</label>
            <input
              type="text"
              value={formData.bizNo}
              onChange={(e) => handleBizNoChange(e.target.value)}
              placeholder="123-45-67890"
              maxLength={12}
              style={errors.bizNo ? inputErrorStyle : inputStyle}
            />
            {errors.bizNo && <p style={errorTextStyle}>{errors.bizNo}</p>}
          </div>

          {/* 대표자명 */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>대표자명</label>
            <input
              type="text"
              value={formData.ceoName}
              onChange={(e) => handleChange('ceoName', e.target.value)}
              placeholder="예: 홍길동"
              style={inputStyle}
            />
          </div>

          {/* 업태 */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>업태</label>
            <input
              type="text"
              value={formData.bizType}
              onChange={(e) => handleChange('bizType', e.target.value)}
              placeholder="예: 제조업"
              style={inputStyle}
            />
          </div>

          {/* 종목 (전체 너비) */}
          <div style={{ ...fieldContainerStyle, gridColumn: '1 / -1' }}>
            <label style={labelStyle}>종목</label>
            <input
              type="text"
              value={formData.bizCategory}
              onChange={(e) => handleChange('bizCategory', e.target.value)}
              placeholder="예: 자동차 부품 제조"
              style={inputStyle}
            />
          </div>

        </div>
      </section>

      {/* ── 섹션 2: 연락처 ── */}
      <section
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-muted)',
          borderRadius: 12,
          padding: '24px',
          marginBottom: 16,
        }}
      >
        <p style={sectionTitleStyle}>연락처</p>

        {/* 주소 (전체 너비) */}
        <div style={fieldContainerStyle}>
          <label style={labelStyle}>주소</label>
          <textarea
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="예: 서울특별시 강남구 테헤란로 123"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>

          {/* 전화번호 */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>전화번호</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="예: 02-1234-5678"
              style={inputStyle}
            />
          </div>

          {/* 이메일 */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>이메일</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="예: contact@company.com"
              style={inputStyle}
            />
          </div>

          {/* 담당자명 */}
          <div style={{ ...fieldContainerStyle, gridColumn: '1 / -1' }}>
            <label style={labelStyle}>담당자명</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              placeholder="예: 김담당"
              style={inputStyle}
            />
          </div>

        </div>
      </section>

      {/* ── 섹션 3: 거래조건 ── */}
      <section
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-muted)',
          borderRadius: 12,
          padding: '24px',
          marginBottom: 24,
        }}
      >
        <p style={sectionTitleStyle}>거래조건</p>

        {/* 결제 조건 */}
        <div style={fieldContainerStyle}>
          <label style={labelStyle}>결제 조건</label>
          <select
            value={formData.paymentTerms}
            onChange={(e) => handleChange('paymentTerms', e.target.value)}
            style={inputStyle}
          >
            <option value="">결제 조건 선택 (선택 사항)</option>
            {PAYMENT_TERMS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 비고 */}
        <div style={fieldContainerStyle}>
          <label style={labelStyle}>비고</label>
          <textarea
            value={formData.note}
            onChange={(e) => handleChange('note', e.target.value)}
            placeholder="업체에 대한 추가 메모를 입력하세요."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>
      </section>

      {/* ── 하단 버튼 ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={onBack}
          disabled={isSaving}
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '10px 20px',
            color: 'var(--text-secondary)',
            fontSize: 14,
            fontWeight: 500,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.5 : 1,
          }}
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            background: 'var(--accent-blue)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {isSaving ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              저장 중...
            </>
          ) : (
            <>
              <Save size={16} />
              {isEditMode ? '수정 완료' : '업체 등록'}
            </>
          )}
        </button>
      </div>

    </div>
  );
}
