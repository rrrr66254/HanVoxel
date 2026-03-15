import { useMemo } from 'react';
import * as THREE from 'three';

interface ContainerModelProps {
  width: number;   // 외부 너비 (m)
  depth: number;   // 외부 깊이/길이 (m)
  height: number;  // 외부 높이 (m)
  isSelected?: boolean;
  isHovered?: boolean;
}

// 컨테이너 색상
const CONTAINER_COLOR = '#1A5276';
const FITTING_COLOR = '#7F8C8D';
const DOOR_COLOR = '#154360';

// 벽 두께
const WALL_THICKNESS = 0.05;
// 골판 리브 수
const RIB_COUNT = 24;

/**
 * ISO 컨테이너 모델 렌더링
 * - 골판 텍스처 효과 (리브 구조체)
 * - 모서리 금속 피팅
 * - 후면 문짝 표현
 */
export function ContainerModel({
  width,
  depth,
  height,
  isSelected = false,
  isHovered = false,
}: ContainerModelProps) {
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isSelected ? '#2D7DD2' : isHovered ? '#2471A3' : CONTAINER_COLOR,
      metalness: 0.5,
      roughness: 0.6,
    }),
    [isSelected, isHovered],
  );

  const fittingMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isSelected ? '#5BA3E0' : FITTING_COLOR,
      metalness: 0.9,
      roughness: 0.2,
    }),
    [isSelected],
  );

  const doorMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isSelected ? '#2563EB' : DOOR_COLOR,
      metalness: 0.5,
      roughness: 0.5,
    }),
    [isSelected],
  );

  const halfW = width / 2;
  const halfD = depth / 2;
  const halfH = height / 2;

  // 모서리 피팅 크기
  const fittingSize = 0.12;

  // 골판 리브 생성 (좌우 측면)
  const ribHeight = height * 0.85;
  const ribSpacing = depth / (RIB_COUNT + 1);

  return (
    <group>
      {/* 바닥판 */}
      <mesh material={bodyMat} position={[0, WALL_THICKNESS / 2, 0]}>
        <boxGeometry args={[width, WALL_THICKNESS, depth]} />
      </mesh>

      {/* 천장판 */}
      <mesh material={bodyMat} position={[0, height - WALL_THICKNESS / 2, 0]}>
        <boxGeometry args={[width, WALL_THICKNESS, depth]} />
      </mesh>

      {/* 좌측 벽 */}
      <mesh material={bodyMat} position={[-halfW + WALL_THICKNESS / 2, halfH, 0]}>
        <boxGeometry args={[WALL_THICKNESS, height, depth]} />
      </mesh>

      {/* 우측 벽 */}
      <mesh material={bodyMat} position={[halfW - WALL_THICKNESS / 2, halfH, 0]}>
        <boxGeometry args={[WALL_THICKNESS, height, depth]} />
      </mesh>

      {/* 앞면 벽 (문이 있는 쪽) */}
      {/* 좌측 문짝 */}
      <mesh material={doorMat} position={[-halfW / 2, halfH, halfD - WALL_THICKNESS / 2]}>
        <boxGeometry args={[width / 2 - 0.02, height - 0.1, WALL_THICKNESS]} />
      </mesh>
      {/* 우측 문짝 */}
      <mesh material={doorMat} position={[halfW / 2, halfH, halfD - WALL_THICKNESS / 2]}>
        <boxGeometry args={[width / 2 - 0.02, height - 0.1, WALL_THICKNESS]} />
      </mesh>
      {/* 문 중앙 이음새 라인 */}
      <mesh material={fittingMat} position={[0, halfH, halfD - 0.01]}>
        <boxGeometry args={[0.03, height - 0.05, 0.03]} />
      </mesh>
      {/* 문 잠금 핸들 (좌) */}
      <mesh material={fittingMat} position={[-0.15, halfH, halfD + 0.01]}>
        <boxGeometry args={[0.04, height * 0.6, 0.04]} />
      </mesh>
      {/* 문 잠금 핸들 (우) */}
      <mesh material={fittingMat} position={[0.15, halfH, halfD + 0.01]}>
        <boxGeometry args={[0.04, height * 0.6, 0.04]} />
      </mesh>

      {/* 뒷면 벽 */}
      <mesh material={bodyMat} position={[0, halfH, -halfD + WALL_THICKNESS / 2]}>
        <boxGeometry args={[width, height, WALL_THICKNESS]} />
      </mesh>

      {/* 좌측 골판 리브 (세로 방향) */}
      {Array.from({ length: RIB_COUNT }, (_, i) => {
        const z = -halfD + ribSpacing * (i + 1);
        return (
          <mesh
            key={`rib-l-${i}`}
            material={bodyMat}
            position={[-halfW - 0.008, halfH, z]}
          >
            <boxGeometry args={[0.015, ribHeight, 0.02]} />
          </mesh>
        );
      })}

      {/* 우측 골판 리브 */}
      {Array.from({ length: RIB_COUNT }, (_, i) => {
        const z = -halfD + ribSpacing * (i + 1);
        return (
          <mesh
            key={`rib-r-${i}`}
            material={bodyMat}
            position={[halfW + 0.008, halfH, z]}
          >
            <boxGeometry args={[0.015, ribHeight, 0.02]} />
          </mesh>
        );
      })}

      {/* 모서리 피팅 8개 (ISO 컨테이너 표준) */}
      {[
        [-halfW, 0, -halfD],
        [halfW, 0, -halfD],
        [-halfW, 0, halfD],
        [halfW, 0, halfD],
        [-halfW, height, -halfD],
        [halfW, height, -halfD],
        [-halfW, height, halfD],
        [halfW, height, halfD],
      ].map(([x, y, z], idx) => (
        <mesh key={`fitting-${idx}`} material={fittingMat} position={[x, y, z]}>
          <boxGeometry args={[fittingSize, fittingSize, fittingSize]} />
        </mesh>
      ))}

      {/* 상단 세로 엣지 4개 */}
      {[
        [-halfW, halfH, -halfD],
        [halfW, halfH, -halfD],
        [-halfW, halfH, halfD],
        [halfW, halfH, halfD],
      ].map(([x, y, z], idx) => (
        <mesh key={`edge-v-${idx}`} material={fittingMat} position={[x, y, z]}>
          <boxGeometry args={[0.04, height, 0.04]} />
        </mesh>
      ))}

      {/* 하단 가로 엣지 (길이 방향) */}
      {[
        [-halfW, 0, 0],
        [halfW, 0, 0],
      ].map(([x, y, z], idx) => (
        <mesh key={`edge-h-${idx}`} material={fittingMat} position={[x, y, z]}>
          <boxGeometry args={[0.04, 0.04, depth]} />
        </mesh>
      ))}
    </group>
  );
}
