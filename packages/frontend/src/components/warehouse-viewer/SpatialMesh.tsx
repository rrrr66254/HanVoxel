import { useState, useRef } from 'react';
import { Html } from '@react-three/drei';
import type { Mesh } from 'three';
import type { SpatialObject } from '../../types/spatial';

interface SpatialMeshProps {
  object: SpatialObject;
  onSelect?: (object: SpatialObject) => void;
  isSelected?: boolean;
}

// 타입별 기본 색상
const TYPE_COLORS: Record<string, string> = {
  BUILDING: '#64748b',
  FLOOR: '#94a3b8',
  ZONE: '#3b82f6',
  AISLE: '#6b7280',
  RACK: '#f59e0b',
  BIN: '#10b981',
  WORKSTATION: '#8b5cf6',
  MACHINE: '#ef4444',
  SAFETY_ZONE: '#f43f5e',
};

// 상태별 색상 오버라이드
const STATUS_COLORS: Record<string, string> = {
  MAINTENANCE: '#f97316',
  INACTIVE: '#9ca3af',
};

/**
 * 개별 공간 객체를 3D 메시로 렌더링하는 컴포넌트
 */
export function SpatialMesh({ object, onSelect, isSelected }: SpatialMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  if (!object.visible) return null;

  // 색상 결정: 사용자 지정 > 상태별 > 타입별 > 기본값
  const baseColor =
    object.color ??
    STATUS_COLORS[object.status] ??
    TYPE_COLORS[object.type.name] ??
    '#6b7280';

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect?.(object);
  };

  // 메시 타입에 따른 geometry 렌더링
  const renderGeometry = () => {
    switch (object.meshType ?? 'box') {
      case 'cylinder':
        return <cylinderGeometry args={[0.5, 0.5, 1, 16]} />;
      case 'sphere':
        return <sphereGeometry args={[0.5, 16, 16]} />;
      case 'plane':
        return <planeGeometry args={[1, 1]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={[object.positionX, object.positionY, object.positionZ]}
      rotation={[object.rotationX, object.rotationY, object.rotationZ]}
      scale={[object.scaleX, object.scaleY, object.scaleZ]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {renderGeometry()}
      <meshStandardMaterial
        color={isSelected ? '#2563eb' : hovered ? '#60a5fa' : baseColor}
        transparent={object.opacity < 1}
        opacity={object.opacity}
        wireframe={object.type.name === 'ZONE' || object.type.name === 'SAFETY_ZONE'}
      />

      {/* 호버 시 라벨 표시 */}
      {hovered && (
        <Html distanceFactor={15} style={{ pointerEvents: 'none' }}>
          <div className="rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white">
            <span className="font-bold">{object.name}</span>
            <span className="ml-1 text-gray-400">({object.type.label})</span>
          </div>
        </Html>
      )}
    </mesh>
  );
}
