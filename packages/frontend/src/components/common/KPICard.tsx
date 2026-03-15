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
export function KPICard({ label, value, unit, icon: Icon, trend, color = '#2D7DD2' }: KPICardProps) {
  const trendUp = trend && trend.value > 0;
  const trendColor = trendUp ? '#3FB950' : '#F85149';

  return (
    <div
      style={{
        background: '#161B22',
        border: '1px solid #21262D',
        borderRadius: 12,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${color}40`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#21262D'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#8B949E', fontWeight: 500 }}>{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#E6EDF3', letterSpacing: '-0.5px' }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 13, color: '#484F58', fontWeight: 500 }}>{unit}</span>}
      </div>

      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <span style={{ color: trendColor, fontWeight: 600 }}>
            {trendUp ? '+' : ''}{trend.value}%
          </span>
          <span style={{ color: '#484F58' }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
}
