-- AlterTable
ALTER TABLE "erp_connector_configs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hs_code_coverage" ALTER COLUMN "countries_cached" DROP DEFAULT;

-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "address_detail" TEXT,
ADD COLUMN     "contact_email" VARCHAR(255),
ADD COLUMN     "contact_phone" VARCHAR(30),
ADD COLUMN     "credit_limit" INTEGER,
ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'KRW',
ADD COLUMN     "delivery_address" TEXT,
ADD COLUMN     "delivery_memo" TEXT,
ADD COLUMN     "fax" VARCHAR(30),
ADD COLUMN     "lead_time_days" INTEGER,
ADD COLUMN     "main_phone" VARCHAR(30),
ADD COLUMN     "memo" TEXT,
ADD COLUMN     "min_order_qty" INTEGER,
ADD COLUMN     "quality_grade" VARCHAR(1),
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "tax_type" VARCHAR(10) NOT NULL DEFAULT 'TAX',
ADD COLUMN     "zip_code" VARCHAR(10);

-- AlterTable
ALTER TABLE "plans" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reorder_recommendations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "supplier_lead_times" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "roi_baselines" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "baseline_date" TIMESTAMPTZ NOT NULL,
    "annual_labor_cost" BIGINT NOT NULL DEFAULT 0,
    "annual_error_cost" BIGINT NOT NULL DEFAULT 0,
    "monthly_rent_per_m2" INTEGER NOT NULL DEFAULT 0,
    "warehouse_area" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthly_pickings" INTEGER NOT NULL DEFAULT 0,
    "error_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "labor_saving_rate" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "error_reduction_rate" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "space_saving_rate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "picking_efficiency_gain" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "roi_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roi_monthly_snapshots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "baseline_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "actual_pickings" INTEGER NOT NULL DEFAULT 0,
    "actual_errors" INTEGER NOT NULL DEFAULT 0,
    "actual_error_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual_employee_count" INTEGER NOT NULL DEFAULT 0,
    "actual_labor_cost" BIGINT NOT NULL DEFAULT 0,
    "actual_error_cost" BIGINT NOT NULL DEFAULT 0,
    "labor_saving" BIGINT NOT NULL DEFAULT 0,
    "error_cost_saving" BIGINT NOT NULL DEFAULT 0,
    "space_saving" BIGINT NOT NULL DEFAULT 0,
    "total_saving" BIGINT NOT NULL DEFAULT 0,
    "cumulative_saving" BIGINT NOT NULL DEFAULT 0,
    "data_source" VARCHAR(10) NOT NULL DEFAULT 'AUTO',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "roi_monthly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "reorder_recommendation_id" UUID,
    "vendor_id" UUID,
    "vendor_name" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ORDERED',
    "expected_date" DATE,
    "actual_date" DATE,
    "notes" TEXT,
    "driver_id" UUID,
    "driver_name" VARCHAR(100),
    "driver_phone" VARCHAR(30),
    "carrier_company" VARCHAR(100),
    "vehicle_no" VARCHAR(30),
    "tracking_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inbound_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "inbound_order_id" UUID NOT NULL,
    "sku_code" VARCHAR(100) NOT NULL,
    "item_name" VARCHAR(200),
    "expected_qty" INTEGER NOT NULL,
    "actual_qty" INTEGER,
    "unit_price" INTEGER NOT NULL DEFAULT 0,
    "qc_inspection_id" UUID,
    "spatial_object_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inbound_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'PICKING',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    "scheduled_date" DATE,
    "dispatched_date" DATE,
    "customer_name" VARCHAR(200),
    "destination" TEXT,
    "manifest_number" VARCHAR(30),
    "time_slot" VARCHAR(20),
    "notes" TEXT,
    "container_spec" VARCHAR(30),
    "hs_code" VARCHAR(10),
    "customer_id" UUID,
    "receiver_name" VARCHAR(100),
    "receiver_phone" VARCHAR(30),
    "receiver_address" TEXT,
    "driver_id" UUID,
    "driver_name" VARCHAR(100),
    "driver_phone" VARCHAR(30),
    "carrier_company" VARCHAR(100),
    "vehicle_no" VARCHAR(30),
    "tracking_url" TEXT,
    "pallet_count" INTEGER,
    "pallet_type" VARCHAR(20),
    "container_no" VARCHAR(30),
    "container_type" VARCHAR(20),
    "total_weight_kg" DOUBLE PRECISION,
    "total_volume_cbm" DOUBLE PRECISION,
    "special_instructions" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "outbound_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "outbound_order_id" UUID NOT NULL,
    "sku_code" VARCHAR(100) NOT NULL,
    "item_name" VARCHAR(200),
    "qty" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL DEFAULT 0,
    "picked_by" VARCHAR(100),
    "picked_at" TIMESTAMPTZ,
    "spatial_object_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "outbound_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_calendar" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "inbound_order_id" UUID,
    "outbound_order_id" UUID,
    "scheduled_date" DATE NOT NULL,
    "time_slot" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "color_code" VARCHAR(7),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "delivery_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_contacts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "partner_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100),
    "position" VARCHAR(100),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_bank_accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "partner_id" UUID NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "account_no" VARCHAR(50) NOT NULL,
    "account_holder" VARCHAR(100) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_attachments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "partner_id" UUID NOT NULL,
    "file_type" VARCHAR(30) NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_transaction_summaries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "partner_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "total_purchase_amt" INTEGER NOT NULL DEFAULT 0,
    "total_sales_amt" INTEGER NOT NULL DEFAULT 0,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "avg_lead_time" DOUBLE PRECISION,
    "on_time_rate" DOUBLE PRECISION,
    "return_count" INTEGER NOT NULL DEFAULT 0,
    "last_transaction_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "partner_transaction_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_drivers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "carrier_company" VARCHAR(100),
    "vehicle_no" VARCHAR(30),
    "vehicle_type" VARCHAR(30),
    "is_regular" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "delivery_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roi_baselines_company_id_idx" ON "roi_baselines"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "roi_baselines_company_id_site_id_key" ON "roi_baselines"("company_id", "site_id");

