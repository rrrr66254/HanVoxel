/**
 * Mock 시드 데이터 — 오케스트레이션 엔트리포인트
 *
 * 시나리오: 한국자동차부품(주) — 중견 자동차 부품 제조업체
 *
 * 실행: npx ts-node seeds/mock-index.ts
 * 리셋+실행: npx ts-node seeds/mock-index.ts --reset
 *
 * 실행 순서 (FK 의존성 기반):
 * 1. company → 2. warehouse → 3. vendors → 4. skus → 5. bom
 * 6. orders → 7. qc-sla → 8. smart-reorder → 9. trade
 */

import path from "path";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { seedMockCompany } from "./mock-company";
import { seedMockWarehouse } from "./mock-warehouse";
import { seedMockSkus } from "./mock-skus";
import { seedMockVendors } from "./mock-vendors";
import { seedMockBom } from "./mock-bom";
import { seedMockOrders } from "./mock-orders";
import { seedMockQcSla } from "./mock-qc-sla";
import { seedMockSmartReorder } from "./mock-smart-reorder";
import { seedMockTrade } from "./mock-trade";

// .env 로드
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] as string });
const prisma = new PrismaClient({ adapter });

// Mock 데이터 관련 테이블 (삭제 순서: FK 역순)
const MOCK_TABLES = [
  // 무역 인텔리전스
  "hs_search_log", "hs_code_coverage", "trade_data_cache", "hs_code_watch",
  // 스마트 발주
  "smart_reorder_schedule", "demand_forecasts_v2", "vendor_lead_time_stats",
  "purchase_order_history", "reorder_recommendations", "demand_forecasts",
  "supplier_lead_times", "sku_daily_usage",
  // 수주·MRP
  "stock_check_requests", "mrp_results", "sales_orders",
  // 입출고
  "delivery_calendar", "outbound_items", "outbound_orders",
  "inbound_items", "inbound_orders",
  // 전표
  "voucher_lines", "vouchers",
  // QC·SLA·알림
  "qc_defect_items", "qc_inspections", "alerts",
  "sla_violations", "sla_metrics", "sla_targets",
  // BOM
  "bom_items",
  // SKU
  "sku_costs",
  // 거래처
  "partners", "suppliers",
  // 피킹
  "picking_lines", "picking_orders",
  // 공간 객체
  "spatial_hierarchies", "spatial_objects", "spatial_object_types",
  // 사용자·역할
  "user_roles", "role_permissions", "users", "roles", "permissions",
  // 사이트·회사
  "sites", "companies",
];

async function resetMockData(): Promise<void> {
  console.log("🗑️  Mock 데이터 리셋 중...\n");
  for (const table of MOCK_TABLES) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE 1=1`);
      console.log(`  ✗ ${table}`);
    } catch {
      // 테이블이 없으면 무시
    }
  }
  console.log("\n✅ 리셋 완료!\n");
}

async function main(): Promise<void> {
  const isReset = process.argv.includes("--reset");

  if (isReset) {
    await resetMockData();
  }

  console.log("🏭 한국자동차부품(주) Mock 데이터 삽입 시작...\n");

  // 순서 중요: FK 의존성 기반
  await seedMockCompany(prisma);    // 1. 회사·사이트·사용자
  await seedMockWarehouse(prisma);  // 2. 공간 객체·계층
  await seedMockVendors(prisma);    // 3. 공급업체·거래처
  await seedMockSkus(prisma);       // 4. SKU·재고·일별출고
  await seedMockBom(prisma);        // 5. BOM
  await seedMockOrders(prisma);     // 6. 수주·입고·출고·달력·전표
  await seedMockQcSla(prisma);      // 7. SLA·QC·알림
  await seedMockSmartReorder(prisma); // 8. 발주추천·수요예측·리드타임
  await seedMockTrade(prisma);      // 9. HS코드·무역데이터

  console.log("\n✅ 한국자동차부품(주) Mock 데이터 삽입 완료!");
  console.log("   회사: 한국자동차부품(주) (KAPC)");
  console.log("   사이트: 화성 본사 창고 (HS-WH01)");
  console.log("   사용자 5명 / 랙 12개 / SKU 15종 / 수주 8건 / 입고 6건 / 출고 10건");
}

main()
  .catch((e) => {
    console.error("❌ Mock 시드 실행 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
