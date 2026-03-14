import { Router, raw } from 'express';
import * as billingController from '../controllers/billing.controller';

const router = Router();

// Checkout 세션 생성
router.post('/billing/checkout', billingController.createCheckout);

// 구독 취소
router.post('/billing/cancel', billingController.cancelSubscription);

// 구독 업그레이드
router.post('/billing/upgrade', billingController.upgradeSubscription);

// 구독 상태 조회
router.get('/billing/subscription/:companyId', billingController.getSubscription);

// 결제 내역 조회
router.get('/billing/payments/:companyId', billingController.getPayments);

// Stripe Webhook (raw body 필수 — express.json() 미적용)
router.post('/billing/webhook', raw({ type: 'application/json' }), billingController.handleWebhook);

export default router;
