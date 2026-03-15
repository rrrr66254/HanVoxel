import { useState, useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SpatialObject } from '../../types/spatial';
import { PalletModel } from './PalletModel';

// BIN 적재 상태
export interface BinOccupancy {
  rackId: string;
  level: number;       // 0-based 단 번호
  bay: number;         // 0-based 베이 번호 (현재 1 bay 고정)
  itemType: 'pallet' | 'box';
  itemName: string;
  itemColor: string;
  width: number;
  depth: number;
  height: number;
}

// 드래그 중인 아이템 정보
export interface DragItem {
  type: 'pallet' | 'box';
  name: string;
  width: number;
  depth: number;
  height: number;
  color: string;
}

interface BinGhostProps {
  dragItem: DragItem;
  racks: SpatialObject[];
  occupancy: BinOccupancy[];
  onPlace: (occupancy: BinOccupancy) => void;
}

// 바닥 평면 (Y=0)
const floorPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 0),
);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/**
 * BIN 적재 고스트 메시 — 드래그 중인 팔레트/박스를 랙 위에 배치
 * - 랙 근처에서 스냅: 해당 BIN 위치로 자동 스냅
 * - 사이즈 검증: 녹색(배치 가능) / 빨간색(불가)
 * - 클릭 시 적재 확정
 */
