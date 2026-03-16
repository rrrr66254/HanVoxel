import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SpatialObject } from '../../types/spatial';
import type { BinOccupancy } from './BinPlacement';

// 바닥 평면 (Y=0)
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// BIN 크기 여유 허용률 (5%)
const BIN_TOLERANCE = 0.05;

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
  /** 배치 차단 시 토스트 메시지 */
  onBlockedToast?: (message: string) => void;
}

interface CollisionResult {
  collides: boolean;
  nearBin: {
    rackId: string;
    level: number;
    position: THREE.Vector3;
    valid: boolean;
    reason?: string;
    // 크기 검사 상세 정보 (토스트 메시지용)
    detail?: {
      objW: number; objD: number; objH: number;
      binW: number; binD: number; binH: number;
    };
  } | null;
}

/**
 * 이동 모드 3D 컴포넌트
 * - 오브젝트가 마우스를 따라다님
 * - 충돌 시 빨간색, 정상 시 초록색
 * - 랙 위에서는 BIN 스냅
 * - ESC로 취소, 좌클릭으로 드롭
 * - BIN 크기 초과 시 배치 완전 차단
 */
export function MoveModeGhost({
  movingObject,
  allObjects,
  racks,
  binOccupancy,
  onDrop,
  onDropToBin,
  onCancel,
  onBlockedToast,
}: MoveModeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const [ghostPos, setGhostPos] = useState(new THREE.Vector3(movingObject.positionX, movingObject.positionY, movingObject.positionZ));
  const [collision, setCollision] = useState<CollisionResult>({ collides: false, nearBin: null });
  // 배치 차단 시 흔들림 애니메이션
  const [shakeTime, setShakeTime] = useState<number | null>(null);

  const pointer = useRef(new THREE.Vector2());
  const raycaster = useRef(new THREE.Raycaster());

  // 배치 가능 여부 판단
  const canPlace = useMemo(() => {
    // BIN 근처: valid일 때만 배치 가능
    if (collision.nearBin) return collision.nearBin.valid;
    // 일반 위치: 충돌 없으면 배치 가능
    return !collision.collides;
  }, [collision]);

  // 다른 오브젝트 AABB 목록 (이동 대상 제외, 바닥/통로/구역 제외)
  const otherBoxes = useMemo(() => {
    return allObjects
      .filter((o) => {
        if (o.id === movingObject.id || !o.isActive) return false;
        // 바닥/통로/구역/안전구역은 충돌 대상에서 제외 (바닥에 깔리는 오브젝트)
        const typeName = o.type.name;
        if (typeName === 'FLOOR' || typeName === 'AISLE' || typeName === 'ZONE' || typeName === 'SAFETY_ZONE') return false;
        const oMeta = o.metadata as Record<string, unknown> | null;
        if (oMeta?.floorStyle || oMeta?.aisleType) return false;
        return true;
      })
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
        // BIN 바닥 Y = 랙 바닥 + 누적 높이 + 빔 두께(0.15m)
        const y = baseY + cumY + 0.15;
        bins.push({
          level: lv,
          worldPos: new THREE.Vector3(rack.positionX, y, rack.positionZ),
          height: h - 0.15, // 빔 두께 제외한 실제 사용 가능 높이
          rackId: rack.id,
          rackW: rack.scaleX,
          rackD: rack.scaleZ,
        });
        cumY += h;
      }
      return bins;
    }).flat();
  }, [racks, movingObject.id]);

  // 마우스 ray와 바닥 교차점의 Y 높이 추적 (층 선택용)
  const mouseWorldY = useRef(0);

  // AABB 충돌 + BIN 스냅 검사
  const checkCollision = useCallback((pos: THREE.Vector3): CollisionResult => {
    const halfW = movingObject.scaleX / 2;
    const halfH = movingObject.scaleY / 2;
    const halfD = movingObject.scaleZ / 2;
    const objMin = new THREE.Vector3(pos.x - halfW, pos.y - halfH, pos.z - halfD);
    const objMax = new THREE.Vector3(pos.x + halfW, pos.y + halfH, pos.z + halfD);

    // BIN 이동 후보 판단
    const meta = movingObject.metadata as Record<string, unknown> | null;
    const hasLevels = meta?.levels && (meta.levels as number) > 0;
    const typeName = movingObject.type.name;
    const isBinCandidate = typeName === 'BIN'
      || meta?.itemType === 'pallet'
      || meta?.itemType === 'box'
      || (typeName !== 'RACK' && typeName !== 'AISLE' && typeName !== 'ZONE' && typeName !== 'SAFETY_ZONE')
      || (typeName === 'RACK' && !hasLevels);

    // BIN 스냅 검사 — 먼저 가장 가까운 랙을 찾고, 그 랙에서 Y 높이에 맞는 층 선택
    if (isBinCandidate) {
      // 1단계: 가장 가까운 랙 찾기 (2D 거리)
      let bestRackDist = 3.0; // 3m 이내에서 BIN 감지
      let bestRackId: string | null = null;
      for (const bin of rackBins) {
        const dist2D = Math.sqrt((pos.x - bin.worldPos.x) ** 2 + (pos.z - bin.worldPos.z) ** 2);
        if (dist2D < bestRackDist) {
          bestRackDist = dist2D;
          bestRackId = bin.rackId;
        }
      }

      // 2단계: 해당 랙의 BIN 중 마우스 Y 높이에 가장 가까운 층 선택
      if (bestRackId) {
        const rackLevelBins = rackBins.filter((b) => b.rackId === bestRackId);
        let bestBin: CollisionResult['nearBin'] = null;
        let bestYDist = Infinity;
        const cursorY = mouseWorldY.current;

        for (const bin of rackLevelBins) {
          // BIN 중앙 Y = bin.worldPos.y + height/2
          const binCenterY = bin.worldPos.y + bin.height / 2;
          const yDist = Math.abs(cursorY - binCenterY);

          if (yDist < bestYDist) {
            bestYDist = yDist;

            const objW = movingObject.scaleX;
            const objD = movingObject.scaleZ;
            const objH = movingObject.scaleY;

            const binW = bin.rackW;
            const binD = bin.rackD;
            const binH = bin.height;

            const maxW = binW * (1 - BIN_TOLERANCE);
            const maxD = binD * (1 - BIN_TOLERANCE);
            const maxH = binH * (1 - BIN_TOLERANCE);

            const fitsW = objW <= maxW;
            const fitsD = objD <= maxD;
            const fitsH = objH <= maxH;
            const occupied = binOccupancy.some((o) => o.rackId === bin.rackId && o.level === bin.level);

            let reason: string | undefined;
            if (occupied) reason = `${bin.level + 1}층 점유됨`;
            else if (!fitsH) reason = `높이 초과: ${objH.toFixed(2)}m > ${maxH.toFixed(2)}m`;
            else if (!fitsW) reason = `너비 초과: ${objW.toFixed(2)}m > ${maxW.toFixed(2)}m`;
            else if (!fitsD) reason = `깊이 초과: ${objD.toFixed(2)}m > ${maxD.toFixed(2)}m`;

            bestBin = {
              rackId: bin.rackId,
              level: bin.level,
              position: bin.worldPos.clone().add(new THREE.Vector3(0, movingObject.scaleY / 2, 0)),
              valid: fitsW && fitsD && fitsH && !occupied,
              reason,
              detail: { objW, objD, objH, binW: maxW, binD: maxD, binH: maxH },
            };
          }
        }

        if (bestBin) {
          return { collides: false, nearBin: bestBin };
        }
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
  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    raycaster.current.setFromCamera(pointer.current, camera);
    const intersection = new THREE.Vector3();
    const hit = raycaster.current.ray.intersectPlane(floorPlane, intersection);
    if (!hit) return;

    // 마우스 ray의 Y 높이 계산 — 랙 위치를 지나는 카메라 방향 수직면 사용
    const ray = raycaster.current.ray;
    const nearestRack = racks.find((r) => {
      const dx = intersection.x - r.positionX;
      const dz = intersection.z - r.positionZ;
      return Math.sqrt(dx * dx + dz * dz) < 3.0;
    });
    if (nearestRack) {
      // 카메라→랙 방향의 XZ 성분으로 수직면 법선 생성 (Y=0 평면에 투영)
      const camToRack = new THREE.Vector3(
        nearestRack.positionX - camera.position.x,
        0, // Y 성분 제거 — 수직면이므로
        nearestRack.positionZ - camera.position.z,
      ).normalize();

      // 랙 위치를 지나는 수직면 (카메라를 바라보는 방향)
      const planeNormal = camToRack.clone();
      const planeDist = -planeNormal.dot(new THREE.Vector3(nearestRack.positionX, 0, nearestRack.positionZ));
      const verticalPlane = new THREE.Plane(planeNormal, planeDist);

      const rackHit = new THREE.Vector3();
      if (ray.intersectPlane(verticalPlane, rackHit)) {
        mouseWorldY.current = Math.max(0, rackHit.y);
      }
    } else {
      mouseWorldY.current = 0;
    }

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

    // 배치 차단 흔들림 애니메이션
    if (shakeTime !== null) {
      const elapsed = Date.now() - shakeTime;
      if (elapsed < 300) {
        const shakeOffset = Math.sin(elapsed * 0.05) * 0.1 * (1 - elapsed / 300);
        groupRef.current.position.x += shakeOffset;
      } else {
        setShakeTime(null);
      }
    }
  });

  // 커서 변경
  useEffect(() => {
    const canvas = gl.domElement;
    if (collision.nearBin && !collision.nearBin.valid) {
      canvas.style.cursor = 'not-allowed';
    } else if (collision.collides) {
      canvas.style.cursor = 'not-allowed';
    } else if (collision.nearBin?.valid) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'crosshair';
    }
    return () => { canvas.style.cursor = 'default'; };
  }, [gl, collision]);

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

      // === 배치 가능 여부 엄격 검사 ===

      // BIN 근처에서 invalid인 경우 — 완전 차단
      if (collision.nearBin && !collision.nearBin.valid) {
        const reason = collision.nearBin.reason ?? '이 위치에 배치할 수 없습니다';
        console.log('[HanVoxel] 배치 차단:', reason);
        onBlockedToast?.(reason);
        setShakeTime(Date.now());
        return; // 배치 완전 차단
      }

      // 일반 충돌인 경우 — 완전 차단
      if (collision.collides) {
        console.log('[HanVoxel] 배치 차단: 충돌 감지');
        onBlockedToast?.('다른 오브젝트와 충돌합니다');
        setShakeTime(Date.now());
        return; // 배치 완전 차단
      }

      // BIN에 유효한 배치
      if (collision.nearBin?.valid && onDropToBin) {
        console.log('[HanVoxel] BIN 배치 확정 ->', collision.nearBin.rackId, 'level:', collision.nearBin.level);
        const objMeta = movingObject.metadata as Record<string, unknown> | null;
        onDropToBin(movingObject, {
          rackId: collision.nearBin.rackId,
          level: collision.nearBin.level,
          bay: 0,
          itemType: (objMeta?.itemType as 'pallet' | 'box') ?? 'box',
          itemName: movingObject.name,
          itemColor: movingObject.color ?? '#3B82F6',
          width: movingObject.scaleX,
          depth: movingObject.scaleZ,
          height: movingObject.scaleY,
          presetCode: (objMeta?.presetCode as string) ?? movingObject.code ?? '',
          itemMetadata: objMeta ?? undefined,
        });
        return;
      }

      // 일반 바닥 배치 (충돌 없음, BIN 아님)
      onDrop(movingObject, ghostPos);
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
  }, [gl, camera, collision, ghostPos, movingObject, onDrop, onDropToBin, onCancel, onBlockedToast]);

  // 색상 결정
  const isBlocked = (collision.nearBin && !collision.nearBin.valid) || collision.collides;
  const ghostColor = collision.nearBin
    ? (collision.nearBin.valid ? '#3FB950' : '#F85149')
    : (collision.collides ? '#F85149' : '#2D7DD2');

  const statusText = collision.nearBin
    ? (collision.nearBin.valid
        ? `${collision.nearBin.level + 1}층에 배치 (클릭)`
        : (collision.nearBin.reason ?? '적재 불가'))
    : (collision.collides ? '충돌 -- 배치 불가' : '클릭하여 배치');

  return (
    <group ref={groupRef}>
      {/* 반투명 고스트 메시 */}
      <mesh>
        <boxGeometry args={[movingObject.scaleX, movingObject.scaleY, movingObject.scaleZ]} />
        <meshStandardMaterial color={ghostColor} transparent opacity={isBlocked ? 0.25 : 0.4} depthWrite={false} />
      </mesh>
      {/* 외곽선 */}
      <mesh>
        <boxGeometry args={[movingObject.scaleX + 0.05, movingObject.scaleY + 0.05, movingObject.scaleZ + 0.05]} />
        <meshStandardMaterial color={ghostColor} transparent opacity={isBlocked ? 0.3 : 0.15} wireframe depthWrite={false} />
      </mesh>
      {/* 상태 라벨 */}
      <Html distanceFactor={12} position={[0, movingObject.scaleY / 2 + 0.5, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: isBlocked ? 'rgba(248,81,73,0.15)' : 'rgba(63,185,80,0.15)',
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
      {/* 차단 시 X 마크 표시 */}
      {isBlocked && (
        <Html distanceFactor={8} position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            fontSize: 32,
            color: '#F85149',
            fontWeight: 900,
            textShadow: '0 0 8px rgba(248,81,73,0.5)',
            opacity: 0.6,
          }}>
            X
          </div>
        </Html>
      )}
    </group>
  );
}
