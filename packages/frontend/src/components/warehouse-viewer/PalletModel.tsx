import { useMemo } from 'react';
import * as THREE from 'three';

interface PalletModelProps {
  width: number;   // 팔레트 가로 (m)
  depth: number;   // 팔레트 세로 (m)
  height: number;  // 팔레트 높이 (m)
  isSelected?: boolean;
  isHovered?: boolean;
}

// 목재 색상
const WOOD_COLOR = '#8B6914';
const WOOD_DARK = '#6B4F10';

// 판자 두께/치수
const PLANK_THICKNESS = 0.018;   // 상판/하판 판자 두께
const BLOCK_HEIGHT = 0.090;      // 다리 블록 높이 (총 높이에서 상하판 뺀 값)
const BLOCK_SIZE = 0.10;         // 다리 블록 가로세로

/**
 * 실제 T11 팔레트 모델 렌더링
 * - 상판: 9개 목재 판자 (간격 있게)
 * - 하판: 3개 받침 판자
 * - 다리: 9개 블록
 */
export function PalletModel({
  width,
  depth,
  height,
  isSelected = false,
  isHovered = false,
}: PalletModelProps) {
  const woodMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isSelected ? '#4A90D9' : isHovered ? '#A88B3D' : WOOD_COLOR,
      roughness: 0.9,
      metalness: 0,
    }),
    [isSelected, isHovered],
  );

  const woodDarkMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isSelected ? '#3A70B0' : WOOD_DARK,
      roughness: 0.9,
      metalness: 0,
    }),
    [isSelected],
  );

  // 상판 판자 수
  const topPlankCount = 7;
  const gap = 0.005; // 판자 간 간격
  const plankWidth = (width - gap * (topPlankCount + 1)) / topPlankCount;

  // 하판 러너 수
  const bottomRunnerCount = 3;
  const runnerWidth = width * 0.08;

  // 블록 Y 위치
  const blockY = PLANK_THICKNESS; // 하판 위
  const topPlankY = height - PLANK_THICKNESS / 2;

  return (
    <group>
      {/* 상판 판자들 */}
      {Array.from({ length: topPlankCount }, (_, i) => {
        const x = -width / 2 + gap + plankWidth / 2 + i * (plankWidth + gap);
        return (
          <mesh
            key={`top-${i}`}
            material={woodMat}
            position={[x, topPlankY, 0]}
          >
            <boxGeometry args={[plankWidth, PLANK_THICKNESS, depth - 0.01]} />
          </mesh>
        );
      })}

      {/* 하판 러너 3개 (세로 방향) */}
      {Array.from({ length: bottomRunnerCount }, (_, i) => {
        const x = -width / 2 + width * (i + 1) / (bottomRunnerCount + 1);
        return (
          <mesh
            key={`bottom-${i}`}
            material={woodDarkMat}
            position={[x, PLANK_THICKNESS / 2, 0]}
          >
            <boxGeometry args={[runnerWidth, PLANK_THICKNESS, depth - 0.01]} />
          </mesh>
        );
      })}

      {/* 다리 블록 9개 (3x3) */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const x = -width / 2 + width * (col + 1) / 4;
          const z = -depth / 2 + depth * (row + 1) / 4;
          return (
            <mesh
              key={`block-${row}-${col}`}
              material={woodDarkMat}
              position={[x, blockY + BLOCK_HEIGHT / 2, z]}
            >
              <boxGeometry args={[BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE]} />
            </mesh>
          );
        }),
      )}
    </group>
  );
}
