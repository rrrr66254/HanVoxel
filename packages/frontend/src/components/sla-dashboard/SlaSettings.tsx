import { useState, useEffect, useMemo } from 'react';
import {
  Settings, Target, AlertTriangle, Mail, Save, CheckCircle,
  Truck, Clock, ChevronDown, Building2, Plus,
} from 'lucide-react';
import type { SlaTargetData } from '../../api/sla-api';
import { upsertSlaTarget } from '../../api/sla-api';
import { getPartners, type PartnerData } from '../../api/erp-api';

/* 다크 테마 색상 (SlaDashboard와 동일) */
const C = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  borderFocus: '#2D7DD2',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  textDim: '#484F58',
  blue: '#2D7DD2',
  blueHover: '#3D8DE2',
  green: '#3FB950',
  greenBg: 'rgba(63,185,80,0.1)',
  red: '#F85149',
  yellow: '#D29922',
  input: '#0D1117',
};

/* localStorage 키 */
const STORAGE_KEY = 'hanvoxel_sla_targets';

/* 저장된 SLA 목록 관리 */
interface SavedSlaEntry {
  id: string;
  customerId: string;
  customerName: string;
  name: string;
  deliveryOnTimeTarget: number;
  misshipmentRateLimit: number;
  pickingAccuracyTarget: number;
  avgProcessingTimeLimit: number;
  escalationEnabled: boolean;
  escalationThreshold: number;
  escalationEmails: string;
  savedAt: string;
}

function loadSavedTargets(): SavedSlaEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSlaToStorage(entry: SavedSlaEntry): SavedSlaEntry[] {
  const existing = loadSavedTargets();
  // 같은 고객사 + SLA 이름이면 업데이트
  const idx = existing.findIndex((e) => e.customerId === entry.customerId && e.name === entry.name);
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.push(entry);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return existing;
}

function deleteSlaFromStorage(id: string): SavedSlaEntry[] {
  const existing = loadSavedTargets().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return existing;
}

/* 목 고객사 데이터 (API 실패 시 폴백) */
const MOCK_CUSTOMERS: Array<{ id: string; name: string; code: string }> = [
  { id: 'cus-1', name: 'CJ물류센터', code: 'CUS-001' },
  { id: 'cus-2', name: '삼성전자 부품창고', code: 'CUS-002' },
  { id: 'cus-3', name: '현대모비스 물류', code: 'CUS-003' },
  { id: 'cus-4', name: 'LG화학 원자재센터', code: 'CUS-004' },
  { id: 'cus-5', name: '쿠팡 풀필먼트', code: 'CUS-005' },
];

interface SlaSettingsProps {
  target: SlaTargetData;
  onSaved: () => void;
}

