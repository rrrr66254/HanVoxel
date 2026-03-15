import { useMemo } from 'react';
import * as THREE from 'three';

interface AisleModelProps {
  width: number;   // 통로 너비 (m)
  length: number;  // 통로 길이 (m)
  color: string;
  isSelected?: boolean;
  isHovered?: boolean;
  isEmergency?: boolean; // 비상구 통로 여부
}

/**
 * 통로 모델 — 바닥 마킹 스타일
 * - 반투명 컬러 스트립
 * - 양쪽 차선 경계선 (대시)
 * - 중앙 점선 (넓은 통로)
 * - 비상구 통로는 빨강 + 대각선 빗금
 */
export function AisleModel({ width, length, color, isSelected, isHovered, isEmergency }: AisleModelProps) {
  const displayColor = isSelected ? '#2D7DD2' : isHovered ? '#5BA3E0' : color;

  // 차선 경계선 (양쪽 대시 라인)
  const borderLines = useMemo(() => {
    const dashLength = 0.4;
    const gapLength = 0.3;
    const halfW = width / 2;
    const halfL = length / 2;
    const lineY = 0.005;
    const points: THREE.Vector3[] = [];

    // 양쪽 경계선
    for (const side of [-1, 1]) {
      let pos = -halfL;
      while (pos < halfL) {
        const end = Math.min(pos + dashLength, halfL);
        points.push(
          new THREE.Vector3(side * halfW, lineY, pos),
          new THREE.Vector3(side * halfW, lineY, end),
        );
        pos += dashLength + gapLength;
      }
    }

    // 중앙 점선 (너비 2m 이상)
    if (width >= 2.0) {
      let pos = -halfL;
      while (pos < halfL) {
        const end = Math.min(pos + dashLength * 0.6, halfL);
        points.push(
          new THREE.Vector3(0, lineY, pos),
          new THREE.Vector3(0, lineY, end),
        );
        pos += dashLength * 0.6 + gapLength * 0.8;
      }
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [width, length]);

  // 비상구 대각선 빗금 패턴
  const hazardLines = useMemo(() => {
    if (!isEmergency) return null;
    const halfW = width / 2;
    const halfL = length / 2;
    const lineY = 0.006;
    const points: THREE.Vector3[] = [];
    const step = 0.6;

    for (let z = -halfL; z < halfL; z += step) {
      points.push(
        new THREE.Vector3(-halfW * 0.9, lineY, z),
        new THREE.Vector3(-halfW * 0.6, lineY, z + step * 0.5),
      );
      points.push(
        new THREE.Vector3(halfW * 0.9, lineY, z),
        new THREE.Vector3(halfW * 0.6, lineY, z + step * 0.5),
      );
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [width, length, isEmergency]);

  // 방향 화살표
  const arrowPoints = useMemo(() => {
    const halfL = length / 2;
    const arrowY = 0.006;
    const arrowSize = Math.min(width * 0.3, 0.4);
    const points = [
      // 축
      new THREE.Vector3(0, arrowY, halfL * 0.3),
      new THREE.Vector3(0, arrowY, -halfL * 0.3),
      // 화살촉
      new THREE.Vector3(0, arrowY, -halfL * 0.3),
      new THREE.Vector3(-arrowSize, arrowY, -halfL * 0.3 + arrowSize),
      new THREE.Vector3(0, arrowY, -halfL * 0.3),
      new THREE.Vector3(arrowSize, arrowY, -halfL * 0.3 + arrowSize),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [width, length]);

  const borderColor = isEmergency ? '#FBBF24' : '#CBD5E1';

  return (
    <group>
      {/* 바닥 컬러 스트립 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color={displayColor}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 차선 경계선 */}
      <lineSegments geometry={borderLines}>
        <lineBasicMaterial color={borderColor} opacity={0.8} transparent linewidth={2} />
      </lineSegments>

      {/* 방향 화살표 */}
      <lineSegments geometry={arrowPoints}>
        <lineBasicMaterial color={borderColor} opacity={0.5} transparent />
      </lineSegments>

      {/* 비상구 빗금 패턴 */}
      {hazardLines && (
        <lineSegments geometry={hazardLines}>
          <lineBasicMaterial color="#FBBF24" opacity={0.6} transparent />
        </lineSegments>
      )}
    </group>
  );
}
