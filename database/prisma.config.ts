// database/.env 파일에서 DATABASE_URL 로드 (로그 출력 없음)
import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// .env 파일 명시적 경로 지정 (Windows 호환, quiet: stdout 오염 방지)
dotenv.config({ path: path.resolve(__dirname, ".env"), debug: false });
process.env["DOTENV_CONFIG_QUIET"] = "true";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node --compiler-options {\"module\":\"CommonJS\"} seeds/index.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
