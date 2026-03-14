/**
 * 모바일 피킹 앱 — PDA/태블릿 최적화 UI
 * 화면 흐름: 작업 목록 → 작업 상세 → 바코드 스캔/피킹 → 완료
 */
import { useState, useEffect, useCallback } from 'react';
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

// ── 컴포넌트 ──────────────────────────────────────────

type MobileView = 'list' | 'detail' | 'scan';

const DEMO_WORKER = { id: 'w-1', name: '김작업' };
const SITE_ID = 'site-demo';

const statusLabel: Record<string, string> = {
  PENDING: '대기',
  ASSIGNED: '배정됨',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
};
const statusColor: Record<string, string> = {
  PENDING: 'bg-gray-600',
  ASSIGNED: 'bg-yellow-600',
  IN_PROGRESS: 'bg-blue-600',
  COMPLETED: 'bg-green-600',
};
const lineStatusLabel: Record<string, string> = {
  PENDING: '대기',
  PICKED: '완료',
  SHORT: '부족',
  ERROR: '오류',
};

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

  // 주문 상세로 이동
  const openOrder = async (order: PickingOrderData) => {
    try {
      const detail = await getPickingOrder(order.id);
      setSelectedOrder(detail ?? order);
    } catch {
      setSelectedOrder(order);
    }
    setView('detail');
  };

  // 배정 받기
  const handleAssign = async () => {
    if (!selectedOrder) return;
    const updated = await assignOrder(selectedOrder.id, DEMO_WORKER.id, DEMO_WORKER.name);
    if (updated) {
      setSelectedOrder(updated);
    } else {
      setSelectedOrder({ ...selectedOrder, status: 'ASSIGNED', assigneeId: DEMO_WORKER.id, assigneeName: DEMO_WORKER.name });
    }
  };

  // 피킹 시작
  const handleStart = async () => {
    if (!selectedOrder) return;
    await startPicking(selectedOrder.id);
    setSelectedOrder({ ...selectedOrder, status: 'IN_PROGRESS', startedAt: new Date().toISOString() });
  };

  // 스캔 화면 열기
  const openScan = (line: PickingLineData) => {
    setCurrentLine(line);
    setScanInput('');
    setScanResult('idle');
    setPickedQty(line.requestedQty);
    setView('scan');
  };

  // 바코드 스캔 확인
  const handleScan = () => {
    if (!currentLine) return;
    if (scanInput === currentLine.barcode) {
      setScanResult('success');
    } else {
      setScanResult('fail');
    }
  };

  // 피킹 완료
  const handlePickComplete = async () => {
    if (!currentLine || !selectedOrder) return;
    const result = await pickLine(currentLine.id, {
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

  // 피킹 오류 보고
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

  // ── 대시보드 뷰 ────────────────────────────────────────
  if (showDashboard) {
    const s = stats ?? MOCK_STATS;
    return (
      <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 py-3">
          <button onClick={() => setShowDashboard(false)} className="text-gray-400 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold">피킹 대시보드</h1>
          <span className="ml-auto text-xs text-gray-500">최근 {s.days}일</span>
        </header>

        <div className="flex-1 space-y-4 p-4">
          {/* KPI 카드 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{s.totalOrders}</div>
              <div className="text-xs text-gray-500">전체 주문</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{s.completed}</div>
              <div className="text-xs text-gray-500">완료</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{s.inProgress}</div>
              <div className="text-xs text-gray-500">진행 중</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{s.errorRate}%</div>
              <div className="text-xs text-gray-500">오류율</div>
            </div>
          </div>

          {/* 처리 시간 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-2 text-sm text-gray-400">평균 피킹 시간</div>
            <div className="text-3xl font-bold text-cyan-400">{s.avgPickingTime}<span className="ml-1 text-sm text-gray-500">분</span></div>
          </div>

          {/* 작업자별 생산성 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-3 text-sm font-medium text-gray-300">작업자별 생산성</div>
            {s.workerStats.length === 0 && <p className="text-sm text-gray-500">데이터 없음</p>}
            <div className="space-y-3">
              {s.workerStats.map((w) => (
                <div key={w.workerId} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-gray-500">완료 {w.completed}건 / 라인 {w.lines}건</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">{w.lines}라인</div>
                    {w.errors > 0 && <div className="text-xs text-red-400">오류 {w.errors}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 주문 상태 비율 바 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-3 text-sm font-medium text-gray-300">주문 상태 분포</div>
            <div className="flex h-4 overflow-hidden rounded-full">
              {s.completed > 0 && <div className="bg-green-600" style={{ width: `${(s.completed / s.totalOrders) * 100}%` }} />}
              {s.inProgress > 0 && <div className="bg-blue-600" style={{ width: `${(s.inProgress / s.totalOrders) * 100}%` }} />}
              {s.pending > 0 && <div className="bg-gray-600" style={{ width: `${(s.pending / s.totalOrders) * 100}%` }} />}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-600" />완료 {s.completed}</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-600" />진행 {s.inProgress}</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-600" />대기 {s.pending}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 스캔 화면 ──────────────────────────────────────────
  if (view === 'scan' && currentLine) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 py-3">
          <button onClick={() => setView('detail')} className="text-gray-400 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold">바코드 스캔</h1>
          <span className="ml-auto rounded bg-gray-800 px-2 py-0.5 text-xs">{currentLine.binCode}</span>
        </header>

        <div className="flex-1 space-y-6 p-4">
          {/* 아이템 정보 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-sm text-gray-500">#{currentLine.lineNo} — {currentLine.sku}</div>
            <div className="mt-1 text-xl font-bold">{currentLine.itemName}</div>
            <div className="mt-2 flex gap-4 text-sm text-gray-400">
              <span>요청: <span className="font-bold text-white">{currentLine.requestedQty}</span></span>
              {currentLine.zone && <span>구역: {currentLine.zone}</span>}
              {currentLine.expiryDate && <span>유효: {currentLine.expiryDate.split('T')[0]}</span>}
            </div>
          </div>

          {/* 바코드 입력 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-300">바코드 스캔 / 수동 입력</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => { setScanInput(e.target.value); setScanResult('idle'); }}
                placeholder="바코드를 스캔하세요"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              />
              <button
                onClick={handleScan}
                className="rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
              >
                확인
              </button>
            </div>
            {scanResult === 'success' && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-900/30 p-3 text-green-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                바코드 일치 확인됨
              </div>
            )}
            {scanResult === 'fail' && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-900/30 p-3 text-red-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                바코드 불일치 — 올바른 상품인지 확인하세요
              </div>
            )}
          </div>

          {/* 수량 입력 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-300">피킹 수량</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setPickedQty(Math.max(0, pickedQty - 1))} className="rounded-lg bg-gray-800 px-4 py-3 text-xl font-bold hover:bg-gray-700">-</button>
              <input
                type="number"
                value={pickedQty}
                onChange={(e) => setPickedQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-center text-2xl font-bold focus:border-blue-500 focus:outline-none"
              />
              <button onClick={() => setPickedQty(pickedQty + 1)} className="rounded-lg bg-gray-800 px-4 py-3 text-xl font-bold hover:bg-gray-700">+</button>
              <span className="text-sm text-gray-500">/ {currentLine.requestedQty}</span>
            </div>
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="sticky bottom-0 border-t border-gray-800 bg-gray-900 p-4 space-y-2">
          <button
            onClick={handlePickComplete}
            className="w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700"
          >
            피킹 완료
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handlePickError('상품 없음')}
              className="flex-1 rounded-xl border border-red-700/50 bg-red-900/20 py-3 text-sm text-red-400 hover:bg-red-900/40"
            >
              상품 없음
            </button>
            <button
              onClick={() => handlePickError('파손')}
              className="flex-1 rounded-xl border border-red-700/50 bg-red-900/20 py-3 text-sm text-red-400 hover:bg-red-900/40"
            >
              파손
            </button>
            <button
              onClick={() => handlePickError('기타 오류')}
              className="flex-1 rounded-xl border border-red-700/50 bg-red-900/20 py-3 text-sm text-red-400 hover:bg-red-900/40"
            >
              기타 오류
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 상세 화면 ──────────────────────────────────────────
  if (view === 'detail' && selectedOrder) {
    const progress = selectedOrder.totalLines > 0
      ? Math.round(((selectedOrder.pickedLines + selectedOrder.errorLines) / selectedOrder.totalLines) * 100)
      : 0;
    const isActive = selectedOrder.status === 'IN_PROGRESS';
    const canStart = selectedOrder.status === 'ASSIGNED';
    const canAssign = selectedOrder.status === 'PENDING';

    return (
      <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); loadOrders(); }} className="text-gray-400 hover:text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1">
              <h1 className="font-bold">{selectedOrder.orderNo}</h1>
              <div className="text-xs text-gray-500">{selectedOrder.customerName} / {selectedOrder.policy}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${statusColor[selectedOrder.status] ?? 'bg-gray-600'}`}>
              {statusLabel[selectedOrder.status] ?? selectedOrder.status}
            </span>
          </div>
          {/* 진행률 바 */}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-400">{progress}%</span>
          </div>
        </header>

        {/* 액션 버튼 */}
        {(canAssign || canStart) && (
          <div className="border-b border-gray-800 bg-gray-900/50 p-3">
            {canAssign && (
              <button onClick={handleAssign} className="w-full rounded-xl bg-yellow-600 py-3 font-bold text-white hover:bg-yellow-700">
                내 작업으로 배정
              </button>
            )}
            {canStart && (
              <button onClick={handleStart} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700">
                피킹 시작
              </button>
            )}
          </div>
        )}

        {/* 라인 목록 */}
        <div className="flex-1 p-4 space-y-3">
          {selectedOrder.lines.map((line) => {
            const isDone = line.status !== 'PENDING';
            return (
              <button
                key={line.id}
                onClick={() => isActive && !isDone ? openScan(line) : undefined}
                disabled={!isActive || isDone}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  isDone
                    ? line.status === 'ERROR' ? 'border-red-800/50 bg-red-900/10' : 'border-green-800/50 bg-green-900/10'
                    : isActive ? 'border-gray-700 bg-gray-900 hover:border-blue-600' : 'border-gray-800 bg-gray-900/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs font-mono">{line.pickSequence}</span>
                      <span className="font-medium">{line.itemName}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">{line.sku} / {line.binCode}</div>
                  </div>
                  <div className="text-right">
                    {isDone ? (
                      <span className={`text-sm font-bold ${line.status === 'ERROR' ? 'text-red-400' : 'text-green-400'}`}>
                        {lineStatusLabel[line.status]}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-white">{line.requestedQty}</span>
                    )}
                    {line.scanVerified && (
                      <div className="mt-0.5 text-xs text-green-500">스캔 확인됨</div>
                    )}
                    {line.errorReason && (
                      <div className="mt-0.5 text-xs text-red-400">{line.errorReason}</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 완료 상태 배너 */}
        {selectedOrder.status === 'COMPLETED' && (
          <div className="sticky bottom-0 border-t border-green-800 bg-green-900/30 p-4 text-center">
            <span className="text-lg font-bold text-green-400">피킹 완료</span>
          </div>
        )}
      </div>
    );
  }

  // ── 목록 화면 (기본) ──────────────────────────────────
  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold">모바일 피킹</h1>
          <button
            onClick={() => setShowDashboard(true)}
            className="ml-auto rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white"
          >
            대시보드
          </button>
        </div>

        {/* 상태 필터 */}
        <div className="mt-3 flex gap-2 overflow-x-auto">
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
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* 요약 카드 */}
      {stats && (
        <div className="flex gap-2 border-b border-gray-800 bg-gray-900/50 p-3">
          <div className="flex-1 rounded-lg bg-gray-800/50 p-2 text-center">
            <div className="text-lg font-bold text-yellow-400">{stats.pending + stats.inProgress}</div>
            <div className="text-[10px] text-gray-500">미완료</div>
          </div>
          <div className="flex-1 rounded-lg bg-gray-800/50 p-2 text-center">
            <div className="text-lg font-bold text-green-400">{stats.completed}</div>
            <div className="text-[10px] text-gray-500">완료</div>
          </div>
          <div className="flex-1 rounded-lg bg-gray-800/50 p-2 text-center">
            <div className="text-lg font-bold text-red-400">{stats.errorRate}%</div>
            <div className="text-[10px] text-gray-500">오류율</div>
          </div>
        </div>
      )}

      {/* 주문 목록 */}
      <div className="flex-1 p-4 space-y-3">
        {loading && <p className="py-8 text-center text-gray-500">로딩 중...</p>}
        {!loading && filteredOrders.length === 0 && <p className="py-8 text-center text-gray-500">주문이 없습니다</p>}
        {filteredOrders.map((order) => {
          const prog = order.totalLines > 0 ? Math.round(((order.pickedLines + order.errorLines) / order.totalLines) * 100) : 0;
          return (
            <button
              key={order.id}
              onClick={() => openOrder(order)}
              className="w-full rounded-xl border border-gray-800 bg-gray-900 p-4 text-left transition-colors hover:border-gray-600"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{order.orderNo}</span>
                    {order.priority <= 2 && <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] font-bold text-red-400">긴급</span>}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{order.customerName ?? '—'}</div>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${statusColor[order.status] ?? 'bg-gray-600'}`}>
                    {statusLabel[order.status] ?? order.status}
                  </span>
                  <div className="mt-1 text-xs text-gray-500">{order.policy}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full rounded-full bg-green-500" style={{ width: `${prog}%` }} />
                </div>
                <span className="text-xs text-gray-500">{order.pickedLines}/{order.totalLines}</span>
              </div>
              {order.assigneeName && (
                <div className="mt-2 text-xs text-gray-500">작업자: {order.assigneeName}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
