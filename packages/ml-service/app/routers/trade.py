"""HanVoxel — 무역 인텔리전스 라우터 (ml-service)"""

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.trade import (
    ComtradeQuotaResponse,
    TradeAggregateResponse,
    TradeQueryRequest,
)
from app.services.trade.trade_aggregator import TradeAggregator
from app.services.trade.nightly_prefetch import run_manual_batch

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trade", tags=["trade-intelligence"])

# 인스턴스 (Redis/DB는 추후 DI로 주입)
_aggregator = TradeAggregator(redis_client=None, db_pool=None)


@router.post("/aggregate", response_model=TradeAggregateResponse)
async def aggregate_trade_data(req: TradeQueryRequest):
    """
    4개 API를 동시 조회하여 무역 데이터 수집·정규화·저장 후 반환.
    API 실패 시 해당 소스만 skip하고 나머지 결과 반환.
    """
    try:
        records = await _aggregator.aggregate(
            hs_code=req.hs_code,
            reporter_isos=req.reporter_isos,
            partner_iso=req.partner_iso,
            period=req.period,
        )
        sources = list({r["source"] for r in records})
        return TradeAggregateResponse(
            records=records,
            totalCount=len(records),
            sources=sources,
        )
    except Exception as e:
        logger.error(f"무역 데이터 수집 실패: {e}")
        raise HTTPException(status_code=500, detail=f"수집 실패: {str(e)}")


@router.get("/comtrade-quota", response_model=ComtradeQuotaResponse)
async def get_comtrade_quota():
    """UN Comtrade 당일 API 사용량 조회"""
    try:
        status = await _aggregator.get_comtrade_quota_status()
        return ComtradeQuotaResponse(**status)
    except Exception as e:
        logger.error(f"Comtrade 할당량 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prefetch/run")
async def trigger_manual_prefetch():
    """수동 야간 배치 실행 (테스트·디버깅용)"""
    try:
        result = await run_manual_batch(
            redis_client=None, db_pool=None, aggregator=_aggregator
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"수동 배치 실행 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
