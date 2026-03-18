/**
 * 작업자 관리 컨트롤러
 */
import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as workerService from '../services/worker.service';

// ── 작업자 목록 조회 ────────────────────────────────

export async function listHandler(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId ? String(req.query.siteId) : undefined;
    const department = req.query.department ? String(req.query.department) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const result = await workerService.listWorkers({ siteId, department, search, page, limit });
    res.json(successResponse(result.workers, { total: result.total, page: result.page, limit: result.limit }));
  } catch (err) {
    console.error('작업자 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '작업자 목록 조회에 실패했습니다'));
  }
}

// ── 작업자 생성 ─────────────────────────────────────

export async function createHandler(req: Request, res: Response) {
  try {
    const { siteId, name } = req.body;
    if (!siteId || !name) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, name은 필수입니다'));
      return;
    }

    const worker = await workerService.createWorker(req.body);
    res.status(201).json(successResponse(worker));
  } catch (err) {
    console.error('작업자 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '작업자 생성에 실패했습니다'));
  }
}

// ── 작업자 상세 조회 ────────────────────────────────

export async function detailHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const worker = await workerService.getWorkerById(id);
    if (!worker) {
      res.status(404).json(errorResponse('NOT_FOUND', '작업자를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(worker));
  } catch (err) {
    console.error('작업자 상세 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '작업자 상세 조회에 실패했습니다'));
  }
}

// ── 작업자 수정 ─────────────────────────────────────

export async function updateHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const worker = await workerService.updateWorker(id, req.body);
    res.json(successResponse(worker));
  } catch (err) {
    console.error('작업자 수정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '작업자 수정에 실패했습니다'));
  }
}

// ── 작업자 실적 조회 ────────────────────────────────

export async function performanceHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!from || !to) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'from, to는 필수입니다'));
      return;
    }

    const performance = await workerService.getWorkerPerformance(id, from, to);
    res.json(successResponse(performance));
  } catch (err) {
    console.error('작업자 실적 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '작업자 실적 조회에 실패했습니다'));
  }
}

// ── 주간 스케줄 조회 ────────────────────────────────

export async function scheduleListHandler(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    const week = req.query.week as string;
    if (!siteId || !week) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, week는 필수입니다'));
      return;
    }

    const schedules = await workerService.getWeeklySchedule(siteId, week);
    res.json(successResponse(schedules));
  } catch (err) {
    console.error('주간 스케줄 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '주간 스케줄 조회에 실패했습니다'));
  }
}

// ── 스케줄 생성/갱신 ────────────────────────────────

export async function scheduleUpsertHandler(req: Request, res: Response) {
  try {
    const { entries } = req.body;
    if (!entries?.length) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'entries는 필수입니다'));
      return;
    }

    const results = await workerService.upsertSchedules(entries);
    res.status(201).json(successResponse(results));
  } catch (err) {
    console.error('스케줄 생성/갱신 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '스케줄 생성/갱신에 실패했습니다'));
  }
}

// ── 기술 기반 작업자 추천 ──────────────────────────

export async function suggestHandler(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    const skill = req.query.skill as string;
    const workCenterId = req.query.workCenterId ? String(req.query.workCenterId) : undefined;
    if (!siteId || !skill) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, skill은 필수입니다'));
      return;
    }

    const workers = await workerService.suggestWorkers(siteId, skill, workCenterId);
    res.json(successResponse(workers));
  } catch (err) {
    console.error('작업자 추천 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '작업자 추천에 실패했습니다'));
  }
}

// ── 기술/자격 마스터 목록 ──────────────────────────

export async function skillListHandler(req: Request, res: Response) {
  try {
    const skills = await workerService.listSkills();
    res.json(successResponse(skills));
  } catch (err) {
    console.error('기술 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '기술 목록 조회에 실패했습니다'));
  }
}

// ── 기술/자격 마스터 생성 ──────────────────────────

export async function skillCreateHandler(req: Request, res: Response) {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'name은 필수입니다'));
      return;
    }

    const skill = await workerService.createSkill(req.body);
    res.status(201).json(successResponse(skill));
  } catch (err) {
    console.error('기술 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '기술 생성에 실패했습니다'));
  }
}

// ── 작업자 자격증 추가 ────────────────────────────

export async function addCertHandler(req: Request, res: Response) {
  try {
    const workerId = req.params.id as string;
    const { skillId, acquiredAt } = req.body;
    if (!skillId || !acquiredAt) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'skillId, acquiredAt는 필수입니다'));
      return;
    }

    const cert = await workerService.addCert(workerId, req.body);
    res.status(201).json(successResponse(cert));
  } catch (err) {
    console.error('자격증 추가 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '자격증 추가에 실패했습니다'));
  }
}
