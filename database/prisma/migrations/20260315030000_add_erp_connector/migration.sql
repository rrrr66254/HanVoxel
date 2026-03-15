-- Phase 3 Step 4: 더존/영림원 ERP 커넥터
-- 커넥터 설정, 동기화 로그, 필드 매핑

-- ERP 커넥터 설정
CREATE TABLE "erp_connector_configs" (
    "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_id"       UUID NOT NULL,
    "erp_type"         VARCHAR(20) NOT NULL,
    "display_name"     VARCHAR(100) NOT NULL,
    "base_url"         VARCHAR(500) NOT NULL,
    "auth_type"        VARCHAR(20) NOT NULL,
    "credentials"      JSONB NOT NULL,
    "config_json"      JSONB,
    "is_active"        BOOLEAN NOT NULL DEFAULT true,
    "last_ping_at"     TIMESTAMPTZ,
    "last_ping_status" VARCHAR(20),
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "erp_connector_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "erp_connector_configs_company_id_fkey"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "erp_connector_configs_company_id_erp_type_key"
    ON "erp_connector_configs"("company_id", "erp_type");
CREATE INDEX "erp_connector_configs_company_id_idx"
    ON "erp_connector_configs"("company_id");

-- ERP 동기화 로그
CREATE TABLE "erp_sync_logs" (
    "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
    "connector_id"     UUID NOT NULL,
    "direction"        VARCHAR(10) NOT NULL,
    "entity_type"      VARCHAR(20) NOT NULL,
    "entity_id"        UUID,
    "erp_ref_no"       VARCHAR(50),
    "status"           VARCHAR(20) NOT NULL,
    "error_message"    TEXT,
    "retry_count"      INTEGER NOT NULL DEFAULT 0,
    "request_payload"  JSONB,
    "response_payload" JSONB,
    "synced_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "erp_sync_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "erp_sync_logs_connector_id_fkey"
        FOREIGN KEY ("connector_id") REFERENCES "erp_connector_configs"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX "erp_sync_logs_connector_id_status_idx"
    ON "erp_sync_logs"("connector_id", "status");
CREATE INDEX "erp_sync_logs_connector_id_entity_type_idx"
    ON "erp_sync_logs"("connector_id", "entity_type");
CREATE INDEX "erp_sync_logs_synced_at_idx"
    ON "erp_sync_logs"("synced_at");

-- ERP 필드 매핑
CREATE TABLE "erp_field_mappings" (
    "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
    "connector_id"    UUID NOT NULL,
    "entity_type"     VARCHAR(20) NOT NULL,
    "source_field"    VARCHAR(100) NOT NULL,
    "target_field"    VARCHAR(100) NOT NULL,
    "transform_type"  VARCHAR(20) NOT NULL DEFAULT 'DIRECT',
    "transform_param" VARCHAR(500),
    "is_required"     BOOLEAN NOT NULL DEFAULT false,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "erp_field_mappings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "erp_field_mappings_connector_id_fkey"
        FOREIGN KEY ("connector_id") REFERENCES "erp_connector_configs"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX "erp_field_mappings_connector_id_entity_type_source_field_key"
    ON "erp_field_mappings"("connector_id", "entity_type", "source_field");
CREATE INDEX "erp_field_mappings_connector_id_idx"
    ON "erp_field_mappings"("connector_id");
