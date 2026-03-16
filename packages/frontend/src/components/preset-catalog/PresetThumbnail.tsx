import { useEffect, useRef, useMemo } from 'react';

interface PresetThumbnailProps {
  category: string;  // RACK, PALLET, LOADED_PALLET, CONTAINER, AISLE, PRODUCT_BOX, FLOOR, WALL, DOOR, EQUIPMENT, SAFETY, FACILITY
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

    // 정규화된 비율 계산 (가장 큰 축이 기준) — 썸네일 박스를 꽉 채우도록 확대
    const maxDim = Math.max(w, d, h, 0.5);
    const scale = (RES * 0.42) / maxDim;

    const nw = w || 1;
    const nd = d || 1;
    const nh = h || 1;

    switch (category) {
      case 'RACK':
        drawRack(ctx, cx, cy, scale, nw, nh, nd, levels ?? 3);
        break;
      case 'PALLET':
        if (code.includes('PLASTIC')) {
          drawPlasticPallet(ctx, cx, cy, scale, nw, nd);
        } else {
          drawPallet(ctx, cx, cy, scale, nw, nd);
        }
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
      case 'EQUIPMENT':
        drawEquipment(ctx, cx, cy, scale, nw, nd, nh, code);
        break;
      case 'SAFETY':
        drawSafety(ctx, cx, cy, scale, nw, nd, nh, code);
        break;
      case 'FACILITY':
        drawFacility(ctx, cx, cy, scale, nw, nd, nh, code);
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

// 플라스틱 팔레트 — 매끄러운 표면 + 구멍 패턴 + 지지대
function drawPlasticPallet(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number,
) {
  const plasticBlue = '#3A7BC8';
  const plasticDark = '#2A5A98';
  const totalH = 0.144;
  const boardH = 0.025;
  const legH = 0.09;
  const strokeColor = '#1A3A68';

  // 하판 (단일 플레이트)
  drawIsoBox(ctx, -w / 2, 0, -d / 2, w, boardH, d, cx, cy, scale,
    adjustColor(plasticDark, 1.0), adjustColor(plasticDark, 0.75), adjustColor(plasticDark, 0.85), strokeColor);

  // 지지대 리브 3개 (세로 방향)
  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + w * (i + 1) / 4 - 0.03;
    drawIsoBox(ctx, x, boardH, -d / 2 + 0.05, 0.06, legH, d - 0.1, cx, cy, scale,
      adjustColor(plasticDark, 1.05), adjustColor(plasticDark, 0.7), adjustColor(plasticDark, 0.8), strokeColor);
  }

  // 상판 (단일 매끄러운 플레이트)
  drawIsoBox(ctx, -w / 2, totalH - boardH, -d / 2, w, boardH, d, cx, cy, scale,
    adjustColor(plasticBlue, 1.15), adjustColor(plasticBlue, 0.8), adjustColor(plasticBlue, 0.9), strokeColor);

  // 구멍 패턴 (상면에 어두운 사각형)
  const holeSize = w * 0.06;
  const holeGap = w * 0.14;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const hx = -w / 2 + w * 0.12 + col * holeGap;
      const hz = -d / 2 + d * 0.15 + row * (d * 0.28);
      drawIsoBox(ctx, hx, totalH - boardH + 0.001, hz, holeSize, 0.003, holeSize, cx, cy, scale,
        adjustColor(plasticBlue, 0.75), adjustColor(plasticBlue, 0.6), adjustColor(plasticBlue, 0.65));
    }
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

// 컨테이너 — 해상 컨테이너 (회색 + HanVoxel 텍스트)
function drawContainer(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number, h: number,
  code: string,
) {
  const isReefer = code.includes('REEFER');
  const baseColor = isReefer ? '#D0D0D0' : '#808890';
  const strokeColor = isReefer ? '#888' : '#505860';

  // 본체
  drawIsoBox(ctx, -w / 2, 0, -d / 2, w, h, d, cx, cy, scale,
    adjustColor(baseColor, 1.1), adjustColor(baseColor, 0.75), adjustColor(baseColor, 0.85), strokeColor);

  // 골 무늬 (우측면 세로줄)
  const ribCount = Math.min(16, Math.floor(d / 0.6));
  for (let i = 1; i < ribCount; i++) {
    const z = -d / 2 + (d * i) / ribCount;
    const p1 = isoProject(w / 2, 0.05, z, cx, cy, scale);
    const p2 = isoProject(w / 2, h - 0.05, z, cx, cy, scale);
    ctx.strokeStyle = adjustColor(baseColor, 0.6);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }

  // 좌측면(Z방향) 골 무늬도 추가
  const ribCountLeft = Math.min(16, Math.floor(d / 0.6));
  for (let i = 1; i < ribCountLeft; i++) {
    const z = -d / 2 + (d * i) / ribCountLeft;
    const p1 = isoProject(-w / 2 + 0.01, 0.05, z, cx, cy, scale);
    const p2 = isoProject(-w / 2 + 0.01, h - 0.05, z, cx, cy, scale);
    ctx.strokeStyle = adjustColor(baseColor, 0.55);
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }

  // "HanVoxel" 텍스트 (우측면에 표시 — 등각 투영)
  const textY = h * 0.5;
  const textZ1 = -d * 0.35;
  const textZ2 = d * 0.35;
  const tp1 = isoProject(w / 2 + 0.01, textY + h * 0.12, textZ1, cx, cy, scale);
  const tp2 = isoProject(w / 2 + 0.01, textY + h * 0.12, textZ2, cx, cy, scale);
  const angle = Math.atan2(tp2[1] - tp1[1], tp2[0] - tp1[0]);
  const textLen = Math.sqrt((tp2[0] - tp1[0]) ** 2 + (tp2[1] - tp1[1]) ** 2);

  ctx.save();
  ctx.translate(tp1[0], tp1[1]);
  ctx.rotate(angle);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.max(8, textLen * 0.28)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 2;
  ctx.fillText('HanVoxel', textLen / 2, 0);
  ctx.shadowBlur = 0;
  ctx.restore();

  // 문 (전면)
  const doorW = w * 0.4;
  const doorH = h * 0.85;
  drawIsoBox(ctx, -doorW / 2, h * 0.05, -d / 2 - 0.01, doorW, doorH, 0.02, cx, cy, scale,
    adjustColor(baseColor, 0.9), adjustColor(baseColor, 0.65), adjustColor(baseColor, 0.7), strokeColor);

  // 모서리 피팅
  const fitSize = Math.min(0.12, w * 0.08);
  const fitColor = '#606060';
  const fitStroke = '#404040';
  // 하단 4 모서리
  drawIsoBox(ctx, -w / 2, 0, -d / 2, fitSize, fitSize, fitSize, cx, cy, scale, fitColor, adjustColor(fitColor, 0.7), adjustColor(fitColor, 0.85), fitStroke);
  drawIsoBox(ctx, w / 2 - fitSize, 0, -d / 2, fitSize, fitSize, fitSize, cx, cy, scale, fitColor, adjustColor(fitColor, 0.7), adjustColor(fitColor, 0.85), fitStroke);
  drawIsoBox(ctx, -w / 2, 0, d / 2 - fitSize, fitSize, fitSize, fitSize, cx, cy, scale, fitColor, adjustColor(fitColor, 0.7), adjustColor(fitColor, 0.85), fitStroke);
  drawIsoBox(ctx, w / 2 - fitSize, 0, d / 2 - fitSize, fitSize, fitSize, fitSize, cx, cy, scale, fitColor, adjustColor(fitColor, 0.7), adjustColor(fitColor, 0.85), fitStroke);
  // 상단 4 모서리
  drawIsoBox(ctx, -w / 2, h - fitSize, -d / 2, fitSize, fitSize, fitSize, cx, cy, scale, fitColor, adjustColor(fitColor, 0.7), adjustColor(fitColor, 0.85), fitStroke);
  drawIsoBox(ctx, w / 2 - fitSize, h - fitSize, -d / 2, fitSize, fitSize, fitSize, cx, cy, scale, fitColor, adjustColor(fitColor, 0.7), adjustColor(fitColor, 0.85), fitStroke);
  drawIsoBox(ctx, -w / 2, h - fitSize, d / 2 - fitSize, fitSize, fitSize, fitSize, cx, cy, scale, fitColor, adjustColor(fitColor, 0.7), adjustColor(fitColor, 0.85), fitStroke);
  drawIsoBox(ctx, w / 2 - fitSize, h - fitSize, d / 2 - fitSize, fitSize, fitSize, fitSize, cx, cy, scale, fitColor, adjustColor(fitColor, 0.7), adjustColor(fitColor, 0.85), fitStroke);

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

// 작업 장비
function drawEquipment(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number, h: number,
  code: string,
) {
  const isQC = code.includes('QC');
  const isPacking = code.includes('PACKING');
  const isCharging = code.includes('CHARGING');

  if (isQC) {
    // 검수 작업대 — 스테인리스 상판 + 다리 + 검수 조명
    const legH = h * 0.55;
    const topH = 0.04;
    const stainless = '#B0B8C0';
    const legColor = '#606870';
    const strokeColor = '#404850';

    // 다리 4개
    const legW = 0.04;
    for (const [lx, lz] of [[-w / 2 + 0.06, -d / 2 + 0.06], [w / 2 - 0.06, -d / 2 + 0.06], [-w / 2 + 0.06, d / 2 - 0.06], [w / 2 - 0.06, d / 2 - 0.06]]) {
      drawIsoBox(ctx, lx - legW / 2, 0, lz - legW / 2, legW, legH, legW, cx, cy, scale,
        adjustColor(legColor, 1.1), adjustColor(legColor, 0.8), adjustColor(legColor, 0.9), strokeColor);
    }

    // 하단 선반
    drawIsoBox(ctx, -w / 2 + 0.05, legH * 0.15, -d / 2 + 0.05, w - 0.1, 0.02, d - 0.1, cx, cy, scale,
      adjustColor(legColor, 1.0), adjustColor(legColor, 0.7), adjustColor(legColor, 0.8));

    // 상판
    drawIsoBox(ctx, -w / 2, legH, -d / 2, w, topH, d, cx, cy, scale,
      adjustColor(stainless, 1.15), adjustColor(stainless, 0.85), adjustColor(stainless, 0.95), strokeColor);

    // 검수 조명 막대
    drawIsoBox(ctx, -w * 0.35, legH + topH + 0.35, -0.025, w * 0.7, 0.03, 0.05, cx, cy, scale,
      '#E8F0FF', '#C0D0E0', '#D0E0F0');
    // 조명 지지대
    drawIsoBox(ctx, -0.01, legH + topH, -d / 2 + 0.02, 0.02, 0.38, 0.02, cx, cy, scale,
      adjustColor(legColor, 1.0), adjustColor(legColor, 0.7), adjustColor(legColor, 0.85));
  } else if (isPacking) {
    // 포장 작업대 — 목재 상판 + 테이프 롤
    const legH = h * 0.55;
    const topH = 0.04;
    const woodColor = '#A08050';
    const legColor = '#505860';
    const strokeColor = '#3A4048';

    // 다리
    for (const [lx, lz] of [[-w / 2 + 0.04, -d / 2 + 0.04], [w / 2 - 0.04, -d / 2 + 0.04], [-w / 2 + 0.04, d / 2 - 0.04], [w / 2 - 0.04, d / 2 - 0.04]]) {
      drawIsoBox(ctx, lx - 0.02, 0, lz - 0.02, 0.04, legH, 0.04, cx, cy, scale,
        adjustColor(legColor, 1.1), adjustColor(legColor, 0.8), adjustColor(legColor, 0.9), strokeColor);
    }

    // 하단 선반
    drawIsoBox(ctx, -w / 2 + 0.04, legH * 0.12, -d / 2 + 0.04, w - 0.08, 0.02, d - 0.08, cx, cy, scale,
      adjustColor(legColor, 0.9), adjustColor(legColor, 0.6), adjustColor(legColor, 0.7));

    // 상판
    drawIsoBox(ctx, -w / 2, legH, -d / 2, w, topH, d, cx, cy, scale,
      adjustColor(woodColor, 1.2), adjustColor(woodColor, 0.85), adjustColor(woodColor, 0.95), strokeColor);

    // 테이프 롤 (원형)
    const rollCenter = isoProject(w / 2 - 0.08, legH + topH + 0.15, 0, cx, cy, scale);
    ctx.beginPath();
    ctx.arc(rollCenter[0], rollCenter[1], scale * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = '#B89060';
    ctx.fill();
    ctx.strokeStyle = '#7A6040';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 내부 원
    ctx.beginPath();
    ctx.arc(rollCenter[0], rollCenter[1], scale * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = '#605030';
    ctx.fill();
  } else if (isCharging) {
    // 충전 스테이션 — 바닥 플랫폼 + 충전기 패널
    const basePlatColor = '#505860';
    const panelColor = '#3A4048';
    const warningColor = '#FFD700';
    const strokeColor = '#2A3038';

    // 바닥 플랫폼
    drawIsoBox(ctx, -w / 2, 0, -d / 2, w, 0.06, d, cx, cy, scale,
      adjustColor(basePlatColor, 1.1), adjustColor(basePlatColor, 0.8), adjustColor(basePlatColor, 0.9), strokeColor);

    // 충전기 패널 (뒷쪽)
    drawIsoBox(ctx, -w * 0.3, 0.06, d / 2 - 0.2, w * 0.6, h * 0.5, 0.15, cx, cy, scale,
      adjustColor(panelColor, 1.2), adjustColor(panelColor, 0.8), adjustColor(panelColor, 0.9), strokeColor);

    // LED 상태등
    for (let i = 0; i < 3; i++) {
      const ledPos = isoProject(-0.08 + i * 0.08, h * 0.55, d / 2 - 0.23, cx, cy, scale);
      ctx.beginPath();
      ctx.arc(ledPos[0], ledPos[1], scale * 0.02, 0, Math.PI * 2);
      ctx.fillStyle = '#44CC44';
      ctx.fill();
    }

    // 경고 볼라드 (좌우)
    for (const side of [-1, 1]) {
      drawIsoBox(ctx, side * w / 2 * 0.85 - 0.04, 0.06, -d / 2 + 0.06, 0.08, h * 0.45, 0.08, cx, cy, scale,
        adjustColor(warningColor, 1.1), adjustColor(warningColor, 0.7), adjustColor(warningColor, 0.85), '#AA8800');
      // 검은 줄무늬
      drawIsoBox(ctx, side * w / 2 * 0.85 - 0.04, 0.06 + h * 0.3, -d / 2 + 0.06, 0.082, 0.05, 0.082, cx, cy, scale,
        adjustColor(basePlatColor, 0.8), adjustColor(basePlatColor, 0.5), adjustColor(basePlatColor, 0.6));
    }
  }
}

// 안전·소방 장비
function drawSafety(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number, h: number,
  code: string,
) {
  const isHydrant = code.includes('HYDRANT');
  const isExtinguisher = code.includes('EXTINGUISHER');
  const isExitSign = code.includes('EXIT');
  const isGuardRail = code.includes('GUARDRAIL');
  const isBollard = code.includes('BOLLARD');

  if (isHydrant) {
    // 소화전 캐비닛 — 빨간 상자 + 유리창 + 호스
    const redBody = '#CC2222';
    const doorRed = '#DD3333';
    const strokeColor = '#882222';

    // 본체
    drawIsoBox(ctx, -w / 2, 0, -d / 2, w, h, d, cx, cy, scale,
      adjustColor(redBody, 1.1), adjustColor(redBody, 0.75), adjustColor(redBody, 0.85), strokeColor);

    // 문 (전면)
    drawIsoBox(ctx, -w / 2 + w * 0.06, h * 0.06, -d / 2 - 0.005, w * 0.88, h * 0.88, 0.01, cx, cy, scale,
      adjustColor(doorRed, 1.1), adjustColor(doorRed, 0.8), adjustColor(doorRed, 0.9), strokeColor);

    // 유리창 (반투명)
    drawIsoBox(ctx, -w * 0.25, h * 0.35, -d / 2 - 0.01, w * 0.5, h * 0.35, 0.005, cx, cy, scale,
      'rgba(136,204,255,0.4)', 'rgba(100,170,220,0.3)', 'rgba(120,190,240,0.35)');

    // 호스 릴 (내부 원)
    const hoseCenter = isoProject(0, h * 0.45, 0, cx, cy, scale);
    ctx.beginPath();
    ctx.arc(hoseCenter[0], hoseCenter[1], scale * w * 0.2, 0, Math.PI * 2);
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // "소화전" 텍스트 (상단)
    const textPos = isoProject(0, h * 0.85, -d / 2 - 0.015, cx, cy, scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.max(7, scale * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('소화전', textPos[0], textPos[1]);
  } else if (isExtinguisher) {
    // 소화기 — 빨간 원통 + 헤드 + 노즐
    const bodyR = Math.min(w, d) * 0.35;
    const bodyH = h * 0.65;
    const redColor = '#CC2222';
    const darkColor = '#333333';
    const strokeColor = '#881111';

    // 받침대
    drawIsoBox(ctx, -bodyR * 1.5, 0, -bodyR * 1.5, bodyR * 3, 0.03, bodyR * 3, cx, cy, scale,
      '#505050', '#383838', '#404040');

    // 원통 본체 (박스로 근사)
    drawIsoBox(ctx, -bodyR, 0.03, -bodyR, bodyR * 2, bodyH, bodyR * 2, cx, cy, scale,
      adjustColor(redColor, 1.15), adjustColor(redColor, 0.7), adjustColor(redColor, 0.85), strokeColor);

    // 둥근 상단
    drawIsoBox(ctx, -bodyR * 0.9, 0.03 + bodyH, -bodyR * 0.9, bodyR * 1.8, bodyR * 0.5, bodyR * 1.8, cx, cy, scale,
      adjustColor(redColor, 1.2), adjustColor(redColor, 0.8), adjustColor(redColor, 0.9), strokeColor);

    // 헤드 밸브 (검은색)
    drawIsoBox(ctx, -bodyR * 0.4, 0.03 + bodyH + bodyR * 0.5, -bodyR * 0.4, bodyR * 0.8, h * 0.12, bodyR * 0.8, cx, cy, scale,
      adjustColor(darkColor, 1.3), adjustColor(darkColor, 0.8), adjustColor(darkColor, 1.0), '#222');

    // 레버
    const leverStart = isoProject(bodyR * 0.3, 0.03 + bodyH + bodyR * 0.7, 0, cx, cy, scale);
    const leverEnd = isoProject(bodyR * 0.8, 0.03 + bodyH + bodyR * 0.5, 0, cx, cy, scale);
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leverStart[0], leverStart[1]);
    ctx.lineTo(leverEnd[0], leverEnd[1]);
    ctx.stroke();
  } else if (isExitSign) {
    // 비상구 표시등 — 녹색 사인
    const greenColor = '#22AA44';
    const strokeColor = '#116622';

    // 사인 본체
    drawIsoBox(ctx, -w / 2, h * 0.2, -d / 2, w, h * 0.6, d, cx, cy, scale,
      adjustColor(greenColor, 1.2), adjustColor(greenColor, 0.7), adjustColor(greenColor, 0.85), strokeColor);

    // 흰색 패널 (전면)
    drawIsoBox(ctx, -w * 0.4, h * 0.3, -d / 2 - 0.003, w * 0.8, h * 0.4, 0.003, cx, cy, scale,
      '#FFFFFF', '#E0E0E0', '#F0F0F0');

    // 비상구 아이콘 (화살표 텍스트)
    const arrowPos = isoProject(0, h * 0.5, -d / 2 - 0.006, cx, cy, scale);
    ctx.fillStyle = '#22AA44';
    ctx.font = `bold ${Math.max(8, scale * 0.12)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🚪→', arrowPos[0], arrowPos[1]);

    // 브라켓
    drawIsoBox(ctx, -0.015, 0, d / 2 - 0.015, 0.03, h * 0.22, 0.015, cx, cy, scale,
      '#606060', '#484848', '#505050');
  } else if (isGuardRail) {
    // 안전 가드레일 — 노란 수평 레일 + 기둥
    const railLen = Math.max(w, d);
    const postColor = '#CCAA10';
    const railColor = '#DDC020';
    const strokeColor = '#887700';
    const postCount = Math.max(2, Math.ceil(railLen / 1.5) + 1);

    // 기둥
    for (let i = 0; i < postCount; i++) {
      const t = i / (postCount - 1);
      const z = -railLen / 2 + t * railLen;
      // 바닥 플레이트
      drawIsoBox(ctx, -0.1, 0, z - 0.1, 0.2, 0.02, 0.2, cx, cy, scale,
        '#606060', '#484848', '#505050');
      // 기둥
      drawIsoBox(ctx, -0.04, 0.02, z - 0.04, 0.08, h - 0.02, 0.08, cx, cy, scale,
        adjustColor(postColor, 1.15), adjustColor(postColor, 0.75), adjustColor(postColor, 0.9), strokeColor);
    }

    // 상단 레일
    drawIsoBox(ctx, -0.03, h * 0.85, -railLen / 2, 0.06, 0.06, railLen, cx, cy, scale,
      adjustColor(railColor, 1.2), adjustColor(railColor, 0.75), adjustColor(railColor, 0.9), strokeColor);

    // 중간 레일
    drawIsoBox(ctx, -0.03, h * 0.45, -railLen / 2, 0.06, 0.06, railLen, cx, cy, scale,
      adjustColor(railColor, 1.2), adjustColor(railColor, 0.75), adjustColor(railColor, 0.9), strokeColor);
  } else if (isBollard) {
    // 안전 볼라드 — 노란 원통
    const r = Math.min(w, d) * 0.4;
    const warningColor = '#FFD700';
    const strokeColor = '#AA8800';

    // 바닥 플레이트
    drawIsoBox(ctx, -r * 2, 0, -r * 2, r * 4, 0.03, r * 4, cx, cy, scale,
      '#606060', '#484848', '#505050');

    // 볼라드 본체 (박스로 근사)
    drawIsoBox(ctx, -r, 0.03, -r, r * 2, h - 0.03, r * 2, cx, cy, scale,
      adjustColor(warningColor, 1.1), adjustColor(warningColor, 0.7), adjustColor(warningColor, 0.85), strokeColor);

    // 검은 줄무늬
    drawIsoBox(ctx, -r * 1.02, h * 0.6, -r * 1.02, r * 2.04, 0.06, r * 2.04, cx, cy, scale,
      '#333', '#222', '#2A2A2A');
    drawIsoBox(ctx, -r * 1.02, h * 0.3, -r * 1.02, r * 2.04, 0.06, r * 2.04, cx, cy, scale,
      '#333', '#222', '#2A2A2A');

    // 반사띠
    drawIsoBox(ctx, -r * 1.01, h * 0.8, -r * 1.01, r * 2.02, 0.04, r * 2.02, cx, cy, scale,
      '#FFFFFF', '#E0E0E0', '#F0F0F0');
  }
}

// 시설물
function drawFacility(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  w: number, d: number, h: number,
  code: string,
) {
  const isColumn = code.includes('COLUMN');
  const isPanel = code.includes('PANEL');
  const isTrash = code.includes('TRASH');

  if (isColumn) {
    // 건물 기둥 — 콘크리트/H형강
    const concreteColor = '#A0A0A0';
    const baseColor = '#888888';
    const strokeColor = '#606060';

    // 기초
    drawIsoBox(ctx, -w * 0.65, 0, -d * 0.65, w * 1.3, 0.1, d * 1.3, cx, cy, scale,
      adjustColor(baseColor, 1.1), adjustColor(baseColor, 0.75), adjustColor(baseColor, 0.85), strokeColor);

    // 기둥 본체
    drawIsoBox(ctx, -w / 2, 0.1, -d / 2, w, h - 0.16, d, cx, cy, scale,
      adjustColor(concreteColor, 1.1), adjustColor(concreteColor, 0.8), adjustColor(concreteColor, 0.9), strokeColor);

    // 상단 캡
    drawIsoBox(ctx, -w * 0.575, h - 0.06, -d * 0.575, w * 1.15, 0.06, d * 1.15, cx, cy, scale,
      adjustColor(baseColor, 1.15), adjustColor(baseColor, 0.8), adjustColor(baseColor, 0.9), strokeColor);
  } else if (isPanel) {
    // 배전반 — 회색 캐비닛
    const panelColor = '#505860';
    const strokeColor = '#303840';

    // 본체
    drawIsoBox(ctx, -w / 2, 0, -d / 2, w, h, d, cx, cy, scale,
      adjustColor(panelColor, 1.15), adjustColor(panelColor, 0.8), adjustColor(panelColor, 0.9), strokeColor);

    // 문 (전면)
    drawIsoBox(ctx, -w / 2 + w * 0.05, h * 0.05, -d / 2 - 0.005, w * 0.9, h * 0.9, 0.01, cx, cy, scale,
      adjustColor(panelColor, 1.25), adjustColor(panelColor, 0.85), adjustColor(panelColor, 0.95), strokeColor);

    // 손잡이
    const handlePos = isoProject(w * 0.35, h / 2, -d / 2 - 0.012, cx, cy, scale);
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.arc(handlePos[0], handlePos[1], scale * 0.03, 0, Math.PI * 2);
    ctx.fill();

    // ⚡ 경고 표시
    const warnPos = isoProject(0, h * 0.7, -d / 2 - 0.012, cx, cy, scale);
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${Math.max(10, scale * 0.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⚡', warnPos[0], warnPos[1]);
  } else if (isTrash) {
    // 분리수거함 세트 — 3칸 (색상 구분)
    const colors = ['#3B82F6', '#22C55E', '#EF4444']; // 재활용/일반/위험물
    const binW = w / 3 - 0.02;
    const strokeColor = '#404040';

    for (let i = 0; i < 3; i++) {
      const x = -w / 2 + i * (binW + 0.02) + 0.01;
      drawIsoBox(ctx, x, 0, -d / 2, binW, h, d, cx, cy, scale,
        adjustColor(colors[i], 1.1), adjustColor(colors[i], 0.7), adjustColor(colors[i], 0.85), strokeColor);

      // 뚜껑
      drawIsoBox(ctx, x - 0.01, h, -d / 2 - 0.01, binW + 0.02, 0.03, d + 0.02, cx, cy, scale,
        adjustColor(colors[i], 1.3), adjustColor(colors[i], 0.9), adjustColor(colors[i], 1.0));
    }
  }
}
