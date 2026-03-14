-- Phase 3 Step 1: 물류 특화 경량 ERP

-- 거래처 (공급업체 + 고객사)
CREATE TABLE "partners" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "company_id" UUID NOT NULL,
  "type" VARCHAR(20) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "biz_no" VARCHAR(20),
  "ceo_name" VARCHAR(100),
  "biz_type" VARCHAR(100),
  "biz_category" VARCHAR(100),
  "address" TEXT,
  "phone" VARCHAR(30),
  "email" VARCHAR(255),
  "contact_name" VARCHAR(100),
  "payment_terms" VARCHAR(30),
  "note" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "partners_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partners_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "partners_company_id_code_key" ON "partners"("company_id", "code");
CREATE INDEX "partners_company_id_type_idx" ON "partners"("company_id", "type");

-- 전표 (매입/매출)
CREATE TABLE "vouchers" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "site_id" UUID NOT NULL,
  "type" VARCHAR(20) NOT NULL,
  "voucher_no" VARCHAR(30) NOT NULL,
  "partner_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "voucher_date" DATE NOT NULL,
  "due_date" DATE,
  "subtotal" INTEGER NOT NULL DEFAULT 0,
  "tax_amount" INTEGER NOT NULL DEFAULT 0,
  "total_amount" INTEGER NOT NULL DEFAULT 0,
  "reference_no" VARCHAR(50),
  "note" TEXT,
  "confirmed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vouchers_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "vouchers_voucher_no_key" ON "vouchers"("voucher_no");
CREATE INDEX "vouchers_site_id_type_idx" ON "vouchers"("site_id", "type");
CREATE INDEX "vouchers_site_id_voucher_date_idx" ON "vouchers"("site_id", "voucher_date");
CREATE INDEX "vouchers_partner_id_idx" ON "vouchers"("partner_id");

-- 전표 항목
CREATE TABLE "voucher_lines" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "voucher_id" UUID NOT NULL,
  "line_no" INTEGER NOT NULL,
  "sku" VARCHAR(50) NOT NULL,
  "item_name" VARCHAR(200) NOT NULL,
  "qty" INTEGER NOT NULL,
  "unit_price" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "tax_amount" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "voucher_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "voucher_lines_voucher_id_fkey"
    FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "voucher_lines_voucher_id_idx" ON "voucher_lines"("voucher_id");
CREATE INDEX "voucher_lines_sku_idx" ON "voucher_lines"("sku");

-- SKU별 원가 정보
CREATE TABLE "sku_costs" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "site_id" UUID NOT NULL,
  "sku" VARCHAR(50) NOT NULL,
  "item_name" VARCHAR(200) NOT NULL,
  "cost_method" VARCHAR(20) NOT NULL DEFAULT 'FIFO',
  "current_qty" INTEGER NOT NULL DEFAULT 0,
  "fifo_layers" JSONB,
  "avg_unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "last_purchase_price" INTEGER NOT NULL DEFAULT 0,
  "selling_price" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "sku_costs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sku_costs_site_id_sku_key" ON "sku_costs"("site_id", "sku");
CREATE INDEX "sku_costs_site_id_idx" ON "sku_costs"("site_id");
