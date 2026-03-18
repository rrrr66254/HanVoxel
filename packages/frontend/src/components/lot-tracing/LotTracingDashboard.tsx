import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Search, ChevronRight, ChevronDown, AlertTriangle, Download } from 'lucide-react';

// ── 다크 테마 색상 상수 ──────────────────────────────────
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  hoverRow: '#1C2128',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  blue: '#58A6FF',
  green: '#3FB950',
  orange: '#D29922',
  red: '#F85149',
} as const;

// ── 타입 정의 ─────────────────────────────────────────────

/** 로트 유형 */
type LotType = 'RAW' | 'WIP' | 'FINISHED';

/** 로트 상태 */
type LotStatus = 'ACTIVE' | 'CONSUMED' | 'QUARANTINE' | 'SCRAPPED';

/** 추적 방향 */
type TraceDirection = 'FORWARD' | 'BACKWARD';

/** 탭 식별자 */
type TabId = 'lot-list' | 'tracing' | 'recall';

/** 로트 레코드 */
interface LotRecord {
  id: string;
  lotNumber: string;
  sku: string;
  skuName: string;
  lotType: LotType;
  quantity: number;
  remainingQty: number;
  status: LotStatus;
  receivedAt: string;       // 입고/생산일 (ISO)
  expiresAt: string | null; // 유효기간 (ISO)
  vendorName: string | null;
}

/** 추적 트리 노드 */
interface TraceNode {
  id: string;
  nodeType: 'RAW_LOT' | 'PRODUCTION_ORDER' | 'FINISHED_LOT' | 'OUTBOUND_ORDER';
  label: string;
  lotNumber: string | null;
  sku: string | null;
  quantity: number | null;
  date: string;
  vendorName: string | null;
  customerName: string | null;
  children: TraceNode[];
}

/** 리콜 분석 결과 */
interface RecallResult {
  sourceLot: string;
  affectedProducts: Array<{
    lotNumber: string;
    sku: string;
    skuName: string;
    quantity: number;
  }>;
  shippedOrders: Array<{
    orderNumber: string;
    customerName: string;
    shippedAt: string;
    quantity: number;
  }>;
  totalAffectedQty: number;
}

/** 컴포넌트 Props */
interface LotTracingDashboardProps {
  onBack: () => void;
}

// ── localStorage 키 ──────────────────────────────────────
const STORAGE_KEY = 'hanvoxel_lot_tracing_data';

// ── 목 데이터 생성 ──────────────────────────────────────

