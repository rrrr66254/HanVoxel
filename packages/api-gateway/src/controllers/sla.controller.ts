import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as slaService from '../services/sla.service';

// ── SLA 기준 설정 ───────────────────────────────────────

// PUT /api/v1/sla/targets — 생성 또는 수정
export async function upsertTarget(req: Request, res: Response) {
  try {
    const { companyId, siteId, name, ...rest } = req.body;
    if (!companyId || !siteId || !name) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'companyId, siteId, name은 필수입니다'));
      return;
    }
    const target = await slaService.upsertSlaTarget({ companyId, siteId, name, ...rest });
    res.json(successResponse(target));
  } catch (err) {
    console.error('SLA 기준 설정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'SLA 기준 설정에 실패했습니다'));
  }
}

// GET /api/v1/sla/targets?companyId=&siteId=
export async function getTarget(req: Request, res: Response) {
  try {
    const companyId = req.query.companyId as string;
    const siteId = req.query.siteId as string;
    if (!companyId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'companyId는 필수입니다'));
      return;
    }
    if (siteId) {
      const target = await slaService.getSlaTarget(companyId, siteId);
      if (!target) {
        res.status(404).json(errorResponse('NOT_FOUND', 'SLA 기준을 찾을 수 없습니다'));
        return;
      }
      res.json(successResponse(target));
    } else {
      const targets = await slaService.getSlaTargetsByCompany(companyId);
      res.json(successResponse(targets, { total: targets.length }));
    }
  } catch (err) {
    console.error('SLA 기준 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'SLA 기준 조회에 실패했습니다'));
  }
}

// ── SLA KPI 기록 ────────────────────────────────────────

// POST /api/v1/sla/metrics
export async function recordMetric(req: Request, res: Response) {
  try {
    const { slaTargetId, recordDate, ...rest } = req.body;
    if (!slaTargetId || !recordDate) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'slaTargetId, recordDate는 필수입니다'));
      return;
    }
    const metric = await slaService.recordSlaMetric({ slaTargetId, recordDate, ...rest });
    res.status(201).json(successResponse(metric));
  } catch (err) {
    console.error('SLA KPI 기록 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'SLA KPI 기록에 실패했습니다'));
  }
}

// GET /api/v1/sla/metrics?slaTargetId=&from=&to=&limit=
export async function getMetrics(req: Request, res: Response) {
  try {
    const slaTargetId = req.query.slaTargetId as string;
    if (!slaTargetId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'slaTargetId는 필수입니다'));
      return;
    }
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const metrics = await slaService.getSlaMetrics(slaTargetId, { from, to, limit });
    res.json(successResponse(metrics, { total: metrics.length }));
  } catch (err) {
    console.error('SLA KPI 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'SLA KPI 조회에 실패했습니다'));
  }
}

// GET /api/v1/sla/metrics/latest?slaTargetId=
export async function getLatestMetric(req: Request, res: Response) {
  try {
    const slaTargetId = req.query.slaTargetId as string;
    if (!slaTargetId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'slaTargetId는 필수입니다'));
      return;
    }
    const metric = await slaService.getLatestSlaMetric(slaTargetId);
    res.json(successResponse(metric));
  } catch (err) {
    console.error('최신 KPI 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '최신 KPI 조회에 실패했습니다'));
  }
}

// ── SLA 위반 기록 ───────────────────────────────────────

// POST /api/v1/sla/violations
export async function recordViolation(req: Request, res: Response) {
  try {
    const { slaTargetId, metricName, targetValue, actualValue, violationDate, severity, ...rest } = req.body;
    if (!slaTargetId || !metricName || targetValue === undefined || actualValue === undefined || !violationDate || !severity) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', '필수 필드가 누락되었습니다'));
      return;
    }
    const violation = await slaService.recordViolation({
      slaTargetId, metricName, targetValue, actualValue, violationDate, severity, ...rest,
    });
    res.status(201).json(successResponse(violation));
  } catch (err) {
    console.error('SLA 위반 기록 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'SLA 위반 기록에 실패했습니다'));
  }
}

// GET /api/v1/sla/violations?slaTargetId=&from=&to=&metricName=
export async function getViolations(req: Request, res: Response) {
  try {
    const slaTargetId = req.query.slaTargetId as string;
    if (!slaTargetId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'slaTargetId는 필수입니다'));
      return;
    }
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const metricName = req.query.metricName as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const violations = await slaService.getViolations(slaTargetId, { from, to, metricName, limit });
    res.json(successResponse(violations, { total: violations.length }));
  } catch (err) {
    console.error('SLA 위반 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'SLA 위반 조회에 실패했습니다'));
  }
}

// PATCH /api/v1/sla/violations/:id/resolve
export async function resolveViolation(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { note } = req.body;
    const violation = await slaService.resolveViolation(id, note);
    res.json(successResponse(violation));
  } catch (err) {
    console.error('SLA 위반 해결 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'SLA 위반 해결에 실패했습니다'));
  }
}

// ── SLA 리포트 ──────────────────────────────────────────

// GET /api/v1/sla/report?slaTargetId=&from=&to=
export async function getReport(req: Request, res: Response) {
  try {
    const slaTargetId = req.query.slaTargetId as string;
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!slaTargetId || !from || !to) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'slaTargetId, from, to는 필수입니다'));
      return;
    }
    const report = await slaService.getSlaReport(slaTargetId, from, to);
    res.json(successResponse(report));
  } catch (err) {
    console.error('SLA 리포트 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'SLA 리포트 조회에 실패했습니다'));
  }
}
