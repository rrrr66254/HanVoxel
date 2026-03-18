import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  ClipboardCheck,
  AlertTriangle,
  Package,
  TrendingUp,
  Users,
  ArrowLeft,
  Search,
  ChevronRight,
} from 'lucide-react';
import QcInspectionForm from './QcInspectionForm';
import QcSupplierScorecard from './QcSupplierScorecard';
import type { QcStatsData, InspectionData, SupplierData } from '../../api/qc-api';
import { getQcStats, getInspections, getSuppliers } from '../../api/qc-api';
import { MOCK_COMPANY_ID, MOCK_SITE_ID } from '../../constants/mock-ids';

// ── 다크 테마 색상 상수 ──────────────────────────────────
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  hoverRow: '#1C2128',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  gridLine: '#21262D',
  green: '#3FB950',
  blue: '#2D7DD2',
  yellow: '#D29922',
  red: '#F85149',
  orange: '#D29922',
  purple: '#A371F7',
} as const;

// ── 차트 바 색상 팔레트 ─────────────────────────────────
const BAR_COLORS = ['#58A6FF', '#3FB950', '#D29922', '#F85149', '#A371F7', '#79C0FF', '#8B949E'];

// ── 목 데이터 ───────────────────────────────────────────
const MOCK_STATS: QcStatsData = {
  days: 30,
  totalInspections: 87,
  totalQty: 24500,
  totalDefect: 312,
  avgDefectRate: 1.27,
  inboundDefectRate: 1.45,
  outboundDefectRate: 0.82,
  defectsByType: [
    { type: 'DAMAGED', qty: 98 },
    { type: 'WRONG_QTY', qty: 72 },
    { type: 'PACKAGING', qty: 56 },
    { type: 'WRONG_ITEM', qty: 42 },
    { type: 'EXPIRED', qty: 28 },
    { type: 'CONTAMINATED', qty: 12 },
    { type: 'OTHER', qty: 4 },
  ],
  quarantineCount: 34,
};

const MOCK_SUPPLIERS: SupplierData[] = [
  { id: 's1', companyId: MOCK_COMPANY_ID, name: '한국물류자재', code: 'SUP-001', contact: '02-1234-5678', email: null, grade: 'A', qualityScore: 94.2, isActive: true },
  { id: 's2', companyId: MOCK_COMPANY_ID, name: '글로벌패키징', code: 'SUP-002', contact: null, email: null, grade: 'B', qualityScore: 82.5, isActive: true },
  { id: 's3', companyId: MOCK_COMPANY_ID, name: '동아식품원료', code: 'SUP-003', contact: null, email: null, grade: 'C', qualityScore: 65.8, isActive: true },
  { id: 's4', companyId: MOCK_COMPANY_ID, name: '세진전자부품', code: 'SUP-004', contact: null, email: null, grade: 'D', qualityScore: 42.1, isActive: true },
];

const MOCK_INSPECTIONS: InspectionData[] = [
  {
    id: 'i1', siteId: MOCK_SITE_ID, supplierId: 's1', type: 'INBOUND', status: 'COMPLETED',
    totalQty: 500, passedQty: 497, defectQty: 3, defectRate: 0.6,
    referenceNo: 'GR-20260312-001', inspectorName: '김검수',
    inspectedAt: new Date(Date.now() - 86400000).toISOString(), note: null,
    supplier: MOCK_SUPPLIERS[0],
    items: [
      { id: 'd1', defectType: 'DAMAGED', qty: 2, itemName: '박스 A', itemSku: 'SKU-001', quarantineLocationId: null, disposition: 'RETURNED', note: null },
      { id: 'd2', defectType: 'PACKAGING', qty: 1, itemName: null, itemSku: null, quarantineLocationId: 'qz-1', disposition: 'QUARANTINED', note: null },
    ],
  },
  {
    id: 'i2', siteId: MOCK_SITE_ID, supplierId: 's4', type: 'INBOUND', status: 'COMPLETED',
    totalQty: 200, passedQty: 185, defectQty: 15, defectRate: 7.5,
    referenceNo: 'GR-20260311-003', inspectorName: '이품질',
    inspectedAt: new Date(Date.now() - 86400000 * 2).toISOString(), note: '불량 다수 발생',
    supplier: MOCK_SUPPLIERS[3],
    items: [
      { id: 'd3', defectType: 'WRONG_ITEM', qty: 8, itemName: '부품 C', itemSku: 'SKU-055', quarantineLocationId: 'qz-1', disposition: 'QUARANTINED', note: null },
      { id: 'd4', defectType: 'DAMAGED', qty: 7, itemName: '부품 D', itemSku: 'SKU-056', quarantineLocationId: 'qz-1', disposition: 'QUARANTINED', note: null },
    ],
  },
  {
    id: 'i3', siteId: MOCK_SITE_ID, supplierId: null, type: 'OUTBOUND', status: 'COMPLETED',
    totalQty: 350, passedQty: 347, defectQty: 3, defectRate: 0.86,
    referenceNo: 'GI-20260311-002', inspectorName: '박출고',
    inspectedAt: new Date(Date.now() - 86400000 * 2).toISOString(), note: null,
    supplier: null,
    items: [
      { id: 'd5', defectType: 'WRONG_QTY', qty: 3, itemName: null, itemSku: null, quarantineLocationId: null, disposition: 'REWORKED', note: null },
    ],
  },
];

