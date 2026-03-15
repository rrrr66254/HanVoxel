"""
HanVoxel — 멀티 API 무역 데이터 수집기

4개 API(UN Comtrade, 한국 관세청, 미국 Census, EU Eurostat)를
asyncio로 동시 조회하고 결과를 USD 기준으로 정규화한다.

수집 후 Redis(TTL 30일) + PostgreSQL TradeDataCache에 동시 저장.
API 실패 시 해당 소스만 skip하고 나머지 결과 반환.
"""

import asyncio
import json
import logging
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# --- 환경변수 ---
COMTRADE_API_KEY = os.getenv("COMTRADE_API_KEY", "")
KR_CUSTOMS_API_KEY = os.getenv("KR_CUSTOMS_API_KEY", "")
US_CENSUS_API_KEY = os.getenv("US_CENSUS_API_KEY", "")

# --- Redis 키 상수 ---
COMTRADE_DAILY_COUNT_KEY = "hanvoxel:comtrade:daily_count"
TRADE_CACHE_KEY_PREFIX = "hanvoxel:trade:"
PREFETCH_QUEUE_KEY = "hanvoxel:prefetch_queue"

# --- TTL 상수 ---
CACHE_TTL_DAYS = 30
CACHE_TTL_SECONDS = CACHE_TTL_DAYS * 86400
COMTRADE_DAILY_LIMIT = 500

# --- HTTP 타임아웃 ---
HTTP_TIMEOUT = 30.0


class TradeRecord:
    """정규화된 무역 데이터 레코드"""

    def __init__(
        self,
        hs_code: str,
        reporter_iso: str,
        partner_iso: str,
        period: str,
        flow_type: str,
        value_usd: float,
        weight_kg: Optional[float],
        source: str,
    ):
        self.hs_code = hs_code
        self.reporter_iso = reporter_iso
        self.partner_iso = partner_iso
        self.period = period  # "YYYY-MM"
        self.flow_type = flow_type  # "EXPORT" | "IMPORT"
        self.value_usd = value_usd
        self.weight_kg = weight_kg
        self.source = source

    def to_dict(self) -> dict:
        return {
            "hsCode": self.hs_code,
            "reporterIso": self.reporter_iso,
            "partnerIso": self.partner_iso,
            "period": self.period,
            "flowType": self.flow_type,
            "valueUsd": self.value_usd,
            "weightKg": self.weight_kg,
            "source": self.source,
        }

    def cache_key(self) -> str:
        """Redis 캐시 키 생성"""
        return (
            f"{TRADE_CACHE_KEY_PREFIX}"
            f"{self.hs_code}:{self.reporter_iso}:{self.partner_iso}:"
            f"{self.period}:{self.flow_type}"
        )


