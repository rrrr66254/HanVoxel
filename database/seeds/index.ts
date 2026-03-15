/**
 * HanVoxel — 시드 데이터 실행 엔트리포인트
 * prisma db seed 실행 시 이 파일이 호출된다.
 *
 * 실행 순서:
 * 1. spatial-presets.sql (프리셋 카테고리 + 랙/팔레트/컨테이너/통로/제품박스)
 * 2. saas-plans.sql (SaaS 요금제)
 * 3. hs-code-master.ts (HS 코드 마스터 데이터)
 */

import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { HS_CODE_MASTER_SEEDS, generateInsertSql } from "./hs-code-master";

// .env 로드 (seed 단독 실행 시에도 DATABASE_URL 확보)
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env["DATABASE_URL"] } },
});

async function runSqlFile(filePath: string): Promise<void> {
  const absolutePath = path.resolve(__dirname, filePath);
  const sql = fs.readFileSync(absolutePath, "utf-8");
  await prisma.$executeRawUnsafe(sql);
  console.log(`  ✓ ${path.basename(filePath)}`);
}

async function main(): Promise<void> {
  console.log("🌱 HanVoxel 시드 데이터 삽입 시작...\n");

  // 1. 프리셋 카테고리 + 공간 프리셋
  await runSqlFile("spatial-presets.sql");

  // 2. SaaS 요금제
  await runSqlFile("saas-plans.sql");

  // 3. HS 코드 마스터
  const hsCodeSql = generateInsertSql(HS_CODE_MASTER_SEEDS);
  await prisma.$executeRawUnsafe(hsCodeSql);
  console.log(`  ✓ hs-code-master (${HS_CODE_MASTER_SEEDS.length}개)`);

  console.log("\n✅ 시드 데이터 삽입 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 시드 실행 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
