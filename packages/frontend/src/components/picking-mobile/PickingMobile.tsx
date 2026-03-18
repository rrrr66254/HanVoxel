/**
 * 모바일 피킹 앱 — 다크 테마 UI (PDA/태블릿 최적화)
 * 화면 흐름: 작업 목록(카드/리스트) → 작업 상세 → 바코드 스캔/피킹 → 대시보드
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutGrid,
  List,
  ScanBarcode,
  Package,
  MapPin,
  Clock,
  User,
  CheckCircle,
  ChevronLeft,
  Minus,
  Plus,
  AlertTriangle,
  BarChart3,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type {
  PickingOrderData,
  PickingLineData,
  PickingStatsData,
} from '../../api/picking-api';
import {
  getPickingOrders,
  getPickingOrder,
  assignOrder,
  startPicking,
  pickLine,
  getPickingStats,
} from '../../api/picking-api';

// ── 테마 색상 상수 ──────────────────────────────────────
const COLORS = {
  bg: 'var(--bg-primary)',
  card: 'var(--bg-secondary)',
  border: 'var(--border-default)',
  critical: 'var(--accent-red)',
  high: 'var(--accent-orange)',
  medium: 'var(--accent-orange)',
  low: 'var(--text-muted)',
} as const;

// ── 긴급도 매핑 (priority 숫자 → 레이블/색상) ──────────
type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

function getUrgency(priority: number): { level: UrgencyLevel; label: string; color: string } {
  if (priority <= 1) return { level: 'CRITICAL', label: '긴급', color: COLORS.critical };
  if (priority === 2) return { level: 'HIGH', label: '높음', color: COLORS.high };
  if (priority === 3) return { level: 'MEDIUM', label: '보통', color: COLORS.medium };
  return { level: 'LOW', label: '낮음', color: COLORS.low };
}

// ── Mock 데이터 (오프라인/개발용) ──────────────────────
const MOCK_ORDERS: PickingOrderData[] = [
  {
    id: 'po-1', siteId: 'site-1', orderNo: 'PO-2026-001', policy: 'FIFO', priority: 1,
    status: 'ASSIGNED', assigneeId: 'w-1', assigneeName: '김작업',
    customerName: '(주)한진물류', note: '긴급', totalLines: 3, pickedLines: 0, errorLines: 0,
    assignedAt: new Date().toISOString(), startedAt: null, completedAt: null,
    createdAt: new Date().toISOString(),
    lines: [
      { id: 'pl-1', lineNo: 1, sku: 'SKU-A100', itemName: '전자부품 A', requestedQty: 10, pickedQty: 0, status: 'PENDING', binLocationId: null, binCode: 'A-01-03', zone: 'A', barcode: '8801234567890', expiryDate: '2026-06-15', receivedDate: '2026-01-10', pickSequence: 1, scanVerified: false, pickedAt: null, errorReason: null },
      { id: 'pl-2', lineNo: 2, sku: 'SKU-B200', itemName: '포장재 B', requestedQty: 25, pickedQty: 0, status: 'PENDING', binLocationId: null, binCode: 'B-02-01', zone: 'B', barcode: '8801234567891', expiryDate: null, receivedDate: '2026-02-05', pickSequence: 2, scanVerified: false, pickedAt: null, errorReason: null },
      { id: 'pl-3', lineNo: 3, sku: 'SKU-C300', itemName: '화학원료 C', requestedQty: 5, pickedQty: 0, status: 'PENDING', binLocationId: null, binCode: 'C-03-02', zone: 'C', barcode: '8801234567892', expiryDate: '2026-04-30', receivedDate: '2026-01-20', pickSequence: 3, scanVerified: false, pickedAt: null, errorReason: null },
    ],
  },
  {
    id: 'po-2', siteId: 'site-1', orderNo: 'PO-2026-002', policy: 'FEFO', priority: 2,
    status: 'PENDING', assigneeId: null, assigneeName: null,
    customerName: 'CJ대한통운', note: null, totalLines: 2, pickedLines: 0, errorLines: 0,
    assignedAt: null, startedAt: null, completedAt: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    lines: [
      { id: 'pl-4', lineNo: 1, sku: 'SKU-D400', itemName: '식품 D', requestedQty: 50, pickedQty: 0, status: 'PENDING', binLocationId: null, binCode: 'D-01-01', zone: 'D', barcode: '8801234567893', expiryDate: '2026-03-20', receivedDate: '2026-01-15', pickSequence: 1, scanVerified: false, pickedAt: null, errorReason: null },
      { id: 'pl-5', lineNo: 2, sku: 'SKU-E500', itemName: '음료 E', requestedQty: 30, pickedQty: 0, status: 'PENDING', binLocationId: null, binCode: 'D-02-03', zone: 'D', barcode: '8801234567894', expiryDate: '2026-05-10', receivedDate: '2026-02-01', pickSequence: 2, scanVerified: false, pickedAt: null, errorReason: null },
    ],
  },
  {
    id: 'po-3', siteId: 'site-1', orderNo: 'PO-2026-003', policy: 'FIFO', priority: 3,
    status: 'COMPLETED', assigneeId: 'w-2', assigneeName: '이피킹',
    customerName: '롯데글로벌로지스', note: null, totalLines: 2, pickedLines: 2, errorLines: 0,
    assignedAt: new Date(Date.now() - 7200000).toISOString(), startedAt: new Date(Date.now() - 6000000).toISOString(), completedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lines: [
      { id: 'pl-6', lineNo: 1, sku: 'SKU-F600', itemName: '의류 F', requestedQty: 15, pickedQty: 15, status: 'PICKED', binLocationId: null, binCode: 'E-01-02', zone: 'E', barcode: '8801234567895', expiryDate: null, receivedDate: '2026-02-10', pickSequence: 1, scanVerified: true, pickedAt: new Date(Date.now() - 5400000).toISOString(), errorReason: null },
      { id: 'pl-7', lineNo: 2, sku: 'SKU-G700', itemName: '잡화 G', requestedQty: 8, pickedQty: 8, status: 'PICKED', binLocationId: null, binCode: 'E-02-01', zone: 'E', barcode: '8801234567896', expiryDate: null, receivedDate: '2026-02-15', pickSequence: 2, scanVerified: true, pickedAt: new Date(Date.now() - 4800000).toISOString(), errorReason: null },
    ],
  },
];

const MOCK_STATS: PickingStatsData = {
  days: 7, totalOrders: 12, pending: 3, inProgress: 2, completed: 7,
  totalLines: 42, totalErrors: 2, errorRate: 4.76, avgPickingTime: 18,
  workerStats: [
    { workerId: 'w-1', name: '김작업', completed: 4, errors: 1, lines: 18 },
    { workerId: 'w-2', name: '이피킹', completed: 3, errors: 1, lines: 14 },
  ],
};

// ── 뷰 타입 ─────────────────────────────────────────────
type MobileView = 'list' | 'detail' | 'scan';
type ListMode = 'card' | 'table';

const DEMO_WORKER = { id: 'w-1', name: '김작업' };
const SITE_ID = 'site-demo';
const LIST_MODE_KEY = 'hanvoxel_picking_list_mode';

// ── 상태 라벨/색상 매핑 ─────────────────────────────────
const statusLabel: Record<string, string> = {
  PENDING: '대기',
  ASSIGNED: '배정됨',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
};
const statusBadgeStyle: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'rgba(72,79,88,0.3)', text: 'var(--text-secondary)' },
  ASSIGNED: { bg: 'rgba(210,153,34,0.15)', text: 'var(--accent-orange)' },
  IN_PROGRESS: { bg: 'rgba(56,139,253,0.15)', text: 'var(--accent-blue)' },
  COMPLETED: { bg: 'rgba(63,185,80,0.15)', text: 'var(--accent-green)' },
};
const lineStatusLabel: Record<string, string> = {
  PENDING: '대기',
  PICKED: '완료',
  SHORT: '부족',
  ERROR: '오류',
};

// ── 애니메이션 카운터 훅 ────────────────────────────────
function useAnimatedCounter(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

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
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ── KPI 카드 컴포넌트 ───────────────────────────────────
interface KpiCardProps {
  topColor: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}

function KpiCard({ topColor, icon, label, value, suffix }: KpiCardProps) {
  const animatedValue = useAnimatedCounter(value);
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      {/* 3px 상단 색상 라인 */}
      <div className="h-[3px] w-full" style={{ backgroundColor: topColor }} />
      <div className="flex items-center gap-3 p-4">
        <div className="flex-shrink-0 opacity-60">{icon}</div>
        <div>
          <div className="text-2xl font-bold text-gray-100">
            {animatedValue}{suffix && <span className="ml-0.5 text-sm text-gray-500">{suffix}</span>}
          </div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

