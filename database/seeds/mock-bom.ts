/**
 * Mock 시드 — BOM (Bill of Materials) 데이터
 * 시나리오: 브레이크 패드, 서스펜션 암, 에어필터 제품별 소요 자재
 */

import { PrismaClient } from "@prisma/client";
import { IDS as C } from "./mock-company";
import { SKUS } from "./mock-skus";

export async function seedMockBom(prisma: PrismaClient): Promise<void> {
  const bom = [
    // 브레이크 패드 (전방) — 4개 자재
    { product: SKUS.BRAKE_PAD_FR, material: SKUS.STEEL_PLATE, qty: 0.5, unit: "kg", lead: 7, note: "백플레이트 강판" },
    { product: SKUS.BRAKE_PAD_FR, material: SKUS.FRICTION_MAT, qty: 0.3, unit: "kg", lead: 10, note: "세라믹 마찰재" },
    { product: SKUS.BRAKE_PAD_FR, material: SKUS.ADHESIVE, qty: 0.05, unit: "L", lead: 5, note: "에폭시 접착제" },
    { product: SKUS.BRAKE_PAD_FR, material: SKUS.PAINT_COAT, qty: 0.02, unit: "L", lead: 5, note: "방청 코팅" },

    // 브레이크 패드 (후방) — 유사 구성
    { product: SKUS.BRAKE_PAD_RR, material: SKUS.STEEL_PLATE, qty: 0.45, unit: "kg", lead: 7, note: "백플레이트 강판" },
    { product: SKUS.BRAKE_PAD_RR, material: SKUS.FRICTION_MAT, qty: 0.28, unit: "kg", lead: 10, note: "세라믹 마찰재" },
    { product: SKUS.BRAKE_PAD_RR, material: SKUS.ADHESIVE, qty: 0.04, unit: "L", lead: 5, note: "에폭시 접착제" },

    // 서스펜션 암 — 5개 자재
    { product: SKUS.SUSPENSION_ARM, material: SKUS.ALUMINUM_BAR, qty: 2.0, unit: "kg", lead: 14, note: "6061 알루미늄" },
    { product: SKUS.SUSPENSION_ARM, material: SKUS.RUBBER_SHEET, qty: 0.3, unit: "kg", lead: 7, note: "부싱 고무" },
    { product: SKUS.SUSPENSION_ARM, material: SKUS.BOLT_SET, qty: 4, unit: "개", lead: 3, note: "M10×50 볼트" },
    { product: SKUS.SUSPENSION_ARM, material: SKUS.GASKET, qty: 2, unit: "개", lead: 5, note: "실리콘 가스켓" },
    { product: SKUS.SUSPENSION_ARM, material: SKUS.PAINT_COAT, qty: 0.1, unit: "L", lead: 5, note: "도장 코팅" },

    // 에어필터 — 3개 자재
    { product: SKUS.AIR_FILTER, material: SKUS.FILTER_PAPER, qty: 0.5, unit: "m²", lead: 7, note: "고성능 필터 원지" },
    { product: SKUS.AIR_FILTER, material: SKUS.RUBBER_SHEET, qty: 0.1, unit: "kg", lead: 7, note: "프레임 실링" },
    { product: SKUS.AIR_FILTER, material: SKUS.ADHESIVE, qty: 0.02, unit: "L", lead: 5, note: "필터 접착" },

    // 오일필터 — 4개 자재
    { product: SKUS.OIL_FILTER, material: SKUS.FILTER_PAPER, qty: 0.3, unit: "m²", lead: 7, note: "오일필터 원지" },
    { product: SKUS.OIL_FILTER, material: SKUS.STEEL_PLATE, qty: 0.15, unit: "kg", lead: 7, note: "케이스 강판" },
    { product: SKUS.OIL_FILTER, material: SKUS.GASKET, qty: 1, unit: "개", lead: 5, note: "오링 가스켓" },
    { product: SKUS.OIL_FILTER, material: SKUS.SPRING_COIL, qty: 1, unit: "개", lead: 10, note: "바이패스 스프링" },
  ];

  for (const b of bom) {
    const noteEsc = b.note.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`
      INSERT INTO bom_items (id, site_id, product_sku, material_sku, qty_per_unit, unit, lead_time_days, notes, created_at, updated_at)
      VALUES (uuid_generate_v4(), '${C.site}', '${b.product}', '${b.material}', ${b.qty}, '${b.unit}', ${b.lead}, '${noteEsc}', NOW(), NOW())
      ON CONFLICT (site_id, product_sku, material_sku) DO UPDATE SET
        qty_per_unit = EXCLUDED.qty_per_unit, unit = EXCLUDED.unit, lead_time_days = EXCLUDED.lead_time_days, updated_at = NOW()
    `);
  }

  console.log(`  ✓ mock-bom (BOM ${bom.length}건)`);
}
