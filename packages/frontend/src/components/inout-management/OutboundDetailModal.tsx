/**
 * HanVoxel — 출고 상세 모달 (슬라이드 패널)
 *
 * 출고 주문의 전체 상세 정보를 우측 슬라이드 패널로 표시한다.
 * - 출고 품목 상세 테이블 (소계/부가세/합계)
 * - 출고 방식 상세 (PICKING / PALLET / CONTAINER)
 * - 수령처 & 배송 정보
 * - 타임라인 (수직)
 * - 액션 버튼
 */

import { useState, useEffect, CSSProperties } from 'react';
import {
  X,
  Phone,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  Clock,
  MapPin,
  Layers,
  Send,
  Container,
  User,
  BarChart3,
  Anchor,
  FileText,
} from 'lucide-react';

// --- 타입 정의 ---
export interface OutboundOrderData {
  id: string;
  orderNo: string;
  type: string; // PICKING | PALLET | CONTAINER
  customerName: string;
  status: string; // PLANNED | PICKING | PACKED | DISPATCHED
  scheduledDate: string;
  dispatchedDate?: string;
  destination: string;
  items: {
    skuCode: string;
    itemName: string;
    qty: number;
    unitPrice: number;
    location?: string;
  }[];
  driver?: {
    name: string;
    phone: string;
    carrierCompany: string;
    vehicleNo: string;
    vehicleType: string;
  };
  receiver?: {
    name: string;
    phone: string;
    address: string;
    memo?: string;
  };
  pallet?: {
    count: number;
    type: string;
    pallets: { id: string; items: string; qty: number }[];
  };
  container?: {
    type: string;
    no: string;
    palletCount: number;
    maxPallets: number;
    weightKg: number;
    maxWeightKg: number;
    hsCode?: string;
    port?: string;
  };
  timeline: {
    date: string;
    label: string;
    status: 'done' | 'current' | 'pending';
  }[];
  pickingProgress?: {
    completed: number;
    total: number;
    picker?: string;
    startTime?: string;
    estimatedEnd?: string;
  };
}

// --- 상태 배지 맵 ---
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLANNED: { label: '출고예정', color: 'var(--accent-blue)' },
  PICKING: { label: '피킹중', color: 'var(--accent-orange)' },
  PACKED: { label: '포장완료', color: 'var(--accent-orange)' },
  DISPATCHED: { label: '출고완료', color: 'var(--accent-green)' },
};

// --- 출고 유형 맵 ---
const TYPE_LABEL: Record<string, string> = {
  PICKING: '낱개 피킹',
  PALLET: '팔레트 출고',
  CONTAINER: '컨테이너 출고',
};

