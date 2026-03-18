import React, { useState, useMemo } from 'react';
import {
  Plus, ClipboardList, Play, Pause, CheckCircle2, XCircle,
  AlertTriangle, Calendar, Users, Factory, Package, FileText, X,
  ChevronRight, Clock, Link2,
} from 'lucide-react';
import { BomProductSearch } from './BomProductSearch';
import type { BomProduct } from './BomProductSearch';

/* ── 타입 정의 ── */
type OrderStatus = 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
type ProcessStatus = 'DONE' | 'IN_PROGRESS' | 'PENDING';

interface Process { name: string; status: ProcessStatus }

interface WorkOrder {
  id: string; orderNo: string; productSku: string; productName: string;
  status: OrderStatus; priority: Priority; plannedQty: number; actualQty: number;
  defectQty: number; workCenterName: string; assignedWorkers: string[];
  plannedStartAt: string; plannedEndAt: string; salesOrderNo: string | null;
  deadline: string; processes: Process[];
}

/* ── 상수 ── */
const STATUS_TABS: { key: OrderStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '전체' }, { key: 'PLANNED', label: '계획' },
  { key: 'IN_PROGRESS', label: '작업중' }, { key: 'PAUSED', label: '일시정지' },
  { key: 'COMPLETED', label: '완료' }, { key: 'CANCELLED', label: '취소' },
];

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  PLANNED: { label: '계획', color: 'var(--accent-blue)' },
  IN_PROGRESS: { label: '작업중', color: 'var(--accent-orange)' },
  PAUSED: { label: '일시정지', color: 'var(--text-muted)' },
  COMPLETED: { label: '완료', color: 'var(--accent-green)' },
  CANCELLED: { label: '취소', color: 'var(--accent-red)' },
};

const PRIORITY_LABELS: Record<Priority, { label: string; color: string }> = {
  URGENT: { label: '긴급', color: 'var(--accent-red)' },
  HIGH: { label: '높음', color: 'var(--accent-orange)' },
  NORMAL: { label: '보통', color: 'var(--accent-blue)' },
  LOW: { label: '낮음', color: 'var(--text-muted)' },
};

const WORK_CENTERS = ['1호 프레스', '2호 프레스', '조립 라인 A', '조립 라인 B', '용접 라인 A', '도장 라인'];

