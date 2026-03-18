/**
 * Mock 시드 — 공간 객체 타입 / 공간 객체 (랙 12, 팔레트 위치 20, 존 3) / 계층
 * 시나리오: 화성 본사 창고 (50m × 30m × 8m)
 */

import { PrismaClient } from "@prisma/client";
import { IDS as C } from "./mock-company";

// 공간 객체 타입 ID
export const TYPE_IDS = {
  site: "f1000000-0000-4000-8000-000000000001",
  building: "f1000000-0000-4000-8000-000000000002",
  floor: "f1000000-0000-4000-8000-000000000003",
  zone: "f1000000-0000-4000-8000-000000000004",
  aisle: "f1000000-0000-4000-8000-000000000005",
  rack: "f1000000-0000-4000-8000-000000000006",
  bin: "f1000000-0000-4000-8000-000000000007",
};

// 공간 객체 ID — 다른 시드에서 참조
export const SP = {
  building: "f2000000-0000-4000-8000-000000000001",
  floor1: "f2000000-0000-4000-8000-000000000002",
  // 존
  zoneA: "f2000000-0000-4000-8000-000000000010", // 완제품 보관
  zoneB: "f2000000-0000-4000-8000-000000000011", // 원자재 보관
  zoneC: "f2000000-0000-4000-8000-000000000012", // 출하 대기
  // 랙 A존 (완제품) 6개
  rackA01: "f2000000-0000-4000-8000-000000000101",
  rackA02: "f2000000-0000-4000-8000-000000000102",
  rackA03: "f2000000-0000-4000-8000-000000000103",
  rackA04: "f2000000-0000-4000-8000-000000000104",
  rackA05: "f2000000-0000-4000-8000-000000000105",
  rackA06: "f2000000-0000-4000-8000-000000000106",
  // 랙 B존 (원자재) 6개
  rackB01: "f2000000-0000-4000-8000-000000000201",
  rackB02: "f2000000-0000-4000-8000-000000000202",
  rackB03: "f2000000-0000-4000-8000-000000000203",
  rackB04: "f2000000-0000-4000-8000-000000000204",
  rackB05: "f2000000-0000-4000-8000-000000000205",
  rackB06: "f2000000-0000-4000-8000-000000000206",
};

// BIN ID (각 랙당 3~4단, 대표적인 것들)
export const BINS: Record<string, string> = {};
let binCounter = 1;
function binId(): string {
  const id = `f3000000-0000-4000-8000-${String(binCounter++).padStart(12, "0")}`;
  return id;
}

