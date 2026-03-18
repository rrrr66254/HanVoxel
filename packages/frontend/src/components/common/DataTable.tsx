interface Column<T> {
  key: string;
  label: string;
  width?: number;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  maxHeight?: number;
}

/**
 * 공통 데이터 테이블 — 컬럼 정의 + 렌더 함수 + 빈 상태
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = '데이터가 없습니다',
  onRowClick,
  maxHeight,
}: DataTableProps<T>) {
  return (
    <div style={{
      border: '1px solid var(--border-muted)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-primary)',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-muted)',
      }}>
        {columns.map((col) => (
          <div key={col.key} style={{
            flex: col.width ? `0 0 ${col.width}px` : 1,
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textAlign: col.align ?? 'left',
          }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* 본문 */}
      <div style={{ maxHeight, overflowY: maxHeight ? 'auto' : undefined }}>
        {data.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            {emptyMessage}
          </div>
        ) : (
          data.map((row, i) => (
            <div
              key={i}
              onClick={() => onRowClick?.(row)}
              style={{
                display: 'flex',
                padding: '12px 16px',
                borderBottom: i < data.length - 1 ? '1px solid var(--border-muted)' : 'none',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {columns.map((col) => (
                <div key={col.key} style={{
                  flex: col.width ? `0 0 ${col.width}px` : 1,
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  textAlign: col.align ?? 'left',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {col.render
                    ? col.render(row, i)
                    : String(row[col.key] ?? '')}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
