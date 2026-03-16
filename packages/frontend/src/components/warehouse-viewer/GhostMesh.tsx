import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
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
import { PalletModel } from './PalletModel';
import { ProductBoxModel } from './ProductBoxModel';
import {
  QCTableModel, FireHydrantModel, FireExtinguisherModel,
  PackingStationModel, ChargingStationModel, GuardRailModel,
  ColumnModel, ExitSignModel, TrashBinModel,
} from './EquipmentModel';
import { checkCollision } from '../../utils/collision';

interface GhostMeshProps {
  preset: SpatialPreset;
  onPlace: (position: [number, number, number], rotationY?: number) => void;
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
  const isPallet = preset.code?.includes('PALLET') || preset.code?.includes('T11') || preset.code?.includes('T12') || preset.code?.includes('T08');
  const isLoadedPallet = preset.code?.includes('LOADED');
  const isProductBox = preset.code?.includes('BOX_');
  const isWallMounted = !!(meta?.wallMounted);
  const mountHeight = (meta?.mountHeight as number) ?? 1.2;
  const w = preset.width || KR_STANDARD.w;
  const d = preset.depth || KR_STANDARD.d;
  const h = preset.height || KR_STANDARD.h;
  const levels = (preset.levels as number) ?? (meta?.levels as number) ?? KR_STANDARD.levels;
  const levelHeight = (preset.levelHeight as number) ?? (meta?.levelHeight as number) ?? KR_STANDARD.levelHeight;

  // 벽 부착 아이템용 — 기존 벽 오브젝트 목록
  const wallObjects = useMemo(() => {
    if (!isWallMounted && !isDoor) return [];
    return existingObjects.filter((obj) => {
      const objMeta = obj.metadata as Record<string, unknown> | null;
      return objMeta?.wallStyle || obj.type.name === 'WALL';
    });
  }, [existingObjects, isWallMounted, isDoor]);

  // 벽 부착/출입문 — 가장 가까운 벽 면을 찾아 스냅
  const [wallRotation, setWallRotation] = useState(0);
  const [currentMountY, setCurrentMountY] = useState(mountHeight);

  // 벽 면 스냅 계산 함수
  const findNearestWallSurface = useCallback((worldX: number, worldZ: number): { x: number; z: number; rotY: number; wallObj: SpatialObject } | null => {
    let bestDist = Infinity;
    let bestSnap: { x: number; z: number; rotY: number; wallObj: SpatialObject } | null = null;

    for (const wall of wallObjects) {
      const wX = wall.positionX;
      const wZ = wall.positionZ;
      const wW = wall.scaleX; // 벽 너비
      const wD = wall.scaleZ; // 벽 두께
      const wRotY = wall.rotationY;

      // 벽이 X축 방향 (rotY ≈ 0) 인지 Z축 방향 (rotY ≈ π/2) 인지
      const isXAligned = Math.abs(Math.sin(wRotY)) < 0.5;

      if (isXAligned) {
        // X축 방향 벽 — 남/북 면에 부착
        const halfW = wW / 2;
        const halfD = wD / 2;
        // 벽 범위 내에 있는지 확인 (X 방향)
        if (worldX >= wX - halfW - 0.5 && worldX <= wX + halfW + 0.5) {
          // 남쪽 면 (Z-)
          const southDist = Math.abs(worldZ - (wZ - halfD));
          if (southDist < bestDist && southDist < 3) {
            bestDist = southDist;
            const clampedX = Math.max(wX - halfW + (isDoor ? w / 2 : 0), Math.min(wX + halfW - (isDoor ? w / 2 : 0), Math.round(worldX * 2) / 2));
            bestSnap = { x: clampedX, z: wZ - halfD - d / 2, rotY: 0, wallObj: wall };
          }
          // 북쪽 면 (Z+)
          const northDist = Math.abs(worldZ - (wZ + halfD));
          if (northDist < bestDist && northDist < 3) {
            bestDist = northDist;
            const clampedX = Math.max(wX - halfW + (isDoor ? w / 2 : 0), Math.min(wX + halfW - (isDoor ? w / 2 : 0), Math.round(worldX * 2) / 2));
            bestSnap = { x: clampedX, z: wZ + halfD + d / 2, rotY: Math.PI, wallObj: wall };
          }
        }
      } else {
        // Z축 방향 벽 — 동/서 면에 부착
        const halfW = wW / 2;
        const halfD = wD / 2;
        // 벽의 길이 방향은 Z축 (회전 후)
        if (worldZ >= wZ - halfW - 0.5 && worldZ <= wZ + halfW + 0.5) {
          // 서쪽 면 (X-)
          const westDist = Math.abs(worldX - (wX - halfD));
          if (westDist < bestDist && westDist < 3) {
            bestDist = westDist;
            const clampedZ = Math.max(wZ - halfW + (isDoor ? w / 2 : 0), Math.min(wZ + halfW - (isDoor ? w / 2 : 0), Math.round(worldZ * 2) / 2));
            bestSnap = { x: wX - halfD - d / 2, z: clampedZ, rotY: Math.PI / 2, wallObj: wall };
          }
          // 동쪽 면 (X+)
          const eastDist = Math.abs(worldX - (wX + halfD));
          if (eastDist < bestDist && eastDist < 3) {
            bestDist = eastDist;
            const clampedZ = Math.max(wZ - halfW + (isDoor ? w / 2 : 0), Math.min(wZ + halfW - (isDoor ? w / 2 : 0), Math.round(worldZ * 2) / 2));
            bestSnap = { x: wX + halfD + d / 2, z: clampedZ, rotY: -Math.PI / 2, wallObj: wall };
          }
        }
      }
    }
    return bestSnap;
  }, [wallObjects, w, d, isDoor]);

