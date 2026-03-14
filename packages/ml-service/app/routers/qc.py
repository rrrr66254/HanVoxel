"""품질 검수(QC) 분석 API 라우터"""

from fastapi import APIRouter, HTTPException

from app.schemas.qc import (
    SupplierScorecardRequest,
    QcSlaLinkRequest,
)
from app.services.qc_analyzer import analyze_supplier_scorecard, analyze_qc_sla_link

router = APIRouter(prefix="/qc", tags=["qc"])


@router.post("/scorecard", response_model=dict)
async def scorecard(request: SupplierScorecardRequest):
    """공급업체 품질 스코어카드 분석"""
    try:
        result = analyze_supplier_scorecard(request)
        return {
            "success": True,
            "data": result.model_dump(mode="json"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sla-link", response_model=dict)
async def sla_link(request: QcSlaLinkRequest):
    """QC 이슈 → SLA 위반 연계 분석"""
    try:
        result = analyze_qc_sla_link(request)
        return {
            "success": True,
            "data": result.model_dump(mode="json"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
