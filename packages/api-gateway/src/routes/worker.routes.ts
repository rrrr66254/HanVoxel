import { Router } from 'express';
import * as workerCtrl from '../controllers/worker.controller';

const router = Router();

// ── 기술/자격 마스터 (목록보다 위에 배치 — :id 충돌 방지) ──
router.get('/workers/skills', workerCtrl.skillListHandler);
router.post('/workers/skills', workerCtrl.skillCreateHandler);

// ── 스케줄 (목록보다 위에 배치 — :id 충돌 방지) ──
router.get('/workers/schedule', workerCtrl.scheduleListHandler);
router.post('/workers/schedule', workerCtrl.scheduleUpsertHandler);

// ── 작업자 추천 ──────────────────────────────────
router.get('/workers/suggest', workerCtrl.suggestHandler);

// ── 작업자 CRUD ─────────────────────────────────
router.get('/workers', workerCtrl.listHandler);
router.post('/workers', workerCtrl.createHandler);
router.get('/workers/:id', workerCtrl.detailHandler);
router.patch('/workers/:id', workerCtrl.updateHandler);

// ── 작업자 실적 ─────────────────────────────────
router.get('/workers/:id/performance', workerCtrl.performanceHandler);

// ── 작업자 자격증 ───────────────────────────────
router.post('/workers/:id/certs', workerCtrl.addCertHandler);

export default router;
