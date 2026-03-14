-- SaaS 과금 인프라: plans 테이블 + companies 컬럼 추가

-- 1. companies 테이블에 SaaS 과금 컬럼 추가
ALTER TABLE "companies" ADD COLUMN "plan_type" VARCHAR(20) NOT NULL DEFAULT 'STARTER';
ALTER TABLE "companies" ADD COLUMN "trial_ends_at" TIMESTAMPTZ;
ALTER TABLE "companies" ADD COLUMN "stripe_customer_id" VARCHAR(100);
ALTER TABLE "companies" ADD COLUMN "stripe_subscription_id" VARCHAR(100);

-- 2. plans 테이블 생성
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price_monthly" INTEGER NOT NULL DEFAULT 0,
    "price_yearly" INTEGER NOT NULL DEFAULT 0,
    "stripe_price_monthly" VARCHAR(100),
    "stripe_price_yearly" VARCHAR(100),
    "max_sites" INTEGER NOT NULL DEFAULT 1,
    "max_users" INTEGER NOT NULL DEFAULT 3,
    "max_objects" INTEGER NOT NULL DEFAULT 500,
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "features" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- 3. 유니크 인덱스
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
