/**
 * 스마트 발주 스케줄 서비스
 *
 * - DB에서 스마트 발주 스케줄 조회 (mock: 8~10개 샘플 생성)
 * - 타임라인 데이터 포맷팅
 * - ML 서비스 호출하여 도착 예측
 * - 예측 정확도 리포트
 * - 스케줄 확정 → 입고 주문 생성
 * - ML 모델 재학습 트리거
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

// ── 타입 정의 ────────────────────────────────────────────

interface ScheduleFilters {
  urgency?: string;
  status?: string;
  vendorId?: string;
}

interface SmartSchedule {
  id: string;
  siteId: string;
  skuCode: string;
  skuName: string;
  vendorId: string;
  vendorName: string;
  currentQty: number;
  reorderQty: number;
  safetyStock: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'CONFIRMED' | 'ORDERED' | 'DELIVERED';
  predictedOrderDate: string;
  predictedArrivalDate: string;
  avgLeadDays: number;
  confidence: number;
  estimatedCostKrw: number;
  createdAt: string;
}

interface TimelineEntry {
  date: string;
  events: Array<{
    id: string;
    type: 'ORDER' | 'ARRIVAL';
    skuCode: string;
    skuName: string;
    vendorName: string;
    qty: number;
    urgency: string;
  }>;
}

interface ArrivalPrediction {
  vendorId: string;
  skuCode: string;
  orderDate: string;
  predictedArrivalDate: string;
  avgLeadDays: number;
  minLeadDays: number;
  maxLeadDays: number;
  confidence: number;
  factors: string[];
}

interface AccuracyReport {
  siteId: string;
  totalPredictions: number;
  accurateCount: number;
  accuracyRate: number;
  avgDeviationDays: number;
  byVendor: Array<{
    vendorId: string;
    vendorName: string;
    accuracy: number;
    avgDeviation: number;
    totalOrders: number;
  }>;
  byUrgency: Record<string, { accuracy: number; count: number }>;
  lastTrainedAt: string;
  modelVersion: string;
}

interface ConfirmResult {
  scheduleId: string;
  status: string;
  inboundOrderId: string;
  voucherNo: string;
  message: string;
}

interface TrainResult {
  siteId: string;
  status: string;
  modelVersion: string;
  trainedAt: string;
  samplesUsed: number;
  metrics: {
    mae: number;
    rmse: number;
    r2: number;
  };
}

// ── Mock 데이터 생성 유틸 ─────────────────────────────────

/** 날짜 문자열 생성 (오늘 기준 +days) */
function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 과거 날짜 문자열 생성 (오늘 기준 -days) */
function pastDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** 고유 ID 생성 (mock용) */
function mockId(prefix: string, idx: number): string {
  return `${prefix}_${String(idx).padStart(4, '0')}`;
}

// ── Mock 기초 데이터 ──────────────────────────────────────

const MOCK_SKUS: Array<{ code: string; name: string; unitCost: number }> = [
  { code: 'SKU-1001', name: '철판 (SPHC 3.0T)', unitCost: 85000 },
  { code: 'SKU-1002', name: '볼트 M10×30', unitCost: 250 },
  { code: 'SKU-1003', name: '전자부품 PCB-A', unitCost: 12000 },
  { code: 'SKU-1004', name: '포장박스 중형', unitCost: 1500 },
  { code: 'SKU-1005', name: '윤활유 15W-40', unitCost: 45000 },
  { code: 'SKU-1006', name: '알루미늄 프레임 600mm', unitCost: 32000 },
  { code: 'SKU-1007', name: '고무패킹 ∅50', unitCost: 800 },
  { code: 'SKU-1008', name: '스테인리스 파이프 ∅25', unitCost: 28000 },
  { code: 'SKU-1009', name: '절연테이프 19mm', unitCost: 3500 },
  { code: 'SKU-1010', name: '베어링 6205-2RS', unitCost: 9500 },
];

const MOCK_VENDORS: Array<{ id: string; name: string; avgLead: number }> = [
  { id: 'VND-001', name: 'CJ물산', avgLead: 5 },
  { id: 'VND-002', name: '삼성전자 부품사업부', avgLead: 7 },
  { id: 'VND-003', name: '현대모비스', avgLead: 4 },
  { id: 'VND-004', name: '포스코 강판', avgLead: 10 },
  { id: 'VND-005', name: 'LG화학 소재', avgLead: 8 },
  { id: 'VND-006', name: '한화솔루션', avgLead: 6 },
  { id: 'VND-007', name: '두산산업', avgLead: 12 },
  { id: 'VND-008', name: '코오롱인더스트리', avgLead: 9 },
];