-- CreateIndex
CREATE INDEX "roi_monthly_snapshots_company_id_period_idx" ON "roi_monthly_snapshots"("company_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "roi_monthly_snapshots_baseline_id_period_key" ON "roi_monthly_snapshots"("baseline_id", "period");

-- CreateIndex
CREATE INDEX "inbound_orders_site_id_status_idx" ON "inbound_orders"("site_id", "status");

-- CreateIndex
CREATE INDEX "inbound_orders_site_id_expected_date_idx" ON "inbound_orders"("site_id", "expected_date");

-- CreateIndex
CREATE INDEX "inbound_orders_vendor_id_idx" ON "inbound_orders"("vendor_id");

-- CreateIndex
CREATE INDEX "inbound_orders_driver_id_idx" ON "inbound_orders"("driver_id");

-- CreateIndex
CREATE INDEX "inbound_items_inbound_order_id_idx" ON "inbound_items"("inbound_order_id");

-- CreateIndex
CREATE INDEX "inbound_items_sku_code_idx" ON "inbound_items"("sku_code");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_orders_manifest_number_key" ON "outbound_orders"("manifest_number");

-- CreateIndex
CREATE INDEX "outbound_orders_site_id_status_idx" ON "outbound_orders"("site_id", "status");

-- CreateIndex
CREATE INDEX "outbound_orders_site_id_scheduled_date_idx" ON "outbound_orders"("site_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "outbound_orders_manifest_number_idx" ON "outbound_orders"("manifest_number");

-- CreateIndex
CREATE INDEX "outbound_orders_customer_id_idx" ON "outbound_orders"("customer_id");

-- CreateIndex
CREATE INDEX "outbound_orders_driver_id_idx" ON "outbound_orders"("driver_id");

-- CreateIndex
CREATE INDEX "outbound_items_outbound_order_id_idx" ON "outbound_items"("outbound_order_id");

-- CreateIndex
CREATE INDEX "outbound_items_sku_code_idx" ON "outbound_items"("sku_code");

-- CreateIndex
CREATE INDEX "delivery_calendar_site_id_scheduled_date_idx" ON "delivery_calendar"("site_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "delivery_calendar_site_id_type_idx" ON "delivery_calendar"("site_id", "type");

-- CreateIndex
CREATE INDEX "partner_contacts_partner_id_idx" ON "partner_contacts"("partner_id");

-- CreateIndex
CREATE INDEX "partner_bank_accounts_partner_id_idx" ON "partner_bank_accounts"("partner_id");

-- CreateIndex
CREATE INDEX "partner_attachments_partner_id_idx" ON "partner_attachments"("partner_id");

-- CreateIndex
CREATE INDEX "partner_transaction_summaries_partner_id_idx" ON "partner_transaction_summaries"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_transaction_summaries_partner_id_year_month_key" ON "partner_transaction_summaries"("partner_id", "year", "month");

-- CreateIndex
CREATE INDEX "delivery_drivers_site_id_idx" ON "delivery_drivers"("site_id");

-- AddForeignKey
ALTER TABLE "roi_monthly_snapshots" ADD CONSTRAINT "roi_monthly_snapshots_baseline_id_fkey" FOREIGN KEY ("baseline_id") REFERENCES "roi_baselines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_orders" ADD CONSTRAINT "inbound_orders_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "delivery_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_items" ADD CONSTRAINT "inbound_items_inbound_order_id_fkey" FOREIGN KEY ("inbound_order_id") REFERENCES "inbound_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_orders" ADD CONSTRAINT "outbound_orders_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "delivery_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_items" ADD CONSTRAINT "outbound_items_outbound_order_id_fkey" FOREIGN KEY ("outbound_order_id") REFERENCES "outbound_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_calendar" ADD CONSTRAINT "delivery_calendar_inbound_order_id_fkey" FOREIGN KEY ("inbound_order_id") REFERENCES "inbound_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_calendar" ADD CONSTRAINT "delivery_calendar_outbound_order_id_fkey" FOREIGN KEY ("outbound_order_id") REFERENCES "outbound_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_bank_accounts" ADD CONSTRAINT "partner_bank_accounts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_attachments" ADD CONSTRAINT "partner_attachments_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_transaction_summaries" ADD CONSTRAINT "partner_transaction_summaries_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "trade_data_cache_hs_code_reporter_iso_partner_iso_period_flow_t" RENAME TO "trade_data_cache_hs_code_reporter_iso_partner_iso_period_fl_key";
