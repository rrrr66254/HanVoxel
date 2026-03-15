// database/.env 파일에서 DATABASE_URL 로드
import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// .env 파일 명시적 경로 지정 (Windows 호환)
dotenv.config({ path: path.resolve(__dirname, ".env") });

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
