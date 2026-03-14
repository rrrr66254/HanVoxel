-- CreateTable: SLA 기준 설정
CREATE TABLE "sla_targets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "delivery_on_time_target" DOUBLE PRECISION NOT NULL DEFAULT 98.0,
    "misshipment_rate_limit" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "picking_accuracy_target" DOUBLE PRECISION NOT NULL DEFAULT 99.5,
    "avg_processing_time_limit" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "escalation_enabled" BOOLEAN NOT NULL DEFAULT true,
    "escalation_emails" JSONB,
    "escalation_threshold" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sla_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SLA KPI 스냅샷 (일별)
CREATE TABLE "sla_metrics" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sla_target_id" UUID NOT NULL,
    "record_date" DATE NOT NULL,
    "delivery_on_time_rate" DOUBLE PRECISION NOT NULL,
    "misshipment_rate" DOUBLE PRECISION NOT NULL,
    "picking_accuracy" DOUBLE PRECISION NOT NULL,
    "avg_processing_time" DOUBLE PRECISION NOT NULL,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "on_time_orders" INTEGER NOT NULL DEFAULT 0,
    "misshipment_count" INTEGER NOT NULL DEFAULT 0,
    "total_picks" INTEGER NOT NULL DEFAULT 0,
    "accurate_picks" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SLA 위반 기록
CREATE TABLE "sla_violations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sla_target_id" UUID NOT NULL,
    "metric_name" VARCHAR(50) NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "actual_value" DOUBLE PRECISION NOT NULL,
    "violation_date" DATE NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sla_targets_company_id_site_id_key" ON "sla_targets"("company_id", "site_id");
CREATE INDEX "sla_targets_company_id_idx" ON "sla_targets"("company_id");

CREATE UNIQUE INDEX "sla_metrics_sla_target_id_record_date_key" ON "sla_metrics"("sla_target_id", "record_date");
CREATE INDEX "sla_metrics_sla_target_id_record_date_idx" ON "sla_metrics"("sla_target_id", "record_date");

CREATE INDEX "sla_violations_sla_target_id_violation_date_idx" ON "sla_violations"("sla_target_id", "violation_date");
CREATE INDEX "sla_violations_metric_name_idx" ON "sla_violations"("metric_name");

-- AddForeignKey
ALTER TABLE "sla_metrics" ADD CONSTRAINT "sla_metrics_sla_target_id_fkey" FOREIGN KEY ("sla_target_id") REFERENCES "sla_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sla_violations" ADD CONSTRAINT "sla_violations_sla_target_id_fkey" FOREIGN KEY ("sla_target_id") REFERENCES "sla_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
