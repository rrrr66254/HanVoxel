import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

// 창고 외벽 크기 (WarehouseScene 기준)
const WALL_W = 60;
const WALL_D = 45;
const WALL_CENTER_X = 15;
const WALL_CENTER_Z = 20;

// 타일 설정
const TILE_SIZE = 4;       // 4×4m 타일
const GROUT_WIDTH = 0.03;  // 줄눈 두께 (미터)
const CANVAS_RES = 512;    // 텍스처 해상도

/**
 * Canvas 기반 에폭시 타일 텍스처 생성
 * - 4×4m 타일 패턴
 * - 줄눈 색상: #1A2030
 * - 타일 색상: #1A2332 (기존 바닥색 유지)
 */
function createEpoxyTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_RES;
  canvas.height = CANVAS_RES;
  const ctx = canvas.getContext('2d')!;

  // 타일 배경
  ctx.fillStyle = '#1A2332';
  ctx.fillRect(0, 0, CANVAS_RES, CANVAS_RES);

  // 줄눈 (grout lines)
  const groutPx = Math.max(2, Math.round(CANVAS_RES * GROUT_WIDTH / TILE_SIZE));
  ctx.strokeStyle = '#1A2030';
  ctx.lineWidth = groutPx;

  // 수직선
  const tileCountX = Math.ceil(CANVAS_RES / (CANVAS_RES / 4));
  for (let i = 0; i <= tileCountX; i++) {
    const x = (CANVAS_RES / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_RES);
    ctx.stroke();
  }

  // 수평선
  for (let i = 0; i <= tileCountX; i++) {
    const y = (CANVAS_RES / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_RES, y);
    ctx.stroke();
  }

  // 약간의 노이즈 추가 (자연스러운 에폭시 질감)
  const imageData = ctx.getImageData(0, 0, CANVAS_RES, CANVAS_RES);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 6;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // 전체 바닥 100m에서 4m 타일 = 25번 반복
  texture.repeat.set(25, 25);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * 안전 경계선 (벽 안쪽 1m 노란 선)
 */
function SafetyBoundary() {
  const lines = useMemo(() => {
    const inset = 1; // 벽에서 1m 안쪽
    const y = 0.02;  // 바닥 약간 위
    const halfW = WALL_W / 2;
    const halfD = WALL_D / 2;
    const cx = WALL_CENTER_X;
    const cz = WALL_CENTER_Z;

    // 4개 직선 세그먼트 (안전 경계)
    const segments = [
      // 앞쪽
      [cx - halfW + inset, y, cz - halfD + inset, cx + halfW - inset, y, cz - halfD + inset],
      // 뒤쪽
      [cx - halfW + inset, y, cz + halfD - inset, cx + halfW - inset, y, cz + halfD - inset],
      // 좌측
      [cx - halfW + inset, y, cz - halfD + inset, cx - halfW + inset, y, cz + halfD - inset],
      // 우측
      [cx + halfW - inset, y, cz - halfD + inset, cx + halfW - inset, y, cz + halfD - inset],
    ];

    return segments.map((seg) => {
      const points = [
        new THREE.Vector3(seg[0], seg[1], seg[2]),
        new THREE.Vector3(seg[3], seg[4], seg[5]),
      ];
      return new THREE.BufferGeometry().setFromPoints(points);
    });
  }, []);

  return (
    <>
      {lines.map((geo, i) => (
        <line key={`safety-line-${i}`} geometry={geo}>
          <lineBasicMaterial color="#F0B429" opacity={0.6} transparent linewidth={2} />
        </line>
      ))}
      {/* 코너 마커 (대각선 줄무늬 영역) */}
      {[
        [WALL_CENTER_X - WALL_W / 2 + 0.5, WALL_CENTER_Z - WALL_D / 2 + 0.5],
        [WALL_CENTER_X + WALL_W / 2 - 0.5, WALL_CENTER_Z - WALL_D / 2 + 0.5],
        [WALL_CENTER_X - WALL_W / 2 + 0.5, WALL_CENTER_Z + WALL_D / 2 - 0.5],
        [WALL_CENTER_X + WALL_W / 2 - 0.5, WALL_CENTER_Z + WALL_D / 2 - 0.5],
      ].map(([x, z], i) => (
        <mesh key={`corner-${i}`} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 16]} />
          <meshStandardMaterial color="#F0B429" emissive="#F0B429" emissiveIntensity={0.2} transparent opacity={0.5} />
        </mesh>
      ))}
    </>
  );
}

/**
 * 창고 이름 라벨 (바닥에 표시)
 */
function WarehouseNameLabel({ name }: { name: string }) {
  return (
    <Html
      position={[WALL_CENTER_X, 0.05, WALL_CENTER_Z - WALL_D / 2 + 3]}
      distanceFactor={40}
      style={{ pointerEvents: 'none' }}
      transform
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <div style={{
        fontSize: 24,
        fontWeight: 800,
        color: 'rgba(45,125,210,0.15)',
        letterSpacing: '8px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        fontFamily: 'monospace',
      }}>
        {name}
      </div>
    </Html>
  );
}

/**
 * 에폭시 바닥 + 안전선 + 이름 라벨 통합 컴포넌트
 */
export function EpoxyFloor({ warehouseName = 'HANVOXEL' }: { warehouseName?: string }) {
  const texture = useMemo(() => createEpoxyTileTexture(), []);

  return (
    <>
      {/* 에폭시 타일 바닥 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[WALL_CENTER_X, -0.01, WALL_CENTER_Z]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.15}
          roughness={0.7}
        />
      </mesh>

      {/* 안전 경계선 */}
      <SafetyBoundary />

      {/* 창고 이름 라벨 */}
      <WarehouseNameLabel name={warehouseName} />
    </>
  );
}
