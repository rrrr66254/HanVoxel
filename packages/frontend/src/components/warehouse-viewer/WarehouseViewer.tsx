import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { WarehouseScene } from './WarehouseScene';
import { ObjectInfoPanel } from './ObjectInfoPanel';
import type { SpatialObject } from '../../types/spatial';

interface WarehouseViewerProps {
  objects: SpatialObject[];
}

/**
 * 3D 창고 뷰어 — spatial_objects 데이터를 Three.js로 렌더링
 *
 * 기능:
 * - 공간 객체를 타입/상태별 색상으로 3D 렌더링
 * - 마우스 드래그로 카메라 회전, 스크롤로 줌
 * - 객체 클릭 시 상세 정보 패널 표시
 * - 호버 시 라벨 툴팁
 */
export function WarehouseViewer({ objects }: WarehouseViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedObject = objects.find((o) => o.id === selectedId) ?? null;

  const activeObjects = objects.filter((o) => o.isActive);

  return (
    <div className="relative h-full w-full">
      {/* 3D 캔버스 */}
      <Canvas
        camera={{ position: [20, 15, 20], fov: 50, near: 0.1, far: 500 }}
        style={{ background: '#111827' }}
        onClick={(e) => {
          // 빈 영역 클릭 시 선택 해제
          if (e.target === e.currentTarget) {
            setSelectedId(null);
          }
        }}
      >
        <OrbitControls
          makeDefault
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping
          dampingFactor={0.1}
        />
        <WarehouseScene
          objects={activeObjects}
          selectedId={selectedId}
          onSelect={(obj) => setSelectedId(obj.id)}
        />
      </Canvas>

      {/* 좌측 상단 — 객체 수 표시 */}
      <div className="absolute top-4 left-4 rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-2 text-sm text-white backdrop-blur">
        <span className="font-bold">{activeObjects.length}</span>
        <span className="ml-1 text-gray-400">공간 객체</span>
      </div>

      {/* 우측 — 선택된 객체 정보 패널 */}
      <ObjectInfoPanel
        object={selectedObject}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
