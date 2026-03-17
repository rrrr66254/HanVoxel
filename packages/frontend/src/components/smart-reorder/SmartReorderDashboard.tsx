import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  ShieldCheck,
  Brain,
} from 'lucide-react';
import type {
  SmartSchedule,
  TimelineItem,
  AccuracyReport,
  SmartReorderSummary,
} from '../../api/smart-reorder-api';

// ─── Mock 데이터 ───

const MOCK_SUMMARY: SmartReorderSummary = {
  thisWeekOrders: 5,
  avgLeadTimeAccuracy: 87.3,
  stockoutRiskCount: 3,
  savedUrgentOrders: 12,
};

const MOCK_SCHEDULES: SmartSchedule[] = [
  {
    id: '1', siteId: 's1', skuCode: 'SKU-001', skuName: '철판 (SPHC 1.6T)',
    vendorId: 'v1', vendorName: 'CJ물산',
    recommendedOrderDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    recommendedQty: 500, estimatedArrivalDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
    arrivalConfidence: 87, arrivalRangeMin: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
    arrivalRangeMax: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    stockoutRiskDate: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
    reason: '일평균 소비 70개, 현재고 630개, 안전재고 140개. p90 리드타임 7일 기준 내일 발주 필요.',
    status: 'AUTO_SCHEDULED', currentStock: 630, safetyStock: 140, dailyUsage: 70, urgency: 'HIGH', createdAt: new Date().toISOString(),
  },
  {
    id: '2', siteId: 's1', skuCode: 'SKU-002', skuName: '스테인리스 볼트 M10',
    vendorId: 'v2', vendorName: '한진금속',
    recommendedOrderDate: new Date(Date.now() + 0 * 86400000).toISOString().slice(0, 10),
    recommendedQty: 2000, estimatedArrivalDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    arrivalConfidence: 92, arrivalRangeMin: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    arrivalRangeMax: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
    stockoutRiskDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    reason: '오늘 발주하지 않으면 4일 후 재고 소진 위험. 긴급 발주 필요.',
    status: 'AUTO_SCHEDULED', currentStock: 800, safetyStock: 400, dailyUsage: 200, urgency: 'CRITICAL', createdAt: new Date().toISOString(),
  },
  {
    id: '3', siteId: 's1', skuCode: 'SKU-003', skuName: '전자부품 IC-7805',
    vendorId: 'v3', vendorName: '삼성전자 부품사업부',
    recommendedOrderDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    recommendedQty: 300, estimatedArrivalDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    arrivalConfidence: 78, arrivalRangeMin: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    arrivalRangeMax: new Date(Date.now() + 18 * 86400000).toISOString().slice(0, 10),
    stockoutRiskDate: new Date(Date.now() + 16 * 86400000).toISOString().slice(0, 10),
    reason: '수주 SO-20260320-001 납기일 기반 수요 보정. 2주 내 발주 권장.',
    status: 'AUTO_SCHEDULED', currentStock: 450, safetyStock: 100, dailyUsage: 30, urgency: 'MEDIUM', createdAt: new Date().toISOString(),
  },
  {
    id: '4', siteId: 's1', skuCode: 'SKU-004', skuName: '포장재 골판지 A3',
    vendorId: 'v4', vendorName: '대한제지',
    recommendedOrderDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    recommendedQty: 1000, estimatedArrivalDate: new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10),
    arrivalConfidence: 95, arrivalRangeMin: new Date(Date.now() + 16 * 86400000).toISOString().slice(0, 10),
    arrivalRangeMax: new Date(Date.now() + 18 * 86400000).toISOString().slice(0, 10),
    stockoutRiskDate: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
    reason: '재고 여유 있음. 2주 후 정기 발주 권장.',
    status: 'AUTO_SCHEDULED', currentStock: 3000, safetyStock: 500, dailyUsage: 100, urgency: 'LOW', createdAt: new Date().toISOString(),
  },
  {
    id: '5', siteId: 's1', skuCode: 'SKU-005', skuName: '유압호스 HB-300',
    vendorId: 'v5', vendorName: '현대모비스',
    recommendedOrderDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    recommendedQty: 50, estimatedArrivalDate: new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10),
    arrivalConfidence: 82, arrivalRangeMin: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    arrivalRangeMax: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    stockoutRiskDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    reason: '이번 주 내 발주 필요. 리드타임 평균 10일.',
    status: 'AUTO_SCHEDULED', currentStock: 120, safetyStock: 30, dailyUsage: 10, urgency: 'HIGH', createdAt: new Date().toISOString(),
  },
  {
    id: '6', siteId: 's1', skuCode: 'SKU-006', skuName: '알루미늄 프레임 AL-60',
    vendorId: 'v1', vendorName: 'CJ물산',
    recommendedOrderDate: new Date(Date.now() + 0 * 86400000).toISOString().slice(0, 10),
    recommendedQty: 200, estimatedArrivalDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    arrivalConfidence: 90, arrivalRangeMin: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    arrivalRangeMax: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
    stockoutRiskDate: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
    reason: '오늘 발주 필요. 6일 후 재고 소진 예상.',
    status: 'AUTO_SCHEDULED', currentStock: 280, safetyStock: 100, dailyUsage: 40, urgency: 'CRITICAL', createdAt: new Date().toISOString(),
  },
];

