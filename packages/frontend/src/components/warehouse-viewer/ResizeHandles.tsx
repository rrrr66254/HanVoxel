import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SpatialObject } from '../../types/spatial';

interface ResizeHandlesProps {
  object: SpatialObject;
  onResize: (updated: SpatialObject) => void;
  /** 'floor' = XZ 평면 리사이즈, 'wall' = XY or XZ 리사이즈 */
  mode: 'floor' | 'wall';
  /** 리사이즈 시작 시 호출 (OrbitControls 비활성화용) */
  onResizeStart?: () => void;
  /** 리사이즈 종료 시 호출 (OrbitControls 재활성화용) */
  onResizeEnd?: () => void;
  /** 스냅 대상이 되는 다른 오브젝트들 */
  allObjects?: SpatialObject[];
}

// 핸들 크기
const HANDLE_SIZE = 0.3;
const EDGE_HANDLE_SIZE = 0.2;

// 핸들 색상
const HANDLE_COLOR = '#2D7DD2';
const HANDLE_HOVER = '#5BA3E0';
const HANDLE_ACTIVE = '#FF8C00';

type HandleId = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/**
 * 바닥/벽 리사이즈 핸들 — 윈도우 창 크기 조절 방식
 * 가장자리와 모서리에 드래그 핸들 표시
 */
// 인접 구조물 가장자리 스냅 임계값 (m)
const SNAP_THRESHOLD = 0.3;

/** 다른 오브젝트들의 X/Z 가장자리 좌표 수집 */
function collectEdges(objects: SpatialObject[], excludeId: string) {
  const xEdges: number[] = [];
  const zEdges: number[] = [];
  for (const o of objects) {
    if (o.id === excludeId || !o.visible) continue;
    const hw = o.scaleX / 2;
    const hd = o.scaleZ / 2;
    xEdges.push(o.positionX - hw, o.positionX + hw);
    zEdges.push(o.positionZ - hd, o.positionZ + hd);
  }
  return { xEdges, zEdges };
}

/** 값에 가장 가까운 가장자리를 찾아 스냅 (임계값 내) */
function snapToEdge(value: number, edges: number[], threshold: number): number {
  let best = value;
  let bestDist = threshold;
  for (const edge of edges) {
    const dist = Math.abs(value - edge);
    if (dist < bestDist) {
      bestDist = dist;
      best = edge;
    }
  }
  return best;
}

