import { useTranslation } from 'react-i18next';
import { Bell, ChevronRight } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';

// 모드별 i18n 키 매핑
const MODE_LABEL_KEYS: Record<string, string> = {
  viewer: 'sidebar.viewer',
  wizard: 'sidebar.wizard',
  roi: 'sidebar.roi',
  sla: 'sidebar.sla',
  qc: 'sidebar.qc',
  picking: 'sidebar.picking',
  subscription: 'sidebar.subscription',
  erp: 'sidebar.erp',
  trade: 'sidebar.trade',
  reorder: 'sidebar.reorder',
  connector: 'sidebar.connector',
  benchmark: 'sidebar.benchmark',
  settings: 'sidebar.settings',
};

interface HeaderProps {
  activeMode: string;
  alertCount?: number;
  onAlertClick: () => void;
  isEnterprise?: boolean;
  onNavigateSettings?: () => void;
}

export function Header({ activeMode, alertCount = 3, onAlertClick, isEnterprise = true, onNavigateSettings }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header
      style={{
        height: 60,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      {/* 브레드크럼 */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <img src="/logo_nogb.png" alt="HanVoxel" style={{ height: 40 }} />
        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {MODE_LABEL_KEYS[activeMode] ? t(MODE_LABEL_KEYS[activeMode]) : activeMode}
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
            border: '1px solid var(--border-default)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
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
                background: 'var(--accent-red)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-secondary)',
              }}
            >
              {alertCount}
            </span>
          )}
        </button>

        {/* 프로필 드롭다운 */}
        <ProfileDropdown
          isEnterprise={isEnterprise}
          onNavigateSettings={onNavigateSettings}
        />
      </div>
    </header>
  );
}
