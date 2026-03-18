type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; hoverBg: string; color: string; border: string }> = {
  primary:   { bg: 'var(--accent-blue)', hoverBg: 'var(--accent-blue-hover)', color: '#FFFFFF', border: 'transparent' },
  secondary: { bg: 'var(--bg-tertiary)', hoverBg: 'var(--border-default)', color: 'var(--text-primary)', border: 'var(--border-default)' },
  danger:    { bg: 'rgba(248,81,73,0.12)', hoverBg: 'rgba(248,81,73,0.2)', color: 'var(--accent-red)', border: 'rgba(248,81,73,0.3)' },
  ghost:     { bg: 'transparent', hoverBg: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'transparent' },
};

const SIZE_STYLES: Record<ButtonSize, { padding: string; fontSize: number; height: number }> = {
  sm: { padding: '4px 12px', fontSize: 11, height: 28 },
  md: { padding: '8px 16px', fontSize: 13, height: 36 },
  lg: { padding: '10px 20px', fontSize: 14, height: 42 },
};

/**
 * 공통 버튼 — 4가지 변형, 3가지 크기, 아이콘 지원
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const vs = VARIANT_STYLES[variant];
  const ss = SIZE_STYLES[size];

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: ss.height,
        padding: ss.padding,
        borderRadius: 8,
        border: `1px solid ${vs.border}`,
        background: vs.bg,
        color: vs.color,
        fontSize: ss.fontSize,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        fontFamily: 'inherit',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        ...props.style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLElement).style.background = vs.hoverBg;
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = vs.bg;
        props.onMouseLeave?.(e);
      }}
    >
      {loading ? (
        <span style={{
          width: 14, height: 14,
          border: '2px solid transparent',
          borderTop: `2px solid ${vs.color}`,
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
      ) : icon}
      {children}
    </button>
  );
}
