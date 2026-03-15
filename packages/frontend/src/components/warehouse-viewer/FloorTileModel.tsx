import { useMemo } from 'react';
import * as THREE from 'three';

type FloorStyle = 'EPOXY_GRAY' | 'EPOXY_GREEN' | 'CONCRETE' | 'ANTI_SLIP' | 'MARKING';

interface FloorTileModelProps {
  width: number;   // 바닥 너비 (m)
  depth: number;   // 바닥 깊이 (m)
  style: FloorStyle;
  isSelected?: boolean;
  isHovered?: boolean;
}

// 텍스처 해상도
const TEX_RES = 256;

/**
 * Canvas 기반 바닥 텍스처 생성
 * - 에폭시 (회색/녹색): 매끈한 표면 + 미세 노이즈
 * - 콘크리트: 거친 표면 + 균열 패턴
 * - 미끄럼방지: 다이아몬드 패턴
 */
function createFloorTexture(style: FloorStyle): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_RES;
  canvas.height = TEX_RES;
  const ctx = canvas.getContext('2d')!;

  switch (style) {
    case 'EPOXY_GRAY': {
      // 회색 에폭시 — 매끈한 공장 바닥
      ctx.fillStyle = '#6B7B8D';
      ctx.fillRect(0, 0, TEX_RES, TEX_RES);
      // 미세 스페클
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * TEX_RES;
        const y = Math.random() * TEX_RES;
        const brightness = 100 + Math.random() * 40;
        ctx.fillStyle = `rgba(${brightness},${brightness + 5},${brightness + 10},0.3)`;
        ctx.fillRect(x, y, 2, 2);
      }
      break;
    }
    case 'EPOXY_GREEN': {
      // 녹색 에폭시 — 공장 통로/작업 구역
      ctx.fillStyle = '#4A7B5A';
      ctx.fillRect(0, 0, TEX_RES, TEX_RES);
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * TEX_RES;
        const y = Math.random() * TEX_RES;
        const g = 110 + Math.random() * 30;
        ctx.fillStyle = `rgba(${g - 20},${g},${g - 30},0.25)`;
        ctx.fillRect(x, y, 2, 2);
      }
      break;
    }
    case 'CONCRETE': {
      // 콘크리트 — 거친 표면 + 균열
      ctx.fillStyle = '#8A8A82';
      ctx.fillRect(0, 0, TEX_RES, TEX_RES);
      // 노이즈
      const imgData = ctx.getImageData(0, 0, TEX_RES, TEX_RES);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 20;
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(imgData, 0, 0);
      // 균열 패턴
      ctx.strokeStyle = 'rgba(60,60,55,0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        let x = Math.random() * TEX_RES;
        let y = Math.random() * TEX_RES;
        ctx.moveTo(x, y);
        for (let j = 0; j < 5; j++) {
          x += (Math.random() - 0.5) * 60;
          y += (Math.random() - 0.5) * 60;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // 이음매
      ctx.strokeStyle = 'rgba(70,70,65,0.3)';
      ctx.lineWidth = 2;
      const half = TEX_RES / 2;
      ctx.beginPath();
      ctx.moveTo(half, 0);
      ctx.lineTo(half, TEX_RES);
      ctx.moveTo(0, half);
      ctx.lineTo(TEX_RES, half);
      ctx.stroke();
      break;
    }
    case 'ANTI_SLIP': {
      // 미끄럼방지 타일 — 다이아몬드 양각 패턴
      ctx.fillStyle = '#707878';
      ctx.fillRect(0, 0, TEX_RES, TEX_RES);
      const diamondSize = TEX_RES / 8;
      ctx.strokeStyle = 'rgba(90,98,98,0.6)';
      ctx.lineWidth = 1;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const cx = col * diamondSize + diamondSize / 2;
          const cy = row * diamondSize + diamondSize / 2;
          const offset = row % 2 === 0 ? 0 : diamondSize / 2;
          const px = cx + offset;
          const r = diamondSize * 0.3;
          ctx.beginPath();
          ctx.moveTo(px, cy - r);
          ctx.lineTo(px + r, cy);
          ctx.lineTo(px, cy + r);
          ctx.lineTo(px - r, cy);
          ctx.closePath();
          ctx.fillStyle = 'rgba(80,88,88,0.4)';
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }
    case 'MARKING': {
      // 안전 마킹 바닥 — 노란-검정 빗금
      ctx.fillStyle = '#3A3A3A';
      ctx.fillRect(0, 0, TEX_RES, TEX_RES);
      const stripeW = TEX_RES / 6;
      ctx.fillStyle = '#D4A017';
      for (let i = -TEX_RES; i < TEX_RES * 2; i += stripeW * 2) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + stripeW, 0);
        ctx.lineTo(i + stripeW + TEX_RES, TEX_RES);
        ctx.lineTo(i + TEX_RES, TEX_RES);
        ctx.closePath();
        ctx.fill();
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
 * 바닥 타일 모델 — Canvas 텍스처 기반 바닥 패널
 * 공장에서 많이 쓰는 에폭시/콘크리트/미끄럼방지 바닥
 */
export function FloorTileModel({ width, depth, style, isSelected, isHovered }: FloorTileModelProps) {
  const texture = useMemo(() => {
    const tex = createFloorTexture(style);
    // 1m당 1 타일 반복
    tex.repeat.set(width / 2, depth / 2);
    return tex;
  }, [style, width, depth]);

  const materialProps = useMemo(() => {
    switch (style) {
      case 'EPOXY_GRAY':
      case 'EPOXY_GREEN':
        return { metalness: 0.15, roughness: 0.5 };
      case 'CONCRETE':
        return { metalness: 0.05, roughness: 0.9 };
      case 'ANTI_SLIP':
        return { metalness: 0.1, roughness: 0.8 };
      case 'MARKING':
        return { metalness: 0.1, roughness: 0.6 };
    }
  }, [style]);

  const highlight = isSelected ? '#4488CC' : isHovered ? '#5599DD' : undefined;

  return (
    <group>
      {/* 메인 바닥 면 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          map={texture}
          metalness={materialProps.metalness}
          roughness={materialProps.roughness}
          color={highlight ?? '#ffffff'}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 선택/호버 경계선 */}
      {(isSelected || isHovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
          <planeGeometry args={[width + 0.05, depth + 0.05]} />
          <meshStandardMaterial
            color={isSelected ? '#2D7DD2' : '#5BA3E0'}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
