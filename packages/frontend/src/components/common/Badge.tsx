type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  info:    { bg: 'rgba(45,125,210,0.12)', color: '#2D7DD2', border: 'rgba(45,125,210,0.25)' },
  success: { bg: 'rgba(63,185,80,0.12)',  color: '#3FB950', border: 'rgba(63,185,80,0.25)' },
  warning: { bg: 'rgba(210,153,34,0.12)', color: '#D29922', border: 'rgba(210,153,34,0.25)' },
  danger:  { bg: 'rgba(248,81,73,0.12)',  color: '#F85149', border: 'rgba(248,81,73,0.25)' },
  neutral: { bg: '#21262D',               color: '#8B949E', border: '#30363D' },
};

/**
 * 상태/카테고리 뱃지 — 5가지 변형
 */
export function Badge({ children, variant = 'neutral', dot = false }: BadgeProps) {
  const style = VARIANT_STYLES[variant];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 6,
      background: style.bg,
      border: `1px solid ${style.border}`,
      fontSize: 11,
      fontWeight: 600,
      color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: style.color,
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}
