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
  PanelLeftClose,
  PanelLeftOpen,
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ activeMode, onModeChange, planType = 'ENTERPRISE', onToggleAdmin, collapsed = false, onToggleCollapse }: SidebarProps) {
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
        width: collapsed ? 64 : 260,
        height: '100vh',
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-muted)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}
    >
      {/* 로고 + 접기 버튼 */}
      <div
        style={{
          padding: collapsed ? '6px 8px' : '0px 20px',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed && (
          <img
            src="/logo_nogb.png"
            alt="HanVoxel"
            style={{ width: '70%', height: 'auto' }}
          />
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid var(--border-muted)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        )}
      </div>

      {/* 메뉴 */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: collapsed ? '8px 6px' : '8px 12px',
        }}
      >
        {grouped.map((group, gi) => (
          <div key={group.sectionKey}>
            {gi > 0 && (
              <div style={{ height: 1, background: 'var(--border-muted)', margin: collapsed ? '8px 4px' : '8px 8px' }} />
            )}
            {!collapsed && (
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
            )}
            {group.items.map((item) => {
              const isActive = activeMode === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onModeChange(item.id)}
                  title={collapsed ? t(item.labelKey) : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? '10px 0' : '10px 20px',
                    marginBottom: 2,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
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
                  {!collapsed && t(item.labelKey)}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 하단 설정 + 플랜 배지 */}
      <div style={{ borderTop: '1px solid var(--border-muted)', padding: collapsed ? '8px 6px' : '8px 12px' }}>
        <button
          onClick={() => onModeChange('settings')}
          title={collapsed ? t('sidebar.settings') : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 12,
            padding: collapsed ? '10px 0' : '10px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: activeMode === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: activeMode === 'settings' ? 'var(--bg-hover)' : 'transparent',
            borderLeft: activeMode === 'settings' ? '3px solid var(--accent-blue)' : '3px solid transparent',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            textAlign: 'left',
            letterSpacing: '0.3px',
          }}
          onMouseEnter={(e) => { if (activeMode !== 'settings') e.currentTarget.style.background = 'var(--bg-secondary)'; }}
          onMouseLeave={(e) => { if (activeMode !== 'settings') e.currentTarget.style.background = 'transparent'; }}
        >
          <Settings size={18} style={{ color: activeMode === 'settings' ? 'var(--accent-blue)' : 'var(--text-icon)', flexShrink: 0 }} />
          {!collapsed && t('sidebar.settings')}
        </button>

        {/* 플랜 배지 */}
        {!collapsed && (
          <div
            style={{
              margin: '6px 8px 4px',
              padding: '10px 14px',
              borderRadius: 10,
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
        )}
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
            {isEnterprise && <Crown size={16} style={{ color: '#F0B429' }} />}
          </div>
        )}
      </div>
    </aside>
  );
}
