"""
HanVoxel — 야간 배치 선점 스케줄러

APScheduler로 매일 자정(Asia/Seoul) 자동 실행.
500 calls/일 배분:
  - 실시간 유저 예약: 200 (Redis 카운터로 당일 사용량 추적)
  - 인기 코드 갱신:  100 (searchCount 10회+ 코드 월별 갱신)
  - 신규 코드 선점:  200 (우선순위 알고리즘 기반)

실행 결과를 PrefetchBatchLog에 저장.
"""

import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# --- 한국 주요 챕터 (선점 우선순위 높음) ---
KR_TOP_CHAPTERS = ["87", "85", "84", "90", "39", "72", "29", "27"]

# --- 500 calls/일 배분 ---
BUDGET_USER_REALTIME = 200  # 실시간 유저 예약분
BUDGET_POPULAR_REFRESH = 100  # 인기 코드 갱신
BUDGET_NEW_PREFETCH = 200  # 신규 코드 선점

# --- Redis 키 ---
COMTRADE_DAILY_COUNT_KEY = "hanvoxel:comtrade:daily_count"
PREFETCH_QUEUE_KEY = "hanvoxel:prefetch_queue"


def calculate_priority(hs_code: str, db_context: dict) -> float:
    """
    HS 코드 선점 우선순위 계산

    Args:
        hs_code: 6자리 HS 코드
        db_context: {
            "adjacent_codes": set[str],    # 같은 heading 내 이미 보유한 코드
            "search_count": int,           # HsCodeCoverage.searchCount
            "popular_threshold": int,      # 인기 기준 (기본 10)
        }

    Returns:
        우선순위 점수 (높을수록 우선)
    """
    score = 0.0

    # 1. 인접 코드 보유 시 (+40) — 같은 heading 내 다른 코드가 DB에 있으면
    adjacent_codes = db_context.get("adjacent_codes", set())
    heading = hs_code[:4]
    if any(c[:4] == heading and c != hs_code for c in adjacent_codes):
        score += 40

    # 2. 한국 주요 챕터 (+30)
    if hs_code[:2] in KR_TOP_CHAPTERS:
        score += 30

    # 3. 글로벌 교역량 상위 (+20) — searchCount 기준
    search_count = db_context.get("search_count", 0)
    popular_threshold = db_context.get("popular_threshold", 10)
    if search_count >= popular_threshold:
        score += 20

    # 4. 랜덤 탐색 (+0~10) — 롱테일 커버리지
    score += random.randint(0, 10)

    return score