class TradeAggregator:
    """4개 API를 asyncio로 동시 조회하는 무역 데이터 수집기"""

    def __init__(self, redis_client=None, db_pool=None):
        self.redis = redis_client
        self.db = db_pool

    # ===========================================================
    # 공통 유틸리티
    # ===========================================================

    async def _get_comtrade_daily_count(self) -> int:
        """당일 UN Comtrade API 호출 횟수 조회"""
        if not self.redis:
            return 0
        count = await self.redis.get(COMTRADE_DAILY_COUNT_KEY)
        return int(count) if count else 0

    async def _increment_comtrade_count(self) -> int:
        """UN Comtrade 호출 카운터 증가 (자정 리셋 TTL)"""
        if not self.redis:
            return 0
        pipe = self.redis.pipeline()
        pipe.incr(COMTRADE_DAILY_COUNT_KEY)
        # 자정까지 남은 초 계산
        now = datetime.now(timezone.utc)
        tomorrow = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        ttl = int((tomorrow - now).total_seconds())
        pipe.expire(COMTRADE_DAILY_COUNT_KEY, ttl)
        results = await pipe.execute()
        return results[0]

    async def _check_redis_cache(
        self, hs_code: str, reporter_iso: str, partner_iso: str,
        period: str, flow_type: str
    ) -> Optional[dict]:
        """Redis 캐시에서 데이터 조회"""
        if not self.redis:
            return None
        key = (
            f"{TRADE_CACHE_KEY_PREFIX}"
            f"{hs_code}:{reporter_iso}:{partner_iso}:{period}:{flow_type}"
        )
        data = await self.redis.get(key)
        if data:
            return json.loads(data)
        return None

    async def _save_to_redis(self, record: TradeRecord) -> None:
        """Redis에 데이터 저장 (TTL 30일)"""
        if not self.redis:
            return
        key = record.cache_key()
        await self.redis.setex(key, CACHE_TTL_SECONDS, json.dumps(record.to_dict()))

    async def _save_to_db(self, record: TradeRecord) -> None:
        """PostgreSQL TradeDataCache에 UPSERT"""
        if not self.db:
            return
        expires_at = datetime.now(timezone.utc) + timedelta(days=CACHE_TTL_DAYS)
        query = """
            INSERT INTO trade_data_cache
                (id, hs_code, reporter_iso, partner_iso, period, flow_type,
                 value_usd, weight_kg, source, fetched_at, expires_at)
            VALUES
                (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
            ON CONFLICT (hs_code, reporter_iso, partner_iso, period, flow_type)
            DO UPDATE SET
                value_usd = EXCLUDED.value_usd,
                weight_kg = EXCLUDED.weight_kg,
                source    = EXCLUDED.source,
                fetched_at = NOW(),
                expires_at = EXCLUDED.expires_at
        """
        try:
            await self.db.execute(
                query,
                record.hs_code,
                record.reporter_iso,
                record.partner_iso,
                record.period,
                record.flow_type,
                record.value_usd,
                record.weight_kg,
                record.source,
                expires_at,
            )
        except Exception as e:
            logger.error(f"DB 저장 실패: {e}")

    async def _save_record(self, record: TradeRecord) -> None:
        """Redis + DB 동시 저장"""
        await asyncio.gather(
            self._save_to_redis(record),
            self._save_to_db(record),
            return_exceptions=True,
        )

    async def _enqueue_chapter_prefetch(self, hs_code: str) -> None:
        """같은 챕터의 연관 코드를 prefetch 큐에 등록"""
        if not self.redis:
            return
        chapter = hs_code[:2]
        await self.redis.sadd(PREFETCH_QUEUE_KEY, chapter)
        logger.info(f"챕터 {chapter} prefetch 큐 등록")

    # ===========================================================
    # 1. UN Comtrade API
    # ===========================================================

    async def fetch_comtrade(
        self, hs_code: str, reporter_iso: str, partner_iso: str = "W00",
        period: str = "",
    ) -> list[TradeRecord]:
        """
        UN Comtrade API 조회
        - URL: https://comtradeapi.un.org/data/v1/get/C/M/HS
        - 인증: API Key
        - 한도: 500 calls/일 → Redis 카운터로 추적
        """
        if not COMTRADE_API_KEY:
            logger.warning("COMTRADE_API_KEY 미설정, skip")
            return []

        # 당일 한도 확인
        daily_count = await self._get_comtrade_daily_count()
        if daily_count >= COMTRADE_DAILY_LIMIT:
            logger.warning(
                f"UN Comtrade 일일 한도 초과 ({daily_count}/{COMTRADE_DAILY_LIMIT})"
            )
            return []

        url = "https://comtradeapi.un.org/data/v1/get/C/M/HS"
        params = {
            "reporterCode": reporter_iso,
            "partnerCode": partner_iso,
            "cmdCode": hs_code,
            "flowCode": "M,X",  # Import + Export
            "period": period or "recent",
            "subscription-key": COMTRADE_API_KEY,
        }

        records: list[TradeRecord] = []
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                resp = await client.get(url, params=params)

                if resp.status_code == 429:
                    logger.warning("UN Comtrade 429 Rate Limit")
                    return []

                resp.raise_for_status()
                await self._increment_comtrade_count()

                data = resp.json()
                for item in data.get("data", []):
                    flow = "EXPORT" if item.get("flowCode") == "X" else "IMPORT"
                    # period 형식 변환: 202401 → 2024-01
                    raw_period = str(item.get("period", ""))
                    if len(raw_period) == 6:
                        fmt_period = f"{raw_period[:4]}-{raw_period[4:]}"
                    else:
                        fmt_period = raw_period

                    records.append(
                        TradeRecord(
                            hs_code=hs_code[:6],
                            reporter_iso=str(
                                item.get("reporterCodeIsoAlpha3", reporter_iso)
                            ),
                            partner_iso=str(
                                item.get("partnerCodeIsoAlpha3", partner_iso)
                            ),
                            period=fmt_period,
                            flow_type=flow,
                            value_usd=float(item.get("primaryValue", 0)),
                            weight_kg=(
                                float(item["netWgt"])
                                if item.get("netWgt") is not None
                                else None
                            ),
                            source="UN_COMTRADE",
                        )
                    )
        except httpx.HTTPStatusError as e:
            logger.error(f"UN Comtrade HTTP 에러: {e.response.status_code}")
        except Exception as e:
            logger.error(f"UN Comtrade 수집 실패: {e}")

        return records

    # ===========================================================
    # 2. 한국 관세청 UNI-PASS API
    # ===========================================================

    async def fetch_kr_customs(
        self, hs_code: str, period: str = "",
    ) -> list[TradeRecord]:
        """
        한국 관세청 UNI-PASS API
        - URL: https://unipass.customs.go.kr/ets/
        - 인증: API Key
        - 한도: 무제한
        - 응답: XML → JSON 변환
        """
        if not KR_CUSTOMS_API_KEY:
            logger.warning("KR_CUSTOMS_API_KEY 미설정, skip")
            return []

        # 기간 설정 (기본: 최근 12개월)
        if not period:
            now = datetime.now()
            start_date = (now - timedelta(days=365)).strftime("%Y%m")
            end_date = now.strftime("%Y%m")
        else:
            # "2024-01" → "202401"
            start_date = period.replace("-", "")
            end_date = start_date

        url = "https://unipass.customs.go.kr/ets/"
        params = {
            "serviceKey": KR_CUSTOMS_API_KEY,
            "hsSgn": hs_code,
            "searchBgnDe": start_date,
            "searchEndDe": end_date,
        }

        records: list[TradeRecord] = []
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()

                # XML 파싱
                root = ET.fromstring(resp.text)
                items = root.findall(".//item") or root.findall(".//{*}item")

                for item in items:
                    # XML 요소에서 값 추출 (태그명은 실제 API 응답 구조에 따라 조정)
                    exp_dol = item.findtext("expDlr") or item.findtext("expDlrAmt")
                    imp_dol = item.findtext("impDlr") or item.findtext("impDlrAmt")
                    wgt = item.findtext("expWgt") or item.findtext("impWgt")
                    raw_period = item.findtext("ym") or item.findtext("statMnth") or ""

                    # period 정규화
                    if len(raw_period) == 6:
                        fmt_period = f"{raw_period[:4]}-{raw_period[4:]}"
                    else:
                        fmt_period = raw_period

                    partner = item.findtext("cntyCd") or "W00"

                    # 수출 레코드
                    if exp_dol and float(exp_dol) > 0:
                        records.append(
                            TradeRecord(
                                hs_code=hs_code[:6],
                                reporter_iso="KOR",
                                partner_iso=partner,
                                period=fmt_period,
                                flow_type="EXPORT",
                                value_usd=float(exp_dol),
                                weight_kg=float(wgt) if wgt else None,
                                source="KR_CUSTOMS",
                            )
                        )
                    # 수입 레코드
                    if imp_dol and float(imp_dol) > 0:
                        records.append(
                            TradeRecord(
                                hs_code=hs_code[:6],
                                reporter_iso="KOR",
                                partner_iso=partner,
                                period=fmt_period,
                                flow_type="IMPORT",
                                value_usd=float(imp_dol),
                                weight_kg=float(wgt) if wgt else None,
                                source="KR_CUSTOMS",
                            )
                        )
        except ET.ParseError as e:
            logger.error(f"관세청 XML 파싱 실패: {e}")
        except Exception as e:
            logger.error(f"관세청 API 수집 실패: {e}")

        return records

    # ===========================================================
    # 3. 미국 Census Bureau API
    # ===========================================================

    async def fetch_us_census(
        self, hs_code: str, period: str = "",
    ) -> list[TradeRecord]:
        """
        미국 Census Bureau 국제무역 API
        - URL: https://api.census.gov/data/timeseries/intltrade/imports
        - 인증: API Key
        - 한도: 무제한
        - 응답: JSON 배열
        """
        if not US_CENSUS_API_KEY:
            logger.warning("US_CENSUS_API_KEY 미설정, skip")
            return []

        records: list[TradeRecord] = []

        # 수입 + 수출 각각 조회
        endpoints = [
            (
                "https://api.census.gov/data/timeseries/intltrade/imports/hs",
                "IMPORT",
                "GEN_VAL_MO",
            ),
            (
                "https://api.census.gov/data/timeseries/intltrade/exports/hs",
                "EXPORT",
                "ALL_VAL_MO",
            ),
        ]

        for url, flow_type, value_field in endpoints:
            params = {
                "get": f"{value_field},QTY_1_MO,CTY_CODE",
                "COMM_LVL": "HS6",
                "I_COMMODITY": hs_code[:6],
                "key": US_CENSUS_API_KEY,
            }
            if period:
                # "2024-01" → time=2024-01
                params["time"] = period
            else:
                params["time"] = "from+2023-01"

            try:
                async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                    resp = await client.get(url, params=params)
                    resp.raise_for_status()
                    data = resp.json()

                    if not data or len(data) < 2:
                        continue

                    # 첫 행은 헤더, 이후 데이터 행
                    headers = data[0]
                    val_idx = headers.index(value_field) if value_field in headers else 0
                    qty_idx = (
                        headers.index("QTY_1_MO") if "QTY_1_MO" in headers else None
                    )
                    cty_idx = (
                        headers.index("CTY_CODE") if "CTY_CODE" in headers else None
                    )
                    time_idx = headers.index("time") if "time" in headers else None

                    for row in data[1:]:
                        value = float(row[val_idx]) if row[val_idx] else 0
                        if value <= 0:
                            continue

                        weight = (
                            float(row[qty_idx]) if qty_idx and row[qty_idx] else None
                        )
                        partner = row[cty_idx] if cty_idx else "W00"
                        raw_time = row[time_idx] if time_idx else ""

                        records.append(
                            TradeRecord(
                                hs_code=hs_code[:6],
                                reporter_iso="USA",
                                partner_iso=partner,
                                period=raw_time,
                                flow_type=flow_type,
                                value_usd=value,
                                weight_kg=weight,
                                source="US_CENSUS",
                            )
                        )
            except Exception as e:
                logger.error(f"Census Bureau {flow_type} 수집 실패: {e}")

        return records

    # ===========================================================
    # 4. EU Eurostat API
    # ===========================================================

    async def fetch_eu_eurostat(
        self, hs_code: str, reporter_iso: str = "", period: str = "",
    ) -> list[TradeRecord]:
        """
        EU Eurostat 무역 통계 API
        - URL: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/
        - 인증: 불필요 (무료 공개)
        - 한도: 무제한
        - 응답: JSON-stat
        """
        # Eurostat 데이터셋: DS-045409 (국제무역 월별)
        base_url = (
            "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
            "ds-045409"
        )

        # Eurostat 국가코드 매핑 (ISO2 사용)
        reporter_param = reporter_iso[:2] if reporter_iso else "EU27_2020"

        params = {
            "format": "JSON",
            "lang": "en",
            "product": hs_code[:6],
            "reporter": reporter_param,
            "indicators": "VALUE_IN_EUROS",
        }
        if period:
            params["time"] = period

        records: list[TradeRecord] = []
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                resp = await client.get(base_url, params=params)
                resp.raise_for_status()
                data = resp.json()

                # JSON-stat 형식 파싱
                values = data.get("value", {})
                dimensions = data.get("dimension", {})

                # 시간 차원
                time_dim = dimensions.get("time", {}).get("category", {}).get("index", {})
                time_labels = {v: k for k, v in time_dim.items()}

                # flow 차원
                flow_dim = dimensions.get("indicators", {}).get("category", {}).get("index", {})
                flow_labels = {v: k for k, v in flow_dim.items()}

                # partner 차원
                partner_dim = dimensions.get("partner", {}).get("category", {}).get("index", {})
                partner_labels = {v: k for k, v in partner_dim.items()}

                # EUR → USD 근사 환산율 (실시간 환율 연동 전 고정값)
                eur_to_usd = 1.08

                for idx_str, value in values.items():
                    if value is None or float(value) <= 0:
                        continue

                    idx = int(idx_str)
                    # 다차원 인덱스 역산 (간소화: 단일 값이면 직접 매핑)
                    time_label = time_labels.get(idx % len(time_labels), "") if time_labels else ""
                    partner_label = (
                        partner_labels.get(
                            (idx // max(len(time_labels), 1)) % max(len(partner_labels), 1), ""
                        )
                        if partner_labels
                        else "W00"
                    )

                    # 기간 정규화 (2024M01 → 2024-01)
                    fmt_period = time_label.replace("M", "-") if "M" in time_label else time_label

                    records.append(
                        TradeRecord(
                            hs_code=hs_code[:6],
                            reporter_iso=reporter_param,
                            partner_iso=partner_label or "W00",
                            period=fmt_period,
                            flow_type="IMPORT",  # Eurostat 기본: 수입 기준
                            value_usd=round(float(value) * eur_to_usd, 2),
                            weight_kg=None,
                            source="EU_EUROSTAT",
                        )
                    )
        except Exception as e:
            logger.error(f"Eurostat 수집 실패: {e}")

        return records

    # ===========================================================
    # 통합 수집 메서드
    # ===========================================================

    async def aggregate(
        self,
        hs_code: str,
        reporter_isos: list[str],
        partner_iso: str = "W00",
        period: str = "",
    ) -> list[dict]:
        """
        4개 API를 asyncio로 동시 조회하고 결과를 정규화·저장 후 반환.

        Args:
            hs_code: 6자리 HS 코드
            reporter_isos: 보고국 ISO3 코드 목록
            partner_iso: 상대국 ISO3 (기본 W00=전 세계)
            period: 기간 (YYYY-MM), 빈 문자열이면 최근

        Returns:
            정규화된 무역 데이터 목록 (dict)
        """
        tasks = []

        for reporter in reporter_isos:
            # UN Comtrade (모든 국가)
            tasks.append(
                self.fetch_comtrade(hs_code, reporter, partner_iso, period)
            )

            # 한국 관세청 (한국만)
            if reporter.upper() in ("KOR", "KR", "410"):
                tasks.append(self.fetch_kr_customs(hs_code, period))

            # 미국 Census (미국만)
            if reporter.upper() in ("USA", "US", "842"):
                tasks.append(self.fetch_us_census(hs_code, period))

            # EU Eurostat (EU 국가)
            eu_codes = {
                "DEU", "FRA", "ITA", "ESP", "NLD", "BEL", "AUT", "POL",
                "SWE", "DNK", "FIN", "IRL", "PRT", "GRC", "CZE", "ROU",
                "HUN", "BGR", "HRV", "SVK", "SVN", "LTU", "LVA", "EST",
                "LUX", "MLT", "CYP", "EU",
            }
            if reporter.upper() in eu_codes:
                tasks.append(
                    self.fetch_eu_eurostat(hs_code, reporter, period)
                )

        # 모든 API 동시 실행 (실패 시 빈 리스트 반환)
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_records: list[TradeRecord] = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"API 수집 예외: {result}")
                continue
            if isinstance(result, list):
                all_records.extend(result)

        # Redis + DB 동시 저장
        save_tasks = [self._save_record(r) for r in all_records]
        if save_tasks:
            await asyncio.gather(*save_tasks, return_exceptions=True)

        # 같은 챕터 prefetch 큐 등록
        await self._enqueue_chapter_prefetch(hs_code)

        logger.info(
            f"HS {hs_code} 수집 완료: {len(all_records)}건 "
            f"(reporters: {reporter_isos})"
        )

        return [r.to_dict() for r in all_records]

    async def get_comtrade_quota_status(self) -> dict:
        """UN Comtrade 당일 API 사용량 조회"""
        count = await self._get_comtrade_daily_count()
        return {
            "dailyLimit": COMTRADE_DAILY_LIMIT,
            "usedToday": count,
            "remaining": max(0, COMTRADE_DAILY_LIMIT - count),
            "isExhausted": count >= COMTRADE_DAILY_LIMIT,
        }
