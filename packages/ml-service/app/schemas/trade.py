"""HanVoxel — 무역 인텔리전스 API 스키마"""

from typing import Optional

from pydantic import BaseModel, Field


class TradeQueryRequest(BaseModel):
    """무역 데이터 조회 요청"""
    hs_code: str = Field(..., description="6자리 HS 코드", min_length=4, max_length=10)
    reporter_isos: list[str] = Field(
        default=["KOR"],
        description="보고국 ISO3 코드 목록",
        max_length=5,
    )
    partner_iso: str = Field(default="W00", description="상대국 ISO3 코드")
    period: str = Field(default="", description="기간 (YYYY-MM)")


class TradeRecordResponse(BaseModel):
    """정규화된 무역 데이터 레코드"""
    hsCode: str
    reporterIso: str
    partnerIso: str
    period: str
    flowType: str
    valueUsd: float
    weightKg: Optional[float] = None
    source: str


class TradeAggregateResponse(BaseModel):
    """수집 결과 응답"""
    records: list[TradeRecordResponse]
    totalCount: int
    sources: list[str]


class ComtradeQuotaResponse(BaseModel):
    """UN Comtrade 할당량 현황"""
    dailyLimit: int
    usedToday: int
    remaining: int
    isExhausted: bool
