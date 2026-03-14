import { useState, useEffect, useCallback } from 'react';
import SlaSettings from './SlaSettings';
import SlaReport from './SlaReport';
import type { SlaTargetData, SlaMetricData, SlaViolationData } from '../../api/sla-api';
import { getSlaTarget, getSlaMetrics, getSlaViolations } from '../../api/sla-api';

// ── 목 데이터 (오프라인 폴백) ─────────────────────────

function generateMockMetrics(): SlaMetricData[] {
  const metrics: SlaMetricData[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // 약간의 변동 + 가끔 위반
    const isViolationDay = i % 7 === 3 || i === 5;
    metrics.push({
      id: `mock-metric-${i}`,
      slaTargetId: 'mock-target',
      recordDate: dateStr,
      deliveryOnTimeRate: isViolationDay ? 94.2 + Math.random() * 2 : 97.5 + Math.random() * 2,
      misshipmentRate: isViolationDay ? 0.8 + Math.random() * 0.5 : 0.2 + Math.random() * 0.3,
      pickingAccuracy: isViolationDay ? 97.8 + Math.random() : 99.2 + Math.random() * 0.6,
      avgProcessingTime: isViolationDay ? 135 + Math.random() * 20 : 95 + Math.random() * 25,
      totalOrders: 150 + Math.floor(Math.random() * 50),
      onTimeOrders: 145 + Math.floor(Math.random() * 10),
      misshipmentCount: isViolationDay ? 2 : Math.random() < 0.3 ? 1 : 0,
      totalPicks: 800 + Math.floor(Math.random() * 200),
      accuratePicks: 790 + Math.floor(Math.random() * 100),
    });
  }
  return metrics;
}

const MOCK_TARGET: SlaTargetData = {
  id: 'mock-target',
  companyId: 'demo-company',
  siteId: 'demo-site',
  name: '2026 Q1 SLA',
  deliveryOnTimeTarget: 98.0,
  misshipmentRateLimit: 0.5,
  pickingAccuracyTarget: 99.5,
  avgProcessingTimeLimit: 120,
  escalationEnabled: true,
  escalationEmails: ['ops@example.com'],
  escalationThreshold: 3,
  isActive: true,
};

const MOCK_VIOLATIONS: SlaViolationData[] = [
  {
    id: 'mock-v1', slaTargetId: 'mock-target', metricName: 'delivery_on_time',
    targetValue: 98.0, actualValue: 94.8, violationDate: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    severity: 'critical', escalated: true, resolvedAt: null, note: null,
  },
  {
    id: 'mock-v2', slaTargetId: 'mock-target', metricName: 'misshipment_rate',
    targetValue: 0.5, actualValue: 1.2, violationDate: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    severity: 'warning', escalated: false, resolvedAt: null, note: null,
  },
  {
    id: 'mock-v3', slaTargetId: 'mock-target', metricName: 'avg_processing_time',
    targetValue: 120, actualValue: 142, violationDate: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
    severity: 'warning', escalated: false, resolvedAt: new Date(Date.now() - 86400000 * 8).toISOString(), note: '인력 충원 완료',
  },
];

const METRIC_LABELS: Record<string, string> = {
  delivery_on_time: '납기 준수율',
  misshipment_rate: '오배송률',
  picking_accuracy: '피킹 정확도',
  avg_processing_time: '평균 처리 시간',
};

// ── KPI 카드 ────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  target: string;
  met: boolean;
  unit: string;
  direction: 'higher' | 'lower';
}

