-- Phase 3 Step 3: 자동 발주 추천 엔진
-- SKU 일별 출고, 리드타임 학습, 수요 예측, 발주 추천

-- SKU별 일별 출고/입고 집계
CREATE TABLE "sku_daily_usage" (
    "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id"       UUID NOT NULL,
    "sku"           VARCHAR(50) NOT NULL,
    "usage_date"    DATE NOT NULL,
    "qty_used"      INTEGER NOT NULL,
    "qty_received"  INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "sku_daily_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sku_daily_usage_site_id_sku_usage_date_key"
    ON "sku_daily_usage"("site_id", "sku", "usage_date");
CREATE INDEX "sku_daily_usage_site_id_sku_idx"
    ON "sku_daily_usage"("site_id", "sku");
CREATE INDEX "sku_daily_usage_usage_date_idx"
    ON "sku_daily_usage"("usage_date");

-- 공급업체 리드타임 학습
CREATE TABLE "supplier_lead_times" (
    "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id"       UUID NOT NULL,
    "partner_id"    UUID NOT NULL,
    "sku"           VARCHAR(50) NOT NULL,
    "order_date"    DATE NOT NULL,
    "received_date" DATE,
    "actual_days"   INTEGER,
    "order_qty"     INTEGER NOT NULL,
    "voucher_no"    VARCHAR(30),
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "supplier_lead_times_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "supplier_lead_times_partner_id_fkey"
        FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX "supplier_lead_times_site_id_sku_idx"
    ON "supplier_lead_times"("site_id", "sku");
CREATE INDEX "supplier_lead_times_partner_id_idx"
    ON "supplier_lead_times"("partner_id");
CREATE INDEX "supplier_lead_times_order_date_idx"
    ON "supplier_lead_times"("order_date");

-- 수요 예측 결과
CREATE TABLE "demand_forecasts" (
    "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id"         UUID NOT NULL,
    "sku"             VARCHAR(50) NOT NULL,
    "horizon"         INTEGER NOT NULL,
    "daily_forecast"  JSONB NOT NULL,
    "total_forecast"  INTEGER NOT NULL,
    "model"           VARCHAR(20) NOT NULL,
    "mape"            DOUBLE PRECISION,
    "forecasted_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "demand_forecasts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "demand_forecasts_site_id_sku_idx"
    ON "demand_forecasts"("site_id", "sku");
CREATE INDEX "demand_forecasts_forecasted_at_idx"
    ON "demand_forecasts"("forecasted_at");

-- 발주 추천
CREATE TABLE "reorder_recommendations" (
    "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id"         UUID NOT NULL,
    "sku"             VARCHAR(50) NOT NULL,
    "item_name"       VARCHAR(200) NOT NULL,
    "current_qty"     INTEGER NOT NULL,
    "safety_stock"    INTEGER NOT NULL,
    "stockout_date"   DATE,
    "days_until_out"  INTEGER,
    "reorder_qty"     INTEGER NOT NULL,
    "partner_id"      UUID,
    "partner_name"    VARCHAR(200),
    "avg_lead_days"   INTEGER,
    "order_by_date"   DATE,
    "urgency"         VARCHAR(20) NOT NULL,
    "status"          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "voucher_id"      UUID,
    "forecast_meta"   JSONB,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "reorder_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reorder_recommendations_site_id_urgency_idx"
    ON "reorder_recommendations"("site_id", "urgency");
CREATE INDEX "reorder_recommendations_site_id_sku_idx"
    ON "reorder_recommendations"("site_id", "sku");
CREATE INDEX "reorder_recommendations_status_idx"
    ON "reorder_recommendations"("status");
CREATE INDEX "reorder_recommendations_stockout_date_idx"
    ON "reorder_recommendations"("stockout_date");
