import { Router } from 'express';
import * as soCtrl from '../controllers/sales-order.controller';

const router = Router();

// ── 수주 CRUD ───────────────────────────────────
router.post('/sales-orders', soCtrl.createHandler);
router.get('/sales-orders', soCtrl.listHandler);
router.get('/sales-orders/:id', soCtrl.detailHandler);

// ── MRP 소요 분석 ───────────────────────────────
router.post('/sales-orders/:id/run-mrp', soCtrl.runMrpHandler);
router.get('/sales-orders/:id/mrp', soCtrl.getMrpHandler);
router.post('/sales-orders/:id/trigger-reorders', soCtrl.triggerReordersHandler);

// ── BOM 관리 ────────────────────────────────────
router.post('/bom', soCtrl.createBomHandler);
router.get('/bom/:productSku', soCtrl.getBomHandler);
router.post('/bom/upload', soCtrl.bulkBomUploadHandler);

// ── 재고 더블체크 ───────────────────────────────
router.get('/stock-checks', soCtrl.stockChecksHandler);
router.patch('/stock-checks/:id/confirm', soCtrl.confirmStockCheckHandler);
router.patch('/stock-checks/:id/discrepancy', soCtrl.discrepancyHandler);

export default router;
