/**
 * HanVoxel — 입고 관리 페이지 (다크 테마)
 *
 * 기능:
 *   - 입고 주문 생성 (수동 / 자동발주 연동)
 *   - 입고 주문 목록 (상태별 필터)
 *   - 도착 확인 → 실제 수량 입력 → QC 검수 자동 생성
 *   - QC 통과 처리 → 재고 반영
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  ArrowLeft,
  Check,
  ClipboardCheck,
  Truck,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { InboundOrder } from '../../api/inbound-api';

// --- 디자인 토큰 ---
const C = {
  bg: '#0D1117', card: '#161B22', border: '#30363D',
  text: '#C9D1D9', textMuted: '#8B949E', accent: '#58A6FF',
  green: '#10B981', yellow: '#F59E0B', red: '#EF4444', blue: '#3B82F6',
} as const;

// --- 상태 배지 ---
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ORDERED: { label: '발주완료', color: C.blue },
  IN_TRANSIT: { label: '운송중', color: '#8B5CF6' },
  ARRIVED: { label: '도착', color: C.yellow },
  QC_PENDING: { label: 'QC대기', color: '#F97316' },
  QC_PASSED: { label: 'QC통과', color: C.green },
  STOCKED: { label: '입고완료', color: C.green },
};

// --- Mock 데이터 ---
const MOCK_ORDERS: InboundOrder[] = [
  {
    id: 'ib-1', siteId: 'demo', reorderRecommendationId: null,
    vendorId: 'v1', vendorName: '현대모비스', status: 'QC_PENDING',
    expectedDate: '2026-03-15', actualDate: '2026-03-15', notes: '가솔린 엔진 밸브 입고',
    items: [
      { id: 'ibi-1', inboundOrderId: 'ib-1', skuCode: 'SKU-2891', itemName: '가솔린 엔진 밸브', expectedQty: 500, actualQty: 498, unitPrice: 12000, qcInspectionId: 'qc-1', spatialObjectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    createdAt: '2026-03-10T09:00:00Z', updatedAt: '2026-03-15T14:00:00Z',
  },
  {
    id: 'ib-2', siteId: 'demo', reorderRecommendationId: 'rec-1',
    vendorId: 'v2', vendorName: '삼성SDI', status: 'ORDERED',
    expectedDate: '2026-03-20', actualDate: null, notes: '배터리 셀 자동발주',
    items: [
      { id: 'ibi-2', inboundOrderId: 'ib-2', skuCode: 'SKU-4501', itemName: '리튬이온 배터리 셀', expectedQty: 1000, actualQty: null, unitPrice: 45000, qcInspectionId: null, spatialObjectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    createdAt: '2026-03-12T10:00:00Z', updatedAt: '2026-03-12T10:00:00Z',
  },
  {
    id: 'ib-3', siteId: 'demo', reorderRecommendationId: null,
    vendorId: 'v3', vendorName: 'LG화학', status: 'ARRIVED',
    expectedDate: '2026-03-17', actualDate: '2026-03-17', notes: null,
    items: [
      { id: 'ibi-3', inboundOrderId: 'ib-3', skuCode: 'SKU-1120', itemName: '양극재 분말', expectedQty: 200, actualQty: 200, unitPrice: 85000, qcInspectionId: null, spatialObjectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'ibi-4', inboundOrderId: 'ib-3', skuCode: 'SKU-1121', itemName: '음극재 분말', expectedQty: 150, actualQty: null, unitPrice: 62000, qcInspectionId: null, spatialObjectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    createdAt: '2026-03-14T11:00:00Z', updatedAt: '2026-03-17T08:00:00Z',
  },
  {
    id: 'ib-4', siteId: 'demo', reorderRecommendationId: null,
    vendorId: 'v4', vendorName: '포스코', status: 'STOCKED',
    expectedDate: '2026-03-10', actualDate: '2026-03-10', notes: '철강 코일 정기 입고',
    items: [
      { id: 'ibi-5', inboundOrderId: 'ib-4', skuCode: 'SKU-7200', itemName: '냉연강판 코일', expectedQty: 50, actualQty: 50, unitPrice: 320000, qcInspectionId: 'qc-4', spatialObjectId: 'so-rack-b12', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    createdAt: '2026-03-05T09:00:00Z', updatedAt: '2026-03-10T16:00:00Z',
  },
];

interface InboundManagementProps {
  onBack: () => void;
}

export function InboundManagement({ onBack }: InboundManagementProps) {
  const [orders, setOrders] = useState<InboundOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);

  // 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const { getInboundOrders } = await import('../../api/inbound-api');
        const result = await getInboundOrders('demo', statusFilter || undefined);
        if (result.orders.length > 0) { setOrders(result.orders); return; }
      } catch { /* mock fallback */ }
      const filtered = statusFilter
        ? MOCK_ORDERS.filter((o) => o.status === statusFilter)
        : MOCK_ORDERS;
      setOrders(filtered);
    })();
  }, [statusFilter]);

  // 도착 확인 핸들러
  const handleArrive = useCallback(async (orderId: string) => {
    try {
      const { arriveInboundOrder } = await import('../../api/inbound-api');
      await arriveInboundOrder(orderId);
    } catch { /* mock */ }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'QC_PENDING' as const, actualDate: new Date().toISOString().slice(0, 10) } : o));
  }, []);

  // QC 통과 핸들러
  const handleQcPass = useCallback(async (orderId: string) => {
    try {
      const { passQcInboundOrder } = await import('../../api/inbound-api');
      await passQcInboundOrder(orderId);
    } catch { /* mock */ }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'STOCKED' as const } : o));
  }, []);

  // 총 금액 계산
  const calcTotal = (items: InboundOrder['items']) =>
    items.reduce((sum, i) => sum + (i.actualQty ?? i.expectedQty) * i.unitPrice, 0);

  return (
    <div style={{ padding: '24px 28px', background: C.bg, minHeight: '100%' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <Package size={22} style={{ color: C.blue }} />
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>입고 관리</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: C.accent, color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus size={16} /> 입고 주문 생성
        </button>
      </div>

      {/* 상태 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { value: '', label: '전체' },
          { value: 'ORDERED', label: '발주완료' },
          { value: 'IN_TRANSIT', label: '운송중' },
          { value: 'ARRIVED', label: '도착' },
          { value: 'QC_PENDING', label: 'QC대기' },
          { value: 'STOCKED', label: '입고완료' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            style={{
              padding: '5px 14px', fontSize: 12, borderRadius: 6,
              border: `1px solid ${statusFilter === f.value ? C.accent : C.border}`,
              background: statusFilter === f.value ? 'rgba(88,166,255,0.15)' : 'transparent',
              color: statusFilter === f.value ? C.accent : C.textMuted,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '전체', count: MOCK_ORDERS.length, color: C.accent },
          { label: '입고 대기', count: MOCK_ORDERS.filter((o) => ['ORDERED', 'IN_TRANSIT'].includes(o.status)).length, color: C.blue },
          { label: 'QC 진행', count: MOCK_ORDERS.filter((o) => ['ARRIVED', 'QC_PENDING'].includes(o.status)).length, color: C.yellow },
          { label: '입고 완료', count: MOCK_ORDERS.filter((o) => o.status === 'STOCKED').length, color: C.green },
        ].map((s) => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* 주문 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orders.map((order) => {
          const st = STATUS_MAP[order.status] ?? { label: order.status, color: C.textMuted };
          return (
            <div
              key={order.id}
              style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '16px 20px', cursor: 'pointer',
              }}
              onClick={() => setSelectedOrder(order)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: `${st.color}22`, color: st.color, fontWeight: 600,
                    }}>
                      {st.label}
                    </span>
                    {order.reorderRecommendationId && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                        자동발주
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: C.textMuted }}>
                      {order.vendorName ?? '공급업체 미지정'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>
                    {order.items.map((i) => i.itemName ?? i.skuCode).join(', ')}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    예상: {order.expectedDate ?? '-'} · 실제: {order.actualDate ?? '-'} · {order.items.length}건
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    ₩{calcTotal(order.items).toLocaleString()}
                  </span>

                  {/* 액션 버튼 */}
                  {(order.status === 'ORDERED' || order.status === 'IN_TRANSIT') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleArrive(order.id); }}
                      style={{
                        padding: '4px 10px', fontSize: 11, borderRadius: 6,
                        background: 'rgba(245,158,11,0.15)', color: C.yellow,
                        border: `1px solid ${C.yellow}44`, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Truck size={12} /> 도착확인
                    </button>
                  )}
                  {order.status === 'QC_PENDING' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQcPass(order.id); }}
                      style={{
                        padding: '4px 10px', fontSize: 11, borderRadius: 6,
                        background: 'rgba(16,185,129,0.15)', color: C.green,
                        border: `1px solid ${C.green}44`, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <ClipboardCheck size={12} /> QC통과
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, fontSize: 14 }}>
            입고 주문이 없습니다
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedOrder && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
          onClick={() => setSelectedOrder(null)}
        >
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: 560, maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>입고 주문 상세</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: '공급업체', value: selectedOrder.vendorName ?? '-' },
                { label: '상태', value: STATUS_MAP[selectedOrder.status]?.label ?? selectedOrder.status },
                { label: '입고 예상일', value: selectedOrder.expectedDate ?? '-' },
                { label: '실제 입고일', value: selectedOrder.actualDate ?? '-' },
              ].map((f) => (
                <div key={f.label}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: C.text }}>{f.value}</div>
                </div>
              ))}
            </div>

            {/* 품목 테이블 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['SKU', '품명', '예상 수량', '실제 수량', '단가', '금액'].map((h) => (
                    <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: C.textMuted, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: '8px 6px', color: C.accent }}>{item.skuCode}</td>
                    <td style={{ padding: '8px 6px', color: C.text }}>{item.itemName ?? '-'}</td>
                    <td style={{ padding: '8px 6px', color: C.text }}>{item.expectedQty}</td>
                    <td style={{ padding: '8px 6px', color: item.actualQty !== null && item.actualQty !== item.expectedQty ? C.yellow : C.text }}>
                      {item.actualQty ?? '-'}
                      {item.actualQty !== null && item.actualQty !== item.expectedQty && (
                        <span style={{ fontSize: 10, marginLeft: 4 }}>
                          ({item.actualQty - item.expectedQty > 0 ? '+' : ''}{item.actualQty - item.expectedQty})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', color: C.text }}>₩{item.unitPrice.toLocaleString()}</td>
                    <td style={{ padding: '8px 6px', color: C.text, fontWeight: 600 }}>
                      ₩{((item.actualQty ?? item.expectedQty) * item.unitPrice).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginTop: 12, fontSize: 14, fontWeight: 700, color: C.text }}>
              합계: ₩{calcTotal(selectedOrder.items).toLocaleString()}
            </div>

            {selectedOrder.notes && (
              <div style={{ marginTop: 12, padding: 10, background: C.bg, borderRadius: 6, fontSize: 12, color: C.textMuted }}>
                📝 {selectedOrder.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 생성 모달 */}
      {showCreateModal && (
        <CreateInboundModal onClose={() => setShowCreateModal(false)} onCreated={(order) => { setOrders((prev) => [order, ...prev]); setShowCreateModal(false); }} />
      )}
    </div>
  );
}

