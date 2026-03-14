"""SLA 모니터링 엔진 — 위반 탐지 + 에스컬레이션 판정 + 리포트 생성"""

from datetime import datetime, timezone

import numpy as np

from app.schemas.sla import (
    DailyKpi,
    KpiSummary,
    SlaEvaluationRequest,
    SlaEvaluationResult,
    SlaReportRequest,
    SlaReportResult,
    SlaTargetConfig,
    ViolationDetail,
)

METRIC_DEFS = [
    {
        "name": "delivery_on_time",
        "label": "납기 준수율",
        "target_field": "delivery_on_time_target",
        "actual_field": "delivery_on_time_rate",
        "direction": "gte",  # 실측 >= 목표여야 달성
    },
    {
        "name": "misshipment_rate",
        "label": "오배송률",
        "target_field": "misshipment_rate_limit",
        "actual_field": "misshipment_rate",
        "direction": "lte",  # 실측 <= 한도여야 달성
    },
    {
        "name": "picking_accuracy",
        "label": "피킹 정확도",
        "target_field": "picking_accuracy_target",
        "actual_field": "picking_accuracy",
        "direction": "gte",
    },
    {
        "name": "avg_processing_time",
        "label": "평균 처리 시간",
        "target_field": "avg_processing_time_limit",
        "actual_field": "avg_processing_time",
        "direction": "lte",
    },
]


def _check_violation(
    target: SlaTargetConfig, kpi: DailyKpi
) -> list[ViolationDetail]:
    """하루치 KPI에 대해 SLA 위반 여부를 확인한다."""
    violations: list[ViolationDetail] = []
    for md in METRIC_DEFS:
        target_val = getattr(target, md["target_field"])
        actual_val = getattr(kpi, md["actual_field"])

        violated = (
            actual_val < target_val
            if md["direction"] == "gte"
            else actual_val > target_val
        )

        if violated:
            deviation = abs(actual_val - target_val)
            # 심각도 판정: 편차가 목표의 5% 이상이면 critical
            threshold_pct = target_val * 0.05 if target_val != 0 else 1.0
            severity = "critical" if deviation >= threshold_pct else "warning"

            violations.append(
                ViolationDetail(
                    metric_name=md["name"],
                    metric_label=md["label"],
                    target_value=target_val,
                    actual_value=round(actual_val, 4),
                    deviation=round(deviation, 4),
                    severity=severity,
                    record_date=kpi.record_date,
                )
            )
    return violations


def _count_consecutive_violation_days(metrics: list[DailyKpi], target: SlaTargetConfig) -> int:
    """최신일 기준으로 연속 위반 일수를 계산한다."""
    sorted_metrics = sorted(metrics, key=lambda m: m.record_date, reverse=True)
    consecutive = 0
    for kpi in sorted_metrics:
        day_violations = _check_violation(target, kpi)
        if day_violations:
            consecutive += 1
        else:
            break
    return consecutive


def evaluate_sla(request: SlaEvaluationRequest) -> SlaEvaluationResult:
    """SLA 위반 여부를 평가한다."""
    all_violations: list[ViolationDetail] = []
    for kpi in request.metrics:
        day_violations = _check_violation(request.target, kpi)
        all_violations.extend(day_violations)

    consecutive = _count_consecutive_violation_days(request.metrics, request.target)
    needs_escalation = consecutive >= request.target.escalation_threshold

    # 요약 생성
    if not all_violations:
        summary = f"총 {len(request.metrics)}일간 모든 SLA 지표가 목표를 달성했습니다."
    else:
        metric_names = list({v.metric_label for v in all_violations})
        critical_count = sum(1 for v in all_violations if v.severity == "critical")
        summary = (
            f"총 {len(request.metrics)}일간 {len(all_violations)}건의 SLA 위반이 발견되었습니다. "
            f"위반 지표: {', '.join(metric_names)}."
        )
        if needs_escalation:
            summary += f" {consecutive}일 연속 위반으로 에스컬레이션이 필요합니다."
        if critical_count > 0:
            summary += f" (긴급 {critical_count}건)"

    return SlaEvaluationResult(
        company_id=request.company_id,
        site_id=request.site_id,
        total_days=len(request.metrics),
        violations=all_violations,
        violation_count=len(all_violations),
        needs_escalation=needs_escalation,
        consecutive_violation_days=consecutive,
        summary=summary,
        evaluated_at=datetime.now(timezone.utc),
    )


