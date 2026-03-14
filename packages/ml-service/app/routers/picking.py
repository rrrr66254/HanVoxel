"""피킹 정책 엔진 API 라우터"""

from fastapi import APIRouter, HTTPException

from app.schemas.picking import PickingOptimizationRequest
from app.services.picking_engine import optimize_picking

router = APIRouter(prefix="/picking", tags=["picking"])


@router.post("/optimize", response_model=dict)
async def optimize(request: PickingOptimizationRequest):
    """FIFO/FEFO/NEAREST 정책 기반 피킹 최적화 — bin 할당 + 경로 순서"""
    try:
        result = optimize_picking(request)
        return {
            "success": True,
            "data": result.model_dump(mode="json"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
