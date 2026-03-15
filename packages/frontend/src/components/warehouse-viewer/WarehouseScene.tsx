import { useRef } from 'react';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { SpatialMesh } from './SpatialMesh';
import { GhostMesh } from './GhostMesh';
import { ZoneRenderer, ZoneDrawer } from './ZoneDrawing';
import type { ZoneConfig, ZoneType } from './ZoneDrawing';
import type { SpatialObject } from '../../types/spatial';
import type { SpatialPreset } from '../../types/preset';

// 창고 외벽 크기 (mock-warehouse 기준: 60m × 45m × 8m)
const WALL_W = 60;
const WALL_D = 45;
const WALL_H = 8;
const WALL_CENTER_X = 15;
const WALL_CENTER_Z = 20;

interface WarehouseSceneProps {
  objects: SpatialObject[];
  selectedId: string | null;
  onSelect: (object: SpatialObject) => void;
  placingPreset?: SpatialPreset | null;
  onPlace?: (position: [number, number, number]) => void;
  // Zone 시스템
  zones?: ZoneConfig[];
  drawingZoneType?: ZoneType | null;
  onZoneDrawComplete?: (zone: Omit<ZoneConfig, 'id' | 'name'>) => void;
  onZoneDrawCancel?: () => void;
  onSelectZone?: (zone: ZoneConfig) => void;
}

/**
 * 창고 3D 씬 — 전문 WMS 수준 렌더링
 * - 바닥: 격자 + 반사 효과
 * - 조명: Ambient + Directional 2개 + PointLight 4개 (천장 조명)
 * - 그림자: castShadow / receiveShadow 활성화
 * - 안개: FogExp2
 */
export function WarehouseScene({
  objects, selectedId, onSelect, placingPreset, onPlace,
  zones = [], drawingZoneType, onZoneDrawComplete, onZoneDrawCancel, onSelectZone,
}: WarehouseSceneProps) {
  const floorRef = useRef<THREE.Mesh>(null);

  return (
    <>
      {/* 안개 — FogExp2(0x0D1117, 0.015) */}
      <fogExp2 attach="fog" args={[0x0D1117, 0.015]} />

      {/* 환경광 */}
      <ambientLight intensity={0.35} color="#B0C4DE" />

      {/* 주 방향광 (태양) — 그림자 생성 */}
      <directionalLight
        position={[30, 40, 20]}
        intensity={0.7}
        color="#FFEEDD"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={120}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.001}
      />

      {/* 보조 방향광 (역광) */}
      <directionalLight
        position={[-20, 25, -15]}
        intensity={0.25}
        color="#B0C4DE"
      />

      {/* 천장 포인트라이트 4개 (창고 조명 느낌) */}
      <pointLight position={[8, 12, 10]} intensity={0.6} color="#FFE4B5" distance={40} decay={2} castShadow />
      <pointLight position={[25, 12, 10]} intensity={0.6} color="#FFE4B5" distance={40} decay={2} />
      <pointLight position={[8, 12, 30]} intensity={0.6} color="#FFE4B5" distance={40} decay={2} />
      <pointLight position={[25, 12, 30]} intensity={0.6} color="#FFE4B5" distance={40} decay={2} />

      {/* 반사 바닥면 */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[15, -0.01, 20]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#2C3E50"
          metalness={0.1}
          roughness={0.85}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* 격자 (미터 단위) */}
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#2A3040"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#354055"
        fadeDistance={70}
        fadeStrength={1.5}
        position={[15, 0, 20]}
      />

      {/* 창고 외벽 (반투명) */}
      {/* 좌측 벽 */}
      <mesh position={[WALL_CENTER_X - WALL_W / 2, WALL_H / 2, WALL_CENTER_Z]}>
        <planeGeometry args={[WALL_D, WALL_H]} />
        <meshStandardMaterial color="#4A5568" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {/* 우측 벽 */}
      <mesh position={[WALL_CENTER_X + WALL_W / 2, WALL_H / 2, WALL_CENTER_Z]}>
        <planeGeometry args={[WALL_D, WALL_H]} />
        <meshStandardMaterial color="#4A5568" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {/* 뒷벽 */}
      <mesh position={[WALL_CENTER_X, WALL_H / 2, WALL_CENTER_Z + WALL_D / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[WALL_W, WALL_H]} />
        <meshStandardMaterial color="#4A5568" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {/* 앞벽 (도크 쪽 — 더 투명) */}
      <mesh position={[WALL_CENTER_X, WALL_H / 2, WALL_CENTER_Z - WALL_D / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[WALL_W, WALL_H]} />
        <meshStandardMaterial color="#4A5568" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
      {/* 지붕 */}
      <mesh position={[WALL_CENTER_X, WALL_H, WALL_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WALL_W, WALL_D]} />
        <meshStandardMaterial color="#5A6577" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
      {/* 지붕 엣지 라인 (4개) */}
      {[
        [[WALL_CENTER_X - WALL_W / 2, WALL_H, WALL_CENTER_Z - WALL_D / 2], [WALL_CENTER_X + WALL_W / 2, WALL_H, WALL_CENTER_Z - WALL_D / 2]],
        [[WALL_CENTER_X + WALL_W / 2, WALL_H, WALL_CENTER_Z - WALL_D / 2], [WALL_CENTER_X + WALL_W / 2, WALL_H, WALL_CENTER_Z + WALL_D / 2]],
        [[WALL_CENTER_X + WALL_W / 2, WALL_H, WALL_CENTER_Z + WALL_D / 2], [WALL_CENTER_X - WALL_W / 2, WALL_H, WALL_CENTER_Z + WALL_D / 2]],
        [[WALL_CENTER_X - WALL_W / 2, WALL_H, WALL_CENTER_Z + WALL_D / 2], [WALL_CENTER_X - WALL_W / 2, WALL_H, WALL_CENTER_Z - WALL_D / 2]],
      ].map((pts, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints(
          pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
        );
        return <lineSegments key={`roof-edge-${i}`} geometry={geo}>
          <lineBasicMaterial color="#5A6577" opacity={0.3} transparent />
        </lineSegments>;
      })}

      {/* 공간 객체 렌더링 */}
      {objects.map((obj) => (
        <SpatialMesh
          key={obj.id}
          object={obj}
          onSelect={onSelect}
          isSelected={obj.id === selectedId}
        />
      ))}

      {/* Zone 렌더링 */}
      {zones.length > 0 && (
        <ZoneRenderer zones={zones} onSelectZone={onSelectZone} />
      )}

      {/* Zone 드로잉 모드 */}
      {drawingZoneType && onZoneDrawComplete && onZoneDrawCancel && (
        <ZoneDrawer
          zoneType={drawingZoneType}
          onComplete={onZoneDrawComplete}
          onCancel={onZoneDrawCancel}
        />
      )}

      {/* 배치 모드 고스트 메시 */}
      {placingPreset && onPlace && (
        <GhostMesh preset={placingPreset} onPlace={onPlace} existingObjects={objects} />
      )}
    </>
  );
}