class NightlyPrefetcher:
    """야간 배치 선점 스케줄러"""

    def __init__(self, redis_client=None, db_pool=None, aggregator=None):
        self.redis = redis_client
        self.db = db_pool
        self.aggregator = aggregator

    # ===========================================================
    # DB 조회 헬퍼
    # ===========================================================

    async def _get_popular_codes(self, limit: int = 100) -> list[dict]:
        """인기 코드 조회 (searchCount 10회+ / 최근 갱신이 7일 이상 경과)"""
        if not self.db:
            return []
        query = """
            SELECT hs_code, search_count, last_fetched_at, countries_cached
            FROM hs_code_coverage
            WHERE search_count >= 10
              AND is_popular = true
              AND (last_fetched_at IS NULL
                   OR last_fetched_at < NOW() - INTERVAL '7 days')
            ORDER BY search_count DESC
            LIMIT $1
        """
        try:
            rows = await self.db.fetch(query, limit)
            return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"인기 코드 조회 실패: {e}")
            return []

    async def _get_all_covered_codes(self) -> set[str]:
        """이미 커버리지가 있는 HS 코드 목록"""
        if not self.db:
            return set()
        query = "SELECT hs_code FROM hs_code_coverage"
        try:
            rows = await self.db.fetch(query)
            return {r["hs_code"] for r in rows}
        except Exception as e:
            logger.error(f"커버리지 조회 실패: {e}")
            return set()

    async def _get_master_codes_by_chapters(
        self, chapters: list[str]
    ) -> list[str]:
        """특정 챕터에 속하는 마스터 코드 목록"""
        if not self.db:
            return []
        query = """
            SELECT hs_code FROM hs_code_master
            WHERE chapter = ANY($1)
            ORDER BY hs_code
        """
        try:
            rows = await self.db.fetch(query, chapters)
            return [r["hs_code"] for r in rows]
        except Exception as e:
            logger.error(f"마스터 코드 조회 실패: {e}")
            return []

    async def _get_prefetch_queue_chapters(self) -> list[str]:
        """유저 검색 시 등록된 prefetch 큐 챕터 목록"""
        if not self.redis:
            return []
        try:
            members = await self.redis.smembers(PREFETCH_QUEUE_KEY)
            return list(members) if members else []
        except Exception as e:
            logger.error(f"Prefetch 큐 조회 실패: {e}")
            return []

    async def _clear_prefetch_queue(self) -> None:
        """Prefetch 큐 초기화"""
        if not self.redis:
            return
        try:
            await self.redis.delete(PREFETCH_QUEUE_KEY)
        except Exception as e:
            logger.error(f"Prefetch 큐 초기화 실패: {e}")

    async def _get_comtrade_daily_count(self) -> int:
        """당일 Comtrade 사용량"""
        if not self.redis:
            return 0
        count = await self.redis.get(COMTRADE_DAILY_COUNT_KEY)
        return int(count) if count else 0

    async def _update_coverage(
        self, hs_code: str, countries: list[str], priority: float
    ) -> None:
        """HsCodeCoverage 갱신"""
        if not self.db:
            return
        query = """
            INSERT INTO hs_code_coverage
                (hs_code, last_fetched_at, fetch_count, priority,
                 countries_cached, updated_at)
            VALUES ($1, NOW(), 1, $2, $3, NOW())
            ON CONFLICT (hs_code) DO UPDATE SET
                last_fetched_at = NOW(),
                fetch_count = hs_code_coverage.fetch_count + 1,
                priority = $2,
                countries_cached = $3,
                updated_at = NOW()
        """
        try:
            await self.db.execute(query, hs_code, priority, countries)
        except Exception as e:
            logger.error(f"커버리지 갱신 실패 ({hs_code}): {e}")

    async def _save_batch_log(
        self, calls_used: int, codes_added: int,
        cache_hit_rate: float, strategy: str
    ) -> None:
        """PrefetchBatchLog에 실행 결과 저장"""
        if not self.db:
            return
        query = """
            INSERT INTO prefetch_batch_log
                (id, run_at, calls_used, codes_added, cache_hit_rate, strategy)
            VALUES (uuid_generate_v4(), NOW(), $1, $2, $3, $4)
        """
        try:
            await self.db.execute(query, calls_used, codes_added, cache_hit_rate, strategy)
        except Exception as e:
            logger.error(f"배치 로그 저장 실패: {e}")

    # ===========================================================
    # 핵심 배치 로직
    # ===========================================================

    async def _refresh_popular_codes(self, budget: int) -> dict:
        """
        인기 코드 갱신 (검색 10회+ 코드의 월별 데이터 갱신)

        Returns:
            {"callsUsed": int, "codesAdded": int, "cacheHits": int}
        """
        popular = await self._get_popular_codes(limit=budget)
        calls_used = 0
        codes_added = 0
        cache_hits = 0

        for code_info in popular:
            if calls_used >= budget:
                break

            hs_code = code_info["hs_code"]
            try:
                if self.aggregator:
                    records = await self.aggregator.aggregate(
                        hs_code=hs_code,
                        reporter_isos=["KOR"],
                        partner_iso="W00",
                    )
                    calls_used += 1
                    if records:
                        codes_added += 1
                        countries = list({r["reporterIso"] for r in records})
                        await self._update_coverage(
                            hs_code, countries, code_info.get("search_count", 0)
                        )
                    else:
                        cache_hits += 1
            except Exception as e:
                logger.error(f"인기 코드 갱신 실패 ({hs_code}): {e}")

        return {
            "callsUsed": calls_used,
            "codesAdded": codes_added,
            "cacheHits": cache_hits,
        }

    async def _prefetch_new_codes(self, budget: int) -> dict:
        """
        신규 코드 선점 (우선순위 알고리즘 기반)

        Returns:
            {"callsUsed": int, "codesAdded": int, "cacheHits": int}
        """
        # 유저 검색 기반 챕터 + 한국 주요 챕터 통합
        queue_chapters = await self._get_prefetch_queue_chapters()
        target_chapters = list(set(queue_chapters + KR_TOP_CHAPTERS))

        # 마스터 코드 조회
        all_master_codes = await self._get_master_codes_by_chapters(target_chapters)
        covered_codes = await self._get_all_covered_codes()

        # 미커버 코드 필터링 + 우선순위 계산
        candidates: list[tuple[str, float]] = []
        for code in all_master_codes:
            if code in covered_codes:
                continue
            db_context = {
                "adjacent_codes": covered_codes,
                "search_count": 0,
                "popular_threshold": 10,
            }
            priority = calculate_priority(code, db_context)
            candidates.append((code, priority))

        # 우선순위 내림차순 정렬
        candidates.sort(key=lambda x: x[1], reverse=True)

        calls_used = 0
        codes_added = 0
        cache_hits = 0

        for hs_code, priority in candidates:
            if calls_used >= budget:
                break

            try:
                if self.aggregator:
                    records = await self.aggregator.aggregate(
                        hs_code=hs_code,
                        reporter_isos=["KOR"],
                        partner_iso="W00",
                    )
                    calls_used += 1
                    if records:
                        codes_added += 1
                        countries = list({r["reporterIso"] for r in records})
                        await self._update_coverage(hs_code, countries, priority)
                    else:
                        cache_hits += 1
            except Exception as e:
                logger.error(f"신규 코드 선점 실패 ({hs_code}): {e}")

        return {
            "callsUsed": calls_used,
            "codesAdded": codes_added,
            "cacheHits": cache_hits,
        }

    async def run_nightly_batch(self) -> dict:
        """
        야간 배치 메인 실행 함수

        500 calls 배분:
          - 실시간 유저 예약: 200 (건드리지 않음)
          - 인기 코드 갱신: 100
          - 신규 코드 선점: 200

        Returns:
            실행 결과 요약
        """
        start_time = datetime.now(timezone.utc)
        logger.info("===== 야간 배치 선점 시작 =====")

        # 당일 사용량 확인 → 남은 예산 계산
        daily_used = await self._get_comtrade_daily_count()
        remaining = max(0, 500 - daily_used - BUDGET_USER_REALTIME)
        popular_budget = min(BUDGET_POPULAR_REFRESH, remaining)
        prefetch_budget = min(BUDGET_NEW_PREFETCH, remaining - popular_budget)

        logger.info(
            f"당일 사용량: {daily_used}, 남은 배치 예산: "
            f"인기({popular_budget}) + 신규({prefetch_budget})"
        )

        # 1단계: 인기 코드 갱신
        popular_result = await self._refresh_popular_codes(popular_budget)
        await self._save_batch_log(
            calls_used=popular_result["callsUsed"],
            codes_added=popular_result["codesAdded"],
            cache_hit_rate=(
                popular_result["cacheHits"]
                / max(popular_result["callsUsed"], 1)
                * 100
            ),
            strategy="POPULAR",
        )
        logger.info(
            f"인기 갱신 완료: calls={popular_result['callsUsed']}, "
            f"added={popular_result['codesAdded']}"
        )

        # 2단계: 신규 코드 선점
        prefetch_result = await self._prefetch_new_codes(prefetch_budget)
        await self._save_batch_log(
            calls_used=prefetch_result["callsUsed"],
            codes_added=prefetch_result["codesAdded"],
            cache_hit_rate=(
                prefetch_result["cacheHits"]
                / max(prefetch_result["callsUsed"], 1)
                * 100
            ),
            strategy="ADJACENT",
        )
        logger.info(
            f"신규 선점 완료: calls={prefetch_result['callsUsed']}, "
            f"added={prefetch_result['codesAdded']}"
        )

        # Prefetch 큐 초기화
        await self._clear_prefetch_queue()

        total_calls = (
            popular_result["callsUsed"] + prefetch_result["callsUsed"]
        )
        total_added = (
            popular_result["codesAdded"] + prefetch_result["codesAdded"]
        )
        total_cache_hits = (
            popular_result["cacheHits"] + prefetch_result["cacheHits"]
        )
        overall_hit_rate = (
            total_cache_hits / max(total_calls, 1) * 100
        )

        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info(
            f"===== 야간 배치 완료 ({elapsed:.1f}s) ===== "
            f"calls={total_calls}, added={total_added}, "
            f"hitRate={overall_hit_rate:.1f}%"
        )

        return {
            "runAt": start_time.isoformat(),
            "elapsedSeconds": elapsed,
            "totalCallsUsed": total_calls,
            "totalCodesAdded": total_added,
            "cacheHitRate": round(overall_hit_rate, 2),
            "popular": popular_result,
            "prefetch": prefetch_result,
        }


