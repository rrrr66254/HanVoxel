-- B2C 대량 출고 업로드 이력
CREATE TABLE "bulk_upload_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "warning_count" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PARSING',
    "platform_type" VARCHAR(30) NOT NULL DEFAULT 'CUSTOM',
    "column_mapping" JSONB,
    "error_details" JSONB,
    "uploaded_by" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bulk_upload_logs_pkey" PRIMARY KEY ("id")
);

-- 수주 (고객 발주 수신)
CREATE TABLE "sales_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "order_no" VARCHAR(30) NOT NULL,
    "customer_id" UUID,
    "customer_name" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    "order_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_deadline" DATE,
    "items" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- BOM (제품별 소요 자재 목록)
CREATE TABLE "bom_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "product_sku" VARCHAR(100) NOT NULL,
    "material_sku" VARCHAR(100) NOT NULL,
    "qty_per_unit" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT '개',
    "lead_time_days" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- MRP 소요량 계산 결과
CREATE TABLE "mrp_results" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sales_order_id" UUID NOT NULL,
    "material_sku" VARCHAR(100) NOT NULL,
    "material_name" VARCHAR(200),
    "required_qty" DOUBLE PRECISION NOT NULL,
    "current_stock" DOUBLE PRECISION NOT NULL,
    "shortage_qty" DOUBLE PRECISION NOT NULL,
    "reorder_triggered" BOOLEAN NOT NULL DEFAULT false,
    "checked_by" VARCHAR(200),
    "checked_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mrp_results_pkey" PRIMARY KEY ("id")
);

-- 재고 더블체크 요청
CREATE TABLE "stock_check_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "mrp_result_id" UUID NOT NULL,
    "sales_order_id" UUID NOT NULL,
    "assigned_to" VARCHAR(200),
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ,
    "actual_qty" DOUBLE PRECISION,
    "discrepancy" DOUBLE PRECISION,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "stock_check_requests_pkey" PRIMARY KEY ("id")
);

-- Unique 제약
CREATE UNIQUE INDEX "sales_orders_order_no_key" ON "sales_orders"("order_no");
CREATE UNIQUE INDEX "bom_items_site_id_product_sku_material_sku_key" ON "bom_items"("site_id", "product_sku", "material_sku");

-- 인덱스
CREATE INDEX "bulk_upload_logs_site_id_created_at_idx" ON "bulk_upload_logs"("site_id", "created_at");
CREATE INDEX "bulk_upload_logs_status_idx" ON "bulk_upload_logs"("status");

CREATE INDEX "sales_orders_site_id_status_idx" ON "sales_orders"("site_id", "status");
CREATE INDEX "sales_orders_site_id_delivery_deadline_idx" ON "sales_orders"("site_id", "delivery_deadline");
CREATE INDEX "sales_orders_customer_id_idx" ON "sales_orders"("customer_id");

CREATE INDEX "bom_items_product_sku_idx" ON "bom_items"("product_sku");
CREATE INDEX "bom_items_material_sku_idx" ON "bom_items"("material_sku");

CREATE INDEX "mrp_results_sales_order_id_idx" ON "mrp_results"("sales_order_id");
CREATE INDEX "mrp_results_material_sku_idx" ON "mrp_results"("material_sku");
CREATE INDEX "mrp_results_status_idx" ON "mrp_results"("status");

CREATE INDEX "stock_check_requests_sales_order_id_idx" ON "stock_check_requests"("sales_order_id");
CREATE INDEX "stock_check_requests_mrp_result_id_idx" ON "stock_check_requests"("mrp_result_id");
CREATE INDEX "stock_check_requests_assigned_to_status_idx" ON "stock_check_requests"("assigned_to", "status");

-- 외래키
ALTER TABLE "mrp_results" ADD CONSTRAINT "mrp_results_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_check_requests" ADD CONSTRAINT "stock_check_requests_mrp_result_id_fkey" FOREIGN KEY ("mrp_result_id") REFERENCES "mrp_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_check_requests" ADD CONSTRAINT "stock_check_requests_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
