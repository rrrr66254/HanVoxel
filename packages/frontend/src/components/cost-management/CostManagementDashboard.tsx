/**
 * 원가 관리 대시보드
 * 다크 테마 UI (배경: #0D1117, 카드: #161B22, 보더: #30363D)
 * 탭: 원가 항목 관리 | 제품별 원가 | 수익성 분석
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ── 디자인 토큰 ──────────────────────────────────────────
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  hoverRow: '#1C2128',
  zebraRow: '#131920',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  textDim: '#484F58',
  blue: '#58A6FF',
  green: '#3FB950',
  orange: '#D29922',
  red: '#F85149',
  purple: '#BC8CFF',
} as const;

// ── 타입 정의 ────────────────────────────────────────────
/** 원가 항목 유형 */
type CostItemType = 'MATERIAL' | 'LABOR' | 'OVERHEAD' | 'OTHER';

/** 원가 항목 */
interface CostItem {
  id: string;
  name: string;
  type: CostItemType;
  unit: string;
  unitCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 제품 원가 구성 상세 항목 */
interface ProductCostLine {
  costItemId: string;
  costItemName: string;
  type: CostItemType;
  qty: number;
  unitCost: number;
  totalCost: number;
}

/** 제품 원가 요약 */
interface ProductCostSummary {
  sku: string;
  productName: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  otherCost: number;
  totalCost: number;
  lines: ProductCostLine[];
}

/** 수익성 분석 — 수주 건별 */
interface ProfitabilityRow {
  orderId: string;
  orderNo: string;
  partnerName: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

/** 수익성 분석 — 월별 트렌드 */
interface MonthlyTrend {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

/** 수익성 분석 — 제품별 원가 비중 */
interface ProductCostBar {
  sku: string;
  productName: string;
  materialPct: number;
  laborPct: number;
  overheadPct: number;
  otherPct: number;
}

/** 수익성 KPI */
interface ProfitabilityKpi {
  avgMarginPct: number;
  lossOrderCount: number;
  topProduct: string;
  topMarginPct: number;
}

// ── 유형별 색상/라벨 매핑 ─────────────────────────────────
const TYPE_CONFIG: Record<CostItemType, { label: string; color: string }> = {
  MATERIAL: { label: '자재비', color: COLORS.blue },
  LABOR: { label: '인건비', color: COLORS.green },
  OVERHEAD: { label: '간접비', color: COLORS.orange },
  OTHER: { label: '기타', color: COLORS.textMuted },
};

// ── 금액 포매터 ──────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

// ── 로컬스토리지 키 ──────────────────────────────────────
const LS_KEY_COST_ITEMS = 'hanvoxel:costItems';

// ── Mock 데이터 ──────────────────────────────────────────

/** 기본 원가 항목 mock 데이터 */
const DEFAULT_COST_ITEMS: CostItem[] = [
  { id: 'ci-1', name: '알루미늄 판재', type: 'MATERIAL', unit: 'kg', unitCost: 4500, isActive: true, createdAt: '2026-01-10', updatedAt: '2026-01-10' },
  { id: 'ci-2', name: '구리 와이어', type: 'MATERIAL', unit: 'm', unitCost: 1200, isActive: true, createdAt: '2026-01-10', updatedAt: '2026-01-10' },
  { id: 'ci-3', name: '볼트·너트 세트', type: 'MATERIAL', unit: '세트', unitCost: 350, isActive: true, createdAt: '2026-01-12', updatedAt: '2026-01-12' },
  { id: 'ci-4', name: '조립 공정 인건비', type: 'LABOR', unit: '시간', unitCost: 25000, isActive: true, createdAt: '2026-01-15', updatedAt: '2026-01-15' },
  { id: 'ci-5', name: '검수 인건비', type: 'LABOR', unit: '시간', unitCost: 22000, isActive: true, createdAt: '2026-01-15', updatedAt: '2026-01-15' },
  { id: 'ci-6', name: '전력 사용료', type: 'OVERHEAD', unit: 'kWh', unitCost: 120, isActive: true, createdAt: '2026-01-20', updatedAt: '2026-01-20' },
  { id: 'ci-7', name: '감가상각비', type: 'OVERHEAD', unit: '월', unitCost: 500000, isActive: true, createdAt: '2026-01-20', updatedAt: '2026-01-20' },
  { id: 'ci-8', name: '포장재', type: 'OTHER', unit: '개', unitCost: 800, isActive: true, createdAt: '2026-02-01', updatedAt: '2026-02-01' },
  { id: 'ci-9', name: '운송비', type: 'OTHER', unit: '건', unitCost: 35000, isActive: false, createdAt: '2026-02-05', updatedAt: '2026-03-01' },
];

/** 제품별 원가 mock */
const MOCK_PRODUCT_COSTS: Record<string, ProductCostSummary> = {
  'SKU-A100': {
    sku: 'SKU-A100',
    productName: '전자부품 A',
    materialCost: 18000,
    laborCost: 6250,
    overheadCost: 3060,
    otherCost: 800,
    totalCost: 28110,
    lines: [
      { costItemId: 'ci-1', costItemName: '알루미늄 판재', type: 'MATERIAL', qty: 2, unitCost: 4500, totalCost: 9000 },
      { costItemId: 'ci-2', costItemName: '구리 와이어', type: 'MATERIAL', qty: 5, unitCost: 1200, totalCost: 6000 },
      { costItemId: 'ci-3', costItemName: '볼트·너트 세트', type: 'MATERIAL', qty: 8.57, unitCost: 350, totalCost: 3000 },
      { costItemId: 'ci-4', costItemName: '조립 공정 인건비', type: 'LABOR', qty: 0.15, unitCost: 25000, totalCost: 3750 },
      { costItemId: 'ci-5', costItemName: '검수 인건비', type: 'LABOR', qty: 0.1136, unitCost: 22000, totalCost: 2500 },
      { costItemId: 'ci-6', costItemName: '전력 사용료', type: 'OVERHEAD', qty: 5, unitCost: 120, totalCost: 600 },
      { costItemId: 'ci-7', costItemName: '감가상각비', type: 'OVERHEAD', qty: 0.00492, unitCost: 500000, totalCost: 2460 },
      { costItemId: 'ci-8', costItemName: '포장재', type: 'OTHER', qty: 1, unitCost: 800, totalCost: 800 },
    ],
  },
  'SKU-B200': {
    sku: 'SKU-B200',
    productName: '커넥터 B',
    materialCost: 5400,
    laborCost: 3750,
    overheadCost: 1560,
    otherCost: 800,
    totalCost: 11510,
    lines: [
      { costItemId: 'ci-2', costItemName: '구리 와이어', type: 'MATERIAL', qty: 3, unitCost: 1200, totalCost: 3600 },
      { costItemId: 'ci-3', costItemName: '볼트·너트 세트', type: 'MATERIAL', qty: 5.14, unitCost: 350, totalCost: 1800 },
      { costItemId: 'ci-4', costItemName: '조립 공정 인건비', type: 'LABOR', qty: 0.1, unitCost: 25000, totalCost: 2500 },
      { costItemId: 'ci-5', costItemName: '검수 인건비', type: 'LABOR', qty: 0.0568, unitCost: 22000, totalCost: 1250 },
      { costItemId: 'ci-6', costItemName: '전력 사용료', type: 'OVERHEAD', qty: 3, unitCost: 120, totalCost: 360 },
      { costItemId: 'ci-7', costItemName: '감가상각비', type: 'OVERHEAD', qty: 0.0024, unitCost: 500000, totalCost: 1200 },
      { costItemId: 'ci-8', costItemName: '포장재', type: 'OTHER', qty: 1, unitCost: 800, totalCost: 800 },
    ],
  },
  'SKU-C300': {
    sku: 'SKU-C300',
    productName: '화학원료 C',
    materialCost: 85000,
    laborCost: 8750,
    overheadCost: 18600,
    otherCost: 1600,
    totalCost: 113950,
    lines: [
      { costItemId: 'ci-1', costItemName: '알루미늄 판재', type: 'MATERIAL', qty: 12, unitCost: 4500, totalCost: 54000 },
      { costItemId: 'ci-2', costItemName: '구리 와이어', type: 'MATERIAL', qty: 10, unitCost: 1200, totalCost: 12000 },
      { costItemId: 'ci-3', costItemName: '볼트·너트 세트', type: 'MATERIAL', qty: 54.29, unitCost: 350, totalCost: 19000 },
      { costItemId: 'ci-4', costItemName: '조립 공정 인건비', type: 'LABOR', qty: 0.25, unitCost: 25000, totalCost: 6250 },
      { costItemId: 'ci-5', costItemName: '검수 인건비', type: 'LABOR', qty: 0.1136, unitCost: 22000, totalCost: 2500 },
      { costItemId: 'ci-6', costItemName: '전력 사용료', type: 'OVERHEAD', qty: 30, unitCost: 120, totalCost: 3600 },
      { costItemId: 'ci-7', costItemName: '감가상각비', type: 'OVERHEAD', qty: 0.03, unitCost: 500000, totalCost: 15000 },
      { costItemId: 'ci-8', costItemName: '포장재', type: 'OTHER', qty: 2, unitCost: 800, totalCost: 1600 },
    ],
  },
};

/** 수익성 분석 mock — 수주별 */
const MOCK_PROFITABILITY: ProfitabilityRow[] = [
  { orderId: 'o-1', orderNo: 'SO-20260301-001', partnerName: 'CJ물류센터', revenue: 15000000, cost: 9800000, profit: 5200000, marginPct: 34.7 },
  { orderId: 'o-2', orderNo: 'SO-20260305-002', partnerName: '삼성전자 물류', revenue: 42000000, cost: 28500000, profit: 13500000, marginPct: 32.1 },
  { orderId: 'o-3', orderNo: 'SO-20260308-003', partnerName: '현대모비스', revenue: 8000000, cost: 6900000, profit: 1100000, marginPct: 13.8 },
  { orderId: 'o-4', orderNo: 'SO-20260310-004', partnerName: 'LG이노텍', revenue: 22000000, cost: 14300000, profit: 7700000, marginPct: 35.0 },
  { orderId: 'o-5', orderNo: 'SO-20260312-005', partnerName: '두산인프라코어', revenue: 5500000, cost: 5800000, profit: -300000, marginPct: -5.5 },
  { orderId: 'o-6', orderNo: 'SO-20260314-006', partnerName: 'SK하이닉스', revenue: 31000000, cost: 21700000, profit: 9300000, marginPct: 30.0 },
  { orderId: 'o-7', orderNo: 'SO-20260315-007', partnerName: '한화에어로', revenue: 18000000, cost: 13500000, profit: 4500000, marginPct: 25.0 },
  { orderId: 'o-8', orderNo: 'SO-20260316-008', partnerName: 'LS산전', revenue: 9000000, cost: 9500000, profit: -500000, marginPct: -5.6 },
];

/** 수익성 분석 mock — 월별 트렌드 */
const MOCK_MONTHLY_TREND: MonthlyTrend[] = [
  { month: '2025-10', revenue: 120000000, cost: 84000000, profit: 36000000, marginPct: 30.0 },
  { month: '2025-11', revenue: 135000000, cost: 91800000, profit: 43200000, marginPct: 32.0 },
  { month: '2025-12', revenue: 110000000, cost: 79200000, profit: 30800000, marginPct: 28.0 },
  { month: '2026-01', revenue: 145000000, cost: 97150000, profit: 47850000, marginPct: 33.0 },
  { month: '2026-02', revenue: 128000000, cost: 89600000, profit: 38400000, marginPct: 30.0 },
  { month: '2026-03', revenue: 150500000, cost: 100333000, profit: 50167000, marginPct: 33.3 },
];

/** 수익성 분석 mock — 제품별 원가 비중 */
const MOCK_PRODUCT_COST_BARS: ProductCostBar[] = [
  { sku: 'SKU-A100', productName: '전자부품 A', materialPct: 64.0, laborPct: 22.2, overheadPct: 10.9, otherPct: 2.8 },
  { sku: 'SKU-B200', productName: '커넥터 B', materialPct: 46.9, laborPct: 32.6, overheadPct: 13.6, otherPct: 6.9 },
  { sku: 'SKU-C300', productName: '화학원료 C', materialPct: 74.6, laborPct: 7.7, overheadPct: 16.3, otherPct: 1.4 },
];

// ── 로컬스토리지 헬퍼 ────────────────────────────────────
function loadCostItems(): CostItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY_COST_ITEMS);
    if (raw) return JSON.parse(raw) as CostItem[];
  } catch { /* 무시 */ }
  return DEFAULT_COST_ITEMS;
}

