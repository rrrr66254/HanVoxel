interface CardProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  padding?: number;
  noBorder?: boolean;
}

/**
 * 공통 카드 컴포넌트 — 헤더(제목 + 우측 콘텐츠) + 본문
 */
export function Card({ title, subtitle, headerRight, children, padding = 20, noBorder = false }: CardProps) {
  return (
    <div
      style={{
        background: '#161B22',
        border: noBorder ? 'none' : '1px solid #21262D',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {(title || headerRight) && (
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #21262D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            {title && <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E6EDF3', margin: 0 }}>{title}</h3>}
            {subtitle && <p style={{ fontSize: 11, color: '#484F58', margin: '2px 0 0' }}>{subtitle}</p>}
          </div>
          {headerRight}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}
