-- Phase 2 Step 5: Stripe 과금 전환

-- Company 구독 상태 컬럼 추가
ALTER TABLE "companies"
  ADD COLUMN "subscription_status" VARCHAR(30) NOT NULL DEFAULT 'trialing',
  ADD COLUMN "billing_interval" VARCHAR(10) NOT NULL DEFAULT 'monthly',
  ADD COLUMN "current_period_end" TIMESTAMPTZ;

-- 결제 내역 테이블
CREATE TABLE "payment_history" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "company_id" UUID NOT NULL,
  "stripe_invoice_id" VARCHAR(100),
  "stripe_payment_intent_id" VARCHAR(100),
  "amount" INTEGER NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'krw',
  "status" VARCHAR(20) NOT NULL,
  "plan_code" VARCHAR(20) NOT NULL,
  "billing_interval" VARCHAR(10) NOT NULL,
  "period_start" TIMESTAMPTZ NOT NULL,
  "period_end" TIMESTAMPTZ NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_history_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 인덱스
CREATE UNIQUE INDEX "payment_history_stripe_invoice_id_key" ON "payment_history"("stripe_invoice_id");
CREATE INDEX "payment_history_company_id_created_at_idx" ON "payment_history"("company_id", "created_at");
