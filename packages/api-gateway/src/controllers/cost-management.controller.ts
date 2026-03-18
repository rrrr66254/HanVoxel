/**
 * 원가 관리 컨트롤러 — 원가 항목, 제품 원가, 생산 실적 원가, 수주 수익성
 */
import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as costManagementService from '../services/cost-management.service';

// ── 원가 항목 ────────────────────────────────────────────

/** 원가 항목 목록 조회 */
export async function listCostItems(req: Request, res: Response) {
  try {
    const { siteId, type, search, limit } = req.query;
    const result = await costManagementService.getCostItems(
      siteId as string,
      {
        type: type as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
      },
    );
    res.json(successResponse(result.items, { total: result.total }));
  } catch (err) {
    console.error('원가 항목 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '원가 항목 조회에 실패했습니다'));
  }
}

/** 원가 항목 생성 */
export async function createCostItem(req: Request, res: Response) {
  try {
    const item = await costManagementService.createCostItem(req.body);
    res.status(201).json(successResponse(item));
  } catch (err) {
    console.error('원가 항목 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '원가 항목 생성에 실패했습니다'));
  }
}

/** 원가 항목 수정 */
export async function updateCostItem(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const item = await costManagementService.updateCostItem(id, req.body);
    res.json(successResponse(item));
  } catch (err) {
    console.error('원가 항목 수정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '원가 항목 수정에 실패했습니다'));
  }
}

// ── 제품별 원가 구성 ─────────────────────────────────────

/** 제품 SKU 기준 원가 내역 조회 */
export async function getProductCost(req: Request, res: Response) {
  try {
    const productSku = req.params.sku as string;
    const siteId = req.query.siteId as string;
    const result = await costManagementService.getProductCost(siteId, productSku);
    res.json(successResponse(result));
  } catch (err) {
    console.error('제품 원가 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '제품 원가 조회에 실패했습니다'));
  }
}

// ── 생산 실적 원가 ───────────────────────────────────────

/** 생산 지시서 기반 실제 원가 계산 */
export async function calculateProductionCost(req: Request, res: Response) {
  try {
    const productionOrderId = req.params.productionOrderId as string;
    const result = await costManagementService.calculateProductionCost(productionOrderId);
    res.json(successResponse(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : '생산 원가 계산 실패';
    console.error('생산 원가 계산 실패:', err);
    res.status(500).json(errorResponse('CALCULATION_ERROR', message));
  }
}

// ── 수주 수익성 ──────────────────────────────────────────

/** 전체 수주 수익성 목록 조회 */
export async function listProfitability(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    const result = await costManagementService.getProfitabilityList(siteId);
    res.json(successResponse(result));
  } catch (err) {
    console.error('수익성 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '수익성 목록 조회에 실패했습니다'));
  }
}

/** 단일 수주 수익성 상세 조회 */
export async function getProfitability(req: Request, res: Response) {
  try {
    const salesOrderId = req.params.salesOrderId as string;
    const result = await costManagementService.getProfitability(salesOrderId);
    if (!result) {
      res.status(404).json(errorResponse('NOT_FOUND', '수주 수익성 데이터를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(result));
  } catch (err) {
    console.error('수익성 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '수익성 조회에 실패했습니다'));
  }
}

/** 수주 수익성 재계산 */
export async function recalculateProfitability(req: Request, res: Response) {
  try {
    const salesOrderId = req.params.salesOrderId as string;
    const result = await costManagementService.recalculateProfitability(salesOrderId);
    res.json(successResponse(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : '수익성 재계산 실패';
    console.error('수익성 재계산 실패:', err);
    res.status(500).json(errorResponse('RECALCULATE_ERROR', message));
  }
}
