import { useMemo } from 'react';
import type { WarehouseTemplate, WizardFormData } from '../../types/warehouse-template';

interface TemplatePreviewProps {
  template: WarehouseTemplate;
  form: WizardFormData;
  isSelected: boolean;
  industryColor: string;
}

// 업종별 특수 구역 설정
const INDUSTRY_FEATURES: Record<string, {
  specialZones: { label: string; color: string; position: 'left' | 'right' | 'bottom-left' | 'bottom-right' }[];
  ambientColor: string;
  floorTint: string;
}> = {
  FOOD_BEVERAGE: {
    specialZones: [],
    ambientColor: '#22c55e',
    floorTint: '#0a1a10',
  },
  AUTO_PARTS: {
    specialZones: [{ label: '중량물\n구역', color: '#ef4444', position: 'bottom-right' }],
    ambientColor: '#ef4444',
    floorTint: '#1a0a0a',
  },
  ELECTRONICS_FC: {
    specialZones: [{ label: '피킹\n스테이션', color: '#3b82f6', position: 'right' }],
    ambientColor: '#3b82f6',
    floorTint: '#0a0f1a',
  },
  COLD_CHAIN: {
    specialZones: [{ label: '냉동\n-25°C', color: '#06b6d4', position: 'bottom-left' }],
    ambientColor: '#06b6d4',
    floorTint: '#0a1519',
  },
  CHEMICAL: {
    specialZones: [
      { label: '위험물\n격리', color: '#f97316', position: 'bottom-left' },
      { label: '방폭\n구역', color: '#ef4444', position: 'bottom-right' },
    ],
    ambientColor: '#f97316',
    floorTint: '#1a1208',
  },
  PHARMACEUTICAL: {
    specialZones: [{ label: 'GMP\n클린룸', color: '#ec4899', position: 'bottom-left' }],
    ambientColor: '#ec4899',
    floorTint: '#1a0a14',
  },
  EXPORT_EU: {
    specialZones: [],
    ambientColor: '#8b5cf6',
    floorTint: '#100a1a',
  },
};

// 변형별 레이아웃 특성
interface LayoutConfig {
  rackRows: { x: number; z: number; w: number; d: number; paired?: boolean }[];
  aisles: { x: number; z: number; w: number; d: number }[];
  dockArea?: { x: number; z: number; w: number; d: number; containers?: number };
  stagingIn?: { x: number; z: number; w: number; d: number };
  stagingOut?: { x: number; z: number; w: number; d: number };
  workstations?: { x: number; z: number; label: string }[];
  mainAisle?: { x: number; z: number; w: number; d: number };
  specialAreas?: { x: number; z: number; w: number; d: number; label: string; color: string }[];
  flowArrows?: { x1: number; z1: number; x2: number; z2: number }[];
}

/**
 * 템플릿 파라미터 기반 레이아웃 계산
 */