export function BinGhostMesh({ dragItem, racks, occupancy, onPlace }: BinGhostProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const [snapTarget, setSnapTarget] = useState<{ rackId: string; level: number; position: THREE.Vector3; valid: boolean } | null>(null);

  // 랙별 BIN 위치 계산
  const rackBins = useMemo(() => {
    return racks.map((rack) => {
      const meta = rack.metadata as Record<string, unknown> | null;
      const levels = (meta?.levels as number) ?? 3;
      const levelHeight = (meta?.levelHeight as number) ?? 1.5;
      const rackW = rack.scaleX;
      const rackD = rack.scaleZ;

      const bins: Array<{ level: number; worldPos: THREE.Vector3; rackId: string }> = [];
      for (let lv = 0; lv < levels; lv++) {
        const baseY = rack.positionY - rack.scaleY / 2;
        const y = baseY + lv * levelHeight + 0.15; // 빔 위
        bins.push({
          level: lv,
          worldPos: new THREE.Vector3(rack.positionX, y, rack.positionZ),
          rackId: rack.id,
        });
      }
      return { rack, bins, rackW, rackD };
    });
  }, [racks]);

  useFrame(() => {
    if (!groupRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(floorPlane, intersection);
    if (!hit) return;

    // 가장 가까운 BIN 슬롯 찾기
    let bestSnap: typeof snapTarget = null;
    let bestDist = 3.0; // 3m 이내만 스냅

    for (const { rack, bins, rackW, rackD } of rackBins) {
      for (const bin of bins) {
        const dist2D = Math.sqrt(
          (hit.x - bin.worldPos.x) ** 2 + (hit.z - bin.worldPos.z) ** 2
        );
        if (dist2D < bestDist) {
          bestDist = dist2D;

          // 사이즈 검증: 팔레트/박스가 BIN에 들어가는지
          const fitsWidth = dragItem.width <= rackW + 0.1;
          const fitsDepth = dragItem.depth <= rackD + 0.1;
          // 이미 적재된 BIN인지
          const occupied = occupancy.some(
            (o) => o.rackId === rack.id && o.level === bin.level
          );

          bestSnap = {
            rackId: rack.id,
            level: bin.level,
            position: bin.worldPos.clone().add(new THREE.Vector3(0, dragItem.height / 2, 0)),
            valid: fitsWidth && fitsDepth && !occupied,
          };
        }
      }
    }

    setSnapTarget(bestSnap);

    if (bestSnap) {
      groupRef.current.position.copy(bestSnap.position);
    } else {
      groupRef.current.position.set(hit.x, dragItem.height / 2, hit.z);
    }
  });

  // 마우스 이벤트
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const rect = gl.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }, [gl]);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0 || !snapTarget?.valid) return;
    onPlace({
      rackId: snapTarget.rackId,
      level: snapTarget.level,
      bay: 0,
      itemType: dragItem.type,
      itemName: dragItem.name,
      itemColor: dragItem.color,
      width: dragItem.width,
      depth: dragItem.depth,
      height: dragItem.height,
    });
  }, [snapTarget, onPlace, dragItem]);

  // 이벤트 등록
  useState(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  });

  const glowColor = snapTarget?.valid ? '#3FB950' : snapTarget ? '#F85149' : '#2D7DD2';

  return (
    <group ref={groupRef}>
      {dragItem.type === 'pallet' ? (
        <group scale={[1, 1, 1]}>
          <PalletModel
            width={dragItem.width}
            depth={dragItem.depth}
            height={dragItem.height}
          />
        </group>
      ) : (
        <mesh>
          <boxGeometry args={[dragItem.width, dragItem.height, dragItem.depth]} />
          <meshStandardMaterial color={dragItem.color} transparent opacity={0.7} />
        </mesh>
      )}
      {/* 상태 오버레이 */}
      <mesh>
        <boxGeometry args={[dragItem.width + 0.05, dragItem.height + 0.05, dragItem.depth + 0.05]} />
        <meshStandardMaterial color={glowColor} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {snapTarget && (
        <Html distanceFactor={10} position={[0, dragItem.height / 2 + 0.3, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: snapTarget.valid ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
            border: `1px solid ${snapTarget.valid ? '#3FB950' : '#F85149'}`,
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 10,
            color: snapTarget.valid ? '#3FB950' : '#F85149',
            whiteSpace: 'nowrap',
          }}>
            {snapTarget.valid ? '클릭하여 적재' : '적재 불가'}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * 적재된 BIN 오브젝트 렌더링
 */
export function BinOccupancyRenderer({
  occupancy,
  racks,
}: {
  occupancy: BinOccupancy[];
  racks: SpatialObject[];
}) {
  return (
    <>
      {occupancy.map((occ, i) => {
        const rack = racks.find((r) => r.id === occ.rackId);
        if (!rack) return null;

        const meta = rack.metadata as Record<string, unknown> | null;
        const levelHeight = (meta?.levelHeight as number) ?? 1.5;
        const baseY = rack.positionY - rack.scaleY / 2;
        const y = baseY + occ.level * levelHeight + 0.15 + occ.height / 2;

        return (
          <group key={`bin-${i}`} position={[rack.positionX, y, rack.positionZ]}>
            {occ.itemType === 'pallet' ? (
              <PalletModel width={occ.width} depth={occ.depth} height={occ.height} />
            ) : (
              <mesh>
                <boxGeometry args={[occ.width, occ.height, occ.depth]} />
                <meshStandardMaterial color={occ.itemColor} metalness={0.1} roughness={0.8} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

/**
 * 랙 상세 정보 패널
 */
export function RackDetailPanel({
  rack,
  occupancy,
  onClose,
}: {
  rack: SpatialObject;
  occupancy: BinOccupancy[];
  onClose: () => void;
}) {
  const meta = rack.metadata as Record<string, unknown> | null;
  const levels = (meta?.levels as number) ?? 3;
  const rackOccupancy = occupancy.filter((o) => o.rackId === rack.id);
  const occupancyRate = levels > 0 ? Math.round((rackOccupancy.length / levels) * 100) : 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1A1D24',
        color: '#E6EDF3',
        overflow: 'auto',
      }}
    >
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #21262D',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{rack.name}</h3>
          <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'monospace' }}>{rack.code}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 24, height: 24, borderRadius: 6,
            border: '1px solid #30363D', background: 'transparent',
            color: '#8B949E', cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 적재율 바 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: '#8B949E' }}>적재율</span>
            <span style={{ fontWeight: 700, color: occupancyRate > 80 ? '#F85149' : '#3FB950' }}>
              {occupancyRate}%
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: '#21262D' }}>
            <div style={{
              height: '100%',
              width: `${occupancyRate}%`,
              borderRadius: 3,
              background: occupancyRate > 80 ? '#F85149' : '#3FB950',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* 단별 상태 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Array.from({ length: levels }, (_, i) => {
            const item = rackOccupancy.find((o) => o.level === i);
            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 6,
                background: item ? 'rgba(63,185,80,0.08)' : '#0D1117',
                border: `1px solid ${item ? 'rgba(63,185,80,0.2)' : '#21262D'}`,
              }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#484F58',
                  minWidth: 28,
                  fontFamily: 'monospace',
                }}>
                  L{i + 1}
                </span>
                {item ? (
                  <>
                    <div style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: item.itemColor,
                    }} />
                    <span style={{ fontSize: 11, color: '#E6EDF3', flex: 1 }}>{item.itemName}</span>
                    <span style={{ fontSize: 10, color: '#484F58' }}>
                      {item.width}×{item.depth}m
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: '#484F58' }}>빈 슬롯</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
