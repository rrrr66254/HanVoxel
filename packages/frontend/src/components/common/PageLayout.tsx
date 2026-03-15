import { ArrowLeft } from 'lucide-react';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 페이지 공통 레이아웃 — 헤더(제목 + 뒤로가기 + 액션) + 본문
 */
export function PageLayout({ title, subtitle, onBack, actions, children }: PageLayoutProps) {
  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 페이지 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: '1px solid #30363D', background: '#161B22',
                color: '#8B949E', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; e.currentTarget.style.color = '#E6EDF3'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363D'; e.currentTarget.style.color = '#8B949E'; }}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: 0 }}>{title}</h1>
            {subtitle && (
              <p style={{ fontSize: 13, color: '#484F58', margin: '4px 0 0' }}>{subtitle}</p>
            )}
          </div>
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
