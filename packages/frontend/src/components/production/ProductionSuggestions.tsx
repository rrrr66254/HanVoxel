/**
 * 생산 계획 추천 패널
 *
 * 확정된 수주(Sales Order)로부터 AI가 자동 생성한
 * 생산 계획 추천을 확인하고 수락/거절할 수 있는 모달 컴포넌트.
 */
import React, { useState, useMemo } from 'react';
import {
  X, CheckCircle, XCircle, AlertTriangle, Clock, Package,
  Calendar, Cpu, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── 타입 정의 ──────────────────────────────────────

interface Suggestion {
  id: string;
  salesOrderId: string;
  salesOrderNo: string;
  productSku: string;
  productName: string | null;
  requiredQty: number;
  deliveryDeadline: string | null;
  recommendedStartAt: string | null;
  recommendedEndAt: string | null;
  recommendedWorkCenterId: string | null;
  recommendedWorkCenterName: string | null;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'NORMAL';
  feasibility: 'FEASIBLE' | 'MATERIAL_SHORT' | 'CAPACITY_FULL';
  reason: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SCHEDULED';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ── 긴급도 스타일 매핑 ─────────────────────────────

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: 'var(--accent-red)', text: '#ffffff', label: '긴급' },
  HIGH:     { bg: 'var(--accent-orange)', text: '#ffffff', label: '높음' },
  NORMAL:   { bg: 'var(--accent-blue)', text: '#ffffff', label: '보통' },
};

// ── 실행 가능성 스타일 매핑 ─────────────────────────

const FEASIBILITY_STYLES: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  FEASIBLE:       { bg: '#10b98120', text: 'var(--accent-green)', label: '실행 가능', icon: <CheckCircle size={12} /> },
  MATERIAL_SHORT: { bg: '#eab30820', text: 'var(--accent-orange)', label: '자재 부족', icon: <AlertTriangle size={12} /> },
  CAPACITY_FULL:  { bg: '#ef444420', text: 'var(--accent-red)', label: '용량 초과', icon: <XCircle size={12} /> },
};

// ── 필터 탭 ────────────────────────────────────────

type FilterTab = 'ALL' | 'CRITICAL' | 'HIGH' | 'NORMAL';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'CRITICAL', label: '긴급' },
  { key: 'HIGH', label: '높음' },
  { key: 'NORMAL', label: '보통' },
];

// ── 목업 데이터 ────────────────────────────────────

