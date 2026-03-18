/**
 * Mock 시드 — SKU 원가 정보 (15개 SKU)
 * 시나리오: 자동차 부품 완제품 + 원자재
 */

import { PrismaClient } from "@prisma/client";
import { IDS as C } from "./mock-company";

// SKU 코드 목록 (다른 시드에서 참조)
export const SKUS = {
  // 완제품 (5)
  BRAKE_PAD_FR: "FP-BP-001",      // 브레이크 패드 (전방)
  BRAKE_PAD_RR: "FP-BP-002",      // 브레이크 패드 (후방)
  SUSPENSION_ARM: "FP-SA-001",    // 서스펜션 암
  AIR_FILTER: "FP-AF-001",        // 에어필터
  OIL_FILTER: "FP-OF-001",        // 오일필터
  // 원자재 (10)
  STEEL_PLATE: "RM-ST-001",       // 강판
  FRICTION_MAT: "RM-FM-001",      // 마찰재
  RUBBER_SHEET: "RM-RB-001",      // 고무 시트
  ALUMINUM_BAR: "RM-AL-001",      // 알루미늄 바
  FILTER_PAPER: "RM-FP-001",      // 필터 원지
  ADHESIVE: "RM-AD-001",          // 접착제
  GASKET: "RM-GK-001",            // 가스켓
  SPRING_COIL: "RM-SC-001",       // 스프링 코일
  BOLT_SET: "RM-BS-001",          // 볼트 세트
  PAINT_COAT: "RM-PC-001",        // 도장 코팅제
};

export async function seedMockSkus(prisma: PrismaClient): Promise<void> {
  const skuData = [
    // 완제품
    { sku: SKUS.BRAKE_PAD_FR, name: "브레이크 패드 (전방)", qty: 450, avg: 28000, last: 27500, sell: 42000 },
    { sku: SKUS.BRAKE_PAD_RR, name: "브레이크 패드 (후방)", qty: 380, avg: 26000, last: 25800, sell: 39000 },
    { sku: SKUS.SUSPENSION_ARM, name: "서스펜션 암", qty: 200, avg: 65000, last: 64000, sell: 95000 },
    { sku: SKUS.AIR_FILTER, name: "에어필터", qty: 1200, avg: 8500, last: 8200, sell: 15000 },
    { sku: SKUS.OIL_FILTER, name: "오일필터", qty: 950, avg: 6200, last: 6000, sell: 11000 },
    // 원자재
    { sku: SKUS.STEEL_PLATE, name: "강판 (SS400)", qty: 800, avg: 12000, last: 11800, sell: 0 },
    { sku: SKUS.FRICTION_MAT, name: "마찰재 (세라믹)", qty: 300, avg: 15000, last: 14500, sell: 0 },
    { sku: SKUS.RUBBER_SHEET, name: "고무 시트 (NBR)", qty: 500, avg: 9000, last: 8800, sell: 0 },
    { sku: SKUS.ALUMINUM_BAR, name: "알루미늄 바 (6061)", qty: 250, avg: 35000, last: 34500, sell: 0 },
    { sku: SKUS.FILTER_PAPER, name: "필터 원지", qty: 2000, avg: 3500, last: 3400, sell: 0 },
    { sku: SKUS.ADHESIVE, name: "접착제 (에폭시)", qty: 150, avg: 22000, last: 21500, sell: 0 },
    { sku: SKUS.GASKET, name: "가스켓 (실리콘)", qty: 600, avg: 4500, last: 4300, sell: 0 },
    { sku: SKUS.SPRING_COIL, name: "스프링 코일 (SUS304)", qty: 400, avg: 18000, last: 17500, sell: 0 },
    { sku: SKUS.BOLT_SET, name: "볼트 세트 (M10×50)", qty: 3000, avg: 1200, last: 1150, sell: 0 },
    { sku: SKUS.PAINT_COAT, name: "도장 코팅제", qty: 100, avg: 45000, last: 44000, sell: 0 },
  ];

  for (const s of skuData) {
    const fifoLayers = JSON.stringify([{ qty: Math.floor(s.qty * 0.6), unitCost: s.avg }, { qty: s.qty - Math.floor(s.qty * 0.6), unitCost: s.last }]);
    await prisma.$executeRawUnsafe(`
      INSERT INTO sku_costs (id, site_id, sku, item_name, cost_method, current_qty,
        fifo_layers, avg_unit_cost, last_purchase_price, selling_price, updated_at)
      VALUES (uuid_generate_v4(), '${C.site}', '${s.sku}', '${s.name}', 'FIFO',
        ${s.qty}, '${fifoLayers}'::jsonb, ${s.avg}, ${s.last}, ${s.sell}, NOW())
      ON CONFLICT (site_id, sku) DO UPDATE SET
        item_name = EXCLUDED.item_name, current_qty = EXCLUDED.current_qty,
        avg_unit_cost = EXCLUDED.avg_unit_cost, last_purchase_price = EXCLUDED.last_purchase_price,
        selling_price = EXCLUDED.selling_price, updated_at = NOW()
    `);
  }

  // SKU 일별 출고 이력 (최근 30일)
  const highMovers = [
    { sku: SKUS.BRAKE_PAD_FR, base: 15 },
    { sku: SKUS.AIR_FILTER, base: 40 },
    { sku: SKUS.OIL_FILTER, base: 30 },
    { sku: SKUS.BOLT_SET, base: 100 },
    { sku: SKUS.STEEL_PLATE, base: 25 },
  ];
  for (const m of highMovers) {
    for (let d = 30; d >= 1; d--) {
      // 결정적 변동: 요일 기반 (주말 감소)
      const dayOfWeek = (30 - d) % 7;
      const weekendFactor = dayOfWeek >= 5 ? 0.3 : 1.0;
      const variation = 1 + (((d * 7) % 11) - 5) / 20; // -0.25 ~ +0.25
      const qty = Math.max(1, Math.round(m.base * weekendFactor * variation));
      const received = d % 7 === 0 ? Math.round(m.base * 5) : 0; // 주 1회 입고
      await prisma.$executeRawUnsafe(`
        INSERT INTO sku_daily_usage (id, site_id, sku, usage_date, qty_used, qty_received)
        VALUES (uuid_generate_v4(), '${C.site}', '${m.sku}',
          (CURRENT_DATE - INTERVAL '${d} days')::date, ${qty}, ${received})
        ON CONFLICT (site_id, sku, usage_date) DO UPDATE SET
          qty_used = EXCLUDED.qty_used, qty_received = EXCLUDED.qty_received
      `);
    }
  }

  console.log(`  ✓ mock-skus (SKU ${skuData.length}개, 일별 출고이력 ${highMovers.length * 30}건)`);
}