const URGENCY_LEVELS: Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = [
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW',
];

// ── Mock 스케줄 생성 ──────────────────────────────────────

function generateMockSchedules(siteId: string): SmartSchedule[] {
  const schedules: SmartSchedule[] = [];

  // 8~10개 스케줄 생성
  const count = 8 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const sku = MOCK_SKUS[i % MOCK_SKUS.length];
    const vendor = MOCK_VENDORS[i % MOCK_VENDORS.length];
    const urgencyIdx = i < 2 ? 0 : i < 4 ? 1 : i < 7 ? 2 : 3;
    const urgency = URGENCY_LEVELS[urgencyIdx];

    // 긴급도에 따라 발주일·도착일 조정
    const orderDaysFromNow = urgency === 'CRITICAL' ? 1 : urgency === 'HIGH' ? 3 : urgency === 'MEDIUM' ? 7 : 14;
    const leadDays = vendor.avgLead + Math.floor(Math.random() * 3) - 1;

    const currentQty = urgency === 'CRITICAL' ? 5 : urgency === 'HIGH' ? 20 : urgency === 'MEDIUM' ? 80 : 150;
    const reorderQty = urgency === 'CRITICAL' ? 200 : urgency === 'HIGH' ? 150 : urgency === 'MEDIUM' ? 100 : 50;

    schedules.push({
      id: mockId('SCHED', i + 1),
      siteId,
      skuCode: sku.code,
      skuName: sku.name,
      vendorId: vendor.id,
      vendorName: vendor.name,
      currentQty,
      reorderQty,
      safetyStock: Math.round(reorderQty * 0.3),
      urgency,
      status: 'PENDING',
      predictedOrderDate: futureDate(orderDaysFromNow),
      predictedArrivalDate: futureDate(orderDaysFromNow + leadDays),
      avgLeadDays: leadDays,
      confidence: 0.75 + Math.random() * 0.2,
      estimatedCostKrw: reorderQty * sku.unitCost,
      createdAt: new Date().toISOString(),
    });
  }

  return schedules;
}

// ── 스마트 스케줄 목록 조회 ───────────────────────────────

export async function getSmartSchedules(
  siteId: string,
  filters?: ScheduleFilters,
): Promise<SmartSchedule[]> {
  // TODO: DB 연동 시 prisma 쿼리로 교체
  let schedules = generateMockSchedules(siteId);

  // 필터 적용
  if (filters?.urgency) {
    schedules = schedules.filter((s) => s.urgency === filters.urgency);
  }
  if (filters?.status) {
    schedules = schedules.filter((s) => s.status === filters.status);
  }
  if (filters?.vendorId) {
    schedules = schedules.filter((s) => s.vendorId === filters.vendorId);
  }

  // 긴급도 → 발주일 순 정렬
  const urgencyOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  schedules.sort((a, b) => {
    const urgDiff = (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4);
    if (urgDiff !== 0) return urgDiff;
    return a.predictedOrderDate.localeCompare(b.predictedOrderDate);
  });

  return schedules;
}

// ── 타임라인 데이터 ───────────────────────────────────────

export async function getTimeline(
  siteId: string,
  days: number = 60,
): Promise<TimelineEntry[]> {
  const schedules = await getSmartSchedules(siteId);

  // 날짜별 이벤트 그룹핑
  const dateMap = new Map<string, TimelineEntry['events']>();

  for (const s of schedules) {
    // 발주 이벤트
    if (!dateMap.has(s.predictedOrderDate)) {
      dateMap.set(s.predictedOrderDate, []);
    }
    dateMap.get(s.predictedOrderDate)!.push({
      id: s.id,
      type: 'ORDER',
      skuCode: s.skuCode,
      skuName: s.skuName,
      vendorName: s.vendorName,
      qty: s.reorderQty,
      urgency: s.urgency,
    });

    // 도착 예정 이벤트
    if (!dateMap.has(s.predictedArrivalDate)) {
      dateMap.set(s.predictedArrivalDate, []);
    }
    dateMap.get(s.predictedArrivalDate)!.push({
      id: s.id,
      type: 'ARRIVAL',
      skuCode: s.skuCode,
      skuName: s.skuName,
      vendorName: s.vendorName,
      qty: s.reorderQty,
      urgency: s.urgency,
    });
  }

  // 날짜 범위 내 필터 + 정렬
  const cutoff = futureDate(days);
  const timeline: TimelineEntry[] = [];
  for (const [date, events] of dateMap.entries()) {
    if (date <= cutoff) {
      timeline.push({ date, events });
    }
  }

  timeline.sort((a, b) => a.date.localeCompare(b.date));
  return timeline;
}

