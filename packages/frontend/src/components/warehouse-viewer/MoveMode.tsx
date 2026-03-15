import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SpatialObject } from '../../types/spatial';
import type { BinOccupancy } from './BinPlacement';

// 바닥 평면 (Y=0)
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

interface MoveModeProps {
  /** 이동 중인 오브젝트 */
  movingObject: SpatialObject;
  /** 씬의 다른 모든 오브젝트 (충돌 검사용) */
  allObjects: SpatialObject[];
  /** 랙 목록 (BIN 이동 감지용) */
  racks: SpatialObject[];
  /** 기존 BIN 적재 데이터 */
  binOccupancy: BinOccupancy[];
  /** 이동 확정 */
  onDrop: (obj: SpatialObject, newPos: THREE.Vector3) => void;
  /** BIN으로 이동 확정 */
  onDropToBin?: (obj: SpatialObject, bin: BinOccupancy) => void;
  /** 이동 취소 (ESC) */
  onCancel: () => void;
}

interface CollisionResult {
  collides: boolean;
  nearBin: { rackId: string; level: number; position: THREE.Vector3; valid: boolean; reason?: string } | null;
}

/**
 * 이동 모드 3D 컴포넌트
 * - 오브젝트가 마우스를 따라다님
 * - 충돌 시 빨간색, 정상 시 초록색
 * - 랙 위에서는 BIN 스냅
 * - ESC로 취소, 좌클릭으로 드롭
 */
