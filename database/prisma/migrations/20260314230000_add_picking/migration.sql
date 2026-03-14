-- CreateTable: 피킹 주문
CREATE TABLE "picking_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "order_no" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "policy" VARCHAR(20) NOT NULL DEFAULT 'FIFO',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "assignee_id" UUID,
    "assignee_name" VARCHAR(100),
    "customer_name" VARCHAR(200),
    "assigned_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "total_lines" INTEGER NOT NULL DEFAULT 0,
    "picked_lines" INTEGER NOT NULL DEFAULT 0,
    "error_lines" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "picking_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 피킹 라인
CREATE TABLE "picking_lines" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "picking_order_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "requested_qty" INTEGER NOT NULL,
    "picked_qty" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "bin_location_id" UUID,
    "bin_code" VARCHAR(50),
    "zone" VARCHAR(50),
    "barcode" VARCHAR(100),
    "expiry_date" DATE,
    "received_date" DATE,
    "pick_sequence" INTEGER NOT NULL DEFAULT 0,
    "scan_verified" BOOLEAN NOT NULL DEFAULT false,
    "picked_at" TIMESTAMPTZ,
    "error_reason" VARCHAR(200),
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "picking_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "picking_orders_site_id_order_no_key" ON "picking_orders"("site_id", "order_no");
CREATE INDEX "picking_orders_site_id_status_idx" ON "picking_orders"("site_id", "status");
CREATE INDEX "picking_orders_assignee_id_idx" ON "picking_orders"("assignee_id");

CREATE INDEX "picking_lines_picking_order_id_idx" ON "picking_lines"("picking_order_id");
CREATE INDEX "picking_lines_sku_idx" ON "picking_lines"("sku");
CREATE INDEX "picking_lines_bin_location_id_idx" ON "picking_lines"("bin_location_id");

-- AddForeignKey
ALTER TABLE "picking_orders" ADD CONSTRAINT "picking_orders_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "picking_lines" ADD CONSTRAINT "picking_lines_picking_order_id_fkey" FOREIGN KEY ("picking_order_id") REFERENCES "picking_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