// --- 입고 주문 생성 모달 ---
function CreateInboundModal({ onClose, onCreated }: { onClose: () => void; onCreated: (order: InboundOrder) => void }) {
  const [vendorName, setVendorName] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ skuCode: '', itemName: '', expectedQty: 0, unitPrice: 0 }]);

  const addItem = () => setItems([...items, { skuCode: '', itemName: '', expectedQty: 0, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!items[0].skuCode) return;
    try {
      const { createInboundOrder } = await import('../../api/inbound-api');
      const order = await createInboundOrder({
        siteId: 'demo',
        vendorName: vendorName || undefined,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: items.filter((i) => i.skuCode),
      });
      onCreated(order);
    } catch {
      // mock 생성
      const mockOrder: InboundOrder = {
        id: `ib-new-${Date.now()}`, siteId: 'demo', reorderRecommendationId: null,
        vendorId: null, vendorName: vendorName || null, status: 'ORDERED',
        expectedDate: expectedDate || null, actualDate: null, notes: notes || null,
        items: items.filter((i) => i.skuCode).map((i, idx) => ({
          id: `ibi-new-${idx}`, inboundOrderId: '', skuCode: i.skuCode, itemName: i.itemName || null,
          expectedQty: i.expectedQty, actualQty: null, unitPrice: i.unitPrice,
          qcInspectionId: null, spatialObjectId: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      onCreated(mockOrder);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: 560, maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>입고 주문 생성</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>공급업체명</label>
            <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} style={inputStyle} placeholder="현대모비스" />
          </div>
          <div>
            <label style={labelStyle}>입고 예상일</label>
            <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>비고</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} placeholder="메모" />

        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={labelStyle}>품목</label>
          <button onClick={addItem} style={{ fontSize: 11, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>+ 품목 추가</button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 24px', gap: 8, marginBottom: 8 }}>
            <input value={item.skuCode} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], skuCode: e.target.value }; setItems(n); }} style={inputStyle} placeholder="SKU" />
            <input value={item.itemName} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], itemName: e.target.value }; setItems(n); }} style={inputStyle} placeholder="품명" />
            <input type="number" value={item.expectedQty || ''} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], expectedQty: Number(e.target.value) }; setItems(n); }} style={inputStyle} placeholder="수량" />
            <input type="number" value={item.unitPrice || ''} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], unitPrice: Number(e.target.value) }; setItems(n); }} style={inputStyle} placeholder="단가" />
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 0 }}><X size={14} /></button>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', fontSize: 13 }}>취소</button>
          <button onClick={handleSubmit} style={{ padding: '8px 18px', borderRadius: 6, background: C.accent, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>생성</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: '#8B949E', marginBottom: 4, display: 'block' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  background: '#0D1117', border: '1px solid #30363D', borderRadius: 6,
  color: '#C9D1D9', outline: 'none', boxSizing: 'border-box',
};
