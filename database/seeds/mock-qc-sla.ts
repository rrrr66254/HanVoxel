/**
 * Mock 시드 — SLA 타겟/메트릭/위반 + QC 검수 + 알림(Alert)
 * 시나리오: 최근 30일 운영 데이터
 */

import { PrismaClient } from "@prisma/client";
import { IDS as C } from "./mock-company";
import { SUPPLIER } from "./mock-vendors";

const SLA_TARGET_ID = "f4000000-0000-4000-8000-000000000001";

export async function seedMockQcSla(prisma: PrismaClient): Promise<void> {
  // =============================================
  // SLA 타겟
  // =============================================
  await prisma.$executeRawUnsafe(`
    INSERT INTO sla_targets (id, company_id, site_id, name,
      delivery_on_time_target, misshipment_rate_limit, picking_accuracy_target, avg_processing_time_limit,
      escalation_enabled, escalation_emails, escalation_threshold,
      is_active, created_at, updated_at)
    VALUES ('${SLA_TARGET_ID}', '${C.company}', '${C.site}', '2026 Q1 SLA 기준',
      98.0, 0.5, 99.5, 120,
      true, '["manager@kapc.co.kr","admin@kapc.co.kr"]'::jsonb, 3,
      true, NOW(), NOW())
    ON CONFLICT (company_id, site_id) DO UPDATE SET
      name = EXCLUDED.name, delivery_on_time_target = EXCLUDED.delivery_on_time_target, updated_at = NOW()
  `);

  // =============================================
  // SLA 메트릭 (최근 30일 일별)
  // =============================================
  for (let d = 30; d >= 1; d--) {
    // 결정적 변동 생성
    const seed = d * 13 + 7;
    const variance = ((seed % 11) - 5) / 100; // -0.05 ~ +0.05

    const deliveryRate = Math.min(100, Math.max(90, 97.5 + variance * 100));
    const misship = Math.max(0, 0.3 + (((seed * 3) % 7) - 3) / 20);
    const pickAcc = Math.min(100, Math.max(97, 99.6 + variance * 50));
    const avgTime = Math.max(60, 95 + ((seed % 13) - 6) * 5);
    const totalOrders = 25 + (seed % 15);
    const onTime = Math.round(totalOrders * deliveryRate / 100);
    const misCount = Math.round(totalOrders * misship / 100);
    const totalPicks = totalOrders * 4;
    const accPicks = Math.round(totalPicks * pickAcc / 100);

    await prisma.$executeRawUnsafe(`
      INSERT INTO sla_metrics (id, sla_target_id, record_date,
        delivery_on_time_rate, misshipment_rate, picking_accuracy, avg_processing_time,
        total_orders, on_time_orders, misshipment_count, total_picks, accurate_picks,
        created_at)
      VALUES (uuid_generate_v4(), '${SLA_TARGET_ID}', (CURRENT_DATE - INTERVAL '${d} days')::date,
        ${deliveryRate.toFixed(2)}, ${misship.toFixed(2)}, ${pickAcc.toFixed(2)}, ${avgTime.toFixed(1)},
        ${totalOrders}, ${onTime}, ${misCount}, ${totalPicks}, ${accPicks},
        NOW())
      ON CONFLICT (sla_target_id, record_date) DO UPDATE SET
        delivery_on_time_rate = EXCLUDED.delivery_on_time_rate
    `);
  }

  // =============================================
  // SLA 위반 (5건)
  // =============================================
  const violations = [
    { metric: "delivery_on_time", target: 98.0, actual: 92.3, date: "2026-03-02", sev: "critical", esc: true },
    { metric: "misshipment_rate", target: 0.5, actual: 1.2, date: "2026-03-05", sev: "warning", esc: false },
    { metric: "avg_processing_time", target: 120, actual: 145, date: "2026-03-08", sev: "warning", esc: false },
    { metric: "picking_accuracy", target: 99.5, actual: 98.1, date: "2026-03-12", sev: "critical", esc: true },
    { metric: "delivery_on_time", target: 98.0, actual: 95.0, date: "2026-03-15", sev: "warning", esc: false },
  ];
  for (const v of violations) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO sla_violations (id, sla_target_id, metric_name, target_value, actual_value,
        violation_date, severity, escalated, created_at)
      VALUES (uuid_generate_v4(), '${SLA_TARGET_ID}', '${v.metric}', ${v.target}, ${v.actual},
        '${v.date}'::date, '${v.sev}', ${v.esc}, NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =============================================
  // QC 검수 (8건 — 입고 6 + 출고 2)
  // =============================================
  const inspections = [
    { id: "f5000000-0000-4000-8000-000000000001", sup: SUPPLIER.poscoSteel, type: "INBOUND", status: "COMPLETED", total: 500, pass: 498, defect: 2, rate: 0.4, ref: "IB-001", inspector: "정검수", date: "2026-03-03" },
    { id: "f5000000-0000-4000-8000-000000000002", sup: SUPPLIER.koreaFriction, type: "INBOUND", status: "COMPLETED", total: 200, pass: 200, defect: 0, rate: 0, ref: "IB-002", inspector: "정검수", date: "2026-03-06" },
    { id: "f5000000-0000-4000-8000-000000000003", sup: SUPPLIER.dongaBolt, type: "INBOUND", status: "IN_PROGRESS", total: 5500, pass: 3200, defect: 15, rate: 0.47, ref: "IB-003", inspector: "정검수", date: "2026-03-15" },
    { id: "f5000000-0000-4000-8000-000000000004", sup: SUPPLIER.hanhwaChemical, type: "INBOUND", status: "PENDING", total: 150, pass: 0, defect: 0, rate: 0, ref: "IB-004", inspector: null, date: null },
    { id: "f5000000-0000-4000-8000-000000000005", sup: SUPPLIER.samjinFilter, type: "INBOUND", status: "PENDING", total: 3000, pass: 0, defect: 0, rate: 0, ref: "IB-005", inspector: null, date: null },
    { id: "f5000000-0000-4000-8000-000000000006", sup: SUPPLIER.poscoSteel, type: "INBOUND", status: "COMPLETED", total: 300, pass: 297, defect: 3, rate: 1.0, ref: "IB-006-prev", inspector: "정검수", date: "2026-02-20" },
    // 출고 검수
    { id: "f5000000-0000-4000-8000-000000000007", sup: null, type: "OUTBOUND", status: "COMPLETED", total: 200, pass: 200, defect: 0, rate: 0, ref: "OB-001", inspector: "정검수", date: "2026-03-02" },
    { id: "f5000000-0000-4000-8000-000000000008", sup: null, type: "OUTBOUND", status: "COMPLETED", total: 650, pass: 649, defect: 1, rate: 0.15, ref: "OB-002", inspector: "정검수", date: "2026-03-05" },
  ];

  for (const q of inspections) {
    const supId = q.sup ? `'${q.sup}'` : "NULL";
    const inspDate = q.date ? `'${q.date} 14:00:00+09'::timestamptz` : "NULL";
    const inspName = q.inspector ? `'${q.inspector}'` : "NULL";
    await prisma.$executeRawUnsafe(`
      INSERT INTO qc_inspections (id, site_id, supplier_id, type, status, total_qty, passed_qty, defect_qty, defect_rate,
        reference_no, inspector_name, inspected_at, created_at, updated_at)
      VALUES ('${q.id}', '${C.site}', ${supId}, '${q.type}', '${q.status}', ${q.total}, ${q.pass}, ${q.defect}, ${q.rate},
        '${q.ref}', ${inspName}, ${inspDate}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `);
  }

  // QC 불량 항목
  const defects = [
    { insp: inspections[0].id, type: "DAMAGED", qty: 2, sku: "RM-ST-001", name: "강판 (SS400)", disp: "RETURNED" },
    { insp: inspections[2].id, type: "WRONG_QTY", qty: 10, sku: "RM-BS-001", name: "볼트 세트 (M10×50)", disp: "QUARANTINED" },
    { insp: inspections[2].id, type: "DAMAGED", qty: 5, sku: "RM-GK-001", name: "가스켓 (실리콘)", disp: "QUARANTINED" },
    { insp: inspections[5].id, type: "CONTAMINATED", qty: 3, sku: "RM-ST-001", name: "강판 (SS400)", disp: "DISPOSED" },
    { insp: inspections[7].id, type: "PACKAGING", qty: 1, sku: "FP-AF-001", name: "에어필터", disp: "REWORKED" },
  ];
  for (const df of defects) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO qc_defect_items (id, inspection_id, defect_type, qty, item_sku, item_name, disposition, created_at)
      VALUES (uuid_generate_v4(), '${df.insp}', '${df.type}', ${df.qty}, '${df.sku}', '${df.name}', '${df.disp}', NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =============================================
  // 알림 (Alert) — 5건 활성
  // =============================================
  const alerts = [
    { type: "inventory_level", sev: "critical", title: "마찰재 재고 부족 경고", msg: "마찰재 (세라믹) 현재 재고 300kg — 안전재고(350kg) 이하. 한국마찰소재에 긴급 발주 필요.", count: 1, read: false, date: "2026-03-17 09:30:00+09" },
    { type: "picking_error_rate", sev: "warning", title: "피킹 오류율 상승", msg: "최근 3일간 피킹 오류율 1.8% — 목표(0.5%) 대비 3.6배 높음. B존 원자재 바코드 확인 필요.", count: 3, read: false, date: "2026-03-16 14:20:00+09" },
    { type: "sla_violation", sev: "critical", title: "납기 준수율 SLA 위반", msg: "금일 납기 준수율 92.3% — 목표 98.0% 미달. 만도(주) 납품건 지연 발생.", count: 1, read: true, date: "2026-03-15 17:00:00+09" },
    { type: "inventory_level", sev: "warning", title: "도장 코팅제 재고 낮음", msg: "도장 코팅제 현재 100L — 2주 소진 예상. 한화솔루션 입고 예정일(3/17) 확인.", count: 1, read: false, date: "2026-03-14 11:45:00+09" },
    { type: "quality_issue", sev: "warning", title: "동아볼트 QC 불량 발생", msg: "동아볼트산업 입고건(IB-003) 검수 중 15건 불량 발견. 볼트 수량 불일치 10건 + 가스켓 파손 5건.", count: 15, read: false, date: "2026-03-15 15:30:00+09" },
  ];
  for (const a of alerts) {
    const msgEsc = a.msg.replace(/'/g, "''");
    const titleEsc = a.title.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`
      INSERT INTO alerts (id, site_id, metric_type, severity, title, message, anomaly_count, is_read, detected_at, created_at)
      VALUES (uuid_generate_v4(), '${C.site}', '${a.type}', '${a.sev}', '${titleEsc}', '${msgEsc}', ${a.count}, ${a.read}, '${a.date}'::timestamptz, NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  console.log(`  ✓ mock-qc-sla (SLA 타겟 1, 메트릭 30일, 위반 ${violations.length}, QC ${inspections.length}, 불량 ${defects.length}, 알림 ${alerts.length})`);
}
