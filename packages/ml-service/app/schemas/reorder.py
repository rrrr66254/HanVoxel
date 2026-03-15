"""
HanVoxel — 자동 발주 추천 엔진 Pydantic 스키마
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


# --- 수요 예측 ---

class DailyUsageItem(BaseModel):
    """일별 출고 데이터"""
    date: str = Field(description="날짜 (YYYY-MM-DD)")
    qty: int = Field(ge=0, description="출고 수량")


class ForecastRequest(BaseModel):
    """수요 예측 요청"""
    siteId: str
    sku: str
    history: list[DailyUsageItem] = Field(
        min_length=1, description="과거 출고 이력"
    )
    horizon: int = Field(default=7, ge=1, le=90, description="예측 기간 (일)")
    model: str = Field(default="AUTO", description="AUTO | MOVING_AVG | LINEAR | PROPHET")


class ForecastResponse(BaseModel):
    """수요 예측 응답"""
    sku: str
    horizon: int
    model: str
    dailyForecast: list[dict]
    totalForecast: int
    mape: Optional[float] = None


# --- 리드타임 ---

class LeadTimeRecordInput(BaseModel):
    """리드타임 학습 데이터"""
    partnerId: str
    partnerName: str
    sku: str
    orderDate: str
    receivedDate: Optional[str] = None
    actualDays: Optional[int] = None
    orderQty: int = Field(ge=1)


class LeadTimeStatsResponse(BaseModel):
    """공급업체 리드타임 통계"""
    partnerId: str
    partnerName: str
    sku: Optional[str] = None
    avgDays: float
    minDays: int
    maxDays: int
    medianDays: float
    stdDays: float
    sampleCount: int
    ciLower: float
    ciUpper: float
    trend: float
    reliabilityScore: float


class LeadTimeAnalysisRequest(BaseModel):
    """리드타임 분석 요청"""
    siteId: str
    records: list[LeadTimeRecordInput]
    sku: Optional[str] = None


class LeadTimeAnalysisResponse(BaseModel):
    """리드타임 분석 응답"""
    stats: list[LeadTimeStatsResponse]


# --- 발주 추천 ---

class SkuInventoryInput(BaseModel):
    """SKU 현재 재고 정보"""
    sku: str
    itemName: str
    siteId: str
    currentQty: int = Field(ge=0)
    safetyStock: Optional[int] = None
    minOrderQty: int = Field(default=1, ge=1)
    orderUnit: int = Field(default=1, ge=1)


class ReorderRequest(BaseModel):
    """발주 추천 요청"""
    skus: list[SkuInventoryInput] = Field(min_length=1)
    usageHistory: dict[str, list[DailyUsageItem]]
    leadTimeRecords: list[LeadTimeRecordInput] = Field(default_factory=list)
    forecastHorizon: int = Field(default=30, ge=7, le=90)


class ReorderRecommendationResponse(BaseModel):
    """발주 추천 응답"""
    sku: str
    itemName: str
    siteId: str
    currentQty: int
    safetyStock: int
    stockoutDate: Optional[str] = None
    daysUntilOut: Optional[int] = None
    reorderQty: int
    partnerId: Optional[str] = None
    partnerName: Optional[str] = None
    avgLeadDays: Optional[int] = None
    orderByDate: Optional[str] = None
    urgency: str
    forecastMeta: dict


class ReorderResponse(BaseModel):
    """발주 추천 전체 응답"""
    recommendations: list[ReorderRecommendationResponse]
    summary: dict


# --- 발주서 자동 생성 ---

class AutoVoucherLineInput(BaseModel):
    """발주서 라인"""
    sku: str
    itemName: str
    qty: int
    unitPrice: int = Field(default=0)


class AutoVoucherRequest(BaseModel):
    """발주서 자동 생성 요청"""
    siteId: str
    partnerId: str
    partnerName: str
    dueDate: Optional[str] = None
    lines: list[AutoVoucherLineInput]
    note: str = ""


class AutoVoucherResponse(BaseModel):
    """발주서 자동 생성 응답"""
    vouchers: list[dict]
