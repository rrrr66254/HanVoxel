/**
 * HanVoxel — 출고 관리 페이지 (다크 테마)
 *
 * 기능:
 *   - 출고 주문 생성 (유형: PICKING / PALLET / CONTAINER / DIRECT / TRANSFER)
 *   - 출고 주문 목록 (상태·유형별 필터)
 *   - 출고 완료 처리 (DISPATCHED)
 *   - 출고 명세표 PDF 미리보기
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  ArrowLeft,
  FileText,
  Check,
  Package,
  X,
  Clock,
  Upload,
} from 'lucide-react';
import { BulkOutboundUpload } from './BulkOutboundUpload';
import type { OutboundOrder } from '../../api/outbound-api';
import { ManifestPdf } from './ManifestPdf';
import { OutboundDetailModal } from './OutboundDetailModal';
import type { OutboundOrderData } from './OutboundDetailModal';

// --- 디자인 토큰 ---
const C = {
  bg: '#0D1117', card: '#161B22', border: '#30363D',
  text: '#C9D1D9', textMuted: '#8B949E', accent: '#58A6FF',
  green: '#10B981', yellow: '#F59E0B', red: '#EF4444', orange: '#F97316',
} as const;

// --- 상태 / 유형 맵 ---
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLANNED: { label: '출고예정', color: C.accent },
  PICKING: { label: '피킹중', color: C.yellow },
  PACKED: { label: '포장완료', color: C.orange },
  DISPATCHED: { label: '출고완료', color: C.green },
};

const TYPE_MAP: Record<string, string> = {
  PICKING: '낱개 피킹',
  PALLET: '팔레트',
  CONTAINER: '컨테이너',
  DIRECT: '직납',
  TRANSFER: '이동',
};

const SLOT_MAP: Record<string, string> = {
  AM: '오전 (09-12)',
  PM: '오후 (13-18)',
  NIGHT: '야간 (18-22)',
};

// --- Mock 데이터 ---
const MOCK_ORDERS: OutboundOrder[] = [
  {
    id: 'ob-1', siteId: 'demo', type: 'PICKING', status: 'PLANNED',
    scheduledDate: '2026-03-18', dispatchedDate: null, customerName: '쿠팡 풀필먼트',
    destination: '경기도 이천시 마장면', manifestNumber: 'OUT-20260318-0001',
    timeSlot: 'AM', notes: null, containerSpec: null, hsCode: null,
    items: [
      { id: 'obi-1', outboundOrderId: 'ob-1', skuCode: 'SKU-2891', itemName: '가솔린 엔진 밸브', qty: 50, unitPrice: 15000, pickedBy: null, pickedAt: null, spatialObjectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'obi-2', outboundOrderId: 'ob-1', skuCode: 'SKU-1120', itemName: '양극재 분말', qty: 20, unitPrice: 95000, pickedBy: null, pickedAt: null, spatialObjectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    createdAt: '2026-03-16T09:00:00Z', updatedAt: '2026-03-16T09:00:00Z',
  },
  {
    id: 'ob-2', siteId: 'demo', type: 'CONTAINER', status: 'PACKED',
    scheduledDate: '2026-03-19', dispatchedDate: null, customerName: 'BMW Munich',
    destination: 'Dingolfing, Germany', manifestNumber: 'OUT-20260319-0001',
    timeSlot: 'PM', notes: '수출 건 — HS 코드 확인 필요', containerSpec: 'DRY_40FT', hsCode: '870899',
    items: [
      { id: 'obi-3', outboundOrderId: 'ob-2', skuCode: 'SKU-4501', itemName: '리튬이온 배터리 셀', qty: 2000, unitPrice: 48000, pickedBy: '김물류', pickedAt: '2026-03-18T14:00:00Z', spatialObjectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    createdAt: '2026-03-14T10:00:00Z', updatedAt: '2026-03-18T15:00:00Z',
  },
  {
    id: 'ob-3', siteId: 'demo', type: 'PALLET', status: 'DISPATCHED',
    scheduledDate: '2026-03-15', dispatchedDate: '2026-03-15', customerName: '롯데물류',
    destination: '서울시 송파구', manifestNumber: 'OUT-20260315-0001',
    timeSlot: 'AM', notes: null, containerSpec: null, hsCode: null,
    items: [
      { id: 'obi-4', outboundOrderId: 'ob-3', skuCode: 'SKU-7200', itemName: '냉연강판 코일', qty: 10, unitPrice: 350000, pickedBy: '박작업', pickedAt: '2026-03-15T08:30:00Z', spatialObjectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    createdAt: '2026-03-12T09:00:00Z', updatedAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'ob-4', siteId: 'demo', type: 'DIRECT', status: 'PLANNED',
    scheduledDate: '2026-03-20', dispatchedDate: null, customerName: 'CJ대한통운',
    destination: '대전시 유성구', manifestNumber: 'OUT-20260320-0001',
    timeSlot: 'PM', notes: '직납 출고', containerSpec: null, hsCode: null,
    items: [
      { id: 'obi-5', outboundOrderId: 'ob-4', skuCode: 'SKU-1121', itemName: '음극재 분말', qty: 100, unitPrice: 68000, pickedBy: null, pickedAt: null, spatialObjectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    createdAt: '2026-03-17T11:00:00Z', updatedAt: '2026-03-17T11:00:00Z',
  },
];

// OutboundOrder → OutboundOrderData 변환 헬퍼
function toDetailData(order: OutboundOrder): OutboundOrderData {
  const statusSteps = ['PLANNED', 'PICKING', 'PACKED', 'DISPATCHED'];
  const stepLabels = ['출고 주문 생성', '피킹 진행', '포장 완료', '출고 완료'];
  const currentIdx = statusSteps.indexOf(order.status);
  return {
    id: order.id,
    orderNo: order.manifestNumber ?? order.id.toUpperCase(),
    type: order.type,
    customerName: order.customerName ?? '고객 미지정',
    status: order.status,
    scheduledDate: order.scheduledDate ?? '-',
    dispatchedDate: order.dispatchedDate ?? undefined,
    destination: order.destination ?? '-',
    items: order.items.map((i) => ({
      skuCode: i.skuCode,
      itemName: i.itemName ?? i.skuCode,
      qty: i.qty,
      unitPrice: i.unitPrice,
    })),
    timeline: stepLabels.map((label, idx) => ({
      date: idx <= currentIdx ? (order.updatedAt ?? '') : '',
      label,
      status: idx < currentIdx ? 'done' as const : idx === currentIdx ? 'current' as const : 'pending' as const,
    })),
  };
}

interface OutboundManagementProps {
  onBack: () => void;
}

export function OutboundManagement({ onBack }: OutboundManagementProps) {
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [manifestOrderId, setManifestOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | null>(null);

  // 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const { getOutboundOrders } = await import('../../api/outbound-api');
        const result = await getOutboundOrders('demo', statusFilter || undefined, typeFilter || undefined);
        if (result.orders.length > 0) { setOrders(result.orders); return; }
      } catch { /* mock */ }
      let filtered = MOCK_ORDERS;
      if (statusFilter) filtered = filtered.filter((o) => o.status === statusFilter);
      if (typeFilter) filtered = filtered.filter((o) => o.type === typeFilter);
      setOrders(filtered);
    })();
  }, [statusFilter, typeFilter]);

  // 출고 완료 핸들러
  const handleDispatch = useCallback(async (orderId: string) => {
    try {
      const { dispatchOutboundOrder } = await import('../../api/outbound-api');
      await dispatchOutboundOrder(orderId);
    } catch { /* mock */ }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'DISPATCHED' as const, dispatchedDate: new Date().toISOString().slice(0, 10) } : o));
  }, []);

  // D-day 계산
  const getDDay = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-Day';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  const calcTotal = (items: OutboundOrder['items']) =>
    items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

  // B2C 대량 출고 업로드 모드
  if (showBulkUpload) {
    return <BulkOutboundUpload onBack={() => setShowBulkUpload(false)} />;
  }

  // 명세표 뷰 모드
  if (manifestOrderId) {
    const order = orders.find((o) => o.id === manifestOrderId) ?? MOCK_ORDERS.find((o) => o.id === manifestOrderId);
    if (order) {
      return <ManifestPdf order={order} onBack={() => setManifestOrderId(null)} />;
    }
  }

  return (
    <div style={{ padding: '24px 28px', background: C.bg, minHeight: '100%' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <Truck size={22} style={{ color: C.orange }} />
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>출고 관리</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowBulkUpload(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <Upload size={16} /> B2C 대량 출고
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: C.orange, color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={16} /> 출고 주문 생성
          </button>
        </div>
      </div>

      {/* 필터: 상태 + 유형 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 11, color: C.textMuted, alignSelf: 'center', marginRight: 4 }}>상태:</span>
          {[{ value: '', label: '전체' }, { value: 'PLANNED', label: '예정' }, { value: 'PICKING', label: '피킹중' }, { value: 'PACKED', label: '포장' }, { value: 'DISPATCHED', label: '완료' }].map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)} style={filterBtnStyle(statusFilter === f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 11, color: C.textMuted, alignSelf: 'center', marginRight: 4 }}>유형:</span>
          {[{ value: '', label: '전체' }, ...Object.entries(TYPE_MAP).map(([k, v]) => ({ value: k, label: v }))].map((f) => (
            <button key={f.value} onClick={() => setTypeFilter(f.value)} style={filterBtnStyle(typeFilter === f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '전체', count: MOCK_ORDERS.length, color: C.accent },
          { label: '출고 예정', count: MOCK_ORDERS.filter((o) => o.status === 'PLANNED').length, color: C.accent },
          { label: '진행 중', count: MOCK_ORDERS.filter((o) => ['PICKING', 'PACKED'].includes(o.status)).length, color: C.yellow },
          { label: '출고 완료', count: MOCK_ORDERS.filter((o) => o.status === 'DISPATCHED').length, color: C.green },
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
          const dday = getDDay(order.scheduledDate);

          return (
            <div key={order.id} onClick={() => setSelectedOrder(order)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${st.color}22`, color: st.color, fontWeight: 600 }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                      {TYPE_MAP[order.type] ?? order.type}
                    </span>
                    {dday && order.status !== 'DISPATCHED' && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: dday === 'D-Day' ? 'rgba(239,68,68,0.2)' : 'rgba(88,166,255,0.1)', color: dday === 'D-Day' ? C.red : C.accent }}>
                        <Clock size={10} style={{ marginRight: 2 }} />{dday}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: C.textMuted }}>{order.manifestNumber}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>
                    {order.customerName ?? '고객 미지정'} → {order.destination ?? '-'}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    예정: {order.scheduledDate ?? '-'} {order.timeSlot ? `(${SLOT_MAP[order.timeSlot] ?? order.timeSlot})` : ''} · {order.items.length}건
                    {order.containerSpec && ` · ${order.containerSpec}`}
                    {order.hsCode && ` · HS:${order.hsCode}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    ₩{calcTotal(order.items).toLocaleString()}
                  </span>

                  {/* 명세표 버튼 */}
                  <button
                    onClick={() => setManifestOrderId(order.id)}
                    style={actionBtnStyle('rgba(88,166,255,0.15)', C.accent)}
                    title="명세표"
                  >
                    <FileText size={12} /> 명세표
                  </button>

                  {/* 출고 완료 버튼 */}
                  {order.status !== 'DISPATCHED' && (
                    <button
                      onClick={() => handleDispatch(order.id)}
                      style={actionBtnStyle('rgba(16,185,129,0.15)', C.green)}
                    >
                      <Check size={12} /> 출고완료
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, fontSize: 14 }}>
            출고 주문이 없습니다
          </div>
        )}
      </div>

      {/* 상세 슬라이드 패널 */}
      <OutboundDetailModal
        order={selectedOrder ? toDetailData(selectedOrder) : null}
        onClose={() => setSelectedOrder(null)}
      />

      {/* 생성 모달 */}
      {showCreateModal && (
        <CreateOutboundModal onClose={() => setShowCreateModal(false)} onCreated={(order) => { setOrders((prev) => [order, ...prev]); setShowCreateModal(false); }} />
      )}
    </div>
  );
}

