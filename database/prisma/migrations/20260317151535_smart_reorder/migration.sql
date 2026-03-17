-- Phase 4: 스마트 발주 — 데이터 기반 발주 예측 & 자동화
-- purchase_order_history, vendor_lead_time_stats, demand_forecasts_v2, smart_reorder_schedule

-- 발주 이력 (ML 학습용)
CREATE TABLE "purchase_order_history" (
    "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id"           UUID NOT NULL,
    "sku_code"          VARCHAR(100) NOT NULL,
    "vendor_id"         UUID,
    "ordered_at"        TIMESTAMPTZ NOT NULL,
    "expected_at"       DATE,
    "actual_arrived_at" DATE,
    "lead_time_days"    INTEGER,
    "ordered_qty"       INTEGER NOT NULL,
    "arrived_qty"       INTEGER,
    "unit_price"        INTEGER NOT NULL DEFAULT 0,
    "season"            INTEGER,
    "notes"             TEXT,
    "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "purchase_order_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_order_history_site_id_sku_code_idx"
    ON "purchase_order_history"("site_id", "sku_code");
CREATE INDEX "purchase_order_history_vendor_id_idx"
    ON "purchase_order_history"("vendor_id");
CREATE INDEX "purchase_order_history_ordered_at_idx"
    ON "purchase_order_history"("ordered_at");

-- 공급업체별 리드타임 통계
CREATE TABLE "vendor_lead_time_stats" (
    "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id"         UUID NOT NULL,
    "vendor_id"       UUID NOT NULL,
    "sku_code"        VARCHAR(100) NOT NULL,
    "sample_count"    INTEGER NOT NULL DEFAULT 0,
    "avg_lead_time"   DOUBLE PRECISION NOT NULL,
    "min_lead_time"   INTEGER NOT NULL,
    "max_lead_time"   INTEGER NOT NULL,
    "std_deviation"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p90_lead_time"   INTEGER NOT NULL,
    "last_updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "vendor_lead_time_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_lead_time_stats_site_id_vendor_id_sku_code_key"
    ON "vendor_lead_time_stats"("site_id", "vendor_id", "sku_code");
CREATE INDEX "vendor_lead_time_stats_vendor_id_idx"
    ON "vendor_lead_time_stats"("vendor_id");
CREATE INDEX "vendor_lead_time_stats_sku_code_idx"
    ON "vendor_lead_time_stats"("sku_code");

-- 수요 예측 고도화 (v2)
CREATE TABLE "demand_forecasts_v2" (
    "id"                       UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id"                  UUID NOT NULL,
    "sku_code"                 VARCHAR(100) NOT NULL,
    "forecast_date"            DATE NOT NULL,
    "predicted_qty"            DOUBLE PRECISION NOT NULL,
    "confidence_interval_low"  DOUBLE PRECISION NOT NULL,
    "confidence_interval_high" DOUBLE PRECISION NOT NULL,
    "model_used"               VARCHAR(30) NOT NULL,
    "mape_score"               DOUBLE PRECISION,
    "input_weeks"              INTEGER NOT NULL DEFAULT 0,
    "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "demand_forecasts_v2_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "demand_forecasts_v2_site_id_sku_code_idx"
    ON "demand_forecasts_v2"("site_id", "sku_code");
CREATE INDEX "demand_forecasts_v2_forecast_date_idx"
    ON "demand_forecasts_v2"("forecast_date");

-- 스마트 발주 스케줄
CREATE TABLE "smart_reorder_schedule" (
    "id"                      UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id"                 UUID NOT NULL,
    "sku_code"                VARCHAR(100) NOT NULL,
    "vendor_id"               UUID,
    "recommended_order_date"  DATE NOT NULL,
    "recommended_qty"         INTEGER NOT NULL,
    "estimated_arrival_date"  DATE,
    "arrival_confidence"      DOUBLE PRECISION,
    "arrival_range_min"       DATE,
    "arrival_range_max"       DATE,
    "stockout_risk_date"      DATE,
    "reason"                  TEXT,
    "status"                  VARCHAR(20) NOT NULL DEFAULT 'AUTO_SCHEDULED',
    "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "smart_reorder_schedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "smart_reorder_schedule_site_id_status_idx"
    ON "smart_reorder_schedule"("site_id", "status");
CREATE INDEX "smart_reorder_schedule_site_id_sku_code_idx"
    ON "smart_reorder_schedule"("site_id", "sku_code");
CREATE INDEX "smart_reorder_schedule_recommended_order_date_idx"
    ON "smart_reorder_schedule"("recommended_order_date");
CREATE INDEX "smart_reorder_schedule_stockout_risk_date_idx"
    ON "smart_reorder_schedule"("stockout_risk_date");
