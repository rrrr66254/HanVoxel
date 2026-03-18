/**
 * 생산 관리 (MES) 컨트롤러
 */
import type { Request, Response } from 'express';
import * as productionService from '../services/production.service';

// ── 작업장 목록 조회 ────────────────────────────────

export async function listWorkCentersHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await productionService.getWorkCenters(siteId);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '작업장 목록 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 작업장 생성 ─────────────────────────────────────

export async function createWorkCenterHandler(req: Request, res: Response) {
  try {
    const { siteId, name, type, capacityPerDay, responsibleUser } = req.body;
    if (!siteId || !name) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, name 필수' } });
      return;
    }

    const workCenter = await productionService.createWorkCenter({
      siteId, name, type, capacityPerDay, responsibleUser,
    });
    res.status(201).json({ success: true, data: workCenter });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '작업장 생성 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 작업장 상태 변경 ────────────────────────────────

export async function updateWorkCenterStatusHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'status 필수' } });
      return;
    }

    const result = await productionService.updateWorkCenterStatus(id, status);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '작업장 상태 변경 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 생산 지시서 목록 조회 ───────────────────────────

export async function listOrdersHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const status = req.query.status ? String(req.query.status) : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await productionService.getProductionOrders(siteId, status, page, limit);
    res.json({ success: true, data: result.orders, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 지시서 목록 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 생산 지시서 상세 조회 ───────────────────────────

export async function getOrderHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const order = await productionService.getProductionOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '생산 지시서를 찾을 수 없습니다' } });
      return;
    }
    res.json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 지시서 상세 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 생산 지시서 생성 ────────────────────────────────

export async function createOrderHandler(req: Request, res: Response) {
  try {
    const {
      siteId, productSku, productName, plannedQty, priority,
      plannedStartAt, plannedEndAt, workCenterId, salesOrderId,
      assignedWorkers, notes,
    } = req.body;
    if (!siteId || !productSku || !productName || !plannedQty || !workCenterId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, productSku, productName, plannedQty, workCenterId 필수' } });
      return;
    }

    const order = await productionService.createProductionOrder({
      siteId, productSku, productName, plannedQty, priority,
      plannedStartAt, plannedEndAt, workCenterId, salesOrderId,
      assignedWorkers, notes,
    });
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 지시서 생성 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 생산 지시서 상태 변경 ───────────────────────────

export async function updateOrderStatusHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'status 필수' } });
      return;
    }

    const result = await productionService.updateProductionOrderStatus(id, status);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 지시서 상태 변경 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 수주 기반 생산 지시서 자동 생성 ─────────────────

export async function autoCreateOrderHandler(req: Request, res: Response) {
  try {
    const { salesOrderId } = req.body;
    if (!salesOrderId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'salesOrderId 필수' } });
      return;
    }

    const order = await productionService.autoCreateFromSalesOrder(salesOrderId);
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '자동 생산 지시서 생성 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 생산 실적 입력 ──────────────────────────────────

export async function addLogHandler(req: Request, res: Response) {
  try {
    const orderId = String(req.params.id ?? '');
    const { processId, logType, qtyProduced, qtyDefect, defectReason, workerId, notes } = req.body;
    if (!logType) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'logType 필수' } });
      return;
    }

    const log = await productionService.addProductionLog({
      productionOrderId: orderId,
      processId, logType, qtyProduced, qtyDefect, defectReason, workerId, notes,
    });
    res.status(201).json({ success: true, data: log });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 실적 입력 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 생산 실적 로그 조회 ─────────────────────────────

