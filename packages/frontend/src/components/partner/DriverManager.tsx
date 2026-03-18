import React, { useState } from 'react';
import { Phone, Plus, Edit, UserX, Truck, X } from 'lucide-react';

// 배송 기사 인터페이스
interface Driver {
  id: string;
  name: string;
  phone: string;
  carrier: string;
  vehiclePlate: string;
  vehicleType: string;
  isDedicated: boolean;
  lastDeliveryDate: string | null;
  totalDeliveries: number;
  memo: string;
  isActive: boolean;
}

// 기사 등록/수정 폼 데이터
interface DriverFormData {
  name: string;
  phone: string;
  carrier: string;
  customCarrier: string;
  vehiclePlate: string;
  vehicleType: string;
  isDedicated: boolean;
  memo: string;
}

interface DriverManagerProps {
  onBack: () => void;
}

// 운송사 목록
const CARRIERS = [
  'CJ대한통운',
  '한진택배',
  '롯데택배',
  '로젠택배',
  '우체국택배',
  '직접 입력',
] as const;

// 차량 종류 목록
const VEHICLE_TYPES = [
  '1톤',
  '2.5톤',
  '5톤',
  '11톤',
  '윙바디',
  '냉동차',
  '탑차',
] as const;

// 목업 기사 데이터
const MOCK_DRIVERS: Driver[] = [
  {
    id: 'drv-001',
    name: '김태호',
    phone: '010-3456-7890',
    carrier: 'CJ대한통운',
    vehiclePlate: '경기 12가 3456',
    vehicleType: '5톤',
    isDedicated: true,
    lastDeliveryDate: '2026-03-17',
    totalDeliveries: 284,
    memo: '새벽 배송 가능, 수도권 전담',
    isActive: true,
  },
  {
    id: 'drv-002',
    name: '이준혁',
    phone: '010-9876-5432',
    carrier: '한진택배',
    vehiclePlate: '서울 34나 5678',
    vehicleType: '2.5톤',
    isDedicated: false,
    lastDeliveryDate: '2026-03-15',
    totalDeliveries: 152,
    memo: '',
    isActive: true,
  },
  {
    id: 'drv-003',
    name: '박성민',
    phone: '010-1234-5678',
    carrier: '롯데택배',
    vehiclePlate: '인천 56다 7890',
    vehicleType: '냉동차',
    isDedicated: true,
    lastDeliveryDate: '2026-03-18',
    totalDeliveries: 431,
    memo: '냉동/냉장 전문, 식품 배송 전담',
    isActive: true,
  },
  {
    id: 'drv-004',
    name: '최영수',
    phone: '010-5555-1234',
    carrier: '로젠택배',
    vehiclePlate: '경기 78라 1234',
    vehicleType: '11톤',
    isDedicated: false,
    lastDeliveryDate: '2026-03-10',
    totalDeliveries: 89,
    memo: '장거리 운송 가능',
    isActive: true,
  },
  {
    id: 'drv-005',
    name: '정하늘',
    phone: '010-2222-3333',
    carrier: 'CJ대한통운',
    vehiclePlate: '서울 90마 5678',
    vehicleType: '탑차',
    isDedicated: true,
    lastDeliveryDate: '2026-03-16',
    totalDeliveries: 197,
    memo: '전자제품 전담, 취급주의 화물 경험 풍부',
    isActive: true,
  },
  {
    id: 'drv-006',
    name: '윤서진',
    phone: '010-7777-8888',
    carrier: '우체국택배',
    vehiclePlate: '부산 23바 4567',
    vehicleType: '1톤',
    isDedicated: false,
    lastDeliveryDate: '2026-02-28',
    totalDeliveries: 63,
    memo: '부산/경남 지역 배송',
    isActive: true,
  },
];

// 초기 폼 데이터
const INITIAL_FORM: DriverFormData = {
  name: '',
  phone: '',
  carrier: '',
  customCarrier: '',
  vehiclePlate: '',
  vehicleType: '',
  isDedicated: false,
  memo: '',
};