const MOCK_TIMELINE: TimelineItem[] = MOCK_SCHEDULES.map((s) => ({
  skuCode: s.skuCode,
  skuName: s.skuName,
  currentStock: s.currentStock,
  dailyUsage: s.dailyUsage,
  safetyStock: s.safetyStock,
  stockSufficientUntil: s.stockoutRiskDate ?? '',
  recommendedOrderDate: s.recommendedOrderDate,
  estimatedArrivalDate: s.estimatedArrivalDate,
  arrivalRangeMin: s.arrivalRangeMin,
  arrivalRangeMax: s.arrivalRangeMax,
  urgency: s.urgency,
  vendorName: s.vendorName,
}));

const MOCK_ACCURACY: AccuracyReport = {
  overallMape: 12.7,
  demandAccuracy: 87.3,
  leadTimeAccuracy: 91.2,
  totalPredictions: 156,
  perSku: [
    { skuCode: 'SKU-001', skuName: '철판 (SPHC 1.6T)', mape: 8.2, sampleCount: 24, modelUsed: 'ENSEMBLE' },
    { skuCode: 'SKU-002', skuName: '스테인리스 볼트 M10', mape: 11.5, sampleCount: 32, modelUsed: 'MOVING_AVG' },
    { skuCode: 'SKU-003', skuName: '전자부품 IC-7805', mape: 15.8, sampleCount: 12, modelUsed: 'LINEAR' },
    { skuCode: 'SKU-004', skuName: '포장재 골판지 A3', mape: 6.1, sampleCount: 45, modelUsed: 'ENSEMBLE' },
    { skuCode: 'SKU-005', skuName: '유압호스 HB-300', mape: 18.4, sampleCount: 8, modelUsed: 'MOVING_AVG' },
  ],
  perVendor: [
    { vendorId: 'v1', vendorName: 'CJ물산', avgLeadTime: 7.2, p90LeadTime: 9, onTimeRate: 88, sampleCount: 36 },
    { vendorId: 'v2', vendorName: '한진금속', avgLeadTime: 4.8, p90LeadTime: 6, onTimeRate: 95, sampleCount: 28 },
    { vendorId: 'v3', vendorName: '삼성전자 부품사업부', avgLeadTime: 12.5, p90LeadTime: 16, onTimeRate: 72, sampleCount: 15 },
    { vendorId: 'v4', vendorName: '대한제지', avgLeadTime: 3.1, p90LeadTime: 4, onTimeRate: 97, sampleCount: 42 },
    { vendorId: 'v5', vendorName: '현대모비스', avgLeadTime: 10.3, p90LeadTime: 14, onTimeRate: 80, sampleCount: 18 },
  ],
};

// ─── 유틸 ───

const urgencyColor = (u: string) => {
  switch (u) {
    case 'CRITICAL': return '#F85149';
    case 'HIGH': return '#D29922';
    case 'MEDIUM': return '#E3B341';
    default: return '#8B949E';
  }
};

const urgencyLabel = (u: string) => {
  switch (u) {
    case 'CRITICAL': return '긴급';
    case 'HIGH': return '높음';
    case 'MEDIUM': return '보통';
    default: return '낮음';
  }
};