// ── 도착 예측 (ML 서비스 호출) ────────────────────────────

export async function predictArrival(
  vendorId: string,
  skuCode: string,
  orderDate: string,
): Promise<ArrivalPrediction> {
  // ML 서비스 호출 시도
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/api/v1/smart-reorder/predict-arrival`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, skuCode, orderDate }),
    });

    if (resp.ok) {
      return (await resp.json()) as ArrivalPrediction;
    }
  } catch {
    // ML 서비스 불가 시 mock 응답
  }

  // Mock 응답 생성
  const vendor = MOCK_VENDORS.find((v) => v.id === vendorId);
  const avgLead = vendor?.avgLead ?? 7;
  const orderDt = new Date(orderDate);
  const arrivalDt = new Date(orderDt);
  arrivalDt.setDate(arrivalDt.getDate() + avgLead);

  return {
    vendorId,
    skuCode,
    orderDate,
    predictedArrivalDate: arrivalDt.toISOString().slice(0, 10),
    avgLeadDays: avgLead,
    minLeadDays: Math.max(1, avgLead - 2),
    maxLeadDays: avgLead + 3,
    confidence: 0.82,
    factors: ['과거 리드타임 이력', '계절 패턴', '공급업체 신뢰도'],
  };
}

// ── 예측 정확도 리포트 ────────────────────────────────────

export async function getAccuracyReport(
  siteId: string,
): Promise<AccuracyReport> {
  // TODO: DB 연동 시 실제 예측 vs 실제 도착 데이터 비교로 교체
  const vendorAccuracies = MOCK_VENDORS.slice(0, 5).map((v) => ({
    vendorId: v.id,
    vendorName: v.name,
    accuracy: 0.78 + Math.random() * 0.18,
    avgDeviation: 0.5 + Math.random() * 2.5,
    totalOrders: 10 + Math.floor(Math.random() * 40),
  }));

  const totalPredictions = vendorAccuracies.reduce((sum, v) => sum + v.totalOrders, 0);
  const accurateCount = Math.round(totalPredictions * 0.85);

  return {
    siteId,
    totalPredictions,
    accurateCount,
    accuracyRate: accurateCount / totalPredictions,
    avgDeviationDays: 1.3,
    byVendor: vendorAccuracies,
    byUrgency: {
      CRITICAL: { accuracy: 0.91, count: 15 },
      HIGH: { accuracy: 0.87, count: 28 },
      MEDIUM: { accuracy: 0.83, count: 42 },
      LOW: { accuracy: 0.79, count: 18 },
    },
    lastTrainedAt: pastDate(3),
    modelVersion: 'v2.1.0',
  };
}

// ── 스케줄 확정 → 입고 주문 생성 ──────────────────────────

export async function confirmSchedule(
  id: string,
): Promise<ConfirmResult> {
  // TODO: DB 연동 시 실제 스케줄 조회 + InboundOrder 생성으로 교체
  const today = new Date();
  const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const voucherNo = `${prefix}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;

  return {
    scheduleId: id,
    status: 'CONFIRMED',
    inboundOrderId: mockId('IB', Math.floor(Math.random() * 9999)),
    voucherNo,
    message: `스케줄 ${id}이(가) 확정되었습니다. 발주서 ${voucherNo}이(가) 생성되었습니다.`,
  };
}

// ── ML 모델 재학습 트리거 ─────────────────────────────────

export async function triggerTraining(
  siteId: string,
): Promise<TrainResult> {
  // ML 서비스 호출 시도
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/api/v1/smart-reorder/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId }),
    });

    if (resp.ok) {
      return (await resp.json()) as TrainResult;
    }
  } catch {
    // ML 서비스 불가 시 mock 응답
  }

  // Mock 응답
  return {
    siteId,
    status: 'COMPLETED',
    modelVersion: 'v2.2.0',
    trainedAt: new Date().toISOString(),
    samplesUsed: 1250 + Math.floor(Math.random() * 500),
    metrics: {
      mae: 1.2 + Math.random() * 0.5,
      rmse: 1.8 + Math.random() * 0.6,
      r2: 0.82 + Math.random() * 0.1,
    },
  };
}
