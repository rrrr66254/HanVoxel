import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Truck,
  Phone,
  Car,
  User,
  Edit2,
  Trash2,
  X,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { DeliveryDriver } from '../../api/partner-api';

// 차량 종류 옵션
const VEHICLE_TYPE_OPTIONS = [
  { value: 'TRUCK_1T',    label: '1톤 트럭' },
  { value: 'TRUCK_2_5T', label: '2.5톤 트럭' },
  { value: 'TRUCK_5T',   label: '5톤 트럭' },
  { value: 'TRUCK_11T',  label: '11톤 트럭' },
  { value: 'WING_BODY',  label: '윙바디' },
  { value: 'CONTAINER',  label: '컨테이너' },
] as const;

type VehicleType = typeof VEHICLE_TYPE_OPTIONS[number]['value'];

// 차량 종류 배지 색상
const VEHICLE_TYPE_COLOR: Record<VehicleType, { bg: string; text: string }> = {
  TRUCK_1T:    { bg: 'rgba(59,130,246,0.15)',  text: 'var(--accent-blue)' },
  TRUCK_2_5T:  { bg: 'rgba(34,197,94,0.15)',   text: 'var(--accent-green)' },
  TRUCK_5T:    { bg: 'rgba(249,115,22,0.15)',  text: 'var(--accent-orange)' },
  TRUCK_11T:   { bg: 'rgba(239,68,68,0.15)',   text: 'var(--accent-red)' },
  WING_BODY:   { bg: 'rgba(168,85,247,0.15)',  text: '#a855f7' },
  CONTAINER:   { bg: 'rgba(148,163,184,0.15)', text: 'var(--text-secondary)' },
};

// 목업 데이터 — API 연결 실패 시 폴백
const MOCK_DRIVERS: DeliveryDriver[] = [
  {
    id: 'drv-001',
    partnerId: 'ptn-001',
    name: '김철수',
    phone: '010-1234-5678',
    vehicleNo: '12가3456',
    vehicleType: 'TRUCK_5T',
    note: '경기 북부 담당',
    isActive: true,
    createdAt: '2025-01-10T09:00:00Z',
    partner: { id: 'ptn-001', name: '한국물류(주)', code: 'KL-001' },
  },
  {
    id: 'drv-002',
    partnerId: 'ptn-001',
    name: '이영희',
    phone: '010-2345-6789',
    vehicleNo: '34나7890',
    vehicleType: 'WING_BODY',
    note: '서울 도심 배송 전담',
    isActive: true,
    createdAt: '2025-02-15T10:00:00Z',
    partner: { id: 'ptn-001', name: '한국물류(주)', code: 'KL-001' },
  },
  {
    id: 'drv-003',
    partnerId: 'ptn-002',
    name: '박민준',
    phone: '010-3456-7890',
    vehicleNo: '56다1234',
    vehicleType: 'TRUCK_1T',
    note: null,
    isActive: true,
    createdAt: '2025-03-01T08:30:00Z',
    partner: { id: 'ptn-002', name: '대한운송', code: 'DH-002' },
  },
  {
    id: 'drv-004',
    partnerId: null,
    name: '최서연',
    phone: '010-4567-8901',
    vehicleNo: '78라5678',
    vehicleType: 'TRUCK_2_5T',
    note: '개인 계약 기사',
    isActive: false,
    createdAt: '2025-01-20T14:00:00Z',
    partner: null,
  },
  {
    id: 'drv-005',
    partnerId: 'ptn-003',
    name: '정도현',
    phone: '010-5678-9012',
    vehicleNo: '90마2345',
    vehicleType: 'TRUCK_11T',
    note: '장거리 전문',
    isActive: true,
    createdAt: '2025-02-28T11:00:00Z',
    partner: { id: 'ptn-003', name: '신속배송', code: 'SS-003' },
  },
  {
    id: 'drv-006',
    partnerId: 'ptn-002',
    name: '윤지아',
    phone: '010-6789-0123',
    vehicleNo: '11바6789',
    vehicleType: 'CONTAINER',
    note: '항만 셔틀 담당',
    isActive: true,
    createdAt: '2025-03-10T09:30:00Z',
    partner: { id: 'ptn-002', name: '대한운송', code: 'DH-002' },
  },
];

