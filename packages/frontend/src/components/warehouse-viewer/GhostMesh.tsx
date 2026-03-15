import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { SpatialPreset } from '../../types/preset';
import type { SpatialObject } from '../../types/spatial';
import { RackModel } from './RackModel';
import { checkCollision } from '../../utils/collision';

interface GhostMeshProps {
  preset: SpatialPreset;
  onPlace: (position: [number, number, number]) => void;
  existingObjects?: SpatialObject[];
}

// 바닥 평면 (Y=0)
const floorPlane = new Plane().setFromNormalAndCoplanarPoint(
  new Vector3(0, 1, 0),
  new Vector3(0, 0, 0),
);
const raycaster = new Raycaster();
const pointer = new Vector2();
const intersection = new Vector3();

/**
 * 배치 모드 고스트 메시 — 실제 랙 구조 표시 + AABB 충돌 감지
 * - 랙 타입: 실제 프레임/빔 구조 표시
 * - 충돌 시: 빨간색 (배치 불가)
 * - 정상: 파란색 글로우
 */
export function GhostMesh({ preset, onPlace, existingObjects = [] }: GhostMeshProps) {
  const groupRef = useRef<Group>(null);
  const { camera, gl } = useThree();
  const [isColliding, setIsColliding] = useState(false);

  const w = preset.width || 1;
  const d = preset.depth || 1;
  const h = preset.height || 1;

  // 랙인지 판별
  const meta = preset.metadata as Record<string, unknown> | null;
  const isRack = meta?.levels !== undefined;
  const levels = (meta?.levels as number) ?? 3;
  const levelHeight = (meta?.levelHeight as number) ?? 1.5;

  // 매 프레임마다 마우스 위치로 이동 + 충돌 검사
  useFrame(() => {
    if (!groupRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(floorPlane, intersection);
    if (hit) {
      const snapX = Math.round(hit.x);
      const snapZ = Math.round(hit.z);
      const posY = h / 2;

      groupRef.current.position.x = snapX;
      groupRef.current.position.y = posY;
      groupRef.current.position.z = snapZ;

      // AABB 충돌 검사
      const colliding = checkCollision(snapX, posY, snapZ, w, h, d, existingObjects);
      setIsColliding(colliding);
    }
  });

  // 마우스 이벤트 등록/해제
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!groupRef.current) return;
      if (isColliding) return; // 충돌 시 배치 차단
      const pos = groupRef.current.position;
      onPlace([pos.x, pos.y, pos.z]);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [gl, camera, onPlace, isColliding]);

  // 랙 구조 고스트
  if (isRack) {
    return (
      <group ref={groupRef} position={[0, h / 2, 0]}>
        {/* 반투명 외곽 박스 (글로우 효과) */}
        <mesh>
          <boxGeometry args={[w + 0.1, h + 0.1, d + 0.1]} />
          <meshStandardMaterial
            color={isColliding ? '#EF4444' : '#2D7DD2'}
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </mesh>
        {/* 실제 랙 구조 (반투명) */}
        <group position={[0, -h / 2, 0]}>
          <RackModel
            width={w}
            height={h}
            depth={d}
            levels={levels}
            levelHeight={levelHeight}
            isSelected={false}
            isHovered={false}
          />
        </group>
        {/* 오버레이 반투명 색상 */}
        <mesh>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={isColliding ? '#EF4444' : '#2D7DD2'}
            transparent
            opacity={isColliding ? 0.3 : 0.15}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // 기본 박스 고스트
  return (
    <group ref={groupRef} position={[0, h / 2, 0]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={isColliding ? '#EF4444' : '#2D7DD2'}
          transparent
          opacity={isColliding ? 0.4 : 0.3}
          depthWrite={false}
        />
      </mesh>
      {/* 와이어프레임 */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={isColliding ? '#EF4444' : '#3B82F6'}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}
