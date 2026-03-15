import { Bell, ChevronRight, User } from 'lucide-react';

// 모드별 한국어 라벨
const MODE_LABELS: Record<string, string> = {
  viewer: '3D 창고 뷰어',
  wizard: '새 창고 만들기',
  roi: 'ROI 계산기',
  sla: 'SLA 모니터링',
  qc: '품질 검수',
  picking: '모바일 피킹',
  subscription: '구독 관리',
  erp: 'ERP 관리',
  trade: '무역 인텔리전스',
  reorder: '자동 발주',
  connector: 'ERP 커넥터',
  benchmark: '업계 벤치마크',
};

interface HeaderProps {
  activeMode: string;
  alertCount?: number;
  onAlertClick: () => void;
}

export function Header({ activeMode, alertCount = 3, onAlertClick }: HeaderProps) {
  return (
    <header
      style={{
        height: 60,
        background: '#161B22',
        borderBottom: '1px solid #30363D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      {/* 브레드크럼 */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: '#484F58' }}>HanVoxel</span>
        <ChevronRight size={14} style={{ color: '#484F58' }} />
        <span style={{ color: '#E6EDF3', fontWeight: 600 }}>
          {MODE_LABELS[activeMode] ?? activeMode}
        </span>
      </nav>

      {/* 우측: 알림 + 프로필 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 알림 벨 */}
        <button
          onClick={onAlertClick}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '1px solid #30363D',
            background: 'transparent',
            color: '#8B949E',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#21262D';
            e.currentTarget.style.color = '#E6EDF3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#8B949E';
          }}
        >
          <Bell size={16} />
          {alertCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#F85149',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #161B22',
              }}
            >
              {alertCount}
            </span>
          )}
        </button>

        {/* 프로필 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #30363D',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#21262D';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2D7DD2, #A371F7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={14} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#E6EDF3' }}>관리자</div>
            <div style={{ fontSize: 10, color: '#484F58' }}>admin@hanvoxel.com</div>
          </div>
        </div>
      </div>
    </header>
  );
}
