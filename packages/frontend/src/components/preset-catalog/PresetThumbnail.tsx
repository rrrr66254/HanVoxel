import { useEffect, useRef, useMemo } from 'react';

interface PresetThumbnailProps {
  category: string;  // RACK, PALLET, LOADED_PALLET, CONTAINER, AISLE, PRODUCT_BOX, FLOOR, WALL, DOOR
  code: string;
  width: number;     // m
  depth: number;     // m
  height: number;    // m
  color?: string | null;
  levels?: number | null;
  size?: number;     // 캔버스 크기 (px)
}

// 등각 투영 변환 헬퍼
const ISO_ANGLE = Math.PI / 6; // 30도
const cos30 = Math.cos(ISO_ANGLE);
const sin30 = Math.sin(ISO_ANGLE);

function isoProject(x: number, y: number, z: number, cx: number, cy: number, scale: number): [number, number] {
  const sx = (x - z) * cos30 * scale + cx;
  const sy = (x + z) * sin30 * scale - y * scale + cy;
  return [sx, sy];
}

// 면 그리기 헬퍼 (4꼭짓점)
function drawFace(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

// 등각 투영 박스 그리기
function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, oz: number,
  w: number, h: number, d: number,
  cx: number, cy: number, scale: number,
  topColor: string, leftColor: string, rightColor: string,
  strokeColor?: string,
) {
  // 8개 꼭짓점
  const p = (x: number, y: number, z: number) => isoProject(ox + x, oy + y, oz + z, cx, cy, scale);

  // 상면
  drawFace(ctx, [p(0, h, 0), p(w, h, 0), p(w, h, d), p(0, h, d)], topColor, strokeColor);
  // 좌면 (Z 방향)
  drawFace(ctx, [p(0, 0, d), p(0, h, d), p(w, h, d), p(w, 0, d)], leftColor, strokeColor);
  // 우면 (X 방향)
  drawFace(ctx, [p(w, 0, 0), p(w, h, 0), p(w, h, d), p(w, 0, d)], rightColor, strokeColor);
}

// 색상 밝기 조절
function adjustColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}

/**
 * 프리셋 썸네일 — Canvas 기반 등각 투영 미리보기
 */
export function PresetThumbnail({
  category,
  code,
  width: w,
  depth: d,
  height: h,
  color,
  levels,
  size = 80,
}: PresetThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cacheKey = useMemo(() => `${category}_${code}_${w}_${d}_${h}_${color}_${levels}_${size}`, [category, code, w, d, h, color, levels, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const RES = size * 2; // 레티나
    canvas.width = RES;
    canvas.height = RES;
    ctx.clearRect(0, 0, RES, RES);

    const cx = RES / 2;
    const cy = RES * 0.65;

    // 정규화된 비율 계산 (가장 큰 축이 기준)
    const maxDim = Math.max(w, d, h, 0.5);
    const scale = (RES * 0.28) / maxDim;

    const nw = w || 1;
    const nd = d || 1;
    const nh = h || 1;

    switch (category) {
      case 'RACK':
        drawRack(ctx, cx, cy, scale, nw, nh, nd, levels ?? 3);
        break;
      case 'PALLET':
        drawPallet(ctx, cx, cy, scale, nw, nd);
        break;
      case 'LOADED_PALLET':
        drawLoadedPallet(ctx, cx, cy, scale, nw, nd, nh);
        break;
      case 'CONTAINER':
        drawContainer(ctx, cx, cy, scale, nw, nd, nh, code);
        break;
      case 'AISLE':
        drawAisle(ctx, cx, cy, scale, nw, nd, code);
        break;
      case 'PRODUCT_BOX':
        drawProductBox(ctx, cx, cy, scale, nw, nd, nh, color);
        break;
      case 'FLOOR':
        drawFloor(ctx, cx, cy, scale, nw, nd, code);
        break;
      case 'WALL':
        drawWall(ctx, cx, cy, scale, nw, nh, code);
        break;
      case 'DOOR':
        drawDoor(ctx, cx, cy, scale, nw, nh, code);
        break;
      default:
        drawIsoBox(ctx, -nw / 2, 0, -nd / 2, nw, nh, nd, cx, cy, scale, '#4A90D9', '#3570B0', '#2D5A8E', '#1A3A5E');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, imageRendering: 'auto' }}
    />
  );
}

