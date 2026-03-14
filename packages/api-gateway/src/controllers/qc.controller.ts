import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as qcService from '../services/qc.service';

// ── 공급업체 ────────────────────────────────────────────

// PUT /api/v1/qc/suppliers
export async function upsertSupplier(req: Request, res: Response) {
  try {
    const { companyId, name, code, contact, email } = req.body;
    if (!companyId || !name || !code) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'companyId, name, code는 필수입니다'));
      return;
    }
    const supplier = await qcService.upsertSupplier({ companyId, name, code, contact, email });
    res.json(successResponse(supplier));
  } catch (err) {
    console.error('공급업체 저장 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '공급업체 저장에 실패했습니다'));
  }
}

// GET /api/v1/qc/suppliers?companyId=
export async function listSuppliers(req: Request, res: Response) {
  try {
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'companyId는 필수입니다'));
      return;
    }
    const suppliers = await qcService.getSuppliers(companyId);
    res.json(successResponse(suppliers, { total: suppliers.length }));
  } catch (err) {
    console.error('공급업체 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '공급업체 조회에 실패했습니다'));
  }
}

// GET /api/v1/qc/suppliers/:id/scorecard?months=
export async function getScorecard(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const months = req.query.months ? parseInt(req.query.months as string) : 6;
    const scorecard = await qcService.getSupplierScorecard(id, months);

    // 공급업체 등급 자동 업데이트
    await qcService.updateSupplierScore(id, scorecard.qualityScore, scorecard.grade);

    res.json(successResponse(scorecard));
  } catch (err) {
    console.error('스코어카드 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '스코어카드 조회에 실패했습니다'));
  }
}

// ── 검수 기록 ───────────────────────────────────────────

// POST /api/v1/qc/inspections
export async function createInspection(req: Request, res: Response) {
  try {
    const { siteId, type, totalQty, ...rest } = req.body;
    if (!siteId || !type || totalQty === undefined) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, type, totalQty는 필수입니다'));
      return;
    }
    const inspection = await qcService.createInspection({ siteId, type, totalQty, ...rest });
    res.status(201).json(successResponse(inspection));
  } catch (err) {
    console.error('검수 기록 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '검수 기록 생성에 실패했습니다'));
  }
}

// GET /api/v1/qc/inspections?siteId=&type=&supplierId=&from=&to=
export async function listInspections(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId는 필수입니다'));
      return;
    }
    const type = req.query.type as string | undefined;
    const supplierId = req.query.supplierId as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const { inspections, total } = await qcService.getInspections(siteId, { type, supplierId, from, to, limit, offset });
    res.json(successResponse(inspections, { total }));
  } catch (err) {
    console.error('검수 기록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '검수 기록 조회에 실패했습니다'));
  }
}

// GET /api/v1/qc/inspections/:id
export async function getInspection(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const inspection = await qcService.getInspectionById(id);
    if (!inspection) {
      res.status(404).json(errorResponse('NOT_FOUND', '검수 기록을 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(inspection));
  } catch (err) {
    console.error('검수 기록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '검수 기록 조회에 실패했습니다'));
  }
}

// ── 격리 재고 ───────────────────────────────────────────

// GET /api/v1/qc/quarantine?siteId=
export async function getQuarantineItems(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId는 필수입니다'));
      return;
    }
    const items = await qcService.getQuarantineItems(siteId);
    res.json(successResponse(items, { total: items.length }));
  } catch (err) {
    console.error('격리 재고 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '격리 재고 조회에 실패했습니다'));
  }
}

// ── QC 통계 ─────────────────────────────────────────────

// GET /api/v1/qc/stats?siteId=&days=
export async function getStats(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId는 필수입니다'));
      return;
    }
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const stats = await qcService.getQcStats(siteId, days);
    res.json(successResponse(stats));
  } catch (err) {
    console.error('QC 통계 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'QC 통계 조회에 실패했습니다'));
  }
}
