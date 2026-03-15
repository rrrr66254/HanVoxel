import {
  MousePointer2,
  Move,
  RotateCw,
  Trash2,
  Box,
  ArrowUp,
  Layers,
  Save,
  Undo2,
  Redo2,
  Layout,
} from 'lucide-react';

type ToolMode = 'select' | 'move' | 'rotate' | 'delete';
type ViewMode = 'perspective' | 'top' | 'front';

interface EditorTopBarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onTopView2D: () => void;
  saving: boolean;
  objectCount: number;
}

/**
 * 상단 바 — 오늘의집 스타일
 * [로고] [2D|3D|TOP|FRONT] | [선택|이동|회전|삭제] | [객체수] [저장상태]
 */
export function EditorTopBar({
  activeTool,
  onToolChange,
  viewMode,
  onViewModeChange,
  onTopView2D,
  saving,
  objectCount,
}: EditorTopBarProps) {
  return (
    <div className="flex h-12 items-center border-b border-[#2A2F38] bg-[#1A1D24] px-4 select-none">
      {/* 로고 */}
      <div className="mr-6 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
          <Box size={14} className="text-white" />
        </div>
        <span className="text-sm font-bold tracking-wide text-white">
          HanVoxel <span className="text-[10px] font-normal text-gray-500">3D</span>
        </span>
      </div>

      {/* 구분선 */}
      <div className="mx-2 h-6 w-px bg-[#2A2F38]" />

      {/* 뷰 모드 전환 */}
      <div className="flex items-center gap-0.5 rounded-lg bg-[#12151A] p-0.5">
        <ViewBtn
          label="3D"
          icon={<Box size={13} />}
          active={viewMode === 'perspective'}
          onClick={() => onViewModeChange('perspective')}
        />
        <ViewBtn
          label="TOP"
          icon={<ArrowUp size={13} />}
          active={viewMode === 'top'}
          onClick={() => onViewModeChange('top')}
        />
        <ViewBtn
          label="FRONT"
          icon={<Layers size={13} />}
          active={viewMode === 'front'}
          onClick={() => onViewModeChange('front')}
        />
        <div className="mx-0.5 h-4 w-px bg-[#2A2F38]" />
        <ViewBtn
          label="2D 편집"
          icon={<Layout size={13} />}
          active={false}
          onClick={onTopView2D}
        />
      </div>

      {/* 구분선 */}
      <div className="mx-3 h-6 w-px bg-[#2A2F38]" />

      {/* 편집 도구 */}
      <div className="flex items-center gap-0.5 rounded-lg bg-[#12151A] p-0.5">
        <ToolBtn
          icon={<MousePointer2 size={14} />}
          tooltip="선택 (V)"
          active={activeTool === 'select'}
          onClick={() => onToolChange('select')}
        />
        <ToolBtn
          icon={<Move size={14} />}
          tooltip="이동 (G)"
          active={activeTool === 'move'}
          onClick={() => onToolChange('move')}
        />
        <ToolBtn
          icon={<RotateCw size={14} />}
          tooltip="회전 (R)"
          active={activeTool === 'rotate'}
          onClick={() => onToolChange('rotate')}
        />
        <ToolBtn
          icon={<Trash2 size={14} />}
          tooltip="삭제 (Del)"
          active={activeTool === 'delete'}
          onClick={() => onToolChange('delete')}
        />
      </div>

      {/* 구분선 */}
      <div className="mx-3 h-6 w-px bg-[#2A2F38]" />

      {/* Undo / Redo (미래 확장용 — 비활성) */}
      <div className="flex items-center gap-0.5">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 cursor-not-allowed"
          disabled
          title="실행 취소"
        >
          <Undo2 size={14} />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 cursor-not-allowed"
          disabled
          title="다시 실행"
        >
          <Redo2 size={14} />
        </button>
      </div>

      {/* 우측 영역 — 상태 정보 */}
      <div className="ml-auto flex items-center gap-4">
        {/* 객체 수 */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="font-mono font-bold text-blue-400">{objectCount}</span>
          <span>객체</span>
        </div>

        {/* 저장 상태 */}
        {saving && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            저장 중...
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
          title="저장"
        >
          <Save size={13} />
          저장
        </button>
      </div>
    </div>
  );
}

// 뷰 모드 버튼
function ViewBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
        active
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-gray-500 hover:bg-[#1A1D24] hover:text-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// 도구 버튼
function ToolBtn({
  icon,
  tooltip,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  tooltip: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
        active
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-gray-500 hover:bg-[#1A1D24] hover:text-gray-300'
      }`}
    >
      {icon}
    </button>
  );
}