// --- Mock 데이터 ---
const MOCK_ORDER: OutboundOrderData = {
  id: 'ob-detail-1',
  orderNo: 'OUT-20260322-007',
  type: 'PICKING',
  customerName: '쿠팡 물류센터',
  status: 'PICKING',
  scheduledDate: '2026-03-22',
  dispatchedDate: undefined,
  destination: '인천광역시 서구 ○○로 123',
  items: [
    { skuCode: 'SKU-2891', itemName: '가솔린 엔진 밸브', qty: 50, unitPrice: 15000, location: 'A동 B-12-2' },
    { skuCode: 'SKU-1120', itemName: '양극재 분말', qty: 20, unitPrice: 95000, location: 'A동 C-03-1' },
    { skuCode: 'SKU-4501', itemName: '리튬이온 배터리 셀', qty: 100, unitPrice: 48000, location: 'B동 A-07-3' },
  ],
  driver: {
    name: '이운송',
    phone: '010-1234-5678',
    carrierCompany: '한진택배',
    vehicleNo: '서울 34나 5678',
    vehicleType: '11톤 카고',
  },
  receiver: {
    name: '홍길동',
    phone: '032-123-4567',
    address: '인천광역시 서구 ○○로 123',
    memo: '지게차 하역 가능',
  },
  pallet: {
    count: 6,
    type: 'T11',
    pallets: [
      { id: 'PLT-001', items: '엔진 밸브 x25, 배터리 셀 x20', qty: 45 },
      { id: 'PLT-002', items: '엔진 밸브 x25, 양극재 분말 x10', qty: 35 },
      { id: 'PLT-003', items: '배터리 셀 x30', qty: 30 },
      { id: 'PLT-004', items: '배터리 셀 x30', qty: 30 },
      { id: 'PLT-005', items: '배터리 셀 x20, 양극재 분말 x10', qty: 30 },
      { id: 'PLT-006', items: '완충재 / 빈 팔레트', qty: 0 },
    ],
  },
  container: {
    type: 'DRY_40FT',
    no: 'MSCU-1234567',
    palletCount: 18,
    maxPallets: 20,
    weightKg: 22500,
    maxWeightKg: 26750,
    hsCode: '870899',
    port: '인천항 → 함부르크',
  },
  timeline: [
    { date: '2026-03-20 09:00', label: '출고 주문 생성', status: 'done' },
    { date: '2026-03-21 14:00', label: '피킹 지시 전송', status: 'done' },
    { date: '2026-03-22 09:30', label: '피킹 진행중', status: 'current' },
    { date: '', label: '포장 완료', status: 'pending' },
    { date: '', label: '차량 상차', status: 'pending' },
    { date: '', label: '출고 완료', status: 'pending' },
  ],
  pickingProgress: {
    completed: 120,
    total: 170,
    picker: '김물류',
    startTime: '2026-03-22 09:30',
    estimatedEnd: '2026-03-22 11:00',
  },
};

// --- 숫자 포맷 ---
function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

// --- 컴포넌트 Props ---
interface Props {
  order: OutboundOrderData | null;
  onClose: () => void;
}

