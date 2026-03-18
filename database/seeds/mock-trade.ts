/**
 * Mock 시드 — HS 코드 무역 인텔리전스 (watch + trade cache + search log + coverage)
 * 시나리오: 자동차 부품 관련 HS 코드 모니터링
 */

import { PrismaClient } from "@prisma/client";
import { IDS as C } from "./mock-company";

export async function seedMockTrade(prisma: PrismaClient): Promise<void> {
  // =============================================
  // HS 코드 즐겨찾기 (HsCodeWatch) — 6건
  // =============================================
  const watches = [
    { hs: "870830", desc: "브레이크·서보브레이크의 부분품", descEn: "Parts of brakes and servo-brakes", main: true },
    { hs: "870899", desc: "자동차 부분품 기타", descEn: "Other parts and accessories of motor vehicles", main: true },
    { hs: "842123", desc: "오일필터 또는 연료필터", descEn: "Oil or fuel filters for internal combustion engines", main: false },
    { hs: "842131", desc: "내연기관용 흡기 에어필터", descEn: "Intake air filters for internal combustion engines", main: true },
    { hs: "730890", desc: "철강 구조물 및 부분품", descEn: "Structures and parts of structures of iron or steel", main: false },
    { hs: "760120", desc: "알루미늄 합금 괴", descEn: "Aluminum alloys, unwrought", main: false },
  ];
  for (const w of watches) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO hs_code_watch (id, company_id, hs_code, description, description_en, is_main, created_at)
      VALUES (uuid_generate_v4(), '${C.company}', '${w.hs}', '${w.desc}', '${w.descEn}', ${w.main}, NOW())
      ON CONFLICT (company_id, hs_code) DO UPDATE SET description = EXCLUDED.description, is_main = EXCLUDED.is_main
    `);
  }

  // =============================================
  // 무역 데이터 캐시 (TradeDataCache) — 주요 코드 × 6개월
  // =============================================
  const tradeData = [
    // 870830 브레이크 부품 — 한국 수출
    { hs: "870830", reporter: "KOR", partner: "USA", flow: "EXPORT", source: "KR_CUSTOMS",
      months: [
        { period: "2025-10", usd: 185000000, kg: 42000000 },
        { period: "2025-11", usd: 192000000, kg: 43500000 },
        { period: "2025-12", usd: 178000000, kg: 40800000 },
        { period: "2026-01", usd: 195000000, kg: 44200000 },
        { period: "2026-02", usd: 201000000, kg: 45000000 },
      ]},
    { hs: "870830", reporter: "KOR", partner: "DEU", flow: "EXPORT", source: "KR_CUSTOMS",
      months: [
        { period: "2025-10", usd: 95000000, kg: 21000000 },
        { period: "2025-11", usd: 98000000, kg: 21500000 },
        { period: "2025-12", usd: 91000000, kg: 20000000 },
        { period: "2026-01", usd: 102000000, kg: 22000000 },
        { period: "2026-02", usd: 105000000, kg: 22800000 },
      ]},
    // 870830 한국 수입 (원자재)
    { hs: "870830", reporter: "KOR", partner: "JPN", flow: "IMPORT", source: "KR_CUSTOMS",
      months: [
        { period: "2025-10", usd: 45000000, kg: 8500000 },
        { period: "2025-11", usd: 47000000, kg: 8800000 },
        { period: "2025-12", usd: 43000000, kg: 8200000 },
        { period: "2026-01", usd: 48000000, kg: 9000000 },
        { period: "2026-02", usd: 50000000, kg: 9300000 },
      ]},
    // 842131 에어필터
    { hs: "842131", reporter: "KOR", partner: "USA", flow: "EXPORT", source: "KR_CUSTOMS",
      months: [
        { period: "2025-10", usd: 32000000, kg: 5200000 },
        { period: "2025-11", usd: 34000000, kg: 5500000 },
        { period: "2025-12", usd: 30000000, kg: 4900000 },
        { period: "2026-01", usd: 35000000, kg: 5700000 },
        { period: "2026-02", usd: 37000000, kg: 5900000 },
      ]},
    // 760120 알루미늄 합금 — 한국 수입
    { hs: "760120", reporter: "KOR", partner: "CHN", flow: "IMPORT", source: "KR_CUSTOMS",
      months: [
        { period: "2025-10", usd: 120000000, kg: 65000000 },
        { period: "2025-11", usd: 125000000, kg: 67000000 },
        { period: "2025-12", usd: 118000000, kg: 64000000 },
        { period: "2026-01", usd: 128000000, kg: 68000000 },
        { period: "2026-02", usd: 132000000, kg: 70000000 },
      ]},
  ];

  let tradeCount = 0;
  for (const td of tradeData) {
    for (const m of td.months) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO trade_data_cache (id, hs_code, reporter_iso, partner_iso, period, flow_type, value_usd, weight_kg, source, fetched_at, expires_at)
        VALUES (uuid_generate_v4(), '${td.hs}', '${td.reporter}', '${td.partner}', '${m.period}', '${td.flow}',
          ${m.usd}, ${m.kg}, '${td.source}', NOW(), NOW() + INTERVAL '30 days')
        ON CONFLICT (hs_code, reporter_iso, partner_iso, period, flow_type) DO UPDATE SET
          value_usd = EXCLUDED.value_usd, weight_kg = EXCLUDED.weight_kg, fetched_at = NOW(), expires_at = NOW() + INTERVAL '30 days'
      `);
      tradeCount++;
    }
  }

  // =============================================
  // 검색 로그 (HsSearchLog) — 최근 20건
  // =============================================
  const searchLogs = [
    { hs: "870830", reporter: "KOR", results: 15 },
    { hs: "870899", reporter: "KOR", results: 12 },
    { hs: "842131", reporter: "KOR", results: 8 },
    { hs: "870830", reporter: "KOR", results: 15 },
    { hs: "760120", reporter: "KOR", results: 10 },
    { hs: "870830", reporter: "USA", results: 20 },
    { hs: "842123", reporter: "KOR", results: 6 },
    { hs: "870830", reporter: "KOR", results: 15 },
    { hs: "730890", reporter: "KOR", results: 5 },
    { hs: "870830", reporter: "DEU", results: 18 },
  ];
  for (let i = 0; i < searchLogs.length; i++) {
    const sl = searchLogs[i];
    await prisma.$executeRawUnsafe(`
      INSERT INTO hs_search_log (id, company_id, hs_code, reporter_iso, searched_at, result_count, cache_hit)
      VALUES (uuid_generate_v4(), '${C.company}', '${sl.hs}', '${sl.reporter}',
        NOW() - INTERVAL '${(searchLogs.length - i) * 3} hours', ${sl.results}, ${i > 2})
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =============================================
  // 코드 커버리지 (HsCodeCoverage)
  // =============================================
  const coverage = [
    { hs: "870830", fetched: true, fetchCount: 25, searchCount: 18, priority: 95, popular: true, countries: ["KOR", "USA", "DEU", "JPN", "CHN"] },
    { hs: "870899", fetched: true, fetchCount: 12, searchCount: 8, priority: 75, popular: false, countries: ["KOR", "USA", "CHN"] },
    { hs: "842131", fetched: true, fetchCount: 10, searchCount: 12, priority: 80, popular: true, countries: ["KOR", "USA"] },
    { hs: "842123", fetched: true, fetchCount: 5, searchCount: 3, priority: 40, popular: false, countries: ["KOR"] },
    { hs: "760120", fetched: true, fetchCount: 8, searchCount: 5, priority: 55, popular: false, countries: ["KOR", "CHN"] },
    { hs: "730890", fetched: true, fetchCount: 3, searchCount: 2, priority: 30, popular: false, countries: ["KOR"] },
  ];
  for (const cv of coverage) {
    const countriesArr = `{${cv.countries.join(",")}}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO hs_code_coverage (hs_code, last_fetched_at, fetch_count, search_count, priority, is_popular, countries_cached, updated_at)
      VALUES ('${cv.hs}', ${cv.fetched ? "NOW()" : "NULL"}, ${cv.fetchCount}, ${cv.searchCount}, ${cv.priority}, ${cv.popular}, '${countriesArr}', NOW())
      ON CONFLICT (hs_code) DO UPDATE SET
        fetch_count = EXCLUDED.fetch_count, search_count = EXCLUDED.search_count, priority = EXCLUDED.priority, updated_at = NOW()
    `);
  }

  console.log(`  ✓ mock-trade (즐겨찾기 ${watches.length}, 무역캐시 ${tradeCount}건, 검색로그 ${searchLogs.length}, 커버리지 ${coverage.length})`);
}
