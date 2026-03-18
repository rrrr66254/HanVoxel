import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: string;
}

/**
 * KPI 카드 — 핵심 지표 표시 (아이콘 + 값 + 트렌드)
 */
export function KPICard({ label, value, unit, icon: Icon, trend, color = 'var(--accent-blue)' }: KPICardProps) {
  const trendUp = trend && trend.value > 0;
  const trendColor = trendUp ? 'var(--accent-green)' : 'var(--accent-red)';

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-muted)',
        borderRadius: 12,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-muted)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{unit}</span>}
      </div>

      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <span style={{ color: trendColor, fontWeight: 600 }}>
            {trendUp ? '+' : ''}{trend.value}%
          </span>
          <span style={{ color: 'var(--text-muted)' }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
}