/** 초기 로트 목 데이터 */
const generateMockLots = (): LotRecord[] => [
  {
    id: 'lot-1', lotNumber: 'LOT-RAW-20260201-001', sku: 'RAW-STEEL-001',
    skuName: '냉연강판 1.2mm', lotType: 'RAW', quantity: 5000, remainingQty: 3200,
    status: 'ACTIVE', receivedAt: '2026-02-01T09:00:00Z', expiresAt: null,
    vendorName: '포스코',
  },
  {
    id: 'lot-2', lotNumber: 'LOT-RAW-20260210-002', sku: 'RAW-PLASTIC-001',
    skuName: 'ABS 수지 펠렛', lotType: 'RAW', quantity: 2000, remainingQty: 0,
    status: 'CONSUMED', receivedAt: '2026-02-10T10:30:00Z', expiresAt: '2027-02-10T00:00:00Z',
    vendorName: 'LG화학',
  },
  {
    id: 'lot-3', lotNumber: 'LOT-RAW-20260215-003', sku: 'RAW-RUBBER-001',
    skuName: '합성고무 시트', lotType: 'RAW', quantity: 800, remainingQty: 800,
    status: 'QUARANTINE', receivedAt: '2026-02-15T14:00:00Z', expiresAt: '2026-04-15T00:00:00Z',
    vendorName: '금호석유화학',
  },
  {
    id: 'lot-4', lotNumber: 'LOT-WIP-20260220-001', sku: 'WIP-BRACKET-001',
    skuName: '브레이크 브래킷 (가공중)', lotType: 'WIP', quantity: 1200, remainingQty: 600,
    status: 'ACTIVE', receivedAt: '2026-02-20T08:00:00Z', expiresAt: null,
    vendorName: null,
  },
  {
    id: 'lot-5', lotNumber: 'LOT-FIN-20260225-001', sku: 'FIN-BRAKE-001',
    skuName: '디스크 브레이크 어셈블리', lotType: 'FINISHED', quantity: 500, remainingQty: 120,
    status: 'ACTIVE', receivedAt: '2026-02-25T16:00:00Z', expiresAt: '2028-02-25T00:00:00Z',
    vendorName: null,
  },
  {
    id: 'lot-6', lotNumber: 'LOT-FIN-20260301-002', sku: 'FIN-ABSORBER-001',
    skuName: '쇽업소버 모듈', lotType: 'FINISHED', quantity: 300, remainingQty: 0,
    status: 'CONSUMED', receivedAt: '2026-03-01T11:00:00Z', expiresAt: '2028-03-01T00:00:00Z',
    vendorName: null,
  },
  {
    id: 'lot-7', lotNumber: 'LOT-RAW-20260305-004', sku: 'RAW-BOLT-001',
    skuName: '고강도 볼트 M12', lotType: 'RAW', quantity: 10000, remainingQty: 0,
    status: 'SCRAPPED', receivedAt: '2026-03-05T09:30:00Z', expiresAt: null,
    vendorName: '대한볼트',
  },
  {
    id: 'lot-8', lotNumber: 'LOT-FIN-20260310-003', sku: 'FIN-CALIPER-001',
    skuName: '브레이크 캘리퍼', lotType: 'FINISHED', quantity: 250, remainingQty: 250,
    status: 'ACTIVE', receivedAt: '2026-03-10T13:00:00Z', expiresAt: '2026-04-10T00:00:00Z',
    vendorName: null,
  },
  {
    id: 'lot-9', lotNumber: 'LOT-WIP-20260312-002', sku: 'WIP-HOUSING-001',
    skuName: '캘리퍼 하우징 (도장중)', lotType: 'WIP', quantity: 400, remainingQty: 400,
    status: 'ACTIVE', receivedAt: '2026-03-12T07:30:00Z', expiresAt: null,
    vendorName: null,
  },
  {
    id: 'lot-10', lotNumber: 'LOT-RAW-20260315-005', sku: 'RAW-ALUMINUM-001',
    skuName: '알루미늄 잉곳 A356', lotType: 'RAW', quantity: 3000, remainingQty: 2800,
    status: 'ACTIVE', receivedAt: '2026-03-15T10:00:00Z', expiresAt: null,
    vendorName: '노벨리스코리아',
  },
];

/** 순방향 추적 목 데이터 */
const generateForwardTrace = (lotNumber: string): TraceNode | null => {
  // 원자재 → 생산오더 → 완제품 → 출하 순방향 추적
  if (lotNumber.includes('RAW')) {
    return {
      id: 'ft-1', nodeType: 'RAW_LOT', label: '원자재 로트',
      lotNumber, sku: 'RAW-STEEL-001', quantity: 5000,
      date: '2026-02-01', vendorName: '포스코', customerName: null,
      children: [
        {
          id: 'ft-2', nodeType: 'PRODUCTION_ORDER', label: '생산 오더',
          lotNumber: 'PO-20260220-001', sku: null, quantity: 1200,
          date: '2026-02-20', vendorName: null, customerName: null,
          children: [
            {
              id: 'ft-3', nodeType: 'FINISHED_LOT', label: '완제품 로트',
              lotNumber: 'LOT-FIN-20260225-001', sku: 'FIN-BRAKE-001', quantity: 500,
              date: '2026-02-25', vendorName: null, customerName: null,
              children: [
                {
                  id: 'ft-4', nodeType: 'OUTBOUND_ORDER', label: '출하 오더',
                  lotNumber: 'OB-20260301-001', sku: null, quantity: 200,
                  date: '2026-03-01', vendorName: null, customerName: '현대자동차',
                  children: [],
                },
                {
                  id: 'ft-5', nodeType: 'OUTBOUND_ORDER', label: '출하 오더',
                  lotNumber: 'OB-20260310-002', sku: null, quantity: 180,
                  date: '2026-03-10', vendorName: null, customerName: '기아자동차',
                  children: [],
                },
              ],
            },
          ],
        },
        {
          id: 'ft-6', nodeType: 'PRODUCTION_ORDER', label: '생산 오더',
          lotNumber: 'PO-20260305-002', sku: null, quantity: 800,
          date: '2026-03-05', vendorName: null, customerName: null,
          children: [
            {
              id: 'ft-7', nodeType: 'FINISHED_LOT', label: '완제품 로트',
              lotNumber: 'LOT-FIN-20260310-003', sku: 'FIN-CALIPER-001', quantity: 250,
              date: '2026-03-10', vendorName: null, customerName: null,
              children: [],
            },
          ],
        },
      ],
    };
  }
  return null;
};