function saveCostItems(items: CostItem[]): void {
  localStorage.setItem(LS_KEY_COST_ITEMS, JSON.stringify(items));
}

// ── 애니메이션 카운터 훅 ─────────────────────────────────
function useAnimatedCounter(target: number, duration = 700): number {
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}

// ── Props ────────────────────────────────────────────────
interface Props {
  onBack: () => void;
}

type TabKey = 'items' | 'product' | 'profitability';

// ── 메인 컴포넌트 ────────────────────────────────────────
export function CostManagementDashboard({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('items');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'items', label: '원가 항목 관리' },
    { key: 'product', label: '제품별 원가' },
    { key: 'profitability', label: '수익성 분석' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.text, padding: 24 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer',
            padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.blue; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted; }}
        >
          {/* 뒤로가기 화살표 SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>원가 관리</h1>
      </div>

      {/* 탭 바 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === tab.key ? COLORS.blue : COLORS.textMuted,
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              padding: '10px 20px',
              cursor: 'pointer',
              borderBottom: activeTab === tab.key ? `2px solid ${COLORS.blue}` : '2px solid transparent',
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'items' && <CostItemsTab />}
      {activeTab === 'product' && <ProductCostTab />}
      {activeTab === 'profitability' && <ProfitabilityTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 1: 원가 항목 관리
// ══════════════════════════════════════════════════════════
function CostItemsTab() {
  const [items, setItems] = useState<CostItem[]>([]);
  const [filterType, setFilterType] = useState<CostItemType | 'ALL'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CostItem | null>(null);
  const [loading, setLoading] = useState(true);

  // 초기 로드 — API 우선, 실패 시 로컬스토리지 fallback
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/costs/items');
      if (res.ok) {
        const json = await res.json() as { success: boolean; data: CostItem[] };
        if (json.success) {
          setItems(json.data);
          saveCostItems(json.data);
          setLoading(false);
          return;
        }
      }
    } catch { /* API 미구현 — fallback */ }
    // 로컬스토리지 fallback
    setItems(loadCostItems());
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // 항목 저장 (생성/수정)
  const handleSave = useCallback(async (item: CostItem) => {
    const isEdit = items.some((i) => i.id === item.id);

    // API 시도
    try {
      const url = isEdit ? `/api/v1/costs/items/${item.id}` : '/api/v1/costs/items';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await fetchItems();
        setShowModal(false);
        setEditItem(null);
        return;
      }
    } catch { /* fallback */ }

    // 로컬스토리지 fallback
    const now = new Date().toISOString().slice(0, 10);
    let next: CostItem[];
    if (isEdit) {
      next = items.map((i) => i.id === item.id ? { ...item, updatedAt: now } : i);
    } else {
      next = [...items, { ...item, id: `ci-${Date.now()}`, createdAt: now, updatedAt: now }];
    }
    setItems(next);
    saveCostItems(next);
    setShowModal(false);
    setEditItem(null);
  }, [items, fetchItems]);

  // 필터 적용
  const filtered = filterType === 'ALL' ? items : items.filter((i) => i.type === filterType);

  // 필터 버튼 목록
  const filterOptions: { key: CostItemType | 'ALL'; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'MATERIAL', label: '자재비' },
    { key: 'LABOR', label: '인건비' },
    { key: 'OVERHEAD', label: '간접비' },
    { key: 'OTHER', label: '기타' },
  ];

  return (
    <div>
      {/* 필터 + 추가 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilterType(opt.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: `1px solid ${filterType === opt.key ? COLORS.blue : COLORS.border}`,
                background: filterType === opt.key ? `${COLORS.blue}22` : 'transparent',
                color: filterType === opt.key ? COLORS.blue : COLORS.textMuted,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          style={{
            padding: '8px 18px', borderRadius: 6, border: 'none',
            background: COLORS.blue, color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + 항목 추가
        </button>
      </div>

      {/* 테이블 */}
      <div style={{
        background: COLORS.card, borderRadius: 8, border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: COLORS.textMuted }}>로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: COLORS.textMuted }}>등록된 원가 항목이 없습니다.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                {['이름', '유형', '단위', '단위원가', '상태', ''].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: 12,
                      fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    background: idx % 2 === 0 ? 'transparent' : COLORS.zebraRow,
                    borderBottom: `1px solid ${COLORS.border}`,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.hoverRow; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : COLORS.zebraRow; }}
                  onClick={() => { setEditItem(item); setShowModal(true); }}
                >
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{item.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <TypeBadge type={item.type} />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: COLORS.textMuted }}>{item.unit}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(item.unitCost)}원
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 12, padding: '3px 10px', borderRadius: 10,
                      background: item.isActive ? `${COLORS.green}22` : `${COLORS.red}22`,
                      color: item.isActive ? COLORS.green : COLORS.red,
                    }}>
                      {item.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditItem(item); setShowModal(true); }}
                      style={{
                        background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 4,
                        color: COLORS.textMuted, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      편집
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 모달 */}
      {showModal && (
        <CostItemModal
          item={editItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

// ── 유형 뱃지 ────────────────────────────────────────────
function TypeBadge({ type }: { type: CostItemType }) {
  const config = TYPE_CONFIG[type];
  return (
    <span style={{
      fontSize: 12, padding: '3px 10px', borderRadius: 10,
      background: `${config.color}22`,
      color: config.color,
      fontWeight: 500,
    }}>
      {config.label}
    </span>
  );
}

// ── 원가 항목 추가/수정 모달 ─────────────────────────────
function CostItemModal({
  item,
  onSave,
  onClose,
}: {
  item: CostItem | null;
  onSave: (item: CostItem) => void;
  onClose: () => void;
}) {
  const isEdit = item !== null;
  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState<CostItemType>(item?.type ?? 'MATERIAL');
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [unitCost, setUnitCost] = useState(item?.unitCost?.toString() ?? '');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  const handleSubmit = () => {
    if (!name.trim() || !unit.trim() || !unitCost.trim()) return;
    const costNum = parseFloat(unitCost);
    if (isNaN(costNum) || costNum < 0) return;

    onSave({
      id: item?.id ?? '',
      name: name.trim(),
      type,
      unit: unit.trim(),
      unitCost: costNum,
      isActive,
      createdAt: item?.createdAt ?? '',
      updatedAt: '',
    });
  };

  // 모달 오버레이 스타일
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  };

  const modalStyle: React.CSSProperties = {
    background: COLORS.card, borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    padding: 28, width: 440, maxWidth: '90vw',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, color: COLORS.textMuted,
    marginBottom: 6, fontWeight: 500,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: `1px solid ${COLORS.border}`, background: COLORS.bg,
    color: COLORS.text, fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600 }}>
          {isEdit ? '원가 항목 수정' : '원가 항목 추가'}
        </h3>

        {/* 이름 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 알루미늄 판재"
            style={inputStyle}
          />
        </div>

        {/* 유형 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>유형</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(Object.keys(TYPE_CONFIG) as CostItemType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 13,
                  border: `1px solid ${type === t ? TYPE_CONFIG[t].color : COLORS.border}`,
                  background: type === t ? `${TYPE_CONFIG[t].color}22` : 'transparent',
                  color: type === t ? TYPE_CONFIG[t].color : COLORS.textMuted,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* 단위 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>단위</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="예: kg, 시간, 개"
            style={inputStyle}
          />
        </div>

        {/* 단위원가 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>단위원가 (원)</label>
          <input
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="예: 4500"
            style={inputStyle}
          />
        </div>

        {/* 활성 여부 */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>활성 상태</label>
          <button
            onClick={() => setIsActive(!isActive)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none',
              background: isActive ? COLORS.green : COLORS.border,
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: isActive ? 23 : 3,
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${COLORS.border}`, background: 'transparent', color: COLORS.textMuted,
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 18px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border: 'none', background: COLORS.blue, color: '#fff', fontWeight: 600,
            }}
          >
            {isEdit ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 2: 제품별 원가
// ══════════════════════════════════════════════════════════
function ProductCostTab() {
  const [searchText, setSearchText] = useState('');
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [costData, setCostData] = useState<ProductCostSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // 검색 가능한 SKU 목록 (mock 기준)
  const availableSkus = Object.keys(MOCK_PRODUCT_COSTS);

  // SKU 선택 시 데이터 로드
  const handleSelectSku = useCallback(async (sku: string) => {
    setSelectedSku(sku);
    setLoading(true);

    // API 시도
    try {
      const res = await fetch(`/api/v1/costs/products/${sku}`);
      if (res.ok) {
        const json = await res.json() as { success: boolean; data: ProductCostSummary };
        if (json.success) {
          setCostData(json.data);
          setLoading(false);
          return;
        }
      }
    } catch { /* fallback */ }

    // Mock fallback
    const mock = MOCK_PRODUCT_COSTS[sku] ?? null;
    setCostData(mock);
    setLoading(false);
  }, []);

  // 검색 필터 (입력값으로 SKU 필터링)
  const filteredSkus = searchText.trim()
    ? availableSkus.filter((s) =>
        s.toLowerCase().includes(searchText.toLowerCase()) ||
        MOCK_PRODUCT_COSTS[s]?.productName.includes(searchText)
      )
    : availableSkus;

  return (
    <div>
      {/* 검색 입력 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          background: COLORS.card, borderRadius: 8,
          border: `1px solid ${COLORS.border}`, padding: '8px 14px',
          maxWidth: 480,
        }}>
          {/* 검색 아이콘 */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="SKU 코드 또는 제품명 검색..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: COLORS.text, fontSize: 14,
            }}
          />
        </div>
      </div>

      {/* SKU 선택 버튼들 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {filteredSkus.map((sku) => (
          <button
            key={sku}
            onClick={() => handleSelectSku(sku)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${selectedSku === sku ? COLORS.blue : COLORS.border}`,
              background: selectedSku === sku ? `${COLORS.blue}22` : COLORS.card,
              color: selectedSku === sku ? COLORS.blue : COLORS.text,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontWeight: 600 }}>{sku}</span>
            <span style={{ color: COLORS.textMuted, marginLeft: 8 }}>{MOCK_PRODUCT_COSTS[sku]?.productName}</span>
          </button>
        ))}
        {filteredSkus.length === 0 && (
          <span style={{ color: COLORS.textMuted, fontSize: 13 }}>일치하는 SKU가 없습니다.</span>
        )}
      </div>

      {/* 선택된 제품 원가 분석 */}
      {loading && <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>로딩 중...</div>}

      {!loading && costData && (
        <div>
          {/* 요약 카드 4개 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <SummaryCard label="자재비" value={costData.materialCost} color={COLORS.blue} />
            <SummaryCard label="인건비" value={costData.laborCost} color={COLORS.green} />
            <SummaryCard label="간접비" value={costData.overheadCost} color={COLORS.orange} />
            <SummaryCard label="총 원가" value={costData.totalCost} color={COLORS.purple} />
          </div>

          {/* 원형 차트 + 상세 테이블 */}
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
            {/* SVG 원형 차트 */}
            <div style={{
              background: COLORS.card, borderRadius: 8,
              border: `1px solid ${COLORS.border}`, padding: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 14, color: COLORS.textMuted }}>원가 구성 비율</h4>
              <CostPieChart
                material={costData.materialCost}
                labor={costData.laborCost}
                overhead={costData.overheadCost}
                other={costData.otherCost}
              />
              {/* 범례 */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: '자재비', color: COLORS.blue, value: costData.materialCost },
                  { label: '인건비', color: COLORS.green, value: costData.laborCost },
                  { label: '간접비', color: COLORS.orange, value: costData.overheadCost },
                  { label: '기타', color: COLORS.textMuted, value: costData.otherCost },
                ].map((leg) => (
                  <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: leg.color, flexShrink: 0 }} />
                    <span style={{ color: COLORS.textMuted, minWidth: 40 }}>{leg.label}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(leg.value)}원</span>
                    <span style={{ color: COLORS.textDim }}>
                      ({costData.totalCost > 0 ? fmtPct((leg.value / costData.totalCost) * 100) : '0%'})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 상세 테이블 */}
            <div style={{
              background: COLORS.card, borderRadius: 8,
              border: `1px solid ${COLORS.border}`, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
                <h4 style={{ margin: 0, fontSize: 14, color: COLORS.textMuted }}>원가 항목 상세</h4>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    {['항목명', '유형', '수량', '단위원가', '합계'].map((h, i) => (
                      <th key={i} style={{
                        padding: '10px 16px', textAlign: 'left', fontSize: 12,
                        fontWeight: 600, color: COLORS.textMuted,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {costData.lines.map((line, idx) => (
                    <tr
                      key={line.costItemId + idx}
                      style={{
                        borderBottom: `1px solid ${COLORS.border}`,
                        background: idx % 2 === 0 ? 'transparent' : COLORS.zebraRow,
                      }}
                    >
                      <td style={{ padding: '10px 16px', fontSize: 13 }}>{line.costItemName}</td>
                      <td style={{ padding: '10px 16px' }}><TypeBadge type={line.type} /></td>
                      <td style={{ padding: '10px 16px', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: COLORS.textMuted }}>
                        {line.qty % 1 === 0 ? line.qty : line.qty.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(line.unitCost)}원
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {fmt(line.totalCost)}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 선택 전 안내 */}
      {!loading && !costData && !selectedSku && (
        <div style={{
          background: COLORS.card, borderRadius: 8, border: `1px solid ${COLORS.border}`,
          padding: 60, textAlign: 'center', color: COLORS.textMuted,
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <p style={{ margin: 0, fontSize: 14 }}>위에서 제품 SKU를 선택하면 원가 분석이 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}

// ── 요약 카드 ────────────────────────────────────────────
function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const animated = useAnimatedCounter(value);
  return (
    <div style={{
      background: COLORS.card, borderRadius: 8,
      border: `1px solid ${COLORS.border}`, padding: 18,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {fmt(animated)}
        <span style={{ fontSize: 13, fontWeight: 400, color: COLORS.textMuted, marginLeft: 2 }}>원</span>
      </div>
    </div>
  );
}

// ── SVG 파이 차트 (외부 라이브러리 없음) ─────────────────
function CostPieChart({
  material, labor, overhead, other,
}: {
  material: number; labor: number; overhead: number; other: number;
}) {
  const total = material + labor + overhead + other;
  if (total === 0) return <div style={{ color: COLORS.textMuted }}>데이터 없음</div>;

  const slices = [
    { value: material, color: COLORS.blue },
    { value: labor, color: COLORS.green },
    { value: overhead, color: COLORS.orange },
    { value: other, color: COLORS.textMuted },
  ].filter((s) => s.value > 0);

  const cx = 100;
  const cy = 100;
  const r = 80;

  // 파이 슬라이스 경로 계산
  let currentAngle = -Math.PI / 2; // 12시 방향 시작
  const paths: { d: string; color: string }[] = [];

  slices.forEach((slice) => {
    const angle = (slice.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(currentAngle);
    const y1 = cy + r * Math.sin(currentAngle);
    const x2 = cx + r * Math.cos(currentAngle + angle);
    const y2 = cy + r * Math.sin(currentAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;

    paths.push({
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: slice.color,
    });
    currentAngle += angle;
  });

  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity={0.85} stroke={COLORS.card} strokeWidth={2} />
      ))}
      {/* 중앙 원 (도넛 효과) */}
      <circle cx={cx} cy={cy} r={40} fill={COLORS.card} />
      <text x={cx} y={cy - 6} textAnchor="middle" fill={COLORS.textMuted} fontSize="10">총 원가</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={COLORS.text} fontSize="14" fontWeight="600">
        {fmt(total)}
      </text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 3: 수익성 분석
// ══════════════════════════════════════════════════════════
function ProfitabilityTab() {
  const [rows, setRows] = useState<ProfitabilityRow[]>([]);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [bars, setBars] = useState<ProductCostBar[]>([]);
  const [kpi, setKpi] = useState<ProfitabilityKpi>({ avgMarginPct: 0, lossOrderCount: 0, topProduct: '-', topMarginPct: 0 });
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // API 시도
      try {
        const [rowsRes, trendRes, barsRes] = await Promise.all([
          fetch('/api/v1/costs/profitability'),
          fetch('/api/v1/costs/profitability/trend'),
          fetch('/api/v1/costs/profitability/composition'),
        ]);

        if (rowsRes.ok && trendRes.ok && barsRes.ok) {
          const rowsJson = await rowsRes.json() as { success: boolean; data: ProfitabilityRow[] };
          const trendJson = await trendRes.json() as { success: boolean; data: MonthlyTrend[] };
          const barsJson = await barsRes.json() as { success: boolean; data: ProductCostBar[] };

          if (rowsJson.success && trendJson.success && barsJson.success && !cancelled) {
            setRows(rowsJson.data);
            setTrend(trendJson.data);
            setBars(barsJson.data);
            computeKpi(rowsJson.data);
            setLoading(false);
            return;
          }
        }
      } catch { /* fallback */ }

      // Mock fallback
      if (!cancelled) {
        setRows(MOCK_PROFITABILITY);
        setTrend(MOCK_MONTHLY_TREND);
        setBars(MOCK_PRODUCT_COST_BARS);
        computeKpi(MOCK_PROFITABILITY);
        setLoading(false);
      }
    };

    const computeKpi = (data: ProfitabilityRow[]) => {
      if (data.length === 0) return;
      const avgMarginPct = data.reduce((s, r) => s + r.marginPct, 0) / data.length;
      const lossOrderCount = data.filter((r) => r.marginPct < 0).length;
      const top = data.reduce((best, r) => r.marginPct > best.marginPct ? r : best, data[0]);
      setKpi({
        avgMarginPct,
        lossOrderCount,
        topProduct: top.partnerName,
        topMarginPct: top.marginPct,
      });
    };

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>로딩 중...</div>;
  }

  return (
    <div>
      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard
          label="이번 달 평균 이익률"
          value={fmtPct(kpi.avgMarginPct)}
          color={kpi.avgMarginPct >= 20 ? COLORS.green : COLORS.orange}
        />
        <KpiCard
          label="적자 수주 건수"
          value={`${kpi.lossOrderCount}건`}
          color={kpi.lossOrderCount > 0 ? COLORS.red : COLORS.green}
          sub={kpi.lossOrderCount > 0 ? `전체 ${rows.length}건 중` : '적자 없음'}
        />
        <KpiCard
          label="최고 이익률 거래"
          value={fmtPct(kpi.topMarginPct)}
          color={COLORS.blue}
          sub={kpi.topProduct}
        />
      </div>

      {/* 수익성 테이블 */}
      <div style={{
        background: COLORS.card, borderRadius: 8,
        border: `1px solid ${COLORS.border}`, overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>수주별 수익성</h4>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              {['수주번호', '거래처', '매출액', '원가', '이익', '이익률'].map((h, i) => (
                <th key={i} style={{
                  padding: '10px 16px', textAlign: i >= 2 ? 'right' : 'left',
                  fontSize: 12, fontWeight: 600, color: COLORS.textMuted,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              // 이익률에 따른 행 테두리 색상
              let borderLeftColor = 'transparent';
              if (row.marginPct < 0) borderLeftColor = COLORS.red;
              else if (row.marginPct < 30) borderLeftColor = COLORS.orange;

              return (
                <tr
                  key={row.orderId}
                  style={{
                    borderBottom: `1px solid ${COLORS.border}`,
                    borderLeft: `3px solid ${borderLeftColor}`,
                    background: idx % 2 === 0 ? 'transparent' : COLORS.zebraRow,
                  }}
                >
                  <td style={{ padding: '10px 16px', fontSize: 13, fontFamily: 'monospace' }}>{row.orderNo}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{row.partnerName}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(row.revenue)}원
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: COLORS.textMuted }}>
                    {fmt(row.cost)}원
                  </td>
                  <td style={{
                    padding: '10px 16px', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                    color: row.profit >= 0 ? COLORS.green : COLORS.red,
                  }}>
                    {row.profit >= 0 ? '+' : ''}{fmt(row.profit)}원
                  </td>
                  <td style={{
                    padding: '10px 16px', fontSize: 13, textAlign: 'right', fontWeight: 600,
                    color: row.marginPct >= 30 ? COLORS.green : row.marginPct >= 0 ? COLORS.orange : COLORS.red,
                  }}>
                    {fmtPct(row.marginPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 차트 영역: 월별 트렌드 + 제품별 원가 비중 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* 월별 트렌드 라인 차트 */}
        <div style={{
          background: COLORS.card, borderRadius: 8,
          border: `1px solid ${COLORS.border}`, padding: 20,
        }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: COLORS.textMuted }}>월별 수익 트렌드</h4>
          <TrendLineChart data={trend} />
          {/* 범례 */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
            {[
              { label: '매출', color: COLORS.blue },
              { label: '원가', color: COLORS.orange },
              { label: '이익', color: COLORS.green },
            ].map((leg) => (
              <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ width: 12, height: 3, background: leg.color, borderRadius: 2 }} />
                <span style={{ color: COLORS.textMuted }}>{leg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 제품별 원가 비중 바 차트 */}
        <div style={{
          background: COLORS.card, borderRadius: 8,
          border: `1px solid ${COLORS.border}`, padding: 20,
        }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: COLORS.textMuted }}>제품별 원가 구성</h4>
          <CostCompositionBars data={bars} />
          {/* 범례 */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
            {[
              { label: '자재비', color: COLORS.blue },
              { label: '인건비', color: COLORS.green },
              { label: '간접비', color: COLORS.orange },
              { label: '기타', color: COLORS.textMuted },
            ].map((leg) => (
              <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: leg.color }} />
                <span style={{ color: COLORS.textMuted }}>{leg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI 카드 ─────────────────────────────────────────────
function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{
      background: COLORS.card, borderRadius: 8,
      border: `1px solid ${COLORS.border}`, padding: 20,
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── SVG 월별 트렌드 라인 차트 ────────────────────────────
function TrendLineChart({ data }: { data: MonthlyTrend[] }) {
  if (data.length === 0) return <div style={{ color: COLORS.textMuted }}>데이터 없음</div>;

  const w = 420;
  const h = 200;
  const padLeft = 50;
  const padRight = 10;
  const padTop = 10;
  const padBottom = 30;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  // Y축 범위 (매출 기준 최대값)
  const allValues = data.flatMap((d) => [d.revenue, d.cost, d.profit]);
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(0, Math.min(...allValues));
  const range = maxVal - minVal || 1;

  const xStep = data.length > 1 ? chartW / (data.length - 1) : 0;

  // 좌표 변환
  const toX = (i: number) => padLeft + i * xStep;
  const toY = (v: number) => padTop + chartH - ((v - minVal) / range) * chartH;

  // 폴리라인 점 문자열 생성
  const polyline = (values: number[]) =>
    values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  const revenuePoints = polyline(data.map((d) => d.revenue));
  const costPoints = polyline(data.map((d) => d.cost));
  const profitPoints = polyline(data.map((d) => d.profit));

  // Y축 눈금 (4개)
  const yTicks = [0, 1, 2, 3].map((i) => minVal + (range * i) / 3);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      {/* Y축 그리드 */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={padLeft} y1={toY(tick)} x2={w - padRight} y2={toY(tick)}
            stroke={COLORS.border} strokeWidth={1} strokeDasharray="3,3"
          />
          <text x={padLeft - 6} y={toY(tick) + 4} textAnchor="end" fontSize="9" fill={COLORS.textDim}>
            {(tick / 100000000).toFixed(1)}억
          </text>
        </g>
      ))}

      {/* X축 라벨 */}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={h - 6} textAnchor="middle" fontSize="9" fill={COLORS.textDim}>
          {d.month.slice(5)}월
        </text>
      ))}

      {/* 라인 */}
      <polyline points={revenuePoints} fill="none" stroke={COLORS.blue} strokeWidth={2} />
      <polyline points={costPoints} fill="none" stroke={COLORS.orange} strokeWidth={2} />
      <polyline points={profitPoints} fill="none" stroke={COLORS.green} strokeWidth={2} />

      {/* 데이터 포인트 */}
      {data.map((_, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(data[i].revenue)} r={3} fill={COLORS.blue} />
          <circle cx={toX(i)} cy={toY(data[i].cost)} r={3} fill={COLORS.orange} />
          <circle cx={toX(i)} cy={toY(data[i].profit)} r={3} fill={COLORS.green} />
        </g>
      ))}
    </svg>
  );
}

// ── SVG 제품별 원가 비중 바 차트 ─────────────────────────
function CostCompositionBars({ data }: { data: ProductCostBar[] }) {
  if (data.length === 0) return <div style={{ color: COLORS.textMuted }}>데이터 없음</div>;

  const barHeight = 28;
  const gap = 16;
  const labelWidth = 100;
  const chartWidth = 300;
  const totalHeight = data.length * (barHeight + gap) + gap;

  return (
    <svg width="100%" viewBox={`0 0 ${labelWidth + chartWidth + 10} ${totalHeight}`}>
      {data.map((item, idx) => {
        const y = gap + idx * (barHeight + gap);

        // 누적 바 각 구간의 x좌표 계산
        const segments = [
          { pct: item.materialPct, color: COLORS.blue },
          { pct: item.laborPct, color: COLORS.green },
          { pct: item.overheadPct, color: COLORS.orange },
          { pct: item.otherPct, color: COLORS.textMuted },
        ];

        let currentX = labelWidth;

        return (
          <g key={item.sku}>
            {/* 제품명 */}
            <text
              x={labelWidth - 8}
              y={y + barHeight / 2 + 4}
              textAnchor="end"
              fontSize="11"
              fill={COLORS.text}
            >
              {item.productName}
            </text>

            {/* 누적 바 배경 */}
            <rect
              x={labelWidth} y={y}
              width={chartWidth} height={barHeight}
              rx={4} fill={COLORS.bg}
            />

            {/* 각 구간 */}
            {segments.map((seg, sIdx) => {
              const segWidth = (seg.pct / 100) * chartWidth;
              const x = currentX;
              currentX += segWidth;

              return (
                <rect
                  key={sIdx}
                  x={x} y={y}
                  width={Math.max(segWidth, 0)} height={barHeight}
                  fill={seg.color}
                  opacity={0.8}
                  rx={sIdx === 0 ? 4 : 0}
                  // 마지막 세그먼트만 오른쪽 둥글게 처리하기 어려우므로 전체 클리핑 대신 생략
                />
              );
            })}

            {/* 클리핑 마스크 — 둥근 모서리 */}
            <rect
              x={labelWidth} y={y}
              width={chartWidth} height={barHeight}
              rx={4} fill="none"
              stroke={COLORS.border} strokeWidth={1}
            />
          </g>
        );
      })}
    </svg>
  );
}
