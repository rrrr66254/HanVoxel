/**
 * 수주 관리 + MRP + BOM + 재고 더블체크 컨트롤러
 */
import type { Request, Response } from 'express';
import * as soService from '../services/sales-order.service';

// ── 수주 CRUD ───────────────────────────────────

export async function createHandler(req: Request, res: Response) {
  try {
    const { siteId, customerId, customerName, orderDate, deliveryDeadline, items, notes } = req.body;
    if (!siteId || !items?.length) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, items 필수' } });
      return;
    }
    const order = await soService.createSalesOrder({ siteId, customerId, customerName, orderDate, deliveryDeadline, items, notes });
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '수주 생성 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function listHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const status = req.query.status ? String(req.query.status) : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }
    const result = await soService.getSalesOrders(siteId, status, page, limit);
    res.json({ success: true, data: result.orders, meta: { total: result.total, page, limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '수주 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function updateHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const { customerName, deliveryDeadline, status, notes, items } = req.body;
    const order = await soService.updateSalesOrder(id, { customerName, deliveryDeadline, status, notes, items });
    res.json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '수주 수정 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

export async function detailHandler(req: Request, res: Response) {
  try {
    const order = await soService.getSalesOrder(String(req.params.id));
    if (!order) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '수주를 찾을 수 없습니다' } });
      return;
    }
    res.json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '수주 상세 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── MRP ─────────────────────────────────────────

export async function runMrpHandler(req: Request, res: Response) {
  try {
    const result = await soService.runMrp(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'MRP 계산 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

export async function getMrpHandler(req: Request, res: Response) {
  try {
    const results = await soService.getMrpResults(String(req.params.id));
    res.json({ success: true, data: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'MRP 결과 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function triggerReordersHandler(req: Request, res: Response) {
  try {
    const result = await soService.triggerReorders(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '자동 발주 생성 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── BOM ─────────────────────────────────────────

export async function createBomHandler(req: Request, res: Response) {
  try {
    const { siteId, productSku, materialSku, qtyPerUnit, unit, leadTimeDays, notes } = req.body;
    if (!siteId || !productSku || !materialSku || !qtyPerUnit) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, productSku, materialSku, qtyPerUnit 필수' } });
      return;
    }
    const bom = await soService.createBomItem({ siteId, productSku, materialSku, qtyPerUnit, unit, leadTimeDays, notes });
    res.status(201).json({ success: true, data: bom });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'BOM 등록 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function getBomHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const productSku = String(req.params.productSku ?? '');
    if (!siteId || !productSku) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, productSku 필수' } });
      return;
    }
    const bom = await soService.getBomByProduct(siteId, productSku);
    res.json({ success: true, data: bom });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'BOM 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function bulkBomUploadHandler(req: Request, res: Response) {
  try {
    const { siteId, items } = req.body;
    if (!siteId || !items?.length) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, items 필수' } });
      return;
    }
    const result = await soService.bulkCreateBom(siteId, items);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'BOM 업로드 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 재고 더블체크 ───────────────────────────────

export async function stockChecksHandler(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId ? String(req.query.siteId) : undefined;
    const assignedTo = req.query.assignedTo ? String(req.query.assignedTo) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await soService.getStockChecks(siteId, assignedTo, status, page, limit);
    res.json({ success: true, data: result.checks, meta: { total: result.total, page, limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '더블체크 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function confirmStockCheckHandler(req: Request, res: Response) {
  try {
    const { actualQty, notes } = req.body;
    if (actualQty === undefined || actualQty === null) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'actualQty 필수' } });
      return;
    }
    const result = await soService.confirmStockCheck(String(req.params.id), Number(actualQty), notes);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '확인 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

export async function discrepancyHandler(req: Request, res: Response) {
  try {
    const { actualQty, notes } = req.body;
    if (actualQty === undefined || !notes) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'actualQty, notes 필수' } });
      return;
    }
    const result = await soService.reportDiscrepancy(String(req.params.id), Number(actualQty), notes);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '불일치 신고 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}
