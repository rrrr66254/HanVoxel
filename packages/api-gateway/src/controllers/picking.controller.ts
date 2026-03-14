import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as pickingService from '../services/picking.service';

// POST /api/v1/picking/orders
export async function createOrder(req: Request, res: Response) {
  try {
    const { siteId, orderNo, lines, ...rest } = req.body;
    if (!siteId || !orderNo || !lines || !Array.isArray(lines) || lines.length === 0) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, orderNo, lines(배열)는 필수입니다'));
      return;
    }
    const order = await pickingService.createPickingOrder({ siteId, orderNo, lines, ...rest });
    res.status(201).json(successResponse(order));
  } catch (err) {
    console.error('피킹 주문 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '피킹 주문 생성에 실패했습니다'));
  }
}

// GET /api/v1/picking/orders?siteId=&status=&assigneeId=
export async function listOrders(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId는 필수입니다'));
      return;
    }
    const status = req.query.status as string | undefined;
    const assigneeId = req.query.assigneeId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const { orders, total } = await pickingService.getPickingOrders(siteId, { status, assigneeId, limit });
    res.json(successResponse(orders, { total }));
  } catch (err) {
    console.error('피킹 주문 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '피킹 주문 조회에 실패했습니다'));
  }
}

// GET /api/v1/picking/orders/:id
export async function getOrder(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const order = await pickingService.getPickingOrderById(id);
    if (!order) {
      res.status(404).json(errorResponse('NOT_FOUND', '피킹 주문을 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(order));
  } catch (err) {
    console.error('피킹 주문 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '피킹 주문 조회에 실패했습니다'));
  }
}

// PATCH /api/v1/picking/orders/:id/assign
export async function assignOrder(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { assigneeId, assigneeName } = req.body;
    if (!assigneeId || !assigneeName) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'assigneeId, assigneeName은 필수입니다'));
      return;
    }
    const order = await pickingService.assignOrder(id, assigneeId, assigneeName);
    res.json(successResponse(order));
  } catch (err) {
    console.error('피킹 배정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '피킹 배정에 실패했습니다'));
  }
}

// PATCH /api/v1/picking/orders/:id/start
export async function startPicking(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const order = await pickingService.startPicking(id);
    res.json(successResponse(order));
  } catch (err) {
    console.error('피킹 시작 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '피킹 시작에 실패했습니다'));
  }
}

// PATCH /api/v1/picking/lines/:id/pick
export async function pickLine(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { pickedQty, scanVerified, errorReason } = req.body;
    if (pickedQty === undefined) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'pickedQty는 필수입니다'));
      return;
    }
    const line = await pickingService.pickLine(id, { pickedQty, scanVerified, errorReason });
    res.json(successResponse(line));
  } catch (err) {
    console.error('라인 피킹 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '라인 피킹에 실패했습니다'));
  }
}

// GET /api/v1/picking/stats?siteId=&days=
export async function getStats(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId는 필수입니다'));
      return;
    }
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    const stats = await pickingService.getPickingStats(siteId, days);
    res.json(successResponse(stats));
  } catch (err) {
    console.error('피킹 통계 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '피킹 통계 조회에 실패했습니다'));
  }
}
