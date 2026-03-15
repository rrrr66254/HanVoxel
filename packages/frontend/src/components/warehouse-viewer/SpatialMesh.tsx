import { useState, useRef } from 'react';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import type { SpatialObject } from '../../types/spatial';
import { RackModel } from './RackModel';
import { PalletModel } from './PalletModel';
import { ContainerModel } from './ContainerModel';

interface SpatialMeshProps {
  object: SpatialObject;
  onSelect?: (object: SpatialObject) => void;
  onDoubleClick?: (object: SpatialObject) => void;
  onContextMenu?: (object: SpatialObject, e: { stopPropagation: () => void; clientX: number; clientY: number }) => void;
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
 * 랙/팔레트/컨테이너는 실제 구조체 모델로 렌더링
 */
export function SpatialMesh({ object, onSelect, onDoubleClick, onContextMenu, isSelected }: SpatialMeshProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  if (!object.visible) return null;

  const typeName = object.type.name;
  const meta = object.metadata as Record<string, unknown> | null;

  // 색상 결정
  const baseColor =
    object.color ??
    STATUS_COLORS[object.status] ??
    TYPE_COLORS[typeName] ??
    '#6b7280';

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect?.(object);
  };

  const handleDoubleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onDoubleClick?.(object);
  };

  // R3F 이벤트에서 nativeEvent의 clientX/clientY 추출
  const handleContextMenu = (e: { stopPropagation: () => void; nativeEvent?: MouseEvent }) => {
    e.stopPropagation();
    const native = e.nativeEvent;
    onContextMenu?.(object, {
      stopPropagation: () => e.stopPropagation(),
      clientX: native?.clientX ?? 0,
      clientY: native?.clientY ?? 0,
    });
  };

  // 랙인지 확인 (메타데이터에 levels가 있거나 타입이 RACK)
  const isRack = typeName === 'RACK' && meta?.levels;
  // 컨테이너인지 확인 (메타데이터에 DRY 또는 REEFER 타입)
  const isContainer = meta?.type && typeof meta.type === 'string' && (
    meta.type.includes('FT') || meta.type.includes('REEFER')
  );

  // 랙 모델 렌더링
  if (isRack) {
    const levels = (meta?.levels as number) ?? 3;
    const levelHeight = (meta?.levelHeight as number) ?? 1.5;

    return (
      <group
        ref={groupRef}
        position={[object.positionX, object.positionY - object.scaleY / 2, object.positionZ]}
        rotation={[object.rotationX, object.rotationY, object.rotationZ]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        // @ts-expect-error castShadow on group propagates to children
        castShadow
      >
        <RackModel
          width={object.scaleX}
          height={object.scaleY}
          depth={object.scaleZ}
          levels={levels}
          levelHeight={levelHeight}
          isSelected={isSelected}
          isHovered={hovered}
        />
        {hovered && (
          <Html distanceFactor={15} position={[0, object.scaleY + 0.3, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: '#161B22',
              border: '1px solid #30363D',
              borderRadius: 8,
              padding: '6px 10px',
              whiteSpace: 'nowrap',
              fontSize: 11,
              color: '#E6EDF3',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <span style={{ fontWeight: 700 }}>{object.name}</span>
              <span style={{ color: '#8B949E', marginLeft: 6 }}>{object.type.label}</span>
              <div style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>
                {object.scaleX}m × {object.scaleY}m × {object.scaleZ}m · {levels}단
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  }

  // 컨테이너 모델 렌더링
  if (isContainer) {
    return (
      <group
        ref={groupRef}
        position={[object.positionX, object.positionY - object.scaleY / 2, object.positionZ]}
        rotation={[object.rotationX, object.rotationY, object.rotationZ]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        // @ts-expect-error castShadow on group propagates to children
        castShadow
      >
        <ContainerModel
          width={object.scaleX}
          depth={object.scaleZ}
          height={object.scaleY}
          isSelected={isSelected}
          isHovered={hovered}
        />
        {hovered && (
          <Html distanceFactor={20} position={[0, object.scaleY + 0.5, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: '#161B22',
              border: '1px solid #30363D',
              borderRadius: 8,
              padding: '6px 10px',
              whiteSpace: 'nowrap',
              fontSize: 11,
              color: '#E6EDF3',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <span style={{ fontWeight: 700 }}>{object.name}</span>
              <span style={{ color: '#8B949E', marginLeft: 6 }}>{String(meta?.type)}</span>
              <div style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>
                {meta?.cbm} CBM · 최대 {meta?.maxLoad} kg
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  }

  // 기본 메시 렌더링 (구역, 통로, 작업대 등)
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

  const isZone = typeName === 'ZONE' || typeName === 'SAFETY_ZONE';
  const isWorkstation = typeName === 'WORKSTATION';

  return (
    <mesh
      ref={groupRef as never}
      position={[object.positionX, object.positionY, object.positionZ]}
      rotation={[object.rotationX, object.rotationY, object.rotationZ]}
      scale={[object.scaleX, object.scaleY, object.scaleZ]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
      castShadow={isWorkstation}
      receiveShadow
    >
      {renderGeometry()}
      <meshStandardMaterial
        color={isSelected ? '#2D7DD2' : hovered ? '#5BA3E0' : baseColor}
        transparent={object.opacity < 1 || isZone}
        opacity={isZone ? 0.08 : object.opacity}
        wireframe={isZone}
        metalness={isWorkstation ? 0.4 : 0.1}
        roughness={isWorkstation ? 0.6 : 0.8}
      />

      {/* 호버 시 라벨 표시 */}
      {hovered && (
        <Html distanceFactor={15} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: '#161B22',
            border: '1px solid #30363D',
            borderRadius: 8,
            padding: '6px 10px',
            whiteSpace: 'nowrap',
            fontSize: 11,
            color: '#E6EDF3',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            <span style={{ fontWeight: 700 }}>{object.name}</span>
            <span style={{ color: '#8B949E', marginLeft: 6 }}>({object.type.label})</span>
          </div>
        </Html>
      )}
    </mesh>
  );
}
