import { useMemo } from 'react';
import * as THREE from 'three';

type WallStyle = 'SANDWICH_PANEL' | 'CONCRETE_WALL' | 'METAL_CORRUGATED' | 'BRICK';

interface WallPanelModelProps {
  width: number;   // 벽 너비 (m)
  height: number;  // 벽 높이 (m)
  thickness: number; // 벽 두께 (m)
  style: WallStyle;
  isSelected?: boolean;
  isHovered?: boolean;
}

const TEX_RES = 256;

/**
 * Canvas 기반 벽 텍스처 생성
 * - 샌드위치 패널: 수평 리브 라인 (한국 공장에서 가장 많이 사용)
 * - 콘크리트 벽: 거푸집 자국 + 노이즈
 * - 금속 골판: 수직 골 패턴
 * - 벽돌: 벽돌 패턴
 */
function createWallTexture(style: WallStyle): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_RES;
  canvas.height = TEX_RES;
  const ctx = canvas.getContext('2d')!;

  switch (style) {
    case 'SANDWICH_PANEL': {
      // 샌드위치 패널 — 한국 공장/창고 외벽에서 가장 많이 사용
      // 밝은 회색 바탕 + 수평 리브 라인
      ctx.fillStyle = '#C8CDD3';
      ctx.fillRect(0, 0, TEX_RES, TEX_RES);

      // 수평 리브 (약 30cm 간격)
      const ribCount = 8;
      const ribSpacing = TEX_RES / ribCount;
      for (let i = 0; i < ribCount; i++) {
        const y = i * ribSpacing;
        // 리브 그림자 (위)
        ctx.fillStyle = 'rgba(150,155,162,0.6)';
        ctx.fillRect(0, y, TEX_RES, 3);
        // 리브 하이라이트 (아래)
        ctx.fillStyle = 'rgba(210,215,220,0.5)';
        ctx.fillRect(0, y + 3, TEX_RES, 2);
        // 리브 몸통
        ctx.fillStyle = 'rgba(185,190,198,0.3)';
        ctx.fillRect(0, y + 5, TEX_RES, ribSpacing - 8);
      }

      // 미세 노이즈
      const imgData = ctx.getImageData(0, 0, TEX_RES, TEX_RES);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 6;
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(imgData, 0, 0);
      break;
    }
    case 'CONCRETE_WALL': {
      // 콘크리트 벽 — 거푸집 자국 + 핀홀
      ctx.fillStyle = '#9A978F';
      ctx.fillRect(0, 0, TEX_RES, TEX_RES);

      // 노이즈
      const imgData = ctx.getImageData(0, 0, TEX_RES, TEX_RES);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 25;
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(imgData, 0, 0);

      // 거푸집 이음매 (수평선)
      ctx.strokeStyle = 'rgba(120,115,108,0.5)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        const y = (TEX_RES / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(TEX_RES, y);
        ctx.stroke();
      }

      // 타이 홀 마크 (거푸집 고정 흔적)
      ctx.fillStyle = 'rgba(80,75,70,0.3)';
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          const x = TEX_RES / 6 + col * (TEX_RES / 3);
          const y = TEX_RES / 8 + row * (TEX_RES / 4);
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'METAL_CORRUGATED': {
      // 금속 골판 — 수직 골 패턴 (지붕/벽면)
      ctx.fillStyle = '#8090A0';
      ctx.fillRect(0, 0, TEX_RES, TEX_RES);

      const ribCount = 12;
      const ribW = TEX_RES / ribCount;
      for (let i = 0; i < ribCount; i++) {
        const x = i * ribW;
        // 골 그림자
        ctx.fillStyle = i % 2 === 0 ? 'rgba(100,115,130,0.5)' : 'rgba(140,155,170,0.4)';
        ctx.fillRect(x, 0, ribW / 2, TEX_RES);
        // 골 하이라이트
        ctx.fillStyle = i % 2 === 0 ? 'rgba(150,165,180,0.3)' : 'rgba(110,125,140,0.3)';
        ctx.fillRect(x + ribW / 2, 0, ribW / 2, TEX_RES);
      }

      // 볼트 라인 (상단/하단)
      ctx.fillStyle = 'rgba(90,100,112,0.4)';
      for (let i = 0; i < ribCount; i += 2) {
        const x = i * ribW + ribW / 2;
        ctx.beginPath();
        ctx.arc(x, TEX_RES * 0.1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, TEX_RES * 0.9, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'BRICK': {
      // 벽돌 — 적벽돌 패턴
      ctx.fillStyle = '#8B5E3C';
      ctx.fillRect(0, 0, TEX_RES, TEX_RES);

      const brickH = TEX_RES / 8;
      const brickW = TEX_RES / 4;
      const mortarW = 3;

      ctx.fillStyle = '#A09080'; // 줄눈 색상
      // 수평 줄눈
      for (let i = 0; i <= 8; i++) {
        ctx.fillRect(0, i * brickH - mortarW / 2, TEX_RES, mortarW);
      }

      // 수직 줄눈 (엇갈림)
      for (let row = 0; row < 8; row++) {
        const offset = row % 2 === 0 ? 0 : brickW / 2;
        for (let col = 0; col <= 4; col++) {
          const x = col * brickW + offset;
          ctx.fillRect(x - mortarW / 2, row * brickH, mortarW, brickH);
        }
      }

      // 벽돌 색상 변화
      for (let row = 0; row < 8; row++) {
        const offset = row % 2 === 0 ? 0 : brickW / 2;
        for (let col = 0; col < 5; col++) {
          const x = col * brickW + offset + mortarW;
          const y = row * brickH + mortarW;
          const variation = Math.random() * 30 - 15;
          const r = Math.max(0, Math.min(255, 139 + variation));
          const g = Math.max(0, Math.min(255, 94 + variation * 0.6));
          const b = Math.max(0, Math.min(255, 60 + variation * 0.4));
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, y, brickW - mortarW * 2, brickH - mortarW * 2);
        }
      }
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * 벽 패널 모델 — Canvas 텍스처 기반 벽면
 * 공장에서 많이 쓰는 샌드위치패널/콘크리트/금속골판/벽돌
 */
export function WallPanelModel({ width, height, thickness, style, isSelected, isHovered }: WallPanelModelProps) {
  const texture = useMemo(() => {
    const tex = createWallTexture(style);
    // 1m당 반복 비율
    tex.repeat.set(width / 3, height / 3);
    return tex;
  }, [style, width, height]);

  const materialProps = useMemo(() => {
    switch (style) {
      case 'SANDWICH_PANEL':
        return { metalness: 0.3, roughness: 0.5 };
      case 'CONCRETE_WALL':
        return { metalness: 0.05, roughness: 0.9 };
      case 'METAL_CORRUGATED':
        return { metalness: 0.5, roughness: 0.4 };
      case 'BRICK':
        return { metalness: 0.05, roughness: 0.85 };
    }
  }, [style]);

  const highlight = isSelected ? '#4488CC' : isHovered ? '#5599DD' : undefined;

  return (
    <group>
      {/* 벽 본체 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial
          map={texture}
          metalness={materialProps.metalness}
          roughness={materialProps.roughness}
          color={highlight ?? '#ffffff'}
        />
      </mesh>

      {/* 선택/호버 테두리 */}
      {(isSelected || isHovered) && (
        <mesh>
          <boxGeometry args={[width + 0.05, height + 0.05, thickness + 0.05]} />
          <meshStandardMaterial
            color={isSelected ? '#2D7DD2' : '#5BA3E0'}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
