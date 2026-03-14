import { useState } from 'react';
import type { SlaTargetData } from '../../api/sla-api';
import { upsertSlaTarget } from '../../api/sla-api';

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

  const Field = ({ label, suffix, value, onChange }: {
    label: string; suffix: string; value: number; onChange: (v: number) => void;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <span className="text-sm text-gray-400 whitespace-nowrap">{suffix}</span>
      </div>
    </div>
  );

  return (
    <main className="max-w-2xl mx-auto px-6 py-6">
      <div className="bg-white rounded-xl border p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">SLA 기준 설정</h2>
          <p className="text-sm text-gray-400">고객사별 SLA 목표와 에스컬레이션 규칙을 설정합니다.</p>
        </div>

        {/* SLA 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SLA 이름</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* 목표 지표 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">목표 지표</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="납기 준수율 목표"
              suffix="%"
              value={form.deliveryOnTimeTarget}
              onChange={(v) => setForm({ ...form, deliveryOnTimeTarget: v })}
            />
            <Field
              label="오배송률 한도"
              suffix="%"
              value={form.misshipmentRateLimit}
              onChange={(v) => setForm({ ...form, misshipmentRateLimit: v })}
            />
            <Field
              label="피킹 정확도 목표"
              suffix="%"
              value={form.pickingAccuracyTarget}
              onChange={(v) => setForm({ ...form, pickingAccuracyTarget: v })}
            />
            <Field
              label="평균 처리 시간 한도"
              suffix="분"
              value={form.avgProcessingTimeLimit}
              onChange={(v) => setForm({ ...form, avgProcessingTimeLimit: v })}
            />
          </div>
        </div>

        {/* 에스컬레이션 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">에스컬레이션 설정</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.escalationEnabled}
                onChange={(e) => setForm({ ...form, escalationEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">SLA 위반 시 자동 에스컬레이션 알림</span>
            </label>
            {form.escalationEnabled && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    연속 위반 임계값 (이 횟수 이상 연속 위반 시 에스컬레이션)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={form.escalationThreshold}
                    onChange={(e) => setForm({ ...form, escalationThreshold: parseInt(e.target.value) || 3 })}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-sm text-gray-400 ml-2">일</span>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">알림 수신 이메일 (쉼표 구분)</label>
                  <input
                    type="text"
                    value={form.escalationEmails}
                    onChange={(e) => setForm({ ...form, escalationEmails: e.target.value })}
                    placeholder="ops@company.com, manager@company.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          {saved && <span className="text-sm text-green-600">저장 완료</span>}
        </div>
      </div>
    </main>
  );
}