export default function SlaSettings({ target, onSaved }: SlaSettingsProps) {
  /* 고객사 목록 */
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; code: string }>>(MOCK_CUSTOMERS);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(MOCK_CUSTOMERS[0].id);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  /* 폼 상태 */
  const [form, setForm] = useState({
    name: target.name,
    deliveryOnTimeTarget: target.deliveryOnTimeTarget,
    misshipmentRateLimit: target.misshipmentRateLimit,
    pickingAccuracyTarget: target.pickingAccuracyTarget,
    avgProcessingTimeLimit: target.avgProcessingTimeLimit,
    escalationEnabled: target.escalationEnabled,
    escalationThreshold: target.escalationThreshold,
    escalationEmails: (target.escalationEmails ?? []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* 저장된 목록 */
  const [savedTargets, setSavedTargets] = useState<SavedSlaEntry[]>(loadSavedTargets());

  /* 고객사 API 로딩 */
  useEffect(() => {
    (async () => {
      try {
        const partners = await getPartners(target.companyId, { type: 'CUSTOMER' });
        if (partners.length > 0) {
          const list = partners.map((p: PartnerData) => ({ id: p.id, name: p.name, code: p.code }));
          setCustomers(list);
          setSelectedCustomerId(list[0].id);
        }
      } catch {
        // 오프라인 → 목 데이터 유지
      }
    })();
  }, [target.companyId]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? customers[0],
    [customers, selectedCustomerId],
  );

  /* 선택된 고객사의 저장된 설정 */
  const customerSavedTargets = useMemo(
    () => savedTargets.filter((s) => s.customerId === selectedCustomerId),
    [savedTargets, selectedCustomerId],
  );

  /* 고객사 변경 시 저장된 설정 불러오기 */
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    setShowCustomerDropdown(false);
    const existing = savedTargets.find((s) => s.customerId === custId);
    if (existing) {
      setForm({
        name: existing.name,
        deliveryOnTimeTarget: existing.deliveryOnTimeTarget,
        misshipmentRateLimit: existing.misshipmentRateLimit,
        pickingAccuracyTarget: existing.pickingAccuracyTarget,
        avgProcessingTimeLimit: existing.avgProcessingTimeLimit,
        escalationEnabled: existing.escalationEnabled,
        escalationThreshold: existing.escalationThreshold,
        escalationEmails: existing.escalationEmails,
      });
    } else {
      // 기본값으로 초기화
      setForm({
        name: `${customers.find((c) => c.id === custId)?.name ?? ''} SLA`,
        deliveryOnTimeTarget: 98,
        misshipmentRateLimit: 0.5,
        pickingAccuracyTarget: 99.5,
        avgProcessingTimeLimit: 120,
        escalationEnabled: false,
        escalationThreshold: 3,
        escalationEmails: '',
      });
    }
  };

  /* 저장 */
  const handleSave = async () => {
    setSaving(true);
    const emails = form.escalationEmails.split(',').map((e) => e.trim()).filter(Boolean);

    // API 호출
    await upsertSlaTarget({
      companyId: target.companyId,
      siteId: target.siteId,
      name: form.name,
      deliveryOnTimeTarget: form.deliveryOnTimeTarget,
      misshipmentRateLimit: form.misshipmentRateLimit,
      pickingAccuracyTarget: form.pickingAccuracyTarget,
      avgProcessingTimeLimit: form.avgProcessingTimeLimit,
      escalationEnabled: form.escalationEnabled,
      escalationEmails: emails,
      escalationThreshold: form.escalationThreshold,
    });

    // localStorage에도 저장
    const entry: SavedSlaEntry = {
      id: `sla-${selectedCustomerId}-${Date.now()}`,
      customerId: selectedCustomerId,
      customerName: selectedCustomer.name,
      name: form.name,
      deliveryOnTimeTarget: form.deliveryOnTimeTarget,
      misshipmentRateLimit: form.misshipmentRateLimit,
      pickingAccuracyTarget: form.pickingAccuracyTarget,
      avgProcessingTimeLimit: form.avgProcessingTimeLimit,
      escalationEnabled: form.escalationEnabled,
      escalationThreshold: form.escalationThreshold,
      escalationEmails: form.escalationEmails,
      savedAt: new Date().toISOString(),
    };
    const updated = saveSlaToStorage(entry);
    setSavedTargets(updated);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved();
  };

  /* 저장 삭제 */
  const handleDeleteSaved = (id: string) => {
    const updated = deleteSlaFromStorage(id);
    setSavedTargets(updated);
  };

  /* 저장된 설정 불러오기 */
  const handleLoadSaved = (entry: SavedSlaEntry) => {
    setForm({
      name: entry.name,
      deliveryOnTimeTarget: entry.deliveryOnTimeTarget,
      misshipmentRateLimit: entry.misshipmentRateLimit,
      pickingAccuracyTarget: entry.pickingAccuracyTarget,
      avgProcessingTimeLimit: entry.avgProcessingTimeLimit,
      escalationEnabled: entry.escalationEnabled,
      escalationThreshold: entry.escalationThreshold,
      escalationEmails: entry.escalationEmails,
    });
    setSelectedCustomerId(entry.customerId);
  };

  /* 목표 지표 카드 정의 */
  const metrics: Array<{
    key: 'deliveryOnTimeTarget' | 'misshipmentRateLimit' | 'pickingAccuracyTarget' | 'avgProcessingTimeLimit';
    label: string;
    suffix: string;
    icon: React.ReactNode;
    color: string;
    comparator: string;
  }> = [
    { key: 'deliveryOnTimeTarget', label: '납기 준수율 목표', suffix: '%', icon: <Truck size={14} color={C.blue} />, color: C.blue, comparator: '>=' },
    { key: 'misshipmentRateLimit', label: '오배송률 한도', suffix: '%', icon: <AlertTriangle size={14} color={C.red} />, color: C.red, comparator: '<=' },
    { key: 'pickingAccuracyTarget', label: '피킹 정확도 목표', suffix: '%', icon: <Target size={14} color={C.green} />, color: C.green, comparator: '>=' },
    { key: 'avgProcessingTimeLimit', label: '평균 처리 시간 한도', suffix: '분', icon: <Clock size={14} color={C.yellow} />, color: C.yellow, comparator: '<=' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.input, color: C.text,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${C.blue}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Settings size={18} color={C.blue} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>SLA 기준 설정</h2>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>고객사별 SLA 목표와 에스컬레이션 규칙을 설정합니다.</p>
        </div>
      </div>

      {/* ── 고객사 선택 ── */}
      <div style={{
        background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Building2 size={14} color={C.textMuted} />
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>고객사 선택</label>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${showCustomerDropdown ? C.borderFocus : C.border}`,
              background: C.input, color: C.text, fontSize: 14,
              textAlign: 'left', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              transition: 'border-color 0.15s',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6,
                background: `${C.blue}15`, fontSize: 12, fontWeight: 600, color: C.blue,
              }}>
                {selectedCustomer.name.charAt(0)}
              </span>
              <span>
                <span style={{ fontWeight: 500 }}>{selectedCustomer.name}</span>
                <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{selectedCustomer.code}</span>
              </span>
            </span>
            <ChevronDown size={16} color={C.textMuted} style={{
              transform: showCustomerDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }} />
          </button>

          {showCustomerDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50,
              maxHeight: 240, overflowY: 'auto',
            }}>
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleCustomerChange(c.id)}
                  style={{
                    width: '100%', padding: '10px 14px', border: 'none',
                    background: c.id === selectedCustomerId ? `${C.blue}15` : 'transparent',
                    color: C.text, fontSize: 13, textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: `1px solid ${C.border}`,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (c.id !== selectedCustomerId) e.currentTarget.style.background = `${C.border}50`; }}
                  onMouseLeave={(e) => { if (c.id !== selectedCustomerId) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: 5, fontSize: 11, fontWeight: 600,
                    background: c.id === selectedCustomerId ? `${C.blue}25` : `${C.textDim}30`,
                    color: c.id === selectedCustomerId ? C.blue : C.textMuted,
                  }}>
                    {c.name.charAt(0)}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: c.id === selectedCustomerId ? 600 : 400 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>{c.code}</span>
                  </span>
                  {savedTargets.some((s) => s.customerId === c.id) && (
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: C.greenBg, color: C.green, fontWeight: 600,
                    }}>설정됨</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SLA 이름 ── */}
      <div style={{
        background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        padding: 20, marginBottom: 16,
      }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>
          SLA 이름
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={inputStyle}
          onFocus={(e) => e.currentTarget.style.borderColor = C.borderFocus}
          onBlur={(e) => e.currentTarget.style.borderColor = C.border}
        />
      </div>

      {/* ── 목표 지표 그리드 ── */}
      <div style={{
        background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Target size={14} color={C.textMuted} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>목표 지표</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {metrics.map((m) => (
            <div key={m.key} style={{
              background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, height: 20 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {m.icon}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, lineHeight: '20px' }}>{m.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  step="0.1"
                  value={form[m.key]}
                  onChange={(e) => setForm({ ...form, [m.key]: parseFloat(e.target.value) || 0 })}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${C.border}`, background: C.card, color: C.text,
                    fontSize: 22, fontWeight: 700, outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s', minWidth: 0,
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = m.color}
                  onBlur={(e) => e.currentTarget.style.borderColor = C.border}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.textMuted, width: 24, textAlign: 'center', flexShrink: 0 }}>
                  {m.suffix}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>
                {m.comparator} {form[m.key]}{m.suffix}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 에스컬레이션 설정 ── */}
      <div style={{
        background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        padding: 20, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AlertTriangle size={14} color={C.yellow} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>에스컬레이션 설정</span>
        </div>

        {/* 토글 */}
        <div
          onClick={() => setForm({ ...form, escalationEnabled: !form.escalationEnabled })}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            padding: '12px 14px', borderRadius: 8, background: C.bg,
            border: `1px solid ${C.border}`, marginBottom: form.escalationEnabled ? 12 : 0,
          }}
        >
          <div style={{
            width: 40, height: 22, borderRadius: 11, position: 'relative', flexShrink: 0,
            background: form.escalationEnabled ? C.blue : C.textDim,
            transition: 'background 0.2s',
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: form.escalationEnabled ? 21 : 3,
              transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 13, color: C.text }}>SLA 위반 시 자동 에스컬레이션 알림</span>
        </div>

        {form.escalationEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              padding: '14px 16px', borderRadius: 8, background: C.bg,
              border: `1px solid ${C.border}`,
            }}>
              <label style={{ display: 'block', fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
                연속 위반 임계값 (이 횟수 이상 연속 위반 시 에스컬레이션)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.escalationThreshold}
                  onChange={(e) => setForm({ ...form, escalationThreshold: parseInt(e.target.value) || 3 })}
                  style={{
                    width: 80, padding: '8px 12px', borderRadius: 8,
                    border: `1px solid ${C.border}`, background: C.card, color: C.text,
                    fontSize: 16, fontWeight: 600, outline: 'none', textAlign: 'center',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = C.borderFocus}
                  onBlur={(e) => e.currentTarget.style.borderColor = C.border}
                />
                <span style={{ fontSize: 13, color: C.textMuted }}>일</span>
              </div>
            </div>

            <div style={{
              padding: '14px 16px', borderRadius: 8, background: C.bg,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Mail size={12} color={C.textMuted} />
                <label style={{ fontSize: 12, color: C.textMuted }}>알림 수신 이메일 (쉼표 구분)</label>
              </div>
              <input
                type="text"
                value={form.escalationEmails}
                onChange={(e) => setForm({ ...form, escalationEmails: e.target.value })}
                placeholder="ops@company.com, manager@company.com"
                style={{
                  ...inputStyle, fontSize: 13,
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = C.borderFocus}
                onBlur={(e) => e.currentTarget.style.borderColor = C.border}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 저장 버튼 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 28px', borderRadius: 10,
            background: saving ? C.textDim : C.blue,
            color: '#fff', fontSize: 14, fontWeight: 600,
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = C.blueHover; }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = C.blue; }}
        >
          <Save size={15} />
          {saving ? '저장 중...' : '저장'}
        </button>
        {saved && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: C.greenBg, color: C.green, fontSize: 13, fontWeight: 500,
          }}>
            <CheckCircle size={14} />
            저장 완료 — {selectedCustomer.name}
          </div>
        )}
      </div>

      {/* ── 저장된 SLA 목록 ── */}
      {savedTargets.length > 0 && (
        <div style={{
          background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
          padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <CheckCircle size={14} color={C.green} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>저장된 SLA 설정</span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 10,
              background: `${C.blue}20`, color: C.blue, fontWeight: 600,
            }}>
              {savedTargets.length}개
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedTargets.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: entry.customerId === selectedCustomerId ? `${C.blue}10` : C.bg,
                  borderRadius: 10, border: `1px solid ${entry.customerId === selectedCustomerId ? `${C.blue}40` : C.border}`,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all 0.15s',
                }}
              >
                {/* 고객사 아바타 */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${C.blue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: C.blue,
                }}>
                  {entry.customerName.charAt(0)}
                </div>

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{entry.customerName}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{entry.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: C.textMuted }}>
                      납기 ≥{entry.deliveryOnTimeTarget}%
                    </span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>
                      오배송 ≤{entry.misshipmentRateLimit}%
                    </span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>
                      피킹 ≥{entry.pickingAccuracyTarget}%
                    </span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>
                      처리 ≤{entry.avgProcessingTimeLimit}분
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                    {new Date(entry.savedAt).toLocaleString('ko-KR')}에 저장
                  </div>
                </div>

                {/* 액션 */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleLoadSaved(entry)}
                    style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${C.border}`, background: 'transparent',
                      color: C.blue, cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = `${C.blue}15`}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    불러오기
                  </button>
                  <button
                    onClick={() => handleDeleteSaved(entry.id)}
                    style={{
                      padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${C.border}`, background: 'transparent',
                      color: C.red, cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = `${C.red}15`}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
