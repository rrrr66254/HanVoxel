/**
 * 물류 특화 경량 ERP 대시보드
 * 다크 테마 UI (배경: #0D1117, 카드: #161B22, 보더: #30363D)
 * 탭: 개요 | 거래처 | 전표 | 원가/마진
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Building2, FileText, TrendingUp, DollarSign,
  Users, Plus, ArrowLeft, Package, AlertCircle,
} from 'lucide-react';
import type {
  PartnerData, VoucherData, SkuMarginData,
  VoucherStatsData, PartnerStatsData,
} from '../../api/erp-api';
import {
  getPartners, createPartner, getPartnerStats,
  getVouchers, createVoucher, confirmVoucher, getVoucherStats, getVoucherPdfUrl,
  getSkuMargins, updateSellingPrice,
} from '../../api/erp-api';

// ── 테마 색상 ──────────────────────────────────────────
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  hoverRow: '#1C2128',
  zebraRow: '#131920',
  purchase: '#2D7DD2',
  sales: '#3FB950',
  warning: '#D29922',
  danger: '#F85149',
  purple: '#A371F7',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
} as const;

// ── Mock 데이터 ────────────────────────────────────────
const MOCK_PARTNER_STATS: PartnerStatsData = {
  suppliers: 8, customers: 12, both: 2, total: 22,
};
const MOCK_VOUCHER_STATS: VoucherStatsData = {
  days: 30, totalPurchases: 15, totalSales: 23,
  purchaseAmount: 45600000, salesAmount: 78900000,
  pendingPurchases: 3, pendingSales: 2,
};
const MOCK_PARTNERS: PartnerData[] = [
  { id: 'pt-1', companyId: 'c1', type: 'SUPPLIER', name: '(주)한진부품', code: 'SUP-001', bizNo: '123-45-67890', ceoName: '김공급', bizType: '제조업', bizCategory: '전자부품', address: '서울시 강남구', phone: '02-1234-5678', email: 'info@hanjin.co.kr', contactName: '이담당', paymentTerms: 'NET30', note: null, isActive: true, createdAt: '2026-01-15' },
  { id: 'pt-2', companyId: 'c1', type: 'CUSTOMER', name: 'CJ물류센터', code: 'CUS-001', bizNo: '234-56-78901', ceoName: '박고객', bizType: '물류업', bizCategory: '창고운영', address: '경기도 용인시', phone: '031-9876-5432', email: 'cj@cjlogistics.com', contactName: '최매니저', paymentTerms: 'NET60', note: null, isActive: true, createdAt: '2026-02-01' },
  { id: 'pt-3', companyId: 'c1', type: 'SUPPLIER', name: '영진포장', code: 'SUP-002', bizNo: '345-67-89012', ceoName: '정대표', bizType: '제조업', bizCategory: '포장재', address: '인천시 남동구', phone: '032-5555-6666', email: null, contactName: null, paymentTerms: 'COD', note: null, isActive: true, createdAt: '2026-02-10' },
];
const MOCK_VOUCHERS: VoucherData[] = [
  { id: 'v-1', siteId: 's1', type: 'PURCHASE', voucherNo: 'PUR-20260310-0001', partnerId: 'pt-1', status: 'CONFIRMED', voucherDate: '2026-03-10', dueDate: '2026-04-10', subtotal: 5000000, taxAmount: 500000, totalAmount: 5500000, referenceNo: 'GR-001', note: null, confirmedAt: '2026-03-10', createdAt: '2026-03-10', partner: { id: 'pt-1', name: '(주)한진부품', code: 'SUP-001' }, lines: [{ id: 'vl-1', lineNo: 1, sku: 'SKU-A100', itemName: '전자부품 A', qty: 100, unitPrice: 30000, amount: 3000000, taxAmount: 300000, note: null }, { id: 'vl-2', lineNo: 2, sku: 'SKU-B200', itemName: '커넥터 B', qty: 200, unitPrice: 10000, amount: 2000000, taxAmount: 200000, note: null }] },
  { id: 'v-2', siteId: 's1', type: 'SALES', voucherNo: 'SAL-20260312-0001', partnerId: 'pt-2', status: 'DRAFT', voucherDate: '2026-03-12', dueDate: null, subtotal: 8000000, taxAmount: 800000, totalAmount: 8800000, referenceNo: null, note: '긴급 출고', confirmedAt: null, createdAt: '2026-03-12', partner: { id: 'pt-2', name: 'CJ물류센터', code: 'CUS-001' }, lines: [{ id: 'vl-3', lineNo: 1, sku: 'SKU-A100', itemName: '전자부품 A', qty: 50, unitPrice: 50000, amount: 2500000, taxAmount: 250000, note: null }, { id: 'vl-4', lineNo: 2, sku: 'SKU-C300', itemName: '화학원료 C', qty: 30, unitPrice: 183333, amount: 5500000, taxAmount: 550000, note: null }] },
];
const MOCK_MARGINS: SkuMarginData[] = [
  { sku: 'SKU-A100', itemName: '전자부품 A', currentQty: 150, fifoCost: 30000, avgCost: 30000, sellingPrice: 50000, fifoMarginPct: 40, avgMarginPct: 40, fifoProfit: 20000, avgProfit: 20000 },
  { sku: 'SKU-B200', itemName: '커넥터 B', currentQty: 500, fifoCost: 10000, avgCost: 10500, sellingPrice: 18000, fifoMarginPct: 44.44, avgMarginPct: 41.67, fifoProfit: 8000, avgProfit: 7500 },
  { sku: 'SKU-C300', itemName: '화학원료 C', currentQty: 80, fifoCost: 120000, avgCost: 118000, sellingPrice: 183000, fifoMarginPct: 34.43, avgMarginPct: 35.52, fifoProfit: 63000, avgProfit: 65000 },
];

const SITE_ID = 'site-demo';
const COMPANY_ID = 'company-demo';

type TabKey = 'overview' | 'partners' | 'vouchers' | 'margins';

const statusLabel: Record<string, string> = { DRAFT: '임시', CONFIRMED: '확정', CANCELED: '취소' };
const typeLabel: Record<string, string> = { PURCHASE: '매입', SALES: '매출', SUPPLIER: '공급업체', CUSTOMER: '고객사', BOTH: '양쪽' };

const formatPrice = (n: number) => new Intl.NumberFormat('ko-KR').format(n);
const formatDate = (s: string) => new Date(s).toLocaleDateString('ko-KR');

// ── 애니메이션 카운터 훅 ──────────────────────────────
function useAnimatedCounter(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    const diff = target - start;
    if (diff === 0) { setValue(target); return; }

    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic 보간
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}

// ── 마진율 게이지 차트 컴포넌트 ────────────────────────
function MarginGauge({ value, label }: { value: number; label: string }) {
  // 게이지: 0~100% 범위, 반원 형태
  const clampedValue = Math.max(0, Math.min(100, value));
  const gaugeData = [
    { name: 'filled', value: clampedValue },
    { name: 'empty', value: 100 - clampedValue },
  ];
  const gaugeColor = clampedValue >= 30
    ? COLORS.sales
    : clampedValue >= 15
      ? COLORS.warning
      : COLORS.danger;

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: 120, height: 70 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={35}
              outerRadius={50}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={gaugeColor} />
              <Cell fill={COLORS.border} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <span
        className="text-lg font-bold -mt-3"
        style={{ color: gaugeColor }}
      >
        {value.toFixed(1)}%
      </span>
      <span className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>
        {label}
      </span>
    </div>
  );
}

// ── KPI 카드 컴포넌트 ─────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  formatted?: string;
  change?: number;
  accentColor: string;
}

function KpiCard({ icon, label, value, formatted, change, accentColor }: KpiCardProps) {
  const animatedValue = useAnimatedCounter(value);
  const displayValue = formatted ?? formatPrice(animatedValue);

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* 상단 3px 컬러 라인 */}
      <div className="h-[3px] w-full" style={{ backgroundColor: accentColor }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div style={{ color: accentColor }}>{icon}</div>
          {change !== undefined && (
            <span
              className="text-xs font-medium flex items-center gap-0.5"
              style={{ color: change >= 0 ? COLORS.sales : COLORS.danger }}
            >
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
            </span>
          )}
        </div>
        <div className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
          {displayValue}
        </div>
        <div className="text-xs mt-1" style={{ color: COLORS.textSecondary }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ── 빈 상태 컴포넌트 ──────────────────────────────────
function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div style={{ color: COLORS.textMuted }}>{icon}</div>
      <p className="text-sm" style={{ color: COLORS.textSecondary }}>{message}</p>
    </div>
  );
}

