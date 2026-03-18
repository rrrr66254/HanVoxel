import { useState, useEffect, useCallback } from 'react';

// ── 다크 테마 색상 상수 ──────────────────────────────────
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  hoverRow: '#1C2128',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  blue: '#58A6FF',
  green: '#3FB950',
  orange: '#D29922',
  red: '#F85149',
  purple: '#A371F7',
  gridLine: '#21262D',
} as const;

// ── 타입 정의 ─────────────────────────────────────────────

/** 부서 */
type Department = '생산1팀' | '생산2팀' | '물류팀' | '품질팀' | '설비팀';

/** 교대 근무 유형 */
type ShiftType = 'AM' | 'PM' | 'NIGHT' | 'OFF';

/** 자격증 */
interface Certification {
  name: string;
  expiryDate: string; // ISO date string
}

/** 작업자 */
interface Worker {
  id: string;
  employeeNo: string;
  name: string;
  department: Department;
  position: string;
  skills: string[];
  certifications: Certification[];
  monthlyProduction: number;
  monthlyDefectRate: number;
  efficiency: number;
  joinDate: string;
}

/** 주간 스케줄 한 셀 */
interface ScheduleCell {
  workerId: string;
  date: string; // ISO date string
  shift: ShiftType;
}

/** 탭 종류 */
type TabType = 'workers' | 'schedule' | 'performance';

/** 컴포넌트 Props */
interface WorkerManagementDashboardProps {
  onBack: () => void;
}

// ── 부서 목록 ─────────────────────────────────────────────
const DEPARTMENTS: Department[] = ['생산1팀', '생산2팀', '물류팀', '품질팀', '설비팀'];

// ── 교대 근무 색상 매핑 ──────────────────────────────────
const SHIFT_COLORS: Record<ShiftType, { bg: string; text: string; label: string }> = {
  AM:    { bg: '#1A3A5C', text: COLORS.blue,   label: '오전' },
  PM:    { bg: '#1A3C2A', text: COLORS.green,  label: '오후' },
  NIGHT: { bg: '#2A1A4C', text: COLORS.purple, label: '야간' },
  OFF:   { bg: '#21262D', text: COLORS.textMuted, label: '휴무' },
};

// ── 요일 라벨 ─────────────────────────────────────────────
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// ── localStorage 키 ───────────────────────────────────────
const STORAGE_KEY_WORKERS = 'hanvoxel_workers';
const STORAGE_KEY_SCHEDULES = 'hanvoxel_schedules';

// ── 목 데이터 생성 ───────────────────────────────────────

