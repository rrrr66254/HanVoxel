import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Truck, AlertTriangle, Target, Clock, TrendingUp, TrendingDown,
  ArrowLeft, ShieldCheck, X, FileText, CheckCircle, XCircle,
  ChevronRight, Calendar, BarChart3,
} from 'lucide-react';
import SlaSettings from './SlaSettings';
import SlaReport from './SlaReport';
import type { SlaTargetData, SlaMetricData, SlaViolationData } from '../../api/sla-api';
import { getSlaTarget, getSlaMetrics, getSlaViolations } from '../../api/sla-api';

// ── 다크 테마 색상 상수 ─────────────────────────────────
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  hoverRow: '#1C2128',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  textDim: '#484F58',
  gridLine: '#21262D',
  blue: '#2D7DD2',
  red: '#F85149',
  green: '#3FB950',
  yellow: '#D29922',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

// ── localStorage에서 SLA 설정 불러오기 ─────────────────
const STORAGE_KEY = 'hanvoxel_sla_targets';

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

// ── 목 데이터 (오프라인 폴백) ─────────────────────────────

function generateMockMetrics(): SlaMetricData[] {
  const metrics: SlaMetricData[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
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

const METRIC_UNITS: Record<string, string> = {
  delivery_on_time: '%',
  misshipment_rate: '%',
  picking_accuracy: '%',
  avg_processing_time: '분',
};

const METRIC_DIRECTIONS: Record<string, string> = {
  delivery_on_time: '이상',
  misshipment_rate: '이하',
  picking_accuracy: '이상',
  avg_processing_time: '이하',
};

const METRIC_COLORS: Record<string, string> = {
  delivery_on_time: COLORS.blue,
  misshipment_rate: COLORS.red,
  picking_accuracy: COLORS.green,
  avg_processing_time: COLORS.yellow,
};

const METRIC_ICONS: Record<string, React.ReactNode> = {
  delivery_on_time: <Truck size={16} style={{ color: COLORS.blue }} />,
  misshipment_rate: <AlertTriangle size={16} style={{ color: COLORS.red }} />,
  picking_accuracy: <Target size={16} style={{ color: COLORS.green }} />,
  avg_processing_time: <Clock size={16} style={{ color: COLORS.yellow }} />,
};

// ── 애니메이션 카운터 훅 ─────────────────────────────────

function useAnimatedCounter(end: number, duration: number = 800, decimals: number = 1): string {
  const [display, setDisplay] = useState('0');
  const frameRef = useRef<number>(0);
  const prevEndRef = useRef<number>(0);

  useEffect(() => {
    const startVal = prevEndRef.current;
    prevEndRef.current = end;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (end - startVal) * eased;
      setDisplay(current.toFixed(decimals));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration, decimals]);

  return display;
}

// ── KPI 카드 (다크 테마) ────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  target: number;
  met: boolean;
  unit: string;
  direction: 'higher' | 'lower';
  accentColor: string;
  icon: React.ReactNode;
  change: number;
  decimals?: number;
}

function KpiCard({ label, value, target, met, unit, direction, accentColor, icon, change, decimals = 1 }: KpiCardProps) {
  const animatedValue = useAnimatedCounter(value, 800, decimals);
  const isPositiveChange = change >= 0;
  const isGoodChange = direction === 'higher' ? isPositiveChange : !isPositiveChange;

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div style={{ height: '3px', backgroundColor: accentColor }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            {icon}
          </div>
          <span className="text-sm font-medium" style={{ color: COLORS.textMuted }}>
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-3xl font-bold" style={{ color: COLORS.text }}>
            {animatedValue}
          </span>
          <span className="text-sm font-normal" style={{ color: COLORS.textMuted }}>
            {unit}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: COLORS.textMuted }}>
            목표: {direction === 'higher' ? '>=' : '<='} {target}{unit}
            <span
              className="ml-2 font-semibold"
              style={{ color: met ? COLORS.green : COLORS.red }}
            >
              {met ? '달성' : '미달'}
            </span>
          </span>
          <span
            className="flex items-center gap-0.5 text-xs font-medium"
            style={{ color: isGoodChange ? COLORS.green : COLORS.red }}
          >
            {isPositiveChange ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositiveChange ? '+' : ''}{change.toFixed(decimals)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 14일 추세 라인 차트 ────────────────────────────────

interface TrendChartProps {
  data: Array<{ date: string; value: number }>;
  label: string;
  color: string;
  unit: string;
}

function TrendChart({ data, label, color, unit }: TrendChartProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="text-sm font-medium mb-3" style={{ color: COLORS.textMuted }}>
        {label} (최근 14일)
      </div>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
            <XAxis
              dataKey="date"
              tick={{ fill: COLORS.textMuted, fontSize: 10 }}
              axisLine={{ stroke: COLORS.gridLine }}
              tickLine={{ stroke: COLORS.gridLine }}
              tickFormatter={(val: string) => val.slice(5)}
            />
            <YAxis
              tick={{ fill: COLORS.textMuted, fontSize: 10 }}
              axisLine={{ stroke: COLORS.gridLine }}
              tickLine={{ stroke: COLORS.gridLine }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                color: COLORS.text,
                fontSize: '12px',
              }}
              labelStyle={{ color: COLORS.textMuted }}
              formatter={(val: number) => [`${val.toFixed(2)}${unit}`, label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 3, strokeWidth: 0 }}
              activeDot={{ fill: color, r: 5, strokeWidth: 2, stroke: COLORS.card }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 운영 요약 카운터 카드 ────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number;
  unit: string;
  color?: string;
}

function SummaryCard({ label, value, unit, color }: SummaryCardProps) {
  const animatedValue = useAnimatedCounter(value, 1000, 0);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="text-xs mb-1" style={{ color: COLORS.textMuted }}>{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold" style={{ color: color ?? COLORS.text }}>
          {Number(animatedValue).toLocaleString()}
        </span>
        <span className="text-xs" style={{ color: COLORS.textMuted }}>{unit}</span>
      </div>
    </div>
  );
}

// ── 위반 상세 모달 ───────────────────────────────────────

interface ViolationDetailModalProps {
  violation: SlaViolationData;
  metrics: SlaMetricData[];
  target: SlaTargetData;
  onClose: () => void;
}

function ViolationDetailModal({ violation, metrics, target, onClose }: ViolationDetailModalProps) {
  const metricLabel = METRIC_LABELS[violation.metricName] ?? violation.metricName;
  const metricUnit = METRIC_UNITS[violation.metricName] ?? '';
  const metricDirection = METRIC_DIRECTIONS[violation.metricName] ?? '';
  const metricColor = METRIC_COLORS[violation.metricName] ?? COLORS.red;
  const metricIcon = METRIC_ICONS[violation.metricName] ?? <AlertTriangle size={16} />;

  // 해당 날짜 전후 7일 메트릭
  const vDate = new Date(violation.violationDate);
  const contextMetrics = useMemo(() => {
    const from = new Date(vDate);
    from.setDate(from.getDate() - 3);
    const to = new Date(vDate);
    to.setDate(to.getDate() + 3);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    return metrics.filter((m) => m.recordDate >= fromStr && m.recordDate <= toStr);
  }, [metrics, vDate]);

  // 해당 지표의 값 추출
  const getMetricValue = (m: SlaMetricData): number => {
    switch (violation.metricName) {
      case 'delivery_on_time': return m.deliveryOnTimeRate;
      case 'misshipment_rate': return m.misshipmentRate;
      case 'picking_accuracy': return m.pickingAccuracy;
      case 'avg_processing_time': return m.avgProcessingTime;
      default: return 0;
    }
  };

  // 목표값
  const getTargetValue = (): number => {
    switch (violation.metricName) {
      case 'delivery_on_time': return target.deliveryOnTimeTarget;
      case 'misshipment_rate': return target.misshipmentRateLimit;
      case 'picking_accuracy': return target.pickingAccuracyTarget;
      case 'avg_processing_time': return target.avgProcessingTimeLimit;
      default: return 0;
    }
  };

  const targetVal = getTargetValue();
  const deviation = Math.abs(violation.actualValue - violation.targetValue);
  const deviationPct = violation.targetValue !== 0 ? (deviation / violation.targetValue * 100).toFixed(1) : '0';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: COLORS.overlay, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}`,
          width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${metricColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {metricIcon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>SLA 위반 상세</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{metricLabel}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: `1px solid ${COLORS.border}`,
              background: 'transparent', color: COLORS.textMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 위반 요약 카드 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
          }}>
            <div style={{
              background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`,
              padding: 14, textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>목표</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>
                {violation.targetValue}
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{metricUnit}</span>
              </div>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>{metricDirection}</div>
            </div>
            <div style={{
              background: `${COLORS.red}08`, borderRadius: 10, border: `1px solid ${COLORS.red}30`,
              padding: 14, textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>실측</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.red }}>
                {violation.actualValue}
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{metricUnit}</span>
              </div>
              <div style={{ fontSize: 10, color: COLORS.red, marginTop: 2 }}>위반</div>
            </div>
            <div style={{
              background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`,
              padding: 14, textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>편차</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.yellow }}>
                {deviation.toFixed(1)}
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{metricUnit}</span>
              </div>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>{deviationPct}% 차이</div>
            </div>
          </div>

          {/* 상세 정보 */}
          <div style={{
            background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`,
            padding: 16,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>상세 정보</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: '위반 날짜', value: violation.violationDate, icon: <Calendar size={12} color={COLORS.textMuted} /> },
                { label: '심각도', value: violation.severity === 'critical' ? '긴급' : '경고',
                  icon: <AlertTriangle size={12} color={violation.severity === 'critical' ? COLORS.red : COLORS.yellow} />,
                  color: violation.severity === 'critical' ? COLORS.red : COLORS.yellow,
                },
                { label: '에스컬레이션', value: violation.escalated ? '발송됨' : '미발송',
                  icon: <FileText size={12} color={COLORS.textMuted} />,
                  color: violation.escalated ? COLORS.red : COLORS.textMuted,
                },
                { label: '상태', value: violation.resolvedAt ? `해결 (${violation.resolvedAt.slice(0, 10)})` : '미해결',
                  icon: violation.resolvedAt ? <CheckCircle size={12} color={COLORS.green} /> : <XCircle size={12} color={COLORS.red} />,
                  color: violation.resolvedAt ? COLORS.green : COLORS.red,
                },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.icon}
                  <div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: item.color ?? COLORS.text }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            {violation.note && (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 8,
                background: COLORS.card, border: `1px solid ${COLORS.border}`,
              }}>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>메모</div>
                <div style={{ fontSize: 13, color: COLORS.text }}>{violation.note}</div>
              </div>
            )}
          </div>

          {/* 전후 데이터 추이 */}
          {contextMetrics.length > 0 && (
            <div style={{
              background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <BarChart3 size={13} color={COLORS.textMuted} />
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>전후 추이 (±3일)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {contextMetrics.map((m) => {
                  const val = getMetricValue(m);
                  const isViolationDay = m.recordDate === violation.violationDate;
                  const isViolated = violation.metricName === 'misshipment_rate' || violation.metricName === 'avg_processing_time'
                    ? val > targetVal
                    : val < targetVal;
                  // 바 너비 계산
                  const maxVal = Math.max(...contextMetrics.map(getMetricValue), targetVal) * 1.1;
                  const barWidth = maxVal > 0 ? Math.min((val / maxVal) * 100, 100) : 0;

                  return (
                    <div key={m.recordDate} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 10px', borderRadius: 6,
                      background: isViolationDay ? `${COLORS.red}10` : 'transparent',
                      border: isViolationDay ? `1px solid ${COLORS.red}30` : '1px solid transparent',
                    }}>
                      <span style={{
                        fontSize: 11, color: isViolationDay ? COLORS.text : COLORS.textMuted,
                        fontWeight: isViolationDay ? 600 : 400, width: 80, flexShrink: 0,
                      }}>
                        {m.recordDate.slice(5)}
                      </span>
                      <div style={{ flex: 1, height: 14, background: COLORS.card, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          width: `${barWidth}%`, height: '100%', borderRadius: 4,
                          background: isViolated ? COLORS.red : metricColor,
                          opacity: isViolationDay ? 1 : 0.6,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: isViolationDay ? 700 : 400,
                        color: isViolated ? COLORS.red : COLORS.text,
                        width: 60, textAlign: 'right', flexShrink: 0,
                      }}>
                        {val.toFixed(violation.metricName === 'misshipment_rate' ? 2 : 1)}{metricUnit}
                      </span>
                      {isViolationDay && (
                        <ChevronRight size={12} color={COLORS.red} style={{ flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* 목표 라인 표시 */}
              <div style={{
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: COLORS.textMuted,
              }}>
                <div style={{ width: 12, height: 2, background: COLORS.green, borderRadius: 1 }} />
                목표: {targetVal}{metricUnit} {metricDirection}
              </div>
            </div>
          )}
        </div>
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
  const [selectedViolation, setSelectedViolation] = useState<SlaViolationData | null>(null);

  const companyId = 'demo-company';
  const siteId = 'demo-site';

  // localStorage에서 저장된 설정 반영
  const applyLocalSettings = useCallback((targetData: SlaTargetData): SlaTargetData => {
    const saved = loadSavedTargets();
    if (saved.length > 0) {
      // 가장 최근 저장된 설정 사용
      const latest = saved.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0];
      return {
        ...targetData,
        name: latest.name,
        deliveryOnTimeTarget: latest.deliveryOnTimeTarget,
        misshipmentRateLimit: latest.misshipmentRateLimit,
        pickingAccuracyTarget: latest.pickingAccuracyTarget,
        avgProcessingTimeLimit: latest.avgProcessingTimeLimit,
        escalationEnabled: latest.escalationEnabled,
        escalationThreshold: latest.escalationThreshold,
        escalationEmails: latest.escalationEmails.split(',').map((e) => e.trim()).filter(Boolean),
      };
    }
    return targetData;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const t = await getSlaTarget(companyId, siteId);
    let targetData = t ?? MOCK_TARGET;
    // localStorage 설정 반영
    targetData = applyLocalSettings(targetData);
    setTarget(targetData);

    const m = await getSlaMetrics(targetData.id, { limit: 30 });
    setMetrics(m.length > 0 ? m : generateMockMetrics());

    const v = await getSlaViolations(targetData.id);
    setViolations(v.length > 0 ? v : MOCK_VIOLATIONS);

    setLoading(false);
  }, [applyLocalSettings]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 최신 KPI
  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const previous = metrics.length > 1 ? metrics[metrics.length - 2] : null;
  const getChange = (current: number, prev: number | undefined): number => {
    if (prev === undefined) return 0;
    return current - prev;
  };

  // 14일 추세
  const last14Metrics = metrics.slice(-14);
  const trendDelivery = last14Metrics.map((m) => ({ date: m.recordDate, value: m.deliveryOnTimeRate }));
  const trendMisshipment = last14Metrics.map((m) => ({ date: m.recordDate, value: m.misshipmentRate }));
  const trendPicking = last14Metrics.map((m) => ({ date: m.recordDate, value: m.pickingAccuracy }));
  const trendProcessing = last14Metrics.map((m) => ({ date: m.recordDate, value: m.avgProcessingTime }));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: COLORS.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: COLORS.border, borderTopColor: COLORS.blue }}
          />
          <span style={{ color: COLORS.textMuted }}>로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      {/* ── 고정 헤더 (sticky) ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: COLORS.card,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '0 24px',
        }}
      >
        <div className="flex items-center justify-between" style={{ height: 56 }}>
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
              style={{ color: COLORS.textMuted }}
            >
              <ArrowLeft size={16} />
              돌아가기
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} style={{ color: COLORS.blue }} />
              <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>
                SLA 모니터링
              </h1>
            </div>
            {target && (
              <span
                className="text-sm px-2 py-0.5 rounded"
                style={{ color: COLORS.textMuted, backgroundColor: `${COLORS.border}80` }}
              >
                {target.name}
              </span>
            )}
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: COLORS.bg }}>
            {(['dashboard', 'settings', 'report'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 text-sm rounded-md transition-colors"
                style={{
                  backgroundColor: tab === t ? COLORS.card : 'transparent',
                  color: tab === t ? COLORS.text : COLORS.textMuted,
                  fontWeight: tab === t ? 600 : 400,
                  border: tab === t ? `1px solid ${COLORS.border}` : '1px solid transparent',
                }}
              >
                {t === 'dashboard' ? '대시보드' : t === 'settings' ? 'SLA 설정' : '리포트'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── SLA 설정 탭 ── */}
      {tab === 'settings' && target && (
        <SlaSettings target={target} onSaved={() => fetchData()} />
      )}

      {/* ── 리포트 탭 ── */}
      {tab === 'report' && target && (
        <SlaReport target={target} metrics={metrics} violations={violations} />
      )}

      {/* ── 대시보드 탭 ── */}
      {tab === 'dashboard' && (
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

          {/* 실시간 KPI 카드 4개 */}
          <section>
            <h2 className="text-sm font-semibold mb-3" style={{ color: COLORS.textMuted }}>
              실시간 KPI
            </h2>
            {latest && target ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="납기 준수율"
                  value={latest.deliveryOnTimeRate}
                  target={target.deliveryOnTimeTarget}
                  met={latest.deliveryOnTimeRate >= target.deliveryOnTimeTarget}
                  unit="%"
                  direction="higher"
                  accentColor={COLORS.blue}
                  icon={<Truck size={16} style={{ color: COLORS.blue }} />}
                  change={getChange(latest.deliveryOnTimeRate, previous?.deliveryOnTimeRate)}
                />
                <KpiCard
                  label="오배송률"
                  value={latest.misshipmentRate}
                  target={target.misshipmentRateLimit}
                  met={latest.misshipmentRate <= target.misshipmentRateLimit}
                  unit="%"
                  direction="lower"
                  accentColor={COLORS.red}
                  icon={<AlertTriangle size={16} style={{ color: COLORS.red }} />}
                  change={getChange(latest.misshipmentRate, previous?.misshipmentRate)}
                  decimals={2}
                />
                <KpiCard
                  label="피킹 정확도"
                  value={latest.pickingAccuracy}
                  target={target.pickingAccuracyTarget}
                  met={latest.pickingAccuracy >= target.pickingAccuracyTarget}
                  unit="%"
                  direction="higher"
                  accentColor={COLORS.green}
                  icon={<Target size={16} style={{ color: COLORS.green }} />}
                  change={getChange(latest.pickingAccuracy, previous?.pickingAccuracy)}
                />
                <KpiCard
                  label="평균 처리 시간"
                  value={latest.avgProcessingTime}
                  target={target.avgProcessingTimeLimit}
                  met={latest.avgProcessingTime <= target.avgProcessingTimeLimit}
                  unit="분"
                  direction="lower"
                  accentColor={COLORS.yellow}
                  icon={<Clock size={16} style={{ color: COLORS.yellow }} />}
                  change={getChange(latest.avgProcessingTime, previous?.avgProcessingTime)}
                  decimals={0}
                />
              </div>
            ) : (
              <div
                className="rounded-xl p-8 text-center flex flex-col items-center gap-3"
                style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <ShieldCheck size={32} style={{ color: COLORS.textMuted }} />
                <span className="text-sm" style={{ color: COLORS.textMuted }}>KPI 데이터가 없습니다</span>
              </div>
            )}
          </section>

          {/* 14일 추세 라인 차트 */}
          <section>
            <h2 className="text-sm font-semibold mb-3" style={{ color: COLORS.textMuted }}>
              추세 (최근 14일)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TrendChart data={trendDelivery} label="납기 준수율" color={COLORS.blue} unit="%" />
              <TrendChart data={trendMisshipment} label="오배송률" color={COLORS.red} unit="%" />
              <TrendChart data={trendPicking} label="피킹 정확도" color={COLORS.green} unit="%" />
              <TrendChart data={trendProcessing} label="평균 처리 시간" color={COLORS.yellow} unit="분" />
            </div>
          </section>

          {/* SLA 위반 내역 테이블 (클릭 가능) */}
          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center" style={{ color: COLORS.textMuted }}>
              SLA 위반 내역
              {violations.filter((v) => !v.resolvedAt).length > 0 && (
                <span
                  className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${COLORS.red}20`, color: COLORS.red }}
                >
                  미해결 {violations.filter((v) => !v.resolvedAt).length}건
                </span>
              )}
            </h2>
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              {violations.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-3">
                  <ShieldCheck size={40} style={{ color: COLORS.green }} />
                  <span className="text-sm font-medium" style={{ color: COLORS.textMuted }}>
                    위반 내역이 없습니다
                  </span>
                  <span className="text-xs" style={{ color: COLORS.textMuted }}>
                    모든 SLA 지표가 목표를 달성하고 있습니다
                  </span>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: COLORS.card }}>
                      {['날짜', '지표'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}
                        >
                          {h}
                        </th>
                      ))}
                      {['목표', '실측'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                          style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}
                        >
                          {h}
                        </th>
                      ))}
                      {['심각도', '에스컬레이션', '상태'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                          style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}
                        >
                          {h}
                        </th>
                      ))}
                      <th
                        className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                        style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}`, width: 40 }}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {violations.map((v, idx) => (
                      <tr
                        key={v.id}
                        className="transition-colors"
                        style={{
                          backgroundColor: idx % 2 === 0 ? COLORS.card : COLORS.bg,
                          opacity: v.resolvedAt ? 0.5 : 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedViolation(v)}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor = COLORS.hoverRow;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                            idx % 2 === 0 ? COLORS.card : COLORS.bg;
                        }}
                      >
                        <td className="px-4 py-3" style={{ color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}>
                          {v.violationDate}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}>
                          {METRIC_LABELS[v.metricName] ?? v.metricName}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}>
                          {v.targetValue}
                        </td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: COLORS.red, borderBottom: `1px solid ${COLORS.border}` }}>
                          {v.actualValue}
                        </td>
                        <td className="px-4 py-3 text-center" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-medium inline-block"
                            style={{
                              backgroundColor: v.severity === 'critical' ? `${COLORS.red}20` : `${COLORS.yellow}20`,
                              color: v.severity === 'critical' ? COLORS.red : COLORS.yellow,
                            }}
                          >
                            {v.severity === 'critical' ? '긴급' : '경고'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          {v.escalated ? (
                            <span className="text-xs font-medium" style={{ color: COLORS.red }}>발송됨</span>
                          ) : (
                            <span className="text-xs" style={{ color: COLORS.textMuted }}>-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          {v.resolvedAt ? (
                            <span
                              className="text-xs px-2.5 py-1 rounded-full font-medium inline-block"
                              style={{ backgroundColor: `${COLORS.green}20`, color: COLORS.green }}
                            >
                              해결
                            </span>
                          ) : (
                            <span
                              className="text-xs px-2.5 py-1 rounded-full font-medium inline-block"
                              style={{ backgroundColor: `${COLORS.red}20`, color: COLORS.red }}
                            >
                              미해결
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <ChevronRight size={14} style={{ color: COLORS.textMuted }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* 운영 요약 (30일) */}
          <section>
            <h2 className="text-sm font-semibold mb-3" style={{ color: COLORS.textMuted }}>
              운영 요약 (30일)
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label="총 주문" value={metrics.reduce((s, m) => s + m.totalOrders, 0)} unit="건" />
              <SummaryCard label="총 피킹" value={metrics.reduce((s, m) => s + m.totalPicks, 0)} unit="건" />
              <SummaryCard label="오배송 건수" value={metrics.reduce((s, m) => s + m.misshipmentCount, 0)} unit="건" color={COLORS.red} />
              <SummaryCard label="SLA 위반일" value={new Set(violations.map((v) => v.violationDate)).size} unit="일" color={COLORS.yellow} />
            </div>
          </section>
        </main>
      )}

      {/* ── 위반 상세 모달 ── */}
      {selectedViolation && target && (
        <ViolationDetailModal
          violation={selectedViolation}
          metrics={metrics}
          target={target}
          onClose={() => setSelectedViolation(null)}
        />
      )}
    </div>
  );
}
