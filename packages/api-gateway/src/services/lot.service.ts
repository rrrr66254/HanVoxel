import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── LOT 번호 생성 ─────────────────────────────────────────

/**
 * LOT 번호 자동 생성 (형식: LOT-YYYYMMDD-XXXX)
 * 당일 생성된 마지막 LOT 번호의 시퀀스를 +1
 */
export async function generateLotNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `LOT-${dateStr}-`;

  // 오늘 날짜로 시작하는 마지막 LOT 번호 조회
  const lastLot = await prisma.lot.findFirst({
    where: { lotNo: { startsWith: prefix } },
    orderBy: { lotNo: 'desc' },
    select: { lotNo: true },
  });

  let seq = 1;
  if (lastLot) {
    const lastSeq = parseInt(lastLot.lotNo.slice(-4), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── LOT 생성 ──────────────────────────────────────────────

interface CreateLotInput {
  siteId: string;
  companyId: string;
  lotNo?: string;
  skuCode: string;
  skuName?: string;
  lotType: string; // RAW | WIP | FINISHED | COMPONENT
  status?: string; // ACTIVE | CONSUMED | EXPIRED | RECALLED
  quantity: number;
  unit?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  supplierId?: string;
  sourceInfo?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

export async function createLot(data: CreateLotInput) {
  const lotNo = data.lotNo ?? await generateLotNo();

  return prisma.lot.create({
    data: {
      siteId: data.siteId,
      companyId: data.companyId,
      lotNo,
      skuCode: data.skuCode,
      skuName: data.skuName,
      lotType: data.lotType,
      status: data.status ?? 'ACTIVE',
      quantity: data.quantity,
      unit: data.unit ?? 'EA',
      manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      supplierId: data.supplierId,
      sourceInfo: data.sourceInfo ?? Prisma.DbNull,
      metadata: data.metadata ?? Prisma.DbNull,
    },
  });
}

// ── LOT 조회 ──────────────────────────────────────────────

interface ListLotsFilter {
  siteId: string;
  skuCode?: string;
  status?: string;
  lotType?: string;
  limit?: number;
  offset?: number;
}

export async function listLots(filter: ListLotsFilter) {
  const where: Prisma.LotWhereInput = { siteId: filter.siteId };
  if (filter.skuCode) where.skuCode = filter.skuCode;
  if (filter.status) where.status = filter.status;
  if (filter.lotType) where.lotType = filter.lotType;

  const [lots, total] = await Promise.all([
    prisma.lot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit ?? 50,
      skip: filter.offset ?? 0,
    }),
    prisma.lot.count({ where }),
  ]);

  return { lots, total };
}

export async function getLotById(id: string) {
  return prisma.lot.findUnique({
    where: { id },
    include: {
      movements: { orderBy: { createdAt: 'desc' } },
      childLinks: { include: { childLot: true } },
      parentLinks: { include: { parentLot: true } },
      outboundMappings: true,
    },
  });
}

// ── LOT 이동 기록 ─────────────────────────────────────────

interface AddMovementInput {
  movementType: string; // INBOUND | TRANSFER | CONSUME | PRODUCE | ADJUSTMENT | OUTBOUND
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
  referenceNo?: string;
  performedBy?: string;
  note?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function addMovement(lotId: string, data: AddMovementInput) {
  return prisma.lotMovement.create({
    data: {
      lotId,
      movementType: data.movementType,
      quantity: data.quantity,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      referenceNo: data.referenceNo,
      performedBy: data.performedBy,
      note: data.note,
      metadata: data.metadata ?? Prisma.DbNull,
    },
  });
}

// ── 정방향 추적 (원재료 → 완제품 → 출고) ──────────────────

interface TraceNode {
  lot: {
    id: string;
    lotNo: string;
    skuCode: string;
    skuName: string | null;
    lotType: string;
    status: string;
    quantity: number;
  };
  children: TraceNode[];
  outboundMappings: OutboundMappingInfo[];
}

interface OutboundMappingInfo {
  id: string;
  outboundOrderId: string;
  outboundOrderNo: string | null;
  quantity: number;
  customerId: string | null;
  customerName: string | null;
}

export async function traceForward(lotId: string, visited = new Set<string>()): Promise<TraceNode | null> {
  // 순환 참조 방지
  if (visited.has(lotId)) return null;
  visited.add(lotId);

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      childLinks: { include: { childLot: true } },
      outboundMappings: true,
    },
  });

  if (!lot) return null;

  // 자식 LOT 재귀 추적
  const children: TraceNode[] = [];
  for (const link of lot.childLinks) {
    const childNode = await traceForward(link.childLotId, visited);
    if (childNode) children.push(childNode);
  }

  // 출고 매핑 정보
  const outboundMappings: OutboundMappingInfo[] = lot.outboundMappings.map((m) => ({
    id: m.id,
    outboundOrderId: m.outboundOrderId,
    outboundOrderNo: m.outboundOrderNo,
    quantity: m.quantity,
    customerId: m.customerId,
    customerName: m.customerName,
  }));

  return {
    lot: {
      id: lot.id,
      lotNo: lot.lotNo,
      skuCode: lot.skuCode,
      skuName: lot.skuName,
      lotType: lot.lotType,
      status: lot.status,
      quantity: lot.quantity,
    },
    children,
    outboundMappings,
  };
}