export async function seedMockWarehouse(prisma: PrismaClient): Promise<void> {
  // --- 공간 객체 타입 ---
  const types = [
    { id: TYPE_IDS.site, name: "SITE", label: "사이트", depth: 0 },
    { id: TYPE_IDS.building, name: "BUILDING", label: "건물", depth: 1 },
    { id: TYPE_IDS.floor, name: "FLOOR", label: "층", depth: 2 },
    { id: TYPE_IDS.zone, name: "ZONE", label: "구역", depth: 3 },
    { id: TYPE_IDS.aisle, name: "AISLE", label: "통로", depth: 4 },
    { id: TYPE_IDS.rack, name: "RACK", label: "랙", depth: 4 },
    { id: TYPE_IDS.bin, name: "BIN", label: "적재 위치", depth: 5 },
  ];
  for (const t of types) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO spatial_object_types (id, name, label, depth, created_at, updated_at)
      VALUES ('${t.id}', '${t.name}', '${t.label}', ${t.depth}, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET label = EXCLUDED.label, updated_at = NOW()
    `);
  }

  // 헬퍼: 공간 객체 upsert
  async function upsertSO(
    id: string, typeId: string, name: string, code: string,
    px: number, py: number, pz: number,
    sx: number, sy: number, sz: number,
    color: string, meta?: string
  ): Promise<void> {
    const metaVal = meta ? `'${meta}'` : "NULL";
    await prisma.$executeRawUnsafe(`
      INSERT INTO spatial_objects
        (id, site_id, type_id, name, code, status, is_active,
         position_x, position_y, position_z, rotation_x, rotation_y, rotation_z,
         scale_x, scale_y, scale_z, color, opacity, visible, mesh_type, metadata, created_at, updated_at)
      VALUES
        ('${id}', '${C.site}', '${typeId}', '${name}', '${code}', 'ACTIVE', true,
         ${px}, ${py}, ${pz}, 0, 0, 0,
         ${sx}, ${sy}, ${sz}, '${color}', 1.0, true, 'box', ${metaVal}, NOW(), NOW())
      ON CONFLICT (site_id, code) DO UPDATE SET
        name = EXCLUDED.name, position_x = EXCLUDED.position_x, position_y = EXCLUDED.position_y,
        position_z = EXCLUDED.position_z, scale_x = EXCLUDED.scale_x, scale_y = EXCLUDED.scale_y,
        scale_z = EXCLUDED.scale_z, updated_at = NOW()
    `);
  }

  // 헬퍼: 계층 upsert
  async function link(parentId: string, childId: string, sort: number): Promise<void> {
    await prisma.$executeRawUnsafe(`
      INSERT INTO spatial_hierarchies (id, parent_id, child_id, sort_order, created_at)
      VALUES (uuid_generate_v4(), '${parentId}', '${childId}', ${sort}, NOW())
      ON CONFLICT (parent_id, child_id) DO NOTHING
    `);
  }

  // --- 건물 + 층 ---
  await upsertSO(SP.building, TYPE_IDS.building, "본관 창고", "BLD-01", 25, 0, 15, 50, 8, 30, "#94a3b8");
  await upsertSO(SP.floor1, TYPE_IDS.floor, "1층", "F1", 25, 0, 15, 50, 0.1, 30, "#e2e8f0");

  // --- 존 ---
  await upsertSO(SP.zoneA, TYPE_IDS.zone, "A존 (완제품)", "ZONE-A", 12, 0, 10, 20, 6, 15, "#3b82f6",
    '{"purpose":"완제품 보관","temperature":"상온"}');
  await upsertSO(SP.zoneB, TYPE_IDS.zone, "B존 (원자재)", "ZONE-B", 37, 0, 10, 20, 6, 15, "#f59e0b",
    '{"purpose":"원자재 보관","temperature":"상온"}');
  await upsertSO(SP.zoneC, TYPE_IDS.zone, "C존 (출하대기)", "ZONE-C", 25, 0, 27, 20, 4, 5, "#10b981",
    '{"purpose":"출하 대기 구역"}');

  // --- 랙 (A존 6개 + B존 6개 = 12개) ---
  // A존 랙 (국내 대형 랙: 2.7m W × 1.1m D × 6.0m H, 4단)
  const rackAIds = [SP.rackA01, SP.rackA02, SP.rackA03, SP.rackA04, SP.rackA05, SP.rackA06];
  for (let i = 0; i < 6; i++) {
    const x = 4 + i * 3.5;
    await upsertSO(rackAIds[i], TYPE_IDS.rack, `A-${String(i + 1).padStart(2, "0")}`, `RACK-A${String(i + 1).padStart(2, "0")}`,
      x, 0, 8, 2.7, 6.0, 1.1, "#f59e0b",
      '{"levels":4,"levelHeight":1.4,"loadPerLevel":1500,"presetCode":"RACK_KR_LARGE"}');
  }

  // B존 랙 (국내 중량형 랙: 2.7m W × 1.35m D × 6.0m H, 4단)
  const rackBIds = [SP.rackB01, SP.rackB02, SP.rackB03, SP.rackB04, SP.rackB05, SP.rackB06];
  for (let i = 0; i < 6; i++) {
    const x = 29 + i * 3.5;
    await upsertSO(rackBIds[i], TYPE_IDS.rack, `B-${String(i + 1).padStart(2, "0")}`, `RACK-B${String(i + 1).padStart(2, "0")}`,
      x, 0, 8, 2.7, 6.0, 1.35, "#d97706",
      '{"levels":4,"levelHeight":1.4,"loadPerLevel":2000,"presetCode":"RACK_KR_HEAVY"}');
  }

  // --- BIN (각 랙 4단 × 2열 = 8 BIN/랙, 총 96 BIN) ---
  const allRackIds = [...rackAIds, ...rackBIds];
  const allRackCodes = [
    ...Array.from({ length: 6 }, (_, i) => `A-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 6 }, (_, i) => `B-${String(i + 1).padStart(2, "0")}`),
  ];

  for (let r = 0; r < allRackIds.length; r++) {
    for (let level = 1; level <= 4; level++) {
      for (let col = 1; col <= 2; col++) {
        const bid = binId();
        const code = `${allRackCodes[r]}-L${level}C${col}`;
        BINS[code] = bid;
        const posY = (level - 1) * 1.4;
        await upsertSO(bid, TYPE_IDS.bin, code, code, 0, posY, 0, 1.2, 1.2, 1.1, "#a3e635",
          `{"rackCode":"${allRackCodes[r]}","level":${level},"column":${col}}`);
        await link(allRackIds[r], bid, level * 10 + col);
      }
    }
  }

  // --- 계층 링크 ---
  await link(SP.building, SP.floor1, 1);
  await link(SP.floor1, SP.zoneA, 1);
  await link(SP.floor1, SP.zoneB, 2);
  await link(SP.floor1, SP.zoneC, 3);
  for (let i = 0; i < 6; i++) {
    await link(SP.zoneA, rackAIds[i], i + 1);
    await link(SP.zoneB, rackBIds[i], i + 1);
  }

  console.log(`  ✓ mock-warehouse (건물 1, 층 1, 존 3, 랙 12, BIN ${Object.keys(BINS).length})`);
}
