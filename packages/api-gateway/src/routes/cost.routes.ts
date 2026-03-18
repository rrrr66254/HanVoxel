import { Router } from 'express';
import * as costManagementController from '../controllers/cost-management.controller';

const router = Router();

// ── 원가 항목 ────────────────────────────────────────────
router.get('/costs/items', costManagementController.listCostItems);
router.post('/costs/items', costManagementController.createCostItem);
router.patch('/costs/items/:id', costManagementController.updateCostItem);

// ── 제품별 원가 구성 ─────────────────────────────────────
router.get('/costs/product/:sku', costManagementController.getProductCost);

// ── 생산 실적 원가 ───────────────────────────────────────
router.post('/costs/calculate/:productionOrderId', costManagementController.calculateProductionCost);

// ── 수주 수익성 ──────────────────────────────────────────
router.get('/costs/profitability', costManagementController.listProfitability);
router.get('/costs/profitability/:salesOrderId', costManagementController.getProfitability);
router.post('/costs/profitability/recalculate/:salesOrderId', costManagementController.recalculateProfitability);

export default router;