// 폼 입력값 타입
interface DriverFormData {
  name: string;
  phone: string;
  vehicleNo: string;
  vehicleType: string;
  partnerId: string;
  note: string;
}

const EMPTY_FORM: DriverFormData = {
  name: '',
  phone: '',
  vehicleNo: '',
  vehicleType: '',
  partnerId: '',
  note: '',
};

interface Props {
  onBack: () => void;
}

export function DriverManager({ onBack }: Props) {
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<DeliveryDriver | null>(null);
  const [formData, setFormData] = useState<DriverFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // API 동적 임포트 — 실패 시 목업 데이터 폴백
  useEffect(() => {
    let cancelled = false;

    async function loadDrivers() {
      setLoading(true);
      try {
        const api = await import('../../api/partner-api');
        const result = await api.getDrivers();
        if (!cancelled) {
          setDrivers(result.drivers.length > 0 ? result.drivers : MOCK_DRIVERS);
        }
      } catch {
        // API 연결 불가 시 목업 데이터 사용
        if (!cancelled) {
          setDrivers(MOCK_DRIVERS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDrivers();
    return () => { cancelled = true; };
  }, []);

  // 검색 필터링 (이름, 전화번호, 차량번호)
  const filtered = drivers.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      (d.vehicleNo?.toLowerCase().includes(q) ?? false)
    );
  });

  // 폼 열기 (신규)
  function handleOpenCreate() {
    setEditDriver(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }

  // 폼 열기 (수정)
  function handleOpenEdit(driver: DeliveryDriver) {
    setEditDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      vehicleNo: driver.vehicleNo ?? '',
      vehicleType: driver.vehicleType ?? '',
      partnerId: driver.partnerId ?? '',
      note: driver.note ?? '',
    });
    setShowForm(true);
  }

  // 폼 닫기
  function handleCloseForm() {
    setShowForm(false);
    setEditDriver(null);
    setFormData(EMPTY_FORM);
  }

  // 저장 (신규 / 수정)
  async function handleSave() {
    if (!formData.name.trim() || !formData.phone.trim()) return;
    setSaving(true);
    try {
      const api = await import('../../api/partner-api');
      if (editDriver) {
        // 수정
        const updated = await api.updateDriver(editDriver.id, {
          name: formData.name,
          phone: formData.phone,
          vehicleNo: formData.vehicleNo || null,
          vehicleType: formData.vehicleType || null,
          partnerId: formData.partnerId || null,
          note: formData.note || null,
        });
        setDrivers((prev) => prev.map((d) => (d.id === editDriver.id ? updated : d)));
      } else {
        // 신규
        const created = await api.createDriver({
          name: formData.name,
          phone: formData.phone,
          vehicleNo: formData.vehicleNo || undefined,
          vehicleType: formData.vehicleType || undefined,
          partnerId: formData.partnerId || undefined,
          note: formData.note || undefined,
        });
        setDrivers((prev) => [created, ...prev]);
      }
    } catch {
      // API 실패 시 목업으로 처리
      if (editDriver) {
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === editDriver.id
              ? {
                  ...d,
                  name: formData.name,
                  phone: formData.phone,
                  vehicleNo: formData.vehicleNo || null,
                  vehicleType: formData.vehicleType || null,
                  partnerId: formData.partnerId || null,
                  note: formData.note || null,
                }
              : d,
          ),
        );
      } else {
        const newDriver: DeliveryDriver = {
          id: `drv-${Date.now()}`,
          partnerId: formData.partnerId || null,
          name: formData.name,
          phone: formData.phone,
          vehicleNo: formData.vehicleNo || null,
          vehicleType: formData.vehicleType || null,
          note: formData.note || null,
          isActive: true,
          createdAt: new Date().toISOString(),
          partner: null,
        };
        setDrivers((prev) => [newDriver, ...prev]);
      }
    } finally {
      setSaving(false);
      handleCloseForm();
    }
  }

  // 삭제
  async function handleDelete(id: string) {
    if (!window.confirm('이 기사를 삭제하시겠습니까?')) return;
    try {
      const api = await import('../../api/partner-api');
      await api.deleteDriver(id);
    } catch {
      // API 실패해도 로컬 상태에서 제거
    }
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  }

  // 활성/비활성 토글
  async function handleToggleActive(driver: DeliveryDriver) {
    const next = !driver.isActive;
    setDrivers((prev) =>
      prev.map((d) => (d.id === driver.id ? { ...d, isActive: next } : d)),
    );
    try {
      const api = await import('../../api/partner-api');
      await api.updateDriver(driver.id, { isActive: next });
    } catch {
      // 실패 시 롤백
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, isActive: driver.isActive } : d)),
      );
    }
  }

  // 차량 종류 라벨 조회
  function getVehicleLabel(type: string | null): string {
    if (!type) return '미지정';
    return VEHICLE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
  }

  // 차량 종류 배지 스타일
  function getVehicleBadgeStyle(type: string | null): React.CSSProperties {
    if (!type) return { background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' };
    const color = VEHICLE_TYPE_COLOR[type as VehicleType];
    if (!color) return { background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' };
    return { background: color.bg, color: color.text };
  }

  const activeCount = drivers.filter((d) => d.isActive).length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '24px',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: '1px solid var(--border-muted)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <ArrowLeft size={14} />
          뒤로
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={22} color="var(--accent-blue)" />
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              배송 기사 관리
            </h1>
            {/* 수 배지 */}
            <span
              style={{
                background: 'rgba(59,130,246,0.15)',
                color: 'var(--accent-blue)',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              총 {drivers.length}명 · 활성 {activeCount}명
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            배송 기사를 등록하고 차량 정보를 관리합니다.
          </p>
        </div>

        {/* 기사 등록 버튼 */}
        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--accent-blue)',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <Plus size={15} />
          기사 등록
        </button>
      </div>

      {/* 인라인 등록/수정 폼 */}
      {showForm && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {editDriver ? '기사 정보 수정' : '새 기사 등록'}
            </h3>
            <button
              onClick={handleCloseForm}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {/* 이름 */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                이름 <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="기사 이름"
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                전화번호 <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                placeholder="010-0000-0000"
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 차량번호 */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                차량번호
              </label>
              <input
                type="text"
                value={formData.vehicleNo}
                onChange={(e) => setFormData((f) => ({ ...f, vehicleNo: e.target.value }))}
                placeholder="12가3456"
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 차량 종류 */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                차량 종류
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData((f) => ({ ...f, vehicleType: e.target.value }))}
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: formData.vehicleType ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <option value="">선택 안함</option>
                {VEHICLE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 소속 업체 ID */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                소속 업체 ID (선택)
              </label>
              <input
                type="text"
                value={formData.partnerId}
                onChange={(e) => setFormData((f) => ({ ...f, partnerId: e.target.value }))}
                placeholder="ptn-001"
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 메모 */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                메모
              </label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData((f) => ({ ...f, note: e.target.value }))}
                placeholder="특이사항 입력"
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* 폼 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={handleCloseForm}
              style={{
                background: 'none',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '8px 16px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name.trim() || !formData.phone.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--accent-blue)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                opacity: saving || !formData.name.trim() || !formData.phone.trim() ? 0.6 : 1,
              }}
            >
              <Check size={14} />
              {saving ? '저장 중…' : editDriver ? '수정 완료' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* 검색 바 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-muted)',
          borderRadius: '8px',
          padding: '9px 14px',
          marginBottom: '20px',
          maxWidth: '400px',
        }}
      >
        <Search size={15} color="var(--text-muted)" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 전화번호, 차량번호 검색…"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          기사 목록을 불러오는 중…
        </div>
      )}

      {/* 빈 결과 */}
      {!loading && filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-muted)',
            fontSize: '14px',
            border: '1px dashed var(--border-muted)',
            borderRadius: '12px',
          }}
        >
          <Truck size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p style={{ margin: 0 }}>
            {search ? `"${search}"에 해당하는 기사가 없습니다.` : '등록된 기사가 없습니다.'}
          </p>
        </div>
      )}

      {/* 기사 카드 그리드 — 데스크탑 3열 */}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {filtered.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              getVehicleLabel={getVehicleLabel}
              getVehicleBadgeStyle={getVehicleBadgeStyle}
              onEdit={() => handleOpenEdit(driver)}
              onDelete={() => handleDelete(driver.id)}
              onToggleActive={() => handleToggleActive(driver)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 기사 카드 컴포넌트 ─────────────────────────────────────────────

interface DriverCardProps {
  driver: DeliveryDriver;
  getVehicleLabel: (type: string | null) => string;
  getVehicleBadgeStyle: (type: string | null) => React.CSSProperties;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

function DriverCard({
  driver,
  getVehicleLabel,
  getVehicleBadgeStyle,
  onEdit,
  onDelete,
  onToggleActive,
}: DriverCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-secondary)',
        border: `1px solid ${driver.isActive ? 'var(--border-default)' : 'var(--border-muted)'}`,
        borderRadius: '12px',
        padding: '16px',
        transition: 'background 0.15s ease',
        opacity: driver.isActive ? 1 : 0.65,
      }}
    >
      {/* 카드 상단 행: 이름 + 액션 버튼 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 아바타 */}
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: driver.isActive ? 'rgba(59,130,246,0.12)' : 'rgba(148,163,184,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <User size={18} color={driver.isActive ? 'var(--accent-blue)' : 'var(--text-muted)'} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {driver.name}
            </div>
            {/* 소속 업체 */}
            {driver.partner ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {driver.partner.name}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                소속 없음
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 그룹 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* 활성/비활성 토글 */}
          <button
            onClick={onToggleActive}
            title={driver.isActive ? '비활성으로 전환' : '활성으로 전환'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: driver.isActive ? 'var(--accent-green)' : 'var(--text-muted)' }}
          >
            {driver.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          {/* 수정 */}
          <button
            onClick={onEdit}
            title="수정"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
          >
            <Edit2 size={14} />
          </button>
          {/* 삭제 */}
          <button
            onClick={onDelete}
            title="삭제"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--accent-red)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 전화번호 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Phone size={13} color="var(--text-muted)" />
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{driver.phone}</span>
      </div>

      {/* 차량번호 + 차량 종류 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: driver.note ? '10px' : '0' }}>
        <Car size={13} color="var(--text-muted)" />
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {driver.vehicleNo ?? '번호 미등록'}
        </span>
        {/* 차량 종류 배지 */}
        <span
          style={{
            ...getVehicleBadgeStyle(driver.vehicleType),
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 600,
            marginLeft: 'auto',
          }}
        >
          {getVehicleLabel(driver.vehicleType)}
        </span>
      </div>

      {/* 메모 */}
      {driver.note && (
        <div
          style={{
            marginTop: '8px',
            padding: '6px 10px',
            background: 'rgba(148,163,184,0.06)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
          }}
        >
          {driver.note}
        </div>
      )}

      {/* 비활성 상태 표시 */}
      {!driver.isActive && (
        <div
          style={{
            marginTop: '10px',
            display: 'inline-block',
            background: 'rgba(239,68,68,0.1)',
            color: 'var(--accent-red)',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          비활성
        </div>
      )}
    </div>
  );
}