function computeLayout(template: WarehouseTemplate, form: WizardFormData): LayoutConfig {
  const W = 100; // SVG 정규화 너비
  const H = 100; // SVG 정규화 높이

  const rack = template.rackPreset ?? { width: 2.7, depth: 1.1, height: 5.4, levels: 3, code: 'RACK' };
  const aisleW = template.aisleWidth;
  const mainAisleW = template.mainAisleWidth;
  const isBackToBack = template.rackLayout === 'BACK_TO_BACK';
  const hasContainer = !!template.containerPresetId;
  const variant = (template.metadata as Record<string, unknown>)?.variant as string ?? '';

  // 실제 면적 기준 정규화 비율
  const aW = form.areaWidth;
  const aD = form.areaDepth;
  const sx = W / aW;
  const sz = H / aD;

  const config: LayoutConfig = { rackRows: [], aisles: [] };

  // 도크 영역
  const DOCK_DEPTH = hasContainer ? 14.2 : 6;
  const STAGING_DEPTH = 5;
  const STAGING_Z = DOCK_DEPTH + 1;
  const EMERGENCY_Z = STAGING_Z + STAGING_DEPTH + 0.5;
  const STORAGE_Z = EMERGENCY_Z + 2;

  if (hasContainer) {
    config.dockArea = {
      x: 2 * sx, z: 1 * sz,
      w: (aW - 4) * sx, d: DOCK_DEPTH * sz,
      containers: Math.min(3, Math.floor((aW - 4) / 4.5)),
    };
  } else {
    config.dockArea = {
      x: 2 * sx, z: 1 * sz,
      w: (aW - 4) * sx, d: 5 * sz,
    };
  }

  // 스테이징
  config.stagingIn = {
    x: 2 * sx, z: STAGING_Z * sz,
    w: (aW / 2 - 3) * sx, d: STAGING_DEPTH * sz,
  };
  config.stagingOut = {
    x: (aW / 2 + 1) * sx, z: STAGING_Z * sz,
    w: (aW / 2 - 3) * sx, d: STAGING_DEPTH * sz,
  };

  // 랙 배치 계산
  const rackW = rack.width;
  const rackD = rack.depth;
  const rackGap = 0.1;
  const storageAreaW = aW - mainAisleW - 6;
  const racksPerRow = Math.max(1, Math.floor(storageAreaW / (rackW + rackGap)));
  const rowWidth = racksPerRow * (rackW + rackGap);
  const storageOriginX = 3;

  const pairDepth = isBackToBack ? rackD * 2 + 0.1 : rackD;
  const rowPitch = pairDepth + aisleW;
  const availableStorageD = aD - STORAGE_Z - 3;
  const pairCount = Math.max(1, Math.floor(availableStorageD / rowPitch));

  // 랙 배치
  for (let pair = 0; pair < pairCount; pair++) {
    const centerZ = STORAGE_Z + pair * rowPitch + pairDepth / 2;

    if (isBackToBack) {
      const frontZ = centerZ - rackD / 2 - 0.05;
      const backZ = centerZ + rackD / 2 + 0.05;

      for (let i = 0; i < racksPerRow; i++) {
        const x = storageOriginX + i * (rackW + rackGap);
        config.rackRows.push({
          x: x * sx, z: frontZ * sz,
          w: rackW * sx, d: rackD * sz,
          paired: true,
        });
        config.rackRows.push({
          x: x * sx, z: backZ * sz,
          w: rackW * sx, d: rackD * sz,
          paired: true,
        });
      }
    } else {
      for (let i = 0; i < racksPerRow; i++) {
        const x = storageOriginX + i * (rackW + rackGap);
        config.rackRows.push({
          x: x * sx, z: centerZ * sz,
          w: rackW * sx, d: rackD * sz,
        });
      }
    }

    // 통로
    if (pair === 0) {
      config.aisles.push({
        x: storageOriginX * sx,
        z: (STORAGE_Z + pair * rowPitch - aisleW / 2) * sz,
        w: rowWidth * sx, d: aisleW * sz,
      });
    }
    config.aisles.push({
      x: storageOriginX * sx,
      z: (STORAGE_Z + pair * rowPitch + pairDepth + aisleW / 2) * sz,
      w: rowWidth * sx, d: aisleW * sz,
    });
  }

  // 주 통로
  config.mainAisle = {
    x: (storageOriginX + rowWidth + 0.5) * sx,
    z: STORAGE_Z * sz,
    w: mainAisleW * sx,
    d: (pairCount * rowPitch) * sz,
  };

  // 작업대
  config.workstations = [
    { x: (aW - 2) * sx, z: (STAGING_Z + 1) * sz, label: 'QC' },
    { x: (aW - 2) * sx, z: (STAGING_Z + 3) * sz, label: 'PKG' },
  ];

  // 변형별 특수 구역
  config.specialAreas = [];

  // 크로스도크
  if (variant === 'cross-dock') {
    config.specialAreas.push({
      x: 5 * sx, z: (aD - 10) * sz,
      w: (aW - 10) * sx, d: 8 * sz,
      label: '크로스도크 구역', color: '#8b5cf6',
    });
  }

  // 화학물질 안전 구역
  if ((template.metadata as Record<string, unknown>)?.hazmat) {
    config.specialAreas.push({
      x: 2 * sx, z: (aD - 8) * sz,
      w: 12 * sx, d: 6 * sz,
      label: '위험물 격리', color: '#f97316',
    });
  }

  // GMP 클린룸
  if ((template.metadata as Record<string, unknown>)?.gmpCompliant) {
    config.specialAreas.push({
      x: 2 * sx, z: (aD - 8) * sz,
      w: 12 * sx, d: 6 * sz,
      label: 'GMP 클린', color: '#ec4899',
    });
  }

  // 냉장 구역
  if ((template.metadata as Record<string, unknown>)?.temperatureRange) {
    const tempRange = (template.metadata as Record<string, unknown>).temperatureRange as string;
    if (tempRange.includes('-')) {
      config.specialAreas.push({
        x: 2 * sx, z: (aD - 8) * sz,
        w: 14 * sx, d: 6 * sz,
        label: `냉동 ${tempRange}`, color: '#06b6d4',
      });
    }
  }

  // FIFO/FEFO 플로우 화살표
  const method = (template.metadata as Record<string, unknown>)?.inventoryMethod as string;
  if (method === 'FIFO' || method === 'FEFO') {
    config.flowArrows = [
      { x1: W / 4, z1: 8, x2: W / 4, z2: 20 },
      { x1: W * 3 / 4, z1: 20, x2: W * 3 / 4, z2: 8 },
    ];
  }

  return config;
}

