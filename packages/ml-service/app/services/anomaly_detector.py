"""이상 탐지 엔진 — Z-Score, IQR, Isolation Forest, Ensemble"""

from datetime import datetime, timezone
from uuid import uuid4

import numpy as np
from sklearn.ensemble import IsolationForest

from app.schemas.anomaly import (
    AnomalyDetectionRequest,
    AnomalyDetectionResult,
    AnomalyPoint,
    AlertEvent,
    DetectionMethod,
    MetricType,
    Severity,
)


# ── 개별 탐지 알고리즘 ──────────────────────────────────────────


def _detect_z_score(
    values: np.ndarray, sensitivity: float
) -> tuple[np.ndarray, float, float, float, float]:
    """Z-Score 기반 이상 탐지. 평균 ± sensitivity*std 범위를 벗어나면 이상."""
    mean = float(np.mean(values))
    std = float(np.std(values, ddof=1)) if len(values) > 1 else 1.0
    if std == 0:
        std = 1.0
    z_scores = np.abs((values - mean) / std)
    is_anomaly = z_scores > sensitivity
    return is_anomaly, mean, std, mean - sensitivity * std, mean + sensitivity * std


def _detect_iqr(
    values: np.ndarray, sensitivity: float
) -> tuple[np.ndarray, float, float, float, float]:
    """IQR 기반 이상 탐지. Q1 - k*IQR ~ Q3 + k*IQR 범위를 벗어나면 이상."""
    q1 = float(np.percentile(values, 25))
    q3 = float(np.percentile(values, 75))
    iqr = q3 - q1
    if iqr == 0:
        iqr = 1.0
    k = sensitivity * 0.75  # sensitivity를 IQR 배수로 변환
    lower = q1 - k * iqr
    upper = q3 + k * iqr
    is_anomaly = (values < lower) | (values > upper)
    mean = float(np.mean(values))
    std = float(np.std(values, ddof=1)) if len(values) > 1 else 1.0
    return is_anomaly, mean, std, lower, upper


def _detect_isolation_forest(
    values: np.ndarray, sensitivity: float
) -> tuple[np.ndarray, float, float, float, float]:
    """Isolation Forest 기반 이상 탐지."""
    contamination = max(0.01, min(0.5, 1.0 / sensitivity / 10))
    X = values.reshape(-1, 1)
    model = IsolationForest(
        contamination=contamination, random_state=42, n_estimators=100
    )
    preds = model.fit_predict(X)
    is_anomaly = preds == -1

    mean = float(np.mean(values))
    std = float(np.std(values, ddof=1)) if len(values) > 1 else 1.0
    if std == 0:
        std = 1.0
    lower = mean - sensitivity * std
    upper = mean + sensitivity * std
    return is_anomaly, mean, std, lower, upper


# ── 앙상블 ──────────────────────────────────────────────────────


def _detect_ensemble(
    values: np.ndarray, sensitivity: float
) -> tuple[np.ndarray, float, float, float, float, DetectionMethod]:
    """3가지 알고리즘 중 2개 이상이 이상으로 판정하면 이상."""
    z_anom, mean, std, z_lo, z_hi = _detect_z_score(values, sensitivity)
    iqr_anom, _, _, iqr_lo, iqr_hi = _detect_iqr(values, sensitivity)
    iso_anom, _, _, iso_lo, iso_hi = _detect_isolation_forest(values, sensitivity)

    votes = z_anom.astype(int) + iqr_anom.astype(int) + iso_anom.astype(int)
    is_anomaly = votes >= 2

    lower = max(z_lo, iqr_lo, iso_lo)
    upper = min(z_hi, iqr_hi, iso_hi)
    return is_anomaly, mean, std, lower, upper, DetectionMethod.ENSEMBLE


# ── 심각도 판정 ─────────────────────────────────────────────────


def _determine_severity(anomaly_rate: float, metric_type: MetricType) -> Severity:
    """이상 비율과 지표 유형에 따라 심각도 결정."""
    critical_metrics = {MetricType.PICKING_ERROR_RATE, MetricType.INVENTORY_LEVEL}
    if anomaly_rate >= 15 or (anomaly_rate >= 10 and metric_type in critical_metrics):
        return Severity.CRITICAL
    if anomaly_rate >= 5:
        return Severity.WARNING
    return Severity.INFO


