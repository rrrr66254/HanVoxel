import { Router } from 'express';
import * as erpController from '../controllers/erp.controller';

const router = Router();

// ── 거래처 ─────────────────────────────────────────────
router.post('/erp/partners', erpController.createPartner);
router.get('/erp/partners', erpController.listPartners);
router.get('/erp/partners/search', erpController.searchPartners);
router.get('/erp/partners/stats', erpController.getPartnerStats);
router.get('/erp/partners/dashboard', erpController.getPartnerDashboard);
router.get('/erp/partners/ranking', erpController.getPartnerRanking);
router.get('/erp/partners/:id', erpController.getPartner);
router.patch('/erp/partners/:id', erpController.updatePartner);
router.delete('/erp/partners/:id', erpController.deletePartner);
router.get('/erp/partners/:id/history', erpController.getPartnerHistory);
router.get('/erp/partners/:id/summary', erpController.getPartnerTransactionSummary);
router.post('/erp/partners/:id/contacts', erpController.createPartnerContact);
router.get('/erp/partners/:id/contacts', erpController.getPartnerContacts);

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