export function MoveModeGhost({
  movingObject,
  allObjects,
  racks,
  binOccupancy,
  onDrop,
  onDropToBin,
  onCancel,
}: MoveModeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const [ghostPos, setGhostPos] = useState(new THREE.Vector3(movingObject.positionX, movingObject.positionY, movingObject.positionZ));
  const [collision, setCollision] = useState<CollisionResult>({ collides: false, nearBin: null });

  const pointer = useRef(new THREE.Vector2());
  const raycaster = useRef(new THREE.Raycaster());

  // 다른 오브젝트 AABB 목록 (이동 대상 제외)
  const otherBoxes = useMemo(() => {
    return allObjects
      .filter((o) => o.id !== movingObject.id && o.isActive)
      .map((o) => ({
        id: o.id,
        min: new THREE.Vector3(
          o.positionX - o.scaleX / 2,
          o.positionY - o.scaleY / 2,
          o.positionZ - o.scaleZ / 2,
        ),
        max: new THREE.Vector3(
          o.positionX + o.scaleX / 2,
          o.positionY + o.scaleY / 2,
          o.positionZ + o.scaleZ / 2,
        ),
      }));
  }, [allObjects, movingObject.id]);

  // 랙별 BIN 슬롯
  const rackBins = useMemo(() => {
    return racks.filter((r) => r.id !== movingObject.id).map((rack) => {
      const meta = rack.metadata as Record<string, unknown> | null;
      const levels = (meta?.levels as number) ?? 3;
      const levelHeight = (meta?.levelHeight as number) ?? 1.5;
      const levelHeights = (meta?.levelHeights as number[]) ?? Array.from({ length: levels }, () => levelHeight);

      const bins: Array<{ level: number; worldPos: THREE.Vector3; height: number; rackId: string; rackW: number; rackD: number }> = [];
      const baseY = rack.positionY - rack.scaleY / 2;
      let cumY = 0;
      for (let lv = 0; lv < levels; lv++) {
        const h = levelHeights[lv] ?? levelHeight;
        const y = baseY + cumY + 0.15;
        bins.push({
          level: lv,
          worldPos: new THREE.Vector3(rack.positionX, y, rack.positionZ),
          height: h,
          rackId: rack.id,
          rackW: rack.scaleX,
          rackD: rack.scaleZ,
        });
        cumY += h;
      }
      return bins;
    }).flat();
  }, [racks, movingObject.id]);

  // AABB 충돌 검사
  const checkCollision = useCallback((pos: THREE.Vector3): CollisionResult => {
    const halfW = movingObject.scaleX / 2;
    const halfH = movingObject.scaleY / 2;
    const halfD = movingObject.scaleZ / 2;
    const objMin = new THREE.Vector3(pos.x - halfW, pos.y - halfH, pos.z - halfD);
    const objMax = new THREE.Vector3(pos.x + halfW, pos.y + halfH, pos.z + halfD);

    // 바닥 오브젝트 여부 (팔레트/박스) — BIN 이동 가능
    // type.name이 'BIN'이거나, metadata.itemType이 pallet/box이거나,
    // 랙이 아닌 오브젝트 (levels 메타데이터 없음)는 BIN 후보로 판단
    const meta = movingObject.metadata as Record<string, unknown> | null;
    const hasLevels = meta?.levels && (meta.levels as number) > 0;
    const typeName = movingObject.type.name;
    const isBinCandidate = typeName === 'BIN'
      || meta?.itemType === 'pallet'
      || meta?.itemType === 'box'
      || (typeName !== 'RACK' && typeName !== 'AISLE' && typeName !== 'ZONE' && typeName !== 'SAFETY_ZONE')
      || (typeName === 'RACK' && !hasLevels); // 랙 타입이지만 levels 없으면 팔레트/박스일 수 있음

    // BIN 스냅 검사
    if (isBinCandidate) {
      let bestBin: CollisionResult['nearBin'] = null;
      let bestDist = 3.0;

      for (const bin of rackBins) {
        const dist2D = Math.sqrt((pos.x - bin.worldPos.x) ** 2 + (pos.z - bin.worldPos.z) ** 2);
        if (dist2D < bestDist) {
          bestDist = dist2D;

          const fitsW = movingObject.scaleX <= bin.rackW + 0.1;
          const fitsD = movingObject.scaleZ <= bin.rackD + 0.1;
          const fitsH = movingObject.scaleY <= bin.height;
          const occupied = binOccupancy.some((o) => o.rackId === bin.rackId && o.level === bin.level);

          let reason: string | undefined;
          if (!fitsH) reason = `높이 초과 (${movingObject.scaleY.toFixed(2)}m > ${bin.height.toFixed(2)}m)`;
          else if (!fitsW || !fitsD) reason = '크기 초과';
          else if (occupied) reason = '이미 적재됨';

          bestBin = {
            rackId: bin.rackId,
            level: bin.level,
            position: bin.worldPos.clone().add(new THREE.Vector3(0, movingObject.scaleY / 2, 0)),
            valid: fitsW && fitsD && fitsH && !occupied,
            reason,
          };
        }
      }

      if (bestBin) {
        console.log('[HanVoxel] BIN 스냅 감지:', bestBin.rackId, 'level:', bestBin.level, 'valid:', bestBin.valid, bestBin.reason ?? '');
        return { collides: false, nearBin: bestBin };
      }
    }

    // 일반 AABB 충돌 검사
    for (const box of otherBoxes) {
      if (objMin.x < box.max.x && objMax.x > box.min.x &&
          objMin.y < box.max.y && objMax.y > box.min.y &&
          objMin.z < box.max.z && objMax.z > box.min.z) {
        return { collides: true, nearBin: null };
      }
    }

    return { collides: false, nearBin: null };
  }, [movingObject, otherBoxes, rackBins, binOccupancy]);

  // 매 프레임 마우스 추적
  useFrame(() => {
    if (!groupRef.current) return;

    raycaster.current.setFromCamera(pointer.current, camera);
    const intersection = new THREE.Vector3();
    const hit = raycaster.current.ray.intersectPlane(floorPlane, intersection);
    if (!hit) return;

    const newPos = new THREE.Vector3(intersection.x, movingObject.positionY, intersection.z);

    // BIN 스냅
    const result = checkCollision(newPos);
    if (result.nearBin) {
      groupRef.current.position.copy(result.nearBin.position);
      setGhostPos(result.nearBin.position.clone());
    } else {
      groupRef.current.position.copy(newPos);
      setGhostPos(newPos.clone());
    }

    setCollision(result);
  });

  // 마우스 이벤트 등록
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;

      console.log('[HanVoxel] 이동 모드 클릭 — 충돌:', collision.collides, 'BIN:', collision.nearBin ? `${collision.nearBin.rackId} L${collision.nearBin.level} valid=${collision.nearBin.valid}` : 'none');

      if (collision.nearBin?.valid && onDropToBin) {
        console.log('[HanVoxel] BIN에 배치 확정 →', collision.nearBin.rackId, 'level:', collision.nearBin.level);
        onDropToBin(movingObject, {
          rackId: collision.nearBin.rackId,
          level: collision.nearBin.level,
          bay: 0,
          itemType: ((movingObject.metadata as Record<string, unknown>)?.itemType as 'pallet' | 'box') ?? 'box',
          itemName: movingObject.name,
          itemColor: movingObject.color ?? '#3B82F6',
          width: movingObject.scaleX,
          depth: movingObject.scaleZ,
          height: movingObject.scaleY,
        });
      } else if (!collision.collides) {
        onDrop(movingObject, ghostPos);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);

    return () => {
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [gl, camera, collision, ghostPos, movingObject, onDrop, onDropToBin, onCancel]);

  // 색상 결정
  const ghostColor = collision.nearBin
    ? (collision.nearBin.valid ? '#3FB950' : '#F85149')
    : (collision.collides ? '#F85149' : '#2D7DD2');

  const statusText = collision.nearBin
    ? (collision.nearBin.valid ? 'BIN에 배치 (클릭)' : (collision.nearBin.reason ?? '적재 불가'))
    : (collision.collides ? '충돌 — 배치 불가' : '클릭하여 배치');

  return (
    <group ref={groupRef}>
      {/* 반투명 고스트 메시 */}
      <mesh>
        <boxGeometry args={[movingObject.scaleX, movingObject.scaleY, movingObject.scaleZ]} />
        <meshStandardMaterial color={ghostColor} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* 외곽선 */}
      <mesh>
        <boxGeometry args={[movingObject.scaleX + 0.05, movingObject.scaleY + 0.05, movingObject.scaleZ + 0.05]} />
        <meshStandardMaterial color={ghostColor} transparent opacity={0.15} wireframe depthWrite={false} />
      </mesh>
      {/* 상태 라벨 */}
      <Html distanceFactor={12} position={[0, movingObject.scaleY / 2 + 0.5, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: collision.collides || (collision.nearBin && !collision.nearBin.valid) ? 'rgba(248,81,73,0.15)' : 'rgba(63,185,80,0.15)',
          border: `1px solid ${ghostColor}`,
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 10,
          color: ghostColor,
          whiteSpace: 'nowrap',
          fontWeight: 600,
        }}>
          {statusText}
        </div>
      </Html>
    </group>
  );
}