// ── 불량 유형 라벨 ──────────────────────────────────────
const DEFECT_TYPE_LABELS: Record<string, string> = {
  DAMAGED: '파손',
  WRONG_ITEM: '오품',
  WRONG_QTY: '수량 불일치',
  EXPIRED: '유통기한 초과',
  CONTAMINATED: '오염',
  PACKAGING: '포장 불량',
  OTHER: '기타',
};

// ── 등급별 색상 매핑 ────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  A: COLORS.green,
  B: COLORS.blue,
  C: COLORS.yellow,
  D: COLORS.red,
};

type TabType = 'overview' | 'inspections' | 'suppliers' | 'new';

interface QcDashboardProps {
  onBack: () => void;
}

// ── 애니메이션 카운터 훅 ────────────────────────────────
function useAnimatedCounter(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

// ── KPI 카드 컴포넌트 ───────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  change?: number;
  topColor: string;
  subText?: string;
}

function KpiCard({ icon, label, value, suffix = '', decimals = 0, change, topColor, subText }: KpiCardProps) {
  const animatedValue = useAnimatedCounter(Math.round(value * Math.pow(10, decimals)));
  const displayValue = decimals > 0
    ? (animatedValue / Math.pow(10, decimals)).toFixed(decimals)
    : animatedValue.toString();

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      {/* 상단 3px 색상 라인 */}
      <div style={{ height: '3px', backgroundColor: topColor }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: topColor }}>{icon}</span>
          <span className="text-xs font-medium" style={{ color: COLORS.textMuted }}>{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold" style={{ color: COLORS.text }}>
            {displayValue}
          </span>
          {suffix && (
            <span className="text-xs" style={{ color: COLORS.textMuted }}>{suffix}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {change !== undefined && (
            <span
              className="text-xs font-medium flex items-center gap-0.5"
              style={{ color: change >= 0 ? COLORS.green : COLORS.red }}
            >
              {change >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(change).toFixed(1)}%
            </span>
          )}
          {subText && (
            <span className="text-xs" style={{ color: COLORS.textMuted }}>{subText}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 빈 상태 컴포넌트 ────────────────────────────────────
function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <span style={{ color: COLORS.textMuted }}>{icon}</span>
      <p className="text-sm" style={{ color: COLORS.textMuted }}>{message}</p>
    </div>
  );
}

// ── 커스텀 툴팁 (차트) ──────────────────────────────────
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string; qty: number; pct: string } }>;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
    >
      <div className="font-medium">{data.name}</div>
      <div style={{ color: COLORS.textMuted }}>{data.qty}건 ({data.pct})</div>
    </div>
  );
}

