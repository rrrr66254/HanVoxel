import { Router } from 'express';
import * as slaController from '../controllers/sla.controller';

const router = Router();

// SLA 기준 설정
router.put('/sla/targets', slaController.upsertTarget);
router.get('/sla/targets', slaController.getTarget);

// SLA KPI 스냅샷
router.post('/sla/metrics', slaController.recordMetric);
router.get('/sla/metrics', slaController.getMetrics);
router.get('/sla/metrics/latest', slaController.getLatestMetric);

// SLA 위반
router.post('/sla/violations', slaController.recordViolation);
router.get('/sla/violations', slaController.getViolations);
router.patch('/sla/violations/:id/resolve', slaController.resolveViolation);

// SLA 리포트
router.get('/sla/report', slaController.getReport);

export default router;
