import { Router } from 'express';
import * as reorderCtrl from '../controllers/reorder.controller';

const router = Router();

// ── 발주 추천 ────────────────────────────────────────
router.post('/reorder/generate', reorderCtrl.generateHandler);
router.get('/reorder/recommendations', reorderCtrl.listHandler);
router.patch('/reorder/recommendations/:id/accept', reorderCtrl.acceptHandler);
router.patch('/reorder/recommendations/:id/dismiss', reorderCtrl.dismissHandler);

// ── 수요 예측 ────────────────────────────────────────
router.get('/reorder/forecast', reorderCtrl.forecastHandler);

// ── 리드타임 ─────────────────────────────────────────
router.get('/reorder/lead-times', reorderCtrl.leadTimeHandler);

// ── 대시보드 ─────────────────────────────────────────
router.get('/reorder/summary', reorderCtrl.summaryHandler);

export default router;
