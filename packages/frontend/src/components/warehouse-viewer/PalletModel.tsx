import { useMemo } from 'react';
import * as THREE from 'three';

interface PalletModelProps {
  width: number;   // 팔레트 가로 (m)
  depth: number;   // 팔레트 세로 (m)
  height: number;  // 팔레트 높이 (m)
  isSelected?: boolean;
  isHovered?: boolean;
}

// Canvas 기반 나무결 텍스처 생성
function createWoodTexture(isDark: boolean): THREE.CanvasTexture {
  const RES = 256;
  const canvas = document.createElement('canvas');
  canvas.width = RES;
  canvas.height = RES;
  const ctx = canvas.getContext('2d')!;

  // 기본 나무 색상
  const baseR = isDark ? 120 : 170;
  const baseG = isDark ? 80 : 130;
  const baseB = isDark ? 30 : 50;

  ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
  ctx.fillRect(0, 0, RES, RES);

  // 나무결 (세로 줄무늬 — 나무 섬유 방향)
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * RES;
    const w = 1 + Math.random() * 3;
    const variation = (Math.random() - 0.5) * 30;
    ctx.fillStyle = `rgba(${baseR + variation}, ${baseG + variation}, ${baseB + variation * 0.5}, 0.4)`;
    ctx.fillRect(x, 0, w, RES);
  }

  // 나이테/결 (곡선 패턴)
  for (let i = 0; i < 8; i++) {
    const y = Math.random() * RES;
    const amp = 5 + Math.random() * 15;
    const freq = 0.02 + Math.random() * 0.03;
    ctx.strokeStyle = `rgba(${baseR - 30}, ${baseG - 30}, ${baseB - 10}, 0.3)`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    for (let x = 0; x < RES; x++) {
      const yy = y + Math.sin(x * freq) * amp;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // 마디/흠집 (어두운 원/타원)
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * RES;
    const y = Math.random() * RES;
    const r = 3 + Math.random() * 8;
    ctx.fillStyle = `rgba(${baseR - 50}, ${baseG - 40}, ${baseB - 10}, 0.4)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // 미세 노이즈
  const imageData = ctx.getImageData(0, 0, RES, RES);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// 판자 두께/치수 (T11 기준 비례)
const PLANK_THICKNESS = 0.020;   // 상판/하판 판자 두께
const STRINGER_HEIGHT = 0.095;   // 종목(stringer) 높이
const STRINGER_THICKNESS = 0.022; // 종목 두께

/**
 * 리얼리스틱 목재 팔레트 모델
 * - 상판: 5~7개 판자 (나무결 텍스처)
 * - 3개 종목(stringer/runner) — 세로 방향
 * - 하판: 3개 판자 (가로 방향)
 * - 9개 다리 블록 (3×3)
 */
export function PalletModel({
  width,
  depth,
  height,
  isSelected = false,
  isHovered = false,
}: PalletModelProps) {
  // 텍스처 메모이제이션
  const woodTexture = useMemo(() => createWoodTexture(false), []);
  const woodDarkTexture = useMemo(() => createWoodTexture(true), []);

  const woodMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: woodTexture,
      color: isSelected ? '#6BAED6' : isHovered ? '#C4A84A' : '#D4A44A',
      roughness: 0.85,
      metalness: 0.02,
    }),
    [woodTexture, isSelected, isHovered],
  );

  const woodDarkMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: woodDarkTexture,
      color: isSelected ? '#4A80B0' : '#A07830',
      roughness: 0.9,
      metalness: 0.02,
    }),
    [woodDarkTexture, isSelected],
  );

  // 비례 계산 (width 기준)
  const scale = width / 1.1; // T11 기준 스케일

  // 상판 판자 (5개 — T11 비율)
  const topPlankCount = 5;
  const gap = 0.005 * scale;
  const plankWidth = (width - gap * (topPlankCount + 1)) / topPlankCount;
  const topY = height - PLANK_THICKNESS / 2;

  // 하판 판자 (3개 — 가로 방향)
  const bottomPlankCount = 3;
  const bottomPlankDepth = (depth - gap * (bottomPlankCount + 1)) / bottomPlankCount;

  // 종목 (3개 — 세로 방향, 상판과 하판 사이)
  const stringerPositions = [-width / 2 + width * 0.15, 0, width / 2 - width * 0.15];
  const stringerY = PLANK_THICKNESS + STRINGER_HEIGHT / 2;

  // 다리 블록 위치 (3×3)
  const blockPositionsX = stringerPositions;
  const blockPositionsZ = [
    -depth / 2 + depth * 0.15,
    0,
    depth / 2 - depth * 0.15,
  ];
  const blockH = STRINGER_HEIGHT;
  const blockW = 0.10 * scale;

  return (
    <group>
      {/* === 상판 — 5개 판자 (가로 방향으로 배열) === */}
      {Array.from({ length: topPlankCount }, (_, i) => {
        const x = -width / 2 + gap + plankWidth / 2 + i * (plankWidth + gap);
        return (
          <mesh key={`top-${i}`} material={woodMat} position={[x, topY, 0]} castShadow>
            <boxGeometry args={[plankWidth, PLANK_THICKNESS, depth - 0.008]} />
          </mesh>
        );
      })}

      {/* === 종목(Stringer) — 3개 (세로 방향) === */}
      {stringerPositions.map((x, i) => (
        <mesh key={`stringer-${i}`} material={woodDarkMat} position={[x, stringerY, 0]} castShadow>
          <boxGeometry args={[STRINGER_THICKNESS * scale, STRINGER_HEIGHT, depth - 0.02]} />
        </mesh>
      ))}

      {/* === 하판 — 3개 판자 (가로 방향, 세로 배열) === */}
      {Array.from({ length: bottomPlankCount }, (_, i) => {
        const z = -depth / 2 + gap + bottomPlankDepth / 2 + i * (bottomPlankDepth + gap);
        return (
          <mesh key={`bottom-${i}`} material={woodMat} position={[0, PLANK_THICKNESS / 2, z]} castShadow>
            <boxGeometry args={[width - 0.008, PLANK_THICKNESS, bottomPlankDepth * 0.6]} />
          </mesh>
        );
      })}

      {/* === 다리 블록 — 9개 (3×3) === */}
      {blockPositionsX.map((x, xi) =>
        blockPositionsZ.map((z, zi) => (
          <mesh
            key={`block-${xi}-${zi}`}
            material={woodDarkMat}
            position={[x, PLANK_THICKNESS + blockH / 2, z]}
            castShadow
          >
            <boxGeometry args={[blockW, blockH, blockW]} />
          </mesh>
        )),
      )}

      {/* 선택 하이라이트 */}
      {isSelected && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width + 0.05, height + 0.05, depth + 0.05]} />
          <meshStandardMaterial color="#2D7DD2" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
