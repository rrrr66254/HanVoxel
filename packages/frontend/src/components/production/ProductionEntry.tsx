import React, { useState, useCallback } from 'react';
import { ChevronDown, Play, Pause, Square, Plus, Minus, AlertTriangle, Clock, CheckCircle, Circle } from 'lucide-react';

// --- 목 데이터 ---
const MOCK_ACTIVE_WO = {
  id: 'wo-1',
  orderNo: 'WO-20260318-001',
  productName: '브레이크 패드 세트',
  workCenterName: '1호 프레스',
  plannedQty: 180,
  actualQty: 72,
  defectQty: 3,
  status: 'IN_PROGRESS',
  startedAt: '2026-03-18T09:00:00',
  currentProcess: '용접',
  processes: [
    { name: '프레스', status: 'DONE' },
    { name: '용접', status: 'IN_PROGRESS' },
    { name: '도장', status: 'PENDING' },
    { name: '검사', status: 'PENDING' },
  ],
};

const MOCK_LOGS = [
  { id: 'l1', logType: 'PROGRESS', qtyProduced: 72, qtyDefect: 0, worker: '김철수', loggedAt: '2026-03-18T12:30:00', notes: null as string | null },
  { id: 'l2', logType: 'DEFECT', qtyProduced: null as number | null, qtyDefect: 2, worker: '이영희', loggedAt: '2026-03-18T11:45:00', notes: '용접 불량' },
  { id: 'l3', logType: 'PROGRESS', qtyProduced: 50, qtyDefect: 0, worker: '김철수', loggedAt: '2026-03-18T11:00:00', notes: null },
  { id: 'l4', logType: 'DEFECT', qtyProduced: null, qtyDefect: 1, worker: '김철수', loggedAt: '2026-03-18T10:15:00', notes: '치수 불량' },
  { id: 'l5', logType: 'START', qtyProduced: null, qtyDefect: null, worker: '김철수', loggedAt: '2026-03-18T09:00:00', notes: '작업 시작' },
];

const MOCK_WO_LIST = [
  { id: 'wo-1', orderNo: 'WO-20260318-001', productName: '브레이크 패드 세트' },
  { id: 'wo-2', orderNo: 'WO-20260318-002', productName: '엔진 밸브 세트' },
  { id: 'wo-3', orderNo: 'WO-20260318-003', productName: '서스펜션 암' },
];

const DEFECT_CODES = [
  { code: 'DIM', name: '치수불량' },
  { code: 'SUR', name: '표면결함' },
  { code: 'WEL', name: '용접불량' },
  { code: 'ASM', name: '조립오류' },
  { code: 'MAT', name: '재료불량' },
  { code: 'ETC', name: '기타' },
];

// --- 로그 타입 배지 색상 ---
const LOG_TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  PROGRESS: { bg: 'var(--accent-blue)', label: '생산' },
  DEFECT: { bg: 'var(--accent-red)', label: '불량' },
  START: { bg: 'var(--accent-green)', label: '시작' },
  PAUSE: { bg: 'var(--accent-orange)', label: '일시정지' },
  COMPLETE: { bg: 'var(--accent-blue)', label: '완료' },
};

// --- 시간 포맷 ---
function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// --- 공정 상태 아이콘 ---
function ProcessIcon({ status }: { status: string }) {
  if (status === 'DONE') return <CheckCircle size={16} style={{ color: 'var(--accent-green)' }} />;
  if (status === 'IN_PROGRESS') return <Clock size={16} style={{ color: 'var(--accent-orange)' }} />;
  return <Circle size={16} style={{ color: 'var(--text-muted)' }} />;
}

interface ProductionEntryProps {
  onBack: () => void;
}