export function DriverManager({ onBack }: DriverManagerProps) {
  const [drivers, setDrivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<DriverFormData>(INITIAL_FORM);

  // 모달 열기 (등록)
  const handleOpenCreate = () => {
    setEditingDriver(null);
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  // 모달 열기 (수정)
  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    const isCustomCarrier = !CARRIERS.slice(0, -1).includes(driver.carrier as typeof CARRIERS[number]);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      carrier: isCustomCarrier ? '직접 입력' : driver.carrier,
      customCarrier: isCustomCarrier ? driver.carrier : '',
      vehiclePlate: driver.vehiclePlate,
      vehicleType: driver.vehicleType,
      isDedicated: driver.isDedicated,
      memo: driver.memo,
    });
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setFormData(INITIAL_FORM);
  };

  // 폼 입력 처리
  const handleFormChange = (field: keyof DriverFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 저장 처리
  const handleSave = () => {
    if (!formData.name.trim() || !formData.phone.trim()) return;

    const resolvedCarrier = formData.carrier === '직접 입력'
      ? formData.customCarrier
      : formData.carrier;

    if (editingDriver) {
      // 수정
      setDrivers(prev =>
        prev.map(d =>
          d.id === editingDriver.id
            ? {
                ...d,
                name: formData.name,
                phone: formData.phone,
                carrier: resolvedCarrier,
                vehiclePlate: formData.vehiclePlate,
                vehicleType: formData.vehicleType,
                isDedicated: formData.isDedicated,
                memo: formData.memo,
              }
            : d
        )
      );
    } else {
      // 신규 등록
      const newDriver: Driver = {
        id: `drv-${Date.now()}`,
        name: formData.name,
        phone: formData.phone,
        carrier: resolvedCarrier,
        vehiclePlate: formData.vehiclePlate,
        vehicleType: formData.vehicleType,
        isDedicated: formData.isDedicated,
        lastDeliveryDate: null,
        totalDeliveries: 0,
        memo: formData.memo,
        isActive: true,
      };
      setDrivers(prev => [newDriver, ...prev]);
    }

    handleCloseModal();
  };

  // 비활성화 처리
  const handleDeactivate = (driverId: string) => {
    setDrivers(prev =>
      prev.map(d =>
        d.id === driverId ? { ...d, isActive: !d.isActive } : d
      )
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Truck size={24} style={{ color: 'var(--accent-blue)' }} />
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            배송 기사 관리
          </h1>
        </div>
        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'var(--accent-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          기사 등록
        </button>
      </div>

      {/* 기사 목록 테이블 */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}>
          <thead>
            <tr style={{
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-default)',
            }}>
              {['기사명', '운송사', '차량번호', '차량 종류', '전담 여부', '최근 배송일', '총 배송 건수', '액션'].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr
                key={driver.id}
                style={{
                  borderBottom: '1px solid var(--border-muted)',
                  opacity: driver.isActive ? 1 : 0.5,
                }}
              >
                {/* 기사명 */}
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    {driver.name}
                  </span>
                </td>

                {/* 운송사 */}
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}>
                    {driver.carrier}
                  </span>
                </td>

                {/* 차량번호 */}
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                  }}>
                    {driver.vehiclePlate}
                  </span>
                </td>

                {/* 차량 종류 */}
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-muted)',
                  }}>
                    {driver.vehicleType}
                  </span>
                </td>

                {/* 전담 여부 */}
                <td style={{ padding: '12px 16px' }}>
                  {driver.isDedicated ? (
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'color-mix(in srgb, var(--accent-green) 15%, transparent)',
                      color: 'var(--accent-green)',
                    }}>
                      전담
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}>
                      -
                    </span>
                  )}
                </td>

                {/* 최근 배송일 */}
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}>
                    {driver.lastDeliveryDate ?? '-'}
                  </span>
                </td>

                {/* 총 배송 건수 */}
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    {driver.totalDeliveries.toLocaleString()}건
                  </span>
                </td>

                {/* 액션 버튼 */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {/* 전화 버튼 */}
                    <a
                      href={`tel:${driver.phone}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--accent-green)',
                        cursor: 'pointer',
                        textDecoration: 'none',
                      }}
                      title={`전화: ${driver.phone}`}
                    >
                      <Phone size={14} />
                    </a>

                    {/* 수정 버튼 */}
                    <button
                      onClick={() => handleOpenEdit(driver)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--accent-blue)',
                        cursor: 'pointer',
                      }}
                      title="수정"
                    >
                      <Edit size={14} />
                    </button>

                    {/* 비활성화 버튼 */}
                    <button
                      onClick={() => handleDeactivate(driver.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-primary)',
                        color: driver.isActive ? 'var(--accent-red)' : 'var(--accent-green)',
                        cursor: 'pointer',
                      }}
                      title={driver.isActive ? '비활성화' : '활성화'}
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 기사 등록/수정 모달 */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '16px',
              width: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-default)',
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}>
                {editingDriver ? '기사 정보 수정' : '기사 등록'}
              </h2>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 모달 폼 */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 기사명 */}
              <div>
                <label style={labelStyle}>
                  기사명 <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="홍길동"
                  style={inputStyle}
                />
              </div>

              {/* 연락처 */}
              <div>
                <label style={labelStyle}>
                  연락처 <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  placeholder="010-1234-5678"
                  style={inputStyle}
                />
              </div>

              {/* 소속 운송사 */}
              <div>
                <label style={labelStyle}>소속 운송사</label>
                <select
                  value={formData.carrier}
                  onChange={(e) => handleFormChange('carrier', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">선택하세요</option>
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {/* 직접 입력 필드 */}
                {formData.carrier === '직접 입력' && (
                  <input
                    type="text"
                    value={formData.customCarrier}
                    onChange={(e) => handleFormChange('customCarrier', e.target.value)}
                    placeholder="운송사명을 입력하세요"
                    style={{ ...inputStyle, marginTop: '8px' }}
                  />
                )}
              </div>

              {/* 차량번호 */}
              <div>
                <label style={labelStyle}>차량번호</label>
                <input
                  type="text"
                  value={formData.vehiclePlate}
                  onChange={(e) => handleFormChange('vehiclePlate', e.target.value)}
                  placeholder="경기 12가 3456"
                  style={inputStyle}
                />
              </div>

              {/* 차량 종류 */}
              <div>
                <label style={labelStyle}>차량 종류</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => handleFormChange('vehicleType', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">선택하세요</option>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* 전담 기사 여부 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>전담 기사 여부</label>
                <button
                  type="button"
                  onClick={() => handleFormChange('isDedicated', !formData.isDedicated)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: formData.isDedicated ? 'var(--accent-blue)' : 'var(--border-default)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: formData.isDedicated ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>

              {/* 메모 */}
              <div>
                <label style={labelStyle}>메모</label>
                <textarea
                  value={formData.memo}
                  onChange={(e) => handleFormChange('memo', e.target.value)}
                  placeholder="새벽 배송 가능, 냉동차 보유 등"
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* 모달 푸터 */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              padding: '16px 24px',
              borderTop: '1px solid var(--border-default)',
            }}>
              <button
                onClick={handleCloseModal}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.phone.trim()}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: (!formData.name.trim() || !formData.phone.trim())
                    ? 'var(--border-default)'
                    : 'var(--accent-blue)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: (!formData.name.trim() || !formData.phone.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {editingDriver ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 공통 스타일
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};