/**
 * 템플릿 미리보기 — 2D 탑뷰 SVG (업종별 고유 레이아웃)
 */
export function TemplatePreview({ template, form, isSelected, industryColor }: TemplatePreviewProps) {
  const layout = useMemo(() => computeLayout(template, form), [template, form]);
  const features = INDUSTRY_FEATURES[template.industry] ?? INDUSTRY_FEATURES.FOOD_BEVERAGE;

  const rackColor = isSelected ? industryColor : '#4a5568';
  const rackOpacity = isSelected ? 0.85 : 0.5;
  const aisleColor = isSelected ? '#2D7DD2' : '#1e293b';
  const bgColor = isSelected ? features.floorTint : '#0D1117';

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        background: bgColor,
        border: `1px solid ${isSelected ? `${industryColor}30` : '#21262D'}`,
        height: 160,
      }}
    >
      {/* 그리드 패턴 배경 */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
        <defs>
          <pattern id={`grid-${template.id}`} width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke={isSelected ? `${industryColor}10` : '#ffffff06'} strokeWidth="0.2" />
          </pattern>
          {/* 해치 패턴 (특수 구역용) */}
          <pattern id={`hatch-${template.id}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke={industryColor} strokeWidth="0.5" opacity="0.15" />
          </pattern>
        </defs>

        {/* 배경 */}
        <rect width="100" height="100" fill={bgColor} />
        <rect width="100" height="100" fill={`url(#grid-${template.id})`} />

        {/* 건물 외곽선 */}
        <rect x="1" y="1" width="98" height="98" rx="1" fill="none" stroke={isSelected ? `${industryColor}40` : '#21262D'} strokeWidth="0.5" strokeDasharray="2,1" />

        {/* 도크 영역 */}
        {layout.dockArea && (
          <g>
            <rect
              x={layout.dockArea.x} y={layout.dockArea.z}
              width={layout.dockArea.w} height={layout.dockArea.d}
              fill={isSelected ? `${industryColor}08` : '#ffffff04'}
              stroke={isSelected ? `${industryColor}20` : '#ffffff08'}
              strokeWidth="0.3"
              rx="0.5"
            />
            {/* 도크 도어 표시 */}
            {[0.25, 0.5, 0.75].map((ratio, i) => (
              <rect key={i} x={layout.dockArea!.x + layout.dockArea!.w * ratio - 3} y={0.5} width={6} height={1.5} fill={isSelected ? `${industryColor}40` : '#ffffff15'} rx="0.3" />
            ))}
            {/* 컨테이너 */}
            {layout.dockArea.containers && Array.from({ length: layout.dockArea.containers }).map((_, i) => {
              const cw = 6;
              const cd = layout.dockArea!.d * 0.7;
              const spacing = (layout.dockArea!.w - layout.dockArea!.containers! * cw) / (layout.dockArea!.containers! + 1);
              const cx = layout.dockArea!.x + spacing + i * (cw + spacing);
              return (
                <g key={i}>
                  <rect x={cx} y={layout.dockArea!.z + 1} width={cw} height={cd} fill={isSelected ? '#1d4ed820' : '#ffffff06'} stroke={isSelected ? '#1d4ed840' : '#ffffff10'} strokeWidth="0.3" rx="0.3" />
                  {/* 컨테이너 내부 라인 */}
                  <line x1={cx + cw / 2} y1={layout.dockArea!.z + 1} x2={cx + cw / 2} y2={layout.dockArea!.z + 1 + cd} stroke={isSelected ? '#1d4ed820' : '#ffffff05'} strokeWidth="0.2" />
                </g>
              );
            })}
            <text x={layout.dockArea.x + layout.dockArea.w / 2} y={layout.dockArea.z + layout.dockArea.d / 2} textAnchor="middle" dominantBaseline="central" fill={isSelected ? `${industryColor}60` : '#ffffff20'} fontSize="2.5" fontWeight="600">
              DOCK
            </text>
          </g>
        )}

        {/* 입고 스테이징 */}
        {layout.stagingIn && (
          <g>
            <rect
              x={layout.stagingIn.x} y={layout.stagingIn.z}
              width={layout.stagingIn.w} height={layout.stagingIn.d}
              fill={isSelected ? '#3b82f608' : '#ffffff03'}
              stroke={isSelected ? '#3b82f620' : '#ffffff08'}
              strokeWidth="0.3"
              rx="0.5"
            />
            <text x={layout.stagingIn.x + layout.stagingIn.w / 2} y={layout.stagingIn.z + layout.stagingIn.d / 2} textAnchor="middle" dominantBaseline="central" fill={isSelected ? '#3b82f660' : '#ffffff15'} fontSize="2" fontWeight="500">
              IN
            </text>
          </g>
        )}

        {/* 출고 스테이징 */}
        {layout.stagingOut && (
          <g>
            <rect
              x={layout.stagingOut.x} y={layout.stagingOut.z}
              width={layout.stagingOut.w} height={layout.stagingOut.d}
              fill={isSelected ? '#10b98108' : '#ffffff03'}
              stroke={isSelected ? '#10b98120' : '#ffffff08'}
              strokeWidth="0.3"
              rx="0.5"
            />
            <text x={layout.stagingOut.x + layout.stagingOut.w / 2} y={layout.stagingOut.z + layout.stagingOut.d / 2} textAnchor="middle" dominantBaseline="central" fill={isSelected ? '#10b98160' : '#ffffff15'} fontSize="2" fontWeight="500">
              OUT
            </text>
          </g>
        )}

        {/* 비상 통로 */}
        <rect x="2" y={(layout.stagingIn?.z ?? 20) + (layout.stagingIn?.d ?? 8) + 1} width="96" height="1.2" fill={isSelected ? '#f43f5e15' : '#ffffff04'} rx="0.2" />

        {/* 작업 통로 */}
        {layout.aisles.map((a, i) => (
          <rect key={`aisle-${i}`} x={a.x} y={a.z} width={a.w} height={Math.max(a.d, 1)} fill={aisleColor} opacity={isSelected ? 0.15 : 0.08} rx="0.2" />
        ))}

        {/* 주 통로 */}
        {layout.mainAisle && (
          <g>
            <rect
              x={layout.mainAisle.x} y={layout.mainAisle.z}
              width={layout.mainAisle.w} height={layout.mainAisle.d}
              fill={isSelected ? '#64748b15' : '#ffffff06'}
              rx="0.3"
            />
            {/* 지게차 방향 화살표 */}
            {[0.3, 0.5, 0.7].map((ratio, i) => (
              <polygon
                key={i}
                points={`${layout.mainAisle!.x + layout.mainAisle!.w / 2},${layout.mainAisle!.z + layout.mainAisle!.d * ratio - 1} ${layout.mainAisle!.x + layout.mainAisle!.w / 2 - 0.8},${layout.mainAisle!.z + layout.mainAisle!.d * ratio + 0.5} ${layout.mainAisle!.x + layout.mainAisle!.w / 2 + 0.8},${layout.mainAisle!.z + layout.mainAisle!.d * ratio + 0.5}`}
                fill={isSelected ? '#64748b30' : '#ffffff10'}
              />
            ))}
          </g>
        )}

        {/* 랙 배치 */}
        {layout.rackRows.map((r, i) => (
          <rect
            key={`rack-${i}`}
            x={r.x} y={r.z}
            width={Math.max(r.w, 0.5)} height={Math.max(r.d, 0.5)}
            fill={rackColor}
            opacity={rackOpacity}
            rx="0.2"
          />
        ))}

        {/* 특수 구역 */}
        {layout.specialAreas?.map((area, i) => (
          <g key={`special-${i}`}>
            <rect
              x={area.x} y={area.z}
              width={area.w} height={area.d}
              fill={`url(#hatch-${template.id})`}
              stroke={`${area.color}40`}
              strokeWidth="0.4"
              strokeDasharray="1.5,0.5"
              rx="0.5"
            />
            <text x={area.x + area.w / 2} y={area.z + area.d / 2} textAnchor="middle" dominantBaseline="central" fill={`${area.color}80`} fontSize="2" fontWeight="600">
              {area.label}
            </text>
          </g>
        ))}

        {/* 플로우 화살표 */}
        {layout.flowArrows?.map((arrow, i) => (
          <g key={`flow-${i}`} opacity={isSelected ? 0.4 : 0.15}>
            <line x1={arrow.x1} y1={arrow.z1} x2={arrow.x2} y2={arrow.z2} stroke={industryColor} strokeWidth="0.3" strokeDasharray="1,1" />
            <polygon
              points={`${arrow.x2},${arrow.z2} ${arrow.x2 - 0.8},${arrow.z2 + (arrow.z2 > arrow.z1 ? -1.5 : 1.5)} ${arrow.x2 + 0.8},${arrow.z2 + (arrow.z2 > arrow.z1 ? -1.5 : 1.5)}`}
              fill={industryColor}
            />
          </g>
        ))}

        {/* 작업대 */}
        {layout.workstations?.map((ws, i) => (
          <g key={`ws-${i}`}>
            <rect x={ws.x - 1.5} y={ws.z - 1} width={3} height={2} fill={isSelected ? `${industryColor}15` : '#ffffff06'} stroke={isSelected ? `${industryColor}30` : '#ffffff10'} strokeWidth="0.3" rx="0.3" />
            <text x={ws.x} y={ws.z} textAnchor="middle" dominantBaseline="central" fill={isSelected ? `${industryColor}50` : '#ffffff15'} fontSize="1.5" fontWeight="500">
              {ws.label}
            </text>
          </g>
        ))}
      </svg>

      {/* 레이아웃 타입 라벨 */}
      <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
        <span
          className="rounded px-1.5 py-0.5 text-[8px] font-semibold tracking-wider uppercase"
          style={{
            background: isSelected ? `${industryColor}20` : '#21262D80',
            color: isSelected ? industryColor : '#6b7280',
            border: `1px solid ${isSelected ? `${industryColor}30` : '#21262D'}`,
          }}
        >
          {template.rackLayout === 'BACK_TO_BACK' ? 'B2B' : 'SINGLE'}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[8px] font-medium"
          style={{
            background: '#00000040',
            color: isSelected ? '#9ca3af' : '#6b7280',
          }}
        >
          {form.areaWidth}×{form.areaDepth}m
        </span>
      </div>

      {/* 업종 아이콘 (우측 하단) */}
      <div className="absolute bottom-1.5 right-2">
        <IndustryIcon industry={template.industry} color={isSelected ? industryColor : '#4b5563'} size={14} />
      </div>

      {/* 선택 시 글로우 효과 */}
      {isSelected && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            boxShadow: `inset 0 0 20px ${industryColor}10`,
          }}
        />
      )}
    </div>
  );
}

// 업종별 미니 아이콘
function IndustryIcon({ industry, color, size }: { industry: string; color: string; size: number }) {
  const s = size;
  switch (industry) {
    case 'FOOD_BEVERAGE':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      );
    case 'AUTO_PARTS':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
      );
    case 'ELECTRONICS_FC':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case 'COLD_CHAIN':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
          <line x1="12" y1="2" x2="12" y2="22" />
          <path d="M20 12H4M17.2 7.2 12 12l5.2 4.8M6.8 7.2 12 12l-5.2 4.8M17.2 16.8 12 12M6.8 16.8 12 12" />
        </svg>
      );
    case 'CHEMICAL':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
          <path d="M10 2v6l-6 9.7A1 1 0 0 0 4.8 19h14.4a1 1 0 0 0 .8-1.3L14 8V2" />
          <line x1="8.5" y1="2" x2="15.5" y2="2" />
          <circle cx="12" cy="14" r="1" fill={color} />
        </svg>
      );
    case 'PHARMACEUTICAL':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
          <path d="M5 12h14M12 5v14" />
          <rect x="3" y="3" width="18" height="18" rx="3" />
        </svg>
      );
    case 'EXPORT_EU':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    default:
      return null;
  }
}
