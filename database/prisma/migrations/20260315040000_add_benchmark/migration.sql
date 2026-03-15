-- Phase 3 Step 5: 업계 벤치마크 기능

-- 회사 테이블에 업종/규모 컬럼 추가
ALTER TABLE "companies" ADD COLUMN "industry" VARCHAR(50);
ALTER TABLE "companies" ADD COLUMN "company_size" VARCHAR(20);

-- 업계 벤치마크 스냅샷 (월별 익명 집계)
CREATE TABLE "benchmark_snapshots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "period" VARCHAR(7) NOT NULL,
    "industry" VARCHAR(50) NOT NULL,
    "company_size" VARCHAR(20) NOT NULL,
    "participant_count" INTEGER NOT NULL,
    "avg_picking_accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_inventory_turnover" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_space_utilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_on_time_delivery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_receiving_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_order_cycle_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentiles" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "benchmark_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "benchmark_snapshots_period_industry_company_size_key"
    ON "benchmark_snapshots"("period", "industry", "company_size");
CREATE INDEX "benchmark_snapshots_industry_idx" ON "benchmark_snapshots"("industry");
CREATE INDEX "benchmark_snapshots_period_idx" ON "benchmark_snapshots"("period");

-- 개별 회사 벤치마크 지표 (월별)
CREATE TABLE "company_benchmarks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "industry" VARCHAR(50) NOT NULL,
    "company_size" VARCHAR(20) NOT NULL,
    "picking_accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inventory_turnover" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "space_utilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "on_time_delivery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receiving_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order_cycle_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentile_ranks" JSONB NOT NULL DEFAULT '{}',
    "overall_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "company_benchmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_benchmarks_company_id_site_id_period_key"
    ON "company_benchmarks"("company_id", "site_id", "period");
CREATE INDEX "company_benchmarks_company_id_idx" ON "company_benchmarks"("company_id");
CREATE INDEX "company_benchmarks_period_industry_idx" ON "company_benchmarks"("period", "industry");

-- 벤치마크 리포트 (PDF 생성 이력)
CREATE TABLE "benchmark_reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "report_data" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "pdf_url" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "benchmark_reports_company_id_period_idx"
    ON "benchmark_reports"("company_id", "period");
