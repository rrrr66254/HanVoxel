import { Router } from 'express';
import * as partnerCtrl from '../controllers/partner.controller';
import * as driverCtrl from '../controllers/driver.controller';

const router = Router();

// ── 거래처 CRUD ─────────────────────────────────
router.post('/partners', partnerCtrl.createHandler);
router.get('/partners', partnerCtrl.listHandler);
router.get('/partners/:id', partnerCtrl.detailHandler);
router.patch('/partners/:id', partnerCtrl.updateHandler);
router.delete('/partners/:id', partnerCtrl.deleteHandler);

// ── 담당자 ──────────────────────────────────────
router.post('/partners/:id/contacts', partnerCtrl.addContactHandler);
router.patch('/partners/:id/contacts/:contactId', partnerCtrl.updateContactHandler);
router.delete('/partners/:id/contacts/:contactId', partnerCtrl.deleteContactHandler);

// ── 계좌 ────────────────────────────────────────
router.post('/partners/:id/bank-accounts', partnerCtrl.addBankAccountHandler);
router.delete('/partners/:id/bank-accounts/:accountId', partnerCtrl.deleteBankAccountHandler);

// ── 거래 요약 갱신 ──────────────────────────────
router.post('/partners/:id/refresh-summary', partnerCtrl.refreshSummaryHandler);

// ── 배송 기사 ───────────────────────────────────
router.post('/drivers', driverCtrl.createHandler);
router.get('/drivers', driverCtrl.listHandler);
router.get('/drivers/:id', driverCtrl.detailHandler);
router.patch('/drivers/:id', driverCtrl.updateHandler);
router.delete('/drivers/:id', driverCtrl.deleteHandler);

export default router;
