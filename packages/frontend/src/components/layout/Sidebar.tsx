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
  type LucideIcon,
} from 'lucide-react';

// 메뉴 아이템 타입
interface MenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
  color?: string;
}

// 메뉴 목록
const MENU_ITEMS: MenuItem[] = [
  { id: 'viewer', icon: Box, label: '3D 창고 뷰어', color: '#2D7DD2' },
  { id: 'wizard', icon: Warehouse, label: '새 창고 만들기' },
  { id: 'roi', icon: TrendingUp, label: 'ROI 계산기', color: '#3FB950' },
  { id: 'sla', icon: BarChart3, label: 'SLA 모니터링', color: '#2D7DD2' },
  { id: 'qc', icon: ClipboardCheck, label: '품질 검수', color: '#D29922' },
  { id: 'picking', icon: Smartphone, label: '모바일 피킹', color: '#A371F7' },
  { id: 'subscription', icon: CreditCard, label: '구독 관리', color: '#39D2C0' },
  { id: 'erp', icon: FileText, label: 'ERP 관리', color: '#D29922' },
  { id: 'trade', icon: Globe, label: '무역 인텔리전스', color: '#39D2C0' },
  { id: 'reorder', icon: ShoppingCart, label: '자동 발주', color: '#6366F1' },
  { id: 'connector', icon: Link2, label: 'ERP 커넥터', color: '#F85149' },
  { id: 'benchmark', icon: Shield, label: '업계 벤치마크', color: '#EC4899' },
];

// 플랜 배지 색상
const PLAN_COLORS: Record<string, string> = {
  STARTER: '#2D7DD2',
  GROWTH: '#3FB950',
  ENTERPRISE: '#A371F7',
};

interface SidebarProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  planType?: string;
}

export function Sidebar({ activeMode, onModeChange, planType = 'STARTER' }: SidebarProps) {
  return (
    <aside
      style={{
        width: 240,
        height: '100vh',
        background: '#161B22',
        borderRight: '1px solid #30363D',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* 로고 */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid #21262D',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2D7DD2, #3FB950)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            H
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#E6EDF3', letterSpacing: '-0.3px' }}>
              HanVoxel
            </div>
            <div style={{ fontSize: 10, color: '#484F58', marginTop: 1 }}>
              Spatial Digital Twin
            </div>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, color: '#484F58', padding: '4px 12px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          메뉴
        </div>
        {MENU_ITEMS.map((item) => {
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
                gap: 10,
                padding: '9px 12px',
                marginBottom: 2,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#E6EDF3' : '#8B949E',
                background: isActive ? 'rgba(45, 125, 210, 0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #2D7DD2' : '3px solid transparent',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#21262D';
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
                size={16}
                style={{ color: isActive ? '#2D7DD2' : (item.color ?? '#8B949E'), opacity: isActive ? 1 : 0.7 }}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* 하단 설정 + 플랜 배지 */}
      <div style={{ borderTop: '1px solid #21262D', padding: '12px' }}>
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: '#8B949E',
            background: 'transparent',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#21262D'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Settings size={16} />
          설정
        </button>

        {/* 플랜 배지 */}
        <div
          style={{
            margin: '8px 12px 4px',
            padding: '8px 12px',
            borderRadius: 8,
            background: '#0D1117',
            border: '1px solid #30363D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 11, color: '#8B949E' }}>현재 플랜</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: PLAN_COLORS[planType] ?? '#8B949E',
              padding: '2px 8px',
              borderRadius: 4,
              background: `${PLAN_COLORS[planType] ?? '#8B949E'}20`,
              letterSpacing: '0.3px',
            }}
          >
            {planType}
          </span>
        </div>
      </div>
    </aside>
  );
}