  // 매 프레임 마우스 추적 + 충돌 검사
  useFrame(() => {
    if (!groupRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(floorPlane, intersection);
    if (hit) {
      // 벽 부착 아이템 — 벽 면에 스냅
      if (isWallMounted || isDoor) {
        const snap = findNearestWallSurface(hit.x, hit.z);
        if (snap) {
          groupRef.current.position.x = snap.x;
          groupRef.current.position.z = snap.z;
          groupRef.current.rotation.y = snap.rotY;
          setWallRotation(snap.rotY);

          if (isDoor) {
            groupRef.current.position.y = 0;
          } else {
            groupRef.current.position.y = currentMountY;
          }
          setIsColliding(false);
        } else {
          // 벽 근처가 아니면 배치 불가 표시
          const snapX = Math.round(hit.x);
          const snapZ = Math.round(hit.z);
          groupRef.current.position.x = snapX;
          groupRef.current.position.y = isDoor ? 0 : currentMountY;
          groupRef.current.position.z = snapZ;
          groupRef.current.rotation.y = 0;
          setIsColliding(true);
        }
        return;
      }

      const snapX = Math.round(hit.x);
      const snapZ = Math.round(hit.z);
      // 통로/바닥은 바닥에 깔림, 출입문은 Y=0 (DoorModel이 바닥에서 위로 그림), 벽/일반은 절반 높이
      const posY = (isAisle || isFloor) ? 0.01 : h / 2;

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
      const rot = groupRef.current.rotation;
      onPlace([pos.x, pos.y, pos.z], rot.y);
    };

    // 벽 부착 아이템 높이 조절 (스크롤 휠)
    const onWheel = (e: WheelEvent) => {
      if (!isWallMounted) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setCurrentMountY((prev) => Math.max(h / 2, Math.min(6, prev + delta)));
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    if (isWallMounted) {
      canvas.addEventListener('wheel', onWheel, { passive: false });
    }

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      if (isWallMounted) {
        canvas.removeEventListener('wheel', onWheel);
      }
    };
  }, [gl, camera, onPlace, isColliding, isWallMounted, h]);

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

  // 출입문 고스트 (벽 스냅)
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
        {/* 벽 근처 유도 텍스트 */}
        {isColliding && wallObjects.length > 0 && (
          <mesh position={[0, h + 0.5, 0]}>
            <boxGeometry args={[0, 0, 0]} />
          </mesh>
        )}
      </group>
    );
  }

  // 팔레트 고스트
  if (isPallet || isLoadedPallet) {
    return (
      <group ref={groupRef} position={[0, h / 2, 0]}>
        <group position={[0, -h / 2, 0]}>
          <PalletModel width={w} depth={d} height={isLoadedPallet ? 0.144 : h} />
          {isLoadedPallet && (
            <group position={[0, 0.144, 0]}>
              <ProductBoxModel width={w * 0.9} depth={d * 0.9} height={h - 0.144} />
            </group>
          )}
        </group>
        <mesh>
          <boxGeometry args={[w + 0.1, h + 0.1, d + 0.1]} />
          <meshStandardMaterial color={glowColor} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  // 제품 박스 고스트
  if (isProductBox) {
    const boxColor = (extra.color as string) ?? '#6b7280';
    return (
      <group ref={groupRef} position={[0, h / 2, 0]}>
        <group position={[0, -h / 2, 0]}>
          <ProductBoxModel width={w} depth={d} height={h} color={boxColor} />
        </group>
        <mesh>
          <boxGeometry args={[w + 0.1, h + 0.1, d + 0.1]} />
          <meshStandardMaterial color={glowColor} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  // 벽 부착 장비 고스트 (소화전/비상구/배전반)
  if (isWallMounted) {
    const safetyType = meta?.safetyType as string | undefined;
    const facilityType = meta?.facilityType as string | undefined;
    const EquipGhostComponent = safetyType === 'FIRE_HYDRANT' ? FireHydrantModel
      : safetyType === 'EXIT_SIGN' ? ExitSignModel
      : facilityType === 'ELEC_PANEL' ? FireHydrantModel
      : null;

    return (
      <group ref={groupRef} position={[0, currentMountY, 0]}>
        <group position={[0, -h / 2, 0]}>
          {EquipGhostComponent ? (
            <EquipGhostComponent width={w} depth={d} height={h} />
          ) : (
            <mesh>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={glowColor} transparent opacity={0.5} depthWrite={false} />
            </mesh>
          )}
        </group>
        <mesh>
          <boxGeometry args={[w + 0.1, h + 0.1, d + 0.1]} />
          <meshStandardMaterial color={glowColor} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  // 장비/안전/시설물 고스트 (바닥 배치)
  const equipType = meta?.equipType as string | undefined;
  const safetyTypeGhost = meta?.safetyType as string | undefined;
  const facilityTypeGhost = meta?.facilityType as string | undefined;
  const isEquipGhost = !!equipType || !!safetyTypeGhost || !!facilityTypeGhost;
  if (isEquipGhost) {
    const EqComp = equipType === 'QC_TABLE' ? QCTableModel
      : equipType === 'PACKING' ? PackingStationModel
      : equipType === 'CHARGING' ? ChargingStationModel
      : safetyTypeGhost === 'FIRE_HYDRANT' ? FireHydrantModel
      : safetyTypeGhost === 'FIRE_EXTINGUISHER' ? FireExtinguisherModel
      : safetyTypeGhost === 'EXIT_SIGN' ? ExitSignModel
      : safetyTypeGhost === 'GUARD_RAIL' ? GuardRailModel
      : facilityTypeGhost === 'COLUMN' ? ColumnModel
      : facilityTypeGhost === 'ELEC_PANEL' ? FireHydrantModel
      : facilityTypeGhost === 'TRASH' ? TrashBinModel
      : null;

    if (EqComp) {
      return (
        <group ref={groupRef} position={[0, h / 2, 0]}>
          <group position={[0, -h / 2, 0]}>
            <EqComp width={w} depth={d} height={h} />
          </group>
          <mesh>
            <boxGeometry args={[w + 0.1, h + 0.1, d + 0.1]} />
            <meshStandardMaterial color={glowColor} transparent opacity={0.2} depthWrite={false} />
          </mesh>
        </group>
      );
    }
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
