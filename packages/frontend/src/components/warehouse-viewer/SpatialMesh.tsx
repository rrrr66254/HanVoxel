import { useState, useRef, useCallback } from 'react';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import type { SpatialObject } from '../../types/spatial';
import { RackModel } from './RackModel';
import { PalletModel } from './PalletModel';
import { ContainerModel } from './ContainerModel';
import { AisleModel } from './AisleModel';
import { FloorTileModel } from './FloorTileModel';
import { WallPanelModel } from './WallPanelModel';
import { DoorModel } from './DoorModel';
import type { DoorStyle } from './DoorModel';
import { ProductBoxModel } from './ProductBoxModel';
import { ResizeHandles } from './ResizeHandles';

type EditLayerMode = 'structure' | 'objects';

interface SpatialMeshProps {
  object: SpatialObject;
  onSelect?: (object: SpatialObject) => void;
  onDoubleClick?: (object: SpatialObject) => void;
  onContextMenu?: (object: SpatialObject, e: { stopPropagation: () => void; clientX: number; clientY: number }) => void;
  isSelected?: boolean;
  editLayer?: EditLayerMode;
  onResize?: (object: SpatialObject) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

// raycast 차단용 no-op 함수 — 비활성 레이어 오브젝트의 클릭/호버 이벤트를 완전 차단
const NOOP_RAYCAST = () => {};

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
export function SpatialMesh({ object, onSelect, onDoubleClick, onContextMenu, isSelected, editLayer = 'objects', onResize, onResizeStart, onResizeEnd }: SpatialMeshProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  // 호버 디바운스 — 바닥/벽 같은 얇은 오브젝트에서 깜빡임 방지
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const stableHover = useCallback((enter: boolean) => {
    clearTimeout(hoverTimerRef.current);
    if (enter) {
      setHovered(true);
    } else {
      // pointerOut 시 약간 지연하여 바로 사라지지 않도록
      hoverTimerRef.current = setTimeout(() => setHovered(false), 80);
    }
  }, []);

  if (!object.visible) return null;

  const typeName = object.type.name;
  const meta = object.metadata as Record<string, unknown> | null;

  // 편집 레이어에 따라 인터랙션 가능 여부 결정
  // 컨테이너는 ZONE 타입이지만 오브젝트로 취급
  const isContainerObj = !!(meta?.type && typeof meta.type === 'string' && (
    (meta.type as string).includes('FT') || (meta.type as string).includes('REEFER') ||
    (meta.type as string).includes('TANK') || (meta.type as string).includes('FLAT_RACK') || (meta.type as string).includes('OPEN_TOP')
  ));
  // 구조물: 바닥, 벽, 출입문, 통로, 구역/안전구역 (컨테이너 제외)
  const isStructure = !isContainerObj && (
    typeName === 'FLOOR' || typeName === 'WALL' ||
    typeName === 'AISLE' || typeName === 'ZONE' || typeName === 'SAFETY_ZONE' ||
    !!(meta?.floorStyle) || !!(meta?.wallStyle) || !!(meta?.doorStyle) || !!(meta?.aisleType)
  );
  const isInteractable = editLayer === 'structure' ? isStructure : !isStructure;

  // 색상 결정
  const baseColor =
    object.color ??
    STATUS_COLORS[object.status] ??
    TYPE_COLORS[typeName] ??
    '#6b7280';

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!isInteractable) return;
    onSelect?.(object);
  };

  const handleDoubleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!isInteractable) return;
    onDoubleClick?.(object);
  };

  // R3F 이벤트에서 nativeEvent의 clientX/clientY 추출
  const handleContextMenu = (e: { stopPropagation: () => void; nativeEvent?: MouseEvent }) => {
    e.stopPropagation();
    if (!isInteractable) return;
    const native = e.nativeEvent;
    onContextMenu?.(object, {
      stopPropagation: () => e.stopPropagation(),
      clientX: native?.clientX ?? 0,
      clientY: native?.clientY ?? 0,
    });
  };

  // 랙인지 확인 (메타데이터에 levels가 있거나 타입이 RACK)
  const isRack = typeName === 'RACK' && meta?.levels;
  // 컨테이너인지 확인
  const isContainer = isContainerObj;

  // 랙 모델 렌더링
  if (isRack) {
    if (!isInteractable) return (
      <group position={[object.positionX, object.positionY - object.scaleY / 2, object.positionZ]} rotation={[object.rotationX, object.rotationY, object.rotationZ]} raycast={NOOP_RAYCAST}>
        <RackModel width={object.scaleX} height={object.scaleY} depth={object.scaleZ} levels={(meta?.levels as number) ?? 3} levelHeight={(meta?.levelHeight as number) ?? 1.5} levelHeights={meta?.levelHeights as number[] | undefined} />
      </group>
    );

    const levels = (meta?.levels as number) ?? 3;
    const levelHeight = (meta?.levelHeight as number) ?? 1.5;
    const levelHeights = meta?.levelHeights as number[] | undefined;

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
          levelHeights={levelHeights}
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
    if (!isInteractable) return (
      <group position={[object.positionX, object.positionY - object.scaleY / 2, object.positionZ]} rotation={[object.rotationX, object.rotationY, object.rotationZ]} raycast={NOOP_RAYCAST}>
        <ContainerModel width={object.scaleX} depth={object.scaleZ} height={object.scaleY} isReefer={!!(meta?.type && typeof meta.type === 'string' && meta.type.includes('REEFER'))} containerColor={object.color ?? undefined} />
      </group>
    );

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
          isReefer={!!(meta?.type && typeof meta.type === 'string' && meta.type.includes('REEFER'))}
          containerColor={object.color ?? undefined}
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

  // 팔레트/적재 팔레트 모델 렌더링
  const itemType = meta?.itemType as string | undefined;
  const isPallet = (typeName === 'BIN' && itemType === 'pallet') ||
    object.code?.includes('PALLET') || object.code?.includes('T11') || object.code?.includes('T12') || object.code?.includes('T08');
  const isLoadedPallet = object.code?.includes('LOADED');

  if (isPallet || isLoadedPallet) {
    return (
      <group
        ref={groupRef}
        position={[object.positionX, object.positionY - object.scaleY / 2, object.positionZ]}
        rotation={[object.rotationX, object.rotationY, object.rotationZ]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        // @ts-expect-error castShadow on group propagates to children
        castShadow
      >
        {/* 팔레트 */}
        <PalletModel
          width={object.scaleX}
          depth={object.scaleZ}
          height={isLoadedPallet ? 0.144 : object.scaleY}
          isSelected={isSelected}
          isHovered={hovered}
        />
        {/* 적재 팔레트인 경우 화물 박스 표시 */}
        {isLoadedPallet && (
          <group position={[0, 0.144, 0]}>
            <ProductBoxModel
              width={object.scaleX * 0.9}
              depth={object.scaleZ * 0.9}
              height={object.scaleY - 0.144}
              color={object.color ?? '#8B7B60'}
              isSelected={isSelected}
              isHovered={hovered}
            />
          </group>
        )}
        {hovered && (
          <Html distanceFactor={15} position={[0, object.scaleY + 0.2, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: '#161B22', border: '1px solid #30363D', borderRadius: 8,
              padding: '6px 10px', whiteSpace: 'nowrap', fontSize: 11,
              color: '#E6EDF3', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <span style={{ fontWeight: 700 }}>{object.name}</span>
              <span style={{ color: '#8B949E', marginLeft: 6 }}>{isLoadedPallet ? '적재 팔레트' : '팔레트'}</span>
              <div style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>
                {object.scaleX}m × {object.scaleZ}m × {object.scaleY}m
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  }

  // 제품 박스 모델 렌더링
  const isProductBox = (typeName === 'BIN' && itemType === 'box') ||
    object.code?.includes('BOX_');

  if (isProductBox) {
    return (
      <group
        ref={groupRef}
        position={[object.positionX, object.positionY - object.scaleY / 2, object.positionZ]}
        rotation={[object.rotationX, object.rotationY, object.rotationZ]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        // @ts-expect-error castShadow on group propagates to children
        castShadow
      >
        <ProductBoxModel
          width={object.scaleX}
          depth={object.scaleZ}
          height={object.scaleY}
          color={object.color ?? '#6b7280'}
          isSelected={isSelected}
          isHovered={hovered}
        />
        {hovered && (
          <Html distanceFactor={15} position={[0, object.scaleY + 0.2, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: '#161B22', border: '1px solid #30363D', borderRadius: 8,
              padding: '6px 10px', whiteSpace: 'nowrap', fontSize: 11,
              color: '#E6EDF3', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <span style={{ fontWeight: 700 }}>{object.name}</span>
              <span style={{ color: '#8B949E', marginLeft: 6 }}>제품 박스</span>
              <div style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>
                {object.scaleX}m × {object.scaleZ}m × {object.scaleY}m
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  }

  // 통로(AISLE) 모델 렌더링
  const isAisle = typeName === 'AISLE';
  if (isAisle) {
    const aisleColor = baseColor;
    const isEmergency = (meta?.aisleType as string) === 'EMERGENCY' || object.code?.includes('EMERGENCY');

    return (
      <group
        ref={groupRef}
        position={[object.positionX, object.positionY, object.positionZ]}
        rotation={[object.rotationX, object.rotationY, object.rotationZ]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerOver={(e) => { e.stopPropagation(); if (isInteractable) { stableHover(true); document.body.style.cursor = 'pointer'; } }}
        onPointerOut={() => { stableHover(false); if (!isInteractable) return; document.body.style.cursor = 'default'; }}
        raycast={isInteractable ? undefined : NOOP_RAYCAST}
      >
        <AisleModel
          width={object.scaleX}
          length={object.scaleZ}
          color={aisleColor}
          isSelected={isSelected}
          isHovered={hovered && isInteractable}
          isEmergency={isEmergency}
        />
        {/* 리사이즈 핸들 — 선택된 통로만 표시 */}
        {isSelected && isInteractable && onResize && (
          <ResizeHandles object={object} onResize={onResize} mode="floor" onResizeStart={onResizeStart} onResizeEnd={onResizeEnd} />
        )}
        {hovered && isInteractable && (
          <Html distanceFactor={15} position={[0, 0.5, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: '#161B22', border: '1px solid #30363D', borderRadius: 8,
              padding: '6px 10px', whiteSpace: 'nowrap', fontSize: 11,
              color: '#E6EDF3', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <span style={{ fontWeight: 700 }}>{object.name}</span>
              <span style={{ color: '#8B949E', marginLeft: 6 }}>({object.type.label})</span>
              <div style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>
                너비 {object.scaleX}m × 길이 {object.scaleZ}m
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  }

  // 바닥(FLOOR) 모델 렌더링
  const isFloor = typeName === 'FLOOR' || (meta?.floorStyle && typeof meta.floorStyle === 'string');
  if (isFloor) {
    const floorStyle = (meta?.floorStyle as string) ?? 'EPOXY_GRAY';

    return (
      <group
        ref={groupRef}
        position={[object.positionX, object.positionY, object.positionZ]}
        rotation={[object.rotationX, object.rotationY, object.rotationZ]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerOver={(e) => { e.stopPropagation(); if (isInteractable) { stableHover(true); document.body.style.cursor = 'pointer'; } }}
        onPointerOut={() => { stableHover(false); if (!isInteractable) return; document.body.style.cursor = 'default'; }}
        raycast={isInteractable ? undefined : NOOP_RAYCAST}
      >
        <FloorTileModel
          width={object.scaleX}
          depth={object.scaleZ}
          style={floorStyle as 'EPOXY_GRAY' | 'EPOXY_GREEN' | 'CONCRETE' | 'ANTI_SLIP' | 'MARKING'}
          isSelected={isSelected}
          isHovered={hovered && isInteractable}
        />
        {/* 리사이즈 핸들 — 선택된 바닥만 표시 */}
        {isSelected && isInteractable && onResize && (
          <ResizeHandles object={object} onResize={onResize} mode="floor" onResizeStart={onResizeStart} onResizeEnd={onResizeEnd} />
        )}
        {hovered && isInteractable && (
          <Html distanceFactor={15} position={[0, 0.5, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: '#161B22', border: '1px solid #30363D', borderRadius: 8,
              padding: '6px 10px', whiteSpace: 'nowrap', fontSize: 11,
              color: '#E6EDF3', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <span style={{ fontWeight: 700 }}>{object.name}</span>
              <span style={{ color: '#8B949E', marginLeft: 6 }}>바닥</span>
              <div style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>
                {object.scaleX}m × {object.scaleZ}m
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  }

  // 벽(WALL) 모델 렌더링
  const isWall = meta?.wallStyle && typeof meta.wallStyle === 'string';
  if (isWall) {
    const wallStyle = meta.wallStyle as string;

    return (
      <group
        ref={groupRef}
        position={[object.positionX, object.positionY, object.positionZ]}
        rotation={[object.rotationX, object.rotationY, object.rotationZ]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerOver={(e) => { e.stopPropagation(); if (isInteractable) { stableHover(true); document.body.style.cursor = 'pointer'; } }}
        onPointerOut={() => { stableHover(false); if (!isInteractable) return; document.body.style.cursor = 'default'; }}
        raycast={isInteractable ? undefined : NOOP_RAYCAST}
        // @ts-expect-error castShadow on group propagates to children
        castShadow
      >
        <WallPanelModel
          width={object.scaleX}
          height={object.scaleY}
          thickness={object.scaleZ}
          style={wallStyle as 'SANDWICH_PANEL' | 'CONCRETE_WALL' | 'METAL_CORRUGATED' | 'BRICK'}
          isSelected={isSelected}
          isHovered={hovered && isInteractable}
        />
        {/* 리사이즈 핸들 — 선택된 벽만 표시 */}
        {isSelected && isInteractable && onResize && (
          <ResizeHandles object={object} onResize={onResize} mode="wall" onResizeStart={onResizeStart} onResizeEnd={onResizeEnd} />
        )}
        {hovered && isInteractable && (
          <Html distanceFactor={15} position={[0, object.scaleY / 2 + 0.3, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: '#161B22', border: '1px solid #30363D', borderRadius: 8,
              padding: '6px 10px', whiteSpace: 'nowrap', fontSize: 11,
              color: '#E6EDF3', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <span style={{ fontWeight: 700 }}>{object.name}</span>
              <span style={{ color: '#8B949E', marginLeft: 6 }}>벽</span>
              <div style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>
                {object.scaleX}m × {object.scaleY}m
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  }

  // 출입문(DOOR) 모델 렌더링
  const isDoor = meta?.doorStyle && typeof meta.doorStyle === 'string';
  if (isDoor) {
    const doorStyle = meta.doorStyle as DoorStyle;

    return (
      <group
        ref={groupRef}
        position={[object.positionX, object.positionY, object.positionZ]}
        rotation={[object.rotationX, object.rotationY, object.rotationZ]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerOver={(e) => { e.stopPropagation(); if (isInteractable) { stableHover(true); document.body.style.cursor = 'pointer'; } }}
        onPointerOut={() => { stableHover(false); if (!isInteractable) return; document.body.style.cursor = 'default'; }}
        raycast={isInteractable ? undefined : NOOP_RAYCAST}
        // @ts-expect-error castShadow on group propagates to children
        castShadow
      >
        <DoorModel
          width={object.scaleX}
          height={object.scaleY}
          thickness={object.scaleZ}
          style={doorStyle}
          isSelected={isSelected}
          isHovered={hovered && isInteractable}
        />
        {hovered && isInteractable && (
          <Html distanceFactor={15} position={[0, object.scaleY + 0.3, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: '#161B22', border: '1px solid #30363D', borderRadius: 8,
              padding: '6px 10px', whiteSpace: 'nowrap', fontSize: 11,
              color: '#E6EDF3', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <span style={{ fontWeight: 700 }}>{object.name}</span>
              <span style={{ color: '#8B949E', marginLeft: 6 }}>출입문</span>
              <div style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>
                {object.scaleX}m × {object.scaleY}m
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  }

  // 기본 메시 렌더링 (구역, 작업대 등)
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
    <group>
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
          if (isInteractable) { stableHover(true); document.body.style.cursor = 'pointer'; }
        }}
        onPointerOut={() => {
          stableHover(false);
          if (!isInteractable) return;
          document.body.style.cursor = 'default';
        }}
        raycast={isInteractable ? undefined : NOOP_RAYCAST}
        castShadow={isWorkstation}
        receiveShadow
      >
        {renderGeometry()}
        <meshStandardMaterial
          color={isSelected ? '#2D7DD2' : (hovered && isInteractable) ? '#5BA3E0' : baseColor}
          transparent={object.opacity < 1 || isZone}
          opacity={isZone ? 0.15 : object.opacity}
          wireframe={false}
          metalness={isWorkstation ? 0.4 : 0.1}
          roughness={isWorkstation ? 0.6 : 0.8}
        />

        {/* 호버 시 라벨 표시 */}
        {hovered && isInteractable && (
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
              {isZone && (
                <div style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>
                  {object.scaleX}m × {object.scaleZ}m
                </div>
              )}
            </div>
          </Html>
        )}
      </mesh>
      {/* 리사이즈 핸들 — 선택된 구역만 표시 */}
      {isZone && isSelected && isInteractable && onResize && (
        <group position={[object.positionX, object.positionY, object.positionZ]}>
          <ResizeHandles object={object} onResize={onResize} mode="floor" />
        </group>
      )}
    </group>
  );
}