// ========================== 타입별 렌더링 함수 ==========================

// 랙 — 프레임 + 빔 + 선반
function drawRack(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, h: number, d: number,
  levels: number,
) {
  const frameColor = '#5C6370';
  const beamColor = '#FF8C00';
  const shelfColor = 'rgba(136,146,160,0.4)';
  const strokeColor = '#3A3F48';

  const postW = 0.06 * (w / 2.7);
  const beamH = 0.07 * (h / 6);
  const levelH = h / levels;

  // 4개 기둥
  const posts: [number, number][] = [
    [-w / 2, -d / 2],
    [w / 2 - postW, -d / 2],
    [-w / 2, d / 2 - postW],
    [w / 2 - postW, d / 2 - postW],
  ];

  for (const [px, pz] of posts) {
    drawIsoBox(ctx, px, 0, pz, postW, h, postW, cx, cy, scale,
      adjustColor(frameColor, 1.2), adjustColor(frameColor, 0.8), adjustColor(frameColor, 0.9), strokeColor);
  }

  // 선반 + 빔 (레벨별)
  for (let i = 1; i <= levels; i++) {
    const y = i * levelH;
    // 빔 (가로 — 전면)
    drawIsoBox(ctx, -w / 2, y - beamH, -d / 2, w, beamH, postW, cx, cy, scale,
      adjustColor(beamColor, 1.1), adjustColor(beamColor, 0.7), adjustColor(beamColor, 0.85), strokeColor);
    // 빔 (가로 — 후면)
    drawIsoBox(ctx, -w / 2, y - beamH, d / 2 - postW, w, beamH, postW, cx, cy, scale,
      adjustColor(beamColor, 1.1), adjustColor(beamColor, 0.7), adjustColor(beamColor, 0.85), strokeColor);
    // 선반
    if (i < levels) {
      drawIsoBox(ctx, -w / 2 + postW, y, -d / 2 + postW, w - postW * 2, 0.02, d - postW * 2, cx, cy, scale,
        shelfColor, 'rgba(100,110,120,0.3)', 'rgba(100,110,120,0.3)');
    }
  }
}

// 팔레트 — 상판 + 다리
function drawPallet(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number,
) {
  const woodLight = '#C4944A';
  const woodDark = '#A07830';
  const boardH = 0.02;
  const legH = 0.09;
  const totalH = 0.144;
  const strokeColor = '#6B4F10';

  // 하판 3개 러너
  for (let i = 0; i < 3; i++) {
    const z = -d / 2 + d * (i + 1) / 4;
    drawIsoBox(ctx, -w / 2, 0, z - 0.04, w, boardH, 0.08, cx, cy, scale,
      adjustColor(woodDark, 1.1), adjustColor(woodDark, 0.8), adjustColor(woodDark, 0.9), strokeColor);
  }

  // 다리 블록 9개 (3×3)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = -w / 2 + w * (col + 1) / 4 - 0.04;
      const z = -d / 2 + d * (row + 1) / 4 - 0.04;
      drawIsoBox(ctx, x, boardH, z, 0.08, legH, 0.08, cx, cy, scale,
        adjustColor(woodDark, 1.0), adjustColor(woodDark, 0.7), adjustColor(woodDark, 0.8), strokeColor);
    }
  }

  // 상판 5개 판자
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + w * i / 5 + 0.01;
    const pw = w / 5 - 0.02;
    drawIsoBox(ctx, x, totalH - boardH, -d / 2, pw, boardH, d, cx, cy, scale,
      adjustColor(woodLight, 1.15), adjustColor(woodLight, 0.8), adjustColor(woodLight, 0.9), strokeColor);
  }
}

