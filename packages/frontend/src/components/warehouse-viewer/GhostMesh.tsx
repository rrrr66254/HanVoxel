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

// KR_STANDARD 랙 기본 규격 (warehouse-standards.md)
const KR_STANDARD = { w: 2.7, d: 1.1, h: 5.4, levels: 3, levelHeight: 1.5 };

/**
 * 배치 모드 고스트 메시 — KR_STANDARD 랙 구조 표시 + AABB 충돌 감지
 * - 실제 프레임/빔/브레이싱 구조 표시
 * - 배치 가능: 파란 반투명 glow (opacity 0.5)
 * - 배치 불가(충돌): 빨간 반투명 (opacity 0.5)
 */
export function GhostMesh({ preset, onPlace, existingObjects = [] }: GhostMeshProps) {
  const groupRef = useRef<Group>(null);
  const { camera, gl } = useThree();
  const [isColliding, setIsColliding] = useState(false);

  // 프리셋 메타에서 랙 정보 추출, 없으면 KR_STANDARD 사용
  const meta = preset.metadata as Record<string, unknown> | null;
  const isRack = meta?.levels !== undefined || preset.width === KR_STANDARD.w;
  const w = preset.width || KR_STANDARD.w;
  const d = preset.depth || KR_STANDARD.d;
  const h = preset.height || KR_STANDARD.h;
  const levels = (meta?.levels as number) ?? KR_STANDARD.levels;
  const levelHeight = (meta?.levelHeight as number) ?? KR_STANDARD.levelHeight;

  // 매 프레임 마우스 추적 + 충돌 검사
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

  // 마우스 이벤트
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

  const glowColor = isColliding ? '#EF4444' : '#2D7DD2';

  // 랙 구조 고스트 (항상 실제 구조체 표시)
  if (isRack) {
    return (
      <group ref={groupRef} position={[0, h / 2, 0]}>
        {/* 실제 랙 구조 (프레임/빔/브레이싱) */}
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
        {/* 충돌/유효 상태 반투명 오버레이 (opacity 0.5) */}
        <mesh>
          <boxGeometry args={[w + 0.15, h + 0.15, d + 0.15]} />
          <meshStandardMaterial
            color={glowColor}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // 기본 박스 고스트 (비랙 오브젝트)
  return (
    <group ref={groupRef} position={[0, h / 2, 0]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={glowColor}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={glowColor}
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}