// --- 출고 주문 생성 모달 ---
function CreateOutboundModal({ onClose, onCreated }: { onClose: () => void; onCreated: (order: OutboundOrder) => void }) {
  const [type, setType] = useState('PICKING');
  const [scheduledDate, setScheduledDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('AM');
  const [customerName, setCustomerName] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [containerSpec, setContainerSpec] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [items, setItems] = useState([{ skuCode: '', itemName: '', qty: 0, unitPrice: 0 }]);

  const addItem = () => setItems([...items, { skuCode: '', itemName: '', qty: 0, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!items[0].skuCode) return;
    try {
      const { createOutboundOrder } = await import('../../api/outbound-api');
      const order = await createOutboundOrder({
        siteId: 'demo', type, scheduledDate: scheduledDate || undefined,
        timeSlot, customerName: customerName || undefined, destination: destination || undefined,
        notes: notes || undefined, containerSpec: containerSpec || undefined,
        hsCode: hsCode || undefined, items: items.filter((i) => i.skuCode),
      });
      onCreated(order);
    } catch {
      const mockOrder: OutboundOrder = {
        id: `ob-new-${Date.now()}`, siteId: 'demo', type: type as OutboundOrder['type'], status: 'PLANNED',
        scheduledDate: scheduledDate || null, dispatchedDate: null, customerName: customerName || null,
        destination: destination || null, manifestNumber: `OUT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-9999`,
        timeSlot, notes: notes || null, containerSpec: containerSpec || null, hsCode: hsCode || null,
        items: items.filter((i) => i.skuCode).map((i, idx) => ({
          id: `obi-new-${idx}`, outboundOrderId: '', skuCode: i.skuCode, itemName: i.itemName || null,
          qty: i.qty, unitPrice: i.unitPrice, pickedBy: null, pickedAt: null, spatialObjectId: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      onCreated(mockOrder);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 14, padding: 28, width: 600, maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: '#C9D1D9', margin: 0, fontSize: 16 }}>출고 주문 생성</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* 유형 선택 */}
        <label style={labelStyle}>출고 유형</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {Object.entries(TYPE_MAP).map(([k, v]) => (
            <button key={k} onClick={() => setType(k)} style={{
              padding: '6px 14px', fontSize: 12, borderRadius: 6,
              border: `1px solid ${type === k ? '#58A6FF' : '#30363D'}`,
              background: type === k ? 'rgba(88,166,255,0.15)' : 'transparent',
              color: type === k ? '#58A6FF' : '#8B949E', cursor: 'pointer',
            }}>
              {v}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>출고 예정일</label>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>타임슬롯</label>
            <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} style={inputStyle}>
              <option value="AM">오전 (09-12)</option>
              <option value="PM">오후 (13-18)</option>
              <option value="NIGHT">야간 (18-22)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>고객명</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={inputStyle} placeholder="쿠팡 풀필먼트" />
          </div>
          <div>
            <label style={labelStyle}>배송지</label>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} style={inputStyle} placeholder="경기도 이천시" />
          </div>
        </div>

        {/* 컨테이너 전용 */}
        {type === 'CONTAINER' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>컨테이너 규격</label>
              <select value={containerSpec} onChange={(e) => setContainerSpec(e.target.value)} style={inputStyle}>
                <option value="">선택</option>
                <option value="DRY_20FT">20ft Dry</option>
                <option value="DRY_40FT">40ft Dry</option>
                <option value="HC_40FT">40ft High Cube</option>
                <option value="HC_45FT">45ft High Cube</option>
                <option value="REEFER_20FT">20ft 냉장</option>
                <option value="REEFER_40FT">40ft 냉장</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>HS 코드</label>
              <input value={hsCode} onChange={(e) => setHsCode(e.target.value)} style={inputStyle} placeholder="870899" />
            </div>
          </div>
        )}

        <label style={labelStyle}>비고</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} placeholder="메모" />

        {/* 품목 */}
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={labelStyle}>품목</label>
          <button onClick={addItem} style={{ fontSize: 11, color: '#58A6FF', background: 'none', border: 'none', cursor: 'pointer' }}>+ 품목 추가</button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 24px', gap: 8, marginBottom: 8 }}>
            <input value={item.skuCode} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], skuCode: e.target.value }; setItems(n); }} style={inputStyle} placeholder="SKU" />
            <input value={item.itemName} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], itemName: e.target.value }; setItems(n); }} style={inputStyle} placeholder="품명" />
            <input type="number" value={item.qty || ''} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], qty: Number(e.target.value) }; setItems(n); }} style={inputStyle} placeholder="수량" />
            <input type="number" value={item.unitPrice || ''} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], unitPrice: Number(e.target.value) }; setItems(n); }} style={inputStyle} placeholder="단가" />
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, background: 'transparent', border: '1px solid #30363D', color: '#8B949E', cursor: 'pointer', fontSize: 13 }}>취소</button>
          <button onClick={handleSubmit} style={{ padding: '8px 18px', borderRadius: 6, background: '#F97316', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>생성</button>
        </div>
      </div>
    </div>
  );
}

// --- 스타일 헬퍼 ---
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#8B949E', marginBottom: 4, display: 'block' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  background: '#0D1117', border: '1px solid #30363D', borderRadius: 6,
  color: '#C9D1D9', outline: 'none', boxSizing: 'border-box',
};

function filterBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 12px', fontSize: 12, borderRadius: 6,
    border: `1px solid ${active ? '#58A6FF' : '#30363D'}`,
    background: active ? 'rgba(88,166,255,0.15)' : 'transparent',
    color: active ? '#58A6FF' : '#8B949E', cursor: 'pointer',
  };
}

function actionBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: '4px 10px', fontSize: 11, borderRadius: 6,
    background: bg, color, border: `1px solid ${color}44`,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  };
}
