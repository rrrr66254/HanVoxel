/**
 * Mock 시드 — 스마트 발주 추천 / 수요 예측 / 리드타임 통계
 * 시나리오: 재고 부족 SKU 5건 발주 추천 + 수요 예측 + 발주 이력
 */

import { PrismaClient } from "@prisma/client";
import { IDS as C } from "./mock-company";
import { SKUS } from "./mock-skus";
import { PARTNER, SUPPLIER } from "./mock-vendors";

export async function seedMockSmartReorder(prisma: PrismaClient): Promise<void> {
  // =============================================
  // 발주 추천 (ReorderRecommendation) — 5건
  // =============================================
  const recs = [
    { sku: SKUS.FRICTION_MAT, name: "마찰재 (세라믹)", curr: 300, safety: 350, outDate: "2026-03-25", days: 7, qty: 500, partner: PARTNER.koreaFriction, partnerName: "한국마찰소재(주)", lead: 10, orderBy: "2026-03-18", urgency: "HIGH", status: "PENDING" },
    { sku: SKUS.PAINT_COAT, name: "도장 코팅제", curr: 100, safety: 80, outDate: "2026-04-02", days: 15, qty: 100, partner: PARTNER.hanhwaChemical, partnerName: "한화솔루션", lead: 5, orderBy: "2026-03-25", urgency: "MEDIUM", status: "PENDING" },
    { sku: SKUS.FILTER_PAPER, name: "필터 원지", curr: 2000, safety: 1500, outDate: "2026-04-08", days: 21, qty: 3000, partner: PARTNER.samjinFilter, partnerName: "삼진필터(주)", lead: 7, orderBy: "2026-03-28", urgency: "LOW", status: "PENDING" },
    { sku: SKUS.ALUMINUM_BAR, name: "알루미늄 바 (6061)", curr: 250, safety: 200, outDate: "2026-03-30", days: 12, qty: 300, partner: PARTNER.poscoSteel, partnerName: "포스코스틸리온", lead: 14, orderBy: "2026-03-18", urgency: "HIGH", status: "ACCEPTED" },
    { sku: SKUS.RUBBER_SHEET, name: "고무 시트 (NBR)", curr: 500, safety: 300, outDate: "2026-04-15", days: 28, qty: 400, partner: PARTNER.hanhwaChemical, partnerName: "한화솔루션", lead: 7, orderBy: "2026-04-05", urgency: "LOW", status: "PENDING" },
  ];
  for (const r of recs) {
    const forecastMeta = JSON.stringify({ model: "MOVING_AVG", mape: 12.5, horizon: 14 });
    await prisma.$executeRawUnsafe(`
      INSERT INTO reorder_recommendations (id, site_id, sku, item_name, current_qty, safety_stock,
        stockout_date, days_until_out, reorder_qty, partner_id, partner_name, avg_lead_days,
        order_by_date, urgency, status, forecast_meta, created_at, updated_at)
      VALUES (uuid_generate_v4(), '${C.site}', '${r.sku}', '${r.name}', ${r.curr}, ${r.safety},
        '${r.outDate}'::date, ${r.days}, ${r.qty}, '${r.partner}', '${r.partnerName}', ${r.lead},
        '${r.orderBy}'::date, '${r.urgency}', '${r.status}', '${forecastMeta}'::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =============================================
  // 수요 예측 V2 (DemandForecastV2) — 5 SKU × 14일
  // =============================================
  const forecastSkus = [
    { sku: SKUS.BRAKE_PAD_FR, base: 15, model: "ENSEMBLE", mape: 8.5 },
    { sku: SKUS.AIR_FILTER, base: 40, model: "MOVING_AVG", mape: 11.2 },
    { sku: SKUS.STEEL_PLATE, base: 25, model: "LINEAR", mape: 14.0 },
    { sku: SKUS.OIL_FILTER, base: 30, model: "ENSEMBLE", mape: 9.8 },
    { sku: SKUS.FRICTION_MAT, base: 12, model: "MOVING_AVG", mape: 15.3 },
  ];
  for (const f of forecastSkus) {
    for (let d = 1; d <= 14; d++) {
      const dayOfWeek = d % 7;
      const weekendFactor = dayOfWeek >= 5 ? 0.3 : 1.0;
      const predicted = Math.max(1, Math.round(f.base * weekendFactor * (1 + ((d * 7) % 9 - 4) / 30)));
      const ciLow = Math.max(0, Math.round(predicted * 0.7));
      const ciHigh = Math.round(predicted * 1.3);
      await prisma.$executeRawUnsafe(`
        INSERT INTO demand_forecasts_v2 (id, site_id, sku_code, forecast_date, predicted_qty,
          confidence_interval_low, confidence_interval_high, model_used, mape_score, input_weeks, created_at)
        VALUES (uuid_generate_v4(), '${C.site}', '${f.sku}',
          (CURRENT_DATE + INTERVAL '${d} days')::date, ${predicted}, ${ciLow}, ${ciHigh},
          '${f.model}', ${f.mape}, 12, NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }
  }

  // =============================================
  // 발주 이력 (PurchaseOrderHistory) — 최근 3개월 20건
  // =============================================
  const poHistory = [
    { sku: SKUS.STEEL_PLATE, vendor: PARTNER.poscoSteel, days: [-90, -60, -30, -3], qty: 500, price: 12000, lead: [8, 7, 7, null] },
    { sku: SKUS.FRICTION_MAT, vendor: PARTNER.koreaFriction, days: [-85, -55, -25], qty: 200, price: 15000, lead: [11, 10, 10] },
    { sku: SKUS.BOLT_SET, vendor: PARTNER.dongaBolt, days: [-80, -50, -20, -5], qty: 5000, price: 1200, lead: [4, 3, 3, null] },
    { sku: SKUS.ADHESIVE, vendor: PARTNER.hanhwaChemical, days: [-75, -45], qty: 100, price: 22000, lead: [6, 5] },
    { sku: SKUS.FILTER_PAPER, vendor: PARTNER.samjinFilter, days: [-70, -40, -10], qty: 3000, price: 3500, lead: [8, 7, null] },
    { sku: SKUS.ALUMINUM_BAR, vendor: PARTNER.poscoSteel, days: [-65, -35], qty: 200, price: 35000, lead: [15, 14] },
    { sku: SKUS.RUBBER_SHEET, vendor: PARTNER.hanhwaChemical, days: [-60, -30], qty: 400, price: 9000, lead: [8, 7] },
  ];
  for (const po of poHistory) {
    for (let i = 0; i < po.days.length; i++) {
      const d = po.days[i];
      const leadVal = po.lead[i];
      const actualArrived = leadVal !== null ? `(CURRENT_DATE + INTERVAL '${d + leadVal} days')::date` : "NULL";
      const season = Math.ceil(((new Date().getMonth() + Math.floor(d / 30)) % 12 + 1) / 3);
      await prisma.$executeRawUnsafe(`
        INSERT INTO purchase_order_history (id, site_id, sku_code, vendor_id,
          ordered_at, expected_at, actual_arrived_at, lead_time_days, ordered_qty, arrived_qty,
          unit_price, season, created_at, updated_at)
        VALUES (uuid_generate_v4(), '${C.site}', '${po.sku}', '${po.vendor}',
          (CURRENT_DATE + INTERVAL '${d} days')::timestamptz,
          (CURRENT_DATE + INTERVAL '${d + 10} days')::date,
          ${actualArrived},
          ${leadVal !== null ? leadVal : "NULL"},
          ${po.qty}, ${leadVal !== null ? po.qty : "NULL"},
          ${po.price}, ${season}, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }
  }

  // =============================================
  // 리드타임 통계 (VendorLeadTimeStat) — 5 공급업체
  // =============================================
  const leadStats = [
    { vendor: PARTNER.poscoSteel, sku: SKUS.STEEL_PLATE, count: 12, avg: 7.5, min: 6, max: 10, std: 1.2, p90: 9 },
    { vendor: PARTNER.koreaFriction, sku: SKUS.FRICTION_MAT, count: 8, avg: 10.3, min: 8, max: 14, std: 1.8, p90: 12 },
    { vendor: PARTNER.dongaBolt, sku: SKUS.BOLT_SET, count: 15, avg: 3.2, min: 2, max: 5, std: 0.8, p90: 4 },
    { vendor: PARTNER.hanhwaChemical, sku: SKUS.ADHESIVE, count: 6, avg: 5.5, min: 4, max: 8, std: 1.3, p90: 7 },
    { vendor: PARTNER.samjinFilter, sku: SKUS.FILTER_PAPER, count: 10, avg: 7.2, min: 5, max: 10, std: 1.5, p90: 9 },
    { vendor: PARTNER.poscoSteel, sku: SKUS.ALUMINUM_BAR, count: 5, avg: 14.2, min: 12, max: 17, std: 2.0, p90: 16 },
    { vendor: PARTNER.hanhwaChemical, sku: SKUS.RUBBER_SHEET, count: 7, avg: 7.4, min: 6, max: 10, std: 1.4, p90: 9 },
  ];
  for (const ls of leadStats) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO vendor_lead_time_stats (id, site_id, vendor_id, sku_code, sample_count,
        avg_lead_time, min_lead_time, max_lead_time, std_deviation, p90_lead_time, last_updated_at)
      VALUES (uuid_generate_v4(), '${C.site}', '${ls.vendor}', '${ls.sku}', ${ls.count},
        ${ls.avg}, ${ls.min}, ${ls.max}, ${ls.std}, ${ls.p90}, NOW())
      ON CONFLICT (site_id, vendor_id, sku_code) DO UPDATE SET
        sample_count = EXCLUDED.sample_count, avg_lead_time = EXCLUDED.avg_lead_time, last_updated_at = NOW()
    `);
  }

  // =============================================
  // 스마트 발주 스케줄 (SmartReorderSchedule) — 3건
  // =============================================
  const schedules = [
    { sku: SKUS.FRICTION_MAT, vendor: PARTNER.koreaFriction, orderDate: "2026-03-18", qty: 500, arrival: "2026-03-28", conf: 82, min: "2026-03-27", max: "2026-03-31", stockout: "2026-03-25", reason: "마찰재 현재 재고 300kg, 일평균 소모 42kg. 안전재고 350kg 기준 7일 후 소진 예상. 한국마찰소재 평균 리드타임 10일 고려 즉시 발주 권장.", status: "AUTO_SCHEDULED" },
    { sku: SKUS.ALUMINUM_BAR, vendor: PARTNER.poscoSteel, orderDate: "2026-03-18", qty: 300, arrival: "2026-04-01", conf: 75, min: "2026-03-30", max: "2026-04-04", stockout: "2026-03-30", reason: "알루미늄 바 현재 250kg, 서스펜션 암 수주건(기아) 200개 생산에 400kg 필요. 포스코 평균 리드타임 14일. 즉시 발주 시 4/1 입고 예상.", status: "CONFIRMED" },
    { sku: SKUS.FILTER_PAPER, vendor: PARTNER.samjinFilter, orderDate: "2026-03-28", qty: 3000, arrival: "2026-04-04", conf: 88, min: "2026-04-03", max: "2026-04-07", stockout: "2026-04-08", reason: "필터 원지 현재 2,000m², SL오토파츠 에어필터 3,000개 수주 대응. 삼진필터 평균 리드타임 7일. 3/28 발주 권장.", status: "AUTO_SCHEDULED" },
  ];
  for (const s of schedules) {
    const reasonEsc = s.reason.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`
      INSERT INTO smart_reorder_schedule (id, site_id, sku_code, vendor_id,
        recommended_order_date, recommended_qty, estimated_arrival_date, arrival_confidence,
        arrival_range_min, arrival_range_max, stockout_risk_date, reason, status, created_at, updated_at)
      VALUES (uuid_generate_v4(), '${C.site}', '${s.sku}', '${s.vendor}',
        '${s.orderDate}'::date, ${s.qty}, '${s.arrival}'::date, ${s.conf},
        '${s.min}'::date, '${s.max}'::date, '${s.stockout}'::date, '${reasonEsc}', '${s.status}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  console.log(`  ✓ mock-smart-reorder (추천 ${recs.length}, 예측 ${forecastSkus.length * 14}건, 발주이력 ${poHistory.reduce((s, p) => s + p.days.length, 0)}건, 리드타임통계 ${leadStats.length}, 스케줄 ${schedules.length})`);
}
