import type { SpatialObject } from '../../types/spatial';

interface ObjectInfoPanelProps {
  object: SpatialObject | null;
  onClose: () => void;
}

// 상태 배지 색상
const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  INACTIVE: 'bg-gray-400',
  MAINTENANCE: 'bg-orange-500',
};

/**
 * 선택된 공간 객체의 상세 정보를 표시하는 사이드 패널
 */
export function ObjectInfoPanel({ object, onClose }: ObjectInfoPanelProps) {
  if (!object) return null;

  return (
    <div className="absolute top-4 right-4 w-72 rounded-lg border border-gray-700 bg-gray-900/95 p-4 text-white shadow-xl backdrop-blur">
      {/* 헤더 */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold">{object.name}</h3>
          <span className="text-xs text-gray-400">{object.code}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* 타입 & 상태 */}
      <div className="mb-3 flex gap-2">
        <span className="rounded bg-blue-600/30 px-2 py-0.5 text-xs text-blue-300">
          {object.type.label}
        </span>
        <span className={`rounded px-2 py-0.5 text-xs text-white ${STATUS_BADGE[object.status] ?? 'bg-gray-500'}`}>
          {object.status}
        </span>
      </div>

      {/* 위치 정보 */}
      <div className="space-y-2 text-xs">
        <InfoRow label="위치 (m)" value={`${object.positionX}, ${object.positionY}, ${object.positionZ}`} />
        <InfoRow label="크기 (m)" value={`${object.scaleX} × ${object.scaleY} × ${object.scaleZ}`} />
        <InfoRow
          label="회전 (°)"
          value={`${toDeg(object.rotationX)}, ${toDeg(object.rotationY)}, ${toDeg(object.rotationZ)}`}
        />
        {object.color && <InfoRow label="색상" value={object.color} />}
        <InfoRow label="투명도" value={`${Math.round(object.opacity * 100)}%`} />
      </div>

      {/* 메타데이터 */}
      {object.metadata && Object.keys(object.metadata).length > 0 && (
        <div className="mt-3 border-t border-gray-700 pt-3">
          <span className="text-xs font-semibold text-gray-400">메타데이터</span>
          <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-800 p-2 text-xs text-gray-300">
            {JSON.stringify(object.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function toDeg(rad: number): string {
  return (rad * (180 / Math.PI)).toFixed(1);
}