export function ProductionEntry({ onBack }: ProductionEntryProps) {
  const [selectedWoId, setSelectedWoId] = useState(MOCK_ACTIVE_WO.id);
  const [woDropdownOpen, setWoDropdownOpen] = useState(false);
  const [produceQty, setProduceQty] = useState(0);
  const [defectQty, setDefectQty] = useState(0);
  const [selectedDefectCode, setSelectedDefectCode] = useState<string | null>(null);
  const [defectNotes, setDefectNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [woStatus, setWoStatus] = useState(MOCK_ACTIVE_WO.status);
  const [actualQty, setActualQty] = useState(MOCK_ACTIVE_WO.actualQty);
  const [woDefectQty, setWoDefectQty] = useState(MOCK_ACTIVE_WO.defectQty);
  const [logs, setLogs] = useState(MOCK_LOGS);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const wo = MOCK_ACTIVE_WO;
  const progressPct = Math.round((actualQty / wo.plannedQty) * 100);
  const selectedWo = MOCK_WO_LIST.find(w => w.id === selectedWoId);

  // 수량 증감 핸들러
  const adjustQty = useCallback((type: 'produce' | 'defect', delta: number) => {
    if (type === 'produce') {
      setProduceQty(prev => Math.max(0, prev + delta));
    } else {
      setDefectQty(prev => Math.max(0, prev + delta));
    }
  }, []);

  // 작업 액션 확인
  const handleActionConfirm = useCallback(() => {
    const now = new Date().toISOString();
    if (confirmAction === 'start') {
      setWoStatus('IN_PROGRESS');
      setLogs(prev => [{ id: `l-${Date.now()}`, logType: 'START', qtyProduced: null, qtyDefect: null, worker: '현재 사용자', loggedAt: now, notes: '작업 시작' }, ...prev]);
      setSuccessMsg('작업이 시작되었습니다.');
    } else if (confirmAction === 'pause') {
      setWoStatus('PAUSED');
      setLogs(prev => [{ id: `l-${Date.now()}`, logType: 'PAUSE', qtyProduced: null, qtyDefect: null, worker: '현재 사용자', loggedAt: now, notes: '작업 일시정지' }, ...prev]);
      setSuccessMsg('작업이 일시정지되었습니다.');
    } else if (confirmAction === 'complete') {
      setWoStatus('COMPLETED');
      setLogs(prev => [{ id: `l-${Date.now()}`, logType: 'COMPLETE', qtyProduced: null, qtyDefect: null, worker: '현재 사용자', loggedAt: now, notes: '작업 완료' }, ...prev]);
      setSuccessMsg('작업이 완료 처리되었습니다.');
    }
    setConfirmAction(null);
    setTimeout(() => setSuccessMsg(null), 3000);
  }, [confirmAction]);

  // 기록 제출
  const handleSubmit = useCallback(() => {
    const now = new Date().toISOString();
    if (produceQty > 0) {
      setActualQty(prev => prev + produceQty);
      setLogs(prev => [{ id: `l-${Date.now()}`, logType: 'PROGRESS', qtyProduced: produceQty, qtyDefect: 0, worker: '현재 사용자', loggedAt: now, notes: null }, ...prev]);
    }
    if (defectQty > 0) {
      setWoDefectQty(prev => prev + defectQty);
      const defectName = DEFECT_CODES.find(d => d.code === selectedDefectCode)?.name || '';
      setLogs(prev => [{ id: `l-${Date.now()+1}`, logType: 'DEFECT', qtyProduced: null, qtyDefect: defectQty, worker: '현재 사용자', loggedAt: now, notes: defectName + (defectNotes ? ` — ${defectNotes}` : '') }, ...prev]);
    }
    setSuccessMsg(`기록 완료: 생산 ${produceQty}개, 불량 ${defectQty}개`);
    setProduceQty(0);
    setDefectQty(0);
    setSelectedDefectCode(null);
    setDefectNotes('');
    setTimeout(() => setSuccessMsg(null), 3000);
  }, [produceQty, defectQty, selectedDefectCode, defectNotes]);

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* === 헤더 === */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, flex: 1 }}>실적 입력</h1>
        {/* 작업지시 선택 드롭다운 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setWoDropdownOpen(!woDropdownOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14 }}
          >
            {selectedWo?.orderNo || '작업지시 선택'}
            <ChevronDown size={16} />
          </button>
          {woDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, minWidth: 260, zIndex: 10, overflow: 'hidden' }}>
              {MOCK_WO_LIST.map(w => (
                <button
                  key={w.id}
                  onClick={() => { setSelectedWoId(w.id); setWoDropdownOpen(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', background: w.id === selectedWoId ? 'var(--bg-hover)' : 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid var(--border-muted)' }}
                >
                  <div style={{ fontWeight: 600 }}>{w.orderNo}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{w.productName}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* === 활성 작업지시 정보 카드 === */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{wo.orderNo}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{wo.productName}</div>
            </div>
            <span style={{ background: woStatus === 'IN_PROGRESS' ? 'var(--accent-green)' : woStatus === 'PAUSED' ? 'var(--accent-orange)' : woStatus === 'COMPLETED' ? 'var(--accent-blue)' : 'var(--text-muted)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
              {woStatus === 'IN_PROGRESS' ? '진행중' : woStatus === 'PAUSED' ? '일시정지' : woStatus === 'COMPLETED' ? '완료' : woStatus}
            </span>
          </div>
          {/* 대형 진행률 */}
          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <span style={{ fontSize: 40, fontWeight: 800 }}>{actualQty}</span>
            <span style={{ fontSize: 20, color: 'var(--text-muted)', margin: '0 6px' }}>/</span>
            <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>{wo.plannedQty}개</span>
            <span style={{ fontSize: 20, color: 'var(--accent-blue)', marginLeft: 12, fontWeight: 700 }}>({progressPct}%)</span>
          </div>
          {/* 진행 바 */}
          <div style={{ height: 14, background: 'var(--bg-primary)', borderRadius: 7, overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: 7, transition: 'width 0.3s' }} />
          </div>
          {/* 작업 정보 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16, fontSize: 14 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>작업장:</span> {wo.workCenterName}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>시작:</span> {formatTime(wo.startedAt)}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>불량:</span> <span style={{ color: 'var(--accent-red)' }}>{woDefectQty}개</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>현재 공정:</span> {wo.currentProcess}</div>
          </div>
          {/* 공정 단계 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {wo.processes.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'var(--bg-primary)', fontSize: 13 }}>
                <ProcessIcon status={p.status} />
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* === 액션 버튼 === */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <button
            onClick={() => setConfirmAction('start')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 64, fontSize: 18, fontWeight: 700, background: 'var(--accent-green)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
          >
            <Play size={22} /> 작업 시작
          </button>
          <button
            onClick={() => setConfirmAction('pause')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 64, fontSize: 18, fontWeight: 700, background: 'var(--accent-orange)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
          >
            <Pause size={22} /> 일시정지
          </button>
          <button
            onClick={() => setConfirmAction('complete')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 64, fontSize: 18, fontWeight: 700, background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
          >
            <Square size={22} /> 완료
          </button>
        </div>

        {/* === 수량 입력 섹션 === */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* 생산수량 */}
            <div>
              <label style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8, display: 'block' }}>생산수량</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <button onClick={() => adjustQty('produce', -1)} style={{ width: 52, height: 52, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '10px 0 0 10px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Minus size={22} />
                </button>
                <input
                  type="number"
                  value={produceQty}
                  onChange={e => setProduceQty(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ flex: 1, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderLeft: 'none', borderRight: 'none', color: 'var(--text-primary)', outline: 'none' }}
                />
                <button onClick={() => adjustQty('produce', 1)} style={{ width: 52, height: 52, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '0 10px 10px 0', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={22} />
                </button>
              </div>
            </div>
            {/* 불량수량 */}
            <div>
              <label style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8, display: 'block' }}>불량수량</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <button onClick={() => adjustQty('defect', -1)} style={{ width: 52, height: 52, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '10px 0 0 10px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Minus size={22} />
                </button>
                <input
                  type="number"
                  value={defectQty}
                  onChange={e => setDefectQty(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ flex: 1, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderLeft: 'none', borderRight: 'none', color: defectQty > 0 ? 'var(--accent-red)' : 'var(--text-primary)', outline: 'none' }}
                />
                <button onClick={() => adjustQty('defect', 1)} style={{ width: 52, height: 52, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '0 10px 10px 0', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={22} />
                </button>
              </div>
            </div>
          </div>

          {/* === 불량 코드 선택 (불량수량 > 0일 때 표시) === */}
          {defectQty > 0 && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border-muted)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} /> 불량 유형 선택
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {DEFECT_CODES.map(dc => (
                  <button
                    key={dc.code}
                    onClick={() => setSelectedDefectCode(selectedDefectCode === dc.code ? null : dc.code)}
                    style={{
                      minHeight: 48, fontSize: 15, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                      background: selectedDefectCode === dc.code ? 'var(--accent-red)' : 'var(--bg-secondary)',
                      color: selectedDefectCode === dc.code ? '#fff' : 'var(--text-primary)',
                      border: selectedDefectCode === dc.code ? '2px solid var(--accent-red)' : '1px solid var(--border-default)',
                    }}
                  >
                    {dc.name}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="불량 상세 메모 (선택)"
                value={defectNotes}
                onChange={e => setDefectNotes(e.target.value)}
                style={{ width: '100%', marginTop: 10, padding: 10, minHeight: 60, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* 기록 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={produceQty === 0 && defectQty === 0}
            style={{
              width: '100%', marginTop: 16, minHeight: 56, fontSize: 18, fontWeight: 700, borderRadius: 10, border: 'none', cursor: produceQty === 0 && defectQty === 0 ? 'not-allowed' : 'pointer',
              background: produceQty === 0 && defectQty === 0 ? 'var(--border-default)' : 'var(--accent-blue)',
              color: produceQty === 0 && defectQty === 0 ? 'var(--text-muted)' : '#fff',
            }}
          >
            기록
          </button>
        </div>

        {/* === 최근 로그 === */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>최근 기록</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {logs.slice(0, 10).map(log => {
              const style = LOG_TYPE_STYLES[log.logType] || LOG_TYPE_STYLES.PROGRESS;
              return (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 44, fontWeight: 500 }}>{formatTime(log.loggedAt)}</span>
                  <span style={{ background: style.bg, color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, minWidth: 48, textAlign: 'center' }}>{style.label}</span>
                  <span style={{ flex: 1, color: 'var(--text-secondary)' }}>
                    {log.qtyProduced != null && <span>{log.qtyProduced}개 생산</span>}
                    {log.qtyDefect != null && log.qtyDefect > 0 && <span style={{ color: 'var(--accent-red)' }}> 불량 {log.qtyDefect}개</span>}
                    {log.notes && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>— {log.notes}</span>}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{log.worker}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* === 성공 메시지 토스트 === */}
      {successMsg && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: 'var(--accent-green)', color: '#fff', padding: '12px 24px', borderRadius: 10, fontSize: 15, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* === 확인 다이얼로그 === */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setConfirmAction(null)}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 28, minWidth: 320, maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>
              {confirmAction === 'start' && '작업을 시작하시겠습니까?'}
              {confirmAction === 'pause' && '작업을 일시정지하시겠습니까?'}
              {confirmAction === 'complete' && '작업을 완료 처리하시겠습니까?'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px' }}>{wo.orderNo} — {wo.productName}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setConfirmAction(null)} style={{ flex: 1, minHeight: 48, fontSize: 16, fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 10, color: 'var(--text-primary)', cursor: 'pointer' }}>취소</button>
              <button onClick={handleActionConfirm} style={{
                flex: 1, minHeight: 48, fontSize: 16, fontWeight: 600, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
                background: confirmAction === 'start' ? 'var(--accent-green)' : confirmAction === 'pause' ? 'var(--accent-orange)' : 'var(--accent-blue)',
              }}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