const formatDate = (d: string | null) => {
  if (!d) return '-';
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatDateFull = (d: string | null) => {
  if (!d) return '-';
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const daysFromNow = (d: string | null) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff;
};

// ─── 컴포넌트 ───

interface Props {
  onBack: () => void;
}

type TabType = 'timeline' | 'predictions' | 'accuracy' | 'history';

export function SmartReorderDashboard({ onBack }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabType>('timeline');
  const [schedules, setSchedules] = useState<SmartSchedule[]>(MOCK_SCHEDULES);
  const [timeline] = useState<TimelineItem[]>(MOCK_TIMELINE);
  const [accuracy] = useState<AccuracyReport>(MOCK_ACCURACY);
  const [summary] = useState<SmartReorderSummary>(MOCK_SUMMARY);
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');

  // API 호출 (mock fallback)
  useEffect(() => {
    // TODO: API 연동 시 활성화
    // getSmartSchedules('site1').then(...).catch(() => use mock)
  }, []);

  const handleConfirm = useCallback((id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'CONFIRMED' as const } : s)),
    );
  }, []);

  const filteredSchedules = urgencyFilter === 'ALL'
    ? schedules
    : schedules.filter((s) => s.urgency === urgencyFilter);

  const tabs: Array<{ key: TabType; label: string; icon: typeof Calendar }> = [
    { key: 'timeline', label: '발주 타임라인', icon: Calendar },
    { key: 'predictions', label: '입고 예측', icon: Truck },
    { key: 'accuracy', label: '예측 정확도', icon: BarChart3 },
    { key: 'history', label: '학습 현황', icon: Brain },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            스마트 발주
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            데이터 기반 발주 예측 & 자동화
          </p>
        </div>
      </div>

      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard icon={<Package size={20} />} label="이번 주 발주 필요" value={summary.thisWeekOrders} unit="건" color="#58A6FF" />
        <KpiCard icon={<TrendingUp size={20} />} label="리드타임 예측 정확도" value={summary.avgLeadTimeAccuracy} unit="%" color="#3FB950" />
        <KpiCard icon={<AlertTriangle size={20} />} label="재고 소진 위험 SKU" value={summary.stockoutRiskCount} unit="건" color="#F85149" />
        <KpiCard icon={<ShieldCheck size={20} />} label="긴급 발주 절감" value={summary.savedUrgentOrders} unit="건" color="#D2A8FF" />
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border-muted)', paddingBottom: 0 }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: tab === key ? '2px solid var(--accent-blue)' : '2px solid transparent',
              background: 'transparent',
              color: tab === key ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: tab === key ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {tab === 'timeline' && (
        <TimelineTab
          timeline={timeline}
          schedules={filteredSchedules}
          urgencyFilter={urgencyFilter}
          onUrgencyFilter={setUrgencyFilter}
          expandedSku={expandedSku}
          onToggleSku={setExpandedSku}
          onConfirm={handleConfirm}
        />
      )}
      {tab === 'predictions' && (
        <PredictionsTab schedules={filteredSchedules} onConfirm={handleConfirm} />
      )}
      {tab === 'accuracy' && (
        <AccuracyTab accuracy={accuracy} />
      )}
      {tab === 'history' && (
        <HistoryTab accuracy={accuracy} />
      )}
    </div>
  );
}

// ─── KPI 카드 ───

