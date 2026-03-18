import {
  MousePointer2,
  Move,
  RotateCw,
  Trash2,
  Magnet,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Box,
  ArrowUp,
  Layers,
} from 'lucide-react';
import { useState } from 'react';

type ToolMode = 'select' | 'move' | 'rotate' | 'delete';
type ViewMode = 'perspective' | 'top' | 'front';

interface ViewerToolbarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  snapEnabled: boolean;
  onSnapToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  layerVisibility: { racks: boolean; aisles: boolean; zones: boolean };
  onLayerToggle: (layer: 'racks' | 'aisles' | 'zones') => void;
}

// 버튼 스타일 헬퍼
const btnBase: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: '1px solid var(--border-default)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  fontFamily: 'inherit',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(45, 125, 210, 0.2)',
  borderColor: 'var(--accent-blue)',
  color: 'var(--accent-blue)',
};

export function ViewerToolbar({
  activeTool,
  onToolChange,
  snapEnabled,
  onSnapToggle,
  onZoomIn,
  onZoomOut,
  onResetView,
  viewMode,
  onViewModeChange,
  layerVisibility,
  onLayerToggle,
}: ViewerToolbarProps) {
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  return (
    <>
      {/* 좌측 도구 툴바 */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 6,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 20,
        }}
      >
        <ToolBtn
          icon={<MousePointer2 size={16} />}
          active={activeTool === 'select'}
          onClick={() => onToolChange('select')}
          tooltip="선택 (V)"
        />
        <ToolBtn
          icon={<Move size={16} />}
          active={activeTool === 'move'}
          onClick={() => onToolChange('move')}
          tooltip="이동 (G)"
        />
        <ToolBtn
          icon={<RotateCw size={16} />}
          active={activeTool === 'rotate'}
          onClick={() => onToolChange('rotate')}
          tooltip="회전 (R)"
        />
        <ToolBtn
          icon={<Trash2 size={16} />}
          active={activeTool === 'delete'}
          onClick={() => onToolChange('delete')}
          tooltip="삭제 (Del)"
        />

        <div style={{ height: 1, background: 'var(--border-default)', margin: '4px 0' }} />

        {/* 스냅 토글 */}
        <ToolBtn
          icon={<Magnet size={16} />}
          active={snapEnabled}
          onClick={onSnapToggle}
          tooltip={`스냅 ${snapEnabled ? 'ON' : 'OFF'}`}
        />

        {/* 레이어 토글 */}
        <div style={{ position: 'relative' }}>
          <ToolBtn
            icon={<Layers size={16} />}
            active={layerMenuOpen}
            onClick={() => setLayerMenuOpen(!layerMenuOpen)}
            tooltip="레이어"
          />
          {layerMenuOpen && (
            <div
              style={{
                position: 'absolute',
                left: 44,
                top: 0,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: 8,
                minWidth: 140,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                zIndex: 30,
              }}
            >
              <LayerItem label="랙" visible={layerVisibility.racks} onToggle={() => onLayerToggle('racks')} />
              <LayerItem label="통로" visible={layerVisibility.aisles} onToggle={() => onLayerToggle('aisles')} />
              <LayerItem label="안전구역" visible={layerVisibility.zones} onToggle={() => onLayerToggle('zones')} />
            </div>
          )}
        </div>
      </div>

      {/* 좌상단 뷰 모드 */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          gap: 2,
          padding: 4,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 20,
        }}
      >
        <ViewModeBtn
          icon={<Box size={14} />}
          label="3D"
          active={viewMode === 'perspective'}
          onClick={() => onViewModeChange('perspective')}
        />
        <ViewModeBtn
          icon={<ArrowUp size={14} />}
          label="TOP"
          active={viewMode === 'top'}
          onClick={() => onViewModeChange('top')}
        />
        <ViewModeBtn
          icon={<Layers size={14} />}
          label="FRONT"
          active={viewMode === 'front'}
          onClick={() => onViewModeChange('front')}
        />
      </div>

      {/* 우상단 줌 컨트롤 */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 6,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 20,
        }}
      >
        <ToolBtn icon={<ZoomIn size={16} />} onClick={onZoomIn} tooltip="줌 인" />
        <ToolBtn icon={<ZoomOut size={16} />} onClick={onZoomOut} tooltip="줌 아웃" />
        <div style={{ height: 1, background: 'var(--border-default)', margin: '2px 0' }} />
        <ToolBtn icon={<Maximize2 size={16} />} onClick={onResetView} tooltip="뷰 초기화" />
      </div>
    </>
  );
}

// 좌표 표시 컴포넌트
export function CoordinateDisplay({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 16,
        padding: '8px 16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        fontSize: 11,
        fontFamily: 'monospace',
        color: 'var(--text-secondary)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 20,
      }}
    >
      <span>
        <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>X</span> {x.toFixed(1)}
      </span>
      <span>
        <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Y</span> {y.toFixed(1)}
      </span>
      <span>
        <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Z</span> {z.toFixed(1)}
      </span>
    </div>
  );
}

// 미니맵 컴포넌트
export function Minimap({ objectCount }: { objectCount: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 180,
        height: 120,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 20,
      }}
    >
      {/* 미니맵 헤더 */}
      <div
        style={{
          padding: '4px 8px',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-default)',
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>오버헤드 뷰</span>
        <span style={{ color: 'var(--text-muted)' }}>{objectCount} 객체</span>
      </div>
      {/* 미니맵 그리드 영역 */}
      <div
        style={{
          width: '100%',
          height: 'calc(100% - 22px)',
          background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
          position: 'relative',
        }}
      >
        {/* 격자 효과 */}
        <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.3 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={`${(i + 1) * 10}%`}
              x2="100%"
              y2={`${(i + 1) * 10}%`}
              stroke="var(--border-default)"
              strokeWidth="0.5"
            />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={`${(i + 1) * 10}%`}
              y1="0"
              x2={`${(i + 1) * 10}%`}
              y2="100%"
              stroke="var(--border-default)"
              strokeWidth="0.5"
            />
          ))}
        </svg>
        {/* 랙 위치 표시 (간략화) */}
        <div
          style={{
            position: 'absolute',
            left: '15%',
            top: '25%',
            width: '55%',
            height: '45%',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 8,
            color: 'rgba(245, 158, 11, 0.6)',
          }}
        >
          보관구역
        </div>
        {/* 도크 위치 표시 */}
        <div
          style={{
            position: 'absolute',
            left: '20%',
            bottom: '8%',
            width: '50%',
            height: '12%',
            border: '1px solid rgba(29, 78, 216, 0.4)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 8,
            color: 'rgba(29, 78, 216, 0.6)',
          }}
        >
          도크
        </div>
        {/* 카메라 위치 표시 */}
        <div
          style={{
            position: 'absolute',
            right: '18%',
            top: '15%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent-blue)',
            boxShadow: '0 0 6px rgba(45,125,210,0.6)',
          }}
        />
      </div>
    </div>
  );
}

// 도구 버튼
function ToolBtn({
  icon,
  active = false,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  tooltip?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={active ? btnActive : btnBase}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--bg-tertiary)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {icon}
    </button>
  );
}

// 뷰 모드 버튼
function ViewModeBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px',
        borderRadius: 7,
        border: 'none',
        background: active ? 'rgba(45, 125, 210, 0.2)' : 'transparent',
        color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'monospace',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// 레이어 항목
function LayerItem({
  label,
  visible,
  onToggle,
}: {
  label: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 8px',
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color: visible ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
      }}
    >
      {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      {label}
    </button>
  );
}
