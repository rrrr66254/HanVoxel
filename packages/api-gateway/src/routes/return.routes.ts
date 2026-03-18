import { Router } from 'express';
import * as returnCtrl from '../controllers/return.controller';

const router = Router();

// ── 반품 분석 (목록보다 위에 배치 — :id 충돌 방지) ──
router.get('/returns/analytics', returnCtrl.analyticsHandler);

// ── 반품 CRUD ─────────────────────────────────────
router.get('/returns', returnCtrl.listHandler);
router.post('/returns', returnCtrl.createHandler);
router.get('/returns/:id', returnCtrl.detailHandler);

// ── 검수 / 처분 / 클레임 ──────────────────────────
router.patch('/returns/:id/inspect', returnCtrl.inspectHandler);
router.patch('/returns/:id/dispose', returnCtrl.disposeHandler);
router.post('/returns/:id/claim', returnCtrl.claimHandler);

export default router;