// 적재 팔레트 — 팔레트 + 화물
function drawLoadedPallet(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number, h: number,
) {
  // 팔레트
  drawPallet(ctx, cx, cy, scale, w, d);

  // 화물 (골판지 박스)
  const cargoH = h - 0.144;
  if (cargoH > 0) {
    const cargoColor = '#B8956A';
    drawIsoBox(ctx, -w / 2 * 0.9, 0.144, -d / 2 * 0.9, w * 0.9, cargoH, d * 0.9, cx, cy, scale,
      adjustColor(cargoColor, 1.2), adjustColor(cargoColor, 0.8), adjustColor(cargoColor, 0.9), '#8B7B60');

    // 테이프 라인
    const p1 = isoProject(-w * 0.02, 0.144 + cargoH, -d / 2 * 0.9, cx, cy, scale);
    const p2 = isoProject(-w * 0.02, 0.144 + cargoH, d / 2 * 0.9, cx, cy, scale);
    ctx.strokeStyle = 'rgba(200,180,120,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
}

// 컨테이너 — 해상 컨테이너
function drawContainer(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number, h: number,
  code: string,
) {
  const isReefer = code.includes('REEFER');
  const baseColor = isReefer ? '#E8E8E8' : '#3B6EA5';
  const strokeColor = isReefer ? '#999' : '#1E4A7A';

  // 본체
  drawIsoBox(ctx, -w / 2, 0, -d / 2, w, h, d, cx, cy, scale,
    adjustColor(baseColor, 1.1), adjustColor(baseColor, 0.75), adjustColor(baseColor, 0.85), strokeColor);

  // 골 무늬 (측면 세로줄)
  const ribCount = Math.min(12, Math.floor(d / 0.8));
  for (let i = 1; i < ribCount; i++) {
    const z = -d / 2 + (d * i) / ribCount;
    const p1 = isoProject(w / 2, 0.05, z, cx, cy, scale);
    const p2 = isoProject(w / 2, h - 0.05, z, cx, cy, scale);
    ctx.strokeStyle = adjustColor(baseColor, 0.65);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }

  // 문 (전면)
  const doorW = w * 0.4;
  const doorH = h * 0.85;
  drawIsoBox(ctx, -doorW / 2, h * 0.05, -d / 2 - 0.01, doorW, doorH, 0.02, cx, cy, scale,
    adjustColor(baseColor, 0.9), adjustColor(baseColor, 0.65), adjustColor(baseColor, 0.7), strokeColor);

  // 냉장 컨테이너: 냉각 유닛
  if (isReefer) {
    drawIsoBox(ctx, -w / 2 * 0.7, h * 0.1, -d / 2 - 0.1, w * 0.7, h * 0.6, 0.1, cx, cy, scale,
      '#AAA', '#888', '#999', '#666');
  }
}

// 통로 — 바닥 마킹
function drawAisle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number,
  code: string,
) {
  const aisleH = 0.02;

  // 통로 기본
  drawIsoBox(ctx, -w / 2, 0, -d / 2, w, aisleH, d, cx, cy, scale,
    'rgba(100,110,120,0.5)', 'rgba(80,90,100,0.4)', 'rgba(80,90,100,0.4)');

  // 노란 마킹 라인
  const lineW = 0.08;
  drawIsoBox(ctx, -w / 2, aisleH, -d / 2, lineW, 0.005, d, cx, cy, scale,
    '#F5C542', '#C49A30', '#D4A838');
  drawIsoBox(ctx, w / 2 - lineW, aisleH, -d / 2, lineW, 0.005, d, cx, cy, scale,
    '#F5C542', '#C49A30', '#D4A838');

  // 화살표 (방향 표시)
  if (code.includes('EMERGENCY')) {
    // 비상 통로: 빨간 라인
    drawIsoBox(ctx, -w / 2, aisleH, -d / 2, lineW, 0.005, d, cx, cy, scale,
      '#F85149', '#C03030', '#D83838');
    drawIsoBox(ctx, w / 2 - lineW, aisleH, -d / 2, lineW, 0.005, d, cx, cy, scale,
      '#F85149', '#C03030', '#D83838');
  }

  // 보행자 아이콘 (텍스트)
  const center = isoProject(0, 0.1, 0, cx, cy, scale);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `bold ${scale * 0.4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('⬆', center[0], center[1]);
}

// 제품 박스
function drawProductBox(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number, h: number,
  color?: string | null,
) {
  const baseColor = '#B8956A';
  const labelColor = color ?? '#6b7280';
  const strokeColor = '#8B7B60';

  // 박스 본체
  drawIsoBox(ctx, -w / 2, 0, -d / 2, w, h, d, cx, cy, scale,
    adjustColor(baseColor, 1.2), adjustColor(baseColor, 0.8), adjustColor(baseColor, 0.9), strokeColor);

  // 라벨 (상면)
  const labelW = w * 0.5;
  const labelD = d * 0.5;
  drawIsoBox(ctx, -labelW / 2, h, -labelD / 2, labelW, 0.002, labelD, cx, cy, scale,
    labelColor, labelColor, labelColor);

  // 테이프
  const tp1 = isoProject(0, h + 0.005, -d / 2, cx, cy, scale);
  const tp2 = isoProject(0, h + 0.005, d / 2, cx, cy, scale);
  ctx.strokeStyle = 'rgba(200,180,120,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tp1[0], tp1[1]);
  ctx.lineTo(tp2[0], tp2[1]);
  ctx.stroke();
}

// 바닥
function drawFloor(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number,
  code: string,
) {
  const tileH = 0.03;
  let topColor = '#6B7B8D';
  let leftColor = '#556575';
  let rightColor = '#5F6F7F';

  if (code.includes('GREEN')) {
    topColor = '#4A7B5A'; leftColor = '#3A6548'; rightColor = '#407050';
  } else if (code.includes('CONCRETE')) {
    topColor = '#8A8A82'; leftColor = '#6A6A62'; rightColor = '#7A7A72';
  } else if (code.includes('ANTI_SLIP')) {
    topColor = '#707878'; leftColor = '#505858'; rightColor = '#606868';
  } else if (code.includes('MARKING')) {
    topColor = '#3A3A3A'; leftColor = '#2A2A2A'; rightColor = '#303030';
  }

  // 바닥 본체
  drawIsoBox(ctx, -w / 2, 0, -d / 2, w, tileH, d, cx, cy, scale,
    topColor, leftColor, rightColor, adjustColor(leftColor, 0.7));

  // 타일 그리드 (상면)
  const tileSize = 2; // 2m 타일
  const tilesX = Math.ceil(w / tileSize);
  const tilesZ = Math.ceil(d / tileSize);

  for (let ix = 0; ix <= tilesX; ix++) {
    const x = -w / 2 + ix * tileSize;
    if (x > w / 2) break;
    const p1 = isoProject(x, tileH + 0.001, -d / 2, cx, cy, scale);
    const p2 = isoProject(x, tileH + 0.001, d / 2, cx, cy, scale);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
  for (let iz = 0; iz <= tilesZ; iz++) {
    const z = -d / 2 + iz * tileSize;
    if (z > d / 2) break;
    const p1 = isoProject(-w / 2, tileH + 0.001, z, cx, cy, scale);
    const p2 = isoProject(w / 2, tileH + 0.001, z, cx, cy, scale);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }

  // 마킹 바닥: 노란/검은 줄무늬
  if (code.includes('MARKING')) {
    const stripeCount = Math.floor(d / 0.5);
    for (let i = 0; i < stripeCount; i += 2) {
      const z = -d / 2 + i * 0.5;
      drawIsoBox(ctx, -w / 2, tileH, z, w, 0.003, 0.5, cx, cy, scale,
        '#F5C542', '#C49A30', '#D4A838');
    }
  }
}

// 벽
function drawWall(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, h: number,
  code: string,
) {
  const thickness = 0.15;
  let topColor = '#C8CDD3';
  let leftColor = '#A0A5AB';
  let rightColor = '#B0B5BB';

  if (code.includes('CONCRETE')) {
    topColor = '#9A978F'; leftColor = '#7A776F'; rightColor = '#8A877F';
  } else if (code.includes('METAL') || code.includes('CORRUGATED')) {
    topColor = '#8090A0'; leftColor = '#607080'; rightColor = '#708090';
  } else if (code.includes('BRICK')) {
    topColor = '#8B5E3C'; leftColor = '#6B4E2C'; rightColor = '#7B553C';
  }

  // 벽 본체
  drawIsoBox(ctx, -w / 2, 0, -thickness / 2, w, h, thickness, cx, cy, scale,
    topColor, leftColor, rightColor, adjustColor(leftColor, 0.7));

  // 패널 줄무늬 (수평)
  if (code.includes('SANDWICH') || code.includes('CORRUGATED') || !code.includes('BRICK')) {
    const lineCount = Math.floor(h / 0.5);
    for (let i = 1; i < lineCount; i++) {
      const y = i * 0.5;
      const p1 = isoProject(w / 2, y, -thickness / 2, cx, cy, scale);
      const p2 = isoProject(w / 2, y, thickness / 2, cx, cy, scale);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }
  }

  // 벽돌 무늬
  if (code.includes('BRICK')) {
    const brickH = 0.065;
    const brickW = 0.2;
    const rows = Math.floor(h / brickH);
    for (let r = 0; r < rows; r++) {
      const y = r * brickH;
      const offset = r % 2 === 0 ? 0 : brickW / 2;
      const cols = Math.ceil(w / brickW) + 1;
      for (let c = 0; c < cols; c++) {
        const x = -w / 2 + offset + c * brickW;
        if (x > w / 2) break;
        const p = isoProject(w / 2, y, -thickness / 2, cx, cy, scale);
        const p2 = isoProject(w / 2, y, thickness / 2, cx, cy, scale);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      }
    }
  }
}

// 출입문
function drawDoor(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, h: number,
  code: string,
) {
  const thickness = 0.12;
  const isRolling = code.includes('ROLLING') || code.includes('SHUTTER');
  const isSliding = code.includes('SLIDING');

  // 프레임
  const frameColor = '#5C6370';
  drawIsoBox(ctx, -w / 2, 0, -thickness / 2, w, h, thickness, cx, cy, scale,
    adjustColor(frameColor, 1.2), adjustColor(frameColor, 0.8), adjustColor(frameColor, 0.9), '#3A3F48');

  if (isRolling) {
    // 셔터 줄무늬
    const slats = Math.floor(h / 0.12);
    for (let i = 0; i < slats; i++) {
      const y = i * 0.12;
      const slatColor = i % 2 === 0 ? '#8892A0' : '#7882A0';
      drawIsoBox(ctx, -w / 2 + 0.05, y, -thickness / 2 - 0.01,
        w - 0.1, 0.1, 0.01, cx, cy, scale,
        adjustColor(slatColor, 1.1), adjustColor(slatColor, 0.8), adjustColor(slatColor, 0.9));
    }
  } else if (isSliding) {
    // 슬라이딩 도어 — 가운데 분리선
    const p1 = isoProject(0, 0.1, -thickness / 2 - 0.01, cx, cy, scale);
    const p2 = isoProject(0, h - 0.1, -thickness / 2 - 0.01, cx, cy, scale);
    ctx.strokeStyle = '#3A3F48';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
    // 화살표
    const mid = isoProject(0, h / 2, -thickness / 2 - 0.02, cx, cy, scale);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${scale * 0.3}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('◀▶', mid[0], mid[1]);
  } else {
    // 일반 도어 — 손잡이
    const handleX = w / 2 - w * 0.2;
    const handleY = h * 0.45;
    const hp = isoProject(handleX, handleY, -thickness / 2 - 0.02, cx, cy, scale);
    ctx.fillStyle = '#C8B880';
    ctx.beginPath();
    ctx.arc(hp[0], hp[1], scale * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
}
