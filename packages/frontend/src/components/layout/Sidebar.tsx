import {
  Box,
  BarChart3,
  Shield,
  ClipboardCheck,
  Smartphone,
  CreditCard,
  FileText,
  Globe,
  ShoppingCart,
  Link2,
  TrendingUp,
  Warehouse,
  Settings,
  Crown,
  type LucideIcon,
} from 'lucide-react';

// 메뉴 아이템 타입
interface MenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
  section?: string;
}

// 메뉴 목록 (섹션별 구분)
const MENU_ITEMS: MenuItem[] = [
  { id: 'viewer', icon: Box, label: '3D 창고 뷰어', section: '공간 관리' },
  { id: 'wizard', icon: Warehouse, label: '새 창고 만들기', section: '공간 관리' },
  { id: 'roi', icon: TrendingUp, label: 'ROI 계산기', section: '공간 관리' },
  { id: 'sla', icon: BarChart3, label: 'SLA 모니터링', section: '운영' },
  { id: 'qc', icon: ClipboardCheck, label: '품질 검수', section: '운영' },
  { id: 'picking', icon: Smartphone, label: '모바일 피킹', section: '운영' },
  { id: 'subscription', icon: CreditCard, label: '구독 관리', section: '설정' },
  { id: 'erp', icon: FileText, label: 'ERP 관리', section: '인텔리전스' },
  { id: 'trade', icon: Globe, label: '무역 인텔리전스', section: '인텔리전스' },
  { id: 'reorder', icon: ShoppingCart, label: '자동 발주', section: '인텔리전스' },
  { id: 'connector', icon: Link2, label: 'ERP 커넥터', section: '인텔리전스' },
  { id: 'benchmark', icon: Shield, label: '업계 벤치마크', section: '인텔리전스' },
];

// 섹션 순서
const SECTIONS = ['공간 관리', '운영', '인텔리전스', '설정'];

interface SidebarProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  planType?: string;
  onToggleAdmin?: () => void;
}

export function Sidebar({ activeMode, onModeChange, planType = 'ENTERPRISE', onToggleAdmin }: SidebarProps) {
  const isEnterprise = planType === 'ENTERPRISE';

  // 섹션별 메뉴 그룹핑
  const grouped = SECTIONS.map((section) => ({
    section,
    items: MENU_ITEMS.filter((item) => item.section === section),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      style={{
        width: 260,
        height: '100vh',
        background: '#0D1117',
        borderRight: '1px solid #21262D',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* 로고 */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #21262D',
        }}
      >
        <img
          src="/logo_nogb.png"
          alt="HanVoxel"
          style={{ height: 48 }}
        />
      </div>

      {/* 메뉴 */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
        }}
      >
        {grouped.map((group, gi) => (
          <div key={group.section}>
            {gi > 0 && (
              <div style={{ height: 1, background: '#21262D', margin: '8px 8px' }} />
            )}
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#484F58',
              padding: '8px 20px 6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {group.section}
            </div>
            {group.items.map((item) => {
              const isActive = activeMode === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onModeChange(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 20px',
                    marginBottom: 2,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    letterSpacing: '0.3px',
                    color: isActive ? '#E6EDF3' : '#8B949E',
                    background: isActive ? '#1C2A3A' : 'transparent',
                    borderLeft: isActive ? '3px solid #2D7DD2' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#161B22';
                      e.currentTarget.style.color = '#E6EDF3';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#8B949E';
                    }
                  }}
                >
                  <Icon
                    size={18}
                    style={{ color: isActive ? '#2D7DD2' : '#6E7681', flexShrink: 0 }}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 하단 설정 + 플랜 배지 */}
      <div style={{ borderTop: '1px solid #21262D', padding: '12px' }}>
        <button
          onClick={() => onModeChange('settings')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            color: '#8B949E',
            background: 'transparent',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            textAlign: 'left',
            letterSpacing: '0.3px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#161B22'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Settings size={18} style={{ color: '#6E7681' }} />
          설정
        </button>

        {/* 플랜 배지 */}
        <div
          style={{
            margin: '8px 8px 4px',
            padding: '12px 16px',
            borderRadius: 12,
            background: isEnterprise
              ? 'linear-gradient(135deg, rgba(240,180,41,0.12), rgba(240,180,41,0.04))'
              : '#161B22',
            border: isEnterprise
              ? '1px solid rgba(240,180,41,0.3)'
              : '1px solid #30363D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEnterprise && (
              <Crown size={14} style={{ color: '#F0B429' }} />
            )}
            <span style={{ fontSize: 11, color: '#8B949E' }}>현재 플랜</span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: isEnterprise ? '#F0B429' : planType === 'GROWTH' ? '#3FB950' : '#2D7DD2',
              padding: '3px 10px',
              borderRadius: 6,
              background: isEnterprise
                ? 'rgba(240,180,41,0.15)'
                : planType === 'GROWTH'
                  ? 'rgba(63,185,80,0.15)'
                  : 'rgba(45,125,210,0.15)',
              letterSpacing: '0.5px',
            }}
          >
            {planType}
          </span>
        </div>
      </div>
    </aside>
  );
}
