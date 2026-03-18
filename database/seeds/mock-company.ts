/**
 * Mock 시드 — 회사 / 사이트 / 사용자 / 역할 / 권한
 * 시나리오: 한국자동차부품(주) — 중견 자동차 부품 제조업체
 */

import { PrismaClient } from "@prisma/client";

// 고정 UUID (다른 시드에서 참조)
export const IDS = {
  company: "a0000000-0000-4000-8000-000000000001",
  site: "b0000000-0000-4000-8000-000000000001",
  // 사용자
  userAdmin: "c0000000-0000-4000-8000-000000000001",
  userManager: "c0000000-0000-4000-8000-000000000002",
  userWorker1: "c0000000-0000-4000-8000-000000000003",
  userWorker2: "c0000000-0000-4000-8000-000000000004",
  userQc: "c0000000-0000-4000-8000-000000000005",
  // 역할
  roleAdmin: "d0000000-0000-4000-8000-000000000001",
  roleManager: "d0000000-0000-4000-8000-000000000002",
  roleWorker: "d0000000-0000-4000-8000-000000000003",
  roleQc: "d0000000-0000-4000-8000-000000000004",
  // 권한
  permAll: "e0000000-0000-4000-8000-000000000001",
  permInventory: "e0000000-0000-4000-8000-000000000002",
  permPicking: "e0000000-0000-4000-8000-000000000003",
  permQc: "e0000000-0000-4000-8000-000000000004",
  permReport: "e0000000-0000-4000-8000-000000000005",
};

export async function seedMockCompany(prisma: PrismaClient): Promise<void> {
  // --- 회사 ---
  await prisma.$executeRawUnsafe(`
    INSERT INTO companies (id, name, code, is_active, industry, company_size, plan_type, subscription_status, billing_interval, created_at, updated_at)
    VALUES (
      '${IDS.company}', '한국자동차부품(주)', 'KAPC', true,
      'AUTO_PARTS', 'MEDIUM', 'GROWTH', 'active', 'monthly',
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
  `);

  // --- 사이트 ---
  await prisma.$executeRawUnsafe(`
    INSERT INTO sites (id, company_id, name, code, address, latitude, longitude, timezone, is_active, created_at, updated_at)
    VALUES (
      '${IDS.site}', '${IDS.company}',
      '화성 본사 창고', 'HS-WH01',
      '경기도 화성시 동탄산업단지로 123', 37.2009, 127.0747,
      'Asia/Seoul', true, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
  `);

  // --- 역할 ---
  const roles = [
    { id: IDS.roleAdmin, name: "ADMIN", description: "시스템 관리자" },
    { id: IDS.roleManager, name: "MANAGER", description: "창고 관리자" },
    { id: IDS.roleWorker, name: "WORKER", description: "현장 작업자" },
    { id: IDS.roleQc, name: "QC_INSPECTOR", description: "품질 검수원" },
  ];
  for (const r of roles) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO roles (id, name, description, created_at, updated_at)
      VALUES ('${r.id}', '${r.name}', '${r.description}', NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()
    `);
  }

  // --- 권한 ---
  const perms = [
    { id: IDS.permAll, resource: "*", action: "*", description: "전체 접근" },
    { id: IDS.permInventory, resource: "inventory", action: "manage", description: "재고 관리" },
    { id: IDS.permPicking, resource: "picking", action: "execute", description: "피킹 작업" },
    { id: IDS.permQc, resource: "qc", action: "inspect", description: "품질 검수" },
    { id: IDS.permReport, resource: "report", action: "view", description: "리포트 조회" },
  ];
  for (const p of perms) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO permissions (id, resource, action, description, created_at, updated_at)
      VALUES ('${p.id}', '${p.resource}', '${p.action}', '${p.description}', NOW(), NOW())
      ON CONFLICT (resource, action) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()
    `);
  }

  // --- 역할-권한 매핑 ---
  const rolePerm = [
    { role: IDS.roleAdmin, perm: IDS.permAll },
    { role: IDS.roleManager, perm: IDS.permInventory },
    { role: IDS.roleManager, perm: IDS.permReport },
    { role: IDS.roleWorker, perm: IDS.permPicking },
    { role: IDS.roleQc, perm: IDS.permQc },
  ];
  for (const rp of rolePerm) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO role_permissions (id, role_id, permission_id, created_at)
      VALUES (uuid_generate_v4(), '${rp.role}', '${rp.perm}', NOW())
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
  }

  // --- 사용자 ---
  // bcrypt 해시 (password = "test1234")
  const pwHash = "$2b$10$dummyHashForMockSeedDataOnly0000000000000000000000";
  const users = [
    { id: IDS.userAdmin, email: "admin@kapc.co.kr", name: "김관리", role: IDS.roleAdmin },
    { id: IDS.userManager, email: "manager@kapc.co.kr", name: "이창고", role: IDS.roleManager },
    { id: IDS.userWorker1, email: "worker1@kapc.co.kr", name: "박현장", role: IDS.roleWorker },
    { id: IDS.userWorker2, email: "worker2@kapc.co.kr", name: "최작업", role: IDS.roleWorker },
    { id: IDS.userQc, email: "qc@kapc.co.kr", name: "정검수", role: IDS.roleQc },
  ];
  for (const u of users) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO users (id, company_id, email, password_hash, name, is_active, created_at, updated_at)
      VALUES ('${u.id}', '${IDS.company}', '${u.email}', '${pwHash}', '${u.name}', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO user_roles (id, user_id, role_id, created_at)
      VALUES (uuid_generate_v4(), '${u.id}', '${u.role}', NOW())
      ON CONFLICT (user_id, role_id) DO NOTHING
    `);
  }

  console.log("  ✓ mock-company (회사 1, 사이트 1, 사용자 5, 역할 4)");
}
