import { Router } from 'express';
import * as inboundCtrl from '../controllers/inbound.controller';

const router = Router();

// ── 입고 주문 CRUD ───────────────────────────────
router.post('/inbound/orders', inboundCtrl.createHandler);
router.get('/inbound/orders', inboundCtrl.listHandler);
router.get('/inbound/orders/:id', inboundCtrl.detailHandler);

// ── 상태 변경 ────────────────────────────────────
router.patch('/inbound/orders/:id/arrive', inboundCtrl.arriveHandler);
router.patch('/inbound/orders/:id/cancel-arrive', inboundCtrl.cancelArriveHandler);
router.patch('/inbound/orders/:id/qc-pass', inboundCtrl.qcPassHandler);
router.patch('/inbound/orders/:id/reschedule', inboundCtrl.rescheduleHandler);

// ── 달력 ─────────────────────────────────────────
router.get('/inbound/calendar', inboundCtrl.calendarHandler);

// ── 자동발주 연동 ────────────────────────────────
router.post('/inbound/from-reorder', inboundCtrl.createFromReorderHandler);

export default router;
