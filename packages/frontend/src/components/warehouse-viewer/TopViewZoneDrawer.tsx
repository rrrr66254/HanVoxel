import { useState, useCallback, useEffect, useRef } from 'react';
import type { ZoneConfig, ZoneType } from './ZoneDrawing';
import type { SpatialObject } from '../../types/spatial';

// Zone 타입별 색상
const ZONE_COLORS: Record<ZoneType, string> = {
  STORAGE: '#3B82F6',
  PICKING: '#10B981',
  STAGING: '#F59E0B',
  SAFETY: '#EF4444',
};

const ZONE_LABELS: Record<ZoneType, string> = {
  STORAGE: '보관',
  PICKING: '피킹',
  STAGING: '스테이징',
  SAFETY: '안전',
};

// 창고 크기 (WarehouseScene 기준)
const WALL_W = 60;
const WALL_D = 45;
const WALL_CENTER_X = 15;
const WALL_CENTER_Z = 20;
const WALL_LEFT = WALL_CENTER_X - WALL_W / 2;
const WALL_TOP = WALL_CENTER_Z - WALL_D / 2;

// ─── 2D 탑뷰 오브젝트 렌더러 ───

/** 랙을 위에서 본 모습: 수직 프레임(4모서리) + 선반 판 + 빔 라인 */
function drawRackTopView(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, ow: number, oh: number,
  obj: SpatialObject,
) {
  const meta = obj.metadata as Record<string, unknown> | null;
  const levels = (meta?.levels as number) ?? 3;
  const FRAME = Math.max(1.5, Math.min(3, ow * 0.04)); // 프레임 두께 (px)

  // 선반 판 배경 (위에서 보면 선반 상단면)
  ctx.fillStyle = '#8892A0';
  ctx.fillRect(ox, oy, ow, oh);

  // 선반 칸 구분선 (깊이 방향으로 levels 만큼 나눔 → 위에서 보면 가로줄)
  ctx.strokeStyle = '#5C6370';
  ctx.lineWidth = 0.8;
  // 랙 깊이에 팔레트 위치를 가로줄로 표시
  const slotCount = Math.max(1, Math.round(ow / (1.4 * (ow / obj.scaleX || 1))));
  for (let i = 1; i < slotCount; i++) {
    const sx = ox + (ow / slotCount) * i;
    ctx.beginPath();
    ctx.moveTo(sx, oy);
    ctx.lineTo(sx, oy + oh);
    ctx.stroke();
  }

  // 4개 수직 프레임 (모서리 기둥, 위에서 보면 작은 사각형)
  ctx.fillStyle = '#5C6370';
  // 좌상, 우상, 좌하, 우하
  ctx.fillRect(ox, oy, FRAME, FRAME);
  ctx.fillRect(ox + ow - FRAME, oy, FRAME, FRAME);
  ctx.fillRect(ox, oy + oh - FRAME, FRAME, FRAME);
  ctx.fillRect(ox + ow - FRAME, oy + oh - FRAME, FRAME, FRAME);

  // 빔 (오렌지색 가로줄, 위에서 보면 앞뒤 빔)
  ctx.strokeStyle = '#FF8C00';
  ctx.lineWidth = Math.max(1, FRAME * 0.6);
  // 전면 빔
  ctx.beginPath();
  ctx.moveTo(ox, oy + 1);
  ctx.lineTo(ox + ow, oy + 1);
  ctx.stroke();
  // 후면 빔
  ctx.beginPath();
  ctx.moveTo(ox, oy + oh - 1);
  ctx.lineTo(ox + ow, oy + oh - 1);
  ctx.stroke();

  // 외곽선
  ctx.strokeStyle = '#6B7280';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox, oy, ow, oh);

  // 라벨 (단수 표시)
  if (ow > 18 && oh > 12) {
    ctx.fillStyle = '#E6EDF3';
    const fs = Math.max(7, Math.min(10, Math.min(ow, oh) / 3));
    ctx.font = `bold ${fs}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${levels}단`, ox + ow / 2, oy + oh / 2);
    ctx.textBaseline = 'alphabetic';
  }
}

