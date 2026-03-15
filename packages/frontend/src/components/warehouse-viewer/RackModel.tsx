import { useMemo } from 'react';
import * as THREE from 'three';

interface RackModelProps {
  width: number;   // 랙 전체 너비 (m)
  height: number;  // 랙 전체 높이 (m)
  depth: number;   // 랙 전체 깊이 (m)
  levels: number;  // 단수
  levelHeight: number; // 단간 높이 (m)
  isSelected?: boolean;
  isHovered?: boolean;
}

// 랙 프레임 색상 — 철재 회색
const FRAME_COLOR = '#5C6370';
// 수평 빔 색상 — 산업용 오렌지
const BEAM_COLOR = '#FF8C00';
// 선반판 색상 — 반투명 회색
const SHELF_COLOR = '#8892A0';
// 대각 브레이싱 색상
const BRACE_COLOR = '#4A5060';

// 프레임 두께
const FRAME_THICKNESS = 0.05;
// 빔 높이/두께
const BEAM_HEIGHT = 0.06;
const BEAM_DEPTH = 0.04;

/**
 * 실제 팔레트 랙 구조체 렌더링
 * - 수직 프레임 4개 (모서리)
 * - 수평 빔 단별 2개씩
 * - 대각 브레이싱 X자 지지대
 * - 선반판 (반투명 메시)
 */
export function RackModel({
  width,
  height,
  depth,
  levels,
  levelHeight,
  isSelected = false,
  isHovered = false,
}: RackModelProps) {
  // 선반판 geometry 캐싱
  const shelfGeo = useMemo(
    () => new THREE.BoxGeometry(width - FRAME_THICKNESS * 2, 0.02, depth - FRAME_THICKNESS * 2),
    [width, depth],
  );

  // 수직 프레임 geometry
  const vertFrameGeo = useMemo(
    () => new THREE.BoxGeometry(FRAME_THICKNESS, height, FRAME_THICKNESS),
    [height],
  );

  // 수평 빔 geometry (전후)
  const hBeamFrontGeo = useMemo(
    () => new THREE.BoxGeometry(width - FRAME_THICKNESS, BEAM_HEIGHT, BEAM_DEPTH),
    [width],
  );

  // 수평 빔 geometry (좌우 — 깊이 방향)
  const hBeamSideGeo = useMemo(
    () => new THREE.BoxGeometry(BEAM_DEPTH, BEAM_HEIGHT, depth - FRAME_THICKNESS),
    [depth],
  );

  // 대각 브레이싱 라인 생성
  const braceLines = useMemo(() => {
    const lines: THREE.BufferGeometry[] = [];
    const halfW = width / 2 - FRAME_THICKNESS / 2;
    const halfD = depth / 2 - FRAME_THICKNESS / 2;

    // 앞면, 뒷면에 X자 브레이싱 (각 단마다)
    for (let i = 0; i < levels; i++) {
      const y0 = i * levelHeight;
      const y1 = (i + 1) * levelHeight;

      // 앞면 X자
      const frontZ = halfD;
      const fGeo1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfW, y0, frontZ),
        new THREE.Vector3(halfW, y1, frontZ),
      ]);
      const fGeo2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(halfW, y0, frontZ),
        new THREE.Vector3(-halfW, y1, frontZ),
      ]);
      lines.push(fGeo1, fGeo2);

      // 뒷면 X자
      const backZ = -halfD;
      const bGeo1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfW, y0, backZ),
        new THREE.Vector3(halfW, y1, backZ),
      ]);
      const bGeo2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(halfW, y0, backZ),
        new THREE.Vector3(-halfW, y1, backZ),
      ]);
      lines.push(bGeo1, bGeo2);
    }
    return lines;
  }, [width, depth, levels, levelHeight]);

  // 프레임 머티리얼
  const frameMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isSelected ? '#2D7DD2' : isHovered ? '#7EB8E0' : FRAME_COLOR,
      metalness: 0.8,
      roughness: 0.3,
    }),
    [isSelected, isHovered],
  );

  const beamMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isSelected ? '#5BA3E0' : BEAM_COLOR,
      metalness: 0.6,
      roughness: 0.4,
    }),
    [isSelected],
  );

  const shelfMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isSelected ? '#4A90D9' : SHELF_COLOR,
      transparent: true,
      opacity: 0.4,
      metalness: 0.3,
      roughness: 0.5,
      side: THREE.DoubleSide,
    }),
    [isSelected],
  );

  const braceMat = useMemo(
    () => new THREE.LineBasicMaterial({
      color: isSelected ? '#5BA3E0' : BRACE_COLOR,
      linewidth: 1,
    }),
    [isSelected],
  );

  const halfW = width / 2 - FRAME_THICKNESS / 2;
  const halfD = depth / 2 - FRAME_THICKNESS / 2;

  return (
    <group>
      {/* 수직 프레임 4개 (모서리) */}
      <mesh geometry={vertFrameGeo} material={frameMat} position={[-halfW, height / 2, -halfD]} castShadow receiveShadow />
      <mesh geometry={vertFrameGeo} material={frameMat} position={[halfW, height / 2, -halfD]} castShadow receiveShadow />
      <mesh geometry={vertFrameGeo} material={frameMat} position={[-halfW, height / 2, halfD]} castShadow receiveShadow />
      <mesh geometry={vertFrameGeo} material={frameMat} position={[halfW, height / 2, halfD]} castShadow receiveShadow />

      {/* 단별 수평 빔 + 선반판 */}
      {Array.from({ length: levels + 1 }, (_, i) => {
        const y = i * levelHeight;
        return (
          <group key={`level-${i}`}>
            {/* 앞면 수평 빔 */}
            <mesh geometry={hBeamFrontGeo} material={beamMat} position={[0, y, halfD]} castShadow />
            {/* 뒷면 수평 빔 */}
            <mesh geometry={hBeamFrontGeo} material={beamMat} position={[0, y, -halfD]} castShadow />
            {/* 좌측 수평 빔 */}
            <mesh geometry={hBeamSideGeo} material={beamMat} position={[-halfW, y, 0]} castShadow />
            {/* 우측 수평 빔 */}
            <mesh geometry={hBeamSideGeo} material={beamMat} position={[halfW, y, 0]} castShadow />
            {/* 선반판 (바닥 제외, 1단부터) */}
            {i > 0 && (
              <mesh geometry={shelfGeo} material={shelfMat} position={[0, y + 0.01, 0]} castShadow receiveShadow />
            )}
          </group>
        );
      })}

      {/* 대각 브레이싱 */}
      {braceLines.map((geo, idx) => (
        <lineSegments key={`brace-${idx}`} geometry={geo} material={braceMat} />
      ))}
    </group>
  );
}
