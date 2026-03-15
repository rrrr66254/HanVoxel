import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { SpatialPreset } from '../../types/preset';
import type { MeshType } from '../../types/spatial';

interface GhostMeshProps {
  preset: SpatialPreset;
  onPlace: (position: [number, number, number]) => void;
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
 * 배치 모드 고스트 메시 — 마우스를 따라다니며 클릭 시 배치 확정
 */
export function GhostMesh({ preset, onPlace }: GhostMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const { camera, gl } = useThree();

  const w = preset.width || 1;
  const d = preset.depth || 1;
  const h = preset.height || 1;

  // 매 프레임마다 마우스 위치로 이동
  useFrame(() => {
    if (!meshRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(floorPlane, intersection);
    if (hit) {
      // 1m 그리드 스냅
      meshRef.current.position.x = Math.round(hit.x);
      meshRef.current.position.y = h / 2;
      meshRef.current.position.z = Math.round(hit.z);
    }
  });

  // 마우스 이벤트 등록
  const canvas = gl.domElement;
  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return; // 좌클릭만
    if (!meshRef.current) return;
    const pos = meshRef.current.position;
    onPlace([pos.x, pos.y, pos.z]);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerdown', onPointerDown);
  };

  // 이벤트 바인딩
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);

  const renderGeometry = () => {
    const meshType = (preset.meshType ?? 'box') as MeshType;
    switch (meshType) {
      case 'cylinder':
        return <cylinderGeometry args={[0.5, 0.5, 1, 16]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      scale={[w, h, d]}
      position={[0, h / 2, 0]}
    >
      {renderGeometry()}
      <meshStandardMaterial
        color={preset.color ?? '#3b82f6'}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}
