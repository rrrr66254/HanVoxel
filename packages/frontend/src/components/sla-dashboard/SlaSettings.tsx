import { useState } from 'react';
import { Settings, Target, AlertTriangle, Mail, Save, CheckCircle } from 'lucide-react';
import type { SlaTargetData } from '../../api/sla-api';
import { upsertSlaTarget } from '../../api/sla-api';

/* 다크 테마 색상 (SlaDashboard와 동일) */
const C = {
  bg: '#0D1117',
  card: '#161B22',
  cardHover: '#1C2129',
  border: '#30363D',
  borderFocus: '#2D7DD2',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  textDim: '#484F58',
  blue: '#2D7DD2',
  blueHover: '#3D8DE2',
  green: '#3FB950',
  red: '#F85149',
  yellow: '#D29922',
  input: '#0D1117',
};

interface SlaSettingsProps {
  target: SlaTargetData;
  onSaved: () => void;
}

export default function SlaSettings({ target, onSaved }: SlaSettingsProps) {
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

  const handleSave = async () => {
    setSaving(true);
    const emails = form.escalationEmails.split(',').map((e) => e.trim()).filter(Boolean);
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
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  };

  /* 목표 지표 카드 */
  const metrics = [
    { key: 'deliveryOnTimeTarget' as const, label: '납기 준수율 목표', suffix: '%', icon: '📦', color: C.blue },
    { key: 'misshipmentRateLimit' as const, label: '오배송률 한도', suffix: '%', icon: '⚠️', color: C.red },
    { key: 'pickingAccuracyTarget' as const, label: '피킹 정확도 목표', suffix: '%', icon: '🎯', color: C.green },
    { key: 'avgProcessingTimeLimit' as const, label: '평균 처리 시간 한도', suffix: '분', icon: '⏱️', color: C.yellow },
  ];

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
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

      {/* SLA 이름 */}
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
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.input, color: C.text,
            fontSize: 14, outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = C.borderFocus}
          onBlur={(e) => e.currentTarget.style.borderColor = C.border}
        />
      </div>

      {/* 목표 지표 그리드 */}
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
              padding: 16, transition: 'border-color 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>{m.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>{m.label}</span>
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
                    fontSize: 20, fontWeight: 700, outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = m.color}
                  onBlur={(e) => e.currentTarget.style.borderColor = C.border}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.textMuted }}>{m.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 에스컬레이션 설정 */}
      <div style={{
        background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        padding: 20, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AlertTriangle size={14} color={C.yellow} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>에스컬레이션 설정</span>
        </div>

        {/* 토글 */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          padding: '10px 14px', borderRadius: 8, background: C.bg,
          border: `1px solid ${C.border}`, marginBottom: form.escalationEnabled ? 12 : 0,
        }}>
          <div
            onClick={() => setForm({ ...form, escalationEnabled: !form.escalationEnabled })}
            style={{
              width: 40, height: 22, borderRadius: 11, position: 'relative', cursor: 'pointer',
              background: form.escalationEnabled ? C.blue : C.textDim,
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: form.escalationEnabled ? 21 : 3,
              transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 13, color: C.text }}>SLA 위반 시 자동 에스컬레이션 알림</span>
        </label>

        {form.escalationEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 연속 위반 임계값 */}
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

            {/* 이메일 */}
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
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: `1px solid ${C.border}`, background: C.card, color: C.text,
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = C.borderFocus}
                onBlur={(e) => e.currentTarget.style.borderColor = C.border}
              />
            </div>
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            color: C.green, fontSize: 13, fontWeight: 500,
          }}>
            <CheckCircle size={14} />
            저장 완료
          </div>
        )}
      </div>
    </main>
  );
}