// ── 역방향 추적 (완제품 → 원재료) ──────────────────────────

interface BackTraceNode {
  lot: {
    id: string;
    lotNo: string;
    skuCode: string;
    skuName: string | null;
    lotType: string;
    status: string;
    quantity: number;
  };
  parents: BackTraceNode[];
}

export async function traceBackward(lotId: string, visited = new Set<string>()): Promise<BackTraceNode | null> {
  // 순환 참조 방지
  if (visited.has(lotId)) return null;
  visited.add(lotId);

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      parentLinks: { include: { parentLot: true } },
    },
  });

  if (!lot) return null;

  // 부모 LOT 재귀 추적
  const parents: BackTraceNode[] = [];
  for (const link of lot.parentLinks) {
    const parentNode = await traceBackward(link.parentLotId, visited);
    if (parentNode) parents.push(parentNode);
  }

  return {
    lot: {
      id: lot.id,
      lotNo: lot.lotNo,
      skuCode: lot.skuCode,
      skuName: lot.skuName,
      lotType: lot.lotType,
      status: lot.status,
      quantity: lot.quantity,
    },
    parents,
  };
}

// ── 리콜 분석 ─────────────────────────────────────────────

interface RecallAnalysis {
  sourceLot: {
    id: string;
    lotNo: string;
    skuCode: string;
    lotType: string;
  };
  affectedLots: {
    id: string;
    lotNo: string;
    skuCode: string;
    lotType: string;
    status: string;
  }[];
  affectedOutbounds: OutboundMappingInfo[];
  affectedCustomers: {
    customerId: string;
    customerName: string;
    orderCount: number;
    totalQuantity: number;
  }[];
  summary: {
    totalAffectedLots: number;
    totalAffectedOrders: number;
    totalAffectedCustomers: number;
    totalAffectedQuantity: number;
  };
}

export async function getRecallAnalysis(lotId: string): Promise<RecallAnalysis | null> {
  const traceResult = await traceForward(lotId);
  if (!traceResult) return null;

  // 정방향 추적 결과에서 모든 LOT과 출고 매핑 수집
  const affectedLots: RecallAnalysis['affectedLots'] = [];
  const allOutbounds: OutboundMappingInfo[] = [];

  function collectFromTrace(node: TraceNode) {
    affectedLots.push({
      id: node.lot.id,
      lotNo: node.lot.lotNo,
      skuCode: node.lot.skuCode,
      lotType: node.lot.lotType,
      status: node.lot.status,
    });
    allOutbounds.push(...node.outboundMappings);
    for (const child of node.children) {
      collectFromTrace(child);
    }
  }
  collectFromTrace(traceResult);

  // 고객별 영향 집계
  const customerMap = new Map<string, { name: string; orderCount: number; totalQuantity: number }>();
  for (const ob of allOutbounds) {
    if (ob.customerId) {
      const entry = customerMap.get(ob.customerId) ?? {
        name: ob.customerName ?? '알 수 없음',
        orderCount: 0,
        totalQuantity: 0,
      };
      entry.orderCount += 1;
      entry.totalQuantity += ob.quantity;
      customerMap.set(ob.customerId, entry);
    }
  }

  const affectedCustomers = Array.from(customerMap.entries()).map(([customerId, info]) => ({
    customerId,
    customerName: info.name,
    orderCount: info.orderCount,
    totalQuantity: info.totalQuantity,
  }));

  return {
    sourceLot: {
      id: traceResult.lot.id,
      lotNo: traceResult.lot.lotNo,
      skuCode: traceResult.lot.skuCode,
      lotType: traceResult.lot.lotType,
    },
    affectedLots,
    affectedOutbounds: allOutbounds,
    affectedCustomers,
    summary: {
      totalAffectedLots: affectedLots.length,
      totalAffectedOrders: allOutbounds.length,
      totalAffectedCustomers: affectedCustomers.length,
      totalAffectedQuantity: allOutbounds.reduce((sum, o) => sum + o.quantity, 0),
    },
  };
}

// ── LOT 라벨 데이터 (QR 코드용) ───────────────────────────

interface LotLabelData {
  lotNo: string;
  skuCode: string;
  skuName: string | null;
  lotType: string;
  quantity: number;
  unit: string;
  manufacturingDate: string | null;
  expiryDate: string | null;
  qrContent: string;
}

export async function getLotLabel(lotId: string): Promise<LotLabelData | null> {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
  });

  if (!lot) return null;

  // QR 코드에 포함할 JSON 문자열
  const qrContent = JSON.stringify({
    lotId: lot.id,
    lotNo: lot.lotNo,
    skuCode: lot.skuCode,
    quantity: lot.quantity,
    unit: lot.unit,
    mfgDate: lot.manufacturingDate?.toISOString() ?? null,
    expDate: lot.expiryDate?.toISOString() ?? null,
  });

  return {
    lotNo: lot.lotNo,
    skuCode: lot.skuCode,
    skuName: lot.skuName,
    lotType: lot.lotType,
    quantity: lot.quantity,
    unit: lot.unit,
    manufacturingDate: lot.manufacturingDate?.toISOString() ?? null,
    expiryDate: lot.expiryDate?.toISOString() ?? null,
    qrContent,
  };
}
