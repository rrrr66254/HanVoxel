"""품질 검수(QC) 분석 엔진 — 스코어카드 + SLA 연계"""

from collections import Counter, defaultdict
from datetime import datetime, timezone

import numpy as np

from app.schemas.qc import (
    InspectionSummary,
    MonthlyDefectTrend,
    QcSlaLinkRequest,
    SlaLinkResult,
    SupplierGrade,
    SupplierScorecardRequest,
    SupplierScorecardResult,
)

DEFECT_TYPE_LABELS = {
    "DAMAGED": "파손",
    "WRONG_ITEM": "오품",
    "WRONG_QTY": "수량 불일치",
    "EXPIRED": "유통기한 초과",
    "CONTAMINATED": "오염",
    "PACKAGING": "포장 불량",
    "OTHER": "기타",
}


def _compute_grade(defect_rate: float) -> tuple[SupplierGrade, float]:
    """불량률 기반 등급 및 점수 산정."""
    if defect_rate <= 0.5:
        grade = SupplierGrade.A
        score = 95 - defect_rate * 10
    elif defect_rate <= 1.5:
        grade = SupplierGrade.B
        score = 85 - (defect_rate - 0.5) * 10
    elif defect_rate <= 3.0:
        grade = SupplierGrade.C
        score = 70 - (defect_rate - 1.5) * 10
    else:
        grade = SupplierGrade.D
        score = max(0, 55 - (defect_rate - 3.0) * 5)
    return grade, round(score, 1)


def _trend_direction(values: list[float]) -> str:
    """간단한 추세 방향 판정."""
    if len(values) < 2:
        return "stable"
    x = np.arange(len(values), dtype=float)
    y = np.array(values, dtype=float)
    slope = float(np.polyfit(x, y, 1)[0])
    if slope < -0.05:
        return "improving"  # 불량률 감소 = 개선
    elif slope > 0.05:
        return "declining"  # 불량률 증가 = 악화
    return "stable"


def _generate_recommendations(
    grade: SupplierGrade,
    defect_rate: float,
    trend: str,
    top_defects: list[tuple[str, int]],
) -> list[str]:
    """등급/추세/불량 유형에 따른 권고사항 생성."""
    recs: list[str] = []
    if grade in (SupplierGrade.C, SupplierGrade.D):
        recs.append(f"전체 불량률 {defect_rate}%로 기준 초과 — 공급업체 품질 개선 회의 권장")
    if grade == SupplierGrade.D:
        recs.append("등급 D: 공급업체 교체 또는 긴급 시정조치 요청 필요")
    if trend == "declining":
        recs.append("불량률이 증가 추세 — 최근 납품 로트에 대한 전수검사 권장")
    if trend == "improving" and grade in (SupplierGrade.A, SupplierGrade.B):
        recs.append("품질이 개선 추세 — 현재 관리 수준 유지 권장")
    for dtype, qty in top_defects[:2]:
        label = DEFECT_TYPE_LABELS.get(dtype, dtype)
        recs.append(f"주요 불량 유형 '{label}'({qty}건) — 해당 항목 검수 강화 필요")
    if not recs:
        recs.append("현재 품질 수준 양호 — 정기 모니터링 지속")
    return recs