const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: 'sug-001',
    salesOrderId: 'so-1',
    salesOrderNo: 'SO-20260318-001',
    productSku: 'BP-2891',
    productName: '브레이크 패드 (프리미엄)',
    requiredQty: 500,
    deliveryDeadline: '2026-03-21T17:00:00Z',
    recommendedStartAt: '2026-03-18T09:00:00Z',
    recommendedEndAt: '2026-03-20T17:00:00Z',
    recommendedWorkCenterId: 'wc-1',
    recommendedWorkCenterName: '1호 프레스',
    urgencyLevel: 'CRITICAL',
    feasibility: 'FEASIBLE',
    reason: '수주 SO-20260318-001 확정 → 생산 필요\n납기까지 3일 이내 — 긴급 대응 필요',
    status: 'PENDING',
  },
  {
    id: 'sug-002',
    salesOrderId: 'so-2',
    salesOrderNo: 'SO-20260317-003',
    productSku: 'EV-1024',
    productName: '엔진 밸브 (스틸)',
    requiredQty: 200,
    deliveryDeadline: '2026-03-25T17:00:00Z',
    recommendedStartAt: '2026-03-19T08:00:00Z',
    recommendedEndAt: '2026-03-23T16:00:00Z',
    recommendedWorkCenterId: 'wc-4',
    recommendedWorkCenterName: '조립 라인 B',
    urgencyLevel: 'HIGH',
    feasibility: 'MATERIAL_SHORT',
    reason: '수주 SO-20260317-003 확정 → 생산 필요\n납기까지 7일 이내 — 우선 처리 권장\nBOM 자재 재고 부족 — 자재 확보 후 착수',
    status: 'PENDING',
  },
  {
    id: 'sug-003',
    salesOrderId: 'so-3',
    salesOrderNo: 'SO-20260316-005',
    productSku: 'SA-4410',
    productName: '서스펜션 암 (좌측)',
    requiredQty: 150,
    deliveryDeadline: '2026-03-20T17:00:00Z',
    recommendedStartAt: '2026-03-18T08:00:00Z',
    recommendedEndAt: '2026-03-19T16:00:00Z',
    recommendedWorkCenterId: 'wc-2',
    recommendedWorkCenterName: '용접 라인 A',
    urgencyLevel: 'CRITICAL',
    feasibility: 'CAPACITY_FULL',
    reason: '수주 SO-20260316-005 확정 → 생산 필요\n납기까지 3일 이내 — 긴급 대응 필요\n작업장 가용 용량 초과 — 일정 조율 필요',
    status: 'PENDING',
  },
  {
    id: 'sug-004',
    salesOrderId: 'so-4',
    salesOrderNo: 'SO-20260315-002',
    productSku: 'EM-7722',
    productName: '배기 매니폴드',
    requiredQty: 80,
    deliveryDeadline: '2026-03-28T17:00:00Z',
    recommendedStartAt: '2026-03-21T09:00:00Z',
    recommendedEndAt: '2026-03-25T17:00:00Z',
    recommendedWorkCenterId: 'wc-1',
    recommendedWorkCenterName: '1호 프레스',
    urgencyLevel: 'NORMAL',
    feasibility: 'FEASIBLE',
    reason: '수주 SO-20260315-002 확정 → 생산 필요',
    status: 'PENDING',
  },
  {
    id: 'sug-005',
    salesOrderId: 'so-5',
    salesOrderNo: 'SO-20260318-004',
    productSku: 'TH-3305',
    productName: '터보차저 하우징',
    requiredQty: 60,
    deliveryDeadline: '2026-03-24T17:00:00Z',
    recommendedStartAt: '2026-03-19T09:00:00Z',
    recommendedEndAt: '2026-03-22T17:00:00Z',
    recommendedWorkCenterId: 'wc-2',
    recommendedWorkCenterName: '용접 라인 A',
    urgencyLevel: 'HIGH',
    feasibility: 'FEASIBLE',
    reason: '수주 SO-20260318-004 확정 → 생산 필요\n납기까지 7일 이내 — 우선 처리 권장',
    status: 'PENDING',
  },
  {
    id: 'sug-006',
    salesOrderId: 'so-6',
    salesOrderNo: 'SO-20260314-001',
    productSku: 'CB-9901',
    productName: '실린더 블록',
    requiredQty: 30,
    deliveryDeadline: '2026-04-05T17:00:00Z',
    recommendedStartAt: '2026-03-25T09:00:00Z',
    recommendedEndAt: '2026-04-02T17:00:00Z',
    recommendedWorkCenterId: 'wc-3',
    recommendedWorkCenterName: '도장 공정',
    urgencyLevel: 'NORMAL',
    feasibility: 'FEASIBLE',
    reason: '수주 SO-20260314-001 확정 → 생산 필요',
    status: 'PENDING',
  },
];

// ── 날짜 포맷 헬퍼 ─────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${h}:${min}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${m}/${day} (${weekdays[d.getDay()]})`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── 메인 컴포넌트 ──────────────────────────────────

