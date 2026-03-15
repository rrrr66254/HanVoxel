import { useRef } from 'react';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { SpatialMesh } from './SpatialMesh';
import { GhostMesh } from './GhostMesh';
import type { SpatialObject } from '../../types/spatial';
import type { SpatialPreset } from '../../types/preset';

interface WarehouseSceneProps {
  objects: SpatialObject[];
  selectedId: string | null;
  onSelect: (object: SpatialObject) => void;
  placingPreset?: SpatialPreset | null;
  onPlace?: (position: [number, number, number]) => void;
}

/**
 * 창고 3D 씬 — 전문 WMS 수준 렌더링
 * - 바닥: 격자 + 반사 효과
 * - 조명: Ambient + Directional 2개 + PointLight 4개 (천장 조명)
 * - 그림자: castShadow / receiveShadow 활성화
 * - 안개: FogExp2
 */
export function WarehouseScene({ objects, selectedId, onSelect, placingPreset, onPlace }: WarehouseSceneProps) {
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

      {/* 공간 객체 렌더링 */}
      {objects.map((obj) => (
        <SpatialMesh
          key={obj.id}
          object={obj}
          onSelect={onSelect}
          isSelected={obj.id === selectedId}
        />
      ))}

      {/* 배치 모드 고스트 메시 */}
      {placingPreset && onPlace && (
        <GhostMesh preset={placingPreset} onPlace={onPlace} />
      )}
    </>
  );
}
