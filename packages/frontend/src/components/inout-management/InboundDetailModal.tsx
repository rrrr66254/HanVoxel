/**
 * HanVoxel — 입고 상세 모달 (슬라이드 패널)
 *
 * 입고 주문의 전체 상세 정보를 우측 슬라이드 패널로 표시한다.
 * - 입고 품목 상세 테이블
 * - 팔레트/적재 정보
 * - 배송 기사 정보
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
  ClipboardCheck,
  XCircle,
  Plus,
  ArrowRight,
  Clock,
  MapPin,
  Weight,
  Layers,
} from 'lucide-react';

// --- 타입 정의 ---
export interface InboundOrderData {
  id: string;
  orderNo: string;
  vendorName: string;
  status: string; // ORDERED | IN_TRANSIT | ARRIVED | QC_PENDING | QC_PASSED | STOCKED
  expectedDate: string;
  actualDate?: string;
  notes?: string;
  items: {
    skuCode: string;
    itemName: string;
    expectedQty: number;
    actualQty?: number;
    unitPrice: number;
  }[];
  driver?: {
    name: string;
    phone: string;
    carrierCompany: string;
    vehicleNo: string;
    vehicleType: string;
  };
  palletCount?: number;
  totalWeightKg?: number;
  timeline: {
    date: string;
    label: string;
    status: 'done' | 'current' | 'pending';
  }[];
}

// --- 상태 배지 맵 ---
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ORDERED: { label: '발주완료', color: 'var(--accent-blue)' },
  IN_TRANSIT: { label: '운송중', color: 'var(--accent-orange)' },
  ARRIVED: { label: '도착', color: 'var(--accent-orange)' },
  QC_PENDING: { label: 'QC대기', color: 'var(--accent-orange)' },
  QC_PASSED: { label: 'QC통과', color: 'var(--accent-green)' },
  STOCKED: { label: '입고완료', color: 'var(--accent-green)' },
};

// --- Mock 데이터 ---
const MOCK_ORDER: InboundOrderData = {
  id: 'ib-detail-1',
  orderNo: 'INB-20260318-001',
  vendorName: '강남철강(주)',
  status: 'IN_TRANSIT',
  expectedDate: '2026-03-18',
  actualDate: undefined,
  notes: '냉연강판 코일 정기 입고 — A동 지게차 하역 필요',
  items: [
    { skuCode: 'SKU-7200', itemName: '냉연강판 코일 1.2T', expectedQty: 30, actualQty: undefined, unitPrice: 320000 },
    { skuCode: 'SKU-7201', itemName: '냉연강판 코일 0.8T', expectedQty: 20, actualQty: undefined, unitPrice: 280000 },
    { skuCode: 'SKU-7210', itemName: '열연강판 코일 2.0T', expectedQty: 10, actualQty: undefined, unitPrice: 450000 },
  ],
  driver: {
    name: '박철수',
    phone: '010-9876-5432',
    carrierCompany: 'CJ대한통운',
    vehicleNo: '경기 12가 3456',
    vehicleType: '5톤 윙바디',
  },
  palletCount: 12,
  totalWeightKg: 18500,
  timeline: [
    { date: '2026-03-15 09:00', label: '발주 생성', status: 'done' },
    { date: '2026-03-16 14:00', label: '공급업체 확인', status: 'done' },
    { date: '2026-03-17 08:00', label: '출하 완료 (운송 시작)', status: 'done' },
    { date: '2026-03-18 09:30', label: '창고 도착 예정', status: 'current' },
    { date: '', label: 'QC 검수', status: 'pending' },
    { date: '', label: '입고 적재 완료', status: 'pending' },
  ],
};

// --- 숫자 포맷 ---
function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

// --- 컴포넌트 Props ---
interface Props {
  order: InboundOrderData | null;
  onClose: () => void;
  onArrive?: (id: string) => void;
  onCancelArrive?: (id: string) => void;
  onQcPass?: (id: string) => void;
}

// --- 메인 컴포넌트 ---
export function InboundDetailModal({ order, onClose, onArrive, onCancelArrive, onQcPass }: Props) {
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

  // 전달받은 order 우선, 부족한 필드만 mock으로 보완
  const data: InboundOrderData = { ...MOCK_ORDER, ...order, items: order.items.length > 0 ? order.items : MOCK_ORDER.items };
  const statusInfo = STATUS_MAP[data.status] ?? { label: data.status, color: 'var(--text-muted)' };

  // 합계 계산
  const totalAmount = data.items.reduce((sum, item) => sum + item.expectedQty * item.unitPrice, 0);

  // --- 스타일 ---
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

  const sectionStyle: CSSProperties = {
    marginBottom: 24,
  };

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

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  };

  const thStyle: CSSProperties = {
    textAlign: 'left',
    padding: '8px 10px',
    color: 'var(--text-muted)',
    fontSize: 12,
    borderBottom: '1px solid var(--border-muted)',
    fontWeight: 500,
  };

  const tdStyle: CSSProperties = {
    padding: '10px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-muted)',
  };

  const btnPrimary: CSSProperties = {
    padding: '10px 18px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--accent-blue)',
    color: '#fff',
  };

  const btnSecondary: CSSProperties = {
    ...btnPrimary,
    backgroundColor: 'var(--bg-hover)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
  };

  const btnDanger: CSSProperties = {
    ...btnPrimary,
    backgroundColor: 'transparent',
    color: 'var(--accent-red)',
    border: '1px solid var(--accent-red)',
  };

  // 오버레이 클릭 시 닫기
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

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={panelStyle}>
        {/* ===== 헤더 ===== */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={20} />
                입고 #{data.orderNo}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {data.vendorName}
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                화성 본사 창고
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={badgeStyle}>{statusInfo.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {data.expectedDate} 오전 입고
                </span>
              </div>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
          {data.notes && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {data.notes}
            </div>
          )}
        </div>

        {/* ===== 스크롤 영역 ===== */}
        <div style={scrollStyle}>

          {/* 섹션 1: 입고 품목 상세 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <ClipboardCheck size={16} style={{ color: 'var(--accent-blue)' }} />
              입고 품목 상세
            </div>
            <div style={cardStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>품목명</th>
                    <th style={thStyle}>SKU</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>수량</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>단가</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                      <td style={tdStyle}>{item.itemName}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>{item.skuCode}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {fmt(item.expectedQty)}
                        {item.actualQty !== undefined && (
                          <span style={{ color: item.actualQty < item.expectedQty ? 'var(--accent-red)' : 'var(--accent-green)', fontSize: 11, marginLeft: 4 }}>
                            ({fmt(item.actualQty)})
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>₩{fmt(item.unitPrice)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        ₩{fmt(item.expectedQty * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-muted)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  합계: ₩{fmt(totalAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* 섹션 2: 팔레트/적재 정보 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Layers size={16} style={{ color: 'var(--accent-orange)' }} />
              팔레트 / 적재 정보
            </div>
            <div style={cardStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>팔레트 수</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {data.palletCount ?? '-'}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>개</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>예상 중량</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {data.totalWeightKg ? fmt(data.totalWeightKg) : '-'}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>kg</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>팔레트 규격</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>T11 (1100x1100)</div>
                </div>
              </div>
              <div style={{ marginTop: 14, padding: '10px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <MapPin size={14} style={{ color: 'var(--accent-blue)' }} />
                  입고 위치 배정: A동 랙 B-12 ~ B-15 (4열), 1~2단
                </div>
              </div>
            </div>
          </div>

          {/* 섹션 3: 배송 기사 정보 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Truck size={16} style={{ color: 'var(--accent-green)' }} />
              배송 기사
            </div>
            <div style={cardStyle}>
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
                      <button
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          backgroundColor: 'var(--accent-green)', color: '#fff',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
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
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
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

          {/* 섹션 4: 타임라인 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Clock size={16} style={{ color: 'var(--accent-blue)' }} />
              처리 타임라인
            </div>
            <div style={cardStyle}>
              {data.timeline.map((step, idx) => {
                const isLast = idx === data.timeline.length - 1;
                // 타임라인 아이콘 색상
                let dotColor = 'var(--border-default)';
                let dotIcon = '⬜';
                if (step.status === 'done') {
                  dotColor = 'var(--accent-green)';
                  dotIcon = '✅';
                } else if (step.status === 'current') {
                  dotColor = 'var(--accent-blue)';
                  dotIcon = '🔄';
                }

                return (
                  <div key={idx} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    {/* 수직선 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, lineHeight: '24px' }}>{dotIcon}</span>
                      {!isLast && (
                        <div style={{
                          flex: 1, width: 2, minHeight: 20,
                          backgroundColor: step.status === 'done' ? 'var(--accent-green)' : 'var(--border-muted)',
                        }} />
                      )}
                    </div>
                    {/* 내용 */}
                    <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1 }}>
                      <div style={{
                        fontSize: 13, fontWeight: step.status === 'current' ? 700 : 400,
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

        {/* ===== 하단 액션 버튼 (상태에 따라 조건부 렌더링) ===== */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          gap: 10,
          flexShrink: 0,
        }}>
          {/* 도착 확인: ORDERED / IN_TRANSIT 상태에서만 */}
          {(data.status === 'ORDERED' || data.status === 'IN_TRANSIT') && onArrive && (
            <button style={btnPrimary} onClick={() => { onArrive(data.id); handleClose(); }}>
              <CheckCircle size={14} /> 도착 확인
            </button>
          )}
          {/* QC 통과: QC_PENDING 상태에서만 */}
          {data.status === 'QC_PENDING' && onQcPass && (
            <button style={btnSecondary} onClick={() => { onQcPass(data.id); handleClose(); }}>
              <ClipboardCheck size={14} /> QC 통과 처리
            </button>
          )}
          {/* 도착 취소: ARRIVED / QC_PENDING 상태에서만 */}
          {(data.status === 'ARRIVED' || data.status === 'QC_PENDING') && onCancelArrive && (
            <button style={btnDanger} onClick={() => { onCancelArrive(data.id); handleClose(); }}>
              <XCircle size={14} /> 도착 취소
            </button>
          )}
          {/* 완료 상태일 때는 닫기 버튼만 */}
          {(data.status === 'STOCKED' || data.status === 'QC_PASSED') && (
            <button style={btnSecondary} onClick={handleClose}>
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
