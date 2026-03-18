import { Router } from 'express';
import * as driverCtrl from '../controllers/driver.controller';

const router = Router();

// ── 기사 CRUD ─────────────────────────────────────────
router.get('/drivers', driverCtrl.listDrivers);
router.post('/drivers', driverCtrl.createDriver);
router.patch('/drivers/:id', driverCtrl.updateDriver);
router.delete('/drivers/:id', driverCtrl.deleteDriver);

// ── 입출고 기사 배정 ──────────────────────────────────
router.patch('/inbound/orders/:id/driver', driverCtrl.assignDriverToInbound);
router.patch('/outbound/orders/:id/driver', driverCtrl.assignDriverToOutbound);

// ── 입출고 전체 상세 (items + driver) ─────────────────
router.get('/inbound/orders/:id/detail', driverCtrl.getInboundOrderDetail);
router.get('/outbound/orders/:id/detail', driverCtrl.getOutboundOrderDetail);

export default router;