/** 벽을 위에서 본 모습: 두꺼운 솔리드 라인 + 해칭 */
function drawWallTopView(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, ow: number, oh: number,
) {
  // 벽 본체 (콘크리트/샌드위치 패널 느낌)
  ctx.fillStyle = '#6B7280';
  ctx.fillRect(ox, oy, ow, oh);

  // 해칭 (대각선 줄무늬 — 벽 단면 표현)
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, ow, oh);
  ctx.clip();
  ctx.strokeStyle = '#8B949E';
  ctx.lineWidth = 0.5;
  const step = Math.max(3, Math.min(6, Math.min(ow, oh) / 2));
  const maxLen = ow + oh;
  for (let d = -maxLen; d < maxLen; d += step) {
    ctx.beginPath();
    ctx.moveTo(ox + d, oy);
    ctx.lineTo(ox + d + oh, oy + oh);
    ctx.stroke();
  }
  ctx.restore();

  // 외곽선
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox, oy, ow, oh);
}

/** 통로를 위에서 본 모습: 바닥 마킹 + 점선 경계 + 화살표 */
function drawAisleTopView(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, ow: number, oh: number,
  obj: SpatialObject,
) {
  const meta = obj.metadata as Record<string, unknown> | null;
  const isEmergency = (meta?.aisleType as string) === 'EMERGENCY';

  // 바닥면 (연한 색)
  ctx.fillStyle = isEmergency ? '#FBBF2415' : '#4B556320';
  ctx.fillRect(ox, oy, ow, oh);

  // 경계선 (점선)
  ctx.strokeStyle = isEmergency ? '#FBBF24' : '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(ox, oy, ow, oh);
  ctx.setLineDash([]);

  // 비상 통로: 노란 빗금
  if (isEmergency) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, ow, oh);
    ctx.clip();
    ctx.strokeStyle = '#FBBF2460';
    ctx.lineWidth = 1.5;
    const step = 6;
    const maxLen = ow + oh;
    for (let d = -maxLen; d < maxLen; d += step) {
      ctx.beginPath();
      ctx.moveTo(ox + d, oy);
      ctx.lineTo(ox + d + oh, oy + oh);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 중앙선 (긴 축 방향)
  const isHorizontal = ow > oh;
  ctx.strokeStyle = isEmergency ? '#FBBF2480' : '#94A3B860';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  if (isHorizontal) {
    ctx.moveTo(ox + 4, oy + oh / 2);
    ctx.lineTo(ox + ow - 4, oy + oh / 2);
  } else {
    ctx.moveTo(ox + ow / 2, oy + 4);
    ctx.lineTo(ox + ow / 2, oy + oh - 4);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 방향 화살표
  if ((isHorizontal ? ow : oh) > 20) {
    ctx.fillStyle = isEmergency ? '#FBBF2480' : '#94A3B860';
    const cx = ox + ow / 2;
    const cy = oy + oh / 2;
    const arrowSize = Math.min(4, Math.min(ow, oh) / 4);
    ctx.beginPath();
    if (isHorizontal) {
      ctx.moveTo(cx + arrowSize * 2, cy);
      ctx.lineTo(cx + arrowSize, cy - arrowSize);
      ctx.lineTo(cx + arrowSize, cy + arrowSize);
    } else {
      ctx.moveTo(cx, cy + arrowSize * 2);
      ctx.lineTo(cx - arrowSize, cy + arrowSize);
      ctx.lineTo(cx + arrowSize, cy + arrowSize);
    }
    ctx.closePath();
    ctx.fill();
  }
}

/** 작업대/설비를 위에서 본 모습 */
function drawEquipmentTopView(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, ow: number, oh: number,
  obj: SpatialObject,
) {
  const typeName = obj.type.name;
  const isMachine = typeName === 'MACHINE';

  // 본체
  ctx.fillStyle = isMachine ? '#374151' : '#1F2937';
  ctx.fillRect(ox, oy, ow, oh);

  // 내부 디테일 (기계: 원형 부품 / 작업대: 작업면)
  if (isMachine && Math.min(ow, oh) > 10) {
    // 원형 부품 표현
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 1;
    const r = Math.min(ow, oh) * 0.3;
    ctx.beginPath();
    ctx.arc(ox + ow / 2, oy + oh / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    // 중심점
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(ox + ow / 2, oy + oh / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (Math.min(ow, oh) > 10) {
    // 작업면 표현 (안쪽 사각형)
    const inset = Math.max(2, Math.min(ow, oh) * 0.12);
    ctx.fillStyle = '#4B5563';
    ctx.fillRect(ox + inset, oy + inset, ow - inset * 2, oh - inset * 2);
  }

  // 외곽선
  ctx.strokeStyle = isMachine ? '#EF4444' : '#8B5CF6';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(ox, oy, ow, oh);

  // 라벨
  if (ow > 20 && oh > 12) {
    ctx.fillStyle = '#E6EDF3';
    const fs = Math.max(7, Math.min(9, Math.min(ow, oh) / 3));
    ctx.font = `${fs}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = obj.name || (isMachine ? '설비' : '작업대');
    const maxChars = Math.floor(ow / (fs * 0.55));
    ctx.fillText(label.length > maxChars ? label.slice(0, maxChars) + '…' : label, ox + ow / 2, oy + oh / 2);
    ctx.textBaseline = 'alphabetic';
  }
}

interface TopViewZoneDrawerProps {
  zones: ZoneConfig[];
  objects?: SpatialObject[];
  onAddZone: (zone: Omit<ZoneConfig, 'id'>) => void;
  onDeleteZone: (id: string) => void;
  onClose: () => void;
}

/**
 * 2D 탑뷰 Zone 드로잉 모드
 * - 카메라 잠금 (탑뷰)
 * - 마우스 드래그로 직사각형 구역 생성
 * - 이름 입력 팝업
 * - Zone 색상 + 테두리 + 라벨 표시
 * - 3D 모드로 복귀 시 Zone 유지
 */
export function TopViewZoneDrawer({ zones, objects = [], onAddZone, onDeleteZone, onClose }: TopViewZoneDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedType, setSelectedType] = useState<ZoneType>('STORAGE');
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; z: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; z: number } | null>(null);
  const [namingZone, setNamingZone] = useState<Omit<ZoneConfig, 'id'> | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // 뷰포트 → 월드 좌표 변환
  const viewToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, z: 0 };
    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left - rect.width / 2 - pan.x) / zoom;
    const canvasY = (clientY - rect.top - rect.height / 2 - pan.y) / zoom;

    // 캔버스 좌표 → 월드 좌표
    const scale = Math.min(rect.width / WALL_W, rect.height / WALL_D) * 0.85;
    const worldX = canvasX / scale + WALL_CENTER_X;
    const worldZ = canvasY / scale + WALL_CENTER_Z;

    return { x: Math.round(worldX), z: Math.round(worldZ) };
  }, [zoom, pan]);

  // 캔버스 리사이즈 감지
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const w = rect.width;
    const h = rect.height;
    const scale = Math.min(w / WALL_W, h / WALL_D) * 0.85 * zoom;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2 + pan.x, h / 2 + pan.y);

    // 바닥
    const floorX = (WALL_LEFT - WALL_CENTER_X) * scale;
    const floorY = (WALL_TOP - WALL_CENTER_Z) * scale;
    const floorW = WALL_W * scale;
    const floorH = WALL_D * scale;

    ctx.fillStyle = '#1A2332';
    ctx.fillRect(floorX, floorY, floorW, floorH);

    // 격자
    ctx.strokeStyle = '#1E305040';
    ctx.lineWidth = 0.5;
    for (let x = WALL_LEFT; x <= WALL_LEFT + WALL_W; x += 5) {
      const sx = (x - WALL_CENTER_X) * scale;
      ctx.beginPath();
      ctx.moveTo(sx, floorY);
      ctx.lineTo(sx, floorY + floorH);
      ctx.stroke();
    }
    for (let z = WALL_TOP; z <= WALL_TOP + WALL_D; z += 5) {
      const sy = (z - WALL_CENTER_Z) * scale;
      ctx.beginPath();
      ctx.moveTo(floorX, sy);
      ctx.lineTo(floorX + floorW, sy);
      ctx.stroke();
    }

    // 벽 테두리
    ctx.strokeStyle = '#2D7DD2';
    ctx.lineWidth = 2;
    ctx.strokeRect(floorX, floorY, floorW, floorH);

    // 기존 오브젝트 렌더링 — 렌더 순서: 통로(바닥) → 벽 → 랙/설비
    const renderOrder: Record<string, number> = {
      AISLE: 0, ZONE: 0, SAFETY_ZONE: 0,
      WALL: 1,
      RACK: 2, WORKSTATION: 3, MACHINE: 3,
    };
    const sortedObjects = [...objects]
      .filter((o) => o.isActive && o.visible && !['SITE', 'BUILDING', 'FLOOR', 'BIN'].includes(o.type.name))
      .sort((a, b) => (renderOrder[a.type.name] ?? 2) - (renderOrder[b.type.name] ?? 2));

    sortedObjects.forEach((obj) => {
      const typeName = obj.type.name;

      // rotationY에 따라 가로/세로 스왑
      const rot = obj.rotationY % Math.PI;
      const isRotated = Math.abs(rot - Math.PI / 2) < 0.1 || Math.abs(rot + Math.PI / 2) < 0.1;
      const drawW = isRotated ? obj.scaleZ : obj.scaleX;
      const drawD = isRotated ? obj.scaleX : obj.scaleZ;

      const ox = (obj.positionX - drawW / 2 - WALL_CENTER_X) * scale;
      const oy = (obj.positionZ - drawD / 2 - WALL_CENTER_Z) * scale;
      const ow = drawW * scale;
      const oh = drawD * scale;

      switch (typeName) {
        case 'RACK':
          drawRackTopView(ctx, ox, oy, ow, oh, obj);
          break;
        case 'WALL':
          drawWallTopView(ctx, ox, oy, ow, oh);
          break;
        case 'AISLE':
          drawAisleTopView(ctx, ox, oy, ow, oh, obj);
          break;
        case 'WORKSTATION':
        case 'MACHINE':
          drawEquipmentTopView(ctx, ox, oy, ow, oh, obj);
          break;
        default: {
          // 기타 오브젝트 — 기본 반투명 박스
          ctx.fillStyle = '#4B556320';
          ctx.fillRect(ox, oy, ow, oh);
          ctx.strokeStyle = '#6B728080';
          ctx.lineWidth = 1;
          ctx.strokeRect(ox, oy, ow, oh);
        }
      }
    });

    // 기존 Zone 렌더링
    zones.forEach((zone) => {
      const zx = (zone.startX - WALL_CENTER_X) * scale;
      const zz = (zone.startZ - WALL_CENTER_Z) * scale;
      const zw = (zone.endX - zone.startX) * scale;
      const zh = (zone.endZ - zone.startZ) * scale;
      const color = ZONE_COLORS[zone.type];

      // 채움
      ctx.fillStyle = `${color}25`;
      ctx.fillRect(zx, zz, zw, zh);

      // 테두리
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(zx, zz, zw, zh);

      // 라벨
      ctx.fillStyle = color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(zone.name, zx + zw / 2, zz + zh / 2 + 4);
    });

    // 드래그 중 프리뷰
    if (startPos && currentPos) {
      const sx = (Math.min(startPos.x, currentPos.x) - WALL_CENTER_X) * scale;
      const sz = (Math.min(startPos.z, currentPos.z) - WALL_CENTER_Z) * scale;
      const sw = Math.abs(currentPos.x - startPos.x) * scale;
      const sh = Math.abs(currentPos.z - startPos.z) * scale;
      const color = ZONE_COLORS[selectedType];

      ctx.fillStyle = `${color}30`;
      ctx.fillRect(sx, sz, sw, sh);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx, sz, sw, sh);
      ctx.setLineDash([]);

      // 크기 라벨
      const sizeW = Math.abs(currentPos.x - startPos.x);
      const sizeD = Math.abs(currentPos.z - startPos.z);
      if (sizeW > 0 && sizeD > 0) {
        ctx.fillStyle = '#E6EDF3';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${sizeW}m × ${sizeD}m`, sx + sw / 2, sz + sh / 2 + 4);
      }
    }

    ctx.restore();
  }, [zones, objects, startPos, currentPos, selectedType, zoom, pan, canvasSize]);

  // 마우스 이벤트
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || namingZone) return;
    const pos = viewToWorld(e.clientX, e.clientY);
    setStartPos(pos);
    setDrawing(true);
  }, [viewToWorld, namingZone]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing) return;
    setCurrentPos(viewToWorld(e.clientX, e.clientY));
  }, [drawing, viewToWorld]);

  const handleMouseUp = useCallback(() => {
    if (!drawing || !startPos || !currentPos) {
      setDrawing(false);
      return;
    }

    const sizeW = Math.abs(currentPos.x - startPos.x);
    const sizeD = Math.abs(currentPos.z - startPos.z);

    if (sizeW >= 2 && sizeD >= 2) {
      // 이름 입력 팝업 표시
      setNamingZone({
        name: '',
        type: selectedType,
        startX: Math.min(startPos.x, currentPos.x),
        startZ: Math.min(startPos.z, currentPos.z),
        endX: Math.max(startPos.x, currentPos.x),
        endZ: Math.max(startPos.z, currentPos.z),
        height: 0.1,
      });
      setZoneName(`${ZONE_LABELS[selectedType]} ${zones.filter((z) => z.type === selectedType).length + 1}`);
    }

    setDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  }, [drawing, startPos, currentPos, selectedType, zones]);

  // 줌 이벤트
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.3, Math.min(3, prev - e.deltaY * 0.001)));
  }, []);

  // 이름 확정
  const handleConfirmName = useCallback(() => {
    if (namingZone) {
      onAddZone({ ...namingZone, name: zoneName });
      setNamingZone(null);
      setZoneName('');
    }
  }, [namingZone, zoneName, onAddZone]);

  // ESC 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (namingZone) {
          setNamingZone(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [namingZone, onClose]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: '#0D1117',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 상단 툴바 */}
      <div style={{
        height: 48,
        background: '#161B22',
        borderBottom: '1px solid #21262D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#E6EDF3' }}>2D 구역 편집</span>
          <span style={{ fontSize: 11, color: '#484F58' }}>|</span>
          <span style={{ fontSize: 11, color: '#8B949E' }}>드래그하여 구역 생성</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Zone 타입 선택 */}
          {(['STORAGE', 'PICKING', 'STAGING', 'SAFETY'] as ZoneType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: selectedType === type
                  ? `2px solid ${ZONE_COLORS[type]}`
                  : '1px solid #30363D',
                background: selectedType === type
                  ? `${ZONE_COLORS[type]}20`
                  : 'transparent',
                color: ZONE_COLORS[type],
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {ZONE_LABELS[type]}
            </button>
          ))}

          <div style={{ width: 1, height: 24, background: '#21262D', margin: '0 4px' }} />

          {/* 3D로 복귀 (완료) */}
          <button
            onClick={onClose}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: '1px solid #3FB950',
              background: '#238636',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >
            완료 (3D 복귀)
          </button>
        </div>
      </div>

      {/* 캔버스 영역 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', cursor: drawing ? 'crosshair' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Zone 목록 사이드바 */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 220,
          background: 'rgba(22,27,34,0.95)',
          border: '1px solid #30363D',
          borderRadius: 10,
          padding: 12,
          maxHeight: 'calc(100% - 24px)',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E6EDF3', marginBottom: 8 }}>
            구역 목록 ({zones.length})
          </div>
          {zones.length === 0 ? (
            <div style={{ fontSize: 11, color: '#484F58', padding: 8 }}>
              드래그하여 구역을 생성하세요
            </div>
          ) : (
            zones.map((zone) => (
              <div key={zone.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 6,
                marginBottom: 4,
                background: '#0D1117',
                border: `1px solid ${ZONE_COLORS[zone.type]}30`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: ZONE_COLORS[zone.type],
                  }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#E6EDF3' }}>{zone.name}</div>
                    <div style={{ fontSize: 9, color: '#484F58' }}>
                      {(zone.endX - zone.startX)}m × {(zone.endZ - zone.startZ)}m
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteZone(zone.id)}
                  style={{
                    background: 'none', border: 'none',
                    color: '#F85149', cursor: 'pointer',
                    fontSize: 12, padding: '2px 4px',
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* 이름 입력 팝업 */}
        {namingZone && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#161B22',
              border: '1px solid #30363D',
              borderRadius: 12,
              padding: 20,
              width: 280,
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              zIndex: 60,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E6EDF3', marginBottom: 12 }}>
              구역 이름 입력
            </div>
            <input
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmName(); }}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${ZONE_COLORS[selectedType]}`,
                background: '#0D1117',
                color: '#E6EDF3',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setNamingZone(null)}
                style={{
                  flex: 1, padding: '8px',
                  borderRadius: 8, border: '1px solid #30363D',
                  background: '#21262D', color: '#8B949E',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                취소
              </button>
              <button
                onClick={handleConfirmName}
                style={{
                  flex: 1, padding: '8px',
                  borderRadius: 8, border: 'none',
                  background: ZONE_COLORS[selectedType], color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                생성
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