/** 역방향 추적 목 데이터 */
const generateBackwardTrace = (lotNumber: string): TraceNode | null => {
  // 완제품 → 원자재 + 공급업체 역방향 추적
  if (lotNumber.includes('FIN')) {
    return {
      id: 'bt-1', nodeType: 'FINISHED_LOT', label: '완제품 로트',
      lotNumber, sku: 'FIN-BRAKE-001', quantity: 500,
      date: '2026-02-25', vendorName: null, customerName: null,
      children: [
        {
          id: 'bt-2', nodeType: 'PRODUCTION_ORDER', label: '생산 오더',
          lotNumber: 'PO-20260220-001', sku: null, quantity: 1200,
          date: '2026-02-20', vendorName: null, customerName: null,
          children: [
            {
              id: 'bt-3', nodeType: 'RAW_LOT', label: '원자재 로트',
              lotNumber: 'LOT-RAW-20260201-001', sku: 'RAW-STEEL-001', quantity: 5000,
              date: '2026-02-01', vendorName: '포스코', customerName: null,
              children: [],
            },
            {
              id: 'bt-4', nodeType: 'RAW_LOT', label: '원자재 로트',
              lotNumber: 'LOT-RAW-20260210-002', sku: 'RAW-PLASTIC-001', quantity: 2000,
              date: '2026-02-10', vendorName: 'LG화학', customerName: null,
              children: [],
            },
            {
              id: 'bt-5', nodeType: 'RAW_LOT', label: '원자재 로트',
              lotNumber: 'LOT-RAW-20260305-004', sku: 'RAW-BOLT-001', quantity: 10000,
              date: '2026-03-05', vendorName: '대한볼트', customerName: null,
              children: [],
            },
          ],
        },
      ],
    };
  }
  return null;
};

/** 리콜 분석 목 데이터 */
const generateRecallResult = (lotNumber: string): RecallResult | null => {
  if (!lotNumber) return null;
  return {
    sourceLot: lotNumber,
    affectedProducts: [
      { lotNumber: 'LOT-FIN-20260225-001', sku: 'FIN-BRAKE-001', skuName: '디스크 브레이크 어셈블리', quantity: 500 },
      { lotNumber: 'LOT-FIN-20260310-003', sku: 'FIN-CALIPER-001', skuName: '브레이크 캘리퍼', quantity: 250 },
    ],
    shippedOrders: [
      { orderNumber: 'OB-20260301-001', customerName: '현대자동차', shippedAt: '2026-03-01T14:00:00Z', quantity: 200 },
      { orderNumber: 'OB-20260310-002', customerName: '기아자동차', shippedAt: '2026-03-10T09:00:00Z', quantity: 180 },
      { orderNumber: 'OB-20260315-003', customerName: '쌍용자동차', shippedAt: '2026-03-15T11:30:00Z', quantity: 120 },
    ],
    totalAffectedQty: 750,
  };
};

// ── 유틸리티 ─────────────────────────────────────────────

/** 날짜 포맷 (YYYY-MM-DD) */
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
};

