/**
 * 생산 관리 서비스
 *
 * - 작업장 (Work Center) CRUD + 상태 관리
 * - 생산 지시서 (Production Order) 생성/조회/상태 전이
 * - 생산 로그 기록 (START/PROGRESS/PAUSE/RESUME/COMPLETE/DEFECT/NOTE)
 * - 자재 불출/반납
 * - 간트 차트 데이터
 * - 설비 유지보수 (고장 신고 / 정비 완료)
 * - 생산 KPI / OEE / 불량 분석
 */
import prisma from './prisma';

// ── 타입 ──────────────────────────────────────────

interface CreateWorkCenterInput {
  siteId: string;
  name: string;
  type: string;
  capacityPerDay?: number;
  spatialObjectId?: string;
  responsibleUser?: string;
}

interface CreateProductionOrderInput {
  siteId: string;
  salesOrderId?: string;
  productSku: string;
  productName?: string;
  plannedQty: number;
  priority?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  workCenterId?: string;
  assignedWorkers?: string[];
  notes?: string;
}

interface ProductionLogInput {
  productionOrderId: string;
  processId?: string;
  logType: string;
  qtyProduced?: number;
  qtyDefect?: number;
  defectReason?: string;
  workerId?: string;
  notes?: string;
}

interface ReturnMaterialItem {
  materialSku: string;
  qty: number;
}

// ── 작업장 (Work Center) ──────────────────────────

