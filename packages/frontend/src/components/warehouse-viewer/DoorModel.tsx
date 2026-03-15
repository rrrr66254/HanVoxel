import { useMemo } from 'react';
import * as THREE from 'three';

// 문 스타일 종류
export type DoorStyle = 'ROLLING_SHUTTER' | 'SWING_DOUBLE' | 'SLIDING' | 'DOCK_LEVELER';

interface DoorModelProps {
  width: number;
  height: number;
  thickness?: number;
  style?: DoorStyle;
  isSelected?: boolean;
  isHovered?: boolean;
}

// Canvas 기반 텍스처 생성
function createDoorTexture(style: DoorStyle, w: number, h: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const RES = 512;
  canvas.width = RES;
  canvas.height = RES;
  const ctx = canvas.getContext('2d')!;

  switch (style) {
    case 'ROLLING_SHUTTER': {
      // 롤링 셔터 — 가로 줄무늬 패턴
      ctx.fillStyle = '#4A5568';
      ctx.fillRect(0, 0, RES, RES);
      const slats = Math.round(h * 8); // 높이에 비례한 슬랫 수
      const slatH = RES / slats;
      for (let i = 0; i < slats; i++) {
        const y = i * slatH;
        // 슬랫 본체
        const grad = ctx.createLinearGradient(0, y, 0, y + slatH);
        grad.addColorStop(0, '#6B7280');
        grad.addColorStop(0.3, '#9CA3AF');
        grad.addColorStop(0.7, '#9CA3AF');
        grad.addColorStop(1, '#4B5563');
        ctx.fillStyle = grad;
        ctx.fillRect(0, y + 1, RES, slatH - 2);
        // 슬랫 사이 선
        ctx.fillStyle = '#1F2937';
        ctx.fillRect(0, y, RES, 1);
      }
      // 손잡이 (중앙 하단)
      ctx.fillStyle = '#374151';
      ctx.fillRect(RES / 2 - 20, RES - 60, 40, 30);
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 2;
      ctx.strokeRect(RES / 2 - 20, RES - 60, 40, 30);
      break;
    }
    case 'SWING_DOUBLE': {
      // 양개문 — 좌우 패널 + 경첩
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(0, 0, RES, RES);
      // 좌측 패널
      const panelGrad = ctx.createLinearGradient(0, 0, RES / 2, 0);
      panelGrad.addColorStop(0, '#1E40AF');
      panelGrad.addColorStop(0.5, '#2563EB');
      panelGrad.addColorStop(1, '#1D4ED8');
      ctx.fillStyle = panelGrad;
      ctx.fillRect(4, 4, RES / 2 - 8, RES - 8);
      // 우측 패널
      const panelGrad2 = ctx.createLinearGradient(RES / 2, 0, RES, 0);
      panelGrad2.addColorStop(0, '#1D4ED8');
      panelGrad2.addColorStop(0.5, '#2563EB');
      panelGrad2.addColorStop(1, '#1E40AF');
      ctx.fillStyle = panelGrad2;
      ctx.fillRect(RES / 2 + 4, 4, RES / 2 - 8, RES - 8);
      // 중앙선
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(RES / 2 - 2, 0, 4, RES);
      // 경첩 (좌)
      for (let i = 0; i < 3; i++) {
        const y = RES * (0.2 + i * 0.3);
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(2, y - 8, 12, 16);
      }
      // 경첩 (우)
      for (let i = 0; i < 3; i++) {
        const y = RES * (0.2 + i * 0.3);
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(RES - 14, y - 8, 12, 16);
      }
      // 손잡이
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(RES / 2 - 25, RES * 0.55, 10, 30);
      ctx.fillRect(RES / 2 + 15, RES * 0.55, 10, 30);
      break;
    }
    case 'SLIDING': {
      // 슬라이딩 도어 — 레일 + 패널
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, RES, RES);
      // 패널 (약간 밝은 톤)
      const grad = ctx.createLinearGradient(0, 0, RES, 0);
      grad.addColorStop(0, '#4B5563');
      grad.addColorStop(0.5, '#6B7280');
      grad.addColorStop(1, '#4B5563');
      ctx.fillStyle = grad;
      ctx.fillRect(10, 20, RES - 20, RES - 40);
      // 상단 레일
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(0, 0, RES, 15);
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(0, 15, RES, 3);
      // 하단 레일
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(0, RES - 18, RES, 3);
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(0, RES - 15, RES, 15);
      // 손잡이 (우측 중앙)
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(RES - 40, RES * 0.45, 8, 50);
      break;
    }
    case 'DOCK_LEVELER': {
      // 독 레벨러 (로딩 도크) — 스틸 패널 + 경고 마킹
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, RES, RES);
      // 패널 세그먼트
      for (let i = 0; i < 4; i++) {
        const y = i * (RES / 4);
        const grad = ctx.createLinearGradient(0, y, 0, y + RES / 4);
        grad.addColorStop(0, '#4B5563');
        grad.addColorStop(0.5, '#6B7280');
        grad.addColorStop(1, '#4B5563');
        ctx.fillStyle = grad;
        ctx.fillRect(5, y + 3, RES - 10, RES / 4 - 6);
      }
      // 경고 줄무늬 (하단)
      const stripeH = 30;
      const stripeW = 30;
      ctx.fillStyle = '#F59E0B';
      for (let x = 0; x < RES; x += stripeW * 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, RES - stripeH);
        ctx.lineTo(x + stripeW, RES - stripeH);
        ctx.lineTo(x + stripeW * 2, RES);
        ctx.lineTo(x + stripeW, RES);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * 창고 출입문 3D 모델
 * - ROLLING_SHUTTER: 롤링 셔터 (일반 창고문)
 * - SWING_DOUBLE: 양개문 (출입문)
 * - SLIDING: 슬라이딩 도어
 * - DOCK_LEVELER: 독 레벨러 (로딩 도크)
 */
export function DoorModel({
  width,
  height,
  thickness = 0.15,
  style = 'ROLLING_SHUTTER',
  isSelected = false,
  isHovered = false,
}: DoorModelProps) {
  const texture = useMemo(() => createDoorTexture(style, width, height), [style, width, height]);

  // 프레임 색상
  const frameColor = style === 'SWING_DOUBLE' ? '#1E3A5F' : '#374151';
  const frameThickness = 0.08;

  return (
    <group>
      {/* 문 패널 (텍스처) */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.3}
          roughness={0.6}
          color={isSelected ? '#5BA3E0' : isHovered ? '#7BB8E8' : '#ffffff'}
        />
      </mesh>

      {/* 프레임 — 상단 */}
      <mesh position={[0, height + frameThickness / 2, 0]}>
        <boxGeometry args={[width + frameThickness * 2, frameThickness, thickness + 0.02]} />
        <meshStandardMaterial color={frameColor} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* 프레임 — 좌측 */}
      <mesh position={[-width / 2 - frameThickness / 2, height / 2, 0]}>
        <boxGeometry args={[frameThickness, height, thickness + 0.02]} />
        <meshStandardMaterial color={frameColor} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* 프레임 — 우측 */}
      <mesh position={[width / 2 + frameThickness / 2, height / 2, 0]}>
        <boxGeometry args={[frameThickness, height, thickness + 0.02]} />
        <meshStandardMaterial color={frameColor} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* 선택 하이라이트 테두리 */}
      {isSelected && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width + 0.2, height + 0.2, thickness + 0.2]} />
          <meshStandardMaterial color="#2D7DD2" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
