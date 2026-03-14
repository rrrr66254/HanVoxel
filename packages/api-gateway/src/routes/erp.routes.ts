import { Router } from 'express';
import * as erpController from '../controllers/erp.controller';

const router = Router();

// ── 거래처 ─────────────────────────────────────────────
router.post('/erp/partners', erpController.createPartner);
router.patch('/erp/partners/:id', erpController.updatePartner);
router.get('/erp/partners', erpController.listPartners);
router.get('/erp/partners/stats', erpController.getPartnerStats);
router.get('/erp/partners/:id', erpController.getPartner);
router.get('/erp/partners/:id/history', erpController.getPartnerHistory);

// ── 전표 ───────────────────────────────────────────────
router.post('/erp/vouchers', erpController.createVoucher);
router.patch('/erp/vouchers/:id/confirm', erpController.confirmVoucher);
router.patch('/erp/vouchers/:id/cancel', erpController.cancelVoucher);
router.get('/erp/vouchers', erpController.listVouchers);
router.get('/erp/vouchers/stats', erpController.getVoucherStats);
router.get('/erp/vouchers/:id', erpController.getVoucher);
router.get('/erp/vouchers/:id/pdf', erpController.getVoucherPdf);

// ── 원가 / 마진 ───────────────────────────────────────
router.get('/erp/costs', erpController.listSkuCosts);
router.get('/erp/margins', erpController.getSkuMargins);
router.patch('/erp/costs/selling-price', erpController.updateSellingPrice);

// ── ERP 커넥터 ─────────────────────────────────────────
router.get('/erp/connector/status', erpController.getConnectorStatus);
router.post('/erp/connector/preview', erpController.previewErpMapping);

export default router;
