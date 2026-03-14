import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as planService from '../services/plan.service';

// GET /api/v1/plans
export async function listPlans(_req: Request, res: Response) {
  try {
    const plans = await planService.getAllPlans();
    res.json(successResponse(plans));
  } catch (err) {
    console.error('플랜 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '플랜 조회에 실패했습니다'));
  }
}

// GET /api/v1/plans/:code
export async function getPlan(req: Request, res: Response) {
  try {
    const code = req.params.code as string;
    const plan = await planService.getPlanByCode(code);
    if (!plan) {
      res.status(404).json(errorResponse('NOT_FOUND', '플랜을 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(plan));
  } catch (err) {
    console.error('플랜 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '플랜 조회에 실패했습니다'));
  }
}

// GET /api/v1/companies/:id/subscription
export async function getSubscription(req: Request, res: Response) {
  try {
    const companyId = req.params.id as string;
    const subscription = await planService.getCompanySubscription(companyId);
    if (!subscription) {
      res.status(404).json(errorResponse('NOT_FOUND', '회사를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(subscription));
  } catch (err) {
    console.error('구독 상태 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '구독 상태 조회에 실패했습니다'));
  }
}