/** 사이트의 전체 작업장 목록 조회 */
export async function getWorkCenters(siteId: string) {
  return prisma.workCenter.findMany({
    where: { siteId },
    include: {
      _count: {
        select: {
          productionOrders: true,
          maintenances: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });
}

/** 작업장 생성 — 코드 자동 생성 (WC-001, WC-002, ...) */
export async function createWorkCenter(data: CreateWorkCenterInput) {
  // 현재 사이트의 작업장 수를 기반으로 코드 자동 생성
  const count = await prisma.workCenter.count({
    where: { siteId: data.siteId },
  });
  const code = `WC-${String(count + 1).padStart(3, '0')}`;

  return prisma.workCenter.create({
    data: {
      siteId: data.siteId,
      code,
      name: data.name,
      type: data.type,
      capacityPerDay: data.capacityPerDay ?? 0,
      status: 'IDLE',
      spatialObjectId: data.spatialObjectId ?? null,
      responsibleUser: data.responsibleUser ?? null,
    },
  });
}

/** 작업장 상태 변경 (RUNNING / IDLE / MAINTENANCE / BREAKDOWN) */
export async function updateWorkCenterStatus(id: string, status: string) {
  const validStatuses = ['RUNNING', 'IDLE', 'MAINTENANCE', 'BREAKDOWN'];
  if (!validStatuses.includes(status)) {
    throw new Error(`유효하지 않은 작업장 상태입니다: ${status}`);
  }

  return prisma.workCenter.update({
    where: { id },
    data: { status },
  });
}

// ── 생산 지시서 (Production Order) ────────────────

/** 생산 지시서 목록 조회 (페이지네이션) */
export async function getProductionOrders(
  siteId: string,
  status?: string,
  page: number = 1,
  limit: number = 20,
) {
  const where: Record<string, unknown> = { siteId };
  if (status) where.status = status;

  const [total, orders] = await Promise.all([
    prisma.productionOrder.count({ where }),
    prisma.productionOrder.findMany({
      where,
      include: {
        workCenter: {
          select: { id: true, code: true, name: true, type: true, status: true },
        },
        _count: {
          select: { processes: true, logs: true, materials: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { orders, total, page, limit };
}

/** 생산 지시서 상세 조회 (공정 + 로그 + 자재 포함) */
export async function getProductionOrder(id: string) {
  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      workCenter: true,
      processes: {
        include: { workCenter: true },
        orderBy: { stepNo: 'asc' },
      },
      logs: {
        orderBy: { loggedAt: 'desc' },
      },
      materials: {
        orderBy: { materialSku: 'asc' },
      },
    },
  });

  if (!order) throw new Error('생산 지시서를 찾을 수 없습니다');
  return order;
}

/** 생산 지시서 생성 — 주문번호 자동 생성 (WO-YYYYMMDD-XXXX) */
export async function createProductionOrder(data: CreateProductionOrderInput) {
  // 주문번호 자동 생성
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.productionOrder.count({
    where: { orderNo: { startsWith: `WO-${today}` } },
  });
  const orderNo = `WO-${today}-${String(count + 1).padStart(4, '0')}`;

  // 생산 지시서 생성
  const order = await prisma.productionOrder.create({
    data: {
      siteId: data.siteId,
      orderNo,
      salesOrderId: data.salesOrderId ?? null,
      productSku: data.productSku,
      productName: data.productName ?? null,
      plannedQty: data.plannedQty,
      actualQty: 0,
      defectQty: 0,
      status: 'PLANNED',
      priority: data.priority ?? 'NORMAL',
      plannedStartAt: data.plannedStartAt ? new Date(data.plannedStartAt) : null,
      plannedEndAt: data.plannedEndAt ? new Date(data.plannedEndAt) : null,
      workCenterId: data.workCenterId ?? null,
      assignedWorkers: data.assignedWorkers ?? [],
      notes: data.notes ?? null,
    },
    include: { workCenter: true },
  });

  // BOM이 있으면 자재 목록 자동 생성
  try {
    const bomItems = await prisma.bomItem.findMany({
      where: {
        siteId: data.siteId,
        productSku: data.productSku,
      },
    });

    if (bomItems.length > 0) {
      await prisma.productionMaterial.createMany({
        data: bomItems.map((bom) => ({
          productionOrderId: order.id,
          materialSku: bom.materialSku,
          materialName: null,
          plannedQty: bom.qtyPerUnit * data.plannedQty,
          issuedQty: 0,
          returnedQty: 0,
        })),
      });
    }
  } catch {
    // BOM 조회 실패 시 자재 없이 진행
  }

  return order;
}

/** 생산 지시서 상태 전이 */
export async function updateProductionOrderStatus(id: string, status: string) {
  const validTransitions: Record<string, string[]> = {
    PLANNED: ['RELEASED', 'CANCELLED'],
    RELEASED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['PAUSED', 'COMPLETED', 'CANCELLED'],
    PAUSED: ['IN_PROGRESS', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  const order = await prisma.productionOrder.findUnique({ where: { id } });
  if (!order) throw new Error('생산 지시서를 찾을 수 없습니다');

  const allowed = validTransitions[order.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error(
      `상태 전이가 허용되지 않습니다: ${order.status} → ${status}`,
    );
  }

  // 상태별 타임스탬프 자동 설정
  const updateData: Record<string, unknown> = { status };

  if (status === 'IN_PROGRESS' && !order.actualStartAt) {
    updateData.actualStartAt = new Date();
  }
  if (status === 'COMPLETED') {
    updateData.actualEndAt = new Date();
  }

  return prisma.productionOrder.update({
    where: { id },
    data: updateData,
    include: { workCenter: true },
  });
}

/** 수주(Sales Order) 기반 생산 지시서 자동 생성 */
export async function autoCreateFromSalesOrder(salesOrderId: string) {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
  });

  if (!salesOrder) throw new Error('수주를 찾을 수 없습니다');

  // 수주 품목 목록 파싱
  const items = salesOrder.items as Array<{
    product_sku: string;
    qty: number;
    product_name?: string;
  }>;

  if (!items || items.length === 0) {
    throw new Error('수주에 품목이 없습니다');
  }

  const createdOrders = [];

  for (const item of items) {
    const order = await createProductionOrder({
      siteId: salesOrder.siteId,
      salesOrderId: salesOrder.id,
      productSku: item.product_sku,
      productName: item.product_name ?? null,
      plannedQty: item.qty,
      priority: 'NORMAL',
      plannedStartAt: undefined,
      plannedEndAt: salesOrder.deliveryDeadline
        ? salesOrder.deliveryDeadline.toISOString()
        : undefined,
      notes: `수주 ${salesOrder.orderNo} 기반 자동 생성`,
    });

    createdOrders.push(order);
  }

  return createdOrders;
}

// ── 생산 로그 ─────────────────────────────────────

/** 생산 활동 로그 기록 */
export async function addProductionLog(data: ProductionLogInput) {
  const validLogTypes = ['START', 'PROGRESS', 'PAUSE', 'RESUME', 'COMPLETE', 'DEFECT', 'NOTE'];
  if (!validLogTypes.includes(data.logType)) {
    throw new Error(`유효하지 않은 로그 타입입니다: ${data.logType}`);
  }

  // 로그 생성
  const log = await prisma.productionLog.create({
    data: {
      productionOrderId: data.productionOrderId,
      processId: data.processId ?? null,
      logType: data.logType,
      qtyProduced: data.qtyProduced ?? null,
      qtyDefect: data.qtyDefect ?? null,
      defectReason: data.defectReason ?? null,
      workerId: data.workerId ?? null,
      notes: data.notes ?? null,
    },
  });

  // 생산량/불량 수량이 있으면 지시서에 반영
  const updateData: Record<string, unknown> = {};

  if (data.qtyProduced !== undefined && data.qtyProduced !== null) {
    // 해당 지시서의 전체 생산 로그에서 최대 누적 생산량 갱신
    const totalProduced = await prisma.productionLog.aggregate({
      where: {
        productionOrderId: data.productionOrderId,
        qtyProduced: { not: null },
      },
      _max: { qtyProduced: true },
    });
    updateData.actualQty = totalProduced._max.qtyProduced ?? 0;
  }

  if (data.qtyDefect !== undefined && data.qtyDefect !== null) {
    // 불량 수량 합산
    const totalDefect = await prisma.productionLog.aggregate({
      where: {
        productionOrderId: data.productionOrderId,
        qtyDefect: { not: null },
      },
      _sum: { qtyDefect: true },
    });
    updateData.defectQty = totalDefect._sum.qtyDefect ?? 0;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.productionOrder.update({
      where: { id: data.productionOrderId },
      data: updateData,
    });
  }

  return log;
}

/** 생산 지시서의 로그 목록 조회 */
export async function getProductionLogs(orderId: string) {
  return prisma.productionLog.findMany({
    where: { productionOrderId: orderId },
    include: {
      process: {
        select: { id: true, stepNo: true, processName: true },
      },
    },
    orderBy: { loggedAt: 'desc' },
  });
}

// ── 자재 불출/반납 ────────────────────────────────

/** 생산 지시서의 자재 목록 조회 */
export async function getOrderMaterials(orderId: string) {
  return prisma.productionMaterial.findMany({
    where: { productionOrderId: orderId },
    orderBy: { materialSku: 'asc' },
  });
}

/** 자재 일괄 불출 (plannedQty만큼 불출) */
export async function issueMaterials(orderId: string) {
  const materials = await prisma.productionMaterial.findMany({
    where: { productionOrderId: orderId },
  });

  if (materials.length === 0) {
    throw new Error('불출할 자재가 없습니다');
  }

  const now = new Date();
  const updated = [];

  for (const mat of materials) {
    if (mat.issuedAt) continue; // 이미 불출된 자재는 건너뜀

    const result = await prisma.productionMaterial.update({
      where: { id: mat.id },
      data: {
        issuedQty: mat.plannedQty,
        issuedAt: now,
      },
    });
    updated.push(result);
  }

  return { issuedCount: updated.length, materials: updated };
}

/** 잉여 자재 반납 */
export async function returnMaterials(
  orderId: string,
  items: ReturnMaterialItem[],
) {
  const returned = [];

  for (const item of items) {
    const material = await prisma.productionMaterial.findFirst({
      where: {
        productionOrderId: orderId,
        materialSku: item.materialSku,
      },
    });

    if (!material) {
      throw new Error(`자재를 찾을 수 없습니다: ${item.materialSku}`);
    }

    const result = await prisma.productionMaterial.update({
      where: { id: material.id },
      data: {
        returnedQty: { increment: item.qty },
      },
    });
    returned.push(result);
  }

  return { returnedCount: returned.length, materials: returned };
}

// ── 간트 차트 데이터 ──────────────────────────────

/** 간트 차트용 생산 지시서 데이터 조회 */
export async function getGanttData(
  siteId: string,
  startDate: string,
  endDate: string,
) {
  return prisma.productionOrder.findMany({
    where: {
      siteId,
      OR: [
        {
          plannedStartAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          plannedEndAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          AND: [
            { plannedStartAt: { lte: new Date(startDate) } },
            { plannedEndAt: { gte: new Date(endDate) } },
          ],
        },
      ],
    },
    include: {
      workCenter: {
        select: { id: true, code: true, name: true },
      },
      processes: {
        select: {
          id: true,
          stepNo: true,
          processName: true,
          status: true,
          plannedDuration: true,
          actualDuration: true,
          startedAt: true,
          endedAt: true,
        },
        orderBy: { stepNo: 'asc' },
      },
    },
    orderBy: { plannedStartAt: 'asc' },
  });
}

/** 생산 지시서 일정 변경 (간트 차트 드래그) */
export async function rescheduleOrder(
  orderId: string,
  newStart: string,
  newEnd: string,
) {
  const order = await prisma.productionOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error('생산 지시서를 찾을 수 없습니다');

  if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
    throw new Error('완료/취소된 지시서는 일정을 변경할 수 없습니다');
  }

  return prisma.productionOrder.update({
    where: { id: orderId },
    data: {
      plannedStartAt: new Date(newStart),
      plannedEndAt: new Date(newEnd),
    },
    include: { workCenter: true },
  });
}

// ── 설비 유지보수 ─────────────────────────────────

/** 유지보수 목록 조회 */
export async function getMaintenanceList(workCenterId?: string) {
  const where: Record<string, unknown> = {};
  if (workCenterId) where.workCenterId = workCenterId;

  return prisma.equipmentMaintenance.findMany({
    where,
    include: {
      workCenter: {
        select: { id: true, code: true, name: true, type: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** 고장 신고 — 작업장 상태 BREAKDOWN으로 변경 */
export async function reportBreakdown(workCenterId: string, notes?: string) {
  // 작업장 상태 BREAKDOWN으로 변경
  await prisma.workCenter.update({
    where: { id: workCenterId },
    data: { status: 'BREAKDOWN' },
  });

  // 유지보수 레코드 생성
  const maintenance = await prisma.equipmentMaintenance.create({
    data: {
      workCenterId,
      type: 'BREAKDOWN',
      status: 'PENDING',
      scheduledAt: new Date(),
      notes: notes ?? null,
    },
    include: {
      workCenter: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  return maintenance;
}

/** 정비 완료 — 작업장 상태 IDLE로 복원 */
export async function completeMaintenance(
  id: string,
  downtimeMinutes: number,
) {
  const maintenance = await prisma.equipmentMaintenance.findUnique({
    where: { id },
  });

  if (!maintenance) throw new Error('유지보수 기록을 찾을 수 없습니다');

  // 유지보수 완료 처리
  const updated = await prisma.equipmentMaintenance.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      downtimeMinutes,
    },
    include: {
      workCenter: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  // 작업장 상태 IDLE로 복원
  await prisma.workCenter.update({
    where: { id: maintenance.workCenterId },
    data: { status: 'IDLE' },
  });

  return updated;
}

// ── 생산 KPI / OEE / 불량 분석 ────────────────────

/** 기간별 생산 KPI 데이터 조회 */
export async function getProductionKpis(
  siteId: string,
  startDate: string,
  endDate: string,
) {
  // 사이트의 작업장 ID 목록
  const workCenters = await prisma.workCenter.findMany({
    where: { siteId },
    select: { id: true },
  });
  const wcIds = workCenters.map((wc) => wc.id);

  if (wcIds.length === 0) return [];

  return prisma.productionKpi.findMany({
    where: {
      workCenterId: { in: wcIds },
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    include: {
      workCenter: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: { date: 'asc' },
  });
}

/** 작업장별 OEE 요약 데이터 */
export async function getOeeData(siteId: string) {
  const workCenters = await prisma.workCenter.findMany({
    where: { siteId },
    select: { id: true, code: true, name: true, type: true, status: true, capacityPerDay: true },
  });

  if (workCenters.length === 0) return [];

  // 최근 30일 KPI 데이터 집계
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = [];

  for (const wc of workCenters) {
    const kpis = await prisma.productionKpi.findMany({
      where: {
        workCenterId: wc.id,
        date: { gte: thirtyDaysAgo },
      },
    });

    const totalPlanned = kpis.reduce((sum, k) => sum + k.plannedQty, 0);
    const totalActual = kpis.reduce((sum, k) => sum + k.actualQty, 0);
    const totalDefect = kpis.reduce((sum, k) => sum + k.defectQty, 0);
    const totalDowntime = kpis.reduce((sum, k) => sum + k.downtimeMinutes, 0);
    const avgOee = kpis.length > 0
      ? kpis.reduce((sum, k) => sum + k.oeeScore, 0) / kpis.length
      : 0;

    result.push({
      workCenter: wc,
      period: {
        startDate: thirtyDaysAgo.toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        days: kpis.length,
      },
      summary: {
        totalPlanned,
        totalActual,
        totalDefect,
        totalDowntime,
        achievementRate: totalPlanned > 0
          ? Math.round((totalActual / totalPlanned) * 10000) / 100
          : 0,
        defectRate: totalActual > 0
          ? Math.round((totalDefect / totalActual) * 10000) / 100
          : 0,
        avgOee: Math.round(avgOee * 100) / 100,
      },
    });
  }

  return result;
}

// ── 생산 계획 추천 (수주 → 생산 자동 연동) ────────

/** 생산 계획 추천 목록 조회 */
export async function getSuggestions(siteId: string, status: string) {
  const where: Record<string, unknown> = { siteId };
  if (status && status !== 'ALL') {
    where.status = status;
  }

  return prisma.productionPlanSuggestion.findMany({
    where,
    orderBy: [
      { urgencyLevel: 'asc' }, // CRITICAL → HIGH → NORMAL
      { deliveryDeadline: 'asc' },
    ],
  });
}

/** 확정된 수주를 분석해 생산 계획 추천 자동 생성 */
export async function generateSuggestions(siteId: string) {
  // CONFIRMED 수주 중 아직 생산 추천이 없는 건 조회
  const confirmedOrders = await prisma.salesOrder.findMany({
    where: {
      siteId,
      status: 'CONFIRMED',
    },
  });

  // 이미 추천이 존재하는 수주 ID 목록
  const existingSuggestions = await prisma.productionPlanSuggestion.findMany({
    where: {
      siteId,
      salesOrderId: { in: confirmedOrders.map((o) => o.id) },
    },
    select: { salesOrderId: true, productSku: true },
  });

  const existingSet = new Set(
    existingSuggestions.map((s) => `${s.salesOrderId}::${s.productSku}`),
  );

  // 사이트의 작업장 목록 (추천 작업장 배정용)
  const workCenters = await prisma.workCenter.findMany({
    where: { siteId, status: { in: ['IDLE', 'RUNNING'] } },
    orderBy: { capacityPerDay: 'desc' },
  });

  const created = [];

  for (const order of confirmedOrders) {
    const items = order.items as Array<{
      product_sku: string;
      qty: number;
      product_name?: string;
    }>;

    if (!items || items.length === 0) continue;

    for (const item of items) {
      const key = `${order.id}::${item.product_sku}`;
      if (existingSet.has(key)) continue;

      // 납기까지 남은 일수 기반 긴급도 판정
      let urgencyLevel = 'NORMAL';
      if (order.deliveryDeadline) {
        const daysUntil = Math.ceil(
          (order.deliveryDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntil <= 3) urgencyLevel = 'CRITICAL';
        else if (daysUntil <= 7) urgencyLevel = 'HIGH';
      }

      // BOM 기반 실행 가능성 판단
      let feasibility = 'FEASIBLE';
      try {
        const bomItems = await prisma.bomItem.findMany({
          where: { siteId, productSku: item.product_sku },
        });

        if (bomItems.length > 0) {
          for (const bom of bomItems) {
            const requiredMaterialQty = bom.qtyPerUnit * item.qty;
            // 재고 확인
            const balance = await prisma.inventoryBalance.findFirst({
              where: { siteId, sku: bom.materialSku },
            });
            const currentStock = balance?.qty ?? 0;
            if (currentStock < requiredMaterialQty) {
              feasibility = 'MATERIAL_SHORT';
              break;
            }
          }
        }
      } catch {
        // BOM 조회 실패 시 FEASIBLE 유지
      }

      // 작업장 가용성 확인
      const recommendedWc = workCenters.length > 0 ? workCenters[0] : null;
      if (recommendedWc) {
        // 해당 작업장의 진행중 작업 수 확인
        const activeOrders = await prisma.productionOrder.count({
          where: {
            workCenterId: recommendedWc.id,
            status: { in: ['IN_PROGRESS', 'RELEASED'] },
          },
        });
        // 일일 가용 수량 초과 시 CAPACITY_FULL
        if (activeOrders >= (recommendedWc.capacityPerDay || 10)) {
          if (feasibility === 'FEASIBLE') feasibility = 'CAPACITY_FULL';
        }
      }

      // 추천 일정 계산 (납기 3일 전 완료 목표)
      let recommendedStartAt: Date | null = null;
      let recommendedEndAt: Date | null = null;
      if (order.deliveryDeadline) {
        // 생산 리드타임 추정: 수량 기반 (100개당 1일)
        const estimatedDays = Math.max(1, Math.ceil(item.qty / 100));
        recommendedEndAt = new Date(order.deliveryDeadline);
        recommendedEndAt.setDate(recommendedEndAt.getDate() - 1); // 납기 1일 전 완료
        recommendedStartAt = new Date(recommendedEndAt);
        recommendedStartAt.setDate(recommendedStartAt.getDate() - estimatedDays);
      }

      // 추천 사유 생성
      const reasons: string[] = [];
      reasons.push(`수주 ${order.orderNo} 확정 → 생산 필요`);
      if (urgencyLevel === 'CRITICAL') reasons.push('납기까지 3일 이내 — 긴급 대응 필요');
      else if (urgencyLevel === 'HIGH') reasons.push('납기까지 7일 이내 — 우선 처리 권장');
      if (feasibility === 'MATERIAL_SHORT') reasons.push('BOM 자재 재고 부족 — 자재 확보 후 착수');
      else if (feasibility === 'CAPACITY_FULL') reasons.push('작업장 가용 용량 초과 — 일정 조율 필요');

      const suggestion = await prisma.productionPlanSuggestion.create({
        data: {
          siteId,
          salesOrderId: order.id,
          salesOrderNo: order.orderNo,
          productSku: item.product_sku,
          productName: item.product_name ?? null,
          requiredQty: item.qty,
          deliveryDeadline: order.deliveryDeadline,
          recommendedStartAt,
          recommendedEndAt,
          recommendedWorkCenterId: recommendedWc?.id ?? null,
          urgencyLevel,
          feasibility,
          reason: reasons.join('\n'),
          status: 'PENDING',
        },
      });

      created.push(suggestion);
    }
  }

  return { generated: created.length, suggestions: created };
}

/** 생산 계획 추천 수락 — 생산 지시서 자동 생성 */
export async function acceptSuggestion(id: string) {
  const suggestion = await prisma.productionPlanSuggestion.findUnique({
    where: { id },
  });

  if (!suggestion) throw new Error('생산 계획 추천을 찾을 수 없습니다');
  if (suggestion.status !== 'PENDING') {
    throw new Error(`이미 처리된 추천입니다 (상태: ${suggestion.status})`);
  }

  // 생산 지시서 생성
  const order = await createProductionOrder({
    siteId: suggestion.siteId,
    salesOrderId: suggestion.salesOrderId,
    productSku: suggestion.productSku,
    productName: suggestion.productName ?? undefined,
    plannedQty: suggestion.requiredQty,
    priority: suggestion.urgencyLevel === 'CRITICAL' ? 'URGENT'
      : suggestion.urgencyLevel === 'HIGH' ? 'HIGH' : 'NORMAL',
    plannedStartAt: suggestion.recommendedStartAt?.toISOString(),
    plannedEndAt: suggestion.recommendedEndAt?.toISOString(),
    workCenterId: suggestion.recommendedWorkCenterId ?? undefined,
    notes: `수주 ${suggestion.salesOrderNo} 기반 추천 수락`,
  });

  // 추천 상태 업데이트
  const updated = await prisma.productionPlanSuggestion.update({
    where: { id },
    data: {
      status: 'ACCEPTED',
      productionOrderId: order.id,
    },
  });

  return { suggestion: updated, productionOrder: order };
}

/** 생산 계획 추천 거절 */
export async function rejectSuggestion(id: string, reason?: string) {
  const suggestion = await prisma.productionPlanSuggestion.findUnique({
    where: { id },
  });

  if (!suggestion) throw new Error('생산 계획 추천을 찾을 수 없습니다');
  if (suggestion.status !== 'PENDING') {
    throw new Error(`이미 처리된 추천입니다 (상태: ${suggestion.status})`);
  }

  return prisma.productionPlanSuggestion.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reason: reason
        ? `${suggestion.reason ?? ''}\n[거절 사유] ${reason}`
        : suggestion.reason,
    },
  });
}

/** 불량 원인별 분석 */
export async function getDefectAnalysis(siteId: string) {
  // 사이트의 생산 지시서 ID 조회
  const orders = await prisma.productionOrder.findMany({
    where: { siteId },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  if (orderIds.length === 0) return { totalDefects: 0, reasons: [] };

  // 불량 로그에서 원인별 집계
  const defectLogs = await prisma.productionLog.findMany({
    where: {
      productionOrderId: { in: orderIds },
      logType: 'DEFECT',
      qtyDefect: { not: null },
    },
    select: {
      defectReason: true,
      qtyDefect: true,
    },
  });

  // 원인 코드별 그루핑
  const reasonMap: Record<string, { count: number; totalQty: number }> = {};

  for (const log of defectLogs) {
    const reason = log.defectReason ?? 'UNKNOWN';
    if (!reasonMap[reason]) {
      reasonMap[reason] = { count: 0, totalQty: 0 };
    }
    reasonMap[reason].count += 1;
    reasonMap[reason].totalQty += log.qtyDefect ?? 0;
  }

  const totalDefects = Object.values(reasonMap).reduce(
    (sum, r) => sum + r.totalQty,
    0,
  );

  // 비율 계산 후 정렬
  const reasons = Object.entries(reasonMap)
    .map(([reason, data]) => ({
      reason,
      count: data.count,
      totalQty: data.totalQty,
      percentage: totalDefects > 0
        ? Math.round((data.totalQty / totalDefects) * 10000) / 100
        : 0,
    }))
    .sort((a, b) => b.totalQty - a.totalQty);

  return { totalDefects, reasons };
}
