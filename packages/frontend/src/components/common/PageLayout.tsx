interface PageLayoutProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 페이지 공통 레이아웃 — 헤더(제목 + 액션) + 본문
 */
export function PageLayout({ title, subtitle, actions, children }: PageLayoutProps) {
  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 페이지 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{subtitle}</p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>
        )}
      </div>

      {/* 본문 */}
      {children}
    </div>
  );
}
