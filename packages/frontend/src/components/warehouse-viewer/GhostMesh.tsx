import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import * as THREE from 'three';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { SpatialPreset } from '../../types/preset';
import type { SpatialObject } from '../../types/spatial';
import { RackModel } from './RackModel';
import { AisleModel } from './AisleModel';
import { FloorTileModel } from './FloorTileModel';
import { WallPanelModel } from './WallPanelModel';
import { DoorModel } from './DoorModel';
import type { DoorStyle } from './DoorModel';
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

  // 프리셋에서 스타일 정보 추출
  const extra = preset as unknown as Record<string, unknown>;
  const meta = preset.metadata as Record<string, unknown> | null;
  const isRack = (meta?.levels !== undefined || preset.levels !== null) && !extra.floorStyle && !extra.wallStyle;
  const isAisle = extra.aisleType !== undefined || preset.code?.includes('AISLE');
  const isFloor = extra.floorStyle !== undefined || preset.code?.includes('FLOOR');
  const isWall = extra.wallStyle !== undefined || preset.code?.includes('WALL');
  const isDoor = extra.doorStyle !== undefined || preset.code?.includes('DOOR');
  const w = preset.width || KR_STANDARD.w;
  const d = preset.depth || KR_STANDARD.d;
  const h = preset.height || KR_STANDARD.h;
  const levels = (preset.levels as number) ?? (meta?.levels as number) ?? KR_STANDARD.levels;
  const levelHeight = (preset.levelHeight as number) ?? (meta?.levelHeight as number) ?? KR_STANDARD.levelHeight;

  // 매 프레임 마우스 추적 + 충돌 검사
  useFrame(() => {
    if (!groupRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(floorPlane, intersection);
    if (hit) {
      const snapX = Math.round(hit.x);
      const snapZ = Math.round(hit.z);
      // 통로/바닥은 바닥에 깔림, 벽은 절반 높이, 일반은 절반 높이
      const posY = (isAisle || isFloor) ? 0.01 : (isWall ? h / 2 : h / 2);

      groupRef.current.position.x = snapX;
      groupRef.current.position.y = posY;
      groupRef.current.position.z = snapZ;

      // 통로/바닥은 충돌 검사 안 함 (바닥에 깔리므로)
      if (isAisle || isFloor) {
        setIsColliding(false);
      } else {
        const colliding = checkCollision(snapX, posY, snapZ, w, h, d, existingObjects);
        setIsColliding(colliding);
      }
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

  // 통로 고스트 — 바닥 마킹 미리보기
  if (isAisle) {
    const aisleColor = (extra.color as string) ?? '#64748b';
    const isEmergency = (extra.aisleType as string) === 'EMERGENCY';
    return (
      <group ref={groupRef} position={[0, 0.01, 0]}>
        <AisleModel width={w} length={d} color={aisleColor} isEmergency={isEmergency} />
        {/* 반투명 오버레이 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[w + 0.1, d + 0.1]} />
          <meshStandardMaterial color={glowColor} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  // 바닥 고스트 — 텍스처 미리보기
  if (isFloor) {
    const floorStyle = (extra.floorStyle as string) ?? 'EPOXY_GRAY';
    return (
      <group ref={groupRef} position={[0, 0.01, 0]}>
        <FloorTileModel
          width={w} depth={d}
          style={floorStyle as 'EPOXY_GRAY' | 'EPOXY_GREEN' | 'CONCRETE' | 'ANTI_SLIP' | 'MARKING'}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[w + 0.1, d + 0.1]} />
          <meshStandardMaterial color={glowColor} transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  // 벽 고스트 — 텍스처 미리보기
  if (isWall) {
    const wallStyle = (extra.wallStyle as string) ?? 'SANDWICH_PANEL';
    const thickness = d || 0.15;
    return (
      <group ref={groupRef} position={[0, h / 2, 0]}>
        <WallPanelModel
          width={w} height={h} thickness={thickness}
          style={wallStyle as 'SANDWICH_PANEL' | 'CONCRETE_WALL' | 'METAL_CORRUGATED' | 'BRICK'}
        />
        <mesh>
          <boxGeometry args={[w + 0.1, h + 0.1, thickness + 0.1]} />
          <meshStandardMaterial color={glowColor} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  // 출입문 고스트
  if (isDoor) {
    const doorStyle = (extra.doorStyle as DoorStyle) ?? 'ROLLING_SHUTTER';
    const thickness = d || 0.15;
    return (
      <group ref={groupRef} position={[0, 0, 0]}>
        <DoorModel
          width={w} height={h} thickness={thickness}
          style={doorStyle}
        />
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.1, h + 0.1, thickness + 0.1]} />
          <meshStandardMaterial color={glowColor} transparent opacity={0.2} depthWrite={false} />
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
