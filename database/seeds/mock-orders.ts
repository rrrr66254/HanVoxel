/**
 * Mock 시드 — 수주(8건), 입고(6건), 출고(10건), 달력, 전표
 * 시나리오: 현대모비스/기아/만도/SL 납품 + 포스코/한국마찰 등 입고
 */

import { PrismaClient } from "@prisma/client";
import { IDS as C } from "./mock-company";
import { SKUS } from "./mock-skus";
import { PARTNER } from "./mock-vendors";

export async function seedMockOrders(prisma: PrismaClient): Promise<void> {
  // =============================================
  // 수주 (SalesOrder) — 8건
  // =============================================
  const salesOrders = [
    { id: "so000000-0000-4000-8000-000000000001", no: "SO-20260301-0001", cust: PARTNER.hyundaiMobis, custName: "현대모비스", status: "SHIPPED", date: "2026-03-01", deadline: "2026-03-15",
      items: JSON.stringify([{ productSku: SKUS.BRAKE_PAD_FR, productName: "브레이크 패드 (전방)", qty: 500, unitPrice: 42000 }]) },
    { id: "so000000-0000-4000-8000-000000000002", no: "SO-20260305-0001", cust: PARTNER.kiaMotors, custName: "기아자동차 화성공장", status: "CONFIRMED", date: "2026-03-05", deadline: "2026-03-20",
      items: JSON.stringify([{ productSku: SKUS.SUSPENSION_ARM, productName: "서스펜션 암", qty: 200, unitPrice: 95000 }, { productSku: SKUS.BRAKE_PAD_RR, productName: "브레이크 패드 (후방)", qty: 300, unitPrice: 39000 }]) },
    { id: "so000000-0000-4000-8000-000000000003", no: "SO-20260308-0001", cust: PARTNER.mandobrakes, custName: "만도(주)", status: "MRP_CHECKED", date: "2026-03-08", deadline: "2026-03-25",
      items: JSON.stringify([{ productSku: SKUS.BRAKE_PAD_FR, productName: "브레이크 패드 (전방)", qty: 800, unitPrice: 41000 }]) },
    { id: "so000000-0000-4000-8000-000000000004", no: "SO-20260310-0001", cust: PARTNER.sltAutoparts, custName: "SL오토파츠", status: "RECEIVED", date: "2026-03-10", deadline: "2026-03-28",
      items: JSON.stringify([{ productSku: SKUS.AIR_FILTER, productName: "에어필터", qty: 2000, unitPrice: 14500 }, { productSku: SKUS.OIL_FILTER, productName: "오일필터", qty: 1500, unitPrice: 10500 }]) },
    { id: "so000000-0000-4000-8000-000000000005", no: "SO-20260312-0001", cust: PARTNER.hyundaiMobis, custName: "현대모비스", status: "IN_PRODUCTION", date: "2026-03-12", deadline: "2026-04-01",
      items: JSON.stringify([{ productSku: SKUS.SUSPENSION_ARM, productName: "서스펜션 암", qty: 150, unitPrice: 95000 }]) },
    { id: "so000000-0000-4000-8000-000000000006", no: "SO-20260314-0001", cust: PARTNER.kiaMotors, custName: "기아자동차 화성공장", status: "RECEIVED", date: "2026-03-14", deadline: "2026-04-05",
      items: JSON.stringify([{ productSku: SKUS.BRAKE_PAD_FR, productName: "브레이크 패드 (전방)", qty: 600, unitPrice: 42000 }, { productSku: SKUS.OIL_FILTER, productName: "오일필터", qty: 800, unitPrice: 11000 }]) },
    { id: "so000000-0000-4000-8000-000000000007", no: "SO-20260316-0001", cust: PARTNER.mandobrakes, custName: "만도(주)", status: "RECEIVED", date: "2026-03-16", deadline: "2026-04-10",
      items: JSON.stringify([{ productSku: SKUS.BRAKE_PAD_RR, productName: "브레이크 패드 (후방)", qty: 400, unitPrice: 39000 }]) },
    { id: "so000000-0000-4000-8000-000000000008", no: "SO-20260318-0001", cust: PARTNER.sltAutoparts, custName: "SL오토파츠", status: "RECEIVED", date: "2026-03-18", deadline: "2026-04-15",
      items: JSON.stringify([{ productSku: SKUS.AIR_FILTER, productName: "에어필터", qty: 3000, unitPrice: 14000 }]) },
  ];

  for (const so of salesOrders) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO sales_orders (id, site_id, order_no, customer_id, customer_name, status, order_date, delivery_deadline, items, created_at, updated_at)
      VALUES ('${so.id}', '${C.site}', '${so.no}', '${so.cust}', '${so.custName}', '${so.status}',
        '${so.date}'::date, '${so.deadline}'::date, '${so.items}'::jsonb, NOW(), NOW())
      ON CONFLICT (order_no) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `);
  }

  // MRP 결과 (수주 #3 — 만도 브레이크패드 800개)
  const mrpResults = [
    { id: "mr000000-0000-4000-8000-000000000001", soId: salesOrders[2].id, sku: SKUS.STEEL_PLATE, name: "강판 (SS400)", required: 400, stock: 800, shortage: 0, status: "CHECKED_OK" },
    { id: "mr000000-0000-4000-8000-000000000002", soId: salesOrders[2].id, sku: SKUS.FRICTION_MAT, name: "마찰재 (세라믹)", required: 240, stock: 300, shortage: 0, status: "CHECKED_OK" },
    { id: "mr000000-0000-4000-8000-000000000003", soId: salesOrders[2].id, sku: SKUS.ADHESIVE, name: "접착제 (에폭시)", required: 40, stock: 150, shortage: 0, status: "CHECKED_OK" },
    { id: "mr000000-0000-4000-8000-000000000004", soId: salesOrders[2].id, sku: SKUS.PAINT_COAT, name: "도장 코팅제", required: 16, stock: 100, shortage: 0, status: "CHECKED_OK" },
  ];
  for (const m of mrpResults) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO mrp_results (id, sales_order_id, material_sku, material_name, required_qty, current_stock, shortage_qty, reorder_triggered, status, created_at, updated_at)
      VALUES ('${m.id}', '${m.soId}', '${m.sku}', '${m.name}', ${m.required}, ${m.stock}, ${m.shortage}, false, '${m.status}', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `);
  }

  // =============================================
  // 입고 주문 (InboundOrder) — 6건
  // =============================================
  const inbounds = [
    { id: "ib000000-0000-4000-8000-000000000001", vendor: PARTNER.poscoSteel, vendorName: "포스코스틸리온", status: "STOCKED", exp: "2026-03-03", act: "2026-03-03",
      items: [{ sku: SKUS.STEEL_PLATE, name: "강판 (SS400)", eQty: 500, aQty: 500, price: 12000 }] },
    { id: "ib000000-0000-4000-8000-000000000002", vendor: PARTNER.koreaFriction, vendorName: "한국마찰소재(주)", status: "STOCKED", exp: "2026-03-05", act: "2026-03-06",
      items: [{ sku: SKUS.FRICTION_MAT, name: "마찰재 (세라믹)", eQty: 200, aQty: 200, price: 15000 }] },
    { id: "ib000000-0000-4000-8000-000000000003", vendor: PARTNER.dongaBolt, vendorName: "동아볼트산업", status: "QC_PENDING", exp: "2026-03-15", act: "2026-03-15",
      items: [{ sku: SKUS.BOLT_SET, name: "볼트 세트 (M10×50)", eQty: 5000, aQty: 4980, price: 1200 }, { sku: SKUS.GASKET, name: "가스켓 (실리콘)", eQty: 500, aQty: 500, price: 4500 }] },
    { id: "ib000000-0000-4000-8000-000000000004", vendor: PARTNER.hanhwaChemical, vendorName: "한화솔루션", status: "ARRIVED", exp: "2026-03-17", act: "2026-03-17",
      items: [{ sku: SKUS.ADHESIVE, name: "접착제 (에폭시)", eQty: 100, aQty: null, price: 22000 }, { sku: SKUS.PAINT_COAT, name: "도장 코팅제", eQty: 50, aQty: null, price: 45000 }] },
    { id: "ib000000-0000-4000-8000-000000000005", vendor: PARTNER.samjinFilter, vendorName: "삼진필터(주)", status: "IN_TRANSIT", exp: "2026-03-20", act: null,
      items: [{ sku: SKUS.FILTER_PAPER, name: "필터 원지", eQty: 3000, aQty: null, price: 3500 }] },
    { id: "ib000000-0000-4000-8000-000000000006", vendor: PARTNER.poscoSteel, vendorName: "포스코스틸리온", status: "ORDERED", exp: "2026-03-25", act: null,
      items: [{ sku: SKUS.STEEL_PLATE, name: "강판 (SS400)", eQty: 800, aQty: null, price: 11800 }, { sku: SKUS.ALUMINUM_BAR, name: "알루미늄 바 (6061)", eQty: 200, aQty: null, price: 35000 }] },
  ];

  for (const ib of inbounds) {
    const actDate = ib.act ? `'${ib.act}'::date` : "NULL";
    await prisma.$executeRawUnsafe(`
      INSERT INTO inbound_orders (id, site_id, vendor_id, vendor_name, status, expected_date, actual_date, created_at, updated_at)
      VALUES ('${ib.id}', '${C.site}', '${ib.vendor}', '${ib.vendorName}', '${ib.status}', '${ib.exp}'::date, ${actDate}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `);
    for (const item of ib.items) {
      const aQty = item.aQty !== null ? String(item.aQty) : "NULL";
      await prisma.$executeRawUnsafe(`
        INSERT INTO inbound_items (id, inbound_order_id, sku_code, item_name, expected_qty, actual_qty, unit_price, created_at, updated_at)
        VALUES (uuid_generate_v4(), '${ib.id}', '${item.sku}', '${item.name}', ${item.eQty}, ${aQty}, ${item.price}, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }
  }

  // =============================================
  // 출고 주문 (OutboundOrder) — 10건
  // =============================================
  const outbounds = [
    { id: "ob000000-0000-4000-8000-000000000001", status: "DISPATCHED", sched: "2026-03-02", disp: "2026-03-02", cust: "현대모비스", manifest: "OUT-20260302-0001", slot: "AM",
      items: [{ sku: SKUS.BRAKE_PAD_FR, name: "브레이크 패드 (전방)", qty: 200, price: 42000 }] },
    { id: "ob000000-0000-4000-8000-000000000002", status: "DISPATCHED", sched: "2026-03-05", disp: "2026-03-05", cust: "기아자동차 화성공장", manifest: "OUT-20260305-0001", slot: "PM",
      items: [{ sku: SKUS.BRAKE_PAD_RR, name: "브레이크 패드 (후방)", qty: 150, price: 39000 }, { sku: SKUS.AIR_FILTER, name: "에어필터", qty: 500, price: 15000 }] },
    { id: "ob000000-0000-4000-8000-000000000003", status: "DISPATCHED", sched: "2026-03-08", disp: "2026-03-08", cust: "만도(주)", manifest: "OUT-20260308-0001", slot: "AM",
      items: [{ sku: SKUS.BRAKE_PAD_FR, name: "브레이크 패드 (전방)", qty: 300, price: 41000 }] },
    { id: "ob000000-0000-4000-8000-000000000004", status: "DISPATCHED", sched: "2026-03-10", disp: "2026-03-10", cust: "SL오토파츠", manifest: "OUT-20260310-0001", slot: "PM",
      items: [{ sku: SKUS.OIL_FILTER, name: "오일필터", qty: 400, price: 11000 }] },
    { id: "ob000000-0000-4000-8000-000000000005", status: "PACKED", sched: "2026-03-18", disp: null, cust: "현대모비스", manifest: "OUT-20260318-0001", slot: "AM",
      items: [{ sku: SKUS.SUSPENSION_ARM, name: "서스펜션 암", qty: 100, price: 95000 }] },
    { id: "ob000000-0000-4000-8000-000000000006", status: "PICKING", sched: "2026-03-19", disp: null, cust: "기아자동차 화성공장", manifest: "OUT-20260319-0001", slot: "AM",
      items: [{ sku: SKUS.BRAKE_PAD_FR, name: "브레이크 패드 (전방)", qty: 250, price: 42000 }, { sku: SKUS.BRAKE_PAD_RR, name: "브레이크 패드 (후방)", qty: 150, price: 39000 }] },
    { id: "ob000000-0000-4000-8000-000000000007", status: "PLANNED", sched: "2026-03-20", disp: null, cust: "만도(주)", manifest: "OUT-20260320-0001", slot: "PM",
      items: [{ sku: SKUS.BRAKE_PAD_FR, name: "브레이크 패드 (전방)", qty: 400, price: 41000 }] },
    { id: "ob000000-0000-4000-8000-000000000008", status: "PLANNED", sched: "2026-03-22", disp: null, cust: "SL오토파츠", manifest: "OUT-20260322-0001", slot: "AM",
      items: [{ sku: SKUS.AIR_FILTER, name: "에어필터", qty: 1000, price: 14500 }, { sku: SKUS.OIL_FILTER, name: "오일필터", qty: 800, price: 10500 }] },
    { id: "ob000000-0000-4000-8000-000000000009", status: "PLANNED", sched: "2026-03-25", disp: null, cust: "현대모비스", manifest: "OUT-20260325-0001", slot: "PM",
      items: [{ sku: SKUS.SUSPENSION_ARM, name: "서스펜션 암", qty: 50, price: 95000 }] },
    { id: "ob000000-0000-4000-8000-000000000010", status: "PLANNED", sched: "2026-03-28", disp: null, cust: "기아자동차 화성공장", manifest: "OUT-20260328-0001", slot: "AM",
      items: [{ sku: SKUS.AIR_FILTER, name: "에어필터", qty: 2000, price: 14000 }] },
  ];

  for (const ob of outbounds) {
    const dispDate = ob.disp ? `'${ob.disp}'::date` : "NULL";
    await prisma.$executeRawUnsafe(`
      INSERT INTO outbound_orders (id, site_id, type, status, scheduled_date, dispatched_date, customer_name, manifest_number, time_slot, created_at, updated_at)
      VALUES ('${ob.id}', '${C.site}', 'PICKING', '${ob.status}', '${ob.sched}'::date, ${dispDate}, '${ob.cust}', '${ob.manifest}', '${ob.slot}', NOW(), NOW())
      ON CONFLICT (manifest_number) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `);
    for (const item of ob.items) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO outbound_items (id, outbound_order_id, sku_code, item_name, qty, unit_price, created_at, updated_at)
        VALUES (uuid_generate_v4(), '${ob.id}', '${item.sku}', '${item.name}', ${item.qty}, ${item.price}, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }
  }

  // =============================================
  // 달력 (DeliveryCalendar)
  // =============================================
  // 입고 달력
  for (const ib of inbounds) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO delivery_calendar (id, site_id, type, inbound_order_id, scheduled_date, time_slot, status, color_code, created_at, updated_at)
      VALUES (uuid_generate_v4(), '${C.site}', 'INBOUND', '${ib.id}', '${ib.exp}'::date, 'AM',
        '${ib.status === "STOCKED" ? "COMPLETED" : "SCHEDULED"}', '#3b82f6', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }
  // 출고 달력
  for (const ob of outbounds) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO delivery_calendar (id, site_id, type, outbound_order_id, scheduled_date, time_slot, status, color_code, created_at, updated_at)
      VALUES (uuid_generate_v4(), '${C.site}', 'OUTBOUND', '${ob.id}', '${ob.sched}'::date, '${ob.slot}',
        '${ob.status === "DISPATCHED" ? "COMPLETED" : "SCHEDULED"}', '#f59e0b', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =============================================
  // 전표 (Voucher) — 확정된 출고 4건 매출전표
  // =============================================
  const confirmedOutbounds = outbounds.filter(o => o.status === "DISPATCHED");
  let vNo = 1;
  for (const ob of confirmedOutbounds) {
    const voucherId = `vo000000-0000-4000-8000-${String(vNo).padStart(12, "0")}`;
    const partnerCode = ob.cust === "현대모비스" ? PARTNER.hyundaiMobis
      : ob.cust === "기아자동차 화성공장" ? PARTNER.kiaMotors
      : ob.cust === "만도(주)" ? PARTNER.mandobrakes
      : PARTNER.sltAutoparts;
    const subtotal = ob.items.reduce((s, i) => s + i.qty * i.price, 0);
    const tax = Math.round(subtotal * 0.1);
    const voucherNo = `SV-2026${ob.sched.slice(5, 7)}${ob.sched.slice(8, 10)}-${String(vNo).padStart(4, "0")}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO vouchers (id, site_id, type, voucher_no, partner_id, status, voucher_date, subtotal, tax_amount, total_amount, confirmed_at, created_at, updated_at)
      VALUES ('${voucherId}', '${C.site}', 'SALES', '${voucherNo}', '${partnerCode}', 'CONFIRMED',
        '${ob.sched}'::date, ${subtotal}, ${tax}, ${subtotal + tax}, NOW(), NOW(), NOW())
      ON CONFLICT (voucher_no) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `);
    let lineNo = 1;
    for (const item of ob.items) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO voucher_lines (id, voucher_id, line_no, sku, item_name, qty, unit_price, amount, tax_amount, created_at)
        VALUES (uuid_generate_v4(), '${voucherId}', ${lineNo++}, '${item.sku}', '${item.name}', ${item.qty}, ${item.price}, ${item.qty * item.price}, ${Math.round(item.qty * item.price * 0.1)}, NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }
    vNo++;
  }

  console.log(`  ✓ mock-orders (수주 ${salesOrders.length}, 입고 ${inbounds.length}, 출고 ${outbounds.length}, 달력 ${inbounds.length + outbounds.length}, 전표 ${confirmedOutbounds.length})`);
}
