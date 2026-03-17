"""
HanVoxel — 스마트 발주 추천 엔진 Pydantic 스키마

엔드포인트:
  POST /smart-reorder/schedule         — 스마트 발주 스케줄 생성
  GET  /smart-reorder/predict-arrival   — 도착 예상일 예측
  GET  /smart-reorder/accuracy          — 예측 정확도 리포트
  POST /smart-reorder/train             — 수동 모델 재학습
  POST /smart-reorder/nightly           — 수동 야간 배치 실행
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────
# 공통 입력 스키마
# ─────────────────────────────────────────────

class DailyUsageInput(BaseModel):
    """일별 출고 데이터"""
    date: str = Field(description="날짜 (YYYY-MM-DD)")
    qty: int = Field(ge=0, description="출고 수량")


class LeadTimeRecordInput(BaseModel):
    """리드타임 학습 레코드"""
    vendorId: str = Field(description="공급업체 ID")
    vendorName: str = Field(description="공급업체명")
    skuCode: str = Field(description="SKU 코드")
    orderDate: str = Field(description="발주일 (YYYY-MM-DD)")
    receivedDate: Optional[str] = Field(default=None, description="입고일 (YYYY-MM-DD)")
    actualDays: Optional[int] = Field(default=None, description="실제 리드타임 (일)")
    orderQty: int = Field(ge=1, description="발주 수량")


class ConfirmedOrderInput(BaseModel):
    """확정 수주 데이터"""
    date: str = Field(description="출고 예정일 (YYYY-MM-DD)")
    qty: int = Field(ge=1, description="확정 수량")


class SkuContextInput(BaseModel):
    """SKU별 분석 컨텍스트"""
    skuCode: str = Field(description="SKU 코드")
    itemName: str = Field(description="품목명")
    currentStock: int = Field(ge=0, description="현재 재고량")
    usageHistory: list[DailyUsageInput] = Field(min_length=1, description="과거 출고 이력")
    leadTimeRecords: list[LeadTimeRecordInput] = Field(default_factory=list, description="리드타임 이력")
    confirmedOrders: list[ConfirmedOrderInput] = Field(default_factory=list, description="확정 수주")
    minOrderQty: int = Field(default=1, ge=1, description="최소 발주 수량 (MOQ)")
    orderUnit: int = Field(default=1, ge=1, description="발주 단위 배수")
    orderCost: float = Field(default=50000.0, description="발주 1건 처리 비용 (원)")
    holdingCostRate: float = Field(default=0.25, description="연간 보관비율")
    unitPrice: float = Field(default=10000.0, description="SKU 단가 (원)")


# ─────────────────────────────────────────────
# 스마트 스케줄 요청/응답
# ─────────────────────────────────────────────

class SmartScheduleRequest(BaseModel):
    """스마트 발주 스케줄 생성 요청"""
    siteId: str = Field(description="사이트 ID")
    skus: list[SkuContextInput] = Field(min_length=1, description="SKU 컨텍스트 목록")
    horizonDays: int = Field(default=60, ge=7, le=180, description="예측 기간 (일)")


class SmartScheduleItem(BaseModel):
    """스마트 발주 스케줄 항목"""
    skuCode: str
    itemName: str
    siteId: str
    # 재고 현황
    currentStock: int
    safetyStock: int
    reorderPoint: int
    # 수요 예측
    avgDailyDemand: float
    forecastModel: str
    forecastMape: Optional[float] = None
    # 리드타임 예측
    vendorId: Optional[str] = None
    vendorName: Optional[str] = None
    predictedLeadDays: float
    leadTimeConfidence: str
    leadTimeAlgorithm: str
    # 발주 타이밍
    stockoutDate: Optional[str] = None
    daysUntilStockout: Optional[int] = None
    recommendedOrderDate: Optional[str] = None
    daysUntilOrder: Optional[int] = None
    # 발주량
    eoq: int
    orderQty: int
    # 도착 예상
    estimatedArrivalMin: Optional[str] = None
    estimatedArrivalAvg: Optional[str] = None
    estimatedArrivalMax: Optional[str] = None
    # 긴급도
    urgency: str
    # 메타데이터
    seasonalFactors: Optional[dict] = None
    detectedEvents: list[dict] = Field(default_factory=list)


class ScheduleSummary(BaseModel):
    """스케줄 요약 통계"""
    totalSkus: int
    schedulesCreated: int
    urgencyCounts: dict
    avgForecastMape: Optional[float] = None


class SmartScheduleResponse(BaseModel):
    """스마트 발주 스케줄 응답"""
    schedules: list[SmartScheduleItem]
    summary: ScheduleSummary


# ─────────────────────────────────────────────
# 리드타임 예측 요청/응답
# ─────────────────────────────────────────────

class LeadTimePredictionRequest(BaseModel):
    """리드타임 예측 요청"""
    vendorId: str = Field(description="공급업체 ID")
    skuCode: str = Field(description="SKU 코드")
    records: list[LeadTimeRecordInput] = Field(min_length=1, description="리드타임 이력")
    season: Optional[str] = Field(default=None, description="계절 (Q1~Q4)")
    orderQty: int = Field(default=1, ge=1, description="발주 수량")


class LeadTimePredictionResponse(BaseModel):
    """리드타임 예측 응답"""
    vendorId: str
    skuCode: str
    predictedDays: float
    minDays: float
    avgDays: float
    maxDays: float
    stdDays: float
    p90Days: float
    confidence: str
    algorithm: str
    sampleCount: int


# ─────────────────────────────────────────────
# 도착 예상 요청/응답
# ─────────────────────────────────────────────

class ArrivalPredictionRequest(BaseModel):
    """도착 예상일 예측 요청"""
    vendorId: str = Field(description="공급업체 ID")
    skuCode: str = Field(description="SKU 코드")
    orderDate: str = Field(description="발주 예정일 (YYYY-MM-DD)")
    records: list[LeadTimeRecordInput] = Field(default_factory=list, description="리드타임 이력")


class ArrivalPredictionResponse(BaseModel):
    """도착 예상일 예측 응답"""
    vendorId: str
    skuCode: str
    orderDate: str
    estimatedArrivalMin: str
    estimatedArrivalAvg: str
    estimatedArrivalMax: str
    predictedLeadDays: float
    confidence: str


# ─────────────────────────────────────────────
# 정확도 리포트 응답
# ─────────────────────────────────────────────

class PerSkuAccuracy(BaseModel):
    """SKU별 정확도"""
    skuCode: str
    demandMape: Optional[float] = None
    dataPoints: int


class PerVendorReliability(BaseModel):
    """공급업체별 신뢰도"""
    vendorId: str
    vendorName: str
    avgLeadDays: float
    stdDays: float
    onTimeRate: float
    sampleCount: int


class AccuracyReportResponse(BaseModel):
    """예측 정확도 리포트 응답"""
    overallMape: Optional[float] = None
    perSkuAccuracy: list[PerSkuAccuracy] = Field(default_factory=list)
    perVendorReliability: list[PerVendorReliability] = Field(default_factory=list)
    evaluationPeriodDays: int = 30
    evaluatedAt: str


# ─────────────────────────────────────────────
# 모델 재학습 요청/응답
# ─────────────────────────────────────────────

class TrainRequest(BaseModel):
    """수동 모델 재학습 요청"""
    siteId: str = Field(description="사이트 ID")
    skus: list[SkuContextInput] = Field(min_length=1, description="재학습 대상 SKU")


class TrainResultItem(BaseModel):
    """재학습 결과 항목"""
    skuCode: str
    modelType: str
    oldMape: Optional[float] = None
    newMape: Optional[float] = None
    dataPointsUsed: int


class TrainResponse(BaseModel):
    """모델 재학습 응답"""
    modelsRetrained: int
    results: list[TrainResultItem]


# ─────────────────────────────────────────────
# 야간 배치 응답
# ─────────────────────────────────────────────

class CriticalAlertItem(BaseModel):
    """긴급 알림 항목"""
    skuCode: str
    itemName: str
    siteId: str
    currentStock: int
    daysUntilStockout: int
    recommendedOrderDate: Optional[str] = None
    vendorId: Optional[str] = None
    vendorName: Optional[str] = None
    orderQty: int
    message: str


class NightlyBatchResponse(BaseModel):
    """야간 배치 실행 응답"""
    runDate: str
    siteId: str
    skusProcessed: int
    schedulesCreated: int
    criticalAlerts: list[CriticalAlertItem]
    highAlertsCount: int
    overallDemandMape: Optional[float] = None
    overallLeadTimeMae: Optional[float] = None
    modelsRetrained: int
    vendorStatsUpdated: int
    elapsedSeconds: float