METRIC_LABELS: dict[MetricType, str] = {
    MetricType.INVENTORY_LEVEL: "재고 수량",
    MetricType.PICKING_ERROR_RATE: "피킹 오류율",
    MetricType.STOCK_MOVEMENT: "입출고 건수",
    MetricType.ORDER_VOLUME: "주문량",
    MetricType.CYCLE_TIME: "작업 사이클 타임",
}

SEVERITY_LABELS: dict[Severity, str] = {
    Severity.INFO: "정보",
    Severity.WARNING: "경고",
    Severity.CRITICAL: "긴급",
}


def _build_summary(
    metric_type: MetricType,
    severity: Severity,
    anomaly_count: int,
    total: int,
    method: DetectionMethod,
) -> str:
    metric_label = METRIC_LABELS.get(metric_type, metric_type.value)
    sev_label = SEVERITY_LABELS.get(severity, severity.value)
    return (
        f"[{sev_label}] {metric_label} 지표에서 {total}개 데이터 중 "
        f"{anomaly_count}건의 이상이 탐지되었습니다. (탐지 방법: {method.value})"
    )


# ── 메인 탐지 함수 ──────────────────────────────────────────────


def detect_anomalies(request: AnomalyDetectionRequest) -> AnomalyDetectionResult:
    """요청에 따라 이상 탐지를 수행하고 결과를 반환한다."""
    values = np.array([dp.value for dp in request.data_points])
    timestamps = [dp.timestamp for dp in request.data_points]
    method = request.method

    if method == DetectionMethod.Z_SCORE:
        is_anomaly, mean, std, lower, upper = _detect_z_score(values, request.sensitivity)
    elif method == DetectionMethod.IQR:
        is_anomaly, mean, std, lower, upper = _detect_iqr(values, request.sensitivity)
    elif method == DetectionMethod.ISOLATION_FOREST:
        is_anomaly, mean, std, lower, upper = _detect_isolation_forest(values, request.sensitivity)
    else:  # ENSEMBLE
        is_anomaly, mean, std, lower, upper, method = _detect_ensemble(values, request.sensitivity)

    anomaly_points: list[AnomalyPoint] = []
    for i, (ts, val, anom) in enumerate(zip(timestamps, values, is_anomaly)):
        deviation = abs(float(val) - mean) / std if std else 0.0
        anomaly_points.append(
            AnomalyPoint(
                timestamp=ts,
                value=float(val),
                expected_min=lower,
                expected_max=upper,
                deviation=round(deviation, 2),
                method=method,
                is_anomaly=bool(anom),
            )
        )

    anomaly_count = int(np.sum(is_anomaly))
    total = len(values)
    anomaly_rate = round(anomaly_count / total * 100, 2) if total else 0.0
    severity = _determine_severity(anomaly_rate, request.metric_type)

    q1 = float(np.percentile(values, 25))
    q3 = float(np.percentile(values, 75))
    statistics = {
        "mean": round(mean, 4),
        "std": round(std, 4),
        "min": round(float(np.min(values)), 4),
        "max": round(float(np.max(values)), 4),
        "q1": round(q1, 4),
        "q3": round(q3, 4),
        "median": round(float(np.median(values)), 4),
    }

    return AnomalyDetectionResult(
        site_id=request.site_id,
        metric_type=request.metric_type,
        method=method,
        total_points=total,
        anomaly_count=anomaly_count,
        anomaly_rate=anomaly_rate,
        severity=severity,
        summary=_build_summary(method=method, metric_type=request.metric_type, severity=severity, anomaly_count=anomaly_count, total=total),
        anomalies=anomaly_points,
        statistics=statistics,
        detected_at=datetime.now(timezone.utc),
    )


def create_alert_event(result: AnomalyDetectionResult) -> AlertEvent | None:
    """WARNING 이상일 때 알림 이벤트를 생성한다."""
    if result.severity == Severity.INFO:
        return None
    return AlertEvent(
        id=str(uuid4()),
        site_id=result.site_id,
        metric_type=result.metric_type,
        severity=result.severity,
        title=f"{METRIC_LABELS.get(result.metric_type, result.metric_type.value)} 이상 탐지",
        message=result.summary,
        anomaly_count=result.anomaly_count,
        detected_at=result.detected_at,
        metadata=result.statistics,
    )
