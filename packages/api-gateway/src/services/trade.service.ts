/**
 * HanVoxel — 무역 인텔리전스 서비스
 *
 * HS 코드 검색, 즐겨찾기, 무역 데이터 조회, 커버리지/배치로그 조회
 * Redis 캐시 → DB 캐시 → ml-service 순서로 조회
 */

import prisma from './prisma';
import type { Prisma } from '@prisma/client';

// --- ml-service 호출 URL ---
const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

// --- 회사당 즐겨찾기 최대 수 ---
const MAX_WATCH_PER_COMPANY = 5;

// ============================================================
// 1. HS 코드 자동완성 검색
// ============================================================

interface HsSearchResult {
  hsCode: string;
  description: string;
  descriptionEn: string;
  chapter: string;
  heading: string;
}

export async function searchHsCodes(
  query: string,
  limit: number = 10
): Promise<HsSearchResult[]> {
  // HS 코드 또는 설명으로 검색 (한국어/영문 모두)
  const results = await prisma.hsCodeMaster.findMany({
    where: {
      OR: [
        { hsCode: { startsWith: query } },
        { description: { contains: query } },
        { descriptionEn: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
      ],
    },
    take: limit,
    orderBy: { hsCode: 'asc' },
  });

  return results.map((r) => ({
    hsCode: r.hsCode,
    description: r.description,
    descriptionEn: r.descriptionEn,
    chapter: r.chapter,
    heading: r.heading,
  }));
}

// ============================================================
// 2. 즐겨찾기 (HsCodeWatch)
// ============================================================

interface WatchItem {
  id: string;
  companyId: string;
  hsCode: string;
  description: string;
  descriptionEn: string | null;
  isMain: boolean;
  createdAt: Date;
}

export async function addWatch(
  companyId: string,
  hsCode: string,
  description: string,
  descriptionEn?: string
): Promise<WatchItem> {
  // 회사당 최대 5개 제한 확인
  const count = await prisma.hsCodeWatch.count({
    where: { companyId },
  });

  if (count >= MAX_WATCH_PER_COMPANY) {
    throw new Error(`즐겨찾기는 최대 ${MAX_WATCH_PER_COMPANY}개까지 등록 가능합니다`);
  }

  const watch = await prisma.hsCodeWatch.create({
    data: {
      companyId,
      hsCode,
      description,
      descriptionEn: descriptionEn ?? null,
      isMain: count === 0, // 첫 번째 등록은 자동으로 주요 코드
    },
  });

  return watch as WatchItem;
}

export async function removeWatch(
  companyId: string,
  hsCode: string
): Promise<void> {
  await prisma.hsCodeWatch.deleteMany({
    where: { companyId, hsCode },
  });
}

export async function getWatchList(companyId: string): Promise<WatchItem[]> {
  const watches = await prisma.hsCodeWatch.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
  });
  return watches as WatchItem[];
}

// ============================================================
// 3. 무역 데이터 조회 (캐시 → DB → ml-service)
// ============================================================

interface TradeDataQuery {
  hsCode: string;
  reporterIsos: string[];
  partnerIso?: string;
  period?: string;
  flowType?: string;
  companyId?: string;
}

interface TradeDataRecord {
  hsCode: string;
  reporterIso: string;
  partnerIso: string;
  period: string;
  flowType: string;
  valueUsd: number;
  weightKg: number | null;
  source: string;
}