/** 초기 작업자 목 데이터 */
const generateMockWorkers = (): Worker[] => [
  {
    id: 'w1', employeeNo: 'EMP-001', name: '김민수', department: '생산1팀', position: '팀장',
    skills: ['CNC 가공', '용접', '품질검사'],
    certifications: [
      { name: '산업안전기사', expiryDate: '2026-04-10' },
      { name: '용접기능사', expiryDate: '2027-06-15' },
    ],
    monthlyProduction: 1250, monthlyDefectRate: 0.8, efficiency: 96.2, joinDate: '2019-03-15',
  },
  {
    id: 'w2', employeeNo: 'EMP-002', name: '이서연', department: '생산1팀', position: '반장',
    skills: ['조립', '검사', '포장'],
    certifications: [
      { name: '품질경영기사', expiryDate: '2026-03-25' },
    ],
    monthlyProduction: 1180, monthlyDefectRate: 1.2, efficiency: 93.5, joinDate: '2020-07-01',
  },
  {
    id: 'w3', employeeNo: 'EMP-003', name: '박준혁', department: '생산2팀', position: '사원',
    skills: ['사출성형', '도장'],
    certifications: [
      { name: '위험물취급기능사', expiryDate: '2026-05-20' },
    ],
    monthlyProduction: 980, monthlyDefectRate: 2.1, efficiency: 88.3, joinDate: '2021-01-10',
  },
  {
    id: 'w4', employeeNo: 'EMP-004', name: '최지은', department: '물류팀', position: '팀장',
    skills: ['지게차 운전', '창고관리', 'WMS'],
    certifications: [
      { name: '지게차운전기능사', expiryDate: '2026-08-01' },
      { name: '물류관리사', expiryDate: '2027-01-15' },
    ],
    monthlyProduction: 850, monthlyDefectRate: 0.5, efficiency: 97.1, joinDate: '2018-09-20',
  },
  {
    id: 'w5', employeeNo: 'EMP-005', name: '정하늘', department: '물류팀', position: '사원',
    skills: ['피킹', '패킹', '바코드스캔'],
    certifications: [
      { name: '지게차운전기능사', expiryDate: '2026-03-22' },
    ],
    monthlyProduction: 720, monthlyDefectRate: 1.5, efficiency: 89.8, joinDate: '2022-04-01',
  },
  {
    id: 'w6', employeeNo: 'EMP-006', name: '한소율', department: '품질팀', position: '반장',
    skills: ['SPC', '측정기기', '불량분석'],
    certifications: [
      { name: '품질경영기사', expiryDate: '2026-12-30' },
      { name: 'ISO 9001 심사원', expiryDate: '2026-04-05' },
    ],
    monthlyProduction: 650, monthlyDefectRate: 0.3, efficiency: 98.5, joinDate: '2017-11-05',
  },
  {
    id: 'w7', employeeNo: 'EMP-007', name: '오태영', department: '설비팀', position: '사원',
    skills: ['전기설비', 'PLC', '유공압'],
    certifications: [
      { name: '전기기능사', expiryDate: '2026-09-10' },
    ],
    monthlyProduction: 420, monthlyDefectRate: 0.9, efficiency: 91.0, joinDate: '2023-02-14',
  },
  {
    id: 'w8', employeeNo: 'EMP-008', name: '윤세아', department: '생산2팀', position: '반장',
    skills: ['CNC 가공', '프레스', '열처리'],
    certifications: [
      { name: '기계정비기능사', expiryDate: '2026-06-01' },
    ],
    monthlyProduction: 1100, monthlyDefectRate: 1.0, efficiency: 94.7, joinDate: '2020-11-20',
  },
  {
    id: 'w9', employeeNo: 'EMP-009', name: '임도윤', department: '설비팀', position: '팀장',
    skills: ['전기설비', '자동화', '로봇제어'],
    certifications: [
      { name: '전기산업기사', expiryDate: '2027-03-01' },
      { name: '산업안전기사', expiryDate: '2026-07-15' },
    ],
    monthlyProduction: 380, monthlyDefectRate: 0.4, efficiency: 95.8, joinDate: '2016-05-10',
  },
  {
    id: 'w10', employeeNo: 'EMP-010', name: '배수진', department: '품질팀', position: '사원',
    skills: ['검사', '문서관리', '통계분석'],
    certifications: [
      { name: '품질경영산업기사', expiryDate: '2026-10-20' },
    ],
    monthlyProduction: 560, monthlyDefectRate: 0.6, efficiency: 92.3, joinDate: '2022-08-01',
  },
];

// ── 유틸리티 함수 ─────────────────────────────────────────

/** 주의 시작일(월요일)을 구한다 */
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  // 일요일(0)이면 -6, 아니면 1 - day
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Date를 YYYY-MM-DD 형태 문자열로 변환 */
const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** 한 주(월~일) 날짜 배열 반환 */
const getWeekDates = (monday: Date): Date[] => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

/** 자격증 만료일까지 남은 일수 계산 */
const daysUntilExpiry = (expiryDate: string): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/** 자격증 만료 경고 색상 */
const getCertWarningColor = (expiryDate: string): string | null => {
  const days = daysUntilExpiry(expiryDate);
  if (days <= 7) return COLORS.red;
  if (days <= 30) return COLORS.orange;
  return null;
};