/** 숫자 천 단위 콤마 */
const formatNumber = (n: number): string => n.toLocaleString('ko-KR');

/** 유효기간 30일 이내 경고 여부 */
const isExpiringSoon = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 30;
};

/** 상태 배지 색상 매핑 */
const statusColor = (status: LotStatus): string => {
  switch (status) {
    case 'ACTIVE': return COLORS.green;
    case 'CONSUMED': return COLORS.textMuted;
    case 'QUARANTINE': return COLORS.orange;
    case 'SCRAPPED': return COLORS.red;
  }
};

/** 상태 한국어 라벨 */
const statusLabel = (status: LotStatus): string => {
  switch (status) {
    case 'ACTIVE': return '활성';
    case 'CONSUMED': return '소진';
    case 'QUARANTINE': return '격리';
    case 'SCRAPPED': return '폐기';
  }
};

/** 로트유형 한국어 라벨 */
const lotTypeLabel = (t: LotType): string => {
  switch (t) {
    case 'RAW': return '원자재';
    case 'WIP': return '재공품';
    case 'FINISHED': return '완제품';
  }
};

/** 노드 유형별 색상 */
const nodeTypeColor = (t: TraceNode['nodeType']): string => {
  switch (t) {
    case 'RAW_LOT': return COLORS.blue;
    case 'PRODUCTION_ORDER': return COLORS.orange;
    case 'FINISHED_LOT': return COLORS.green;
    case 'OUTBOUND_ORDER': return COLORS.red;
  }
};

// ── localStorage 헬퍼 ───────────────────────────────────

const loadLots = (): LotRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LotRecord[];
  } catch { /* 파싱 실패 시 기본 데이터 사용 */ }
  const lots = generateMockLots();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lots));
  return lots;
};

// ── 서브 컴포넌트: 추적 트리 노드 ──────────────────────

interface TraceTreeNodeProps {
  node: TraceNode;
  depth: number;
}

