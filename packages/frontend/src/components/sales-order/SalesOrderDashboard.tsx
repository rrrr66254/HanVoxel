/**
 * HanVoxel — 수주 관리 대시보드 (다크 테마)
 *
 * 기능:
 *   - 수주 목록 (상태별 필터 + 납기 D-day)
 *   - 수주 등록 모달
 *   - MRP 소요 분석 실행 + 결과 표시
 *   - 자동 발주 연동
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  ArrowLeft,
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  X,
  Loader2,
  ShoppingCart,
  Save,
  Edit3,
} from 'lucide-react';
import type { SalesOrder, SalesOrderItem, MrpResult } from '../../api/sales-order-api';
import { MOCK_SITE_ID } from '../../constants/mock-ids';

// --- 디자인 토큰 ---
const C = {
  bg: '#0D1117', card: '#161B22', border: '#30363D',
  text: '#C9D1D9', textMuted: '#8B949E', accent: '#58A6FF',
  green: '#10B981', yellow: '#F59E0B', red: '#EF4444', orange: '#F97316',
  purple: '#8B5CF6',
} as const;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: C.accent },
  MRP_CHECKED: { label: 'MRP완료', color: C.purple },
  CONFIRMED: { label: '확정', color: C.green },
  IN_PRODUCTION: { label: '생산중', color: C.yellow },
  SHIPPED: { label: '출하완료', color: C.green },
};

// --- Mock 데이터 ---
const MOCK_ORDERS: SalesOrder[] = [
  {
    id: 'so-1', siteId: MOCK_SITE_ID, orderNo: 'SO-20260317-0001',
    customerId: null, customerName: '현대모비스',
    status: 'RECEIVED', orderDate: '2026-03-17',
    deliveryDeadline: '2026-03-25',
    items: [
      { productSku: 'SKU-2891', productName: '가솔린 엔진 밸브', qty: 100, unitPrice: 15000 },
      { productSku: 'SKU-4501', productName: '리튬이온 배터리 셀', qty: 200, unitPrice: 48000 },
    ],
    notes: '긴급 발주', createdAt: '2026-03-17T09:00:00Z', updatedAt: '2026-03-17T09:00:00Z',
  },
  {
    id: 'so-2', siteId: MOCK_SITE_ID, orderNo: 'SO-20260315-0001',
    customerId: null, customerName: 'BMW Munich',
    status: 'MRP_CHECKED', orderDate: '2026-03-15',
    deliveryDeadline: '2026-03-28',
    items: [
      { productSku: 'SKU-1120', productName: '양극재 분말', qty: 500, unitPrice: 95000 },
    ],
    notes: null, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-16T14:00:00Z',
    mrpResults: [{ id: 'mrp-1', status: 'PENDING' }, { id: 'mrp-2', status: 'CHECKED_OK' }],
  },
  {
    id: 'so-3', siteId: MOCK_SITE_ID, orderNo: 'SO-20260310-0001',
    customerId: null, customerName: '롯데케미칼',
    status: 'SHIPPED', orderDate: '2026-03-10',
    deliveryDeadline: '2026-03-14',
    items: [
      { productSku: 'SKU-7200', productName: '냉연강판 코일', qty: 50, unitPrice: 350000 },
    ],
    notes: null, createdAt: '2026-03-10T09:00:00Z', updatedAt: '2026-03-14T10:00:00Z',
  },
];

const MOCK_MRP_RESULTS: MrpResult[] = [
  { id: 'mrp-1', salesOrderId: 'so-2', materialSku: 'MAT-LI-001', materialName: '리튬 원료 (Li₂CO₃)', requiredQty: 250, currentStock: 80, shortageQty: 170, reorderTriggered: false, checkedBy: null, checkedAt: null, status: 'PENDING' },
  { id: 'mrp-2', salesOrderId: 'so-2', materialSku: 'MAT-NI-001', materialName: '니켈 분말 (Ni)', requiredQty: 500, currentStock: 600, shortageQty: 0, reorderTriggered: false, checkedBy: null, checkedAt: null, status: 'CHECKED_OK' },
  { id: 'mrp-3', salesOrderId: 'so-2', materialSku: 'MAT-CO-001', materialName: '코발트 분말 (Co)', requiredQty: 100, currentStock: 30, shortageQty: 70, reorderTriggered: false, checkedBy: null, checkedAt: null, status: 'PENDING' },
];

// MOQ 데이터 (실제로는 DB에서 조회)
const MOCK_MOQ: Record<string, { moq: number; unitName: string; vendorName: string; leadTimeDays: number }> = {
  'MAT-LI-001': { moq: 100, unitName: 'kg', vendorName: '포스코케미칼', leadTimeDays: 14 },
  'MAT-NI-001': { moq: 200, unitName: 'kg', vendorName: 'LG화학', leadTimeDays: 7 },
  'MAT-CO-001': { moq: 50, unitName: 'kg', vendorName: '삼성SDI', leadTimeDays: 10 },
};

interface SalesOrderDashboardProps {
  onBack: () => void;
}

export function SalesOrderDashboard({ onBack }: SalesOrderDashboardProps) {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);
  const [mrpResults, setMrpResults] = useState<MrpResult[]>([]);
  const [mrpLoading, setMrpLoading] = useState(false);
  const [mrpViewMode, setMrpViewMode] = useState<'analysis' | 'results'>('analysis');
  // 선택 발주용 체크박스 상태
  const [selectedForReorder, setSelectedForReorder] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const { getSalesOrders } = await import('../../api/sales-order-api');
        const res = await getSalesOrders(MOCK_SITE_ID, statusFilter || undefined);
        if (res.orders.length > 0) { setOrders(res.orders); return; }
      } catch { /* mock */ }
      let filtered = MOCK_ORDERS;
      if (statusFilter) filtered = filtered.filter((o) => o.status === statusFilter);
      setOrders(filtered);
    })();
  }, [statusFilter]);

  const getDDay = (d: string | null) => {
    if (!d) return '';
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff === 0) return 'D-Day';
    return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  };

  // MRP 분석 실행 (새로 분석 시작)
  const handleRunMrp = useCallback(async (order: SalesOrder) => {
    setSelectedOrder(order);
    setMrpViewMode('analysis');
    setMrpLoading(true);
    setSelectedForReorder(new Set());
    try {
      const { runMrp } = await import('../../api/sales-order-api');
      const res = await runMrp(order.id);
      setMrpResults(res.results);
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: 'MRP_CHECKED' } : o));
    } catch {
      setMrpResults(MOCK_MRP_RESULTS);
    }
    setMrpLoading(false);
  }, []);

  // MRP 결과 조회 (기존 결과 확인)
  const handleViewMrp = useCallback(async (order: SalesOrder) => {
    setSelectedOrder(order);
    setMrpViewMode('results');
    setMrpLoading(true);
    setSelectedForReorder(new Set());
    try {
      const { getMrpResults } = await import('../../api/sales-order-api');
      const res = await getMrpResults(order.id);
      setMrpResults(res);
    } catch {
      setMrpResults(MOCK_MRP_RESULTS);
    }
    setMrpLoading(false);
  }, []);

  // 선택한 자재만 발주 처리
  const handleTriggerSelectedReorders = useCallback(async () => {
    if (!selectedOrder || selectedForReorder.size === 0) return;
    try {
      const { triggerReorders } = await import('../../api/sales-order-api');
      await triggerReorders(selectedOrder.id);
    } catch { /* mock */ }
    setMrpResults((prev) => prev.map((r) =>
      selectedForReorder.has(r.id) && r.shortageQty > 0
        ? { ...r, reorderTriggered: true, status: 'REORDERED' }
        : r
    ));
    setSelectedForReorder(new Set());
  }, [selectedOrder, selectedForReorder]);

  // 전체 선택/해제
  const shortageItems = mrpResults.filter((r) => r.shortageQty > 0 && !r.reorderTriggered);
  const toggleSelectAll = useCallback(() => {
    if (selectedForReorder.size === shortageItems.length) {
      setSelectedForReorder(new Set());
    } else {
      setSelectedForReorder(new Set(shortageItems.map((r) => r.id)));
    }
  }, [shortageItems, selectedForReorder]);

  const toggleReorderItem = useCallback((id: string) => {
    setSelectedForReorder((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 수주 수정 저장
  const handleEditSave = useCallback(async (updated: SalesOrder) => {
    try {
      const { updateSalesOrder } = await import('../../api/sales-order-api');
      const saved = await updateSalesOrder(updated.id, {
        customerName: updated.customerName ?? undefined,
        deliveryDeadline: updated.deliveryDeadline ?? undefined,
        status: updated.status,
        notes: updated.notes ?? undefined,
        items: updated.items as SalesOrderItem[],
      });
      setOrders((prev) => prev.map((o) => o.id === saved.id ? saved : o));
      console.log(`%c[HanVoxel] 수주 수정 성공 (${saved.orderNo})`, 'color: #10B981;');
    } catch (err) {
      console.warn(`%c[HanVoxel] 수주 수정 API 실패 — 로컬에만 반영`, 'color: #F59E0B; font-weight: bold;');
      console.error('[HanVoxel] 수정 에러:', err);
      // API 실패 시에도 로컬 반영
      setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    }
    setEditOrder(null);
  }, []);

  // MRP 패널 (분석 / 결과 분리)
  if (selectedOrder && !showCreate) {
    const isAnalysisMode = mrpViewMode === 'analysis';
    return (
      <div style={{ padding: '24px 28px', background: C.bg, minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setSelectedOrder(null); setMrpResults([]); }} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <Package size={20} style={{ color: C.purple }} />
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
            {isAnalysisMode ? 'MRP 소요 분석' : 'MRP 분석 결과'} — {selectedOrder.orderNo}
          </h2>
          <span style={{ fontSize: 12, color: C.textMuted }}>{selectedOrder.customerName}</span>
        </div>

        {/* 모드 탭 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          <button
            onClick={() => setMrpViewMode('analysis')}
            style={{
              padding: '6px 16px', fontSize: 12, borderRadius: 6,
              border: `1px solid ${mrpViewMode === 'analysis' ? C.purple : C.border}`,
              background: mrpViewMode === 'analysis' ? `${C.purple}22` : 'transparent',
              color: mrpViewMode === 'analysis' ? C.purple : C.textMuted, cursor: 'pointer', fontWeight: 600,
            }}
          >
            <Play size={11} style={{ marginRight: 4 }} />MRP 분석
          </button>
          <button
            onClick={() => setMrpViewMode('results')}
            style={{
              padding: '6px 16px', fontSize: 12, borderRadius: 6,
              border: `1px solid ${mrpViewMode === 'results' ? C.accent : C.border}`,
              background: mrpViewMode === 'results' ? `${C.accent}22` : 'transparent',
              color: mrpViewMode === 'results' ? C.accent : C.textMuted, cursor: 'pointer', fontWeight: 600,
            }}
          >
            <Package size={11} style={{ marginRight: 4 }} />발주 현황
          </button>
        </div>

        {/* 수주 요약 */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div><span style={{ fontSize: 11, color: C.textMuted }}>납기일</span><div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{selectedOrder.deliveryDeadline ?? '—'}</div></div>
            <div><span style={{ fontSize: 11, color: C.textMuted }}>품목 수</span><div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{selectedOrder.items.length}건</div></div>
            <div><span style={{ fontSize: 11, color: C.textMuted }}>총 자재</span><div style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>{mrpResults.length}종</div></div>
            <div><span style={{ fontSize: 11, color: C.textMuted }}>부족 자재</span><div style={{ fontSize: 14, fontWeight: 600, color: mrpResults.filter((r) => r.shortageQty > 0).length > 0 ? C.red : C.green }}>{mrpResults.filter((r) => r.shortageQty > 0).length}종</div></div>
          </div>
        </div>

        {mrpLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={24} style={{ color: C.accent, animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 8 }}>
              {isAnalysisMode ? 'MRP 소요량 계산 중...' : 'MRP 결과 조회 중...'}
            </div>
          </div>
        ) : isAnalysisMode ? (
          /* ── MRP 분석 모드: 소요량 분석 + 부족자재 선택 발주 ── */
          <>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1C2128' }}>
                    {['', '상태', '자재 SKU', '자재명', '필요량', '현재고', '부족량', 'MOQ', '공급업체', '리드타임'].map((h) => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.textMuted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mrpResults.map((r) => {
                    const moqInfo = MOCK_MOQ[r.materialSku];
                    const isShortage = r.shortageQty > 0;
                    const isReordered = r.reorderTriggered;
                    const isChecked = selectedForReorder.has(r.id);

                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}20`, background: isShortage ? `${C.red}08` : 'transparent' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {isShortage && !isReordered && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleReorderItem(r.id)}
                              style={{ cursor: 'pointer', accentColor: C.accent }}
                            />
                          )}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {isShortage
                            ? <AlertTriangle size={14} style={{ color: C.red }} />
                            : <CheckCircle2 size={14} style={{ color: C.green }} />
                          }
                        </td>
                        <td style={{ padding: '8px 10px', color: C.text, fontWeight: 600 }}>{r.materialSku}</td>
                        <td style={{ padding: '8px 10px', color: C.text }}>{r.materialName ?? '—'}</td>
                        <td style={{ padding: '8px 10px', color: C.text }}>{r.requiredQty.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', color: C.text }}>{r.currentStock.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', color: isShortage ? C.red : C.green, fontWeight: 600 }}>
                          {isShortage ? `-${r.shortageQty.toLocaleString()}` : '충분'}
                        </td>
                        <td style={{ padding: '8px 10px', color: C.yellow, fontWeight: 600 }}>
                          {moqInfo ? `${moqInfo.moq} ${moqInfo.unitName}` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: C.text, fontSize: 11 }}>
                          {moqInfo?.vendorName ?? '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: C.textMuted, fontSize: 11 }}>
                          {moqInfo ? `${moqInfo.leadTimeDays}일` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 선택 발주 액션 */}
            {shortageItems.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={toggleSelectAll}
                    style={{
                      padding: '6px 14px', fontSize: 12, borderRadius: 6,
                      border: `1px solid ${C.border}`, background: 'transparent',
                      color: C.textMuted, cursor: 'pointer',
                    }}
                  >
                    {selectedForReorder.size === shortageItems.length ? '전체 해제' : '전체 선택'}
                  </button>
                  <span style={{ fontSize: 12, color: C.textMuted }}>
                    {selectedForReorder.size}건 선택됨
                  </span>
                </div>
                <button
                  onClick={handleTriggerSelectedReorders}
                  disabled={selectedForReorder.size === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: selectedForReorder.size > 0 ? C.orange : C.border,
                    color: selectedForReorder.size > 0 ? '#fff' : C.textMuted,
                    border: 'none', cursor: selectedForReorder.size > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  <ShoppingCart size={14} /> 선택 자재 발주 추천 ({selectedForReorder.size}건)
                </button>
              </div>
            )}
          </>
        ) : (
          /* ── MRP 결과(발주 현황) 모드: 발주 상태 + 조달 진행률 ── */
          <>
            {/* 발주 진행 요약 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>발주 완료</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.green }}>
                  {mrpResults.filter((r) => r.reorderTriggered).length}
                  <span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>건</span>
                </div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>발주 대기</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.yellow }}>
                  {mrpResults.filter((r) => r.shortageQty > 0 && !r.reorderTriggered).length}
                  <span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>건</span>
                </div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>재고 충분</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>
                  {mrpResults.filter((r) => r.shortageQty === 0).length}
                  <span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>건</span>
                </div>
              </div>
            </div>

            {/* 발주 진행률 바 */}
            {mrpResults.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>조달 진행률</div>
                <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    background: `linear-gradient(90deg, ${C.green}, ${C.accent})`,
                    width: `${Math.round(((mrpResults.filter((r) => r.shortageQty === 0 || r.reorderTriggered).length) / mrpResults.length) * 100)}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{ fontSize: 12, color: C.text, marginTop: 4, textAlign: 'right', fontWeight: 600 }}>
                  {Math.round(((mrpResults.filter((r) => r.shortageQty === 0 || r.reorderTriggered).length) / mrpResults.length) * 100)}%
                </div>
              </div>
            )}

            {/* 발주 현황 테이블 */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1C2128' }}>
                    {['자재 SKU', '자재명', '부족량', 'MOQ', '공급업체', '리드타임', '발주 상태'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mrpResults.filter((r) => r.shortageQty > 0).map((r) => {
                    const moqInfo = MOCK_MOQ[r.materialSku];
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                        <td style={{ padding: '8px 12px', color: C.text, fontWeight: 600 }}>{r.materialSku}</td>
                        <td style={{ padding: '8px 12px', color: C.text }}>{r.materialName ?? '—'}</td>
                        <td style={{ padding: '8px 12px', color: C.red, fontWeight: 600 }}>
                          {r.shortageQty.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 12px', color: C.yellow, fontWeight: 600 }}>
                          {moqInfo ? `${moqInfo.moq} ${moqInfo.unitName}` : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: C.text, fontSize: 11 }}>
                          {moqInfo?.vendorName ?? '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: C.textMuted, fontSize: 11 }}>
                          {moqInfo ? `${moqInfo.leadTimeDays}일` : '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {r.reorderTriggered
                            ? <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: `${C.green}22`, color: C.green, fontWeight: 600 }}>발주완료</span>
                            : <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: `${C.yellow}22`, color: C.yellow, fontWeight: 600 }}>대기</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                  {mrpResults.filter((r) => r.shortageQty > 0).length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: C.textMuted }}>
                        부족 자재가 없습니다 — 모든 자재 재고 충분
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', background: C.bg, minHeight: '100%' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <ClipboardList size={22} style={{ color: C.purple }} />
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>수주 관리</h2>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8,
          background: C.purple, color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          <Plus size={16} /> 수주 등록
        </button>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[{ v: '', l: '전체' }, { v: 'RECEIVED', l: '접수' }, { v: 'MRP_CHECKED', l: 'MRP완료' }, { v: 'CONFIRMED', l: '확정' }, { v: 'IN_PRODUCTION', l: '생산중' }, { v: 'SHIPPED', l: '출하' }].map((f) => (
          <button key={f.v} onClick={() => setStatusFilter(f.v)} style={{
            padding: '4px 12px', fontSize: 12, borderRadius: 6,
            border: `1px solid ${statusFilter === f.v ? C.accent : C.border}`,
            background: statusFilter === f.v ? `${C.accent}22` : 'transparent',
            color: statusFilter === f.v ? C.accent : C.textMuted, cursor: 'pointer',
          }}>{f.l}</button>
        ))}
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '전체', count: orders.length, color: C.accent },
          { label: '접수 대기', count: orders.filter((o) => o.status === 'RECEIVED').length, color: C.yellow },
          { label: 'MRP 완료', count: orders.filter((o) => o.status === 'MRP_CHECKED').length, color: C.purple },
          { label: '출하 완료', count: orders.filter((o) => o.status === 'SHIPPED').length, color: C.green },
        ].map((s) => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* 수주 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orders.map((order) => {
          const st = STATUS_MAP[order.status] ?? { label: order.status, color: C.textMuted };
          const dday = getDDay(order.deliveryDeadline);
          const ddayNum = order.deliveryDeadline ? Math.ceil((new Date(order.deliveryDeadline).getTime() - Date.now()) / 86400000) : 999;
          const isUrgent = ddayNum <= 3 && order.status !== 'SHIPPED';
          const totalAmount = (order.items as SalesOrderItem[]).reduce((s, i) => s + i.qty * (i.unitPrice ?? 0), 0);

          return (
            <div key={order.id} onClick={() => setEditOrder(order)} style={{
              background: C.card, borderRadius: 10, padding: '16px 20px',
              border: `1px solid ${isUrgent ? C.red : C.border}`,
              boxShadow: isUrgent ? `0 0 0 1px ${C.red}44` : 'none',
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${st.color}22`, color: st.color, fontWeight: 600 }}>
                      {st.label}
                    </span>
                    {isUrgent && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${C.red}20`, color: C.red, fontWeight: 600 }}>
                        긴급
                      </span>
                    )}
                    {dday && order.status !== 'SHIPPED' && (
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: ddayNum <= 3 ? `${C.red}20` : ddayNum <= 7 ? `${C.yellow}15` : `${C.accent}15`,
                        color: ddayNum <= 3 ? C.red : ddayNum <= 7 ? C.yellow : C.accent,
                      }}>
                        <Clock size={10} style={{ marginRight: 2 }} />{dday}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: C.textMuted }}>{order.orderNo}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>
                    {order.customerName ?? '고객 미지정'}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    수주일: {order.orderDate} · 납기: {order.deliveryDeadline ?? '—'} · {(order.items as SalesOrderItem[]).length}건
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    ₩{totalAmount.toLocaleString()}
                  </span>

                  {/* MRP 실행/조회 버튼 */}
                  {order.status === 'RECEIVED' && (
                    <button onClick={(e) => { e.stopPropagation(); handleRunMrp(order); }} style={{
                      padding: '4px 10px', fontSize: 11, borderRadius: 6,
                      background: `${C.purple}15`, color: C.purple,
                      border: `1px solid ${C.purple}44`, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Play size={12} /> MRP 분석
                    </button>
                  )}
                  {(order.status === 'MRP_CHECKED' || order.mrpResults) && (
                    <button onClick={(e) => { e.stopPropagation(); handleViewMrp(order); }} style={{
                      padding: '4px 10px', fontSize: 11, borderRadius: 6,
                      background: `${C.accent}15`, color: C.accent,
                      border: `1px solid ${C.accent}44`, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Package size={12} /> MRP 결과
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, fontSize: 14 }}>
            수주가 없습니다
          </div>
        )}
      </div>

      {/* 수주 상세/편집 모달 */}
      {editOrder && (
        <EditSalesOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={handleEditSave}
        />
      )}

      {/* 수주 등록 모달 */}
      {showCreate && (
        <CreateSalesOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={(order) => { setOrders((prev) => [order, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

// --- 수주 상세/편집 모달 ---
function EditSalesOrderModal({ order, onClose, onSave }: {
  order: SalesOrder;
  onClose: () => void;
  onSave: (updated: SalesOrder) => void;
}) {
  const [customerName, setCustomerName] = useState(order.customerName ?? '');
  const [deliveryDeadline, setDeliveryDeadline] = useState(
    order.deliveryDeadline ? order.deliveryDeadline.slice(0, 10) : '',
  );
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.notes ?? '');
  const [items, setItems] = useState<Array<{ productSku: string; productName: string; qty: number; unitPrice: number }>>(
    (order.items as SalesOrderItem[]).map((i) => ({
      productSku: i.productSku,
      productName: i.productName ?? '',
      qty: i.qty,
      unitPrice: i.unitPrice ?? 0,
    })),
  );
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { productSku: '', productName: '', qty: 0, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const totalAmount = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      ...order,
      customerName: customerName || null,
      deliveryDeadline: deliveryDeadline || null,
      status,
      notes: notes || null,
      items: items.filter((i) => i.productSku),
      updatedAt: new Date().toISOString(),
    });
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    background: '#0D1117', border: '1px solid #30363D', borderRadius: 6,
    color: '#C9D1D9', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#8B949E', marginBottom: 4, display: 'block' };

  const statusOptions = [
    { value: 'RECEIVED', label: '접수' },
    { value: 'MRP_CHECKED', label: 'MRP완료' },
    { value: 'CONFIRMED', label: '확정' },
    { value: 'IN_PRODUCTION', label: '생산중' },
    { value: 'SHIPPED', label: '출하완료' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: 640, maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit3 size={16} style={{ color: C.purple }} />
            <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>수주 상세 · {order.orderNo}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* 기본 정보 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>고객사명</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={inputStyle} placeholder="고객사명" />
          </div>
          <div>
            <label style={labelStyle}>납기일</label>
            <input type="date" value={deliveryDeadline} onChange={(e) => setDeliveryDeadline(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* 수주일/수주번호 (읽기 전용) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>수주번호</label>
            <div style={{ ...inputStyle, background: '#161B22', color: C.textMuted }}>{order.orderNo}</div>
          </div>
          <div>
            <label style={labelStyle}>수주일</label>
            <div style={{ ...inputStyle, background: '#161B22', color: C.textMuted }}>{order.orderDate}</div>
          </div>
        </div>

        <label style={labelStyle}>비고</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} placeholder="메모" />

        {/* 품목 테이블 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={labelStyle}>완성품 목록</label>
          <button onClick={addItem} style={{ fontSize: 11, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>+ 품목 추가</button>
        </div>

        <div style={{ background: C.bg, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 24px', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: C.textMuted }}>SKU</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>품명</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>수량</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>단가</span>
            <span />
          </div>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 24px', gap: 8, marginBottom: 6 }}>
              <input value={item.productSku} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], productSku: e.target.value }; setItems(n); }} style={inputStyle} placeholder="SKU" />
              <input value={item.productName} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], productName: e.target.value }; setItems(n); }} style={inputStyle} placeholder="품명" />
              <input type="number" value={item.qty || ''} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], qty: Number(e.target.value) }; setItems(n); }} style={inputStyle} placeholder="수량" />
              <input type="number" value={item.unitPrice || ''} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], unitPrice: Number(e.target.value) }; setItems(n); }} style={inputStyle} placeholder="단가" />
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 0 }}><X size={14} /></button>
              )}
            </div>
          ))}
        </div>

        {/* 합계 + 저장 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            합계: ₩{totalAmount.toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', fontSize: 13 }}>취소</button>
            <button onClick={handleSave} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 6, background: C.purple,
              border: 'none', color: '#fff', cursor: saving ? 'wait' : 'pointer',
              fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
            }}>
              <Save size={14} /> {saving ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 수주 등록 모달 ---
function CreateSalesOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: (o: SalesOrder) => void }) {
  const [customerName, setCustomerName] = useState('');
  const [deliveryDeadline, setDeliveryDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productSku: string; productName: string; qty: number; unitPrice: number }>>([
    { productSku: '', productName: '', qty: 0, unitPrice: 0 },
  ]);

  const addItem = () => setItems([...items, { productSku: '', productName: '', qty: 0, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!items[0].productSku || !items[0].qty) return;
    try {
      const { createSalesOrder } = await import('../../api/sales-order-api');
      const order = await createSalesOrder({
        siteId: MOCK_SITE_ID,
        customerName: customerName || undefined,
        deliveryDeadline: deliveryDeadline || undefined,
        items: items.filter((i) => i.productSku),
        notes: notes || undefined,
      });
      onCreated(order);
    } catch {
      const mock: SalesOrder = {
        id: `so-${Date.now()}`, siteId: MOCK_SITE_ID,
        orderNo: `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-9999`,
        customerId: null, customerName: customerName || null,
        status: 'RECEIVED', orderDate: new Date().toISOString().slice(0, 10),
        deliveryDeadline: deliveryDeadline || null,
        items: items.filter((i) => i.productSku),
        notes: notes || null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      onCreated(mock);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    background: '#0D1117', border: '1px solid #30363D', borderRadius: 6,
    color: '#C9D1D9', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#8B949E', marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: 600, maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>수주 등록</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>고객사명</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={inputStyle} placeholder="현대모비스" />
          </div>
          <div>
            <label style={labelStyle}>납기일</label>
            <input type="date" value={deliveryDeadline} onChange={(e) => setDeliveryDeadline(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>비고</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} placeholder="메모" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={labelStyle}>완성품 목록</label>
          <button onClick={addItem} style={{ fontSize: 11, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>+ 품목 추가</button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 24px', gap: 8, marginBottom: 8 }}>
            <input value={item.productSku} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], productSku: e.target.value }; setItems(n); }} style={inputStyle} placeholder="SKU" />
            <input value={item.productName} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], productName: e.target.value }; setItems(n); }} style={inputStyle} placeholder="품명" />
            <input type="number" value={item.qty || ''} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], qty: Number(e.target.value) }; setItems(n); }} style={inputStyle} placeholder="수량" />
            <input type="number" value={item.unitPrice || ''} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], unitPrice: Number(e.target.value) }; setItems(n); }} style={inputStyle} placeholder="단가" />
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 0 }}><X size={14} /></button>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', fontSize: 13 }}>취소</button>
          <button onClick={handleSubmit} style={{ padding: '8px 18px', borderRadius: 6, background: C.purple, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>등록</button>
        </div>
      </div>
    </div>
  );
}
