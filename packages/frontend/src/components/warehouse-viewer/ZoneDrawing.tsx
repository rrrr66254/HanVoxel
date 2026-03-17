import { useState, useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// Zone 타입 정의
export interface ZoneConfig {
  id: string;
  name: string;
  type: ZoneType;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  height: number;
}

export type ZoneType = 'STORAGE' | 'PICKING' | 'STAGING' | 'SAFETY';

// Zone 타입별 색상
const ZONE_COLORS: Record<ZoneType, string> = {
  STORAGE: '#3B82F6',   // 파란색
  PICKING: '#10B981',   // 초록색
  STAGING: '#F59E0B',   // 노란색
  SAFETY: '#EF4444',    // 빨간색
};

const ZONE_LABELS: Record<ZoneType, string> = {
  STORAGE: '보관 구역',
  PICKING: '피킹 구역',
  STAGING: '스테이징',
  SAFETY: '안전 구역',
};

// 바닥 평면 (Y=0)
const floorPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 0),
);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const intersection = new THREE.Vector3();

interface ZoneDrawerProps {
  zoneType: ZoneType;
  onComplete: (zone: Omit<ZoneConfig, 'id' | 'name'>) => void;
  onCancel: () => void;
}

/**
 * Zone 드로잉 — 클릭+드래그로 직사각형 구역 생성
 */
export function ZoneDrawer({ zoneType, onComplete, onCancel }: ZoneDrawerProps) {
  const { camera, gl } = useThree();
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [currentPoint, setCurrentPoint] = useState<[number, number]>([0, 0]);
  const meshRef = useRef<THREE.Mesh>(null);

  // 매 프레임 마우스 추적
  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(floorPlane, intersection);
    if (hit) {
      const x = Math.round(hit.x);
      const z = Math.round(hit.z);
      setCurrentPoint([x, z]);
    }
  });

  // Ref로 최신 상태 추적 (이벤트 핸들러 클로저 문제 방지)
  const canvas = gl.domElement;
  const startPointRef = useRef(startPoint);
  startPointRef.current = startPoint;
  const currentPointRef = useRef(currentPoint);
  currentPointRef.current = currentPoint;

  // 이벤트 바인딩 (useEffect로 cleanup 보장)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const sp = startPointRef.current;
      const cp = currentPointRef.current;
      if (!sp) {
        // 첫 번째 클릭 — 시작점 설정
        setStartPoint(cp);
      } else {
        // 두 번째 클릭 — 구역 확정
        onComplete({
          type: zoneType,
          startX: Math.min(sp[0], cp[0]),
          startZ: Math.min(sp[1], cp[1]),
          endX: Math.max(sp[0], cp[0]),
          endZ: Math.max(sp[1], cp[1]),
          height: 0.1,
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas, zoneType, onComplete, onCancel]);

  const color = ZONE_COLORS[zoneType];

  if (!startPoint) {
    // 시작점 미설정 — 십자선 표시
    return (
      <mesh ref={meshRef} position={[currentPoint[0], 0.05, currentPoint[1]]}>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshStandardMaterial color={color} transparent opacity={0.5} />
      </mesh>
    );
  }

  // 드래그 중 — 프리뷰 사각형
  const minX = Math.min(startPoint[0], currentPoint[0]);
  const maxX = Math.max(startPoint[0], currentPoint[0]);
  const minZ = Math.min(startPoint[1], currentPoint[1]);
  const maxZ = Math.max(startPoint[1], currentPoint[1]);
  const width = maxX - minX || 1;
  const depth = maxZ - minZ || 1;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return (
    <group>
      <mesh position={[centerX, 0.05, centerZ]}>
        <boxGeometry args={[width, 0.02, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.25} />
      </mesh>
      {/* 경계선 */}
      <mesh position={[centerX, 0.06, centerZ]}>
        <boxGeometry args={[width, 0.01, depth]} />
        <meshStandardMaterial color={color} wireframe transparent opacity={0.6} />
      </mesh>
      {/* 크기 라벨 */}
      <Html position={[centerX, 0.5, centerZ]} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: '#161B22',
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 11,
          color: '#E6EDF3',
          whiteSpace: 'nowrap',
        }}>
          {width.toFixed(0)}m × {depth.toFixed(0)}m
        </div>
      </Html>
    </group>
  );
}

interface ZoneRendererProps {
  zones: ZoneConfig[];
  onSelectZone?: (zone: ZoneConfig) => void;
}

/**
 * 생성된 Zone들을 렌더링
 */
