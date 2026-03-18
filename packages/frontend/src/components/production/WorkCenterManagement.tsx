import React, { useState } from 'react';
import {
  Plus, Factory, Wrench, Settings, AlertTriangle,
  Play, Pause, Clock, CheckCircle, XCircle, User, Calendar, X
} from 'lucide-react';

// --- 타입 정의 ---
interface WorkCenter {
  id: string;
  code: string;
  name: string;
  type: 'MACHINE' | 'MANUAL' | 'ASSEMBLY' | 'QC';
  capacityPerDay: number;
  status: 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'BREAKDOWN';
  responsibleUser: string;
  currentWo: string | null;
}

interface MaintenanceRecord {
  id: string;
  workCenterName: string;
  type: 'SCHEDULED' | 'BREAKDOWN' | 'PREVENTIVE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  scheduledAt: string | null;
  completedAt: string | null;
  downtimeMinutes: number;
  technician: string | null;
  cost: number | null;
  notes: string;
}

interface Props { onBack: () => void; }

// --- 목업 데이터 ---
const INITIAL_WORK_CENTERS: WorkCenter[] = [
  { id: 'wc-1', code: 'WC-001', name: '1호 프레스', type: 'MACHINE', capacityPerDay: 200, status: 'RUNNING', responsibleUser: '김철수', currentWo: 'WO-20260318-001' },
  { id: 'wc-2', code: 'WC-002', name: '용접 라인 A', type: 'MACHINE', capacityPerDay: 80, status: 'RUNNING', responsibleUser: '최준혁', currentWo: 'WO-20260318-003' },
  { id: 'wc-3', code: 'WC-003', name: '도장 공정', type: 'MACHINE', capacityPerDay: 150, status: 'BREAKDOWN', responsibleUser: '박민준', currentWo: null },
  { id: 'wc-4', code: 'WC-004', name: '조립 라인 B', type: 'ASSEMBLY', capacityPerDay: 120, status: 'RUNNING', responsibleUser: '이영희', currentWo: 'WO-20260318-002' },
  { id: 'wc-5', code: 'WC-005', name: '검사 공정', type: 'QC', capacityPerDay: 300, status: 'IDLE', responsibleUser: '한소정', currentWo: null },
  { id: 'wc-6', code: 'WC-006', name: '2호 프레스', type: 'MACHINE', capacityPerDay: 180, status: 'MAINTENANCE', responsibleUser: '김대현', currentWo: null },
];

const INITIAL_MAINTENANCE: MaintenanceRecord[] = [
  { id: 'm-1', workCenterName: '도장 공정', type: 'BREAKDOWN', status: 'IN_PROGRESS', scheduledAt: null, completedAt: null, downtimeMinutes: 120, technician: '정비팀 김기사', cost: null, notes: '스프레이 노즐 고장 — 부품 교체 중' },
  { id: 'm-2', workCenterName: '2호 프레스', type: 'SCHEDULED', status: 'IN_PROGRESS', scheduledAt: '2026-03-18T06:00:00', completedAt: null, downtimeMinutes: 60, technician: '정비팀 이기사', cost: 150000, notes: '정기 유압 점검' },
  { id: 'm-3', workCenterName: '1호 프레스', type: 'PREVENTIVE', status: 'COMPLETED', scheduledAt: '2026-03-15T06:00:00', completedAt: '2026-03-15T08:00:00', downtimeMinutes: 120, technician: '정비팀 김기사', cost: 200000, notes: '금형 교체' },
  { id: 'm-4', workCenterName: '용접 라인 A', type: 'SCHEDULED', status: 'PENDING', scheduledAt: '2026-03-20T06:00:00', completedAt: null, downtimeMinutes: 0, technician: null, cost: null, notes: '용접 팁 교체 예정' },
];

// --- 유틸 함수 ---
const STATUS_MAP: Record<WorkCenter['status'], { label: string; dot: string; color: string }> = {
  RUNNING:     { label: '가동중', dot: '🟢', color: 'var(--accent-green)' },
  IDLE:        { label: '유휴',   dot: '⚪', color: 'var(--text-muted)' },
  MAINTENANCE: { label: '점검중', dot: '🟡', color: 'var(--accent-orange)' },
  BREAKDOWN:   { label: '고장',   dot: '🔴', color: 'var(--accent-red)' },
};

const TYPE_LABEL: Record<WorkCenter['type'], string> = {
  MACHINE: '기계', MANUAL: '수작업', ASSEMBLY: '조립', QC: '검사',
};

const MT_TYPE_LABEL: Record<MaintenanceRecord['type'], { label: string; color: string }> = {
  SCHEDULED:  { label: '정기 점검', color: 'var(--accent-blue)' },
  BREAKDOWN:  { label: '고장 수리', color: 'var(--accent-red)' },
  PREVENTIVE: { label: '예방 정비', color: 'var(--accent-orange)' },
};