export function ResizeHandles({ object, onResize, mode, onResizeStart, onResizeEnd, allObjects }: ResizeHandlesProps) {
  const { camera, gl } = useThree();
  const [hoveredHandle, setHoveredHandle] = useState<HandleId | null>(null);
  const activeHandleRef = useRef<HandleId | null>(null);
  const [, forceUpdate] = useState(0);
  const dragStartRef = useRef<{ x: number; z: number; origScaleX: number; origScaleZ: number; origScaleY: number; origPosX: number; origPosZ: number; origPosY: number } | null>(null);
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const objectRef = useRef(object);
  objectRef.current = object;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const allObjectsRef = useRef(allObjects);
  allObjectsRef.current = allObjects;

  const w = object.scaleX;
  const h = object.scaleY;
  const d = object.scaleZ;
  const isFloor = mode === 'floor';

  // 핸들 위치 계산 (로컬 좌표)
  const handles: { id: HandleId; pos: [number, number, number]; cursor: string }[] = isFloor
    ? [
        { id: 'n', pos: [0, 0.05, -d / 2], cursor: 'ns-resize' },
        { id: 's', pos: [0, 0.05, d / 2], cursor: 'ns-resize' },
        { id: 'e', pos: [w / 2, 0.05, 0], cursor: 'ew-resize' },
        { id: 'w', pos: [-w / 2, 0.05, 0], cursor: 'ew-resize' },
        { id: 'ne', pos: [w / 2, 0.05, -d / 2], cursor: 'nesw-resize' },
        { id: 'nw', pos: [-w / 2, 0.05, -d / 2], cursor: 'nesw-resize' },
        { id: 'se', pos: [w / 2, 0.05, d / 2], cursor: 'nesw-resize' },
        { id: 'sw', pos: [-w / 2, 0.05, d / 2], cursor: 'nesw-resize' },
      ]
    : [
        { id: 'e', pos: [w / 2, h / 2, 0], cursor: 'ew-resize' },
        { id: 'w', pos: [-w / 2, h / 2, 0], cursor: 'ew-resize' },
        { id: 'n', pos: [0, h, 0], cursor: 'ns-resize' },
        { id: 'ne', pos: [w / 2, h, 0], cursor: 'nesw-resize' },
        { id: 'nw', pos: [-w / 2, h, 0], cursor: 'nesw-resize' },
      ];

  // 마우스 위치 → 월드 좌표 (바닥 평면 기준)
  const getWorldPos = useCallback((clientX: number, clientY: number): THREE.Vector3 | null => {
    const rect = gl.domElement.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(planeRef.current, intersection);
    return hit ? intersection : null;
  }, [camera, gl]);

  // 드래그 이벤트 핸들러 (window 이벤트)
  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const handle = activeHandleRef.current;
      if (!handle || !dragStartRef.current) return;

      const worldPos = getWorldPos(ev.clientX, ev.clientY);
      if (!worldPos) return;

      const { origScaleX, origScaleZ, origScaleY, origPosX, origPosZ, origPosY } = dragStartRef.current;
      const dx = worldPos.x - dragStartRef.current.x;
      const dz = worldPos.z - dragStartRef.current.z;

      let newScaleX = origScaleX;
      let newScaleZ = origScaleZ;
      let newScaleY = origScaleY;
      let newPosX = origPosX;
      let newPosZ = origPosZ;
      let newPosY = origPosY;

      if (isFloor) {
        switch (handle) {
          case 'e':
            newScaleX = Math.max(1, origScaleX + dx);
            newPosX = origPosX + dx / 2;
            break;
          case 'w':
            newScaleX = Math.max(1, origScaleX - dx);
            newPosX = origPosX + dx / 2;
            break;
          case 'n':
            newScaleZ = Math.max(1, origScaleZ - dz);
            newPosZ = origPosZ + dz / 2;
            break;
          case 's':
            newScaleZ = Math.max(1, origScaleZ + dz);
            newPosZ = origPosZ + dz / 2;
            break;
          case 'ne':
            newScaleX = Math.max(1, origScaleX + dx);
            newScaleZ = Math.max(1, origScaleZ - dz);
            newPosX = origPosX + dx / 2;
            newPosZ = origPosZ + dz / 2;
            break;
          case 'nw':
            newScaleX = Math.max(1, origScaleX - dx);
            newScaleZ = Math.max(1, origScaleZ - dz);
            newPosX = origPosX + dx / 2;
            newPosZ = origPosZ + dz / 2;
            break;
          case 'se':
            newScaleX = Math.max(1, origScaleX + dx);
            newScaleZ = Math.max(1, origScaleZ + dz);
            newPosX = origPosX + dx / 2;
            newPosZ = origPosZ + dz / 2;
            break;
          case 'sw':
            newScaleX = Math.max(1, origScaleX - dx);
            newScaleZ = Math.max(1, origScaleZ + dz);
            newPosX = origPosX + dx / 2;
            newPosZ = origPosZ + dz / 2;
            break;
        }
      } else {
        switch (handle) {
          case 'e':
            newScaleX = Math.max(0.5, origScaleX + dx);
            newPosX = origPosX + dx / 2;
            break;
          case 'w':
            newScaleX = Math.max(0.5, origScaleX - dx);
            newPosX = origPosX + dx / 2;
            break;
          case 'n':
            newScaleY = Math.max(0.5, origScaleY - dz);
            newPosY = origPosY + (-dz) / 2;
            break;
          case 'ne':
            newScaleX = Math.max(0.5, origScaleX + dx);
            newScaleY = Math.max(0.5, origScaleY - dz);
            newPosX = origPosX + dx / 2;
            newPosY = origPosY + (-dz) / 2;
            break;
          case 'nw':
            newScaleX = Math.max(0.5, origScaleX - dx);
            newScaleY = Math.max(0.5, origScaleY - dz);
            newPosX = origPosX + dx / 2;
            newPosY = origPosY + (-dz) / 2;
            break;
          default: break;
        }
      }

      // 인접 구조물 가장자리 스냅 — 기존 0.5m 그리드보다 우선
      const others = allObjectsRef.current;
      if (others && others.length > 0 && isFloor) {
        const { xEdges, zEdges } = collectEdges(others, objectRef.current.id);

        // 현재 리사이즈 중인 오브젝트의 가장자리 좌표
        const leftEdge = newPosX - newScaleX / 2;
        const rightEdge = newPosX + newScaleX / 2;
        const topEdge = newPosZ - newScaleZ / 2;
        const bottomEdge = newPosZ + newScaleZ / 2;

        // 드래그 중인 핸들에 따라 스냅할 가장자리 결정
        const handlesX = handle === 'e' || handle === 'ne' || handle === 'se';
        const handlesXLeft = handle === 'w' || handle === 'nw' || handle === 'sw';
        const handlesZ = handle === 's' || handle === 'se' || handle === 'sw';
        const handlesZTop = handle === 'n' || handle === 'ne' || handle === 'nw';

        if (handlesX) {
          const snapped = snapToEdge(rightEdge, xEdges, SNAP_THRESHOLD);
          if (snapped !== rightEdge) {
            const diff = snapped - rightEdge;
            newScaleX += diff;
            newPosX += diff / 2;
          }
        }
        if (handlesXLeft) {
          const snapped = snapToEdge(leftEdge, xEdges, SNAP_THRESHOLD);
          if (snapped !== leftEdge) {
            const diff = snapped - leftEdge;
            newScaleX -= diff;
            newPosX += diff / 2;
          }
        }
        if (handlesZ) {
          const snapped = snapToEdge(bottomEdge, zEdges, SNAP_THRESHOLD);
          if (snapped !== bottomEdge) {
            const diff = snapped - bottomEdge;
            newScaleZ += diff;
            newPosZ += diff / 2;
          }
        }
        if (handlesZTop) {
          const snapped = snapToEdge(topEdge, zEdges, SNAP_THRESHOLD);
          if (snapped !== topEdge) {
            const diff = snapped - topEdge;
            newScaleZ -= diff;
            newPosZ += diff / 2;
          }
        }
      } else {
        // 다른 오브젝트 없으면 기존 0.5m 그리드 스냅
        newScaleX = Math.round(newScaleX * 2) / 2;
        newScaleZ = Math.round(newScaleZ * 2) / 2;
        newScaleY = Math.round(newScaleY * 2) / 2;
        newPosX = Math.round(newPosX * 2) / 2;
        newPosZ = Math.round(newPosZ * 2) / 2;
      }

      // 벽 모드는 항상 0.5m 그리드 스냅
      if (!isFloor) {
        newScaleX = Math.round(newScaleX * 2) / 2;
        newScaleY = Math.round(newScaleY * 2) / 2;
        newPosX = Math.round(newPosX * 2) / 2;
      }

      onResizeRef.current({
        ...objectRef.current,
        scaleX: newScaleX, scaleZ: newScaleZ, scaleY: newScaleY,
        positionX: newPosX, positionZ: newPosZ, positionY: newPosY,
      });
    };

    const onUp = () => {
      if (activeHandleRef.current) {
        onResizeEnd?.();
      }
      activeHandleRef.current = null;
      dragStartRef.current = null;
      document.body.style.cursor = 'default';
      forceUpdate((v) => v + 1);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [getWorldPos, isFloor]);

  // 드래그 시작
  const handlePointerDown = useCallback((handleId: HandleId, e: { stopPropagation: () => void; nativeEvent?: PointerEvent }) => {
    e.stopPropagation();
    const native = e.nativeEvent;
    if (!native) return;

    activeHandleRef.current = handleId;
    forceUpdate((v) => v + 1);
    onResizeStart?.();

    // 드래그 평면 설정
    if (isFloor) {
      planeRef.current.set(new THREE.Vector3(0, 1, 0), -object.positionY);
    } else {
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      if (Math.abs(camDir.z) > Math.abs(camDir.x)) {
        planeRef.current.set(new THREE.Vector3(0, 0, 1), -object.positionZ);
      } else {
        planeRef.current.set(new THREE.Vector3(1, 0, 0), -object.positionX);
      }
    }

    const worldPos = getWorldPos(native.clientX, native.clientY);
    if (worldPos) {
      dragStartRef.current = {
        x: worldPos.x, z: worldPos.z,
        origScaleX: object.scaleX, origScaleZ: object.scaleZ, origScaleY: object.scaleY,
        origPosX: object.positionX, origPosZ: object.positionZ, origPosY: object.positionY,
      };
    }
  }, [object, camera, getWorldPos, isFloor]);

  return (
    <group>
      {handles.map(({ id, pos, cursor }) => {
        const isCorner = id.length === 2;
        const size = isCorner ? HANDLE_SIZE : EDGE_HANDLE_SIZE;
        const isActive = activeHandleRef.current === id;
        const isHovered = hoveredHandle === id;
        const color = isActive ? HANDLE_ACTIVE : isHovered ? HANDLE_HOVER : HANDLE_COLOR;

        return (
          <mesh
            key={id}
            position={pos}
            onPointerDown={(e) => {
              handlePointerDown(id, e);
              document.body.style.cursor = cursor;
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredHandle(id);
              document.body.style.cursor = cursor;
            }}
            onPointerOut={() => {
              setHoveredHandle(null);
              if (!activeHandleRef.current) document.body.style.cursor = 'default';
            }}
          >
            {isCorner ? (
              <boxGeometry args={[size, size * 0.5, size]} />
            ) : (
              <sphereGeometry args={[size * 0.6, 8, 8]} />
            )}
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isHovered || isActive ? 0.5 : 0.2}
              transparent
              opacity={0.85}
            />
          </mesh>
        );
      })}
    </group>
  );
}