/* ── 목업 데이터 ── */
const MOCK_ORDERS: WorkOrder[] = [
  {
    id: 'wo-1', orderNo: 'WO-20260318-001', productSku: 'FP-BP-001', productName: '브레이크 패드 세트',
    status: 'IN_PROGRESS', priority: 'HIGH', plannedQty: 180, actualQty: 72, defectQty: 3,
    workCenterName: '1호 프레스', assignedWorkers: ['김철수', '이영희'],
    plannedStartAt: '2026-03-18T09:00:00', plannedEndAt: '2026-03-18T17:00:00',
    salesOrderNo: 'SO-20260310-006', deadline: '2026-03-19',
    processes: [
      { name: '프레스', status: 'DONE' }, { name: '용접', status: 'IN_PROGRESS' },
      { name: '도장', status: 'PENDING' }, { name: '검사', status: 'PENDING' },
    ],
  },
  {
    id: 'wo-2', orderNo: 'WO-20260318-002', productSku: 'FP-EV-002', productName: '엔진 밸브 세트',
    status: 'IN_PROGRESS', priority: 'NORMAL', plannedQty: 120, actualQty: 95, defectQty: 1,
    workCenterName: '조립 라인 B', assignedWorkers: ['박민준'],
    plannedStartAt: '2026-03-18T08:00:00', plannedEndAt: '2026-03-18T16:00:00',
    salesOrderNo: null, deadline: '2026-03-20',
    processes: [
      { name: '절삭', status: 'DONE' }, { name: '연마', status: 'DONE' },
      { name: '조립', status: 'IN_PROGRESS' }, { name: '검사', status: 'PENDING' },
    ],
  },
  {
    id: 'wo-3', orderNo: 'WO-20260318-003', productSku: 'FP-SA-003', productName: '서스펜션 암',
    status: 'IN_PROGRESS', priority: 'URGENT', plannedQty: 50, actualQty: 28, defectQty: 2,
    workCenterName: '용접 라인 A', assignedWorkers: ['최준혁', '한소정'],
    plannedStartAt: '2026-03-18T08:00:00', plannedEndAt: '2026-03-18T14:00:00',
    salesOrderNo: 'SO-20260312-009', deadline: '2026-03-18',
    processes: [
      { name: '절단', status: 'DONE' }, { name: '용접', status: 'IN_PROGRESS' },
      { name: '검사', status: 'PENDING' },
    ],
  },
  {
    id: 'wo-4', orderNo: 'WO-20260319-001', productSku: 'FP-EM-004', productName: '배기 매니폴드',
    status: 'PLANNED', priority: 'NORMAL', plannedQty: 200, actualQty: 0, defectQty: 0,
    workCenterName: '2호 프레스', assignedWorkers: [],
    plannedStartAt: '2026-03-19T09:00:00', plannedEndAt: '2026-03-19T17:00:00',
    salesOrderNo: null, deadline: '2026-03-22',
    processes: [
      { name: '프레스', status: 'PENDING' }, { name: '용접', status: 'PENDING' },
      { name: '도장', status: 'PENDING' },
    ],
  },
  {
    id: 'wo-5', orderNo: 'WO-20260317-008', productSku: 'FP-CH-005', productName: '실린더 헤드',
    status: 'COMPLETED', priority: 'HIGH', plannedQty: 100, actualQty: 98, defectQty: 4,
    workCenterName: '1호 프레스', assignedWorkers: ['김철수'],
    plannedStartAt: '2026-03-17T08:00:00', plannedEndAt: '2026-03-17T16:00:00',
    salesOrderNo: 'SO-20260308-003', deadline: '2026-03-18',
    processes: [
      { name: '주조', status: 'DONE' }, { name: '가공', status: 'DONE' },
      { name: '검사', status: 'DONE' },
    ],
  },
];

/* ── 유틸 함수 ── */
// 납기 D-day 계산
function getDday(deadline: string): { label: string; urgent: boolean } {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `D+${Math.abs(diff)}`, urgent: true };
  if (diff === 0) return { label: 'D-Day', urgent: true };
  return { label: `D-${diff}`, urgent: diff <= 2 };
}

// 공정 상태 아이콘
function processIcon(s: ProcessStatus) {
  if (s === 'DONE') return '\u2705';
  if (s === 'IN_PROGRESS') return '\uD83D\uDD04';
  return '\u2B1C';
}

// 날짜 포맷 (MM/DD HH:mm)
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ── 공통 스타일 ── */
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
  borderRadius: 8, padding: 16,
};
const btnPrimary: React.CSSProperties = {
  background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  display: 'flex', alignItems: 'center', gap: 6,
};
const btnSecondary: React.CSSProperties = {
  ...btnPrimary, background: 'transparent', border: '1px solid var(--border-default)',
  color: 'var(--text-secondary)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-default)',
  background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };

