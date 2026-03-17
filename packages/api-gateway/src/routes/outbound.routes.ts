import { Router } from 'express';
import * as outboundCtrl from '../controllers/outbound.controller';
import * as bulkCtrl from '../controllers/bulk-outbound.controller';

const router = Router();

// ── 출고 주문 CRUD ───────────────────────────────
router.post('/outbound/orders', outboundCtrl.createHandler);
router.get('/outbound/orders', outboundCtrl.listHandler);
router.get('/outbound/orders/:id', outboundCtrl.detailHandler);

// ── 상태 변경 ────────────────────────────────────
router.patch('/outbound/orders/:id/dispatch', outboundCtrl.dispatchHandler);
router.patch('/outbound/orders/:id/reschedule', outboundCtrl.rescheduleHandler);

// ── 명세표 ───────────────────────────────────────
router.get('/outbound/orders/:id/manifest', outboundCtrl.manifestHandler);

// ── 달력 ─────────────────────────────────────────
router.get('/outbound/calendar', outboundCtrl.calendarHandler);

// ── 통합 달력 (입고+출고) ────────────────────────
router.get('/calendar', outboundCtrl.calendarAllHandler);

// ── B2C 대량 출고 업로드 ─────────────────────────
router.post('/outbound/bulk-upload', bulkCtrl.uploadMiddleware, bulkCtrl.bulkUploadHandler);
router.post('/outbound/bulk-create', bulkCtrl.bulkCreateHandler);
router.get('/outbound/bulk-logs', bulkCtrl.uploadLogsHandler);
router.get('/outbound/bulk-mapping', bulkCtrl.platformMappingHandler);
router.get('/outbound/bulk-template/:platform', bulkCtrl.templateDownloadHandler);

export default router;
