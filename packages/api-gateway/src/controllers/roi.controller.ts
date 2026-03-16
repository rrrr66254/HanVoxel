import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as roiService from '../services/roi.service';

// POST /api/v1/roi/baseline — 기준선 저장
export async function saveBaseline(req: Request, res: Response) {
  try {
    const {
      companyId, siteId, annualLaborCost, annualErrorCost, monthlyRentPerM2,
      warehouseArea, monthlyPickings, errorRate, employeeCount,
      laborSavingRate, errorReductionRate, spaceSavingRate, pickingEfficiencyGain,
    } = req.body;

    if (!companyId || !siteId) {
      res.status(400).json(errorResponse('INVALID_INPUT', 'companyId와 siteId는 필수입니다'));
      return;
    }

    const baseline = await roiService.upsertBaseline({
      companyId, siteId,
      annualLaborCost: annualLaborCost ?? 0,
      annualErrorCost: annualErrorCost ?? 0,
      monthlyRentPerM2: monthlyRentPerM2 ?? 0,
      warehouseArea: warehouseArea ?? 0,
      monthlyPickings: monthlyPickings ?? 0,
      errorRate: errorRate ?? 0,
      employeeCount: employeeCount ?? 0,
      laborSavingRate: laborSavingRate ?? 15,
      errorReductionRate: errorReductionRate ?? 60,
      spaceSavingRate: spaceSavingRate ?? 10,
      pickingEfficiencyGain: pickingEfficiencyGain ?? 25,
    });

    // BigInt → number 변환
    const serialized = {
      ...baseline,
      annualLaborCost: Number(baseline.annualLaborCost),
      annualErrorCost: Number(baseline.annualErrorCost),
    };

    res.json(successResponse(serialized));
  } catch (err) {
    console.error('ROI 기준선 저장 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'ROI 기준선 저장에 실패했습니다'));
  }
}

// GET /api/v1/roi/baseline/:companyId/:siteId — 기준선 조회
export async function getBaseline(req: Request, res: Response) {
  try {
    const { companyId, siteId } = req.params;
    const baseline = await roiService.getBaseline(companyId, siteId);

    if (!baseline) {
      res.status(404).json(errorResponse('NOT_FOUND', 'ROI 기준선이 설정되지 않았습니다'));
      return;
    }

    const serialized = {
      ...baseline,
      annualLaborCost: Number(baseline.annualLaborCost),
      annualErrorCost: Number(baseline.annualErrorCost),
    };

    res.json(successResponse(serialized));
  } catch (err) {
    console.error('ROI 기준선 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'ROI 기준선 조회에 실패했습니다'));
  }
}

// POST /api/v1/roi/snapshot — 월별 스냅샷 저장
export async function saveSnapshot(req: Request, res: Response) {
  try {
    const {
      companyId, siteId, period,
      actualLaborCost, actualErrorCost, actualEmployeeCount,
    } = req.body;

    if (!companyId || !siteId || !period) {
      res.status(400).json(errorResponse('INVALID_INPUT', 'companyId, siteId, period는 필수입니다'));
      return;
    }

    // period 형식 검증 (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      res.status(400).json(errorResponse('INVALID_INPUT', 'period는 YYYY-MM 형식이어야 합니다'));
      return;
    }

    const baseline = await roiService.getBaseline(companyId, siteId);
    if (!baseline) {
      res.status(404).json(errorResponse('NOT_FOUND', '먼저 ROI 기준선을 설정해야 합니다'));
      return;
    }

    const snapshot = await roiService.upsertSnapshot({
      baselineId: baseline.id,
      companyId, siteId, period,
      actualLaborCost: actualLaborCost ?? 0,
      actualErrorCost: actualErrorCost ?? 0,
      actualEmployeeCount: actualEmployeeCount ?? 0,
    });

    // BigInt → number 변환
    const serialized = {
      ...snapshot,
      actualLaborCost: Number(snapshot.actualLaborCost),
      actualErrorCost: Number(snapshot.actualErrorCost),
      laborSaving: Number(snapshot.laborSaving),
      errorCostSaving: Number(snapshot.errorCostSaving),
      spaceSaving: Number(snapshot.spaceSaving),
      totalSaving: Number(snapshot.totalSaving),
      cumulativeSaving: Number(snapshot.cumulativeSaving),
    };

    res.json(successResponse(serialized));
  } catch (err) {
    console.error('ROI 스냅샷 저장 실패:', err);
    const message = err instanceof Error ? err.message : 'ROI 스냅샷 저장에 실패했습니다';
    res.status(500).json(errorResponse('INTERNAL_ERROR', message));
  }
}

// GET /api/v1/roi/dashboard/:companyId/:siteId — 대시보드 데이터
export async function getDashboard(req: Request, res: Response) {
  try {
    const { companyId, siteId } = req.params;
    const dashboard = await roiService.getDashboard(companyId, siteId);

    if (!dashboard) {
      res.status(404).json(errorResponse('NOT_FOUND', 'ROI 기준선이 설정되지 않았습니다'));
      return;
    }

    res.json(successResponse(dashboard));
  } catch (err) {
    console.error('ROI 대시보드 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'ROI 대시보드 조회에 실패했습니다'));
  }
}
