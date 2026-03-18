import { X } from 'lucide-react';
import type { SpatialObject } from '../../types/spatial';

interface ObjectInfoPanelProps {
  object: SpatialObject | null;
  onClose: () => void;
}

// 상태 배지 색상
const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: 'rgba(63, 185, 80, 0.15)', color: 'var(--accent-green)' },
  INACTIVE: { bg: 'rgba(139, 148, 158, 0.15)', color: 'var(--text-secondary)' },
  MAINTENANCE: { bg: 'rgba(210, 153, 34, 0.15)', color: 'var(--accent-orange)' },
};

/**
 * 선택된 공간 객체의 상세 정보를 표시하는 사이드 패널
 */
export function ObjectInfoPanel({ object, onClose }: ObjectInfoPanelProps) {
  if (!object) return null;

  const badge = STATUS_BADGE[object.status] ?? STATUS_BADGE.ACTIVE;

  return (
    <div
      style={{
        position: 'absolute',
        top: 70,
        right: 16,
        width: 280,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        padding: 0,
        color: 'var(--text-primary)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{object.name}</h3>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{object.code}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid var(--border-default)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* 타입 & 상태 배지 */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 6,
            background: 'rgba(45, 125, 210, 0.15)',
            color: 'var(--accent-blue)',
            fontWeight: 600,
          }}
        >
          {object.type.label}
        </span>
        <span
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 6,
            background: badge.bg,
            color: badge.color,
            fontWeight: 600,
          }}
        >
          {object.status}
        </span>
      </div>

      {/* 정보 행 */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InfoRow label="위치 (m)" value={`${object.positionX.toFixed(1)}, ${object.positionY.toFixed(1)}, ${object.positionZ.toFixed(1)}`} />
          <InfoRow label="크기 (m)" value={`${object.scaleX} × ${object.scaleY} × ${object.scaleZ}`} />
          <InfoRow
            label="회전 (°)"
            value={`${toDeg(object.rotationX)}, ${toDeg(object.rotationY)}, ${toDeg(object.rotationZ)}`}
          />
          {object.color && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>색상</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: object.color, border: '1px solid var(--border-default)' }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-primary)' }}>{object.color}</span>
              </div>
            </div>
          )}
          <InfoRow label="투명도" value={`${Math.round(object.opacity * 100)}%`} />
        </div>

        {/* 메타데이터 */}
        {object.metadata && Object.keys(object.metadata).length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-muted)' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              메타데이터
            </span>
            <pre
              style={{
                marginTop: 6,
                maxHeight: 120,
                overflow: 'auto',
                borderRadius: 8,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-muted)',
                padding: 10,
                fontSize: 10,
                fontFamily: 'monospace',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              {JSON.stringify(object.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function toDeg(rad: number): string {
  return (rad * (180 / Math.PI)).toFixed(1);
}