def setup_scheduler(
    redis_client=None, db_pool=None, aggregator=None
) -> Optional["AsyncIOScheduler"]:
    """
    APScheduler 설정 — 매일 자정(Asia/Seoul) 자동 실행

    Returns:
        AsyncIOScheduler 인스턴스 (None if 초기화 실패)
    """
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError:
        logger.error("APScheduler 미설치")
        return None

    prefetcher = NightlyPrefetcher(
        redis_client=redis_client,
        db_pool=db_pool,
        aggregator=aggregator,
    )

    scheduler = AsyncIOScheduler()

    # 매일 자정 (Asia/Seoul) 실행
    trigger = CronTrigger(hour=0, minute=0, timezone="Asia/Seoul")
    scheduler.add_job(
        prefetcher.run_nightly_batch,
        trigger=trigger,
        id="nightly_prefetch",
        name="야간 HS 코드 선점 배치",
        replace_existing=True,
        max_instances=1,
    )

    logger.info("야간 배치 스케줄러 등록 완료 (매일 00:00 KST)")
    return scheduler


async def run_manual_batch(
    redis_client=None, db_pool=None, aggregator=None
) -> dict:
    """수동 배치 실행 (테스트·디버깅용)"""
    prefetcher = NightlyPrefetcher(
        redis_client=redis_client,
        db_pool=db_pool,
        aggregator=aggregator,
    )
    return await prefetcher.run_nightly_batch()
