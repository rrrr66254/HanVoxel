import { useRef, useMemo } from 'react';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { EpoxyFloor } from './FloorTexture';
import { SpatialMesh } from './SpatialMesh';
import { GhostMesh } from './GhostMesh';
import { BinOccupancyRenderer } from './BinPlacement';
import type { BinOccupancy } from './BinPlacement';
import { ZoneRenderer, ZoneDrawer } from './ZoneDrawing';
import type { ZoneConfig, ZoneType } from './ZoneDrawing';
import type { SpatialObject } from '../../types/spatial';
import type { SpatialPreset } from '../../types/preset';

// 창고 외벽 크기 (mock-warehouse 기준: 60m × 45m × 8m)
const WALL_W = 60;
const WALL_D = 45;
const WALL_H = 8;
const WALL_CENTER_X = 15;
const WALL_CENTER_Z = 20;

// 안전선 stripe 높이
const SAFETY_LINE_H = 0.15;

interface WarehouseSceneProps {
  objects: SpatialObject[];
  selectedId: string | null;
  onSelect: (object: SpatialObject) => void;
  onDoubleClick?: (object: SpatialObject) => void;
  onContextMenu?: (object: SpatialObject, e: { stopPropagation: () => void; clientX: number; clientY: number }) => void;
  placingPreset?: SpatialPreset | null;
  onPlace?: (position: [number, number, number]) => void;
  // Zone 시스템
  zones?: ZoneConfig[];
  drawingZoneType?: ZoneType | null;
  onZoneDrawComplete?: (zone: Omit<ZoneConfig, 'id' | 'name'>) => void;
  onZoneDrawCancel?: () => void;
  onSelectZone?: (zone: ZoneConfig) => void;
  // 편집 레이어
  editLayer?: 'structure' | 'objects';
  onResize?: (object: SpatialObject) => void;
  // 그리드 표시
  gridVisible?: boolean;
  // BIN 적재
  binOccupancy?: BinOccupancy[];
}

/**
 * 창고 3D 씬 — 전문 WMS 수준 렌더링
 * - 바닥: #1A2332 진한 네이비, roughness 0.8
 * - 격자: #2D7DD2 파란 격자선
 * - 외벽: #1E3A5F 진한 파란 철판, opacity 0.4, wireframe
 * - 천장: #0D1117, opacity 0.2
 * - 안전선: 노란 stripe
 * - 조명: 천장 PointLight 4개 (형광등 배치, 흰색 1.5)
 */
export function WarehouseScene({
  objects, selectedId, onSelect, onDoubleClick, onContextMenu, placingPreset, onPlace,
  zones = [], drawingZoneType, onZoneDrawComplete, onZoneDrawCancel, onSelectZone,
  editLayer = 'objects', onResize,
  gridVisible = true,
  binOccupancy = [],
}: WarehouseSceneProps) {
  const floorRef = useRef<THREE.Mesh>(null);

  // 안전선 stripe geometry (벽 상단 노란 라인)
  const safetyLineGeo = useMemo(() => {
    const lines: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [];
    const y = WALL_H - SAFETY_LINE_H / 2;
    // 앞벽
    lines.push({ pos: [WALL_CENTER_X, y, WALL_CENTER_Z - WALL_D / 2], size: [WALL_W, SAFETY_LINE_H, 0.05] });
    // 뒷벽
    lines.push({ pos: [WALL_CENTER_X, y, WALL_CENTER_Z + WALL_D / 2], size: [WALL_W, SAFETY_LINE_H, 0.05] });
    // 좌측
    lines.push({ pos: [WALL_CENTER_X - WALL_W / 2, y, WALL_CENTER_Z], size: [0.05, SAFETY_LINE_H, WALL_D] });
    // 우측
    lines.push({ pos: [WALL_CENTER_X + WALL_W / 2, y, WALL_CENTER_Z], size: [0.05, SAFETY_LINE_H, WALL_D] });
    return lines;
  }, []);

  return (
    <>
      {/* 안개 — FogExp2(0x0D1117, 0.015) */}
      <fogExp2 attach="fog" args={[0x0D1117, 0.012]} />

      {/* 환경광 */}
      <ambientLight intensity={0.3} color="#B0C4DE" />

      {/* 주 방향광 (태양) — 그림자 생성 */}
      <directionalLight
        position={[30, 40, 20]}
        intensity={0.6}
        color="#FFEEDD"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={120}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.001}
      />

      {/* 보조 방향광 (역광) */}
      <directionalLight
        position={[-20, 25, -15]}
        intensity={0.2}
        color="#B0C4DE"
      />

      {/* 천장 PointLight 4개 (창고 형광등 — 흰색, intensity 1.5, 격자형 배치) */}
      <pointLight position={[WALL_CENTER_X - 12, 7.5, WALL_CENTER_Z - 10]} intensity={1.5} color="#FFFFFF" distance={30} decay={2} castShadow />
      <pointLight position={[WALL_CENTER_X + 12, 7.5, WALL_CENTER_Z - 10]} intensity={1.5} color="#FFFFFF" distance={30} decay={2} />
      <pointLight position={[WALL_CENTER_X - 12, 7.5, WALL_CENTER_Z + 10]} intensity={1.5} color="#FFFFFF" distance={30} decay={2} />
      <pointLight position={[WALL_CENTER_X + 12, 7.5, WALL_CENTER_Z + 10]} intensity={1.5} color="#FFFFFF" distance={30} decay={2} />

      {/* 에폭시 타일 바닥 + 안전선 + 이름 라벨 */}
      <EpoxyFloor />

      {/* 격자 오버레이 (토글 가능) — #2D7DD2 파란 격자선 */}
      {gridVisible && <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1E3050"
        sectionSize={5}
        sectionThickness={1.0}
        sectionColor="#2D7DD2"
        fadeDistance={70}
        fadeStrength={1.5}
        position={[WALL_CENTER_X, 0.005, WALL_CENTER_Z]}
      />}

      {/* 공간 객체 렌더링 (벽/바닥은 mock-warehouse의 SpatialObject로 렌더링) */}
      {objects.map((obj) => (
        <SpatialMesh
          key={obj.id}
          object={obj}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          isSelected={obj.id === selectedId}
          editLayer={editLayer}
          onResize={onResize}
        />
      ))}

      {/* BIN 적재 오브젝트 */}
      {binOccupancy.length > 0 && (
        <BinOccupancyRenderer occupancy={binOccupancy} racks={objects} />
      )}

      {/* Zone 렌더링 */}
      {zones.length > 0 && (
        <ZoneRenderer zones={zones} onSelectZone={onSelectZone} />
      )}

      {/* Zone 드로잉 모드 */}
      {drawingZoneType && onZoneDrawComplete && onZoneDrawCancel && (
        <ZoneDrawer
          zoneType={drawingZoneType}
          onComplete={onZoneDrawComplete}
          onCancel={onZoneDrawCancel}
        />
      )}

      {/* 배치 모드 고스트 메시 */}
      {placingPreset && onPlace && (
        <GhostMesh preset={placingPreset} onPlace={onPlace} existingObjects={objects} />
      )}
    </>
  );
}
