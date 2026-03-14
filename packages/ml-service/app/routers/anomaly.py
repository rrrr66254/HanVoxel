"""이상 탐지 API 라우터"""

from fastapi import APIRouter, HTTPException

from app.schemas.anomaly import (
    AnomalyDetectionRequest,
    AnomalyDetectionResult,
    AlertEvent,
    BatchDetectionRequest,
)
from app.services.anomaly_detector import detect_anomalies, create_alert_event

router = APIRouter(prefix="/anomaly", tags=["anomaly"])


@router.post("/detect", response_model=dict)
async def detect(request: AnomalyDetectionRequest):
    """단일 지표 이상 탐지"""
    try:
        result = detect_anomalies(request)
        alert = create_alert_event(result)
        return {
            "success": True,
            "data": {
                "result": result.model_dump(mode="json"),
                "alert": alert.model_dump(mode="json") if alert else None,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-detect", response_model=dict)
async def batch_detect(request: BatchDetectionRequest):
    """다중 지표 일괄 이상 탐지"""
    try:
        results = []
        alerts = []
        for metric_req in request.metrics:
            result = detect_anomalies(metric_req)
            results.append(result.model_dump(mode="json"))
            alert = create_alert_event(result)
            if alert:
                alerts.append(alert.model_dump(mode="json"))
        return {
            "success": True,
            "data": {
                "results": results,
                "alerts": alerts,
                "total_metrics": len(results),
                "total_alerts": len(alerts),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """ML 서비스 헬스체크"""
    return {"status": "ok", "service": "ml-anomaly-detector", "version": "0.1.0"}