function KpiCard({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-default)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

// ─── 타임라인 탭 ───

function TimelineTab({
  timeline, schedules, urgencyFilter, onUrgencyFilter, expandedSku, onToggleSku, onConfirm,
}: {
  timeline: TimelineItem[];
  schedules: SmartSchedule[];
  urgencyFilter: string;
  onUrgencyFilter: (v: string) => void;
  expandedSku: string | null;
  onToggleSku: (v: string | null) => void;
  onConfirm: (id: string) => void;
}) {
  const filters = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const filteredTimeline = urgencyFilter === 'ALL'
    ? timeline
    : timeline.filter((t) => t.urgency === urgencyFilter);

  return (
    <div>
      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onUrgencyFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: urgencyFilter === f ? 'none' : '1px solid var(--border-default)',
              background: urgencyFilter === f
                ? (f === 'ALL' ? 'var(--accent-blue)' : urgencyColor(f))
                : 'transparent',
              color: urgencyFilter === f ? '#fff' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {f === 'ALL' ? '전체' : urgencyLabel(f)}
            {f !== 'ALL' && (
              <span style={{ marginLeft: 6, opacity: 0.8 }}>
                {timeline.filter((t) => t.urgency === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 타임라인 바 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredTimeline.map((item) => {
          const schedule = schedules.find((s) => s.skuCode === item.skuCode);
          const isExpanded = expandedSku === item.skuCode;
          const daysLeft = daysFromNow(item.stockSufficientUntil);
          const orderDays = daysFromNow(item.recommendedOrderDate);
          const arrivalDays = daysFromNow(item.estimatedArrivalDate);

          // 타임라인 바 계산 (60일 기준)
          const totalDays = 60;
          const stockPct = Math.min(100, Math.max(0, ((daysLeft ?? 0) / totalDays) * 100));
          const orderPct = Math.min(100, Math.max(0, ((orderDays ?? 0) / totalDays) * 100));
          const arrivalMinPct = Math.min(100, Math.max(0, ((daysFromNow(item.arrivalRangeMin) ?? 0) / totalDays) * 100));
          const arrivalMaxPct = Math.min(100, Math.max(0, ((daysFromNow(item.arrivalRangeMax) ?? 0) / totalDays) * 100));

          return (
            <div
              key={item.skuCode}
              style={{
                background: 'var(--bg-secondary)',
                border: `1px solid ${isExpanded ? urgencyColor(item.urgency) + '40' : 'var(--border-default)'}`,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* 메인 행 */}
              <div
                onClick={() => onToggleSku(isExpanded ? null : item.skuCode)}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                {/* 긴급도 배지 */}
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: urgencyColor(item.urgency) + '20',
                  color: urgencyColor(item.urgency),
                  fontSize: 11,
                  fontWeight: 600,
                  minWidth: 40,
                  textAlign: 'center',
                }}>
                  {urgencyLabel(item.urgency)}
                </span>

                {/* SKU 정보 */}
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.skuName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.skuCode} · {item.vendorName}</div>
                </div>

                {/* 타임라인 바 */}
                <div style={{ flex: 1, position: 'relative', height: 28, background: 'var(--bg-primary)', borderRadius: 6, overflow: 'hidden' }}>
                  {/* 재고 유지 기간 (초록) */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${stockPct}%`,
                    background: `linear-gradient(90deg, ${urgencyColor(item.urgency)}30, ${urgencyColor(item.urgency)}10)`,
                    borderRadius: 6,
                  }} />
                  {/* 발주 권장일 마커 */}
                  {orderDays !== null && orderDays >= 0 && (
                    <div style={{
                      position: 'absolute', left: `${orderPct}%`, top: 0, height: '100%',
                      width: 2, background: urgencyColor(item.urgency),
                    }}>
                      <div style={{
                        position: 'absolute', top: -2, left: -8,
                        fontSize: 10, color: urgencyColor(item.urgency), fontWeight: 600,
                      }}>
                        발주
                      </div>
                    </div>
                  )}
                  {/* 입고 예상 범위 */}
                  <div style={{
                    position: 'absolute', left: `${arrivalMinPct}%`, top: 8, height: 12,
                    width: `${Math.max(2, arrivalMaxPct - arrivalMinPct)}%`,
                    background: '#3FB95040',
                    borderRadius: 4,
                    border: '1px solid #3FB95060',
                  }} />
                </div>

                {/* 요약 수치 */}
                <div style={{ minWidth: 130, textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    재고 {item.currentStock}개 · {daysLeft !== null ? `${daysLeft}일` : '-'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    발주일 {formatDate(item.recommendedOrderDate)} · 입고 {formatDate(item.estimatedArrivalDate)}
                  </div>
                </div>

                {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
              </div>

              {/* 확장 상세 */}
              {isExpanded && schedule && (
                <div style={{
                  padding: '0 20px 20px',
                  borderTop: '1px solid var(--border-muted)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 20,
                  paddingTop: 16,
                }}>
                  {/* 발주 정보 */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>발주 정보</div>
                    <InfoRow label="권장 발주일" value={formatDateFull(schedule.recommendedOrderDate)} />
                    <InfoRow label="권장 발주량" value={`${schedule.recommendedQty.toLocaleString()}개`} />
                    <InfoRow label="공급업체" value={schedule.vendorName ?? '-'} />
                    <InfoRow label="현재고" value={`${schedule.currentStock.toLocaleString()}개`} />
                    <InfoRow label="안전재고" value={`${schedule.safetyStock.toLocaleString()}개`} />
                    <InfoRow label="일평균 소비" value={`${schedule.dailyUsage}개/일`} />
                  </div>

                  {/* 입고 예측 */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>입고 예측</div>
                    <InfoRow label="예상 입고일" value={formatDateFull(schedule.estimatedArrivalDate)} />
                    <InfoRow label="빠르면" value={formatDateFull(schedule.arrivalRangeMin)} />
                    <InfoRow label="늦어도" value={formatDateFull(schedule.arrivalRangeMax)} />
                    <InfoRow label="신뢰도" value={schedule.arrivalConfidence ? `${schedule.arrivalConfidence}%` : '-'} />
                    <InfoRow label="재고 소진 예상" value={formatDateFull(schedule.stockoutRiskDate)} highlight />
                  </div>

                  {/* 근거 + 액션 */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>추천 근거</div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
                      {schedule.reason}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => onConfirm(schedule.id)}
                        disabled={schedule.status !== 'AUTO_SCHEDULED'}
                        style={{
                          padding: '8px 20px', borderRadius: 8, border: 'none',
                          background: schedule.status === 'AUTO_SCHEDULED' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                          color: schedule.status === 'AUTO_SCHEDULED' ? '#fff' : 'var(--text-muted)',
                          fontSize: 12, fontWeight: 600, cursor: schedule.status === 'AUTO_SCHEDULED' ? 'pointer' : 'default',
                          fontFamily: 'inherit',
                        }}
                      >
                        {schedule.status === 'CONFIRMED' ? '확정됨' : '지금 발주'}
                      </button>
                      <button
                        style={{
                          padding: '8px 20px', borderRadius: 8,
                          border: '1px solid var(--border-default)',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        1주 후 발주
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: highlight ? '#F85149' : 'var(--text-primary)', fontWeight: highlight ? 600 : 400 }}>{value}</span>
    </div>
  );
}

// ─── 입고 예측 탭 ───

function PredictionsTab({ schedules, onConfirm }: { schedules: SmartSchedule[]; onConfirm: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380, 1fr))', gap: 16 }}>
      {schedules.map((s) => {
        const daysToOrder = daysFromNow(s.recommendedOrderDate);
        const daysToArrival = daysFromNow(s.estimatedArrivalDate);

        return (
          <div key={s.id} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 12,
            padding: 24,
            borderLeft: `4px solid ${urgencyColor(s.urgency)}`,
          }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{s.skuName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.skuCode} · 공급업체: {s.vendorName}</div>
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: 6,
                background: urgencyColor(s.urgency) + '20',
                color: urgencyColor(s.urgency),
                fontSize: 11, fontWeight: 600,
              }}>
                {urgencyLabel(s.urgency)}
              </span>
            </div>

            {/* 핵심 정보 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} style={{ color: 'var(--accent-blue)' }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>권장 발주일</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatDateFull(s.recommendedOrderDate)}
                    {daysToOrder !== null && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>({daysToOrder === 0 ? '오늘' : `${daysToOrder}일 후`})</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={14} style={{ color: '#3FB950' }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>예상 입고</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatDateFull(s.estimatedArrivalDate)}
                    {daysToArrival !== null && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>({daysToArrival}일 후)</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* 입고 범위 */}
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>입고 예상 범위</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>빠르면 {formatDate(s.arrivalRangeMin)}</span>
                <div style={{ flex: 1, height: 4, background: 'var(--border-muted)', borderRadius: 2, margin: '0 12px', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '30%', right: '30%', top: 0, height: '100%',
                    background: '#3FB95060', borderRadius: 2,
                  }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>늦어도 {formatDate(s.arrivalRangeMax)}</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: '#3FB950', fontWeight: 600, marginTop: 6 }}>
                신뢰도 {s.arrivalConfidence}%
              </div>
            </div>

            {/* 근거 */}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              {s.reason}
            </div>

            {/* 액션 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => onConfirm(s.id)}
                disabled={s.status !== 'AUTO_SCHEDULED'}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                  background: s.status === 'AUTO_SCHEDULED' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                  color: s.status === 'AUTO_SCHEDULED' ? '#fff' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 600, cursor: s.status === 'AUTO_SCHEDULED' ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {s.status === 'CONFIRMED' ? '확정됨' : '지금 발주'}
              </button>
              <button style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: '1px solid var(--border-default)',
                background: 'transparent', color: 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                1주 후 발주
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 예측 정확도 탭 ───

function AccuracyTab({ accuracy }: { accuracy: AccuracyReport }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 종합 정확도 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard label="전체 MAPE" value={`${accuracy.overallMape}%`} desc="낮을수록 정확" good={accuracy.overallMape < 15} />
        <MetricCard label="수요 예측 정확도" value={`${accuracy.demandAccuracy}%`} desc="높을수록 정확" good={accuracy.demandAccuracy > 85} />
        <MetricCard label="리드타임 예측 정확도" value={`${accuracy.leadTimeAccuracy}%`} desc="높을수록 정확" good={accuracy.leadTimeAccuracy > 85} />
        <MetricCard label="총 예측 건수" value={`${accuracy.totalPredictions}`} desc="학습 데이터" good />
      </div>

      {/* 공급업체별 신뢰도 */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>공급업체별 납기 신뢰도</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
              {['공급업체', '평균 리드타임', 'P90 리드타임', '납기 준수율', '데이터 수'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accuracy.perVendor.map((v) => (
              <tr key={v.vendorId} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{v.vendorName}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{v.avgLeadTime}일</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{v.p90LeadTime}일</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-primary)', borderRadius: 3, maxWidth: 80 }}>
                      <div style={{
                        width: `${v.onTimeRate}%`, height: '100%', borderRadius: 3,
                        background: v.onTimeRate >= 90 ? '#3FB950' : v.onTimeRate >= 80 ? '#D29922' : '#F85149',
                      }} />
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: v.onTimeRate >= 90 ? '#3FB950' : v.onTimeRate >= 80 ? '#D29922' : '#F85149',
                    }}>
                      {v.onTimeRate}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{v.sampleCount}건</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SKU별 예측 정확도 */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>SKU별 수요 예측 정확도</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
              {['SKU', '상품명', 'MAPE', '모델', '데이터 수'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accuracy.perSku.map((s) => (
              <tr key={s.skuCode} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.skuCode}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)' }}>{s.skuName}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: s.mape < 10 ? '#3FB950' : s.mape < 15 ? '#D29922' : '#F85149',
                  }}>
                    {s.mape}%
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 4,
                    background: 'var(--bg-primary)',
                    fontSize: 11, color: 'var(--text-secondary)',
                  }}>
                    {s.modelUsed}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{s.sampleCount}건</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, desc, good }: { label: string; value: string; desc: string; good: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-default)',
      borderRadius: 12,
      padding: '20px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: good ? '#3FB950' : '#D29922' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{desc}</div>
    </div>
  );
}

// ─── 학습 현황 탭 ───

function HistoryTab({ accuracy }: { accuracy: AccuracyReport }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>SKU별 학습 데이터 현황</h3>
          <button style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-default)',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <RefreshCw size={13} />
            모델 재학습
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {accuracy.perSku.map((s) => {
            const isReady = s.sampleCount >= 5;
            const isAdvanced = s.sampleCount >= 20;

            return (
              <div key={s.skuCode} style={{
                padding: '16px 20px',
                background: 'var(--bg-primary)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}>
                {/* 상태 아이콘 */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: isAdvanced ? '#3FB95015' : isReady ? '#D2992215' : '#8B949E15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isAdvanced ? (
                    <CheckCircle2 size={18} style={{ color: '#3FB950' }} />
                  ) : isReady ? (
                    <Clock size={18} style={{ color: '#D29922' }} />
                  ) : (
                    <AlertTriangle size={18} style={{ color: '#8B949E' }} />
                  )}
                </div>

                {/* SKU 정보 */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.skuName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.skuCode}</div>
                </div>

                {/* 데이터 수 + 진행률 */}
                <div style={{ minWidth: 200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>학습 데이터</span>
                    <span>{s.sampleCount}건</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border-muted)', borderRadius: 2 }}>
                    <div style={{
                      width: `${Math.min(100, (s.sampleCount / 30) * 100)}%`,
                      height: '100%', borderRadius: 2,
                      background: isAdvanced ? '#3FB950' : isReady ? '#D29922' : '#8B949E',
                    }} />
                  </div>
                </div>

                {/* 모델 */}
                <span style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: 'var(--bg-secondary)',
                  fontSize: 11, color: 'var(--text-secondary)', minWidth: 90, textAlign: 'center',
                }}>
                  {s.modelUsed}
                </span>

                {/* 정확도 */}
                <div style={{ minWidth: 80, textAlign: 'right' }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: s.mape < 10 ? '#3FB950' : s.mape < 15 ? '#D29922' : '#F85149',
                  }}>
                    {(100 - s.mape).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>예측 정확도</div>
                </div>

                {/* 상태 텍스트 */}
                <div style={{ minWidth: 160 }}>
                  <span style={{
                    fontSize: 11,
                    color: isAdvanced ? '#3FB950' : isReady ? '#D29922' : '#8B949E',
                  }}>
                    {isAdvanced
                      ? `학습 완료 — 정확도 ${(100 - s.mape).toFixed(1)}%`
                      : isReady
                        ? `기본 예측 중 — ${20 - s.sampleCount}건 더 필요`
                        : `데이터 부족 (${s.sampleCount}건) — ${5 - s.sampleCount}건 이상이면 예측 시작`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