export function ProductionSuggestions({ isOpen, onClose }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 필터링된 추천 목록
  const filtered = useMemo(() => {
    let list = suggestions.filter((s) => s.status === 'PENDING');
    if (activeTab !== 'ALL') {
      list = list.filter((s) => s.urgencyLevel === activeTab);
    }
    return list;
  }, [suggestions, activeTab]);

  // 긴급도별 카운트
  const counts = useMemo(() => {
    const pending = suggestions.filter((s) => s.status === 'PENDING');
    return {
      ALL: pending.length,
      CRITICAL: pending.filter((s) => s.urgencyLevel === 'CRITICAL').length,
      HIGH: pending.filter((s) => s.urgencyLevel === 'HIGH').length,
      NORMAL: pending.filter((s) => s.urgencyLevel === 'NORMAL').length,
    };
  }, [suggestions]);

  // 토스트 표시
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 수락 처리
  const handleAccept = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'ACCEPTED' as const } : s)),
    );
    const item = suggestions.find((s) => s.id === id);
    showToast(`${item?.productName ?? item?.productSku} — 생산 계획에 추가되었습니다`);
  };

  // 거절 처리
  const handleReject = () => {
    if (!rejectModalId) return;
    setSuggestions((prev) =>
      prev.map((s) => (s.id === rejectModalId ? { ...s, status: 'REJECTED' as const } : s)),
    );
    setRejectModalId(null);
    setRejectReason('');
    showToast('추천이 보류되었습니다');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
          borderRadius: 12, width: 720, maxHeight: '88vh', display: 'flex',
          flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-default)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={18} style={{ color: 'var(--accent-blue)' }} />
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              생산 계획 추천
            </h2>
            {counts.ALL > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 22, height: 22, borderRadius: 11, padding: '0 7px',
                background: 'var(--accent-blue)', color: '#ffffff', fontSize: 11, fontWeight: 700,
              }}>
                {counts.ALL}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 필터 탭 ── */}
        <div style={{
          display: 'flex', gap: 4, padding: '10px 20px',
          borderBottom: '1px solid var(--border-muted)', flexShrink: 0,
        }}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 6,
                  background: isActive ? 'var(--accent-blue)' : 'var(--bg-primary)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border-default)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── 추천 카드 목록 ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {filtered.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14,
            }}>
              <Package size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div>대기 중인 추천이 없습니다</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((sug) => {
              const urgency = URGENCY_STYLES[sug.urgencyLevel] || URGENCY_STYLES.NORMAL;
              const feas = FEASIBILITY_STYLES[sug.feasibility] || FEASIBILITY_STYLES.FEASIBLE;
              const days = daysUntil(sug.deliveryDeadline);
              const isExpanded = expandedId === sug.id;

              return (
                <div
                  key={sug.id}
                  style={{
                    background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
                    borderRadius: 8, overflow: 'hidden',
                    borderLeft: `4px solid ${urgency.bg}`,
                    transition: 'box-shadow 0.15s',
                  }}
                >
                  {/* 카드 메인 영역 */}
                  <div style={{ padding: '14px 16px' }}>
                    {/* 상단: 수주번호 + 뱃지 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                          {sug.salesOrderNo}
                        </span>
                        {/* 긴급도 뱃지 */}
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: urgency.bg, color: urgency.text,
                        }}>
                          {urgency.label}
                        </span>
                        {/* 실행 가능성 뱃지 */}
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                          background: feas.bg, color: feas.text,
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}>
                          {feas.icon} {feas.label}
                        </span>
                      </div>
                      {/* 납기 D-day */}
                      {days !== null && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: days <= 3 ? 'var(--accent-red)' : days <= 7 ? 'var(--accent-orange)' : 'var(--text-muted)',
                        }}>
                          {days <= 0 ? 'D-Day' : `D-${days}`}
                        </span>
                      )}
                    </div>

                    {/* 제품명 + SKU */}
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {sug.productName ?? sug.productSku}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                      SKU: {sug.productSku}
                    </div>

                    {/* 핵심 정보 그리드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <InfoCell icon={<Package size={12} />} label="필요 수량" value={`${sug.requiredQty.toLocaleString()}개`} />
                      <InfoCell icon={<Calendar size={12} />} label="납기" value={formatDate(sug.deliveryDeadline)} />
                      <InfoCell icon={<Cpu size={12} />} label="추천 작업장" value={sug.recommendedWorkCenterName ?? '-'} />
                    </div>

                    {/* AI 추천 일정 */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 12, marginBottom: 10,
                    }}>
                      <Clock size={12} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)' }}>추천 일정:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {formatDateTime(sug.recommendedStartAt)} ~ {formatDateTime(sug.recommendedEndAt)}
                      </span>
                    </div>

                    {/* 상세 토글 + 액션 버튼 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : sug.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, padding: 0,
                        }}
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isExpanded ? '접기' : '추천 사유 보기'}
                      </button>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => setRejectModalId(sug.id)}
                          style={{
                            padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', border: '1px solid var(--border-default)',
                            background: 'transparent', color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <XCircle size={13} /> 보류
                        </button>
                        <button
                          onClick={() => handleAccept(sug.id)}
                          style={{
                            padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', border: 'none',
                            background: 'var(--accent-blue)', color: '#ffffff',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <CheckCircle size={13} /> 생산 계획에 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 확장 영역: 추천 사유 */}
                  {isExpanded && sug.reason && (
                    <div style={{
                      padding: '10px 16px 14px', borderTop: '1px solid var(--border-muted)',
                      background: 'var(--bg-secondary)',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        추천 사유
                      </div>
                      {sug.reason.split('\n').map((line, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, paddingLeft: 8 }}>
                          {line.startsWith('[') ? (
                            <span style={{ color: 'var(--accent-orange)' }}>{line}</span>
                          ) : (
                            <>&#8226; {line}</>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 거절 사유 입력 모달 ── */}
      {rejectModalId && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          }}
          onClick={() => { setRejectModalId(null); setRejectReason(''); }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
              borderRadius: 10, padding: 20, width: 380,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              보류 사유 입력
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="보류 사유를 입력하세요 (선택사항)"
              rows={3}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: '1px solid var(--border-default)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: 13, resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => { setRejectModalId(null); setRejectReason(''); }}
                style={{
                  padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border-default)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                취소
              </button>
              <button
                onClick={handleReject}
                style={{
                  padding: '7px 16px', borderRadius: 6, border: 'none',
                  background: 'var(--accent-red)', color: '#ffffff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                보류 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 토스트 알림 ── */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--accent-green)', color: '#ffffff', zIndex: 1200,
          boxShadow: '0 4px 16px rgba(0,0,0,.2)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeInUp 0.25s ease-out',
        }}>
          <CheckCircle size={16} />
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// ── 정보 셀 서브 컴포넌트 ──────────────────────────

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
