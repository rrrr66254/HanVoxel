import { useTranslation } from 'react-i18next';
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
  labelKey: string;
  sectionKey: string;
}

// 메뉴 목록 (i18n 키 사용)
const MENU_ITEMS: MenuItem[] = [
  { id: 'viewer', icon: Box, labelKey: 'sidebar.viewer', sectionKey: 'sidebar.spatialManagement' },
  { id: 'wizard', icon: Warehouse, labelKey: 'sidebar.wizard', sectionKey: 'sidebar.spatialManagement' },
  { id: 'roi', icon: TrendingUp, labelKey: 'sidebar.roi', sectionKey: 'sidebar.spatialManagement' },
  { id: 'sla', icon: BarChart3, labelKey: 'sidebar.sla', sectionKey: 'sidebar.operations' },
  { id: 'qc', icon: ClipboardCheck, labelKey: 'sidebar.qc', sectionKey: 'sidebar.operations' },
  { id: 'picking', icon: Smartphone, labelKey: 'sidebar.picking', sectionKey: 'sidebar.operations' },
  { id: 'subscription', icon: CreditCard, labelKey: 'sidebar.subscription', sectionKey: 'sidebar.settings' },
  { id: 'erp', icon: FileText, labelKey: 'sidebar.erp', sectionKey: 'sidebar.intelligence' },
  { id: 'trade', icon: Globe, labelKey: 'sidebar.trade', sectionKey: 'sidebar.intelligence' },
  { id: 'reorder', icon: ShoppingCart, labelKey: 'sidebar.reorder', sectionKey: 'sidebar.intelligence' },
  { id: 'connector', icon: Link2, labelKey: 'sidebar.connector', sectionKey: 'sidebar.intelligence' },
  { id: 'benchmark', icon: Shield, labelKey: 'sidebar.benchmark', sectionKey: 'sidebar.intelligence' },
];

// 섹션 순서 (i18n 키)
const SECTION_KEYS = [
  'sidebar.spatialManagement',
  'sidebar.operations',
  'sidebar.intelligence',
  'sidebar.settings',
];

interface SidebarProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  planType?: string;
  onToggleAdmin?: () => void;
}

export function Sidebar({ activeMode, onModeChange, planType = 'ENTERPRISE', onToggleAdmin }: SidebarProps) {
  const { t } = useTranslation();
  const isEnterprise = planType === 'ENTERPRISE';

  // 섹션별 메뉴 그룹핑
  const grouped = SECTION_KEYS.map((sectionKey) => ({
    sectionKey,
    items: MENU_ITEMS.filter((item) => item.sectionKey === sectionKey),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      style={{
        width: 260,
        height: '100vh',
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-muted)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* 로고 */}
      <div
        style={{
          padding: '8px 24px 8px',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <img
          src="/logo_nogb.png"
          alt="HanVoxel"
          style={{ width: '100%', height: 'auto' }}
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
          <div key={group.sectionKey}>
            {gi > 0 && (
              <div style={{ height: 1, background: 'var(--border-muted)', margin: '8px 8px' }} />
            )}
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              padding: '8px 20px 6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {t(group.sectionKey)}
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
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--bg-hover)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <Icon
                    size={18}
                    style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-icon)', flexShrink: 0 }}
                  />
                  {t(item.labelKey)}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 하단 설정 + 플랜 배지 */}
      <div style={{ borderTop: '1px solid var(--border-muted)', padding: '12px' }}>
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
            color: 'var(--text-secondary)',
            background: 'transparent',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            textAlign: 'left',
            letterSpacing: '0.3px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Settings size={18} style={{ color: 'var(--text-icon)' }} />
          {t('sidebar.settings')}
        </button>

        {/* 플랜 배지 */}
        <div
          style={{
            margin: '8px 8px 4px',
            padding: '12px 16px',
            borderRadius: 12,
            background: isEnterprise
              ? 'linear-gradient(135deg, rgba(240,180,41,0.12), rgba(240,180,41,0.04))'
              : 'var(--bg-secondary)',
            border: isEnterprise
              ? '1px solid rgba(240,180,41,0.3)'
              : '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEnterprise && (
              <Crown size={14} style={{ color: '#F0B429' }} />
            )}
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('sidebar.currentPlan')}</span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: isEnterprise ? '#F0B429' : planType === 'GROWTH' ? 'var(--accent-green)' : 'var(--accent-blue)',
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
