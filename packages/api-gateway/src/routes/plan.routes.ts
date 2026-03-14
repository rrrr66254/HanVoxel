import { Router } from 'express';
import * as planController from '../controllers/plan.controller';

const router = Router();

// 플랜 목록 조회
router.get('/plans', planController.listPlans);

// 플랜 단건 조회
router.get('/plans/:code', planController.getPlan);

// 회사 구독 상태 조회
router.get('/companies/:id/subscription', planController.getSubscription);

export default router;
