import {
  Grid3x3,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Keyboard,
  Layers,
  Box,
} from 'lucide-react';
import { useState } from 'react';

type EditLayerMode = 'structure' | 'objects';

interface EditorBottomBarProps {
  cursorPos: { x: number; y: number; z: number };
  gridVisible: boolean;
  onToggleGrid: () => void;
  snapEnabled: boolean;
  onSnapToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  editLayer?: EditLayerMode;
  onEditLayerChange?: (layer: EditLayerMode) => void;
}

/**
 * 하단 바 — 오늘의집 스타일
 * [그리드] [스냅] | X Y Z 좌표 | [키보드] | [줌-][줌+] [리셋]
 */
export function EditorBottomBar({
  cursorPos,
  gridVisible,
  onToggleGrid,
  snapEnabled,
  onSnapToggle,
  onZoomIn,
  onZoomOut,
  onResetView,
  editLayer = 'objects',
  onEditLayerChange,
}: EditorBottomBarProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <div className="relative flex h-9 items-center border-t border-[#2A2F38] bg-[#1A1D24] px-3 text-[11px] select-none">
      {/* 좌측 — 토글 */}
      <div className="flex items-center gap-1">
        <BottomToggle
          icon={<Grid3x3 size={13} />}
          label="그리드"
          active={gridVisible}
          onClick={onToggleGrid}
        />
        <BottomToggle
          icon={<Magnet size={13} />}
          label="스냅"
          active={snapEnabled}
          onClick={onSnapToggle}
        />
      </div>

      {/* 구분선 */}
      <div className="mx-3 h-4 w-px bg-[#2A2F38]" />

      {/* 마우스 조작 힌트 */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <span>좌드래그: <span className="text-gray-400">이동</span></span>
        <span className="text-[#2A2F38]">|</span>
        <span>우드래그: <span className="text-gray-400">회전</span></span>
        <span className="text-[#2A2F38]">|</span>
        <span>휠: <span className="text-gray-400">줌</span></span>
        <span className="text-[#2A2F38]">|</span>
        <span>클릭: <span className="text-gray-400">선택</span></span>
        <span className="text-[#2A2F38]">|</span>
        <span>더블클릭: <span className="text-gray-400">편집</span></span>
        <span className="text-[#2A2F38]">|</span>
        <span>우클릭: <span className="text-gray-400">메뉴</span></span>
      </div>

      {/* 구분선 */}
      <div className="mx-3 h-4 w-px bg-[#2A2F38]" />

      {/* 중앙 — 좌표 */}
      <div className="flex items-center gap-3 font-mono text-[11px]">
        <span className="text-gray-500">
          <span className="font-semibold text-red-400">X</span>{' '}
          <span className="text-gray-400">{cursorPos.x.toFixed(1)}</span>
        </span>
        <span className="text-gray-500">
          <span className="font-semibold text-green-400">Y</span>{' '}
          <span className="text-gray-400">{cursorPos.y.toFixed(1)}</span>
        </span>
        <span className="text-gray-500">
          <span className="font-semibold text-blue-400">Z</span>{' '}
          <span className="text-gray-400">{cursorPos.z.toFixed(1)}</span>
        </span>
      </div>

      {/* 우측 — 레이어 스위치 + 단축키 + 줌 */}
      <div className="ml-auto flex items-center gap-1">
        {/* 편집 레이어 스위치 */}
        <div className="flex items-center rounded-md border border-[#2A2F38] bg-[#0D1117]">
          <button
            onClick={() => onEditLayerChange?.('structure')}
            className={`flex items-center gap-1 rounded-l-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
              editLayer === 'structure'
                ? 'bg-amber-600/20 text-amber-400'
                : 'text-gray-500 hover:bg-[#22262E] hover:text-gray-300'
            }`}
            title="바닥/벽 편집 모드"
          >
            <Layers size={12} />
            구조물
          </button>
          <div className="h-4 w-px bg-[#2A2F38]" />
          <button
            onClick={() => onEditLayerChange?.('objects')}
            className={`flex items-center gap-1 rounded-r-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
              editLayer === 'objects'
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-500 hover:bg-[#22262E] hover:text-gray-300'
            }`}
            title="오브젝트 편집 모드"
          >
            <Box size={12} />
            오브젝트
          </button>
        </div>

        <div className="mx-1.5 h-4 w-px bg-[#2A2F38]" />

        {/* 단축키 버튼 */}
        <button
          onClick={() => setShowShortcuts((v) => !v)}
          className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
            showShortcuts
              ? 'bg-blue-600/20 text-blue-400'
              : 'text-gray-500 hover:bg-[#22262E] hover:text-gray-300'
          }`}
          title="단축키"
        >
          <Keyboard size={13} />
        </button>

        <div className="mx-1.5 h-4 w-px bg-[#2A2F38]" />

        {/* 줌 */}
        <button
          onClick={onZoomOut}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 transition-colors hover:bg-[#22262E] hover:text-gray-300"
          title="줌 아웃"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={onZoomIn}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 transition-colors hover:bg-[#22262E] hover:text-gray-300"
          title="줌 인"
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={onResetView}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 transition-colors hover:bg-[#22262E] hover:text-gray-300"
          title="뷰 초기화"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* 단축키 패널 */}
      {showShortcuts && (
        <div className="absolute bottom-10 right-3 rounded-lg border border-[#2A2F38] bg-[#1A1D24] p-3 shadow-xl">
          <h4 className="mb-2 text-xs font-semibold text-white">마우스 조작</h4>
          <div className="space-y-1 text-[11px]">
            <ShortcutRow keys="좌클릭 드래그" desc="카메라 패닝" />
            <ShortcutRow keys="우클릭 드래그" desc="카메라 회전" />
            <ShortcutRow keys="스크롤 휠" desc="줌 인/아웃" />
            <ShortcutRow keys="좌클릭" desc="오브젝트 선택" />
            <ShortcutRow keys="더블클릭" desc="편집 패널 열기" />
            <ShortcutRow keys="우클릭" desc="컨텍스트 메뉴" />
          </div>
          <h4 className="mb-2 mt-3 text-xs font-semibold text-white">키보드</h4>
          <div className="space-y-1 text-[11px]">
            <ShortcutRow keys="W A S D" desc="카메라 이동" />
            <ShortcutRow keys="Q / E" desc="카메라 상/하" />
            <ShortcutRow keys="Shift" desc="3배속" />
            <ShortcutRow keys="← → ↑ ↓" desc="카메라 회전" />
            <ShortcutRow keys="V" desc="선택 도구" />
            <ShortcutRow keys="G" desc="이동 도구" />
            <ShortcutRow keys="R" desc="회전 도구" />
            <ShortcutRow keys="Del" desc="삭제" />
            <ShortcutRow keys="ESC" desc="취소" />
          </div>
        </div>
      )}
    </div>
  );
}

// 하단 토글 버튼
function BottomToggle({
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
      className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
        active
          ? 'bg-blue-600/15 text-blue-400'
          : 'text-gray-500 hover:bg-[#22262E] hover:text-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// 단축키 행
function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex justify-between gap-6">
      <span className="font-mono text-gray-400">{keys}</span>
      <span className="text-gray-500">{desc}</span>
    </div>
  );
}
