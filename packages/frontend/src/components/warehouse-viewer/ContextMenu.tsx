import { useState, useEffect, useCallback, useRef } from 'react';
import { Edit3, Copy, RotateCw, Move, Trash2, Maximize, ArrowUp, ArrowRight, Grid3x3 } from 'lucide-react';
import type { SpatialObject } from '../../types/spatial';

interface ContextMenuProps {
  /** 우클릭한 오브젝트 (없으면 빈 공간 메뉴) */
  object: SpatialObject | null;
  /** 메뉴 위치 (화면 좌표) */
  position: { x: number; y: number } | null;
  onClose: () => void;
  // 오브젝트 메뉴 액션
  onEdit?: (object: SpatialObject) => void;
  onDuplicate?: (object: SpatialObject) => void;
  onRotate90?: (object: SpatialObject) => void;
  onMove?: (object: SpatialObject) => void;
  onDelete?: (id: string) => void;
  // 빈 공간 메뉴 액션
  onResetView?: () => void;
  onTopView?: () => void;
  onFrontView?: () => void;
  onToggleGrid?: () => void;
  gridVisible?: boolean;
}

interface MenuItemDef {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
  dividerAfter?: boolean;
}

/**
 * 3D 뷰어 우클릭 컨텍스트 메뉴
 * - 오브젝트 위 우클릭: 편집/복제/회전 90°/이동/색상/삭제
 * - 빈 공간 우클릭: 줌 리셋/탑 뷰/프론트 뷰/그리드 토글
 */
export function ContextMenu({
  object, position, onClose,
  onEdit, onDuplicate, onRotate90, onMove, onDelete,
  onResetView, onTopView, onFrontView, onToggleGrid, gridVisible = true,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!position) return;

    const handleClick = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // 약간 지연해서 등록 (우클릭 이벤트 충돌 방지)
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClick);
      window.addEventListener('contextmenu', handleClick);
      window.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  // 메뉴 항목 구성
  const items: MenuItemDef[] = object
    ? [
        { icon: <Edit3 size={13} />, label: '편집', onClick: () => { onEdit?.(object); onClose(); } },
        { icon: <Copy size={13} />, label: '복제', onClick: () => { onDuplicate?.(object); onClose(); } },
        { icon: <RotateCw size={13} />, label: '90° 회전', onClick: () => { onRotate90?.(object); onClose(); }, dividerAfter: true },
        { icon: <Move size={13} />, label: '이동', onClick: () => { onMove?.(object); onClose(); }, dividerAfter: true },
        { icon: <Trash2 size={13} />, label: '삭제', onClick: () => { onDelete?.(object.id); onClose(); }, color: '#F85149' },
      ]
    : [
        { icon: <Maximize size={13} />, label: '줌 리셋', onClick: () => { onResetView?.(); onClose(); } },
        { icon: <ArrowUp size={13} />, label: '탑 뷰', onClick: () => { onTopView?.(); onClose(); }, dividerAfter: false },
        { icon: <ArrowRight size={13} />, label: '프론트 뷰', onClick: () => { onFrontView?.(); onClose(); }, dividerAfter: true },
        { icon: <Grid3x3 size={13} />, label: gridVisible ? '그리드 숨기기' : '그리드 표시', onClick: () => { onToggleGrid?.(); onClose(); } },
      ];

  // 화면 경계 보정
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    zIndex: 100,
    minWidth: 180,
    background: 'rgba(22,27,34,0.98)',
    border: '1px solid #30363D',
    borderRadius: 10,
    padding: '4px 0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(45,125,210,0.1)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <div ref={menuRef} style={menuStyle} onClick={(e) => e.stopPropagation()}>
      {/* 헤더 (오브젝트일 때) */}
      {object && (
        <div style={{
          padding: '8px 14px 6px',
          borderBottom: '1px solid #21262D',
          marginBottom: 4,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E6EDF3' }}>{object.name}</div>
          <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'monospace' }}>{object.code}</div>
        </div>
      )}

      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={item.onClick}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              color: item.color ?? '#E6EDF3',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.1s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1C2A3A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ color: item.color ?? '#8B949E', display: 'flex' }}>{item.icon}</span>
            {item.label}
          </button>
          {item.dividerAfter && (
            <div style={{ height: 1, background: '#21262D', margin: '4px 8px' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// 우클릭 이벤트 훅
export function useContextMenu() {
  const [contextState, setContextState] = useState<{
    object: SpatialObject | null;
    position: { x: number; y: number } | null;
  }>({ object: null, position: null });

  const openMenu = useCallback((e: React.MouseEvent, object?: SpatialObject) => {
    e.preventDefault();
    e.stopPropagation();
    setContextState({
      object: object ?? null,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const closeMenu = useCallback(() => {
    setContextState({ object: null, position: null });
  }, []);

  return { contextState, openMenu, closeMenu };
}
