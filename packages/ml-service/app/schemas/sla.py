"""SLA 모니터링 요청/응답 스키마"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# === 요청 스키마 ===

class SlaTargetConfig(BaseModel):
    """SLA 기준 설정"""
    delivery_on_time_target: float = Field(default=98.0, description="납기 준수율 목표 (%)")
    misshipment_rate_limit: float = Field(default=0.5, description="오배송률 한도 (%)")
    picking_accuracy_target: float = Field(default=99.5, description="피킹 정확도 목표 (%)")
    avg_processing_time_limit: float = Field(default=120, description="평균 처리 시간 한도 (분)")
    escalation_threshold: int = Field(default=3, description="에스컬레이션 연속 위반 횟수")


class DailyKpi(BaseModel):
    """일별 KPI 데이터"""
    record_date: date
    delivery_on_time_rate: float = Field(description="납기 준수율 (%)")
    misshipment_rate: float = Field(description="오배송률 (%)")
    picking_accuracy: float = Field(description="피킹 정확도 (%)")
    avg_processing_time: float = Field(description="평균 처리 시간 (분)")
    total_orders: int = Field(default=0)
    on_time_orders: int = Field(default=0)
    misshipment_count: int = Field(default=0)
    total_picks: int = Field(default=0)
    accurate_picks: int = Field(default=0)


class SlaEvaluationRequest(BaseModel):
    """SLA 평가 요청 — 일별 KPI 데이터를 기준으로 위반 여부를 판정"""
    company_id: str
    site_id: str
    target: SlaTargetConfig
    metrics: list[DailyKpi] = Field(..., min_length=1, description="평가할 일별 KPI 목록")


class SlaReportRequest(BaseModel):
    """SLA 리포트 생성 요청"""
    company_id: str
    site_id: str
    company_name: str = ""
    site_name: str = ""
    target: SlaTargetConfig
    metrics: list[DailyKpi] = Field(..., min_length=1)
    period_type: str = Field(default="weekly", description="리포트 기간 (weekly / monthly)")


# === 응답 스키마 ===

class ViolationDetail(BaseModel):
    """SLA 위반 상세"""
    metric_name: str = Field(description="위반 지표명")
    metric_label: str = Field(description="위반 지표 한국어명")
    target_value: float
    actual_value: float
    deviation: float = Field(description="목표 대비 편차")
    severity: str = Field(description="심각도 (warning / critical)")
    record_date: date


class SlaEvaluationResult(BaseModel):
    """SLA 평가 결과"""
    company_id: str
    site_id: str
    total_days: int
    violations: list[ViolationDetail]
    violation_count: int
    needs_escalation: bool = Field(description="에스컬레이션 필요 여부")
    consecutive_violation_days: int = Field(description="연속 위반 일수")
    summary: str = Field(description="요약 (한국어)")
    evaluated_at: datetime


class KpiSummary(BaseModel):
    """KPI 집계 요약"""
    avg_delivery_on_time_rate: float
    avg_misshipment_rate: float
    avg_picking_accuracy: float
    avg_processing_time: float
    total_orders: int
    total_picks: int
    delivery_on_time_met: bool
    misshipment_rate_met: bool
    picking_accuracy_met: bool
    processing_time_met: bool
    overall_score: float = Field(description="종합 달성 점수 (0~100)")


class SlaReportResult(BaseModel):
    """SLA 리포트"""
    company_id: str
    site_id: str
    company_name: str
    site_name: str
    period_type: str
    period_from: date
    period_to: date
    total_days: int
    target: SlaTargetConfig
    summary: KpiSummary
    daily_metrics: list[DailyKpi]
    violations: list[ViolationDetail]
    trend_analysis: dict = Field(description="추세 분석 (개선/악화 방향)")
    generated_at: datetime
