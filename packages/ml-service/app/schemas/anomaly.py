"""이상 탐지 요청/응답 스키마"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class MetricType(str, Enum):
    """감시 대상 지표 유형"""
    INVENTORY_LEVEL = "inventory_level"       # 재고 수량
    PICKING_ERROR_RATE = "picking_error_rate"  # 피킹 오류율
    STOCK_MOVEMENT = "stock_movement"         # 입출고 건수
    ORDER_VOLUME = "order_volume"             # 주문량
    CYCLE_TIME = "cycle_time"                 # 작업 사이클 타임


class Severity(str, Enum):
    """알림 심각도"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DetectionMethod(str, Enum):
    """탐지 알고리즘"""
    Z_SCORE = "z_score"
    IQR = "iqr"
    ISOLATION_FOREST = "isolation_forest"
    ENSEMBLE = "ensemble"


# === 요청 스키마 ===

class DataPoint(BaseModel):
    """시계열 데이터 포인트"""
    timestamp: datetime
    value: float
    metadata: Optional[dict] = None


class AnomalyDetectionRequest(BaseModel):
    """이상 탐지 요청"""
    site_id: str = Field(..., description="사이트 ID")
    metric_type: MetricType = Field(..., description="지표 유형")
    data_points: list[DataPoint] = Field(..., min_length=10, description="시계열 데이터 (최소 10개)")
    method: DetectionMethod = Field(default=DetectionMethod.ENSEMBLE, description="탐지 알고리즘")
    sensitivity: float = Field(default=2.0, ge=1.0, le=5.0, description="민감도 (z-score 임계값)")


class BatchDetectionRequest(BaseModel):
    """다중 지표 일괄 탐지 요청"""
    site_id: str
    metrics: list[AnomalyDetectionRequest]


# === 응답 스키마 ===

class AnomalyPoint(BaseModel):
    """이상 탐지된 데이터 포인트"""
    timestamp: datetime
    value: float
    expected_min: float
    expected_max: float
    deviation: float = Field(description="정상 범위 대비 편차 (표준편차 단위)")
    method: DetectionMethod
    is_anomaly: bool


class AnomalyDetectionResult(BaseModel):
    """이상 탐지 결과"""
    site_id: str
    metric_type: MetricType
    method: DetectionMethod
    total_points: int
    anomaly_count: int
    anomaly_rate: float = Field(description="이상 비율 (%)")
    severity: Severity
    summary: str = Field(description="이상 탐지 요약 (한국어)")
    anomalies: list[AnomalyPoint]
    statistics: dict = Field(description="통계 정보 (mean, std, q1, q3 등)")
    detected_at: datetime


class AlertEvent(BaseModel):
    """알림 이벤트 (API Gateway로 전송)"""
    id: str
    site_id: str
    metric_type: MetricType
    severity: Severity
    title: str
    message: str
    anomaly_count: int
    detected_at: datetime
    metadata: Optional[dict] = None
