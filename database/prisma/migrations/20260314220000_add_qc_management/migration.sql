-- CreateTable: 공급업체
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "contact" VARCHAR(200),
    "email" VARCHAR(255),
    "grade" VARCHAR(5) NOT NULL DEFAULT 'B',
    "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 검수 기록
CREATE TABLE "qc_inspections" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "site_id" UUID NOT NULL,
    "supplier_id" UUID,
    "type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "total_qty" INTEGER NOT NULL DEFAULT 0,
    "passed_qty" INTEGER NOT NULL DEFAULT 0,
    "defect_qty" INTEGER NOT NULL DEFAULT 0,
    "defect_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reference_no" VARCHAR(100),
    "inspector_name" VARCHAR(100),
    "inspected_at" TIMESTAMPTZ,
    "note" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "qc_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 불량 항목 상세
CREATE TABLE "qc_defect_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "inspection_id" UUID NOT NULL,
    "defect_type" VARCHAR(30) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "item_name" VARCHAR(200),
    "item_sku" VARCHAR(100),
    "quarantine_location_id" UUID,
    "disposition" VARCHAR(20),
    "evidence_url" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qc_defect_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_company_id_code_key" ON "suppliers"("company_id", "code");
CREATE INDEX "suppliers_company_id_idx" ON "suppliers"("company_id");

CREATE INDEX "qc_inspections_site_id_type_idx" ON "qc_inspections"("site_id", "type");
CREATE INDEX "qc_inspections_supplier_id_idx" ON "qc_inspections"("supplier_id");
CREATE INDEX "qc_inspections_inspected_at_idx" ON "qc_inspections"("inspected_at");

CREATE INDEX "qc_defect_items_inspection_id_idx" ON "qc_defect_items"("inspection_id");
CREATE INDEX "qc_defect_items_defect_type_idx" ON "qc_defect_items"("defect_type");
CREATE INDEX "qc_defect_items_quarantine_location_id_idx" ON "qc_defect_items"("quarantine_location_id");

-- AddForeignKey
ALTER TABLE "qc_inspections" ADD CONSTRAINT "qc_inspections_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qc_inspections" ADD CONSTRAINT "qc_inspections_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qc_defect_items" ADD CONSTRAINT "qc_defect_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "qc_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