def analyze_supplier_scorecard(request: SupplierScorecardRequest) -> SupplierScorecardResult:
    """공급업체 품질 스코어카드 분석."""
    inspections = sorted(request.inspections, key=lambda i: i.inspection_date)

    # 월별 집계
    monthly_map: dict[str, dict] = defaultdict(lambda: {"total": 0, "defect": 0, "count": 0})
    for insp in inspections:
        key = insp.inspection_date.strftime("%Y-%m")
        monthly_map[key]["total"] += insp.total_qty
        monthly_map[key]["defect"] += insp.defect_qty
        monthly_map[key]["count"] += 1

    monthly_trend = [
        MonthlyDefectTrend(
            month=month,
            total_qty=d["total"],
            defect_qty=d["defect"],
            defect_rate=round(d["defect"] / d["total"] * 100, 2) if d["total"] > 0 else 0,
            inspection_count=d["count"],
        )
        for month, d in sorted(monthly_map.items())
    ]

    total_qty = sum(i.total_qty for i in inspections)
    total_defects = sum(i.defect_qty for i in inspections)
    overall_defect_rate = round(total_defects / total_qty * 100, 2) if total_qty > 0 else 0

    grade, quality_score = _compute_grade(overall_defect_rate)
    trend = _trend_direction([m.defect_rate for m in monthly_trend])

    # 불량 유형 분류
    type_counter: Counter[str] = Counter()
    for insp in inspections:
        for dt in insp.defect_types:
            type_counter[dt] += 1
    defect_type_breakdown = [
        {"type": t, "label": DEFECT_TYPE_LABELS.get(t, t), "count": c}
        for t, c in type_counter.most_common()
    ]

    recs = _generate_recommendations(grade, overall_defect_rate, trend, type_counter.most_common(3))

    return SupplierScorecardResult(
        supplier_id=request.supplier_id,
        supplier_name=request.supplier_name,
        grade=grade,
        quality_score=quality_score,
        overall_defect_rate=overall_defect_rate,
        total_inspections=len(inspections),
        total_qty=total_qty,
        total_defects=total_defects,
        monthly_trend=monthly_trend,
        defect_type_breakdown=defect_type_breakdown,
        trend_direction=trend,
        recommendations=recs,
        analyzed_at=datetime.now(timezone.utc),
    )


def analyze_qc_sla_link(request: QcSlaLinkRequest) -> SlaLinkResult:
    """QC 이슈가 SLA에 미치는 영향을 분석한다."""
    inbound = [i for i in request.inspections if i.type == "INBOUND"]
    outbound = [i for i in request.inspections if i.type == "OUTBOUND"]

    # 입고 불량 → 오배송에 영향 (불량품이 입고 후 그대로 출고될 확률)
    inbound_total = sum(i.total_qty for i in inbound)
    inbound_defect = sum(i.defect_qty for i in inbound)
    inbound_defect_rate = (inbound_defect / inbound_total * 100) if inbound_total > 0 else 0

    # 출고 불량 → 직접적 피킹 정확도 영향
    outbound_total = sum(i.total_qty for i in outbound)
    outbound_defect = sum(i.defect_qty for i in outbound)
    outbound_defect_rate = (outbound_defect / outbound_total * 100) if outbound_total > 0 else 0

    # 오배송 영향 추정: 입고 불량의 약 30%가 검수 누락으로 출고 오류에 기여
    misshipment_impact = round(inbound_defect_rate * 0.3, 3)
    # 피킹 정확도 영향: 출고 불량률이 직접 반영
    accuracy_impact = round(outbound_defect_rate, 3)

    # SLA 위반 위험도 판정
    issues: list[dict] = []
    if misshipment_impact > request.sla_misshipment_limit * 0.5:
        issues.append({
            "metric": "misshipment_rate",
            "label": "오배송률",
            "estimated_impact": misshipment_impact,
            "sla_limit": request.sla_misshipment_limit,
            "risk": "high" if misshipment_impact > request.sla_misshipment_limit else "medium",
        })

    effective_accuracy = 100 - accuracy_impact
    if effective_accuracy < request.sla_picking_accuracy_target:
        issues.append({
            "metric": "picking_accuracy",
            "label": "피킹 정확도",
            "estimated_impact": accuracy_impact,
            "sla_target": request.sla_picking_accuracy_target,
            "risk": "high" if effective_accuracy < request.sla_picking_accuracy_target - 1 else "medium",
        })

    if any(i.get("risk") == "high" for i in issues):
        risk = "high"
    elif issues:
        risk = "medium"
    else:
        risk = "low"

    # 요약 생성
    if risk == "low":
        summary = "현재 QC 불량 수준이 SLA 기준에 영향을 미치지 않습니다."
    elif risk == "medium":
        affected = ", ".join(i["label"] for i in issues)
        summary = f"QC 불량이 {affected} 지표에 잠재적 영향을 미칠 수 있습니다. 모니터링을 강화하세요."
    else:
        affected = ", ".join(i["label"] for i in issues)
        summary = f"[경고] QC 불량이 {affected} SLA 지표를 위반할 위험이 높습니다. 즉시 시정조치가 필요합니다."

    return SlaLinkResult(
        site_id=request.site_id,
        qc_issues_affecting_sla=issues,
        estimated_misshipment_impact=misshipment_impact,
        estimated_accuracy_impact=accuracy_impact,
        sla_violation_risk=risk,
        summary=summary,
        analyzed_at=datetime.now(timezone.utc),
    )