// ── 진행률 바 컴포넌트 ──────────────────────────────────
function ProgressBar({ percent, height = 'h-2' }: { percent: number; height?: string }) {
  return (
    <div className={`${height} w-full overflow-hidden rounded-full`} style={{ backgroundColor: 'var(--bg-tertiary)' }}>
      <div
        className={`${height} rounded-full transition-all duration-500`}
        style={{
          width: `${percent}%`,
          backgroundColor: percent === 100 ? 'var(--accent-green)' : '#388BFD',
        }}
      />
    </div>
  );
}

// ── 긴급도 배지 컴포넌트 ────────────────────────────────
function UrgencyBadge({ priority }: { priority: number }) {
  const { label, color } = getUrgency(priority);
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {priority <= 2 && <AlertTriangle size={10} />}
      {label}
    </span>
  );
}

// ── recharts 다크 테마 커스텀 툴팁 ──────────────────────
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string } }>;
  label?: string;
}

function DarkTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-xl"
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <p className="font-medium text-gray-200">{payload[0].payload.name}</p>
      <p className="text-gray-400">{payload[0].value} 라인</p>
    </div>
  );
}

// ── 메인 컴포넌트 ───────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function PickingMobile({ onBack }: Props) {
  const [view, setView] = useState<MobileView>('list');
  const [orders, setOrders] = useState<PickingOrderData[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PickingOrderData | null>(null);
  const [currentLine, setCurrentLine] = useState<PickingLineData | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<'idle' | 'success' | 'fail'>('idle');
  const [pickedQty, setPickedQty] = useState(0);
  const [stats, setStats] = useState<PickingStatsData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // 카드/리스트 뷰 토글 (localStorage 저장)
  const [listMode, setListMode] = useState<ListMode>(() => {
    try {
      const saved = localStorage.getItem(LIST_MODE_KEY);
      return saved === 'table' ? 'table' : 'card';
    } catch {
      return 'card';
    }
  });

  // 리스트 뷰에서 행 클릭 시 열리는 상세 패널
  const [detailPanelOrder, setDetailPanelOrder] = useState<PickingOrderData | null>(null);

  // 뷰 모드 변경 시 localStorage 저장
  const changeListMode = (mode: ListMode) => {
    setListMode(mode);
    try {
      localStorage.setItem(LIST_MODE_KEY, mode);
    } catch {
      // localStorage 미지원 환경 무시
    }
  };

  // ── 데이터 로딩 ─────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
      const result = await getPickingOrders(SITE_ID, { status: statusParam });
      setOrders(result.orders.length > 0 ? result.orders : MOCK_ORDERS);
    } catch {
      setOrders(MOCK_ORDERS);
    }
    setLoading(false);
  }, [statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const result = await getPickingStats(SITE_ID);
      setStats(result ?? MOCK_STATS);
    } catch {
      setStats(MOCK_STATS);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadStats(); }, [loadStats]);

  // ── 주문 상세로 이동 ──────────────────────────────────
  const openOrder = async (order: PickingOrderData) => {
    try {
      const detail = await getPickingOrder(order.id);
      setSelectedOrder(detail ?? order);
    } catch {
      setSelectedOrder(order);
    }
    setView('detail');
  };

  // ── 배정 받기 ──────────────────────────────────────────
  const handleAssign = async () => {
    if (!selectedOrder) return;
    const updated = await assignOrder(selectedOrder.id, DEMO_WORKER.id, DEMO_WORKER.name);
    if (updated) {
      setSelectedOrder(updated);
    } else {
      setSelectedOrder({ ...selectedOrder, status: 'ASSIGNED', assigneeId: DEMO_WORKER.id, assigneeName: DEMO_WORKER.name });
    }
  };

  // ── 피킹 시작 ──────────────────────────────────────────
  const handleStart = async () => {
    if (!selectedOrder) return;
    await startPicking(selectedOrder.id);
    setSelectedOrder({ ...selectedOrder, status: 'IN_PROGRESS', startedAt: new Date().toISOString() });
  };

  // ── 스캔 화면 열기 ─────────────────────────────────────
  const openScan = (line: PickingLineData) => {
    setCurrentLine(line);
    setScanInput('');
    setScanResult('idle');
    setPickedQty(line.requestedQty);
    setView('scan');
  };

  // ── 바코드 스캔 확인 ───────────────────────────────────
  const handleScan = () => {
    if (!currentLine) return;
    if (scanInput === currentLine.barcode) {
      setScanResult('success');
    } else {
      setScanResult('fail');
    }
  };

  // ── 피킹 완료 ──────────────────────────────────────────
  const handlePickComplete = async () => {
    if (!currentLine || !selectedOrder) return;
    await pickLine(currentLine.id, {
      pickedQty,
      scanVerified: scanResult === 'success',
    });

    // 로컬 상태 업데이트
    const updatedLines = selectedOrder.lines.map((l) =>
      l.id === currentLine.id
        ? { ...l, pickedQty, status: 'PICKED' as const, scanVerified: scanResult === 'success', pickedAt: new Date().toISOString() }
        : l,
    );
    const allDone = updatedLines.every((l) => l.status !== 'PENDING');
    setSelectedOrder({
      ...selectedOrder,
      lines: updatedLines,
      pickedLines: updatedLines.filter((l) => l.status === 'PICKED' || l.status === 'SHORT').length,
      ...(allDone ? { status: 'COMPLETED', completedAt: new Date().toISOString() } : {}),
    });
    setView('detail');
  };

  // ── 피킹 오류 보고 ─────────────────────────────────────
  const handlePickError = async (reason: string) => {
    if (!currentLine || !selectedOrder) return;
    await pickLine(currentLine.id, { pickedQty: 0, errorReason: reason });
    const updatedLines = selectedOrder.lines.map((l) =>
      l.id === currentLine.id ? { ...l, pickedQty: 0, status: 'ERROR' as const, errorReason: reason } : l,
    );
    setSelectedOrder({
      ...selectedOrder,
      lines: updatedLines,
      errorLines: updatedLines.filter((l) => l.status === 'ERROR').length,
    });
    setView('detail');
  };

  // ════════════════════════════════════════════════════════
  // 대시보드 뷰
  // ════════════════════════════════════════════════════════
  if (showDashboard) {
    const s = stats ?? MOCK_STATS;
    // recharts 데이터 준비
    const chartData = s.workerStats.map((w) => ({
      name: w.name,
      lines: w.lines,
      errors: w.errors,
    }));
    const barColors = ['#388BFD', 'var(--accent-green)', 'var(--accent-orange)', 'var(--accent-red)', 'var(--accent-purple)'];

    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: COLORS.bg, color: 'var(--text-primary)' }}>
        {/* 헤더 */}
        <header
          className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <button onClick={() => setShowDashboard(false)} className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <BarChart3 size={20} className="text-blue-400" />
          <h1 className="text-lg font-bold">피킹 대시보드</h1>
          <span className="ml-auto text-xs text-gray-500">최근 {s.days}일</span>
        </header>

        <div className="flex-1 space-y-4 p-4">
          {/* KPI 카드 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              topColor="#388BFD"
              icon={<Package size={20} className="text-blue-400" />}
              label="전체 주문"
              value={s.totalOrders}
            />
            <KpiCard
              topColor="var(--accent-green)"
              icon={<CheckCircle size={20} className="text-green-400" />}
              label="완료"
              value={s.completed}
            />
            <KpiCard
              topColor="var(--accent-orange)"
              icon={<Clock size={20} className="text-yellow-400" />}
              label="진행 중"
              value={s.inProgress}
            />
            <KpiCard
              topColor="var(--accent-red)"
              icon={<AlertTriangle size={20} className="text-red-400" />}
              label="오류율"
              value={Math.round(s.errorRate * 100) / 100}
              suffix="%"
            />
          </div>

          {/* 평균 피킹 시간 */}
          <div
            className="relative overflow-hidden rounded-lg p-4"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div className="h-[3px] absolute top-0 left-0 w-full" style={{ backgroundColor: 'var(--accent-purple)' }} />
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-purple-400 opacity-60" />
              <div>
                <div className="mb-1 text-sm text-gray-400">평균 피킹 시간</div>
                <div className="text-3xl font-bold text-gray-100">
                  {s.avgPickingTime}<span className="ml-1 text-sm text-gray-500">분</span>
                </div>
              </div>
            </div>
          </div>

          {/* 작업자별 생산성 바 차트 (recharts) */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
              <User size={16} className="text-blue-400" />
              작업자별 생산성
            </div>
            {chartData.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">데이터 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    axisLine={{ stroke: COLORS.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    axisLine={{ stroke: COLORS.border }}
                    tickLine={false}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(56,139,253,0.08)' }} />
                  <Bar dataKey="lines" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((_entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={barColors[idx % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 주문 상태 분포 바 */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div className="mb-3 text-sm font-medium text-gray-300">주문 상태 분포</div>
            <div className="flex h-4 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              {s.completed > 0 && (
                <div style={{ width: `${(s.completed / s.totalOrders) * 100}%`, backgroundColor: 'var(--accent-green)' }} />
              )}
              {s.inProgress > 0 && (
                <div style={{ width: `${(s.inProgress / s.totalOrders) * 100}%`, backgroundColor: '#388BFD' }} />
              )}
              {s.pending > 0 && (
                <div style={{ width: `${(s.pending / s.totalOrders) * 100}%`, backgroundColor: 'var(--text-muted)' }} />
              )}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} />완료 {s.completed}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#388BFD' }} />진행 {s.inProgress}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--text-muted)' }} />대기 {s.pending}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // 스캔 화면
  // ════════════════════════════════════════════════════════
  if (view === 'scan' && currentLine) {
    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: COLORS.bg, color: 'var(--text-primary)' }}>
        <header
          className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <button onClick={() => setView('detail')} className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <ScanBarcode size={20} className="text-blue-400" />
          <h1 className="text-lg font-bold">바코드 스캔</h1>
          <span
            className="ml-auto rounded px-2 py-0.5 text-xs font-mono"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            {currentLine.binCode}
          </span>
        </header>

        <div className="flex-1 space-y-4 p-4">
          {/* 아이템 정보 카드 */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Package size={14} />
              #{currentLine.lineNo} -- {currentLine.sku}
            </div>
            <div className="mt-1 text-xl font-bold text-gray-100">{currentLine.itemName}</div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                요청: <span className="font-bold text-gray-100">{currentLine.requestedQty}</span>
              </span>
              {currentLine.zone && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> 구역: {currentLine.zone}
                </span>
              )}
              {currentLine.expiryDate && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> 유효: {currentLine.expiryDate.split('T')[0]}
                </span>
              )}
            </div>
          </div>

          {/* 바코드 입력 */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <label className="mb-2 block text-sm font-medium text-gray-300">바코드 스캔 / 수동 입력</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => { setScanInput(e.target.value); setScanResult('idle'); }}
                placeholder="바코드를 스캔하세요"
                className="flex-1 rounded-lg px-4 py-3 text-lg text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-tertiary)', border: `1px solid ${COLORS.border}` }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              />
              <button
                onClick={handleScan}
                className="rounded-lg px-4 py-3 font-bold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#388BFD' }}
              >
                확인
              </button>
            </div>
            {scanResult === 'success' && (
              <div
                className="mt-3 flex items-center gap-2 rounded-lg p-3"
                style={{ backgroundColor: 'rgba(63,185,80,0.1)', color: 'var(--accent-green)' }}
              >
                <CheckCircle size={18} />
                바코드 일치 확인됨
              </div>
            )}
            {scanResult === 'fail' && (
              <div
                className="mt-3 flex items-center gap-2 rounded-lg p-3"
                style={{ backgroundColor: 'rgba(248,81,73,0.1)', color: 'var(--accent-red)' }}
              >
                <XCircle size={18} />
                바코드 불일치 -- 올바른 상품인지 확인하세요
              </div>
            )}
          </div>

          {/* 수량 입력 */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <label className="mb-2 block text-sm font-medium text-gray-300">피킹 수량</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPickedQty(Math.max(0, pickedQty - 1))}
                className="rounded-lg p-3 transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                value={pickedQty}
                onChange={(e) => setPickedQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 rounded-lg px-3 py-3 text-center text-2xl font-bold text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-tertiary)', border: `1px solid ${COLORS.border}` }}
              />
              <button
                onClick={() => setPickedQty(pickedQty + 1)}
                className="rounded-lg p-3 transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <Plus size={20} />
              </button>
              <span className="text-sm text-gray-500">/ {currentLine.requestedQty}</span>
            </div>
          </div>
        </div>

        {/* 하단 액션 */}
        <div
          className="sticky bottom-0 space-y-2 p-4"
          style={{ backgroundColor: COLORS.card, borderTop: `1px solid ${COLORS.border}` }}
        >
          <button
            onClick={handlePickComplete}
            className="w-full rounded-xl py-4 text-lg font-bold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-green)' }}
          >
            피킹 완료
          </button>
          <div className="flex gap-2">
            {['상품 없음', '파손', '기타 오류'].map((reason) => (
              <button
                key={reason}
                onClick={() => handlePickError(reason)}
                className="flex-1 rounded-xl py-3 text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'rgba(248,81,73,0.08)',
                  border: `1px solid rgba(248,81,73,0.3)`,
                  color: 'var(--accent-red)',
                }}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // 상세 화면
  // ════════════════════════════════════════════════════════
  if (view === 'detail' && selectedOrder) {
    const progress = selectedOrder.totalLines > 0
      ? Math.round(((selectedOrder.pickedLines + selectedOrder.errorLines) / selectedOrder.totalLines) * 100)
      : 0;
    const isActive = selectedOrder.status === 'IN_PROGRESS';
    const canStart = selectedOrder.status === 'ASSIGNED';
    const canAssign = selectedOrder.status === 'PENDING';
    const badge = statusBadgeStyle[selectedOrder.status] ?? statusBadgeStyle.PENDING;

    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: COLORS.bg, color: 'var(--text-primary)' }}>
        <header
          className="sticky top-0 z-10 px-4 py-3"
          style={{ backgroundColor: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); loadOrders(); }} className="text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-gray-100">{selectedOrder.orderNo}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{selectedOrder.customerName}</span>
                <span className="opacity-40">/</span>
                <span>{selectedOrder.policy}</span>
              </div>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {statusLabel[selectedOrder.status] ?? selectedOrder.status}
            </span>
          </div>
          {/* 진행률 바 */}
          <div className="mt-3 flex items-center gap-2">
            <ProgressBar percent={progress} />
            <span className="text-xs font-medium text-gray-400">{progress}%</span>
          </div>
        </header>

        {/* 액션 버튼 */}
        {(canAssign || canStart) && (
          <div className="p-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            {canAssign && (
              <button
                onClick={handleAssign}
                className="w-full rounded-xl py-3 font-bold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-orange)' }}
              >
                내 작업으로 배정
              </button>
            )}
            {canStart && (
              <button
                onClick={handleStart}
                className="w-full rounded-xl py-3 font-bold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#388BFD' }}
              >
                피킹 시작
              </button>
            )}
          </div>
        )}

        {/* 라인 목록 */}
        <div className="flex-1 space-y-3 p-4">
          {selectedOrder.lines.map((line) => {
            const isDone = line.status !== 'PENDING';
            const borderColor = isDone
              ? line.status === 'ERROR' ? 'rgba(248,81,73,0.3)' : 'rgba(63,185,80,0.3)'
              : isActive ? COLORS.border : 'var(--bg-tertiary)';
            const bgColor = isDone
              ? line.status === 'ERROR' ? 'rgba(248,81,73,0.05)' : 'rgba(63,185,80,0.05)'
              : COLORS.card;

            return (
              <button
                key={line.id}
                onClick={() => isActive && !isDone ? openScan(line) : undefined}
                disabled={!isActive || isDone}
                className="w-full rounded-lg p-4 text-left transition-all"
                style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-mono"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {line.pickSequence}
                      </span>
                      <span className="font-medium text-gray-100">{line.itemName}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <Package size={12} />
                      {line.sku}
                      <span className="mx-1 opacity-40">/</span>
                      <MapPin size={12} />
                      {line.binCode}
                    </div>
                  </div>
                  <div className="text-right">
                    {isDone ? (
                      <span
                        className="text-sm font-bold"
                        style={{ color: line.status === 'ERROR' ? 'var(--accent-red)' : 'var(--accent-green)' }}
                      >
                        {lineStatusLabel[line.status]}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-gray-100">{line.requestedQty}</span>
                    )}
                    {line.scanVerified && (
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-xs" style={{ color: 'var(--accent-green)' }}>
                        <CheckCircle size={10} />
                        스캔 확인됨
                      </div>
                    )}
                    {line.errorReason && (
                      <div className="mt-0.5 text-xs" style={{ color: 'var(--accent-red)' }}>{line.errorReason}</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 완료 상태 배너 */}
        {selectedOrder.status === 'COMPLETED' && (
          <div
            className="sticky bottom-0 p-4 text-center"
            style={{ backgroundColor: 'rgba(63,185,80,0.1)', borderTop: `1px solid rgba(63,185,80,0.3)` }}
          >
            <span className="flex items-center justify-center gap-2 text-lg font-bold" style={{ color: 'var(--accent-green)' }}>
              <CheckCircle size={20} />
              피킹 완료
            </span>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // 목록 화면 (카드 뷰 / 리스트 뷰)
  // ════════════════════════════════════════════════════════
  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: COLORS.bg, color: 'var(--text-primary)' }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 px-4 py-3"
        style={{ backgroundColor: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-3">
          <ScanBarcode size={20} className="text-blue-400" />
          <h1 className="text-lg font-bold">모바일 피킹</h1>

          {/* 뷰 토글 + 대시보드 버튼 */}
          <div className="ml-auto flex items-center gap-2">
            {/* 카드/리스트 토글 */}
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <button
                onClick={() => changeListMode('card')}
                className="p-1.5 transition-colors"
                style={{
                  backgroundColor: listMode === 'card' ? '#388BFD' : 'transparent',
                  color: listMode === 'card' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
                title="카드 뷰"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => changeListMode('table')}
                className="p-1.5 transition-colors"
                style={{
                  backgroundColor: listMode === 'table' ? '#388BFD' : 'transparent',
                  color: listMode === 'table' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
                title="리스트 뷰"
              >
                <List size={16} />
              </button>
            </div>
            <button
              onClick={() => setShowDashboard(true)}
              className="rounded-lg p-1.5 transition-colors"
              style={{ border: `1px solid ${COLORS.border}`, color: 'var(--text-secondary)' }}
              title="대시보드"
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>

        {/* 상태 필터 */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '전체' },
            { key: 'PENDING', label: '대기' },
            { key: 'ASSIGNED', label: '배정됨' },
            { key: 'IN_PROGRESS', label: '진행 중' },
            { key: 'COMPLETED', label: '완료' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: statusFilter === key ? '#388BFD' : 'var(--bg-tertiary)',
                color: statusFilter === key ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* KPI 요약 카드 */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 p-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <KpiCard
            topColor="var(--accent-orange)"
            icon={<Clock size={16} className="text-yellow-400" />}
            label="미완료"
            value={stats.pending + stats.inProgress}
          />
          <KpiCard
            topColor="var(--accent-green)"
            icon={<CheckCircle size={16} className="text-green-400" />}
            label="완료"
            value={stats.completed}
          />
          <KpiCard
            topColor="var(--accent-red)"
            icon={<AlertTriangle size={16} className="text-red-400" />}
            label="오류율"
            value={Math.round(stats.errorRate * 100) / 100}
            suffix="%"
          />
        </div>
      )}

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 p-4">
        {loading && <p className="py-8 text-center text-gray-500">로딩 중...</p>}
        {!loading && filteredOrders.length === 0 && <p className="py-8 text-center text-gray-500">주문이 없습니다</p>}

        {/* ── 카드 뷰 ────────────────────────────────────── */}
        {!loading && filteredOrders.length > 0 && listMode === 'card' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredOrders.map((order) => {
              const prog = order.totalLines > 0
                ? Math.round(((order.pickedLines + order.errorLines) / order.totalLines) * 100)
                : 0;
              const badge = statusBadgeStyle[order.status] ?? statusBadgeStyle.PENDING;

              return (
                <div
                  key={order.id}
                  className="rounded-lg transition-all hover:brightness-110"
                  style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
                >
                  {/* 카드 상단 */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-100">{order.orderNo}</span>
                          <UrgencyBadge priority={order.priority} />
                        </div>
                        <div className="mt-1 text-sm text-gray-500">{order.customerName ?? '--'}</div>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {statusLabel[order.status] ?? order.status}
                      </span>
                    </div>

                    {/* SKU / 수량 / 위치 정보 */}
                    <div className="mt-3 space-y-1.5 text-xs text-gray-400">
                      {order.lines.slice(0, 2).map((line) => (
                        <div key={line.id} className="flex items-center gap-2">
                          <Package size={12} className="flex-shrink-0" />
                          <span className="font-mono text-gray-300">{line.sku}</span>
                          <span className="opacity-40">x{line.requestedQty}</span>
                          <span className="ml-auto flex items-center gap-1">
                            <MapPin size={10} />
                            {line.binCode}
                          </span>
                        </div>
                      ))}
                      {order.lines.length > 2 && (
                        <div className="text-gray-600">+{order.lines.length - 2}건 더</div>
                      )}
                    </div>

                    {/* 작업자 / 정책 */}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                      {order.assigneeName && (
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {order.assigneeName}
                        </span>
                      )}
                      <span className="rounded px-1.5 py-0.5 font-mono" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        {order.policy}
                      </span>
                    </div>

                    {/* 진행률 바 */}
                    <div className="mt-3 flex items-center gap-2">
                      <ProgressBar percent={prog} height="h-1.5" />
                      <span className="text-xs text-gray-500">{order.pickedLines}/{order.totalLines}</span>
                    </div>
                  </div>

                  {/* 카드 하단 버튼 영역 */}
                  <div
                    className="flex gap-2 px-4 py-3"
                    style={{ borderTop: `1px solid ${COLORS.border}` }}
                  >
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => openOrder(order)}
                        className="flex-1 rounded-lg py-2 text-xs font-bold text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: 'var(--accent-orange)' }}
                      >
                        시작
                      </button>
                    )}
                    {(order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS') && (
                      <button
                        onClick={() => openOrder(order)}
                        className="flex-1 rounded-lg py-2 text-xs font-bold text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: '#388BFD' }}
                      >
                        {order.status === 'ASSIGNED' ? '시작' : '계속'}
                      </button>
                    )}
                    {order.status === 'COMPLETED' && (
                      <button
                        onClick={() => openOrder(order)}
                        className="flex-1 rounded-lg py-2 text-xs font-bold transition-colors hover:opacity-80"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-green)' }}
                      >
                        완료 확인
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 리스트(테이블) 뷰 ──────────────────────────── */}
        {!loading && filteredOrders.length > 0 && listMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  {['작업번호', 'SKU', '수량', '위치', '긴급도', '상태', '액션'].map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2.5 text-left text-xs font-medium text-gray-400"
                      style={{ borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const badge = statusBadgeStyle[order.status] ?? statusBadgeStyle.PENDING;
                  const firstLine = order.lines[0];
                  const isExpanded = detailPanelOrder?.id === order.id;

                  return (
                    <>
                      <tr
                        key={order.id}
                        onClick={() => setDetailPanelOrder(isExpanded ? null : order)}
                        className="cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isExpanded ? 'var(--bg-hover)' : COLORS.card,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) {
                            (e.currentTarget as HTMLTableRowElement).style.backgroundColor = COLORS.card;
                          }
                        }}
                      >
                        <td className="px-3 py-3 font-medium text-gray-100" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          {order.orderNo}
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-300" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          {firstLine?.sku ?? '--'}
                          {order.lines.length > 1 && (
                            <span className="ml-1 text-gray-600 text-xs">+{order.lines.length - 1}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-300" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          {order.totalLines}건
                        </td>
                        <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <span className="flex items-center gap-1 text-gray-400">
                            <MapPin size={12} />
                            {firstLine?.binCode ?? '--'}
                          </span>
                        </td>
                        <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <UrgencyBadge priority={order.priority} />
                        </td>
                        <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                          >
                            {statusLabel[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); openOrder(order); }}
                            className="rounded px-2.5 py-1 text-xs font-bold text-white transition-colors hover:opacity-90"
                            style={{ backgroundColor: '#388BFD' }}
                          >
                            열기
                          </button>
                        </td>
                      </tr>

                      {/* 확장 상세 패널 */}
                      {isExpanded && (
                        <tr key={`${order.id}-detail`}>
                          <td
                            colSpan={7}
                            className="px-4 py-3"
                            style={{ backgroundColor: 'var(--bg-hover)', borderBottom: `1px solid ${COLORS.border}` }}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                {order.customerName && (
                                  <span>고객: <span className="text-gray-200">{order.customerName}</span></span>
                                )}
                                {order.assigneeName && (
                                  <span className="flex items-center gap-1">
                                    <User size={12} />
                                    {order.assigneeName}
                                  </span>
                                )}
                                <span className="font-mono">{order.policy}</span>
                              </div>
                              {/* 라인 상세 */}
                              <div className="space-y-1.5">
                                {order.lines.map((line) => (
                                  <div
                                    key={line.id}
                                    className="flex items-center gap-3 rounded px-3 py-2 text-xs"
                                    style={{ backgroundColor: COLORS.card }}
                                  >
                                    <span className="font-mono text-gray-500">#{line.lineNo}</span>
                                    <span className="font-medium text-gray-200">{line.itemName}</span>
                                    <span className="text-gray-500">{line.sku}</span>
                                    <span className="ml-auto flex items-center gap-1 text-gray-400">
                                      <MapPin size={10} />{line.binCode}
                                    </span>
                                    <span className="text-gray-300">x{line.requestedQty}</span>
                                  </div>
                                ))}
                              </div>
                              {/* 진행률 */}
                              <div className="flex items-center gap-2 pt-1">
                                <ProgressBar
                                  percent={order.totalLines > 0 ? Math.round(((order.pickedLines + order.errorLines) / order.totalLines) * 100) : 0}
                                  height="h-1.5"
                                />
                                <span className="text-xs text-gray-500">{order.pickedLines}/{order.totalLines}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