// ── 탭 정의 ────────────────────────────────────────────
const TAB_ITEMS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: '개요', icon: <TrendingUp size={16} /> },
  { key: 'partners', label: '거래처', icon: <Users size={16} /> },
  { key: 'vouchers', label: '전표', icon: <FileText size={16} /> },
  { key: 'margins', label: '원가/마진', icon: <DollarSign size={16} /> },
];

// ── 커스텀 툴팁 (recharts) ──────────────────────────────
interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      {label && (
        <p className="mb-1 font-medium" style={{ color: COLORS.textPrimary }}>{label}</p>
      )}
      {payload.map((item, idx) => (
        <p key={idx} style={{ color: item.color }}>
          {item.name}: {formatPrice(item.value)}원
        </p>
      ))}
    </div>
  );
}

// ── 메인 대시보드 ──────────────────────────────────────
interface Props { onBack: () => void }

export function ErpDashboard({ onBack }: Props) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [partnerStats, setPartnerStats] = useState<PartnerStatsData | null>(null);
  const [voucherStats, setVoucherStats] = useState<VoucherStatsData | null>(null);
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [margins, setMargins] = useState<SkuMarginData[]>([]);
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [voucherFilter, setVoucherFilter] = useState<string>('all');
  const [showNewPartner, setShowNewPartner] = useState(false);
  const [showNewVoucher, setShowNewVoucher] = useState(false);

  // ── 데이터 로딩 ────────────────────────────────────
  const loadOverview = useCallback(async () => {
    const [ps, vs] = await Promise.all([getPartnerStats(COMPANY_ID), getVoucherStats(SITE_ID)]);
    setPartnerStats(ps ?? MOCK_PARTNER_STATS);
    setVoucherStats(vs ?? MOCK_VOUCHER_STATS);
  }, []);

  const loadPartners = useCallback(async () => {
    const typeParam = partnerFilter !== 'all' ? partnerFilter : undefined;
    const result = await getPartners(COMPANY_ID, { type: typeParam });
    setPartners(result.partners.length > 0 ? result.partners : MOCK_PARTNERS);
  }, [partnerFilter]);

  const loadVouchers = useCallback(async () => {
    const typeParam = voucherFilter !== 'all' ? voucherFilter : undefined;
    const result = await getVouchers(SITE_ID, { type: typeParam });
    setVouchers(result.vouchers.length > 0 ? result.vouchers : MOCK_VOUCHERS);
  }, [voucherFilter]);

  const loadMargins = useCallback(async () => {
    const result = await getSkuMargins(SITE_ID);
    setMargins(result.length > 0 ? result : MOCK_MARGINS);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === 'partners') loadPartners(); }, [tab, loadPartners]);
  useEffect(() => { if (tab === 'vouchers') loadVouchers(); }, [tab, loadVouchers]);
  useEffect(() => { if (tab === 'margins') loadMargins(); }, [tab, loadMargins]);

  const handleConfirmVoucher = async (id: string) => {
    await confirmVoucher(id);
    loadVouchers();
    loadOverview();
  };

  const ps = partnerStats ?? MOCK_PARTNER_STATS;
  const vs = voucherStats ?? MOCK_VOUCHER_STATS;

  // ── 차트 데이터 ────────────────────────────────────
  const partnerDistribution = [
    { name: '공급업체', value: ps.suppliers, color: COLORS.purchase },
    { name: '고객사', value: ps.customers, color: COLORS.sales },
    ...(ps.both > 0 ? [{ name: '양쪽', value: ps.both, color: COLORS.purple }] : []),
  ];

  const voucherBarData = [
    { name: '매입', 건수: vs.totalPurchases, 금액: vs.purchaseAmount },
    { name: '매출', 건수: vs.totalSales, 금액: vs.salesAmount },
  ];

  // 전체 평균 마진율 계산 (마진 탭 게이지용)
  const avgMargin = margins.length > 0
    ? margins.reduce((sum, m) => sum + m.fifoMarginPct, 0) / margins.length
    : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg, color: COLORS.textPrimary }}>
      {/* ── 헤더 ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          backgroundColor: `${COLORS.bg}e6`,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="rounded-lg p-2 transition-colors hover:bg-white/5"
              style={{ color: COLORS.textSecondary }}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${COLORS.purchase}20` }}
              >
                <Building2 size={18} style={{ color: COLORS.purchase }} />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>
                  물류 ERP
                </h1>
                <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                  거래처 · 전표 · 원가 관리
                </p>
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="mt-4 flex gap-1">
            {TAB_ITEMS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all"
                style={{
                  backgroundColor: tab === key ? COLORS.purchase : 'transparent',
                  color: tab === key ? '#fff' : COLORS.textSecondary,
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">
        {/* ── 개요 탭 ──────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* KPI 카드 4개 */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                icon={<Users size={20} />}
                label="거래처"
                value={ps.total}
                accentColor={COLORS.purchase}
                change={5}
              />
              <KpiCard
                icon={<FileText size={20} />}
                label="전표 (30일)"
                value={vs.totalSales + vs.totalPurchases}
                accentColor={COLORS.sales}
                change={12}
              />
              <KpiCard
                icon={<DollarSign size={20} />}
                label="매입액"
                value={vs.purchaseAmount}
                formatted={`${formatPrice(vs.purchaseAmount)}원`}
                accentColor={COLORS.purchase}
                change={-3}
              />
              <KpiCard
                icon={<TrendingUp size={20} />}
                label="매출액"
                value={vs.salesAmount}
                formatted={`${formatPrice(vs.salesAmount)}원`}
                accentColor={COLORS.sales}
                change={8}
              />
            </div>

            {/* 차트 행: 거래처 분류 파이 + 매출/매입 바 */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* 거래처 분류 파이차트 */}
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <h3
                  className="mb-4 text-sm font-semibold"
                  style={{ color: COLORS.textPrimary }}
                >
                  거래처 현황
                </h3>
                <div className="flex items-center justify-center gap-6">
                  <div style={{ width: 160, height: 160 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={partnerDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          dataKey="value"
                          stroke="none"
                        >
                          {partnerDistribution.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {partnerDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs" style={{ color: COLORS.textSecondary }}>
                          {item.name}
                        </span>
                        <span className="text-sm font-bold" style={{ color: item.color }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 매출/매입 비교 바차트 */}
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <h3
                  className="mb-4 text-sm font-semibold"
                  style={{ color: COLORS.textPrimary }}
                >
                  매출/매입 비교
                </h3>
                <div style={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer>
                    <BarChart data={voucherBarData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: COLORS.textSecondary, fontSize: 12 }}
                        axisLine={{ stroke: COLORS.border }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: COLORS.textSecondary, fontSize: 11 }}
                        axisLine={{ stroke: COLORS.border }}
                        tickLine={false}
                        tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}M`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="금액" radius={[4, 4, 0, 0]}>
                        <Cell fill={COLORS.purchase} />
                        <Cell fill={COLORS.sales} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 미확정 전표 + 매출/매입 비율 바 */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* 미확정 전표 */}
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <h3
                  className="mb-4 text-sm font-semibold"
                  style={{ color: COLORS.textPrimary }}
                >
                  미확정 전표
                </h3>
                <div className="flex gap-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${COLORS.purchase}20` }}
                    >
                      <FileText size={18} style={{ color: COLORS.purchase }} />
                    </div>
                    <div>
                      <span
                        className="text-xl font-bold"
                        style={{ color: COLORS.warning }}
                      >
                        {vs.pendingPurchases}
                      </span>
                      <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                        매입 대기
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${COLORS.sales}20` }}
                    >
                      <FileText size={18} style={{ color: COLORS.sales }} />
                    </div>
                    <div>
                      <span
                        className="text-xl font-bold"
                        style={{ color: COLORS.warning }}
                      >
                        {vs.pendingSales}
                      </span>
                      <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                        매출 대기
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 매출/매입 비율 바 */}
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <h3
                  className="mb-4 text-sm font-semibold"
                  style={{ color: COLORS.textPrimary }}
                >
                  매출/매입 비율
                </h3>
                <div
                  className="flex h-6 overflow-hidden rounded-full"
                  style={{ backgroundColor: COLORS.border }}
                >
                  {vs.salesAmount > 0 && (
                    <div
                      className="transition-all duration-700"
                      style={{
                        width: `${(vs.salesAmount / (vs.salesAmount + vs.purchaseAmount)) * 100}%`,
                        backgroundColor: COLORS.sales,
                      }}
                    />
                  )}
                  {vs.purchaseAmount > 0 && (
                    <div
                      className="transition-all duration-700"
                      style={{
                        width: `${(vs.purchaseAmount / (vs.salesAmount + vs.purchaseAmount)) * 100}%`,
                        backgroundColor: COLORS.purchase,
                      }}
                    />
                  )}
                </div>
                <div className="mt-3 flex justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS.sales }}
                    />
                    <span style={{ color: COLORS.textSecondary }}>매출</span>
                    <span className="font-medium" style={{ color: COLORS.sales }}>
                      {formatPrice(vs.salesAmount)}원
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS.purchase }}
                    />
                    <span style={{ color: COLORS.textSecondary }}>매입</span>
                    <span className="font-medium" style={{ color: COLORS.purchase }}>
                      {formatPrice(vs.purchaseAmount)}원
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 거래처 탭 ────────────────────────────────── */}
        {tab === 'partners' && (
          <div className="space-y-4">
            {/* 필터 + 추가 버튼 */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['all', 'SUPPLIER', 'CUSTOMER', 'BOTH'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setPartnerFilter(key)}
                    className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: partnerFilter === key ? COLORS.purchase : COLORS.card,
                      color: partnerFilter === key ? '#fff' : COLORS.textSecondary,
                      border: `1px solid ${partnerFilter === key ? COLORS.purchase : COLORS.border}`,
                    }}
                  >
                    {key === 'all' ? '전체' : typeLabel[key]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowNewPartner(!showNewPartner)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: COLORS.purchase }}
              >
                <Plus size={14} />
                거래처 추가
              </button>
            </div>

            {/* 간이 거래처 추가 폼 */}
            {showNewPartner && (
              <NewPartnerForm
                onCreated={() => { setShowNewPartner(false); loadPartners(); loadOverview(); }}
              />
            )}

            {/* 거래처 테이블 */}
            <div
              className="overflow-x-auto rounded-xl"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: COLORS.card }}>
                    {['유형', '코드', '거래처명', '사업자번호', '연락처', '결제조건'].map((h) => (
                      <th
                        key={h}
                        className="p-3 text-left text-xs font-medium"
                        style={{
                          color: COLORS.textSecondary,
                          borderBottom: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="transition-colors"
                      style={{
                        backgroundColor: idx % 2 === 1 ? COLORS.zebraRow : 'transparent',
                        borderBottom: `1px solid ${COLORS.border}40`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.hoverRow;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          idx % 2 === 1 ? COLORS.zebraRow : 'transparent';
                      }}
                    >
                      <td className="p-3">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                          style={{
                            backgroundColor:
                              p.type === 'SUPPLIER'
                                ? COLORS.purchase
                                : p.type === 'CUSTOMER'
                                  ? COLORS.sales
                                  : COLORS.purple,
                          }}
                        >
                          {typeLabel[p.type]}
                        </span>
                      </td>
                      <td
                        className="p-3 font-mono text-xs"
                        style={{ color: COLORS.textSecondary }}
                      >
                        {p.code}
                      </td>
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3" style={{ color: COLORS.textSecondary }}>
                        {p.bizNo ?? '—'}
                      </td>
                      <td className="p-3" style={{ color: COLORS.textSecondary }}>
                        {p.phone ?? '—'}
                      </td>
                      <td className="p-3" style={{ color: COLORS.textSecondary }}>
                        {p.paymentTerms ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {partners.length === 0 && (
                <EmptyState
                  icon={<Users size={40} />}
                  message="거래처가 없습니다"
                />
              )}
            </div>
          </div>
        )}

        {/* ── 전표 탭 ──────────────────────────────────── */}
        {tab === 'vouchers' && (
          <div className="space-y-4">
            {/* 전표 상태 카드 */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `4px solid ${COLORS.purchase}`,
                }}
              >
                <div className="text-xs" style={{ color: COLORS.textSecondary }}>매입 전표</div>
                <div className="text-xl font-bold mt-1" style={{ color: COLORS.purchase }}>
                  {vs.totalPurchases}
                </div>
              </div>
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `4px solid ${COLORS.sales}`,
                }}
              >
                <div className="text-xs" style={{ color: COLORS.textSecondary }}>매출 전표</div>
                <div className="text-xl font-bold mt-1" style={{ color: COLORS.sales }}>
                  {vs.totalSales}
                </div>
              </div>
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `4px solid ${COLORS.warning}`,
                }}
              >
                <div className="text-xs" style={{ color: COLORS.textSecondary }}>매입 대기</div>
                <div className="text-xl font-bold mt-1" style={{ color: COLORS.warning }}>
                  {vs.pendingPurchases}
                </div>
              </div>
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `4px solid ${COLORS.warning}`,
                }}
              >
                <div className="text-xs" style={{ color: COLORS.textSecondary }}>매출 대기</div>
                <div className="text-xl font-bold mt-1" style={{ color: COLORS.warning }}>
                  {vs.pendingSales}
                </div>
              </div>
            </div>

            {/* 필터 + 생성 버튼 */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['all', 'PURCHASE', 'SALES'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setVoucherFilter(key)}
                    className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: voucherFilter === key ? COLORS.purchase : COLORS.card,
                      color: voucherFilter === key ? '#fff' : COLORS.textSecondary,
                      border: `1px solid ${voucherFilter === key ? COLORS.purchase : COLORS.border}`,
                    }}
                  >
                    {key === 'all' ? '전체' : typeLabel[key]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowNewVoucher(!showNewVoucher)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: COLORS.sales }}
              >
                <Plus size={14} />
                전표 생성
              </button>
            </div>

            {/* 간이 전표 생성 폼 */}
            {showNewVoucher && (
              <NewVoucherForm
                partners={partners.length > 0 ? partners : MOCK_PARTNERS}
                onCreated={() => { setShowNewVoucher(false); loadVouchers(); loadOverview(); }}
              />
            )}

            {/* 전표 테이블 */}
            <div
              className="overflow-x-auto rounded-xl"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: COLORS.card }}>
                    {['전표번호', '유형', '거래처', '일자', '총액', '상태', '액션'].map(
                      (h, i) => (
                        <th
                          key={h}
                          className={`p-3 text-xs font-medium ${i === 4 ? 'text-right' : 'text-left'}`}
                          style={{
                            color: COLORS.textSecondary,
                            borderBottom: `1px solid ${COLORS.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v, idx) => {
                    const isPurchase = v.type === 'PURCHASE';
                    const typeColor = isPurchase ? COLORS.purchase : COLORS.sales;
                    const statusBg =
                      v.status === 'DRAFT'
                        ? COLORS.warning
                        : v.status === 'CONFIRMED'
                          ? COLORS.sales
                          : COLORS.danger;

                    return (
                      <tr
                        key={v.id}
                        className="transition-colors"
                        style={{
                          backgroundColor: idx % 2 === 1 ? COLORS.zebraRow : 'transparent',
                          borderBottom: `1px solid ${COLORS.border}40`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = COLORS.hoverRow;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            idx % 2 === 1 ? COLORS.zebraRow : 'transparent';
                        }}
                      >
                        <td
                          className="p-3 font-mono text-xs"
                          style={{ color: COLORS.textSecondary }}
                        >
                          {v.voucherNo}
                        </td>
                        <td className="p-3">
                          <span className="text-xs font-medium" style={{ color: typeColor }}>
                            {typeLabel[v.type]}
                          </span>
                        </td>
                        <td className="p-3">{v.partner?.name ?? '—'}</td>
                        <td className="p-3" style={{ color: COLORS.textSecondary }}>
                          {formatDate(v.voucherDate)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatPrice(v.totalAmount)}원
                        </td>
                        <td className="p-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: statusBg }}
                          >
                            {statusLabel[v.status]}
                          </span>
                        </td>
                        <td className="p-3 space-x-1">
                          {v.status === 'DRAFT' && (
                            <button
                              onClick={() => handleConfirmVoucher(v.id)}
                              className="rounded px-2.5 py-1 text-[10px] font-medium transition-colors"
                              style={{
                                backgroundColor: `${COLORS.sales}20`,
                                color: COLORS.sales,
                              }}
                            >
                              확정
                            </button>
                          )}
                          <button
                            onClick={() =>
                              window.open(
                                getVoucherPdfUrl(
                                  v.id,
                                  v.type === 'PURCHASE' ? 'purchase_order' : 'delivery_note',
                                ),
                                '_blank',
                              )
                            }
                            className="rounded px-2.5 py-1 text-[10px] font-medium transition-colors"
                            style={{
                              backgroundColor: `${COLORS.textSecondary}20`,
                              color: COLORS.textSecondary,
                            }}
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {vouchers.length === 0 && (
                <EmptyState
                  icon={<FileText size={40} />}
                  message="전표가 없습니다"
                />
              )}
            </div>
          </div>
        )}

        {/* ── 원가/마진 탭 ─────────────────────────────── */}
        {tab === 'margins' && (
          <div className="space-y-6">
            {/* 마진 게이지 + 바차트 */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* 평균 마진율 게이지 */}
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <h3
                  className="mb-2 text-sm font-semibold"
                  style={{ color: COLORS.textPrimary }}
                >
                  평균 마진율
                </h3>
                <div className="flex items-center justify-center gap-8 pt-2">
                  <MarginGauge value={avgMargin} label="FIFO 기준 평균" />
                  {margins.length > 0 && (
                    <MarginGauge
                      value={
                        margins.reduce((s, m) => s + m.avgMarginPct, 0) / margins.length
                      }
                      label="이동평균 기준"
                    />
                  )}
                </div>
              </div>

              {/* SKU별 마진 바차트 */}
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <h3
                  className="mb-4 text-sm font-semibold"
                  style={{ color: COLORS.textPrimary }}
                >
                  SKU별 마진액
                </h3>
                {margins.length > 0 ? (
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={margins.map((m) => ({
                          name: m.sku,
                          FIFO: m.fifoProfit,
                          이동평균: m.avgProfit,
                        }))}
                        barCategoryGap="20%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: COLORS.textSecondary, fontSize: 10 }}
                          axisLine={{ stroke: COLORS.border }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: COLORS.textSecondary, fontSize: 11 }}
                          axisLine={{ stroke: COLORS.border }}
                          tickLine={false}
                          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="FIFO"
                          fill={COLORS.purchase}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="이동평균"
                          fill={COLORS.sales}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Package size={32} />}
                    message="마진 데이터 없음"
                  />
                )}
              </div>
            </div>

            {/* SKU 마진 테이블 */}
            <div>
              <h3
                className="mb-3 text-sm font-semibold"
                style={{ color: COLORS.textPrimary }}
              >
                SKU별 마진율 조회
              </h3>
              <div
                className="overflow-x-auto rounded-xl"
                style={{ border: `1px solid ${COLORS.border}` }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: COLORS.card }}>
                      {[
                        { label: 'SKU', align: 'left' },
                        { label: '품명', align: 'left' },
                        { label: '재고', align: 'right' },
                        { label: 'FIFO 원가', align: 'right' },
                        { label: '이동평균', align: 'right' },
                        { label: '판매가', align: 'right' },
                        { label: '마진율(FIFO)', align: 'right' },
                        { label: '마진액', align: 'right' },
                      ].map((h) => (
                        <th
                          key={h.label}
                          className={`p-3 text-xs font-medium ${h.align === 'right' ? 'text-right' : 'text-left'}`}
                          style={{
                            color: COLORS.textSecondary,
                            borderBottom: `1px solid ${COLORS.border}`,
                          }}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {margins.map((m, idx) => {
                      const marginColor =
                        m.fifoMarginPct >= 30
                          ? COLORS.sales
                          : m.fifoMarginPct >= 15
                            ? COLORS.warning
                            : COLORS.danger;

                      return (
                        <tr
                          key={m.sku}
                          className="transition-colors"
                          style={{
                            backgroundColor:
                              idx % 2 === 1 ? COLORS.zebraRow : 'transparent',
                            borderBottom: `1px solid ${COLORS.border}40`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = COLORS.hoverRow;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              idx % 2 === 1 ? COLORS.zebraRow : 'transparent';
                          }}
                        >
                          <td
                            className="p-3 font-mono text-xs"
                            style={{ color: COLORS.textSecondary }}
                          >
                            {m.sku}
                          </td>
                          <td className="p-3">{m.itemName}</td>
                          <td className="p-3 text-right">{m.currentQty}</td>
                          <td className="p-3 text-right" style={{ color: COLORS.textSecondary }}>
                            {formatPrice(m.fifoCost)}원
                          </td>
                          <td className="p-3 text-right" style={{ color: COLORS.textSecondary }}>
                            {formatPrice(m.avgCost)}원
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatPrice(m.sellingPrice)}원
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-bold" style={{ color: marginColor }}>
                              {m.fifoMarginPct}%
                            </span>
                          </td>
                          <td className="p-3 text-right" style={{ color: COLORS.sales }}>
                            {formatPrice(m.fifoProfit)}원
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {margins.length === 0 && (
                  <EmptyState
                    icon={<AlertCircle size={40} />}
                    message="원가 데이터가 없습니다"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 간이 거래처 추가 폼 ────────────────────────────────

function NewPartnerForm({ onCreated }: { onCreated: () => void }) {
  const [type, setType] = useState('SUPPLIER');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [bizNo, setBizNo] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET30');

  const handleSubmit = async () => {
    if (!name || !code) return;
    await createPartner({
      companyId: COMPANY_ID, type, name, code,
      bizNo: bizNo || undefined, phone: phone || undefined, paymentTerms,
    });
    onCreated();
  };

  // 폼 인풋 공통 스타일
  const inputStyle: React.CSSProperties = {
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textPrimary,
  };

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <h4 className="text-sm font-bold flex items-center gap-2">
        <Plus size={14} style={{ color: COLORS.purchase }} />
        신규 거래처
      </h4>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="SUPPLIER">공급업체</option>
          <option value="CUSTOMER">고객사</option>
          <option value="BOTH">양쪽</option>
        </select>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="코드 (ex: SUP-003)"
          className="rounded-lg px-3 py-2 text-sm placeholder-gray-600"
          style={inputStyle}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="거래처명"
          className="rounded-lg px-3 py-2 text-sm placeholder-gray-600"
          style={inputStyle}
        />
        <input
          value={bizNo}
          onChange={(e) => setBizNo(e.target.value)}
          placeholder="사업자번호"
          className="rounded-lg px-3 py-2 text-sm placeholder-gray-600"
          style={inputStyle}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="연락처"
          className="rounded-lg px-3 py-2 text-sm placeholder-gray-600"
          style={inputStyle}
        />
        <select
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="COD">COD (현금)</option>
          <option value="NET30">NET30</option>
          <option value="NET60">NET60</option>
          <option value="NET90">NET90</option>
        </select>
        <button
          onClick={handleSubmit}
          className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: COLORS.purchase }}
        >
          저장
        </button>
      </div>
    </div>
  );
}

// ── 간이 전표 생성 폼 ──────────────────────────────────

function NewVoucherForm({
  partners,
  onCreated,
}: {
  partners: PartnerData[];
  onCreated: () => void;
}) {
  const [type, setType] = useState('PURCHASE');
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? '');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState([{ sku: '', itemName: '', qty: 1, unitPrice: 0 }]);

  const addLine = () => setLines([...lines, { sku: '', itemName: '', qty: 1, unitPrice: 0 }]);
  const updateLine = (idx: number, field: string, value: string | number) => {
    const next = [...lines];
    (next[idx] as Record<string, string | number>)[field] = value;
    setLines(next);
  };

  const handleSubmit = async () => {
    if (!partnerId || lines.some((l) => !l.sku || !l.itemName)) return;
    await createVoucher({ siteId: SITE_ID, type, partnerId, voucherDate, lines });
    onCreated();
  };

  // 폼 인풋 공통 스타일
  const inputStyle: React.CSSProperties = {
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textPrimary,
  };

  const isPurchase = type === 'PURCHASE';

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <h4 className="text-sm font-bold flex items-center gap-2">
        <FileText
          size={14}
          style={{ color: isPurchase ? COLORS.purchase : COLORS.sales }}
        />
        신규 전표
      </h4>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="PURCHASE">매입</option>
          <option value="SALES">매출</option>
        </select>
        <select
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        >
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
        <input
          type="date"
          value={voucherDate}
          onChange={(e) => setVoucherDate(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>

      {/* 전표 항목 */}
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-2">
            <input
              value={line.sku}
              onChange={(e) => updateLine(idx, 'sku', e.target.value)}
              placeholder="SKU"
              className="rounded-lg px-2.5 py-1.5 text-xs placeholder-gray-600"
              style={inputStyle}
            />
            <input
              value={line.itemName}
              onChange={(e) => updateLine(idx, 'itemName', e.target.value)}
              placeholder="품명"
              className="rounded-lg px-2.5 py-1.5 text-xs placeholder-gray-600"
              style={inputStyle}
            />
            <input
              type="number"
              value={line.qty}
              onChange={(e) => updateLine(idx, 'qty', parseInt(e.target.value) || 0)}
              placeholder="수량"
              className="rounded-lg px-2.5 py-1.5 text-xs placeholder-gray-600"
              style={inputStyle}
            />
            <input
              type="number"
              value={line.unitPrice}
              onChange={(e) => updateLine(idx, 'unitPrice', parseInt(e.target.value) || 0)}
              placeholder="단가"
              className="rounded-lg px-2.5 py-1.5 text-xs placeholder-gray-600"
              style={inputStyle}
            />
          </div>
        ))}
        <button
          onClick={addLine}
          className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
          style={{ color: COLORS.purchase }}
        >
          <Plus size={12} />
          항목 추가
        </button>
      </div>
      <button
        onClick={handleSubmit}
        className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: isPurchase ? COLORS.purchase : COLORS.sales }}
      >
        전표 생성
      </button>
    </div>
  );
}
