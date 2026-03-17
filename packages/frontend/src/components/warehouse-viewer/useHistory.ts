import { useState, useCallback, useRef } from 'react';
import type { SpatialObject } from '../../types/spatial';

// 히스토리 액션 타입 정의
export type HistoryAction =
  | { type: 'place'; object: SpatialObject }
  | { type: 'delete'; object: SpatialObject }
  | { type: 'move'; objectId: string; from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }
  | { type: 'update'; objectId: string; before: Partial<SpatialObject>; after: Partial<SpatialObject> }
  | { type: 'rotate'; objectId: string; before: { rotationY: number; scaleX: number; scaleZ: number }; after: { rotationY: number; scaleX: number; scaleZ: number } }
  | { type: 'multiDelete'; objects: SpatialObject[] }
  | { type: 'groupMove'; moves: Array<{ objectId: string; from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }> };

const MAX_HISTORY = 50;

/**
 * Undo/Redo 히스토리 훅
 * - 최대 50개 액션 저장
 * - 새 액션 push 시 redo 스택 초기화
 */
export function useHistory() {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  // ref로 최신 스택 접근 (콜백 안정성)
  const undoRef = useRef(undoStack);
  undoRef.current = undoStack;
  const redoRef = useRef(redoStack);
  redoRef.current = redoStack;

  const pushAction = useCallback((action: HistoryAction) => {
    setUndoStack((prev) => {
      const next = [...prev, action];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]); // 새 액션 시 redo 초기화
  }, []);

  const undo = useCallback((): HistoryAction | null => {
    const stack = undoRef.current;
    if (stack.length === 0) return null;
    const action = stack[stack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, action]);
    return action;
  }, []);

  const redo = useCallback((): HistoryAction | null => {
    const stack = redoRef.current;
    if (stack.length === 0) return null;
    const action = stack[stack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, action]);
    return action;
  }, []);

  return {
    pushAction,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