export async function getLogsHandler(req: Request, res: Response) {
  try {
    const orderId = String(req.params.id ?? '');
    const logs = await productionService.getProductionLogs(orderId);
    res.json({ success: true, data: logs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 실적 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 자재 소요량 조회 ────────────────────────────────

export async function getOrderMaterialsHandler(req: Request, res: Response) {
  try {
    const orderId = String(req.params.id ?? '');
    const materials = await productionService.getOrderMaterials(orderId);
    res.json({ success: true, data: materials });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '자재 소요량 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 자재 불출 처리 ──────────────────────────────────

export async function issueMaterialsHandler(req: Request, res: Response) {
  try {
    const orderId = String(req.params.id ?? '');
    const result = await productionService.issueMaterials(orderId);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '자재 불출 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 자재 반납 처리 ──────────────────────────────────

export async function returnMaterialsHandler(req: Request, res: Response) {
  try {
    const orderId = String(req.params.id ?? '');
    const { items } = req.body;
    if (!items?.length) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'items 필수' } });
      return;
    }

    const result = await productionService.returnMaterials(orderId, items);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '자재 반납 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 간트 차트 데이터 조회 ───────────────────────────

export async function getGanttHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const startDate = String(req.query.startDate ?? '');
    const endDate = String(req.query.endDate ?? '');
    if (!siteId || !startDate || !endDate) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, startDate, endDate 필수' } });
      return;
    }

    const data = await productionService.getGanttData(siteId, startDate, endDate);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '간트 차트 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 생산 일정 재조정 ────────────────────────────────

export async function rescheduleHandler(req: Request, res: Response) {
  try {
    const { orderId, newStart, newEnd } = req.body;
    if (!orderId || !newStart || !newEnd) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'orderId, newStart, newEnd 필수' } });
      return;
    }

    const result = await productionService.rescheduleOrder(orderId, newStart, newEnd);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '일정 재조정 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 설비 유지보수 목록 조회 ─────────────────────────

export async function listMaintenanceHandler(req: Request, res: Response) {
  try {
    const workCenterId = req.query.workCenterId ? String(req.query.workCenterId) : undefined;
    const data = await productionService.getMaintenanceList(workCenterId);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '유지보수 목록 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 설비 고장 신고 ──────────────────────────────────

export async function reportBreakdownHandler(req: Request, res: Response) {
  try {
    const { workCenterId, notes } = req.body;
    if (!workCenterId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'workCenterId 필수' } });
      return;
    }

    const result = await productionService.reportBreakdown(workCenterId, notes);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '고장 신고 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 유지보수 완료 처리 ──────────────────────────────

export async function completeMaintenanceHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const { downtimeMinutes } = req.body;
    if (downtimeMinutes === undefined || downtimeMinutes === null) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'downtimeMinutes 필수' } });
      return;
    }

    const result = await productionService.completeMaintenance(id, downtimeMinutes);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '유지보수 완료 처리 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 생산 KPI 조회 ───────────────────────────────────

export async function getKpisHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const startDate = String(req.query.startDate ?? '');
    const endDate = String(req.query.endDate ?? '');
    if (!siteId || !startDate || !endDate) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, startDate, endDate 필수' } });
      return;
    }

    const data = await productionService.getProductionKpis(siteId, startDate, endDate);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'KPI 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── OEE (설비 종합 효율) 조회 ───────────────────────

export async function getOeeHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const data = await productionService.getOeeData(siteId);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OEE 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 불량 분석 조회 ──────────────────────────────────

export async function getDefectsHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const data = await productionService.getDefectAnalysis(siteId);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '불량 분석 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 생산 계획 추천 목록 조회 ────────────────────────

export async function listSuggestionsHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const status = req.query.status ? String(req.query.status) : 'PENDING';
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const data = await productionService.getSuggestions(siteId, status);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 계획 추천 목록 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 생산 계획 추천 자동 생성 ────────────────────────

export async function generateSuggestionsHandler(req: Request, res: Response) {
  try {
    const { siteId } = req.body;
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const data = await productionService.generateSuggestions(siteId);
    res.status(201).json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 계획 추천 생성 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 생산 계획 추천 수락 ─────────────────────────────

export async function acceptSuggestionHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    if (!id) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'id 필수' } });
      return;
    }

    const data = await productionService.acceptSuggestion(id);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 계획 추천 수락 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 생산 계획 추천 거절 ─────────────────────────────

export async function rejectSuggestionHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const { reason } = req.body;
    if (!id) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'id 필수' } });
      return;
    }

    const data = await productionService.rejectSuggestion(id, reason);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '생산 계획 추천 거절 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}
