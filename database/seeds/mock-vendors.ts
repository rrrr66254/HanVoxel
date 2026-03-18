/**
 * Mock 시드 — 공급업체(Supplier) 5개 + 거래처(Partner) 5공급+4고객 = 9개
 * 시나리오: 한국자동차부품(주) 거래선
 */

import { PrismaClient } from "@prisma/client";
import { IDS as C } from "./mock-company";

// Partner ID (다른 시드에서 참조)
export const PARTNER = {
  // 공급업체
  poscoSteel: "aa000000-0000-4000-8000-000000000001",
  koreaFriction: "aa000000-0000-4000-8000-000000000002",
  dongaBolt: "aa000000-0000-4000-8000-000000000003",
  hanhwaChemical: "aa000000-0000-4000-8000-000000000004",
  samjinFilter: "aa000000-0000-4000-8000-000000000005",
  // 고객사
  hyundaiMobis: "ab000000-0000-4000-8000-000000000001",
  kiaMotors: "ab000000-0000-4000-8000-000000000002",
  mandobrakes: "ab000000-0000-4000-8000-000000000003",
  sltAutoparts: "ab000000-0000-4000-8000-000000000004",
};

// Supplier ID (QC 연동용)
export const SUPPLIER = {
  poscoSteel: "ac000000-0000-4000-8000-000000000001",
  koreaFriction: "ac000000-0000-4000-8000-000000000002",
  dongaBolt: "ac000000-0000-4000-8000-000000000003",
  hanhwaChemical: "ac000000-0000-4000-8000-000000000004",
  samjinFilter: "ac000000-0000-4000-8000-000000000005",
};

export async function seedMockVendors(prisma: PrismaClient): Promise<void> {
  // --- Supplier (QC 연동용) ---
  const suppliers = [
    { id: SUPPLIER.poscoSteel, code: "SUP-001", name: "포스코스틸리온", grade: "A", score: 95, contact: "김철강", email: "steel@posco.co.kr" },
    { id: SUPPLIER.koreaFriction, code: "SUP-002", name: "한국마찰소재(주)", grade: "A", score: 92, contact: "이마찰", email: "info@kfriction.co.kr" },
    { id: SUPPLIER.dongaBolt, code: "SUP-003", name: "동아볼트산업", grade: "B", score: 85, contact: "박볼트", email: "order@dongabolt.co.kr" },
    { id: SUPPLIER.hanhwaChemical, code: "SUP-004", name: "한화솔루션", grade: "A", score: 91, contact: "최화학", email: "chem@hanwha.com" },
    { id: SUPPLIER.samjinFilter, code: "SUP-005", name: "삼진필터(주)", grade: "B", score: 83, contact: "정필터", email: "filter@samjin.co.kr" },
  ];
  for (const s of suppliers) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO suppliers (id, company_id, name, code, contact, email, grade, quality_score, is_active, created_at, updated_at)
      VALUES ('${s.id}', '${C.company}', '${s.name}', '${s.code}', '${s.contact}', '${s.email}', '${s.grade}', ${s.score}, true, NOW(), NOW())
      ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name, grade = EXCLUDED.grade, quality_score = EXCLUDED.quality_score, updated_at = NOW()
    `);
  }

  // --- Partner (ERP 거래처) ---
  const partners = [
    // 공급업체
    { id: PARTNER.poscoSteel, type: "SUPPLIER", code: "P-SUP-001", name: "포스코스틸리온", bizNo: "123-45-67890", ceo: "김포스코", bizType: "제조업", bizCat: "철강", phone: "031-380-1234", email: "steel@posco.co.kr", terms: "NET30" },
    { id: PARTNER.koreaFriction, type: "SUPPLIER", code: "P-SUP-002", name: "한국마찰소재(주)", bizNo: "234-56-78901", ceo: "이마찰", bizType: "제조업", bizCat: "화학소재", phone: "032-890-5678", email: "info@kfriction.co.kr", terms: "NET30" },
    { id: PARTNER.dongaBolt, type: "SUPPLIER", code: "P-SUP-003", name: "동아볼트산업", bizNo: "345-67-89012", ceo: "박볼트", bizType: "제조업", bizCat: "금속가공", phone: "054-270-1234", email: "order@dongabolt.co.kr", terms: "NET15" },
    { id: PARTNER.hanhwaChemical, type: "SUPPLIER", code: "P-SUP-004", name: "한화솔루션", bizNo: "456-78-90123", ceo: "최한화", bizType: "제조업", bizCat: "화학", phone: "02-729-5678", email: "chem@hanwha.com", terms: "NET30" },
    { id: PARTNER.samjinFilter, type: "SUPPLIER", code: "P-SUP-005", name: "삼진필터(주)", bizNo: "567-89-01234", ceo: "정필터", bizType: "제조업", bizCat: "필터제조", phone: "031-670-3456", email: "filter@samjin.co.kr", terms: "NET15" },
    // 고객사
    { id: PARTNER.hyundaiMobis, type: "CUSTOMER", code: "P-CUS-001", name: "현대모비스", bizNo: "111-11-11111", ceo: "정현대", bizType: "제조업", bizCat: "자동차부품", phone: "02-2018-5000", email: "purchase@mobis.co.kr", terms: "NET45" },
    { id: PARTNER.kiaMotors, type: "CUSTOMER", code: "P-CUS-002", name: "기아자동차 화성공장", bizNo: "222-22-22222", ceo: "송기아", bizType: "제조업", bizCat: "자동차", phone: "031-260-1234", email: "parts@kia.co.kr", terms: "NET45" },
    { id: PARTNER.mandobrakes, type: "CUSTOMER", code: "P-CUS-003", name: "만도(주)", bizNo: "333-33-33333", ceo: "조만도", bizType: "제조업", bizCat: "자동차부품", phone: "031-8069-1234", email: "scm@mando.com", terms: "NET30" },
    { id: PARTNER.sltAutoparts, type: "CUSTOMER", code: "P-CUS-004", name: "SL오토파츠", bizNo: "444-44-44444", ceo: "한에스엘", bizType: "제조업", bizCat: "자동차부품", phone: "031-490-5678", email: "order@slauto.co.kr", terms: "NET30" },
  ];
  for (const p of partners) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO partners (id, company_id, type, code, name, biz_no, ceo_name, biz_type, biz_category, phone, email, payment_terms, is_active, created_at, updated_at)
      VALUES ('${p.id}', '${C.company}', '${p.type}', '${p.code}', '${p.name}',
        '${p.bizNo}', '${p.ceo}', '${p.bizType}', '${p.bizCat}', '${p.phone}', '${p.email}', '${p.terms}',
        true, NOW(), NOW())
      ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    `);
  }

  console.log(`  ✓ mock-vendors (공급업체 ${suppliers.length}, 거래처 ${partners.length})`);
}
