import { useMemo } from 'react';
import * as THREE from 'three';

interface ProductBoxModelProps {
  width: number;
  depth: number;
  height: number;
  color?: string;
  isSelected?: boolean;
  isHovered?: boolean;
}

// 골판지 텍스처 생성
function createCardboardTexture(boxColor: string): THREE.CanvasTexture {
  const RES = 256;
  const canvas = document.createElement('canvas');
  canvas.width = RES;
  canvas.height = RES;
  const ctx = canvas.getContext('2d')!;

  // 기본 골판지 색상 (갈색 크라프트지)
  ctx.fillStyle = '#B8956A';
  ctx.fillRect(0, 0, RES, RES);

  // 골판지 줄무늬 (가로 골)
  for (let y = 0; y < RES; y += 4) {
    const shade = y % 8 < 4 ? 8 : -8;
    ctx.fillStyle = `rgba(${184 + shade}, ${149 + shade}, ${106 + shade}, 0.6)`;
    ctx.fillRect(0, y, RES, 2);
  }

  // 섬유 노이즈
  const imageData = ctx.getImageData(0, 0, RES, RES);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 15;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);

  // 테이프 (중앙 가로 — 포장 테이프)
  ctx.fillStyle = 'rgba(200, 180, 120, 0.35)';
  ctx.fillRect(0, RES / 2 - 12, RES, 24);
  ctx.strokeStyle = 'rgba(160, 140, 80, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, RES / 2 - 12, RES, 24);

  // 상단 밀봉선
  ctx.strokeStyle = 'rgba(100, 80, 50, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 15);
  ctx.lineTo(RES, 15);
  ctx.stroke();

  // 로고/라벨 영역 (색상 라벨)
  const labelW = RES * 0.4;
  const labelH = RES * 0.25;
  const labelX = (RES - labelW) / 2;
  const labelY = RES * 0.18;
  ctx.fillStyle = boxColor;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(labelX, labelY, labelW, labelH);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(labelX, labelY, labelW, labelH);

  // 취급 주의 마크 (하단)
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▲', RES * 0.2, RES * 0.85);
  ctx.font = '10px sans-serif';
  ctx.fillText('THIS SIDE UP', RES * 0.2, RES * 0.92);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/**
 * 리얼리스틱 골판지 박스 모델
 * - 골판지 텍스처 + 포장 테이프
 * - 라벨 영역 (업종별 색상)
 * - 테두리 모서리
 */
export function ProductBoxModel({
  width,
  depth,
  height,
  color = '#6b7280',
  isSelected = false,
  isHovered = false,
}: ProductBoxModelProps) {
  const texture = useMemo(() => createCardboardTexture(color), [color]);

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: texture,
      color: isSelected ? '#8AB4E0' : isHovered ? '#D4BA82' : '#D4C4A8',
      roughness: 0.9,
      metalness: 0,
    }),
    [texture, isSelected, isHovered],
  );

  // 모서리 테두리 (약간 어두운 색)
  const edgeColor = '#8B7B60';

  return (
    <group>
      {/* 박스 본체 */}
      <mesh material={mat} position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>

      {/* 상단 테이프 라인 */}
      <mesh position={[0, height + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.15, depth]} />
        <meshStandardMaterial color="#C8B880" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* 모서리 보강 (세로 4개) */}
      {[
        [-width / 2, 0, -depth / 2],
        [width / 2, 0, -depth / 2],
        [-width / 2, 0, depth / 2],
        [width / 2, 0, depth / 2],
      ].map(([x, , z], i) => (
        <mesh key={`edge-${i}`} position={[x, height / 2, z]}>
          <boxGeometry args={[0.005, height, 0.005]} />
          <meshStandardMaterial color={edgeColor} roughness={0.8} />
        </mesh>
      ))}

      {/* 선택 하이라이트 */}
      {isSelected && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width + 0.03, height + 0.03, depth + 0.03]} />
          <meshStandardMaterial color="#2D7DD2" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
