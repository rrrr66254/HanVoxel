"""품질 검수(QC) 분석 요청/응답 스키마"""

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class DefectType(str, Enum):
    """불량 유형"""
    DAMAGED = "DAMAGED"              # 파손
    WRONG_ITEM = "WRONG_ITEM"        # 오품
    WRONG_QTY = "WRONG_QTY"          # 수량 불일치
    EXPIRED = "EXPIRED"              # 유통기한 초과
    CONTAMINATED = "CONTAMINATED"    # 오염
    PACKAGING = "PACKAGING"          # 포장 불량
    OTHER = "OTHER"                  # 기타


class SupplierGrade(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


# === 요청 스키마 ===

class InspectionSummary(BaseModel):
    """검수 요약 데이터"""
    inspection_id: str
    supplier_id: str
    supplier_name: str = ""
    inspection_date: date
    type: str = Field(description="INBOUND / OUTBOUND")
    total_qty: int
    defect_qty: int
    defect_rate: float
    defect_types: list[str] = []


class SupplierScorecardRequest(BaseModel):
    """공급업체 스코어카드 분석 요청"""
    supplier_id: str
    supplier_name: str = ""
    inspections: list[InspectionSummary] = Field(..., min_length=1)


class QcSlaLinkRequest(BaseModel):
    """QC 이슈 → SLA 위반 연계 분석 요청"""
    site_id: str
    inspections: list[InspectionSummary]
    sla_misshipment_limit: float = Field(default=0.5, description="SLA 오배송률 한도 (%)")
    sla_picking_accuracy_target: float = Field(default=99.5, description="SLA 피킹 정확도 목표 (%)")


# === 응답 스키마 ===

class MonthlyDefectTrend(BaseModel):
    """월별 불량률 추이"""
    month: str
    total_qty: int
    defect_qty: int
    defect_rate: float
    inspection_count: int


class SupplierScorecardResult(BaseModel):
    """공급업체 스코어카드 결과"""
    supplier_id: str
    supplier_name: str
    grade: SupplierGrade
    quality_score: float = Field(description="품질 점수 (0~100)")
    overall_defect_rate: float
    total_inspections: int
    total_qty: int
    total_defects: int
    monthly_trend: list[MonthlyDefectTrend]
    defect_type_breakdown: list[dict]
    trend_direction: str = Field(description="추세 방향 (improving / stable / declining)")
    recommendations: list[str] = Field(description="개선 권고사항 (한국어)")
    analyzed_at: datetime


class SlaLinkResult(BaseModel):
    """QC → SLA 연계 분석 결과"""
    site_id: str
    qc_issues_affecting_sla: list[dict]
    estimated_misshipment_impact: float = Field(description="QC 불량이 오배송률에 미치는 추정 영향 (%)")
    estimated_accuracy_impact: float = Field(description="QC 불량이 피킹 정확도에 미치는 추정 영향 (%)")
    sla_violation_risk: str = Field(description="SLA 위반 위험도 (low / medium / high)")
    summary: str
    analyzed_at: datetime