/** 재귀적 트리 노드 렌더링 */
function TraceTreeNode({ node, depth }: TraceTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const color = nodeTypeColor(node.nodeType);

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      {/* 연결선 */}
      {depth > 0 && (
        <div style={{
          position: 'relative',
          marginLeft: -12,
          marginBottom: -8,
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: -12,
            width: 12,
            height: 20,
            borderLeft: `2px solid ${COLORS.border}`,
            borderBottom: `2px solid ${COLORS.border}`,
            borderBottomLeftRadius: 6,
          }} />
        </div>
      )}

      {/* 노드 카드 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          marginBottom: 4,
          borderRadius: 6,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.card,
          cursor: hasChildren ? 'pointer' : 'default',
        }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* 확장/접기 아이콘 */}
        {hasChildren ? (
          expanded
            ? <ChevronDown size={14} color={COLORS.textMuted} />
            : <ChevronRight size={14} color={COLORS.textMuted} />
        ) : (
          <span style={{ width: 14, display: 'inline-block' }} />
        )}

        {/* 노드 타입 배지 */}
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 4,
          background: `${color}20`,
          color,
          whiteSpace: 'nowrap',
        }}>
          {node.label}
        </span>

        {/* 로트 번호 / 오더 번호 */}
        <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 500 }}>
          {node.lotNumber}
        </span>

        {/* SKU */}
        {node.sku && (
          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>
            ({node.sku})
          </span>
        )}

        {/* 수량 */}
        {node.quantity !== null && (
          <span style={{ color: COLORS.blue, fontSize: 12, fontWeight: 500 }}>
            {formatNumber(node.quantity)}개
          </span>
        )}

        {/* 날짜 */}
        <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 'auto' }}>
          {node.date}
        </span>

        {/* 공급업체/고객명 */}
        {node.vendorName && (
          <span style={{
            fontSize: 11, padding: '1px 6px', borderRadius: 4,
            background: `${COLORS.blue}20`, color: COLORS.blue,
          }}>
            {node.vendorName}
          </span>
        )}
        {node.customerName && (
          <span style={{
            fontSize: 11, padding: '1px 6px', borderRadius: 4,
            background: `${COLORS.green}20`, color: COLORS.green,
          }}>
            {node.customerName}
          </span>
        )}
      </div>

      {/* 자식 노드 (재귀) */}
      {expanded && node.children.map(child => (
        <TraceTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────

export default function LotTracingDashboard({ onBack }: LotTracingDashboardProps) {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabId>('lot-list');

  // ─ Tab 1: 로트 목록 상태 ─
  const [lots, setLots] = useState<LotRecord[]>([]);
  const [filterType, setFilterType] = useState<LotType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<LotStatus | 'ALL'>('ALL');
  const [skuSearch, setSkuSearch] = useState('');

  // ─ Tab 2: 추적 상태 ─
  const [traceQuery, setTraceQuery] = useState('');
  const [traceDirection, setTraceDirection] = useState<TraceDirection>('FORWARD');
  const [traceResult, setTraceResult] = useState<TraceNode | null>(null);
  const [traceSearched, setTraceSearched] = useState(false);

  // ─ Tab 3: 리콜 상태 ─
  const [recallLotInput, setRecallLotInput] = useState('');
  const [recallResult, setRecallResult] = useState<RecallResult | null>(null);
  const [recallSearched, setRecallSearched] = useState(false);

  // localStorage에서 로트 데이터 로드
  useEffect(() => {
    setLots(loadLots());
  }, []);

  // ── 로트 목록 필터링 ──
  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      if (filterType !== 'ALL' && lot.lotType !== filterType) return false;
      if (filterStatus !== 'ALL' && lot.status !== filterStatus) return false;
      if (skuSearch) {
        const q = skuSearch.toLowerCase();
        const matchSku = lot.sku.toLowerCase().includes(q);
        const matchName = lot.skuName.toLowerCase().includes(q);
        const matchLot = lot.lotNumber.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchLot) return false;
      }
      return true;
    });
  }, [lots, filterType, filterStatus, skuSearch]);

  // ── 추적 실행 ──
  const handleTrace = useCallback(() => {
    if (!traceQuery.trim()) return;
    setTraceSearched(true);
    if (traceDirection === 'FORWARD') {
      setTraceResult(generateForwardTrace(traceQuery.trim()));
    } else {
      setTraceResult(generateBackwardTrace(traceQuery.trim()));
    }
  }, [traceQuery, traceDirection]);

  // ── 리콜 분석 실행 ──
  const handleRecallAnalysis = useCallback(() => {
    if (!recallLotInput.trim()) return;
    setRecallSearched(true);
    setRecallResult(generateRecallResult(recallLotInput.trim()));
  }, [recallLotInput]);

  // ── CSV 내보내기 ──
  const handleExportCsv = useCallback(() => {
    if (!recallResult) return;
    const lines: string[] = [];
    // 영향받은 완제품
    lines.push('=== 영향받은 완제품 ===');
    lines.push('로트번호,SKU,제품명,수량');
    recallResult.affectedProducts.forEach(p => {
      lines.push(`${p.lotNumber},${p.sku},${p.skuName},${p.quantity}`);
    });
    lines.push('');
    // 출하된 주문
    lines.push('=== 출하된 주문 ===');
    lines.push('주문번호,고객명,출하일,수량');
    recallResult.shippedOrders.forEach(o => {
      lines.push(`${o.orderNumber},${o.customerName},${formatDate(o.shippedAt)},${o.quantity}`);
    });
    lines.push('');
    lines.push(`총 영향 수량: ${recallResult.totalAffectedQty}`);

    const csvText = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recall_${recallResult.sourceLot}_${formatDate(new Date().toISOString())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recallResult]);

  // ── 탭 정의 ──
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'lot-list', label: '로트 목록' },
    { id: 'tracing', label: '로트 추적' },
    { id: 'recall', label: '리콜 대응' },
  ];

  // ── 공통 스타일 ──
  const cardStyle: React.CSSProperties = {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 16,
  };

  const inputStyle: React.CSSProperties = {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: '8px 12px',
    color: COLORS.text,
    fontSize: 13,
    outline: 'none',
    width: '100%',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    width: 'auto',
    minWidth: 120,
    cursor: 'pointer',
  };

  const btnPrimary: React.CSSProperties = {
    background: COLORS.blue,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.text }}>
      {/* ── 헤더 ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 24px',
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: COLORS.text,
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          로트 추적 관리
        </h1>
        <span style={{ fontSize: 12, color: COLORS.textMuted }}>
          Lot Traceability
        </span>
      </div>

      {/* ── 탭 네비게이션 ── */}
      <div style={{
        display: 'flex',
        gap: 0,
        padding: '0 24px',
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? COLORS.blue : COLORS.textMuted,
              borderBottom: activeTab === tab.id ? `2px solid ${COLORS.blue}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div style={{ padding: 24 }}>

        {/* ════════════════════════════════════════════════════
            Tab 1: 로트 목록
           ════════════════════════════════════════════════════ */}
        {activeTab === 'lot-list' && (
          <div>
            {/* 필터 영역 */}
            <div style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}>
              {/* 유형 필터 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>유형</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as LotType | 'ALL')}
                  style={selectStyle}
                >
                  <option value="ALL">전체</option>
                  <option value="RAW">원자재</option>
                  <option value="WIP">재공품</option>
                  <option value="FINISHED">완제품</option>
                </select>
              </div>

              {/* 상태 필터 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>상태</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as LotStatus | 'ALL')}
                  style={selectStyle}
                >
                  <option value="ALL">전체</option>
                  <option value="ACTIVE">활성</option>
                  <option value="CONSUMED">소진</option>
                  <option value="QUARANTINE">격리</option>
                  <option value="SCRAPPED">폐기</option>
                </select>
              </div>

              {/* SKU 검색 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  type="text"
                  placeholder="SKU / 제품명 / 로트번호 검색..."
                  value={skuSearch}
                  onChange={e => setSkuSearch(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* 결과 카운트 */}
              <span style={{ fontSize: 12, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>
                {filteredLots.length}건
              </span>
            </div>

            {/* 테이블 */}
            <div style={{ ...cardStyle, padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    {['로트번호', 'SKU', '유형', '수량', '잔여수량', '상태', '입고/생산일', '유효기간'].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: COLORS.textMuted,
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLots.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{
                        padding: 32,
                        textAlign: 'center',
                        color: COLORS.textMuted,
                      }}>
                        조건에 맞는 로트가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredLots.map(lot => {
                      const expiringSoon = isExpiringSoon(lot.expiresAt);
                      return (
                        <tr
                          key={lot.id}
                          style={{
                            borderBottom: `1px solid ${COLORS.border}`,
                            background: expiringSoon ? `${COLORS.orange}10` : 'transparent',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              expiringSoon ? `${COLORS.orange}20` : COLORS.hoverRow;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              expiringSoon ? `${COLORS.orange}10` : 'transparent';
                          }}
                        >
                          {/* 로트번호 */}
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                            {lot.lotNumber}
                          </td>
                          {/* SKU + 제품명 */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 500 }}>{lot.sku}</div>
                            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{lot.skuName}</div>
                          </td>
                          {/* 유형 */}
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: `${COLORS.blue}20`,
                              color: COLORS.blue,
                            }}>
                              {lotTypeLabel(lot.lotType)}
                            </span>
                          </td>
                          {/* 수량 */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatNumber(lot.quantity)}
                          </td>
                          {/* 잔여수량 */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatNumber(lot.remainingQty)}
                          </td>
                          {/* 상태 */}
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: `${statusColor(lot.status)}20`,
                              color: statusColor(lot.status),
                            }}>
                              {statusLabel(lot.status)}
                            </span>
                          </td>
                          {/* 입고/생산일 */}
                          <td style={{ padding: '10px 12px', fontSize: 12, color: COLORS.textMuted }}>
                            {formatDate(lot.receivedAt)}
                          </td>
                          {/* 유효기간 */}
                          <td style={{ padding: '10px 12px', fontSize: 12 }}>
                            {lot.expiresAt ? (
                              <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                color: expiringSoon ? COLORS.orange : COLORS.textMuted,
                                fontWeight: expiringSoon ? 600 : 400,
                              }}>
                                {expiringSoon && <AlertTriangle size={12} />}
                                {formatDate(lot.expiresAt)}
                              </span>
                            ) : (
                              <span style={{ color: COLORS.textMuted }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Tab 2: 로트 추적
           ════════════════════════════════════════════════════ */}
        {activeTab === 'tracing' && (
          <div>
            {/* 검색 영역 */}
            <div style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}>
              {/* 로트/SKU 검색 입력 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 250 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  type="text"
                  placeholder="로트 번호 또는 SKU 입력... (예: LOT-RAW-20260201-001)"
                  value={traceQuery}
                  onChange={e => setTraceQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrace()}
                  style={inputStyle}
                />
              </div>

              {/* 방향 토글 */}
              <div style={{
                display: 'flex',
                borderRadius: 6,
                overflow: 'hidden',
                border: `1px solid ${COLORS.border}`,
              }}>
                <button
                  onClick={() => setTraceDirection('FORWARD')}
                  style={{
                    background: traceDirection === 'FORWARD' ? COLORS.blue : 'transparent',
                    color: traceDirection === 'FORWARD' ? '#fff' : COLORS.textMuted,
                    border: 'none',
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  순방향 (Forward)
                </button>
                <button
                  onClick={() => setTraceDirection('BACKWARD')}
                  style={{
                    background: traceDirection === 'BACKWARD' ? COLORS.blue : 'transparent',
                    color: traceDirection === 'BACKWARD' ? '#fff' : COLORS.textMuted,
                    border: 'none',
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderLeft: `1px solid ${COLORS.border}`,
                  }}
                >
                  역방향 (Backward)
                </button>
              </div>

              {/* 검색 버튼 */}
              <button onClick={handleTrace} style={btnPrimary}>
                <Search size={14} />
                추적
              </button>
            </div>

            {/* 추적 안내 */}
            {!traceSearched && (
              <div style={{
                ...cardStyle,
                textAlign: 'center',
                padding: 48,
                color: COLORS.textMuted,
              }}>
                <Search size={32} color={COLORS.textMuted} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: 14 }}>로트 번호를 입력하고 추적 방향을 선택하세요.</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  순방향: 원자재 &rarr; 생산 &rarr; 완제품 &rarr; 출하
                  <br />
                  역방향: 완제품 &rarr; 원자재 + 공급업체
                </div>
                <div style={{ fontSize: 11, marginTop: 12, color: COLORS.orange }}>
                  * 목 데이터: &quot;RAW&quot; 포함 로트는 순방향, &quot;FIN&quot; 포함 로트는 역방향 추적 가능
                </div>
              </div>
            )}

            {/* 추적 결과 */}
            {traceSearched && (
              <div style={cardStyle}>
                {traceResult ? (
                  <>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: `${COLORS.blue}20`,
                        color: COLORS.blue,
                        fontWeight: 600,
                      }}>
                        {traceDirection === 'FORWARD' ? '순방향 추적' : '역방향 추적'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {traceQuery}
                      </span>
                    </div>
                    <TraceTreeNode node={traceResult} depth={0} />
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 32, color: COLORS.textMuted }}>
                    <AlertTriangle size={24} color={COLORS.orange} style={{ marginBottom: 8 }} />
                    <div>추적 결과가 없습니다.</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      입력한 로트 번호를 확인하거나 추적 방향을 변경해보세요.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Tab 3: 리콜 대응
           ════════════════════════════════════════════════════ */}
        {activeTab === 'recall' && (
          <div>
            {/* 경고 배너 */}
            <div style={{
              background: `${COLORS.red}15`,
              border: `1px solid ${COLORS.red}40`,
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <AlertTriangle size={18} color={COLORS.red} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.red }}>
                  리콜 대응 분석
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                  문제 로트 번호를 입력하면 영향받은 완제품, 출하 주문, 고객을 즉시 추적합니다.
                </div>
              </div>
            </div>

            {/* 로트 입력 */}
            <div style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  type="text"
                  placeholder="리콜 대상 로트 번호 입력... (예: LOT-RAW-20260201-001)"
                  value={recallLotInput}
                  onChange={e => setRecallLotInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRecallAnalysis()}
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleRecallAnalysis}
                style={{
                  ...btnPrimary,
                  background: COLORS.red,
                }}
              >
                <AlertTriangle size={14} />
                리콜 분석
              </button>
            </div>

            {/* 리콜 결과 */}
            {recallSearched && recallResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 심각도 배너 */}
                <div style={{
                  background: COLORS.red,
                  borderRadius: 8,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={20} color="#fff" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
                        리콜 영향 분석 완료
                      </div>
                      <div style={{ fontSize: 12, color: '#ffffffcc', marginTop: 2 }}>
                        로트 {recallResult.sourceLot} | 총 영향 수량: {formatNumber(recallResult.totalAffectedQty)}개
                      </div>
                    </div>
                  </div>
                  <button onClick={handleExportCsv} style={{
                    background: '#ffffff20',
                    border: '1px solid #ffffff40',
                    borderRadius: 6,
                    padding: '8px 14px',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Download size={14} />
                    CSV 내보내기
                  </button>
                </div>

                {/* 요약 카드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={cardStyle}>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
                      영향받은 완제품
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.orange }}>
                      {recallResult.affectedProducts.length}
                      <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textMuted, marginLeft: 4 }}>건</span>
                    </div>
                  </div>
                  <div style={cardStyle}>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
                      출하된 주문
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.red }}>
                      {recallResult.shippedOrders.length}
                      <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textMuted, marginLeft: 4 }}>건</span>
                    </div>
                  </div>
                  <div style={cardStyle}>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
                      총 영향 수량
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.red }}>
                      {formatNumber(recallResult.totalAffectedQty)}
                      <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textMuted, marginLeft: 4 }}>개</span>
                    </div>
                  </div>
                </div>

                {/* 영향받은 완제품 테이블 */}
                <div style={cardStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>
                    영향받은 완제품
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        {['로트번호', 'SKU', '제품명', '수량'].map(h => (
                          <th key={h} style={{
                            padding: '8px 12px', textAlign: 'left',
                            fontSize: 12, fontWeight: 600, color: COLORS.textMuted,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recallResult.affectedProducts.map((p, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{p.lotNumber}</td>
                          <td style={{ padding: '8px 12px' }}>{p.sku}</td>
                          <td style={{ padding: '8px 12px' }}>{p.skuName}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatNumber(p.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 출하된 주문 테이블 */}
                <div style={cardStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>
                    출하된 주문
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        {['주문번호', '고객명', '출하일', '수량'].map(h => (
                          <th key={h} style={{
                            padding: '8px 12px', textAlign: 'left',
                            fontSize: 12, fontWeight: 600, color: COLORS.textMuted,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recallResult.shippedOrders.map((o, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{o.orderNumber}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 500 }}>{o.customerName}</td>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: COLORS.textMuted }}>
                            {formatDate(o.shippedAt)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatNumber(o.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 검색 전 안내 */}
            {!recallSearched && (
              <div style={{
                ...cardStyle,
                textAlign: 'center',
                padding: 48,
                color: COLORS.textMuted,
              }}>
                <AlertTriangle size={32} color={COLORS.textMuted} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: 14 }}>리콜 대상 로트 번호를 입력하세요.</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  해당 로트로부터 영향받은 완제품, 출하 주문, 고객 정보를 분석합니다.
                </div>
              </div>
            )}

            {/* 결과 없음 */}
            {recallSearched && !recallResult && (
              <div style={{
                ...cardStyle,
                textAlign: 'center',
                padding: 32,
                color: COLORS.textMuted,
              }}>
                분석 결과가 없습니다. 로트 번호를 확인해주세요.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
