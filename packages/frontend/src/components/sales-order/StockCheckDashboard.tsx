/**
 * HanVoxel — 재고 더블체크 대시보드 (다크 테마)
 *
 * 기능:
 *   - 더블체크 요청 목록
 *   - 자재별 시스템 재고 vs 실물 수량 입력
 *   - 확인 완료 / 수량 불일치 발견 처리
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  PackageCheck,
} from 'lucide-react';
import type { StockCheckRequest } from '../../api/sales-order-api';

// --- 디자인 토큰 ---
const C = {
  bg: 'var(--bg-primary)', card: 'var(--bg-secondary)', border: 'var(--border-default)',
  text: 'var(--text-primary)', textMuted: 'var(--text-secondary)', accent: 'var(--accent-blue)',
  green: 'var(--accent-green)', yellow: 'var(--accent-orange)', red: 'var(--accent-red)',
  purple: 'var(--accent-purple)',
} as const;

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: '대기', color: C.yellow, icon: <Clock size={14} /> },
  IN_PROGRESS: { label: '확인중', color: C.accent, icon: <Search size={14} /> },
  CONFIRMED: { label: '확인완료', color: C.green, icon: <CheckCircle2 size={14} /> },
  DISCREPANCY_FOUND: { label: '불일치', color: C.red, icon: <XCircle size={14} /> },
};

// --- Mock 데이터 ---
const MOCK_CHECKS: StockCheckRequest[] = [
  {
    id: 'sc-1', mrpResultId: 'mrp-1', salesOrderId: 'so-2',
    assignedTo: null, requestedAt: '2026-03-16T14:00:00Z',
    respondedAt: null, actualQty: null, discrepancy: null,
    status: 'PENDING', notes: null,
    mrpResult: { materialSku: 'MAT-LI-001', materialName: '리튬 원료 (Li₂CO₃)', currentStock: 80, requiredQty: 250, shortageQty: 170 },
    salesOrder: { orderNo: 'SO-20260315-0001', customerName: 'BMW Munich', deliveryDeadline: '2026-03-28' },
  },
  {
    id: 'sc-2', mrpResultId: 'mrp-3', salesOrderId: 'so-2',
    assignedTo: null, requestedAt: '2026-03-16T14:00:00Z',
    respondedAt: null, actualQty: null, discrepancy: null,
    status: 'PENDING', notes: null,
    mrpResult: { materialSku: 'MAT-CO-001', materialName: '코발트 분말 (Co)', currentStock: 30, requiredQty: 100, shortageQty: 70 },
    salesOrder: { orderNo: 'SO-20260315-0001', customerName: 'BMW Munich', deliveryDeadline: '2026-03-28' },
  },
  {
    id: 'sc-3', mrpResultId: 'mrp-4', salesOrderId: 'so-1',
    assignedTo: '박재고', requestedAt: '2026-03-17T10:00:00Z',
    respondedAt: '2026-03-17T11:30:00Z', actualQty: 75, discrepancy: -5,
    status: 'DISCREPANCY_FOUND', notes: '실물 확인 결과 5kg 부족',
    mrpResult: { materialSku: 'MAT-ST-001', materialName: '철판', currentStock: 80, requiredQty: 200, shortageQty: 120 },
    salesOrder: { orderNo: 'SO-20260317-0001', customerName: '현대모비스', deliveryDeadline: '2026-03-25' },
  },
];

interface StockCheckDashboardProps {
  onBack: () => void;
}

export function StockCheckDashboard({ onBack }: StockCheckDashboardProps) {
  const [checks, setChecks] = useState<StockCheckRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [checkInputs, setCheckInputs] = useState<Record<string, { qty: string; notes: string }>>({});

  useEffect(() => {
    (async () => {
      try {
        const { getStockChecks } = await import('../../api/sales-order-api');
        const res = await getStockChecks('demo', statusFilter || undefined);
        if (res.checks.length > 0) { setChecks(res.checks); return; }
      } catch { /* mock */ }
      let filtered = MOCK_CHECKS;
      if (statusFilter) filtered = filtered.filter((c) => c.status === statusFilter);
      setChecks(filtered);
    })();
  }, [statusFilter]);

  const handleConfirm = useCallback(async (checkId: string) => {
    const input = checkInputs[checkId];
    if (!input?.qty) return;
    const actualQty = Number(input.qty);

    try {
      const { confirmStockCheck } = await import('../../api/sales-order-api');
      await confirmStockCheck(checkId, actualQty, input.notes || undefined);
    } catch { /* mock */ }

    setChecks((prev) => prev.map((c) => {
      if (c.id !== checkId) return c;
      const systemQty = c.mrpResult?.currentStock ?? 0;
      const disc = actualQty - systemQty;
      return {
        ...c,
        actualQty,
        discrepancy: disc,
        status: Math.abs(disc) > 0.01 ? 'DISCREPANCY_FOUND' : 'CONFIRMED',
        respondedAt: new Date().toISOString(),
        notes: input.notes || null,
      };
    }));
  }, [checkInputs]);

  const inputStyle: React.CSSProperties = {
    padding: '5px 8px', fontSize: 12, width: 80,
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4,
    color: C.text, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '24px 28px', background: C.bg, minHeight: '100%' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <PackageCheck size={22} style={{ color: C.green }} />
        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>재고 더블체크</h2>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[{ v: '', l: '전체' }, { v: 'PENDING', l: '대기' }, { v: 'CONFIRMED', l: '확인완료' }, { v: 'DISCREPANCY_FOUND', l: '불일치' }].map((f) => (
          <button key={f.v} onClick={() => setStatusFilter(f.v)} style={{
            padding: '4px 12px', fontSize: 12, borderRadius: 6,
            border: `1px solid ${statusFilter === f.v ? C.accent : C.border}`,
            background: statusFilter === f.v ? `${C.accent}22` : 'transparent',
            color: statusFilter === f.v ? C.accent : C.textMuted, cursor: 'pointer',
          }}>{f.l}</button>
        ))}
      </div>

      {/* 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: '대기', count: MOCK_CHECKS.filter((c) => c.status === 'PENDING').length, color: C.yellow },
          { label: '확인 완료', count: MOCK_CHECKS.filter((c) => c.status === 'CONFIRMED').length, color: C.green },
          { label: '불일치 발견', count: MOCK_CHECKS.filter((c) => c.status === 'DISCREPANCY_FOUND').length, color: C.red },
        ].map((s) => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* 체크 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checks.map((check) => {
          const st = STATUS_MAP[check.status] ?? { label: check.status, color: C.textMuted, icon: null };
          const isPending = check.status === 'PENDING' || check.status === 'IN_PROGRESS';
          const inp = checkInputs[check.id] ?? { qty: '', notes: '' };

          return (
            <div key={check.id} style={{
              background: C.card, border: `1px solid ${check.status === 'DISCREPANCY_FOUND' ? C.red : C.border}`,
              borderRadius: 10, padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${st.color}22`, color: st.color, fontWeight: 600 }}>
                      {st.icon} {st.label}
                    </span>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{check.salesOrder?.orderNo}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>({check.salesOrder?.customerName})</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    {check.mrpResult?.materialSku} — {check.mrpResult?.materialName}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    납기: {check.salesOrder?.deliveryDeadline ?? '—'} · 요청: {new Date(check.requestedAt).toLocaleString('ko-KR')}
                  </div>
                </div>

                {/* 재고 수치 */}
                <div style={{ display: 'flex', gap: 16, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>시스템 재고</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{check.mrpResult?.currentStock ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>필요량</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>{check.mrpResult?.requiredQty ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>부족량</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>{check.mrpResult?.shortageQty ?? '—'}</div>
                  </div>
                </div>
              </div>

              {/* 확인 입력 폼 (대기 상태) */}
              {isPending && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>실물 수량:</span>
                  <input
                    type="number"
                    value={inp.qty}
                    onChange={(e) => setCheckInputs((prev) => ({ ...prev, [check.id]: { ...inp, qty: e.target.value } }))}
                    style={inputStyle}
                    placeholder="0"
                  />
                  <input
                    value={inp.notes}
                    onChange={(e) => setCheckInputs((prev) => ({ ...prev, [check.id]: { ...inp, notes: e.target.value } }))}
                    style={{ ...inputStyle, width: 200 }}
                    placeholder="메모 (선택)"
                  />
                  <button
                    onClick={() => handleConfirm(check.id)}
                    disabled={!inp.qty}
                    style={{
                      padding: '5px 12px', fontSize: 11, borderRadius: 4,
                      background: inp.qty ? `${C.green}22` : `${C.border}44`,
                      color: inp.qty ? C.green : C.textMuted,
                      border: `1px solid ${inp.qty ? `${C.green}44` : C.border}`,
                      cursor: inp.qty ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <CheckCircle2 size={12} /> 확인 완료
                  </button>
                </div>
              )}

              {/* 결과 표시 (응답 완료) */}
              {!isPending && check.actualQty !== null && (
                <div style={{ paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: C.textMuted }}>실물 수량: </span>
                    <span style={{ color: C.text, fontWeight: 600 }}>{check.actualQty}</span>
                  </div>
                  {check.discrepancy !== null && check.discrepancy !== 0 && (
                    <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={12} style={{ color: C.red }} />
                      <span style={{ color: C.red }}>차이: {check.discrepancy > 0 ? '+' : ''}{check.discrepancy}</span>
                    </div>
                  )}
                  {check.notes && (
                    <div style={{ fontSize: 11, color: C.textMuted }}>메모: {check.notes}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {checks.length === 0 && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, fontSize: 14 }}>
            더블체크 요청이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
