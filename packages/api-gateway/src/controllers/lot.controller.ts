import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as lotService from '../services/lot.service';

// ── LOT 목록 조회 ─────────────────────────────────────────

// GET /api/v1/lots?siteId=&skuCode=&status=&lotType=
export async function listLots(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId는 필수입니다'));
      return;
    }

    const skuCode = req.query.skuCode as string | undefined;
    const status = req.query.status as string | undefined;
    const lotType = req.query.lotType as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const { lots, total } = await lotService.listLots({ siteId, skuCode, status, lotType, limit, offset });
    res.json(successResponse(lots, { total }));
  } catch (err) {
    console.error('LOT 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'LOT 목록 조회에 실패했습니다'));
  }
}

// ── LOT 생성 ──────────────────────────────────────────────

// POST /api/v1/lots
export async function createLot(req: Request, res: Response) {
  try {
    const { siteId, companyId, skuCode, lotType, quantity } = req.body;
    if (!siteId || !companyId || !skuCode || !lotType || quantity === undefined) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, companyId, skuCode, lotType, quantity는 필수입니다'));
      return;
    }
    const lot = await lotService.createLot(req.body);
    res.status(201).json(successResponse(lot));
  } catch (err) {
    console.error('LOT 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'LOT 생성에 실패했습니다'));
  }
}

// ── LOT 상세 조회 ─────────────────────────────────────────

// GET /api/v1/lots/:id
export async function getLotById(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const lot = await lotService.getLotById(id);
    if (!lot) {
      res.status(404).json(errorResponse('NOT_FOUND', 'LOT를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(lot));
  } catch (err) {
    console.error('LOT 상세 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'LOT 상세 조회에 실패했습니다'));
  }
}

// ── 정방향 추적 ───────────────────────────────────────────

// GET /api/v1/lots/:id/trace-forward
export async function traceForward(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const trace = await lotService.traceForward(id);
    if (!trace) {
      res.status(404).json(errorResponse('NOT_FOUND', 'LOT를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(trace));
  } catch (err) {
    console.error('정방향 추적 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '정방향 추적에 실패했습니다'));
  }
}

// ── 역방향 추적 ───────────────────────────────────────────

// GET /api/v1/lots/:id/trace-backward
export async function traceBackward(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const trace = await lotService.traceBackward(id);
    if (!trace) {
      res.status(404).json(errorResponse('NOT_FOUND', 'LOT를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(trace));
  } catch (err) {
    console.error('역방향 추적 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '역방향 추적에 실패했습니다'));
  }
}

// ── 리콜 분석 ─────────────────────────────────────────────

// GET /api/v1/lots/recall?lotId=
export async function recallAnalysis(req: Request, res: Response) {
  try {
    const lotId = req.query.lotId as string;
    if (!lotId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'lotId는 필수입니다'));
      return;
    }
    const analysis = await lotService.getRecallAnalysis(lotId);
    if (!analysis) {
      res.status(404).json(errorResponse('NOT_FOUND', 'LOT를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(analysis));
  } catch (err) {
    console.error('리콜 분석 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '리콜 분석에 실패했습니다'));
  }
}

// ── LOT 라벨 데이터 ───────────────────────────────────────

// GET /api/v1/lots/:id/label
export async function getLotLabel(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const label = await lotService.getLotLabel(id);
    if (!label) {
      res.status(404).json(errorResponse('NOT_FOUND', 'LOT를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(label));
  } catch (err) {
    console.error('LOT 라벨 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'LOT 라벨 조회에 실패했습니다'));
  }
}

// ── LOT 이동 기록 추가 ────────────────────────────────────

// POST /api/v1/lots/:id/movements
export async function addMovement(req: Request, res: Response) {
  try {
    const lotId = req.params.id;
    const { movementType, quantity } = req.body;
    if (!movementType || quantity === undefined) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'movementType, quantity는 필수입니다'));
      return;
    }

    // LOT 존재 여부 확인
    const lot = await lotService.getLotById(lotId);
    if (!lot) {
      res.status(404).json(errorResponse('NOT_FOUND', 'LOT를 찾을 수 없습니다'));
      return;
    }

    const movement = await lotService.addMovement(lotId, req.body);
    res.status(201).json(successResponse(movement));
  } catch (err) {
    console.error('LOT 이동 기록 추가 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'LOT 이동 기록 추가에 실패했습니다'));
  }
}