// ── 메인 대시보드 ───────────────────────────────────────
export default function QcDashboard({ onBack }: QcDashboardProps) {
  const [tab, setTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<QcStatsData | null>(null);
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [s, { inspections: ins }, sups] = await Promise.all([
      getQcStats(MOCK_SITE_ID),
      getInspections(MOCK_SITE_ID, { limit: 50 }),
      getSuppliers(MOCK_COMPANY_ID),
    ]);
    setStats(s ?? MOCK_STATS);
    setInspections(ins.length > 0 ? ins : MOCK_INSPECTIONS);
    setSuppliers(sups.length > 0 ? sups : MOCK_SUPPLIERS);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 로딩 화면
  if (loading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: `${COLORS.border}`, borderTopColor: 'transparent' }}
          />
          <span className="text-sm" style={{ color: COLORS.textMuted }}>로딩 중...</span>
        </div>
      </div>
    );
  }

  const currentStats = stats ?? MOCK_STATS;

  // 차트 데이터 가공
  const chartData = currentStats.defectsByType.map((d) => {
    const pct = currentStats.totalDefect > 0
      ? ((d.qty / currentStats.totalDefect) * 100).toFixed(1)
      : '0.0';
    return {
      name: DEFECT_TYPE_LABELS[d.type] ?? d.type,
      qty: d.qty,
      pct: `${pct}%`,
    };
  });

  const tabs: Array<{ key: TabType; label: string }> = [
    { key: 'overview', label: '대시보드' },
    { key: 'inspections', label: '검수 내역' },
    { key: 'suppliers', label: '공급업체' },
    { key: 'new', label: '새 검수' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      {/* ── 헤더 ────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{ backgroundColor: `${COLORS.bg}E6`, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
                style={{ color: COLORS.textMuted }}
              >
                <ArrowLeft size={16} />
                돌아가기
              </button>
              <div className="flex items-center gap-2">
                <ClipboardCheck size={20} style={{ color: COLORS.blue }} />
                <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>
                  품질 검수 관리 (QC)
                </h1>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <div
              className="flex gap-0.5 rounded-lg p-1"
              style={{ backgroundColor: COLORS.gridLine }}
            >
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="px-4 py-1.5 text-sm rounded-md transition-all duration-200"
                  style={{
                    backgroundColor: tab === key ? COLORS.card : 'transparent',
                    color: tab === key ? COLORS.text : COLORS.textMuted,
                    fontWeight: tab === key ? 600 : 400,
                    boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── 새 검수 입력 탭 ─────────────────────────────── */}
      {tab === 'new' && (
        <QcInspectionForm
          suppliers={suppliers}
          onCreated={() => { fetchData(); setTab('inspections'); }}
        />
      )}

      {/* ── 공급업체 탭 ─────────────────────────────────── */}
      {tab === 'suppliers' && (
        <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          {selectedSupplier ? (
            <div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="flex items-center gap-1.5 text-sm mb-4 transition-colors hover:opacity-80"
                style={{ color: COLORS.textMuted }}
              >
                <ArrowLeft size={14} />
                공급업체 목록
              </button>
              <QcSupplierScorecard supplierId={selectedSupplier} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: COLORS.textMuted }}>
                  <Users size={16} />
                  공급업체 품질 등급
                </h2>
              </div>

              {suppliers.length === 0 ? (
                <EmptyState
                  icon={<Users size={48} />}
                  message="등록된 공급업체가 없습니다."
                />
              ) : (
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${COLORS.border}` }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: COLORS.card }}>
                        <th className="px-5 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>공급업체</th>
                        <th className="px-5 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>코드</th>
                        <th className="px-5 py-3 text-center text-xs font-medium" style={{ color: COLORS.textMuted }}>등급</th>
                        <th className="px-5 py-3 text-right text-xs font-medium" style={{ color: COLORS.textMuted }}>품질 점수</th>
                        <th className="px-5 py-3 text-center text-xs font-medium" style={{ color: COLORS.textMuted }}>상세</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.map((s, idx) => {
                        const gradeColor = GRADE_COLOR[s.grade] ?? COLORS.blue;
                        return (
                          <tr
                            key={s.id}
                            className="transition-colors duration-150 cursor-pointer"
                            style={{
                              backgroundColor: idx % 2 === 0 ? COLORS.bg : COLORS.gridLine,
                              borderTop: `1px solid ${COLORS.border}`,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = COLORS.hoverRow; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? COLORS.bg : COLORS.gridLine; }}
                            onClick={() => setSelectedSupplier(s.id)}
                          >
                            <td className="px-5 py-3 font-medium" style={{ color: COLORS.text }}>{s.name}</td>
                            <td className="px-5 py-3" style={{ color: COLORS.textMuted }}>{s.code}</td>
                            <td className="px-5 py-3 text-center">
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                                style={{
                                  backgroundColor: `${gradeColor}20`,
                                  color: gradeColor,
                                  border: `1px solid ${gradeColor}40`,
                                }}
                              >
                                {s.grade}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-medium" style={{ color: COLORS.text }}>{s.qualityScore}</td>
                            <td className="px-5 py-3 text-center">
                              <ChevronRight size={16} style={{ color: COLORS.textMuted, display: 'inline' }} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* ── 검수 내역 탭 ───────────────────────────────── */}
      {tab === 'inspections' && (
        <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: COLORS.textMuted }}>
            <Search size={16} />
            최근 검수 내역
          </h2>

          {inspections.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck size={48} />}
              message="검수 내역이 없습니다. 새 검수를 등록해 주세요."
            />
          ) : (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: COLORS.card }}>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>일시</th>
                    <th className="px-4 py-3 text-center text-xs font-medium" style={{ color: COLORS.textMuted }}>유형</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>공급업체</th>
                    <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: COLORS.textMuted }}>총 수량</th>
                    <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: COLORS.textMuted }}>불량</th>
                    <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: COLORS.textMuted }}>불량률</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>전표번호</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>검수자</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.map((insp, idx) => {
                    // 불량률 색상 결정
                    const rateColor = insp.defectRate > 3
                      ? COLORS.red
                      : insp.defectRate > 1
                        ? COLORS.yellow
                        : COLORS.green;

                    return (
                      <tr
                        key={insp.id}
                        className="transition-colors duration-150"
                        style={{
                          backgroundColor: idx % 2 === 0 ? COLORS.bg : COLORS.gridLine,
                          borderTop: `1px solid ${COLORS.border}`,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = COLORS.hoverRow; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? COLORS.bg : COLORS.gridLine; }}
                      >
                        <td className="px-4 py-3 text-xs" style={{ color: COLORS.textMuted }}>
                          {insp.inspectedAt ? new Date(insp.inspectedAt).toLocaleString('ko-KR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{
                              backgroundColor: insp.type === 'INBOUND' ? `${COLORS.blue}20` : `${COLORS.purple}20`,
                              color: insp.type === 'INBOUND' ? COLORS.blue : COLORS.purple,
                            }}
                          >
                            {insp.type === 'INBOUND' ? '입고' : '출고'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: COLORS.text }}>
                          {insp.supplier?.name ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: COLORS.text }}>
                          {insp.totalQty.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: COLORS.red }}>
                          {insp.defectQty}
                        </td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: rateColor }}>
                          {insp.defectRate.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: COLORS.textMuted }}>
                          {insp.referenceNo ?? '-'}
                        </td>
                        <td className="px-4 py-3" style={{ color: COLORS.textMuted }}>
                          {insp.inspectorName ?? '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      {/* ── 대시보드 개요 탭 ────────────────────────────── */}
      {tab === 'overview' && (
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* KPI 카드 4개 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<ClipboardCheck size={18} />}
              label="총 검수"
              value={currentStats.totalInspections}
              suffix="건"
              topColor={COLORS.blue}
              change={5.2}
              subText={`최근 ${currentStats.days}일`}
            />
            <KpiCard
              icon={<AlertTriangle size={18} />}
              label="평균 불량률"
              value={currentStats.avgDefectRate}
              suffix="%"
              decimals={2}
              topColor={currentStats.avgDefectRate > 3 ? COLORS.red : currentStats.avgDefectRate > 1 ? COLORS.yellow : COLORS.green}
              change={-0.3}
              subText={`검수 ${currentStats.totalQty.toLocaleString()}개`}
            />
            <KpiCard
              icon={<TrendingUp size={18} />}
              label="입고 / 출고 불량률"
              value={currentStats.inboundDefectRate}
              suffix={`% / ${currentStats.outboundDefectRate.toFixed(2)}%`}
              decimals={2}
              topColor={COLORS.purple}
              subText="입고 vs 출고"
            />
            <KpiCard
              icon={<Package size={18} />}
              label="격리 재고"
              value={currentStats.quarantineCount}
              suffix="건"
              topColor={COLORS.orange}
              change={2.1}
            />
          </div>

          {/* 불량 유형 분포 - 수평 바 차트 */}
          <section>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.textMuted }}>
              <AlertTriangle size={16} />
              불량 유형 분포
            </h2>
            <div
              className="rounded-lg p-5"
              style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              {chartData.length === 0 ? (
                <EmptyState
                  icon={<AlertTriangle size={40} />}
                  message="불량 데이터가 없습니다."
                />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={COLORS.gridLine}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: COLORS.textMuted, fontSize: 12 }}
                      axisLine={{ stroke: COLORS.gridLine }}
                      tickLine={{ stroke: COLORS.gridLine }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fill: COLORS.textMuted, fontSize: 12 }}
                      axisLine={{ stroke: COLORS.gridLine }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: `${COLORS.hoverRow}80` }}
                    />
                    <Bar
                      dataKey="qty"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    >
                      {chartData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* 공급업체 등급 요약 카드 */}
          <section>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.textMuted }}>
              <Users size={16} />
              공급업체 등급 현황
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {suppliers.slice(0, 4).map((s) => {
                const gradeColor = GRADE_COLOR[s.grade] ?? COLORS.blue;
                return (
                  <div
                    key={s.id}
                    className="rounded-lg p-4 flex items-center gap-4 transition-colors duration-150 cursor-pointer"
                    style={{
                      backgroundColor: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                    }}
                    onClick={() => { setSelectedSupplier(s.id); setTab('suppliers'); }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = gradeColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
                  >
                    {/* 등급 배지 */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                      style={{
                        backgroundColor: `${gradeColor}20`,
                        color: gradeColor,
                        border: `2px solid ${gradeColor}50`,
                      }}
                    >
                      {s.grade}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{s.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                        점수 <span className="font-medium" style={{ color: gradeColor }}>{s.qualityScore}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