export function ZoneRenderer({ zones, onSelectZone }: ZoneRendererProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <group>
      {zones.map((zone) => {
        const width = zone.endX - zone.startX;
        const depth = zone.endZ - zone.startZ;
        const centerX = (zone.startX + zone.endX) / 2;
        const centerZ = (zone.startZ + zone.endZ) / 2;
        const color = ZONE_COLORS[zone.type];
        const isHovered = hoveredId === zone.id;

        return (
          <group key={zone.id}>
            {/* 바닥 영역 */}
            <mesh
              position={[centerX, 0.03, centerZ]}
              onClick={(e) => { e.stopPropagation(); onSelectZone?.(zone); }}
              onPointerOver={(e) => { e.stopPropagation(); setHoveredId(zone.id); }}
              onPointerOut={() => setHoveredId(null)}
            >
              <boxGeometry args={[width, 0.02, depth]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={isHovered ? 0.2 : 0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* 와이어프레임 경계 */}
            <mesh position={[centerX, 0.04, centerZ]}>
              <boxGeometry args={[width, 0.01, depth]} />
              <meshStandardMaterial color={color} wireframe transparent opacity={0.4} />
            </mesh>
            {/* Zone 라벨 */}
            <Html
              position={[centerX, 0.3, centerZ]}
              style={{ pointerEvents: 'none' }}
              distanceFactor={20}
            >
              <div style={{
                background: `${color}20`,
                border: `1px solid ${color}60`,
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 10,
                fontWeight: 600,
                color,
                whiteSpace: 'nowrap',
              }}>
                {zone.name || ZONE_LABELS[zone.type]}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// === 바닥/벽 포인트-투-포인트 사각형 드로잉 ===

export type DrawObjectType = 'FLOOR' | 'WALL';

const DRAW_OBJECT_COLORS: Record<DrawObjectType, string> = {
  FLOOR: '#94A3B8',
  WALL: '#788296',
};

interface RectDrawResult {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
}

interface RectObjectDrawerProps {
  drawType: DrawObjectType;
  onComplete: (rect: RectDrawResult) => void;
  onCancel: () => void;
}

/**
 * 바닥/벽 사각형 드로잉 — 두 점 클릭으로 직사각형 영역 생성
 * Zone 드로잉과 동일한 UX: 첫 클릭 → 시작점, 두 번째 클릭 → 확정
 */
export function RectObjectDrawer({ drawType, onComplete, onCancel }: RectObjectDrawerProps) {
  const { camera, gl } = useThree();
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [currentPoint, setCurrentPoint] = useState<[number, number]>([0, 0]);

  // 매 프레임 마우스 추적
  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(floorPlane, intersection);
    if (hit) {
      const x = Math.round(hit.x);
      const z = Math.round(hit.z);
      setCurrentPoint([x, z]);
    }
  });

  const canvas = gl.domElement;
  const startPointRef = useRef(startPoint);
  startPointRef.current = startPoint;
  const currentPointRef = useRef(currentPoint);
  currentPointRef.current = currentPoint;

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const sp = startPointRef.current;
      const cp = currentPointRef.current;
      if (!sp) {
        setStartPoint(cp);
      } else {
        // 최소 크기 체크 (1m × 1m)
        const w = Math.abs(sp[0] - cp[0]);
        const d = Math.abs(sp[1] - cp[1]);
        if (w < 1 && d < 1) return;
        onComplete({
          startX: Math.min(sp[0], cp[0]),
          startZ: Math.min(sp[1], cp[1]),
          endX: Math.max(sp[0], cp[0]),
          endZ: Math.max(sp[1], cp[1]),
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas, onComplete, onCancel]);

  const color = DRAW_OBJECT_COLORS[drawType];
  const isWall = drawType === 'WALL';

  if (!startPoint) {
    // 시작점 미설정 — 커서 표시
    return (
      <mesh position={[currentPoint[0], 0.05, currentPoint[1]]}>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshStandardMaterial color={color} transparent opacity={0.5} />
      </mesh>
    );
  }

  // 프리뷰 사각형
  const minX = Math.min(startPoint[0], currentPoint[0]);
  const maxX = Math.max(startPoint[0], currentPoint[0]);
  const minZ = Math.min(startPoint[1], currentPoint[1]);
  const maxZ = Math.max(startPoint[1], currentPoint[1]);
  const width = maxX - minX || 1;
  const depth = maxZ - minZ || 1;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  // 벽 프리뷰는 높이 3m으로 표시
  const previewH = isWall ? 3 : 0.02;
  const previewY = isWall ? previewH / 2 : 0.05;

  return (
    <group>
      <mesh position={[centerX, previewY, centerZ]}>
        <boxGeometry args={[width, previewH, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.25} />
      </mesh>
      <mesh position={[centerX, previewY, centerZ]}>
        <boxGeometry args={[width, previewH, depth]} />
        <meshStandardMaterial color={color} wireframe transparent opacity={0.6} />
      </mesh>
      <Html position={[centerX, (isWall ? previewH + 0.5 : 0.5), centerZ]} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: '#161B22',
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 11,
          color: '#E6EDF3',
          whiteSpace: 'nowrap',
        }}>
          {isWall ? '벽' : '바닥'} {width.toFixed(0)}m × {depth.toFixed(0)}m
        </div>
      </Html>
    </group>
  );
}

interface ZoneListPanelProps {
  zones: ZoneConfig[];
  onDeleteZone: (id: string) => void;
  onClose: () => void;
}

/**
 * Zone 목록 패널 (우측 사이드)
 */
export function ZoneListPanel({ zones, onDeleteZone, onClose }: ZoneListPanelProps) {
  if (zones.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 60,
        width: 240,
        background: '#161B22',
        border: '1px solid #30363D',
        borderRadius: 12,
        padding: 12,
        zIndex: 20,
        maxHeight: 300,
        overflowY: 'auto',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#E6EDF3' }}>구역 목록</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer', fontSize: 14 }}
        >
          ×
        </button>
      </div>
      {zones.map((zone) => (
        <div
          key={zone.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            borderRadius: 6,
            marginBottom: 4,
            background: '#0D1117',
            border: '1px solid #21262D',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: ZONE_COLORS[zone.type],
              }}
            />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#E6EDF3' }}>
                {zone.name || ZONE_LABELS[zone.type]}
              </div>
              <div style={{ fontSize: 9, color: '#484F58' }}>
                {(zone.endX - zone.startX).toFixed(0)}m × {(zone.endZ - zone.startZ).toFixed(0)}m
              </div>
            </div>
          </div>
          <button
            onClick={() => onDeleteZone(zone.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#F85149',
              cursor: 'pointer',
              fontSize: 12,
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export { ZONE_COLORS, ZONE_LABELS };