def _compute_trend(values: list[float]) -> dict:
    """간단한 선형 추세 분석."""
    if len(values) < 2:
        return {"direction": "stable", "slope": 0.0}
    x = np.arange(len(values), dtype=float)
    y = np.array(values, dtype=float)
    slope = float(np.polyfit(x, y, 1)[0])
    if abs(slope) < 0.01:
        direction = "stable"
    elif slope > 0:
        direction = "improving"
    else:
        direction = "declining"
    return {"direction": direction, "slope": round(slope, 4)}


def generate_sla_report(request: SlaReportRequest) -> SlaReportResult:
    """SLA 리포트를 생성한다."""
    sorted_metrics = sorted(request.metrics, key=lambda m: m.record_date)

    # 위반 수집
    all_violations: list[ViolationDetail] = []
    for kpi in sorted_metrics:
        all_violations.extend(_check_violation(request.target, kpi))

    # KPI 집계
    delivery_rates = [m.delivery_on_time_rate for m in sorted_metrics]
    misship_rates = [m.misshipment_rate for m in sorted_metrics]
    pick_accs = [m.picking_accuracy for m in sorted_metrics]
    proc_times = [m.avg_processing_time for m in sorted_metrics]

    avg = lambda arr: sum(arr) / len(arr) if arr else 0.0

    avg_delivery = round(avg(delivery_rates), 2)
    avg_misship = round(avg(misship_rates), 3)
    avg_pick = round(avg(pick_accs), 2)
    avg_proc = round(avg(proc_times), 1)

    total_orders = sum(m.total_orders for m in sorted_metrics)
    total_picks = sum(m.total_picks for m in sorted_metrics)

    # 달성 점수 (4개 지표 각 25점)
    scores = []
    scores.append(25.0 if avg_delivery >= request.target.delivery_on_time_target else max(0, 25.0 * avg_delivery / request.target.delivery_on_time_target))
    scores.append(25.0 if avg_misship <= request.target.misshipment_rate_limit else max(0, 25.0 * (1 - (avg_misship - request.target.misshipment_rate_limit) / max(request.target.misshipment_rate_limit, 0.1))))
    scores.append(25.0 if avg_pick >= request.target.picking_accuracy_target else max(0, 25.0 * avg_pick / request.target.picking_accuracy_target))
    scores.append(25.0 if avg_proc <= request.target.avg_processing_time_limit else max(0, 25.0 * request.target.avg_processing_time_limit / max(avg_proc, 1)))

    summary = KpiSummary(
        avg_delivery_on_time_rate=avg_delivery,
        avg_misshipment_rate=avg_misship,
        avg_picking_accuracy=avg_pick,
        avg_processing_time=avg_proc,
        total_orders=total_orders,
        total_picks=total_picks,
        delivery_on_time_met=avg_delivery >= request.target.delivery_on_time_target,
        misshipment_rate_met=avg_misship <= request.target.misshipment_rate_limit,
        picking_accuracy_met=avg_pick >= request.target.picking_accuracy_target,
        processing_time_met=avg_proc <= request.target.avg_processing_time_limit,
        overall_score=round(sum(scores), 1),
    )

    trend_analysis = {
        "delivery_on_time": _compute_trend(delivery_rates),
        "misshipment_rate": _compute_trend(misship_rates),
        "picking_accuracy": _compute_trend(pick_accs),
        "avg_processing_time": _compute_trend(proc_times),
    }

    return SlaReportResult(
        company_id=request.company_id,
        site_id=request.site_id,
        company_name=request.company_name,
        site_name=request.site_name,
        period_type=request.period_type,
        period_from=sorted_metrics[0].record_date,
        period_to=sorted_metrics[-1].record_date,
        total_days=len(sorted_metrics),
        target=request.target,
        summary=summary,
        daily_metrics=sorted_metrics,
        violations=all_violations,
        trend_analysis=trend_analysis,
        generated_at=datetime.now(timezone.utc),
    )
