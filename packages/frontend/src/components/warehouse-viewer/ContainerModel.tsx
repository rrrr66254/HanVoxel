import { useMemo } from 'react';
import * as THREE from 'three';

interface ContainerModelProps {
  width: number;   // 외부 너비 (m)
  depth: number;   // 외부 깊이/길이 (m)
  height: number;  // 외부 높이 (m)
  isSelected?: boolean;
  isHovered?: boolean;
  isReefer?: boolean; // 냉장 컨테이너 여부
  containerColor?: string; // 사용자 지정 색상
}

// 컨테이너 색상 (회색 기본)
const DRY_COLOR = '#808890';
const REEFER_COLOR = '#D0D0D0';
const FITTING_COLOR = '#606060';
const DRY_DOOR_COLOR = '#606870';
const REEFER_DOOR_COLOR = '#A0A0A0';

// 벽 두께
const WALL_THICKNESS = 0.05;
// 골판 리브 수
const RIB_COUNT = 24;

// HanVoxel 텍스트 캔버스 텍스처 생성
function createSideTexture(textureWidth: number, textureHeight: number, bgColor: string, isSelected: boolean, isHovered: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // 배경색 (컨테이너 본체 색상)
  ctx.fillStyle = isSelected ? '#2D7DD2' : isHovered ? '#6A7280' : bgColor;
  ctx.fillRect(0, 0, 512, 256);

  // 골판 텍스처 효과 (세로 줄무늬)
  const ribSpacing = 512 / 28;
  for (let i = 0; i < 28; i++) {
    ctx.fillStyle = i % 2 === 0
      ? (isSelected ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.06)')
      : (isSelected ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.04)');
    ctx.fillRect(i * ribSpacing, 0, ribSpacing, 256);
  }

  // HanVoxel 텍스트
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 72px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 그림자
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillText('HanVoxel', 256, 128);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * ISO 컨테이너 모델 렌더링
 * - 회색 기본 색상
 * - 양쪽 측면에 HanVoxel 텍스트
 * - 골판 텍스처 효과
 * - 모서리 금속 피팅
 * - 후면 문짝 표현
 */
export function ContainerModel({
  width,
  depth,
  height,
  isSelected = false,
  isHovered = false,
  isReefer = false,
  containerColor,
}: ContainerModelProps) {
  const baseColor = containerColor ?? (isReefer ? REEFER_COLOR : DRY_COLOR);
  const baseDoorColor = isReefer ? REEFER_DOOR_COLOR : DRY_DOOR_COLOR;

  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isSelected ? '#2D7DD2' : isHovered ? '#6A7280' : baseColor,
      metalness: 0.5,
      roughness: 0.6,
    }),
    [isSelected, isHovered, baseColor],
  );

  // 측면 텍스처 머터리얼 (HanVoxel 텍스트 포함)
  const sideMat = useMemo(() => {
    const tex = createSideTexture(512, 256, baseColor, isSelected, isHovered);
    return new THREE.MeshStandardMaterial({
      map: tex,
      metalness: 0.5,
      roughness: 0.6,
    });
  }, [isSelected, isHovered, baseColor]);

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
      color: isSelected ? '#2563EB' : baseDoorColor,
      metalness: 0.5,
      roughness: 0.5,
    }),
    [isSelected, baseDoorColor],
  );

  const halfW = width / 2;
  const halfD = depth / 2;
  const halfH = height / 2;

  // 모서리 피팅 크기
  const fittingSize = 0.12;

  return (
    <group>
      {/* 바닥판 */}
      <mesh material={bodyMat} position={[0, WALL_THICKNESS / 2, 0]} receiveShadow>
        <boxGeometry args={[width, WALL_THICKNESS, depth]} />
      </mesh>

      {/* 천장판 */}
      <mesh material={bodyMat} position={[0, height - WALL_THICKNESS / 2, 0]} castShadow>
        <boxGeometry args={[width, WALL_THICKNESS, depth]} />
      </mesh>

      {/* 좌측 벽 — HanVoxel 텍스처 */}
      <mesh material={sideMat} position={[-halfW + WALL_THICKNESS / 2, halfH, 0]} castShadow>
        <boxGeometry args={[WALL_THICKNESS, height, depth]} />
      </mesh>

      {/* 우측 벽 — HanVoxel 텍스처 */}
      <mesh material={sideMat} position={[halfW - WALL_THICKNESS / 2, halfH, 0]} castShadow>
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
        const z = -halfD + (depth / (RIB_COUNT + 1)) * (i + 1);
        return (
          <mesh
            key={`rib-l-${i}`}
            material={bodyMat}
            position={[-halfW - 0.008, halfH, z]}
          >
            <boxGeometry args={[0.015, height * 0.85, 0.02]} />
          </mesh>
        );
      })}

      {/* 우측 골판 리브 */}
      {Array.from({ length: RIB_COUNT }, (_, i) => {
        const z = -halfD + (depth / (RIB_COUNT + 1)) * (i + 1);
        return (
          <mesh
            key={`rib-r-${i}`}
            material={bodyMat}
            position={[halfW + 0.008, halfH, z]}
          >
            <boxGeometry args={[0.015, height * 0.85, 0.02]} />
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

      {/* 냉장 컨테이너 — 냉각 유닛 (뒷면) */}
      {isReefer && (
        <group position={[0, halfH, -halfD - 0.15]}>
          {/* 냉각 유닛 본체 */}
          <mesh material={fittingMat}>
            <boxGeometry args={[width * 0.7, height * 0.6, 0.25]} />
          </mesh>
          {/* 냉각 팬 (2개) */}
          <mesh material={bodyMat} position={[-width * 0.15, 0, -0.13]}>
            <cylinderGeometry args={[height * 0.12, height * 0.12, 0.05, 16]} />
          </mesh>
          <mesh material={bodyMat} position={[width * 0.15, 0, -0.13]}>
            <cylinderGeometry args={[height * 0.12, height * 0.12, 0.05, 16]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
