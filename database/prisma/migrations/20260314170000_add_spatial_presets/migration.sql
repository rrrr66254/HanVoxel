-- 프리셋 카테고리
CREATE TABLE "preset_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "preset_categories_pkey" PRIMARY KEY ("id")
);

-- 공간 프리셋 (표준 규격)
CREATE TABLE "spatial_presets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "category_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "standard" VARCHAR(100),
    "region" VARCHAR(10),
    "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inner_width" DOUBLE PRECISION,
    "inner_depth" DOUBLE PRECISION,
    "inner_height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION DEFAULT 0,
    "max_load" DOUBLE PRECISION,
    "capacity" DOUBLE PRECISION,
    "levels" INTEGER,
    "level_height" DOUBLE PRECISION,
    "load_per_level" DOUBLE PRECISION,
    "qty_per_pallet" INTEGER,
    "kg_per_pallet" DOUBLE PRECISION,
    "color" VARCHAR(7),
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "mesh_type" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "spatial_presets_pkey" PRIMARY KEY ("id")
);

-- 창고 템플릿
CREATE TABLE "warehouse_templates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "industry" VARCHAR(50) NOT NULL,
    "area_min" DOUBLE PRECISION,
    "area_max" DOUBLE PRECISION,
    "rack_preset_id" UUID NOT NULL,
    "pallet_preset_id" UUID NOT NULL,
    "container_preset_id" UUID,
    "rack_layout" VARCHAR(30) NOT NULL DEFAULT 'BACK_TO_BACK',
    "aisle_type" VARCHAR(30) NOT NULL DEFAULT 'REACH_TRUCK',
    "aisle_width" DOUBLE PRECISION NOT NULL DEFAULT 2.8,
    "main_aisle_width" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "warehouse_templates_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "preset_categories_name_key" ON "preset_categories"("name");

CREATE UNIQUE INDEX "spatial_presets_code_key" ON "spatial_presets"("code");
CREATE INDEX "spatial_presets_category_id_idx" ON "spatial_presets"("category_id");
CREATE INDEX "spatial_presets_region_idx" ON "spatial_presets"("region");

CREATE UNIQUE INDEX "warehouse_templates_code_key" ON "warehouse_templates"("code");
CREATE INDEX "warehouse_templates_industry_idx" ON "warehouse_templates"("industry");

-- Foreign Keys
ALTER TABLE "spatial_presets" ADD CONSTRAINT "spatial_presets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "preset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "warehouse_templates" ADD CONSTRAINT "warehouse_templates_rack_preset_id_fkey" FOREIGN KEY ("rack_preset_id") REFERENCES "spatial_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "warehouse_templates" ADD CONSTRAINT "warehouse_templates_pallet_preset_id_fkey" FOREIGN KEY ("pallet_preset_id") REFERENCES "spatial_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
