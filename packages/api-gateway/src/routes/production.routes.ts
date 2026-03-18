import { Router } from 'express';
import * as ctrl from '../controllers/production.controller';

const router = Router();

// ── 작업장 ─────────────────────────────────────────
router.get('/work-centers', ctrl.listWorkCentersHandler);
router.post('/work-centers', ctrl.createWorkCenterHandler);
router.patch('/work-centers/:id/status', ctrl.updateWorkCenterStatusHandler);

// ── 생산 지시서 ────────────────────────────────────
router.get('/production/orders', ctrl.listOrdersHandler);
router.post('/production/orders', ctrl.createOrderHandler);
router.get('/production/orders/:id', ctrl.getOrderHandler);
router.patch('/production/orders/:id/status', ctrl.updateOrderStatusHandler);
router.post('/production/orders/auto-plan', ctrl.autoCreateOrderHandler);

// ── 실적 입력 ──────────────────────────────────────
router.post('/production/orders/:id/log', ctrl.addLogHandler);
router.get('/production/orders/:id/logs', ctrl.getLogsHandler);

// ── 자재 불출 ──────────────────────────────────────
router.get('/production/orders/:id/materials', ctrl.getOrderMaterialsHandler);
router.post('/production/orders/:id/issue-materials', ctrl.issueMaterialsHandler);
router.post('/production/orders/:id/return-materials', ctrl.returnMaterialsHandler);

// ── 간트 차트 ──────────────────────────────────────
router.get('/production/gantt', ctrl.getGanttHandler);
router.patch('/production/gantt/reschedule', ctrl.rescheduleHandler);

// ── 설비 유지보수 ──────────────────────────────────
router.get('/maintenance', ctrl.listMaintenanceHandler);
router.post('/maintenance/breakdown', ctrl.reportBreakdownHandler);
router.post('/maintenance/complete/:id', ctrl.completeMaintenanceHandler);

// ── 분석 ───────────────────────────────────────────
router.get('/production/analytics/kpi', ctrl.getKpisHandler);
router.get('/production/analytics/oee', ctrl.getOeeHandler);
router.get('/production/analytics/defects', ctrl.getDefectsHandler);

// ── 생산 계획 추천 (수주 → 생산 자동 연동) ──────────
router.get('/production/suggestions', ctrl.listSuggestionsHandler);
router.post('/production/suggestions/generate', ctrl.generateSuggestionsHandler);
router.post('/production/suggestions/:id/accept', ctrl.acceptSuggestionHandler);
router.post('/production/suggestions/:id/reject', ctrl.rejectSuggestionHandler);

export default router;
