/**
 * Stripe 결제 서비스 — 구독 생성/관리/웹훅 처리
 */
import Stripe from 'stripe';
import prisma from './prisma';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const stripe = new Stripe(STRIPE_SECRET_KEY);

// ── Checkout 세션 생성 ─────────────────────────────────

interface CreateCheckoutInput {
  companyId: string;
  planCode: string;
  billingInterval: 'monthly' | 'yearly';
}

export async function createCheckoutSession(input: CreateCheckoutInput) {
  const company = await prisma.company.findUnique({ where: { id: input.companyId } });
  if (!company) throw new Error('회사를 찾을 수 없습니다');

  const plan = await prisma.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw new Error('플랜을 찾을 수 없습니다');

  const priceId = input.billingInterval === 'yearly'
    ? plan.stripePriceYearly
    : plan.stripePriceMonthly;

  if (!priceId) throw new Error('Stripe Price ID가 설정되지 않았습니다');

  // Stripe 고객 생성 또는 기존 고객 사용
  let customerId = company.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name,
      metadata: { companyId: company.id, companyCode: company.code },
    });
    customerId = customer.id;
    await prisma.company.update({
      where: { id: company.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}?checkout=cancel`,
    metadata: {
      companyId: company.id,
      planCode: input.planCode,
      billingInterval: input.billingInterval,
    },
    subscription_data: {
      metadata: {
        companyId: company.id,
        planCode: input.planCode,
      },
    },
  });

  return { sessionId: session.id, url: session.url };
}

// ── 구독 취소 ──────────────────────────────────────────

export async function cancelSubscription(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.stripeSubscriptionId) throw new Error('활성 구독이 없습니다');

  // 기간 종료 시 취소 (즉시 취소 아님)
  const subscription = await stripe.subscriptions.update(company.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.company.update({
    where: { id: companyId },
    data: { subscriptionStatus: 'canceled' },
  });

  return {
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
  };
}

// ── 구독 업그레이드 ────────────────────────────────────

export async function upgradeSubscription(companyId: string, newPlanCode: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.stripeSubscriptionId) throw new Error('활성 구독이 없습니다');

  const newPlan = await prisma.plan.findUnique({ where: { code: newPlanCode } });
  if (!newPlan) throw new Error('플랜을 찾을 수 없습니다');

  const billingInterval = company.billingInterval as 'monthly' | 'yearly';
  const newPriceId = billingInterval === 'yearly'
    ? newPlan.stripePriceYearly
    : newPlan.stripePriceMonthly;

  if (!newPriceId) throw new Error('Stripe Price ID가 설정되지 않았습니다');

  const subscription = await stripe.subscriptions.retrieve(company.stripeSubscriptionId);
  const currentItem = subscription.items.data[0];

  await stripe.subscriptions.update(company.stripeSubscriptionId, {
    items: [{ id: currentItem.id, price: newPriceId }],
    proration_behavior: 'create_prorations',
    metadata: { planCode: newPlanCode },
  });

  await prisma.company.update({
    where: { id: companyId },
    data: { planType: newPlanCode },
  });

  return { planCode: newPlanCode };
}

// ── 구독 상태 조회 (확장) ──────────────────────────────

export async function getSubscriptionDetail(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      sites: { select: { id: true } },
      users: { select: { id: true } },
    },
  });
  if (!company) return null;

  const plan = await prisma.plan.findUnique({ where: { code: company.planType } });

  // 사용량 계산
  const objectCount = await prisma.spatialObject.count({
    where: { site: { companyId } },
  });

  const now = new Date();
  const trialEndsAt = company.trialEndsAt;
  const isTrialActive = trialEndsAt ? trialEndsAt.getTime() > now.getTime() : false;
  const daysRemaining = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    companyId: company.id,
    companyName: company.name,
    planType: company.planType,
    planName: plan?.name ?? company.planType,
    subscriptionStatus: company.subscriptionStatus,
    billingInterval: company.billingInterval,
    currentPeriodEnd: company.currentPeriodEnd?.toISOString() ?? null,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    isTrialActive,
    daysRemaining,
    // 사용량
    usage: {
      sites: { current: company.sites.length, max: plan?.maxSites ?? 1 },
      users: { current: company.users.length, max: plan?.maxUsers ?? 3 },
      objects: { current: objectCount, max: plan?.maxObjects ?? 500 },
    },
    // 가격 정보
    pricing: {
      monthly: plan?.priceMonthly ?? 0,
      yearly: plan?.priceYearly ?? 0,
    },
  };
}

// ── 결제 내역 조회 ─────────────────────────────────────

export async function getPaymentHistory(companyId: string, limit = 20) {
  return prisma.paymentHistory.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ── Webhook 처리 ───────────────────────────────────────

export function constructWebhookEvent(payload: Buffer, signature: string) {
  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoiceFailed(event.data.object as Stripe.Invoice);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    default:
      // 처리하지 않는 이벤트는 무시
      break;
  }
}

// ── 내부 핸들러 ────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId;
  const planCode = session.metadata?.planCode;
  const billingInterval = session.metadata?.billingInterval ?? 'monthly';

  if (!companyId || !planCode) return;

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as Stripe.Subscription | null)?.id;

  await prisma.company.update({
    where: { id: companyId },
    data: {
      planType: planCode,
      stripeSubscriptionId: subscriptionId ?? undefined,
      subscriptionStatus: 'active',
      billingInterval,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Stripe v20: subscription은 subscription_details 하위에 위치
  const inv = invoice as unknown as Record<string, unknown>;
  const subDetails = inv.subscription_details as Record<string, unknown> | null;
  const subRef = subDetails?.subscription;
  const subscriptionId = typeof subRef === 'string' ? subRef : (subRef as { id?: string } | null)?.id;
  if (!subscriptionId) return;

  const company = await prisma.company.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!company) return;

  const paymentIntentRef = inv.payment_intent;
  const paymentIntentId = typeof paymentIntentRef === 'string' ? paymentIntentRef : null;

  // 결제 내역 기록
  await prisma.paymentHistory.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: { status: 'paid' },
    create: {
      companyId: company.id,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: paymentIntentId,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      planCode: company.planType,
      billingInterval: company.billingInterval,
      periodStart: new Date((invoice.period_start ?? 0) * 1000),
      periodEnd: new Date((invoice.period_end ?? 0) * 1000),
      description: invoice.description ?? `${company.planType} 구독 결제`,
    },
  });

  // 회사 구독 상태 업데이트
  await prisma.company.update({
    where: { id: company.id },
    data: {
      subscriptionStatus: 'active',
      currentPeriodEnd: new Date((invoice.period_end ?? 0) * 1000),
    },
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const inv = invoice as unknown as Record<string, unknown>;
  const subDetails = inv.subscription_details as Record<string, unknown> | null;
  const subRef = subDetails?.subscription;
  const subscriptionId = typeof subRef === 'string' ? subRef : (subRef as { id?: string } | null)?.id;
  if (!subscriptionId) return;

  const company = await prisma.company.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!company) return;

  // 결제 실패 기록
  await prisma.paymentHistory.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: { status: 'failed' },
    create: {
      companyId: company.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      planCode: company.planType,
      billingInterval: company.billingInterval,
      periodStart: new Date((invoice.period_start ?? 0) * 1000),
      periodEnd: new Date((invoice.period_end ?? 0) * 1000),
      description: '결제 실패',
    },
  });

  await prisma.company.update({
    where: { id: company.id },
    data: { subscriptionStatus: 'past_due' },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId;
  if (!companyId) return;

  const planCode = subscription.metadata?.planCode;
  const status = subscription.status; // active, past_due, canceled, etc.

  // Stripe v20: current_period_end는 items 또는 최상위에 존재할 수 있음
  const sub = subscription as unknown as Record<string, unknown>;
  const periodEnd = typeof sub.current_period_end === 'number'
    ? new Date(sub.current_period_end * 1000)
    : null;

  await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: status,
      ...(planCode ? { planType: planCode } : {}),
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId;
  if (!companyId) return;

  await prisma.company.update({
    where: { id: companyId },
    data: {
      planType: 'STARTER',
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
    },
  });
}
