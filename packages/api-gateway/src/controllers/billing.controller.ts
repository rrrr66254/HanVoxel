/**
 * Stripe 과금 컨트롤러
 */
import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as stripeService from '../services/stripe.service';

// POST /api/v1/billing/checkout
export async function createCheckout(req: Request, res: Response) {
  try {
    const { companyId, planCode, billingInterval } = req.body;
    if (!companyId || !planCode) {
      res.status(400).json(errorResponse('BAD_REQUEST', 'companyId와 planCode가 필요합니다'));
      return;
    }
    const result = await stripeService.createCheckoutSession({
      companyId,
      planCode,
      billingInterval: billingInterval ?? 'monthly',
    });
    res.json(successResponse(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제 세션 생성 실패';
    console.error('Checkout 생성 실패:', err);
    res.status(500).json(errorResponse('CHECKOUT_ERROR', message));
  }
}

// POST /api/v1/billing/cancel
export async function cancelSubscription(req: Request, res: Response) {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      res.status(400).json(errorResponse('BAD_REQUEST', 'companyId가 필요합니다'));
      return;
    }
    const result = await stripeService.cancelSubscription(companyId);
    res.json(successResponse(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : '구독 취소 실패';
    console.error('구독 취소 실패:', err);
    res.status(500).json(errorResponse('CANCEL_ERROR', message));
  }
}

// POST /api/v1/billing/upgrade
export async function upgradeSubscription(req: Request, res: Response) {
  try {
    const { companyId, planCode } = req.body;
    if (!companyId || !planCode) {
      res.status(400).json(errorResponse('BAD_REQUEST', 'companyId와 planCode가 필요합니다'));
      return;
    }
    const result = await stripeService.upgradeSubscription(companyId, planCode);
    res.json(successResponse(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : '구독 업그레이드 실패';
    console.error('구독 업그레이드 실패:', err);
    res.status(500).json(errorResponse('UPGRADE_ERROR', message));
  }
}

// GET /api/v1/billing/subscription/:companyId
export async function getSubscription(req: Request, res: Response) {
  try {
    const companyId = req.params.companyId as string;
    const detail = await stripeService.getSubscriptionDetail(companyId);
    if (!detail) {
      res.status(404).json(errorResponse('NOT_FOUND', '회사를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(detail));
  } catch (err) {
    console.error('구독 상태 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '구독 상태 조회에 실패했습니다'));
  }
}

// GET /api/v1/billing/payments/:companyId
export async function getPayments(req: Request, res: Response) {
  try {
    const companyId = req.params.companyId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const payments = await stripeService.getPaymentHistory(companyId, limit);
    res.json(successResponse(payments));
  } catch (err) {
    console.error('결제 내역 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '결제 내역 조회에 실패했습니다'));
  }
}

// POST /api/v1/billing/webhook (raw body 필요)
export async function handleWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      res.status(400).json(errorResponse('BAD_REQUEST', 'Stripe signature가 없습니다'));
      return;
    }

    const event = stripeService.constructWebhookEvent(req.body, signature);
    await stripeService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook 처리 실패';
    console.error('Webhook 처리 실패:', err);
    res.status(400).json(errorResponse('WEBHOOK_ERROR', message));
  }
}
