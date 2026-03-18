import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller';

const router = Router();

// CEO 대시보드 요약 데이터
router.get('/dashboard/ceo', ctrl.getCeoDashboardHandler);

// CEO 대시보드 추이 데이터
router.get('/dashboard/ceo/trend', ctrl.getCeoTrendHandler);

export default router;