/** 기본 스케줄 생성 (월~금 AM, 토일 OFF) */
const generateDefaultSchedules = (workers: Worker[], monday: Date): ScheduleCell[] => {
  const weekDates = getWeekDates(monday);
  const cells: ScheduleCell[] = [];
  const shifts: ShiftType[] = ['AM', 'PM', 'NIGHT'];

  workers.forEach((worker, idx) => {
    weekDates.forEach((date, dayIdx) => {
      const dateStr = formatDate(date);
      // 토요일(5), 일요일(6)은 기본 OFF
      if (dayIdx >= 5) {
        cells.push({ workerId: worker.id, date: dateStr, shift: 'OFF' });
      } else {
        // 작업자별로 교대 순환
        cells.push({ workerId: worker.id, date: dateStr, shift: shifts[idx % shifts.length] });
      }
    });
  });
  return cells;
};

// ── 메인 컴포넌트 ────────────────────────────────────────

export const WorkerManagementDashboard: React.FC<WorkerManagementDashboardProps> = ({ onBack }) => {
  // 현재 선택된 탭
  const [activeTab, setActiveTab] = useState<TabType>('workers');
  // 작업자 목록
  const [workers, setWorkers] = useState<Worker[]>([]);
  // 부서 필터
  const [departmentFilter, setDepartmentFilter] = useState<Department | '전체'>('전체');
  // 작업자 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  // 스케줄 데이터
  const [schedules, setSchedules] = useState<ScheduleCell[]>([]);
  // 현재 주의 월요일
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));

  // ── localStorage에서 데이터 로드 ───────────────────────
  useEffect(() => {
    const savedWorkers = localStorage.getItem(STORAGE_KEY_WORKERS);
    if (savedWorkers) {
      setWorkers(JSON.parse(savedWorkers) as Worker[]);
    } else {
      const mock = generateMockWorkers();
      setWorkers(mock);
      localStorage.setItem(STORAGE_KEY_WORKERS, JSON.stringify(mock));
    }
  }, []);

  // ── 주가 바뀔 때 스케줄 로드/생성 ─────────────────────
  useEffect(() => {
    if (workers.length === 0) return;
    const weekKey = formatDate(currentMonday);
    const storageKey = `${STORAGE_KEY_SCHEDULES}_${weekKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setSchedules(JSON.parse(saved) as ScheduleCell[]);
    } else {
      const defaultSchedules = generateDefaultSchedules(workers, currentMonday);
      setSchedules(defaultSchedules);
      localStorage.setItem(storageKey, JSON.stringify(defaultSchedules));
    }
  }, [workers, currentMonday]);

  // ── 작업자 저장 ────────────────────────────────────────
  const saveWorkers = useCallback((updated: Worker[]) => {
    setWorkers(updated);
    localStorage.setItem(STORAGE_KEY_WORKERS, JSON.stringify(updated));
  }, []);

  // ── 스케줄 저장 ────────────────────────────────────────
  const saveSchedules = useCallback((updated: ScheduleCell[]) => {
    setSchedules(updated);
    const weekKey = formatDate(currentMonday);
    localStorage.setItem(`${STORAGE_KEY_SCHEDULES}_${weekKey}`, JSON.stringify(updated));
  }, [currentMonday]);

  // ── 필터링된 작업자 목록 ───────────────────────────────
  const filteredWorkers = departmentFilter === '전체'
    ? workers
    : workers.filter((w) => w.department === departmentFilter);

  // ── 스케줄 셀 클릭 시 교대 순환 ───────────────────────
  const handleShiftToggle = useCallback((workerId: string, date: string) => {
    const order: ShiftType[] = ['AM', 'PM', 'NIGHT', 'OFF'];
    const updated = schedules.map((cell) => {
      if (cell.workerId === workerId && cell.date === date) {
        const currentIdx = order.indexOf(cell.shift);
        const nextIdx = (currentIdx + 1) % order.length;
        return { ...cell, shift: order[nextIdx] };
      }
      return cell;
    });
    saveSchedules(updated);
  }, [schedules, saveSchedules]);

  // ── 주 이동 ────────────────────────────────────────────
  const goToPrevWeek = useCallback(() => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  }, [currentMonday]);

  const goToNextWeek = useCallback(() => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  }, [currentMonday]);

  // ── 작업자 추가 ────────────────────────────────────────
  const handleAddWorker = useCallback((newWorker: Omit<Worker, 'id' | 'monthlyProduction' | 'monthlyDefectRate' | 'efficiency'>) => {
    const worker: Worker = {
      ...newWorker,
      id: `w${Date.now()}`,
      monthlyProduction: 0,
      monthlyDefectRate: 0,
      efficiency: 0,
    };
    saveWorkers([...workers, worker]);
    setShowAddModal(false);
  }, [workers, saveWorkers]);

  // ── KPI 계산 ───────────────────────────────────────────
  const totalWorkers = workers.length;
  const totalProduction = workers.reduce((sum, w) => sum + w.monthlyProduction, 0);
  const avgEfficiency = workers.length > 0
    ? workers.reduce((sum, w) => sum + w.efficiency, 0) / workers.length
    : 0;
  const avgDefectRate = workers.length > 0
    ? workers.reduce((sum, w) => sum + w.monthlyDefectRate, 0) / workers.length
    : 0;

  // ── 생산량 Top 10 (내림차순) ────────────────────────────
  const topProducers = [...workers]
    .sort((a, b) => b.monthlyProduction - a.monthlyProduction)
    .slice(0, 10);
  const maxProduction = topProducers.length > 0 ? topProducers[0].monthlyProduction : 1;

  // ── 불량률 순위 (오름차순 = 낮을수록 좋음) ──────────────
  const defectRanking = [...workers].sort((a, b) => a.monthlyDefectRate - b.monthlyDefectRate);

  // ── 자격증 만료 경고 목록 ──────────────────────────────
  const certAlerts = workers.flatMap((w) =>
    w.certifications
      .filter((c) => daysUntilExpiry(c.expiryDate) <= 30)
      .map((c) => ({
        workerName: w.name,
        employeeNo: w.employeeNo,
        certName: c.name,
        expiryDate: c.expiryDate,
        daysLeft: daysUntilExpiry(c.expiryDate),
      }))
  ).sort((a, b) => a.daysLeft - b.daysLeft);

  // ── 주간 날짜 배열 ─────────────────────────────────────
  const weekDates = getWeekDates(currentMonday);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.text, padding: '24px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={onBack}
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            color: COLORS.text,
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
          }}
        >
          ← 뒤로
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
          작업자 관리
        </h1>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '0' }}>
        {([
          { key: 'workers' as TabType, label: '작업자 목록' },
          { key: 'schedule' as TabType, label: '근무 스케줄' },
          { key: 'performance' as TabType, label: '실적 대시보드' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? COLORS.card : 'transparent',
              border: `1px solid ${activeTab === tab.key ? COLORS.border : 'transparent'}`,
              borderBottom: activeTab === tab.key ? `2px solid ${COLORS.blue}` : '2px solid transparent',
              borderRadius: '8px 8px 0 0',
              color: activeTab === tab.key ? COLORS.blue : COLORS.textMuted,
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'workers' && (
        <WorkerListTab
          workers={filteredWorkers}
          departmentFilter={departmentFilter}
          onDepartmentChange={setDepartmentFilter}
          onAddClick={() => setShowAddModal(true)}
        />
      )}

      {activeTab === 'schedule' && (
        <ScheduleTab
          workers={workers}
          schedules={schedules}
          weekDates={weekDates}
          currentMonday={currentMonday}
          onPrevWeek={goToPrevWeek}
          onNextWeek={goToNextWeek}
          onShiftToggle={handleShiftToggle}
        />
      )}

      {activeTab === 'performance' && (
        <PerformanceTab
          totalWorkers={totalWorkers}
          totalProduction={totalProduction}
          avgEfficiency={avgEfficiency}
          avgDefectRate={avgDefectRate}
          topProducers={topProducers}
          maxProduction={maxProduction}
          defectRanking={defectRanking}
          certAlerts={certAlerts}
        />
      )}

      {/* 작업자 추가 모달 */}
      {showAddModal && (
        <AddWorkerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddWorker}
        />
      )}
    </div>
  );
};

// ── Tab 1: 작업자 목록 ──────────────────────────────────

interface WorkerListTabProps {
  workers: Worker[];
  departmentFilter: Department | '전체';
  onDepartmentChange: (dept: Department | '전체') => void;
  onAddClick: () => void;
}

const WorkerListTab: React.FC<WorkerListTabProps> = ({
  workers,
  departmentFilter,
  onDepartmentChange,
  onAddClick,
}) => {
  const allDepts: (Department | '전체')[] = ['전체', ...DEPARTMENTS];

  return (
    <div>
      {/* 부서 필터 + 추가 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {allDepts.map((dept) => (
            <button
              key={dept}
              onClick={() => onDepartmentChange(dept)}
              style={{
                background: departmentFilter === dept ? COLORS.blue : COLORS.card,
                border: `1px solid ${departmentFilter === dept ? COLORS.blue : COLORS.border}`,
                borderRadius: '20px',
                color: departmentFilter === dept ? '#FFFFFF' : COLORS.textMuted,
                padding: '6px 16px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: departmentFilter === dept ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {dept}
            </button>
          ))}
        </div>
        <button
          onClick={onAddClick}
          style={{
            background: COLORS.green,
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            padding: '8px 20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          + 작업자 추가
        </button>
      </div>

      {/* 작업자 카드 그리드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
      }}>
        {workers.map((worker) => (
          <WorkerCard key={worker.id} worker={worker} />
        ))}
        {workers.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: COLORS.textMuted }}>
            해당 부서에 등록된 작업자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

// ── 작업자 카드 ──────────────────────────────────────────

const WorkerCard: React.FC<{ worker: Worker }> = ({ worker }) => {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '12px',
      padding: '20px',
    }}>
      {/* 이름, 사번, 부서, 직책 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: COLORS.text }}>{worker.name}</h3>
          <span style={{ fontSize: '12px', color: COLORS.textMuted }}>{worker.employeeNo}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            background: '#1A3A5C',
            color: COLORS.blue,
            padding: '2px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            {worker.department}
          </span>
          <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>{worker.position}</div>
        </div>
      </div>

      {/* 스킬 배지 */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {worker.skills.map((skill) => (
          <span
            key={skill}
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '11px',
              color: COLORS.textMuted,
            }}
          >
            {skill}
          </span>
        ))}
      </div>

      {/* 이번 달 실적 */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: COLORS.textMuted }}>이번 달 생산량</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.blue }}>
            {worker.monthlyProduction.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: COLORS.textMuted }}>불량률</div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: worker.monthlyDefectRate <= 1.0 ? COLORS.green : worker.monthlyDefectRate <= 2.0 ? COLORS.orange : COLORS.red,
          }}>
            {worker.monthlyDefectRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 자격증 만료 경고 */}
      {worker.certifications.length > 0 && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '10px' }}>
          {worker.certifications.map((cert) => {
            const warningColor = getCertWarningColor(cert.expiryDate);
            const days = daysUntilExpiry(cert.expiryDate);
            return (
              <div key={cert.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: COLORS.textMuted }}>{cert.name}</span>
                <span style={{
                  fontSize: '11px',
                  color: warningColor ?? COLORS.textMuted,
                  fontWeight: warningColor ? 600 : 400,
                }}>
                  {days <= 0
                    ? '만료됨'
                    : warningColor
                      ? `${days}일 남음 ⚠`
                      : cert.expiryDate
                  }
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Tab 2: 근무 스케줄 ──────────────────────────────────

interface ScheduleTabProps {
  workers: Worker[];
  schedules: ScheduleCell[];
  weekDates: Date[];
  currentMonday: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onShiftToggle: (workerId: string, date: string) => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  workers,
  schedules,
  weekDates,
  currentMonday,
  onPrevWeek,
  onNextWeek,
  onShiftToggle,
}) => {
  // 주 표시 문자열
  const weekLabel = (() => {
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);
    return `${formatDate(currentMonday)} ~ ${formatDate(sunday)}`;
  })();

  /** 특정 작업자/날짜의 교대 정보 조회 */
  const getShift = (workerId: string, date: string): ShiftType => {
    const cell = schedules.find((s) => s.workerId === workerId && s.date === date);
    return cell?.shift ?? 'OFF';
  };

  return (
    <div>
      {/* 주 선택 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
        <button
          onClick={onPrevWeek}
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            color: COLORS.text,
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ← 이전 주
        </button>
        <span style={{ fontSize: '16px', fontWeight: 600, minWidth: '260px', textAlign: 'center' }}>
          {weekLabel}
        </span>
        <button
          onClick={onNextWeek}
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            color: COLORS.text,
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          다음 주 →
        </button>
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', justifyContent: 'center' }}>
        {(['AM', 'PM', 'NIGHT', 'OFF'] as ShiftType[]).map((shift) => (
          <div key={shift} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: SHIFT_COLORS[shift].bg,
              border: `1px solid ${SHIFT_COLORS[shift].text}`,
            }} />
            <span style={{ fontSize: '12px', color: COLORS.textMuted }}>
              {SHIFT_COLORS[shift].label}
            </span>
          </div>
        ))}
      </div>

      {/* 스케줄 그리드 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr>
              <th style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                padding: '10px 12px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: 600,
                color: COLORS.textMuted,
                position: 'sticky',
                left: 0,
                zIndex: 1,
                minWidth: '120px',
              }}>
                작업자
              </th>
              {weekDates.map((date, idx) => (
                <th key={idx} style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: idx >= 5 ? COLORS.red : COLORS.textMuted,
                }}>
                  <div>{DAY_LABELS[idx]}</div>
                  <div style={{ fontSize: '11px', fontWeight: 400 }}>
                    {String(date.getMonth() + 1).padStart(2, '0')}/{String(date.getDate()).padStart(2, '0')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                }}>
                  <div>{worker.name}</div>
                  <div style={{ fontSize: '11px', color: COLORS.textMuted }}>{worker.department}</div>
                </td>
                {weekDates.map((date, dayIdx) => {
                  const dateStr = formatDate(date);
                  const shift = getShift(worker.id, dateStr);
                  const shiftStyle = SHIFT_COLORS[shift];
                  return (
                    <td
                      key={dayIdx}
                      onClick={() => onShiftToggle(worker.id, dateStr)}
                      style={{
                        background: shiftStyle.bg,
                        border: `1px solid ${COLORS.border}`,
                        padding: '8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: shiftStyle.text,
                        transition: 'opacity 0.15s',
                        userSelect: 'none',
                      }}
                      title={`클릭하여 교대 변경: ${shiftStyle.label}`}
                    >
                      {shiftStyle.label}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: COLORS.textMuted, textAlign: 'center' }}>
        셀을 클릭하면 교대 유형이 순환됩니다 (오전 → 오후 → 야간 → 휴무)
      </div>
    </div>
  );
};

// ── Tab 3: 실적 대시보드 ────────────────────────────────

interface PerformanceTabProps {
  totalWorkers: number;
  totalProduction: number;
  avgEfficiency: number;
  avgDefectRate: number;
  topProducers: Worker[];
  maxProduction: number;
  defectRanking: Worker[];
  certAlerts: {
    workerName: string;
    employeeNo: string;
    certName: string;
    expiryDate: string;
    daysLeft: number;
  }[];
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({
  totalWorkers,
  totalProduction,
  avgEfficiency,
  avgDefectRate,
  topProducers,
  maxProduction,
  defectRanking,
  certAlerts,
}) => {
  // KPI 카드 데이터
  const kpis: { label: string; value: string; color: string }[] = [
    { label: '총 작업자 수', value: `${totalWorkers}명`, color: COLORS.blue },
    { label: '이번 달 총 생산량', value: totalProduction.toLocaleString(), color: COLORS.green },
    { label: '평균 효율률', value: `${avgEfficiency.toFixed(1)}%`, color: COLORS.blue },
    { label: '평균 불량률', value: `${avgDefectRate.toFixed(2)}%`, color: avgDefectRate <= 1.0 ? COLORS.green : COLORS.orange },
  ];

  // SVG 바 차트 크기 설정
  const chartWidth = 600;
  const chartHeight = topProducers.length * 36 + 20;
  const barMaxWidth = 380;
  const labelWidth = 100;
  const valueWidth = 80;
  const barStartX = labelWidth + 10;

  return (
    <div>
      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>{kpi.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* 생산량 Top 10 바 차트 (SVG) */}
      <div style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
          생산량 Top 10
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {topProducers.map((worker, idx) => {
              const y = idx * 36 + 10;
              const barWidth = maxProduction > 0
                ? (worker.monthlyProduction / maxProduction) * barMaxWidth
                : 0;
              // 순위에 따른 바 색상
              const barColor = idx === 0 ? COLORS.blue : idx <= 2 ? COLORS.green : COLORS.textMuted;
              return (
                <g key={worker.id}>
                  {/* 작업자 이름 */}
                  <text
                    x={labelWidth}
                    y={y + 18}
                    textAnchor="end"
                    fill={COLORS.text}
                    fontSize="13"
                    fontWeight={idx < 3 ? 600 : 400}
                  >
                    {worker.name}
                  </text>
                  {/* 바 */}
                  <rect
                    x={barStartX}
                    y={y + 4}
                    width={barWidth}
                    height={22}
                    rx={4}
                    fill={barColor}
                    opacity={0.8}
                  />
                  {/* 생산량 수치 */}
                  <text
                    x={barStartX + barWidth + 8}
                    y={y + 18}
                    fill={COLORS.textMuted}
                    fontSize="12"
                  >
                    {worker.monthlyProduction.toLocaleString()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 불량률 테이블 + 자격증 만료 알림 (2단 레이아웃) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* 불량률 순위 테이블 */}
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
            불량률 순위 (낮을수록 우수)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['순위', '이름', '부서', '불량률'].map((header) => (
                  <th key={header} style={{
                    borderBottom: `1px solid ${COLORS.border}`,
                    padding: '8px',
                    textAlign: 'left',
                    fontSize: '12px',
                    color: COLORS.textMuted,
                    fontWeight: 600,
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {defectRanking.map((worker, idx) => (
                <tr key={worker.id} style={{ background: idx % 2 === 0 ? 'transparent' : COLORS.bg }}>
                  <td style={{ padding: '8px', fontSize: '13px', color: idx < 3 ? COLORS.green : COLORS.text, fontWeight: idx < 3 ? 600 : 400 }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '8px', fontSize: '13px' }}>{worker.name}</td>
                  <td style={{ padding: '8px', fontSize: '13px', color: COLORS.textMuted }}>{worker.department}</td>
                  <td style={{
                    padding: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: worker.monthlyDefectRate <= 0.5 ? COLORS.green
                      : worker.monthlyDefectRate <= 1.0 ? COLORS.blue
                        : worker.monthlyDefectRate <= 2.0 ? COLORS.orange
                          : COLORS.red,
                  }}>
                    {worker.monthlyDefectRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 자격증 만료 알림 */}
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: COLORS.orange }}>
            자격증 만료 알림
          </h3>
          {certAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: COLORS.textMuted, fontSize: '14px' }}>
              30일 이내 만료 예정 자격증이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {certAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  style={{
                    background: COLORS.bg,
                    border: `1px solid ${alert.daysLeft <= 7 ? COLORS.red : COLORS.orange}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      {alert.workerName}
                      <span style={{ fontSize: '12px', color: COLORS.textMuted, marginLeft: '8px' }}>
                        {alert.employeeNo}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '2px' }}>
                      {alert.certName} — 만료일: {alert.expiryDate}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: alert.daysLeft <= 7 ? COLORS.red : COLORS.orange,
                    whiteSpace: 'nowrap',
                  }}>
                    {alert.daysLeft <= 0 ? '만료됨' : `${alert.daysLeft}일 남음`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── 작업자 추가 모달 ────────────────────────────────────

interface AddWorkerModalProps {
  onClose: () => void;
  onAdd: (worker: Omit<Worker, 'id' | 'monthlyProduction' | 'monthlyDefectRate' | 'efficiency'>) => void;
}

const AddWorkerModal: React.FC<AddWorkerModalProps> = ({ onClose, onAdd }) => {
  const [employeeNo, setEmployeeNo] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<Department>('생산1팀');
  const [position, setPosition] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [certName, setCertName] = useState('');
  const [certExpiry, setCertExpiry] = useState('');
  const [certifications, setCertifications] = useState<Certification[]>([]);

  /** 자격증 추가 */
  const handleAddCert = useCallback(() => {
    if (!certName.trim() || !certExpiry) return;
    setCertifications((prev) => [...prev, { name: certName.trim(), expiryDate: certExpiry }]);
    setCertName('');
    setCertExpiry('');
  }, [certName, certExpiry]);

  /** 자격증 삭제 */
  const handleRemoveCert = useCallback((idx: number) => {
    setCertifications((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /** 폼 제출 */
  const handleSubmit = useCallback(() => {
    if (!employeeNo.trim() || !name.trim() || !position.trim()) return;
    onAdd({
      employeeNo: employeeNo.trim(),
      name: name.trim(),
      department,
      position: position.trim(),
      skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
      certifications,
      joinDate: formatDate(new Date()),
    });
  }, [employeeNo, name, department, position, skillsInput, certifications, onAdd]);

  // 입력 필드 공통 스타일
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '6px',
    color: COLORS.text,
    padding: '8px 12px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: COLORS.textMuted,
    marginBottom: '4px',
    fontWeight: 500,
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '16px',
          padding: '28px',
          width: '480px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 700 }}>
          작업자 추가
        </h2>

        {/* 사번 */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>사번 *</label>
          <input
            style={inputStyle}
            value={employeeNo}
            onChange={(e) => setEmployeeNo(e.target.value)}
            placeholder="EMP-011"
          />
        </div>

        {/* 이름 */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>이름 *</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
          />
        </div>

        {/* 부서 */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>부서 *</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department)}
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* 직책 */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>직책 *</label>
          <input
            style={inputStyle}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="사원"
          />
        </div>

        {/* 스킬 */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>스킬 (쉼표로 구분)</label>
          <input
            style={inputStyle}
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            placeholder="CNC 가공, 용접, 검사"
          />
        </div>

        {/* 자격증 추가 */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>자격증</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={certName}
              onChange={(e) => setCertName(e.target.value)}
              placeholder="자격증명"
            />
            <input
              type="date"
              style={{ ...inputStyle, width: '160px' }}
              value={certExpiry}
              onChange={(e) => setCertExpiry(e.target.value)}
            />
            <button
              onClick={handleAddCert}
              style={{
                background: COLORS.blue,
                border: 'none',
                borderRadius: '6px',
                color: '#FFFFFF',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap',
              }}
            >
              추가
            </button>
          </div>
          {/* 추가된 자격증 목록 */}
          {certifications.map((cert, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: COLORS.bg,
              borderRadius: '6px',
              padding: '6px 10px',
              marginBottom: '4px',
              fontSize: '13px',
            }}>
              <span>{cert.name} ({cert.expiryDate})</span>
              <button
                onClick={() => handleRemoveCert(idx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: COLORS.red,
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              color: COLORS.textMuted,
              padding: '8px 20px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!employeeNo.trim() || !name.trim() || !position.trim()}
            style={{
              background: !employeeNo.trim() || !name.trim() || !position.trim() ? COLORS.border : COLORS.green,
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              padding: '8px 20px',
              cursor: !employeeNo.trim() || !name.trim() || !position.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerManagementDashboard;
