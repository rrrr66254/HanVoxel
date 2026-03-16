import { Router } from 'express';
import * as roiController from '../controllers/roi.controller';

const router = Router();

// 기준선 저장 (도입 전 운영 지표)
router.post('/roi/baseline', roiController.saveBaseline);

// 기준선 조회
router.get('/roi/baseline/:companyId/:siteId', roiController.getBaseline);

// 월별 스냅샷 저장 (실제 비용 + DB 자동 집계)
router.post('/roi/snapshot', roiController.saveSnapshot);

// 대시보드 데이터 (기준선 + 월별 추이 + 합계)
router.get('/roi/dashboard/:companyId/:siteId', roiController.getDashboard);

export default router;
