import { useCallback, useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SpatialObject } from '../../types/spatial';

interface SelectionBoxOverlayProps {
  /** 드래그 선택 활성 여부 (배치·이동·리사이즈 중이면 비활성) */
  enabled: boolean;
  /** 3D 씬 내 모든 활성 오브젝트 */
  objects: SpatialObject[];
  /** 드래그 선택 완료 콜백 — 선택된 ID 집합 전달 */
  onSelectionComplete: (ids: Set<string>, additive: boolean) => void;
  /** 래퍼 DOM (Canvas 부모) */
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
}

/**
 * 2D 선택 박스 오버레이 + 3D 프러스텀 기반 오브젝트 선택
 * - 빈 공간에서 좌클릭+드래그 시 파란 선택 사각형 표시
 * - 드래그 종료 시 사각형 내 오브젝트를 프러스텀 검사로 선택
 * - Shift 키로 추가 선택 지원
 */
export function SelectionBoxOverlay({ enabled, objects, onSelectionComplete, wrapperRef }: SelectionBoxOverlayProps) {
  const [drag, setDrag] = useState<DragState | null>(null);

  // Shift 키 추적
  const shiftRef = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftRef.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // 오브젝트 히트 여부 확인 (마우스 다운 시 오브젝트 위인지)
  const isOverObject = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !enabled) return;

    // 캔버스 요소 찾기
    const canvas = wrapper.querySelector('canvas');
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      // 좌클릭만
      if (e.button !== 0) return;
      if (!enabled) return;

      // R3F가 이미 오브젝트를 감지했는지 확인 (짧은 딜레이)
      // → 대신, 별도 ref로 오브젝트 클릭 여부를 외부에서 설정
      // 여기서는 간단히 시작점 기록
      isOverObject.current = false;

      // 약간의 딜레이로 R3F onClick이 먼저 처리되도록
      requestAnimationFrame(() => {
        if (isOverObject.current) return;

        const rect = wrapper.getBoundingClientRect();
        setDrag({
          startX: e.clientX - rect.left,
          startY: e.clientY - rect.top,
          currentX: e.clientX - rect.left,
          currentY: e.clientY - rect.top,
          active: false,
        });
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      setDrag((prev) => {
        if (!prev) return null;
        const rect = wrapper.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const dx = cx - prev.startX;
        const dy = cy - prev.startY;
        // 5px 이상 이동해야 드래그 활성화
        const active = prev.active || (dx * dx + dy * dy > 25);
        return { ...prev, currentX: cx, currentY: cy, active };
      });
    };

    const onPointerUp = () => {
      setDrag((prev) => {
        if (prev?.active) {
          // 드래그 완료 — 선택 박스 내 오브젝트 계산
          // 비동기로 처리 (상태 업데이트 후 콜백)
          const rect = wrapper.getBoundingClientRect();
          const minX = Math.min(prev.startX, prev.currentX);
          const maxX = Math.max(prev.startX, prev.currentX);
          const minY = Math.min(prev.startY, prev.currentY);
          const maxY = Math.max(prev.startY, prev.currentY);

          // NDC 좌표로 변환
          const ndcMinX = (minX / rect.width) * 2 - 1;
          const ndcMaxX = (maxX / rect.width) * 2 - 1;
          const ndcMinY = -(maxY / rect.height) * 2 + 1; // Y 반전
          const ndcMaxY = -(minY / rect.height) * 2 + 1;

          // 선택된 오브젝트 ID
          const selectedIds = new Set<string>();

          // 카메라 정보 가져오기 — wrapper에 저장된 ref 사용
          const cameraData = (wrapper as HTMLDivElement & { __selectionCamera?: THREE.Camera }).__selectionCamera;
          if (cameraData) {
            for (const obj of objects) {
              // 바닥/천장/벽은 선택에서 제외
              const tn = obj.type.name;
              if (tn === 'FLOOR' || tn === 'WALL') continue;
              const meta = obj.metadata as Record<string, unknown> | null;
              if (meta?.floorStyle || meta?.wallStyle || meta?.doorStyle || meta?.isCeiling) continue;

              // 오브젝트 중심을 NDC로 변환
              const pos = new THREE.Vector3(obj.positionX, obj.positionY, obj.positionZ);
              pos.project(cameraData);

              if (pos.x >= ndcMinX && pos.x <= ndcMaxX && pos.y >= ndcMinY && pos.y <= ndcMaxY && pos.z > 0 && pos.z < 1) {
                selectedIds.add(obj.id);
              }
            }
          }

          if (selectedIds.size > 0) {
            onSelectionComplete(selectedIds, shiftRef.current);
          }
        }
        return null;
      });
    };

    wrapper.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      wrapper.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [enabled, objects, onSelectionComplete, wrapperRef]);

  if (!drag?.active) return null;

  const left = Math.min(drag.startX, drag.currentX);
  const top = Math.min(drag.startY, drag.currentY);
  const width = Math.abs(drag.currentX - drag.startX);
  const height = Math.abs(drag.currentY - drag.startY);

  return (
    <div
      className="pointer-events-none absolute z-40"
      style={{
        left, top, width, height,
        border: '1px solid rgba(45, 125, 210, 0.8)',
        background: 'rgba(45, 125, 210, 0.12)',
        boxShadow: '0 0 8px rgba(45, 125, 210, 0.3)',
      }}
    />
  );
}

/**
 * R3F 내부 컴포넌트 — 카메라 참조를 wrapper DOM에 저장
 * SelectionBoxOverlay가 프러스텀 계산 시 사용
 */
export function SelectionCameraSync({ wrapperRef }: { wrapperRef: React.RefObject<HTMLDivElement | null> }) {
  const { camera } = useThree();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      (wrapper as HTMLDivElement & { __selectionCamera?: THREE.Camera }).__selectionCamera = camera;
    }
  });

  return null;
}