const MT_STATUS_LABEL: Record<MaintenanceRecord['status'], { label: string; color: string }> = {
  PENDING:     { label: '예정', color: 'var(--accent-blue)' },
  IN_PROGRESS: { label: '진행중', color: 'var(--accent-orange)' },
  COMPLETED:   { label: '완료', color: 'var(--accent-green)' },
};

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ko-KR') : '-';
const fmtCost = (c: number | null) => c != null ? `₩${c.toLocaleString()}` : '-';

// --- 공통 스타일 ---
const card: React.CSSProperties = {
  background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
  borderRadius: 8, padding: 16,
};
const badge = (color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 12,
  fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44`,
});
const btn = (bg: string): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
  fontSize: 12, fontWeight: 600, background: `${bg}22`, color: bg,
});
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
  border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)',
};

export function WorkCenterManagement({ onBack }: Props) {
  const [tab, setTab] = useState<'centers' | 'maintenance'>('centers');
  const [centers, setCenters] = useState<WorkCenter[]>(INITIAL_WORK_CENTERS);
  const [records, setRecords] = useState<MaintenanceRecord[]>(INITIAL_MAINTENANCE);
  const [showAddCenter, setShowAddCenter] = useState(false);
  const [showBreakdownReport, setShowBreakdownReport] = useState(false);

  // 작업장 추가 폼 상태
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<WorkCenter['type']>('MACHINE');
  const [formCap, setFormCap] = useState('');
  const [formUser, setFormUser] = useState('');

  // 작업장 상태 변경 핸들러
  const changeStatus = (id: string, status: WorkCenter['status']) => {
    setCenters(prev => prev.map(c => c.id === id ? { ...c, status, currentWo: status === 'RUNNING' ? c.currentWo : null } : c));
  };

  // 작업장 추가
  const addCenter = () => {
    if (!formCode || !formName || !formCap || !formUser) return;
    const newWc: WorkCenter = {
      id: `wc-${Date.now()}`, code: formCode, name: formName, type: formType,
      capacityPerDay: Number(formCap), status: 'IDLE', responsibleUser: formUser, currentWo: null,
    };
    setCenters(prev => [...prev, newWc]);
    setShowAddCenter(false);
    setFormCode(''); setFormName(''); setFormCap(''); setFormUser('');
  };

  // 유지보수 완료 처리
  const completeRecord = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'COMPLETED' as const, completedAt: new Date().toISOString() } : r));
  };

  // 고장 신고 추가
  const addBreakdownReport = (wcName: string, notes: string) => {
    const newRecord: MaintenanceRecord = {
      id: `m-${Date.now()}`,
      workCenterName: wcName,
      type: 'BREAKDOWN',
      status: 'IN_PROGRESS',
      scheduledAt: null,
      completedAt: null,
      downtimeMinutes: 0,
      technician: null,
      cost: null,
      notes,
    };
    setRecords(prev => [newRecord, ...prev]);
    // 해당 작업장 상태를 BREAKDOWN으로 변경
    setCenters(prev => prev.map(c => c.name === wcName ? { ...c, status: 'BREAKDOWN' as const, currentWo: null } : c));
    setShowBreakdownReport(false);
  };

  // 유지보수 요약
  const pending = records.filter(r => r.status === 'PENDING').length;
  const inProgress = records.filter(r => r.status === 'IN_PROGRESS').length;
  const completed = records.filter(r => r.status === 'COMPLETED').length;
  const totalDown = records.reduce((s, r) => s + r.downtimeMinutes, 0);

  return (
    <div style={{ padding: 24, color: 'var(--text-primary)', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Factory size={22} color="var(--accent-blue)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>작업장 / 설비 관리</h1>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-default)' }}>
        {([['centers', '작업장 관리'], ['maintenance', '설비 유지보수']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: tab === key ? 'var(--bg-secondary)' : 'transparent',
              color: tab === key ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--accent-blue)' : '2px solid transparent',
            }}>
            {key === 'centers' ? <Settings size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> : <Wrench size={14} style={{ marginRight: 6, verticalAlign: -2 }} />}
            {label}
          </button>
        ))}
      </div>

      {/* 탭 1: 작업장 관리 */}
      {tab === 'centers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>작업장 목록</h2>
            <button onClick={() => setShowAddCenter(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'var(--accent-blue)', color: '#fff' }}>
              <Plus size={14} /> 작업장 추가
            </button>
          </div>

          {/* 작업장 카드 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {centers.map(wc => {
              const st = STATUS_MAP[wc.status];
              return (
                <div key={wc.id} style={{ ...card }}>
                  {/* 상단: 코드 + 상태 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wc.code}</span>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{wc.name}</div>
                    </div>
                    <span style={badge(st.color)}>{st.dot} {st.label}</span>
                  </div>
                  {/* 타입 배지 */}
                  <span style={{ ...badge('var(--accent-blue)'), marginBottom: 10, display: 'inline-block' }}>{TYPE_LABEL[wc.type]}</span>
                  {/* 정보 행 */}
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    <div>일 생산능력: <strong style={{ color: 'var(--text-primary)' }}>{wc.capacityPerDay}개</strong></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={12} /> {wc.responsibleUser}
                    </div>
                    {wc.currentWo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)' }}>
                        <Play size={12} /> {wc.currentWo}
                      </div>
                    )}
                  </div>
                  {/* 상태 변경 버튼 */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    <button style={btn('var(--accent-green)')} onClick={() => changeStatus(wc.id, 'RUNNING')}>가동</button>
                    <button style={btn('var(--text-muted)')} onClick={() => changeStatus(wc.id, 'IDLE')}>유휴</button>
                    <button style={btn('var(--accent-orange)')} onClick={() => changeStatus(wc.id, 'MAINTENANCE')}>점검</button>
                    <button style={btn('var(--accent-red)')} onClick={() => changeStatus(wc.id, 'BREAKDOWN')}>고장신고</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 작업장 추가 모달 */}
          {showAddCenter && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
              onClick={() => setShowAddCenter(false)}>
              <div style={{ ...card, width: 400, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>작업장 추가</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input placeholder="코드 (예: WC-007)" value={formCode} onChange={e => setFormCode(e.target.value)} style={inputStyle} />
                  <input placeholder="작업장명" value={formName} onChange={e => setFormName(e.target.value)} style={inputStyle} />
                  <select value={formType} onChange={e => setFormType(e.target.value as WorkCenter['type'])} style={inputStyle}>
                    <option value="MACHINE">기계</option>
                    <option value="MANUAL">수작업</option>
                    <option value="ASSEMBLY">조립</option>
                    <option value="QC">검사</option>
                  </select>
                  <input type="number" placeholder="일 생산능력" value={formCap} onChange={e => setFormCap(e.target.value)} style={inputStyle} />
                  <input placeholder="담당자" value={formUser} onChange={e => setFormUser(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button onClick={() => setShowAddCenter(false)} style={{ ...btn('var(--text-muted)'), padding: '8px 16px', fontSize: 13 }}>취소</button>
                  <button onClick={addCenter} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'var(--accent-blue)', color: '#fff' }}>추가</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 탭 2: 설비 유지보수 */}
      {tab === 'maintenance' && (
        <>
          {/* 요약 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: '예정 점검', value: pending, icon: <Calendar size={18} />, color: 'var(--accent-blue)' },
              { label: '진행중', value: inProgress, icon: <Wrench size={18} />, color: 'var(--accent-orange)' },
              { label: '완료', value: completed, icon: <CheckCircle size={18} />, color: 'var(--accent-green)' },
              { label: '총 중단시간', value: `${totalDown}분`, icon: <Clock size={18} />, color: 'var(--accent-red)' },
            ].map((s, i) => (
              <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 고장 신고 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button onClick={() => setShowBreakdownReport(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'var(--accent-red)', color: '#fff' }}>
              <AlertTriangle size={14} /> 고장 신고
            </button>
          </div>

          {/* 유지보수 기록 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {records.map(r => {
              const mt = MT_TYPE_LABEL[r.type];
              const ms = MT_STATUS_LABEL[r.status];
              return (
                <div key={r.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* 상단 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{r.workCenterName}</span>
                      <span style={badge(mt.color)}>{mt.label}</span>
                      <span style={badge(ms.color)}>{ms.label}</span>
                    </div>
                    {(r.status === 'PENDING' || r.status === 'IN_PROGRESS') && (
                      <button onClick={() => completeRecord(r.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: 'var(--accent-green)', color: '#fff' }}>
                        <CheckCircle size={13} /> 완료 처리
                      </button>
                    )}
                  </div>
                  {/* 정보 행 */}
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 4 }}>
                    <div>예정일: {fmtDate(r.scheduledAt)}</div>
                    <div>완료일: {fmtDate(r.completedAt)}</div>
                    <div>중단시간: <strong style={{ color: r.downtimeMinutes > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{r.downtimeMinutes}분</strong></div>
                    <div>담당: {r.technician ?? '-'}</div>
                    <div>비용: {fmtCost(r.cost)}</div>
                  </div>
                  {/* 메모 */}
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>{r.notes}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 고장 신고 모달 */}
      {showBreakdownReport && (
        <BreakdownReportModal
          centers={centers}
          onClose={() => setShowBreakdownReport(false)}
          onSubmit={addBreakdownReport}
        />
      )}
    </div>
  );
}

/* ── 고장 신고 모달 ── */
function BreakdownReportModal({ centers, onClose, onSubmit }: {
  centers: WorkCenter[];
  onClose: () => void;
  onSubmit: (wcName: string, notes: string) => void;
}) {
  const [selectedWc, setSelectedWc] = useState(centers[0]?.name || '');
  const [notes, setNotes] = useState('');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} /> 고장 신고
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>작업장 *</label>
            <select value={selectedWc} onChange={e => setSelectedWc(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' as const, border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
              {centers.map(c => <option key={c.id} value={c.name}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>고장 내용 *</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="고장 증상 및 상황을 입력하세요"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' as const, border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: 80, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>취소</button>
          <button onClick={() => { if (selectedWc && notes) onSubmit(selectedWc, notes); }}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent-red)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> 신고 접수
          </button>
        </div>
      </div>
    </div>
  );
}
