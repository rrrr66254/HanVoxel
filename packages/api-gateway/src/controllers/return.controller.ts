/**
 * 반품 & 불량 관리 컨트롤러
 */
import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as returnService from '../services/return.service';

// ── 반품 목록 조회 ────────────────────────────────

export async function listHandler(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId ? String(req.query.siteId) : undefined;
    const type = req.query.type ? String(req.query.type) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const partnerId = req.query.partnerId ? String(req.query.partnerId) : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const result = await returnService.listReturns({ siteId, type, status, partnerId, page, limit });
    res.json(successResponse(result.returns, { total: result.total, page: result.page, limit: result.limit }));
  } catch (err) {
    console.error('반품 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '반품 목록 조회에 실패했습니다'));
  }
}

// ── 반품 주문 생성 ────────────────────────────────

export async function createHandler(req: Request, res: Response) {
  try {
    const { siteId, type, partnerId, originalOrderId, reasonType, reasonDetail, items } = req.body;
    if (!siteId || !type || !partnerId || !reasonType || !items?.length) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, type, partnerId, reasonType, items는 필수입니다'));
      return;
    }

    const returnOrder = await returnService.createReturn({
      siteId, type, partnerId, originalOrderId, reasonType, reasonDetail, items,
    });
    res.status(201).json(successResponse(returnOrder));
  } catch (err) {
    console.error('반품 주문 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '반품 주문 생성에 실패했습니다'));
  }
}

// ── 반품 상세 조회 ────────────────────────────────

export async function detailHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const returnOrder = await returnService.getReturnById(id);
    if (!returnOrder) {
      res.status(404).json(errorResponse('NOT_FOUND', '반품 주문을 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(returnOrder));
  } catch (err) {
    console.error('반품 상세 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '반품 상세 조회에 실패했습니다'));
  }
}

// ── 반품 검수 (승인 수량 설정) ────────────────────

export async function inspectHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { items } = req.body;
    if (!items?.length) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'items는 필수입니다'));
      return;
    }

    const result = await returnService.inspectReturn(id, { items });
    res.json(successResponse(result));
  } catch (err) {
    console.error('반품 검수 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '반품 검수에 실패했습니다'));
  }
}

// ── 반품 처분 ─────────────────────────────────────

export async function disposeHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { returnItemId, disposalType, qty, reworkProductionOrderId, cost, processedBy, notes } = req.body;
    if (!returnItemId || !disposalType || !qty) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'returnItemId, disposalType, qty는 필수입니다'));
      return;
    }

    const disposal = await returnService.createDisposal(id, {
      returnItemId, disposalType, qty, reworkProductionOrderId, cost, processedBy, notes,
    });
    res.status(201).json(successResponse(disposal));
  } catch (err) {
    console.error('반품 처분 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '반품 처분에 실패했습니다'));
  }
}

// ── 공급업체 클레임 생성 ──────────────────────────

export async function claimHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { vendorId, claimAmount } = req.body;
    if (!vendorId || claimAmount === undefined) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'vendorId, claimAmount는 필수입니다'));
      return;
    }

    const claim = await returnService.createVendorClaim(id, { vendorId, claimAmount });
    res.status(201).json(successResponse(claim));
  } catch (err) {
    console.error('클레임 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '클레임 생성에 실패했습니다'));
  }
}

// ── 반품 분석 통계 ────────────────────────────────

export async function analyticsHandler(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!siteId || !from || !to) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, from, to는 필수입니다'));
      return;
    }

    const analytics = await returnService.getReturnAnalytics(siteId, from, to);
    res.json(successResponse(analytics));
  } catch (err) {
    console.error('반품 분석 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '반품 분석 조회에 실패했습니다'));
  }
}