// --- 메인 컴포넌트 ---
export function OutboundDetailModal({ order, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  // 등장 애니메이션
  useEffect(() => {
    if (order) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [order]);

  if (!order) return null;

  // mock 데이터 사용 — 전달받은 order 기반
  const data: OutboundOrderData = { ...MOCK_ORDER, ...order };
  const statusInfo = STATUS_MAP[data.status] ?? { label: data.status, color: 'var(--text-muted)' };

  // 소계 / 부가세 / 합계
  const subtotal = data.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const vat = Math.round(subtotal * 0.1);
  const totalAmount = subtotal + vat;

  // 피킹 진행률
  const pickingPct = data.pickingProgress
    ? Math.round((data.pickingProgress.completed / data.pickingProgress.total) * 100)
    : 0;

  // --- 공통 스타일 ---
  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
    transition: 'background-color 0.3s ease',
  };

  const panelStyle: CSSProperties = {
    width: 560,
    height: '100vh',
    backgroundColor: 'var(--bg-primary)',
    borderLeft: '1px solid var(--border-default)',
    display: 'flex',
    flexDirection: 'column',
    transform: visible ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.3s ease',
    overflow: 'hidden',
  };

  const headerStyle: CSSProperties = {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-secondary)',
    flexShrink: 0,
  };

  const scrollStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  };

  const sectionStyle: CSSProperties = { marginBottom: 24 };

  const sectionTitleStyle: CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const cardStyle: CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-muted)',
    borderRadius: 8,
    padding: 16,
  };

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: statusInfo.color,
    backgroundColor: `${statusInfo.color}20`,
    border: `1px solid ${statusInfo.color}40`,
  };

  const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
  const thStyle: CSSProperties = {
    textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)',
    fontSize: 12, borderBottom: '1px solid var(--border-muted)', fontWeight: 500,
  };
  const tdStyle: CSSProperties = {
    padding: '10px', color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-muted)',
  };

  const btnPrimary: CSSProperties = {
    padding: '10px 18px', borderRadius: 8, border: 'none',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    backgroundColor: 'var(--accent-blue)', color: '#fff',
  };
  const btnSecondary: CSSProperties = {
    ...btnPrimary,
    backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
  };
  const btnDanger: CSSProperties = {
    ...btnPrimary,
    backgroundColor: 'transparent', color: 'var(--accent-red)',
    border: '1px solid var(--accent-red)',
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setVisible(false);
      setTimeout(onClose, 300);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  // 인라인 미니 카드 스타일
  const miniCardStyle: CSSProperties = {
    padding: '10px 12px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 6,
    border: '1px solid var(--border-muted)',
    marginTop: 10,
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={panelStyle}>
        {/* ===== 헤더 ===== */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={20} />
                출고 #{data.orderNo}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                화성 본사 창고
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                {data.customerName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={badgeStyle}>{statusInfo.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {data.scheduledDate} 오후 출고
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                출고 유형: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{TYPE_LABEL[data.type] ?? data.type}</span>
              </div>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ===== 스크롤 영역 ===== */}
        <div style={scrollStyle}>

          {/* 섹션 1: 출고 품목 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Package size={16} style={{ color: 'var(--accent-blue)' }} />
              출고 품목
            </div>
            <div style={cardStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>품목명</th>
                    <th style={thStyle}>SKU</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>수량</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>단가</th>
                    <th style={thStyle}>출고 위치</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                      <td style={tdStyle}>{item.itemName}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>{item.skuCode}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(item.qty)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>₩{fmt(item.unitPrice)}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--accent-blue)' }}>{item.location ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* 소계 / 부가세 / 합계 */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-muted)', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>소계</span>
                  <span style={{ color: 'var(--text-primary)' }}>₩{fmt(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>부가세 (10%)</span>
                  <span style={{ color: 'var(--text-primary)' }}>₩{fmt(vat)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, paddingTop: 8, borderTop: '1px solid var(--border-muted)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>합계</span>
                  <span style={{ color: 'var(--text-primary)' }}>₩{fmt(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 섹션 2: 출고 방식 상세 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <BarChart3 size={16} style={{ color: 'var(--accent-orange)' }} />
              출고 방식 상세
            </div>
            <div style={cardStyle}>
              {/* PICKING 방식 */}
              {data.type === 'PICKING' && data.pickingProgress && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>피킹 진행률</div>
                  {/* 프로그레스 바 */}
                  <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 6, height: 20, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{
                      width: `${pickingPct}%`,
                      height: '100%',
                      backgroundColor: pickingPct === 100 ? 'var(--accent-green)' : 'var(--accent-blue)',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#fff',
                      transition: 'width 0.3s ease',
                    }}>
                      {pickingPct}%
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>완료 / 전체</span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>
                        {fmt(data.pickingProgress.completed)} / {fmt(data.pickingProgress.total)}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>피커</span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>
                        {data.pickingProgress.picker ?? '-'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>예상 완료</span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>
                        {data.pickingProgress.estimatedEnd ?? '-'}
                      </div>
                    </div>
                  </div>
                  {data.pickingProgress.startTime && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      시작 시각: {data.pickingProgress.startTime}
                    </div>
                  )}
                </div>
              )}

              {/* PALLET 방식 */}
              {data.type === 'PALLET' && data.pallet && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>팔레트 수</span>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                        {data.pallet.count}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>개</span>
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>팔레트 규격</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{data.pallet.type}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>적재율</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-green)', marginTop: 4 }}>92%</div>
                    </div>
                  </div>
                  {/* 팔레트 리스트 */}
                  <div style={{ fontSize: 12 }}>
                    {data.pallet.pallets.map((p, idx) => (
                      <div key={idx} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 10px', borderBottom: idx < data.pallet!.pallets.length - 1 ? '1px solid var(--border-muted)' : 'none',
                      }}>
                        <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{p.id}</span>
                        <span style={{ color: 'var(--text-secondary)', flex: 1, marginLeft: 12 }}>{p.items}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{p.qty > 0 ? `${p.qty}개` : '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONTAINER 방식 */}
              {data.type === 'CONTAINER' && data.container && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>컨테이너 타입</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{data.container.type}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>컨테이너 번호</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-blue)', marginTop: 2 }}>{data.container.no}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>팔레트 적재</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {data.container.palletCount} / {data.container.maxPallets}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                          ({Math.round((data.container.palletCount / data.container.maxPallets) * 100)}%)
                        </span>
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>중량</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {fmt(data.container.weightKg)} / {fmt(data.container.maxWeightKg)} kg
                      </div>
                    </div>
                  </div>
                  {data.container.hsCode && (
                    <div style={miniCardStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <FileText size={14} style={{ color: 'var(--accent-orange)' }} />
                        HS 코드: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.container.hsCode}</span>
                      </div>
                    </div>
                  )}
                  {data.container.port && (
                    <div style={miniCardStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <Anchor size={14} style={{ color: 'var(--accent-blue)' }} />
                        항구: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.container.port}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 섹션 3: 수령처 & 배송 정보 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <MapPin size={16} style={{ color: 'var(--accent-green)' }} />
              수령처 & 배송 정보
            </div>
            <div style={cardStyle}>
              {/* 수령처 */}
              {data.receiver && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600, marginBottom: 8 }}>수령처</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {data.customerName} ({data.destination.includes('인천') ? '인천' : ''})
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {data.receiver.address}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    담당: {data.receiver.name} / {data.receiver.phone}
                  </div>
                  {data.receiver.memo && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                      배송 메모: {data.receiver.memo}
                    </div>
                  )}
                </div>
              )}

              {/* 배송 기사 정보 */}
              <div style={{ borderTop: data.receiver ? '1px solid var(--border-muted)' : 'none', paddingTop: data.receiver ? 14 : 0 }}>
                <div style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={14} /> 배송 기사
                </div>
                {data.driver ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>기사명</span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>{data.driver.name}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>연락처</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data.driver.phone}</span>
                        <button style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          backgroundColor: 'var(--accent-green)', color: '#fff',
                          border: 'none', cursor: 'pointer',
                        }}>
                          <Phone size={11} /> 전화
                        </button>
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>운송사</span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>{data.driver.carrierCompany}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>차량번호</span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>{data.driver.vehicleNo}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>차량</span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>{data.driver.vehicleType}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>
                      배송 기사 정보가 없습니다.
                    </div>
                    <button style={btnSecondary}>
                      <Plus size={14} /> 기사 직접 입력
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 섹션 4: 타임라인 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Clock size={16} style={{ color: 'var(--accent-blue)' }} />
              처리 타임라인
            </div>
            <div style={cardStyle}>
              {data.timeline.map((step, idx) => {
                const isLast = idx === data.timeline.length - 1;
                let dotIcon = '⬜';
                if (step.status === 'done') dotIcon = '✅';
                else if (step.status === 'current') dotIcon = '🔄';

                return (
                  <div key={idx} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, lineHeight: '24px' }}>{dotIcon}</span>
                      {!isLast && (
                        <div style={{
                          flex: 1, width: 2, minHeight: 20,
                          backgroundColor: step.status === 'done' ? 'var(--accent-green)' : 'var(--border-muted)',
                        }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: step.status === 'current' ? 700 : 400,
                        color: step.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}>
                        {step.label}
                      </div>
                      {step.date && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{step.date}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== 하단 액션 버튼 ===== */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          gap: 10,
          flexShrink: 0,
        }}>
          <button style={btnPrimary}>
            <CheckCircle size={14} /> 출고 완료 처리
          </button>
          <button style={btnSecondary}>
            <Send size={14} /> 피킹 앱으로 전송
          </button>
          <div style={{ flex: 1 }} />
          <button style={btnDanger}>
            <XCircle size={14} /> 출고 취소
          </button>
        </div>
      </div>
    </div>
  );
}
