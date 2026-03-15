"""업계 벤치마크 Pydantic 스키마"""

from pydantic import BaseModel, Field
from typing import Optional


class CompanyMetricsItem(BaseModel):
    """개별 회사 KPI"""
    company_id: str
    site_id: str
    picking_accuracy: float = Field(default=0, description="피킹 정확도 (%)")
    inventory_turnover: float = Field(default=0, description="재고회전율 (회/년)")
    space_utilization: float = Field(default=0, description="공간활용률 (%)")
    on_time_delivery: float = Field(default=0, description="납기준수율 (%)")
    receiving_time: float = Field(default=0, description="입고처리 시간 (시간)")
    order_cycle_time: float = Field(default=0, description="주문처리 시간 (시간)")


# ── 집계 ──

class AggregateRequest(BaseModel):
    """벤치마크 집계 요청"""
    period: str = Field(..., description="집계 기간 (YYYY-MM)")
    industry: str = Field(..., description="업종")
    company_size: str = Field(..., description="회사 규모")
    metrics_list: list[CompanyMetricsItem] = Field(..., description="참여 회사 KPI 목록")


class PercentileResponse(BaseModel):
    p25: float = 0
    p50: float = 0
    p75: float = 0
    p90: float = 0


class AggregateResponse(BaseModel):
    period: str
    industry: str
    company_size: str
    participant_count: int
    averages: dict[str, float]
    percentiles: dict[str, dict]


# ── 순위 ──

class RankRequest(BaseModel):
    """개별 회사 순위 요청"""
    company: CompanyMetricsItem
    benchmark: AggregateResponse
    all_values: dict[str, list[float]] = Field(..., description="KPI별 전체 값 목록")


class RankResponse(BaseModel):
    company_id: str
    site_id: str
    metrics: dict[str, float]
    percentile_ranks: dict[str, float]
    overall_score: float


# ── 개선 권고 ──

class RecommendationItem(BaseModel):
    kpi: str
    kpi_label: str
    current_value: float
    industry_avg: float
    industry_p75: float
    gap_percent: float
    priority: str
    message: str


class RecommendationsRequest(BaseModel):
    company: CompanyMetricsItem
    benchmark: AggregateResponse


class RecommendationsResponse(BaseModel):
    recommendations: list[RecommendationItem]


# ── 리포트 ──

class ReportRequest(BaseModel):
    company: CompanyMetricsItem
    benchmark: AggregateResponse
    rank: RankResponse
    recommendations: list[RecommendationItem]
    company_name: str = ""
    site_name: str = ""


class ReportResponse(BaseModel):
    title: str
    report_data: dict