function KpiCard({ label, value, target, met, unit, direction }: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${met ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${met ? 'text-green-700' : 'text-red-700'}`}>
        {value}<span className="text-sm font-normal ml-1">{unit}</span>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        목표: {direction === 'higher' ? '>=' : '<='} {target}{unit}
        <span className={`ml-2 font-medium ${met ? 'text-green-600' : 'text-red-600'}`}>
          {met ? '달성' : '미달'}
        </span>
      </div>
    </div>
  );
}

// ── 미니 차트 (CSS 바 차트) ─────────────────────────────

function MiniBarChart({ data, max, label, color }: { data: number[]; max: number; label: string; color: string }) {
  const last14 = data.slice(-14);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500 mb-2">{label} (최근 14일)</div>
      <div className="flex items-end gap-0.5 h-16">
        {last14.map((v, i) => {
          const height = Math.max(2, (v / max) * 100);
          return (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${height}%`, backgroundColor: color, opacity: 0.7 + (i / last14.length) * 0.3 }}
              title={`${v}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 대시보드 ───────────────────────────────────────

type TabType = 'dashboard' | 'settings' | 'report';

interface SlaDashboardProps {
  onBack: () => void;
}

export default function SlaDashboard({ onBack }: SlaDashboardProps) {
  const [tab, setTab] = useState<TabType>('dashboard');
  const [target, setTarget] = useState<SlaTargetData | null>(null);
  const [metrics, setMetrics] = useState<SlaMetricData[]>([]);
  const [violations, setViolations] = useState<SlaViolationData[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = 'demo-company';
  const siteId = 'demo-site';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const t = await getSlaTarget(companyId, siteId);
    const targetData = t ?? MOCK_TARGET;
    setTarget(targetData);

    const m = await getSlaMetrics(targetData.id, { limit: 30 });
    setMetrics(m.length > 0 ? m : generateMockMetrics());

    const v = await getSlaViolations(targetData.id);
    setViolations(v.length > 0 ? v : MOCK_VIOLATIONS);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 최신 KPI (가장 최근 날짜)
  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-400">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-700 text-sm">
              &larr; 돌아가기
            </button>
            <h1 className="text-xl font-bold text-gray-800">SLA 모니터링</h1>
            {target && <span className="text-sm text-gray-400">{target.name}</span>}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['dashboard', 'settings', 'report'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  tab === t ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'dashboard' ? '대시보드' : t === 'settings' ? 'SLA 설정' : '리포트'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {tab === 'settings' && target && (
        <SlaSettings target={target} onSaved={() => fetchData()} />
      )}

      {tab === 'report' && target && (
        <SlaReport target={target} metrics={metrics} violations={violations} />
      )}

      {tab === 'dashboard' && (
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* 실시간 KPI 카드 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">실시간 KPI</h2>
            {latest && target ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="납기 준수율"
                  value={latest.deliveryOnTimeRate.toFixed(1)}
                  target={target.deliveryOnTimeTarget.toString()}
                  met={latest.deliveryOnTimeRate >= target.deliveryOnTimeTarget}
                  unit="%"
                  direction="higher"
                />
                <KpiCard
                  label="오배송률"
                  value={latest.misshipmentRate.toFixed(2)}
                  target={target.misshipmentRateLimit.toString()}
                  met={latest.misshipmentRate <= target.misshipmentRateLimit}
                  unit="%"
                  direction="lower"
                />
                <KpiCard
                  label="피킹 정확도"
                  value={latest.pickingAccuracy.toFixed(1)}
                  target={target.pickingAccuracyTarget.toString()}
                  met={latest.pickingAccuracy >= target.pickingAccuracyTarget}
                  unit="%"
                  direction="higher"
                />
                <KpiCard
                  label="평균 처리 시간"
                  value={latest.avgProcessingTime.toFixed(0)}
                  target={target.avgProcessingTimeLimit.toString()}
                  met={latest.avgProcessingTime <= target.avgProcessingTimeLimit}
                  unit="분"
                  direction="lower"
                />
              </div>
            ) : (
              <div className="text-gray-400 text-sm">KPI 데이터가 없습니다</div>
            )}
          </section>

          {/* 추세 차트 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">추세</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MiniBarChart
                data={metrics.map((m) => m.deliveryOnTimeRate)}
                max={100}
                label="납기 준수율 (%)"
                color="#22c55e"
              />
              <MiniBarChart
                data={metrics.map((m) => m.misshipmentRate)}
                max={2}
                label="오배송률 (%)"
                color="#ef4444"
              />
              <MiniBarChart
                data={metrics.map((m) => m.pickingAccuracy)}
                max={100}
                label="피킹 정확도 (%)"
                color="#3b82f6"
              />
              <MiniBarChart
                data={metrics.map((m) => m.avgProcessingTime)}
                max={200}
                label="평균 처리 시간 (분)"
                color="#f59e0b"
              />
            </div>
          </section>

          {/* 최근 위반 내역 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">
              SLA 위반 내역
              {violations.filter((v) => !v.resolvedAt).length > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  미해결 {violations.filter((v) => !v.resolvedAt).length}건
                </span>
              )}
            </h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              {violations.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">위반 내역이 없습니다</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">날짜</th>
                      <th className="px-4 py-2 text-left">지표</th>
                      <th className="px-4 py-2 text-right">목표</th>
                      <th className="px-4 py-2 text-right">실측</th>
                      <th className="px-4 py-2 text-center">심각도</th>
                      <th className="px-4 py-2 text-center">에스컬레이션</th>
                      <th className="px-4 py-2 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {violations.map((v) => (
                      <tr key={v.id} className={v.resolvedAt ? 'opacity-60' : ''}>
                        <td className="px-4 py-2.5">{v.violationDate}</td>
                        <td className="px-4 py-2.5 font-medium">
                          {METRIC_LABELS[v.metricName] ?? v.metricName}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{v.targetValue}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-red-600">{v.actualValue}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            v.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {v.severity === 'critical' ? '긴급' : '경고'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {v.escalated ? (
                            <span className="text-xs text-red-600 font-medium">발송됨</span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {v.resolvedAt ? (
                            <span className="text-xs text-green-600">해결</span>
                          ) : (
                            <span className="text-xs text-red-600 font-medium">미해결</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* 운영 요약 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">운영 요약 (30일)</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="text-xs text-gray-500">총 주문</div>
                <div className="text-xl font-bold text-gray-800">
                  {metrics.reduce((s, m) => s + m.totalOrders, 0).toLocaleString()}
                  <span className="text-xs text-gray-400 ml-1">건</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="text-xs text-gray-500">총 피킹</div>
                <div className="text-xl font-bold text-gray-800">
                  {metrics.reduce((s, m) => s + m.totalPicks, 0).toLocaleString()}
                  <span className="text-xs text-gray-400 ml-1">건</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="text-xs text-gray-500">오배송 건수</div>
                <div className="text-xl font-bold text-red-600">
                  {metrics.reduce((s, m) => s + m.misshipmentCount, 0)}
                  <span className="text-xs text-gray-400 ml-1">건</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="text-xs text-gray-500">SLA 위반일</div>
                <div className="text-xl font-bold text-orange-600">
                  {new Set(violations.map((v) => v.violationDate)).size}
                  <span className="text-xs text-gray-400 ml-1">일</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
