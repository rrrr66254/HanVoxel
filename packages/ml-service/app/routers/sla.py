"""SLA 모니터링 API 라우터"""

from fastapi import APIRouter, HTTPException

from app.schemas.sla import (
    SlaEvaluationRequest,
    SlaReportRequest,
)
from app.services.sla_monitor import evaluate_sla, generate_sla_report

router = APIRouter(prefix="/sla", tags=["sla"])


@router.post("/evaluate", response_model=dict)
async def evaluate(request: SlaEvaluationRequest):
    """SLA 위반 여부 평가 — 일별 KPI 데이터를 기반으로 위반을 판정"""
    try:
        result = evaluate_sla(request)
        return {
            "success": True,
            "data": result.model_dump(mode="json"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report", response_model=dict)
async def report(request: SlaReportRequest):
    """SLA 리포트 생성 — 주간/월간 집계 + 추세 분석"""
    try:
        result = generate_sla_report(request)
        return {
            "success": True,
            "data": result.model_dump(mode="json"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
