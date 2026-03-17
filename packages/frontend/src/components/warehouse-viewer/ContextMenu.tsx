import { useState, useEffect, useCallback, useRef } from 'react';
import { Edit3, Copy, RotateCw, Move, Trash2, Maximize, ArrowUp, ArrowRight, Grid3x3, Scaling } from 'lucide-react';
import type { SpatialObject } from '../../types/spatial';

// 메뉴 크기 상수
const MENU_WIDTH = 200;
const MENU_ITEM_HEIGHT = 36; // 각 항목 높이 (패딩 포함)
const MENU_HEADER_HEIGHT = 50; // 오브젝트 헤더 높이
const MENU_DIVIDER_HEIGHT = 9; // 구분선 높이
const MENU_PADDING = 8; // 상하 패딩
const VIEWPORT_MARGIN = 8; // viewport 경계 여백

interface ContextMenuProps {
  /** 우클릭한 오브젝트 (없으면 빈 공간 메뉴) */
  object: SpatialObject | null;
  /** 다중 선택된 오브젝트 ID 집합 */
  multiSelectedIds?: Set<string>;
  /** 메뉴 위치 (화면 좌표) */
  position: { x: number; y: number } | null;
  onClose: () => void;
  // 오브젝트 메뉴 액션
  onEdit?: (object: SpatialObject) => void;
  onDuplicate?: (object: SpatialObject) => void;
  onRotate90?: (object: SpatialObject) => void;
  onMove?: (object: SpatialObject) => void;
  onDelete?: (id: string) => void;
  // 다중 선택 액션
  onMultiMove?: (ids: Set<string>) => void;
  onMultiDelete?: (ids: Set<string>) => void;
  /** 다중 선택된 오브젝트가 동일 타입일 때 → 일괄 크기 수정 */
  onBulkResize?: (ids: Set<string>) => void;
  /** 다중 선택된 오브젝트 목록 (랙 판별용) */
  multiSelectedObjects?: SpatialObject[];
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
 * - 오브젝트 위 우클릭: 편집/복제/회전 90도/이동/삭제
 * - 다중 선택 후 우클릭: 그룹 이동/그룹 삭제
 * - 빈 공간 우클릭: 줌 리셋/탑 뷰/프론트 뷰/그리드 토글
 * - viewport 경계 체크로 잘림 방지
 */
export function ContextMenu({
  object, multiSelectedIds, position, onClose,
  onEdit, onDuplicate, onRotate90, onMove, onDelete,
  onMultiMove, onMultiDelete, onBulkResize, multiSelectedObjects,
  onResetView, onTopView, onFrontView, onToggleGrid, gridVisible = true,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 다중 선택 모드 여부
  const isMultiMode = multiSelectedIds && multiSelectedIds.size > 1;

  // 외부 클릭 시 닫기 (메뉴 내부 클릭은 무시)
  useEffect(() => {
    if (!position) return;

    const handleClick = (e: MouseEvent) => {
      // 메뉴 내부 클릭이면 무시
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // 약간 지연해서 등록 (우클릭 이벤트 충돌 방지)
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClick, true);
      window.addEventListener('contextmenu', handleClick, true);
      window.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('contextmenu', handleClick, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  // 메뉴 항목 구성
  let items: MenuItemDef[];
  let headerContent: React.ReactNode = null;

  if (isMultiMode) {
    // 다중 선택 메뉴
    headerContent = (
      <div style={{
        padding: '8px 14px 6px',
        borderBottom: '1px solid #21262D',
        marginBottom: 4,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#E6EDF3', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          {multiSelectedIds.size}개 선택됨
        </div>
        <div style={{ fontSize: 10, color: '#484F58' }}>그룹 작업</div>
      </div>
    );
    // 동일 타입 여부 판별
    const allSameType = multiSelectedObjects
      ? multiSelectedObjects.length > 0 && multiSelectedObjects.every((o) => o.type.name === multiSelectedObjects[0].type.name)
      : false;

    // 타입별 라벨 결정
    const bulkResizeLabel = allSameType && multiSelectedObjects && multiSelectedObjects.length > 0
      ? (() => {
          const tn = multiSelectedObjects[0].type.name;
          const labels: Record<string, string> = {
            RACK: '랙', PALLET: '팔레트', CONTAINER: '컨테이너',
            AISLE: '통로', FLOOR: '바닥', WALL: '벽', DOOR: '출입문',
          };
          return `${labels[tn] ?? tn} 크기 수정`;
        })()
      : '크기 수정';

    items = [
      ...(allSameType ? [{ icon: <Scaling size={13} />, label: bulkResizeLabel, onClick: () => { onBulkResize?.(multiSelectedIds); onClose(); }, dividerAfter: true }] : []),
      { icon: <Move size={13} />, label: '그룹 이동', onClick: () => { onMultiMove?.(multiSelectedIds); onClose(); }, dividerAfter: true },
      { icon: <Trash2 size={13} />, label: '그룹 삭제', onClick: () => { onMultiDelete?.(multiSelectedIds); onClose(); }, color: '#F85149' },
    ];
  } else if (object) {
    // 단일 오브젝트 메뉴
    headerContent = (
      <div style={{
        padding: '8px 14px 6px',
        borderBottom: '1px solid #21262D',
        marginBottom: 4,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#E6EDF3' }}>{object.name}</div>
        <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'monospace' }}>{object.code}</div>
      </div>
    );
    items = [
      { icon: <Edit3 size={13} />, label: '편집', onClick: () => { onEdit?.(object); onClose(); } },
      { icon: <Copy size={13} />, label: '복제', onClick: () => { onDuplicate?.(object); onClose(); } },
      { icon: <RotateCw size={13} />, label: '90도 회전', onClick: () => { onRotate90?.(object); onClose(); }, dividerAfter: true },
      { icon: <Move size={13} />, label: '이동', onClick: () => { onMove?.(object); onClose(); }, dividerAfter: true },
      { icon: <Trash2 size={13} />, label: '삭제', onClick: () => { onDelete?.(object.id); onClose(); }, color: '#F85149' },
    ];
  } else {
    // 빈 공간 메뉴
    items = [
      { icon: <Maximize size={13} />, label: '줌 리셋', onClick: () => { onResetView?.(); onClose(); } },
      { icon: <ArrowUp size={13} />, label: '탑 뷰', onClick: () => { onTopView?.(); onClose(); }, dividerAfter: false },
      { icon: <ArrowRight size={13} />, label: '프론트 뷰', onClick: () => { onFrontView?.(); onClose(); }, dividerAfter: true },
      { icon: <Grid3x3 size={13} />, label: gridVisible ? '그리드 숨기기' : '그리드 표시', onClick: () => { onToggleGrid?.(); onClose(); } },
    ];
  }

  // 메뉴 높이 동적 계산
  const hasHeader = isMultiMode || object;
  const dividerCount = items.filter((item) => item.dividerAfter).length;
  const menuHeight = MENU_PADDING
    + (hasHeader ? MENU_HEADER_HEIGHT : 0)
    + items.length * MENU_ITEM_HEIGHT
    + dividerCount * MENU_DIVIDER_HEIGHT
    + MENU_PADDING;

  // viewport 경계 보정
  let menuX = position.x;
  let menuY = position.y;

  // 우측 경계 체크
  if (menuX + MENU_WIDTH > window.innerWidth) {
    menuX = window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN;
  }
  // 하단 경계 체크
  if (menuY + menuHeight > window.innerHeight) {
    menuY = window.innerHeight - menuHeight - VIEWPORT_MARGIN;
  }
  // 좌측/상단 최소값
  if (menuX < VIEWPORT_MARGIN) menuX = VIEWPORT_MARGIN;
  if (menuY < VIEWPORT_MARGIN) menuY = VIEWPORT_MARGIN;

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: menuY,
    left: menuX,
    zIndex: 100,
    minWidth: MENU_WIDTH,
    background: 'rgba(22,27,34,0.98)',
    border: '1px solid #30363D',
    borderRadius: 10,
    padding: '4px 0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(45,125,210,0.1)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <div ref={menuRef} style={menuStyle} onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }} onMouseDown={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}>
      {/* 헤더 */}
      {headerContent}

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
    multiSelectedIds: Set<string> | null;
    position: { x: number; y: number } | null;
  }>({ object: null, multiSelectedIds: null, position: null });

  const openMenu = useCallback((e: React.MouseEvent, object?: SpatialObject, multiIds?: Set<string>) => {
    e.preventDefault();
    e.stopPropagation();
    setContextState({
      object: object ?? null,
      multiSelectedIds: multiIds ?? null,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const closeMenu = useCallback(() => {
    setContextState({ object: null, multiSelectedIds: null, position: null });
  }, []);

  return { contextState, openMenu, closeMenu };
}
