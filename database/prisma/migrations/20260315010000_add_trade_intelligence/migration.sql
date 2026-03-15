-- Phase 3 Step 2: HS 코드 글로벌 무역 인텔리전스
-- HsCodeMaster, HsCodeWatch, TradeDataCache, HsSearchLog, HsCodeCoverage, PrefetchBatchLog

-- HS 코드 마스터 (6자리 기준)
CREATE TABLE "hs_code_master" (
    "hs_code" VARCHAR(10) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "description_en" VARCHAR(500) NOT NULL,
    "chapter" VARCHAR(2) NOT NULL,
    "heading" VARCHAR(4) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hs_code_master_pkey" PRIMARY KEY ("hs_code")
);

CREATE INDEX "hs_code_master_chapter_idx" ON "hs_code_master"("chapter");
CREATE INDEX "hs_code_master_heading_idx" ON "hs_code_master"("heading");

-- 유저 HS 코드 즐겨찾기
CREATE TABLE "hs_code_watch" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL,
    "hs_code" VARCHAR(10) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "description_en" VARCHAR(500),
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hs_code_watch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hs_code_watch_company_id_idx" ON "hs_code_watch"("company_id");
CREATE UNIQUE INDEX "hs_code_watch_company_id_hs_code_key" ON "hs_code_watch"("company_id", "hs_code");

-- 수집된 무역 데이터 캐시
CREATE TABLE "trade_data_cache" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "hs_code" VARCHAR(10) NOT NULL,
    "reporter_iso" VARCHAR(3) NOT NULL,
    "partner_iso" VARCHAR(3) NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "flow_type" VARCHAR(10) NOT NULL,
    "value_usd" DOUBLE PRECISION NOT NULL,
    "weight_kg" DOUBLE PRECISION,
    "source" VARCHAR(20) NOT NULL,
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "trade_data_cache_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trade_data_cache_hs_code_idx" ON "trade_data_cache"("hs_code");
CREATE INDEX "trade_data_cache_expires_at_idx" ON "trade_data_cache"("expires_at");
CREATE UNIQUE INDEX "trade_data_cache_hs_code_reporter_iso_partner_iso_period_flow_type_key"
    ON "trade_data_cache"("hs_code", "reporter_iso", "partner_iso", "period", "flow_type");

-- 유저 HS 코드 검색 로그
CREATE TABLE "hs_search_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_id" UUID,
    "hs_code" VARCHAR(10) NOT NULL,
    "reporter_iso" VARCHAR(3) NOT NULL,
    "searched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "hs_search_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hs_search_log_hs_code_idx" ON "hs_search_log"("hs_code");
CREATE INDEX "hs_search_log_searched_at_idx" ON "hs_search_log"("searched_at");

-- HS 코드별 선점 현황
CREATE TABLE "hs_code_coverage" (
    "hs_code" VARCHAR(10) NOT NULL,
    "last_fetched_at" TIMESTAMPTZ,
    "fetch_count" INTEGER NOT NULL DEFAULT 0,
    "search_count" INTEGER NOT NULL DEFAULT 0,
    "priority" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "countries_cached" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hs_code_coverage_pkey" PRIMARY KEY ("hs_code")
);

-- 야간 배치 실행 로그
CREATE TABLE "prefetch_batch_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "run_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calls_used" INTEGER NOT NULL,
    "codes_added" INTEGER NOT NULL,
    "cache_hit_rate" DOUBLE PRECISION NOT NULL,
    "strategy" VARCHAR(20) NOT NULL,

    CONSTRAINT "prefetch_batch_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "prefetch_batch_log_run_at_idx" ON "prefetch_batch_log"("run_at");
