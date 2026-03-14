import { Grid, Environment } from '@react-three/drei';
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
 * 창고 3D 씬 — 바닥 그리드 + 조명 + 공간 객체 렌더링
 */
export function WarehouseScene({ objects, selectedId, onSelect, placingPreset, onPlace }: WarehouseSceneProps) {
  return (
    <>
      {/* 조명 */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[20, 30, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 20, -10]} intensity={0.3} />

      {/* 환경맵 (부드러운 반사) */}
      <Environment preset="warehouse" />

      {/* 바닥 그리드 (미터 단위) */}
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#4a5568"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2d3748"
        fadeDistance={80}
        position={[0, -0.01, 0]}
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