/* ── 컴포넌트 ── */
export function WorkOrderList({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [orders, setOrders] = useState<WorkOrder[]>(MOCK_ORDERS);
  const [statusModal, setStatusModal] = useState<{ orderId: string; currentStatus: OrderStatus } | null>(null);

  // 상태 변경 핸들러
  const changeOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    setStatusModal(null);
  };

  // 생산 지시서 추가 핸들러
  const addOrder = (newOrder: WorkOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    setShowCreate(false);
  };

  // 필터링된 목록
  const filtered = useMemo(
    () => (filter === 'ALL' ? orders : orders.filter((o) => o.status === filter)),
    [filter, orders],
  );

  // 요약 통계
  const summary = useMemo(() => ({
    total: orders.length,
    inProgress: orders.filter((o) => o.status === 'IN_PROGRESS').length,
    completed: orders.filter((o) => o.status === 'COMPLETED').length,
    urgent: orders.filter((o) => o.priority === 'URGENT').length,
  }), [orders]);

  const summaryCards = [
    { label: '전체', value: summary.total, icon: <ClipboardList size={18} />, color: 'var(--accent-blue)' },
    { label: '진행중', value: summary.inProgress, icon: <Play size={18} />, color: 'var(--accent-orange)' },
    { label: '완료', value: summary.completed, icon: <CheckCircle2 size={18} />, color: 'var(--accent-green)' },
    { label: '긴급', value: summary.urgent, icon: <AlertTriangle size={18} />, color: 'var(--accent-red)' },
  ];

  return (
    <div style={{ padding: 24, color: 'var(--text-primary)', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>생산 지시서</h1>
        </div>
        <button style={btnPrimary} onClick={() => setShowCreate(true)}>
          <Plus size={16} /> 생산 지시서 생성
        </button>
      </div>

      {/* 상태 필터 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{
              padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border-default)',
              background: filter === t.key ? 'var(--accent-blue)' : 'transparent',
              color: filter === t.key ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {summaryCards.map((c) => (
          <div key={c.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: c.color }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 주문 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatusChange={(newStatus) => changeOrderStatus(order.id, newStatus)}
            onOpenStatusModal={() => setStatusModal({ orderId: order.id, currentStatus: order.status })}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            해당 상태의 생산 지시서가 없습니다.
          </div>
        )}
      </div>

      {/* 상태 변경 모달 */}
      {statusModal && (
        <StatusChangeModal
          currentStatus={statusModal.currentStatus}
          onChangeStatus={(s) => changeOrderStatus(statusModal.orderId, s)}
          onClose={() => setStatusModal(null)}
        />
      )}

      {/* 생성 모달 */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onAdd={addOrder} />}
    </div>
  );
}

/* ── 주문 카드 ── */
function OrderCard({ order, onStatusChange, onOpenStatusModal }: {
  order: WorkOrder;
  onStatusChange: (status: OrderStatus) => void;
  onOpenStatusModal: () => void;
}) {
  const pct = order.plannedQty > 0 ? Math.round((order.actualQty / order.plannedQty) * 100) : 0;
  const statusInfo = STATUS_LABELS[order.status];
  const prioInfo = PRIORITY_LABELS[order.priority];
  const dday = getDday(order.deadline);

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 첫 줄: 지시번호 + 우선순위 + 상태 + D-day */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{order.orderNo}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: prioInfo.color, color: '#fff', fontWeight: 600 }}>
            {prioInfo.label}
          </span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${statusInfo.color}`, color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: dday.urgent ? 'var(--accent-red)' : 'var(--text-muted)' }}>
          납기 {dday.label}
        </span>
      </div>

      {/* 제품 정보 + 수량 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Package size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{order.productName}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({order.productSku})</span>
        </div>
        <span style={{ fontSize: 13 }}>
          실적 <strong>{order.actualQty}</strong> / {order.plannedQty}
          {order.defectQty > 0 && <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>불량 {order.defectQty}</span>}
        </span>
      </div>

      {/* 진행률 바 */}
      <div style={{ background: 'var(--bg-primary)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 4,
          background: pct >= 100 ? 'var(--accent-green)' : 'var(--accent-blue)', transition: 'width .3s' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{pct}%</div>

      {/* 메타 정보 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Factory size={13} /> {order.workCenterName}
        </span>
        {order.assignedWorkers.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={13} /> {order.assignedWorkers.join(', ')}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={13} /> {fmtDate(order.plannedStartAt)} ~ {fmtDate(order.plannedEndAt)}
        </span>
        {order.salesOrderNo && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-blue)' }}>
            <Link2 size={13} /> {order.salesOrderNo}
          </span>
        )}
      </div>

      {/* 공정 파이프라인 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {order.processes.map((p, i) => (
          <React.Fragment key={i}>
            <span style={{
              fontSize: 12, padding: '3px 10px', borderRadius: 4,
              background: p.status === 'DONE' ? 'rgba(34,197,94,.15)' : p.status === 'IN_PROGRESS' ? 'rgba(251,146,60,.15)' : 'var(--bg-primary)',
              color: p.status === 'DONE' ? 'var(--accent-green)' : p.status === 'IN_PROGRESS' ? 'var(--accent-orange)' : 'var(--text-muted)',
              border: `1px solid ${p.status === 'DONE' ? 'var(--accent-green)' : p.status === 'IN_PROGRESS' ? 'var(--accent-orange)' : 'var(--border-muted)'}`,
            }}>
              {processIcon(p.status)} {p.name}
            </span>
            {i < order.processes.length - 1 && <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {order.status === 'IN_PROGRESS' && (
          <>
            <button style={{ ...btnPrimary, fontSize: 12, padding: '6px 12px' }}
              onClick={() => onStatusChange('COMPLETED')}>
              <FileText size={14} /> 완료 처리
            </button>
            <button style={{ ...btnSecondary, fontSize: 12, padding: '6px 12px' }}
              onClick={onOpenStatusModal}>
              <Pause size={14} /> 상태 변경
            </button>
          </>
        )}
        {order.status === 'PLANNED' && (
          <button style={{ ...btnPrimary, fontSize: 12, padding: '6px 12px', background: 'var(--accent-green)' }}
            onClick={() => onStatusChange('IN_PROGRESS')}>
            <Play size={14} /> 작업 시작
          </button>
        )}
        {order.status === 'PAUSED' && (
          <button style={{ ...btnPrimary, fontSize: 12, padding: '6px 12px' }}
            onClick={() => onStatusChange('IN_PROGRESS')}>
            <Play size={14} /> 재개
          </button>
        )}
        {order.status === 'COMPLETED' && (
          <span style={{ fontSize: 12, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={14} /> 완료됨
          </span>
        )}
      </div>
    </div>
  );
}

/* ── 상태 변경 모달 ── */
function StatusChangeModal({ currentStatus, onChangeStatus, onClose }: {
  currentStatus: OrderStatus;
  onChangeStatus: (s: OrderStatus) => void;
  onClose: () => void;
}) {
  const transitions: { status: OrderStatus; label: string; color: string }[] = [
    { status: 'PLANNED', label: '계획', color: 'var(--accent-blue)' },
    { status: 'IN_PROGRESS', label: '작업 시작', color: 'var(--accent-orange)' },
    { status: 'PAUSED', label: '일시정지', color: 'var(--text-muted)' },
    { status: 'COMPLETED', label: '완료', color: 'var(--accent-green)' },
    { status: 'CANCELLED', label: '취소', color: 'var(--accent-red)' },
  ].filter(t => t.status !== currentStatus);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ ...cardStyle, width: 360, padding: 24 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>상태 변경</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transitions.map(t => (
            <button key={t.status} onClick={() => onChangeStatus(t.status)}
              style={{ padding: '12px 16px', borderRadius: 8, border: `1px solid ${t.color}`, background: 'transparent',
                color: t.color, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ ...btnSecondary, width: '100%', marginTop: 12, justifyContent: 'center' }}>닫기</button>
      </div>
    </div>
  );
}

/* ── 생성 모달 (BOM 검색 통합) ── */
function CreateModal({ onClose, onAdd }: { onClose: () => void; onAdd: (order: WorkOrder) => void }) {
  const [form, setForm] = useState({
    productSku: '', productName: '', plannedQty: '', priority: 'NORMAL' as Priority,
    startAt: '', endAt: '', workCenter: WORK_CENTERS[0], salesOrderNo: '', workers: '', notes: '',
  });
  // BOM 검색으로 선택된 제품 정보
  const [bomProduct, setBomProduct] = useState<BomProduct | null>(null);
  const [bomQty, setBomQty] = useState(100);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  // BOM 제품 선택 시 폼 자동 채우기
  const handleBomSelect = (product: BomProduct) => {
    setBomProduct(product);
    setForm((p) => ({
      ...p,
      productSku: product.sku,
      productName: product.name,
      plannedQty: String(bomQty),
    }));
  };

  // BOM 수량 변경 시 폼 동기화
  const handleBomQtyChange = (qty: number) => {
    setBomQty(qty);
    setForm((p) => ({ ...p, plannedQty: String(qty) }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ ...cardStyle, width: 580, maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>생산 지시서 생성</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* BOM 제품 검색 */}
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-muted)' }}>
          <BomProductSearch
            siteId="demo"
            onProductSelect={handleBomSelect}
            plannedQty={bomQty}
            onQtyChange={handleBomQtyChange}
          />
        </div>

        {/* 폼 필드 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>제품 SKU *</label>
              <input style={inputStyle} placeholder="FP-XX-000" value={form.productSku} onChange={(e) => set('productSku', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>제품명 *</label>
              <input style={inputStyle} placeholder="제품명 입력" value={form.productName} onChange={(e) => set('productName', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>계획 수량 *</label>
              <input style={inputStyle} type="number" placeholder="0" value={form.plannedQty}
                onChange={(e) => { set('plannedQty', e.target.value); setBomQty(Number(e.target.value) || 1); }} />
            </div>
            <div>
              <label style={labelStyle}>우선순위</label>
              <select style={inputStyle} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as Priority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>시작 일시 *</label>
              <input style={inputStyle} type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>종료 일시 *</label>
              <input style={inputStyle} type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>작업장</label>
            <select style={inputStyle} value={form.workCenter} onChange={(e) => set('workCenter', e.target.value)}>
              {WORK_CENTERS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>수주 번호 (선택)</label>
            <input style={inputStyle} placeholder="SO-XXXXXXXX-XXX" value={form.salesOrderNo} onChange={(e) => set('salesOrderNo', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>작업자 (쉼표 구분)</label>
            <input style={inputStyle} placeholder="김철수, 이영희" value={form.workers} onChange={(e) => set('workers', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>비고</label>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} placeholder="특이사항 입력"
              value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        {/* 모달 하단 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button style={btnSecondary} onClick={onClose}>취소</button>
          <button style={btnPrimary} onClick={() => {
            if (!form.productSku || !form.productName || !form.plannedQty || !form.startAt || !form.endAt) return;
            const now = new Date();
            const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
            const orderNo = `WO-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${seq}`;
            // BOM 공정 정보가 있으면 공정 목록 자동 생성
            const processes: Process[] = bomProduct?.processes?.length
              ? bomProduct.processes.map((name) => ({ name, status: 'PENDING' as ProcessStatus }))
              : [{ name: '준비', status: 'PENDING' }, { name: '생산', status: 'PENDING' }, { name: '검사', status: 'PENDING' }];
            onAdd({
              id: `wo-${Date.now()}`,
              orderNo,
              productSku: form.productSku,
              productName: form.productName,
              status: 'PLANNED',
              priority: form.priority,
              plannedQty: Number(form.plannedQty),
              actualQty: 0,
              defectQty: 0,
              workCenterName: form.workCenter,
              assignedWorkers: form.workers ? form.workers.split(',').map(w => w.trim()) : [],
              plannedStartAt: form.startAt,
              plannedEndAt: form.endAt,
              salesOrderNo: form.salesOrderNo || null,
              deadline: form.endAt.split('T')[0],
              processes,
            });
          }}>
            <Plus size={14} /> 생성
          </button>
        </div>
      </div>
    </div>
  );
}