export async function getTradeData(
  query: TradeDataQuery
): Promise<{ records: TradeDataRecord[]; cacheHit: boolean }> {
  const { hsCode, reporterIsos, partnerIso, period, flowType, companyId } = query;

  // 1단계: DB 캐시 조회 (만료되지 않은 데이터)
  const whereClause: Prisma.TradeDataCacheWhereInput = {
    hsCode,
    expiresAt: { gt: new Date() },
  };
  if (reporterIsos.length > 0) {
    whereClause.reporterIso = { in: reporterIsos };
  }
  if (partnerIso) {
    whereClause.partnerIso = partnerIso;
  }
  if (period) {
    whereClause.period = period;
  }
  if (flowType) {
    whereClause.flowType = flowType;
  }

  const cached = await prisma.tradeDataCache.findMany({
    where: whereClause,
    orderBy: { period: 'desc' },
  });

  let cacheHit = cached.length > 0;
  let records: TradeDataRecord[];

  if (cacheHit) {
    // 캐시 히트 → DB 데이터 반환
    records = cached.map((c) => ({
      hsCode: c.hsCode,
      reporterIso: c.reporterIso,
      partnerIso: c.partnerIso,
      period: c.period,
      flowType: c.flowType,
      valueUsd: c.valueUsd,
      weightKg: c.weightKg,
      source: c.source,
    }));
  } else {
    // 2단계: ml-service 호출
    try {
      const resp = await fetch(`${ML_SERVICE_URL}/api/v1/trade/aggregate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hs_code: hsCode,
          reporter_isos: reporterIsos,
          partner_iso: partnerIso ?? 'W00',
          period: period ?? '',
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as { records?: TradeDataRecord[] };
        records = (data.records ?? []).map((r: TradeDataRecord) => ({
          hsCode: r.hsCode,
          reporterIso: r.reporterIso,
          partnerIso: r.partnerIso,
          period: r.period,
          flowType: r.flowType,
          valueUsd: r.valueUsd,
          weightKg: r.weightKg,
          source: r.source,
        }));
      } else {
        records = [];
      }
    } catch {
      records = [];
    }
    cacheHit = false;
  }

  // HsSearchLog 기록
  for (const reporter of reporterIsos) {
    await prisma.hsSearchLog.create({
      data: {
        companyId: companyId ?? null,
        hsCode,
        reporterIso: reporter,
        resultCount: records.length,
        cacheHit,
      },
    });
  }

  // HsCodeCoverage 검색 카운트 증가
  await prisma.hsCodeCoverage.upsert({
    where: { hsCode },
    create: {
      hsCode,
      searchCount: 1,
      isPopular: false,
      countriesCached: [],
    },
    update: {
      searchCount: { increment: 1 },
      isPopular: undefined,
    },
  });

  // searchCount 10회+ 시 isPopular 플래그 설정
  const coverage = await prisma.hsCodeCoverage.findUnique({
    where: { hsCode },
  });
  if (coverage && coverage.searchCount >= 10 && !coverage.isPopular) {
    await prisma.hsCodeCoverage.update({
      where: { hsCode },
      data: { isPopular: true },
    });
  }

  return { records, cacheHit };
}

// ============================================================
// 4. 커버리지 현황
// ============================================================

interface CoverageStats {
  totalCodes: number;
  popularCodes: number;
  totalSearches: number;
  avgCacheHitRate: number;
  topCodes: Array<{
    hsCode: string;
    searchCount: number;
    fetchCount: number;
    isPopular: boolean;
  }>;
}

export async function getCoverageStats(): Promise<CoverageStats> {
  const [totalCodes, popularCodes, allCoverage, searchLogs] = await Promise.all([
    prisma.hsCodeCoverage.count(),
    prisma.hsCodeCoverage.count({ where: { isPopular: true } }),
    prisma.hsCodeCoverage.findMany({
      orderBy: { searchCount: 'desc' },
      take: 20,
    }),
    prisma.hsSearchLog.count(),
  ]);

  // 캐시 히트율 계산
  const cacheHits = await prisma.hsSearchLog.count({
    where: { cacheHit: true },
  });
  const avgCacheHitRate = searchLogs > 0 ? (cacheHits / searchLogs) * 100 : 0;

  return {
    totalCodes,
    popularCodes,
    totalSearches: searchLogs,
    avgCacheHitRate: Math.round(avgCacheHitRate * 100) / 100,
    topCodes: allCoverage.map((c) => ({
      hsCode: c.hsCode,
      searchCount: c.searchCount,
      fetchCount: c.fetchCount,
      isPopular: c.isPopular,
    })),
  };
}

// ============================================================
// 5. 배치 로그 조회
// ============================================================

interface BatchLog {
  id: string;
  runAt: Date;
  callsUsed: number;
  codesAdded: number;
  cacheHitRate: number;
  strategy: string;
}

export async function getBatchLogs(days: number = 30): Promise<BatchLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await prisma.prefetchBatchLog.findMany({
    where: {
      runAt: { gte: since },
    },
    orderBy: { runAt: 'desc' },
  });

  return logs as BatchLog[];
}
