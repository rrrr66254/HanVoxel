import { Router } from 'express';
import * as smartReorderCtrl from '../controllers/smart-reorder.controller';

const router = Router();

// ── 스마트 발주 스케줄 ─────────────────────────────────
router.get('/smart-reorder/schedule', smartReorderCtrl.scheduleHandler);
router.get('/smart-reorder/timeline', smartReorderCtrl.timelineHandler);
router.get('/smart-reorder/predict-arrival', smartReorderCtrl.predictArrivalHandler);
router.get('/smart-reorder/accuracy', smartReorderCtrl.accuracyHandler);

// ── 스케줄 확정·재학습 ────────────────────────────────
router.post('/smart-reorder/confirm/:id', smartReorderCtrl.confirmHandler);
router.post('/smart-reorder/train', smartReorderCtrl.trainHandler);

export default router;
