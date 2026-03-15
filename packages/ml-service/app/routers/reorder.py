"""
HanVoxel — 자동 발주 추천 엔진 FastAPI 라우터

엔드포인트:
  POST /reorder/forecast      — SKU별 수요 예측
  POST /reorder/lead-time     — 공급업체 리드타임 분석
  POST /reorder/recommend     — 발주 추천 생성
  POST /reorder/auto-voucher  — 추천 기반 발주서 자동 생성 데이터
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter

from app.schemas.reorder import (
    ForecastRequest,
    ForecastResponse,
    LeadTimeAnalysisRequest,
    LeadTimeAnalysisResponse,
    LeadTimeStatsResponse,
    ReorderRequest,
    ReorderResponse,
    ReorderRecommendationResponse,
    AutoVoucherRequest,
    AutoVoucherResponse,
)
from app.services.reorder.demand_forecaster import (
    DemandForecaster,
    DailyPoint,
)
from app.services.reorder.lead_time_analyzer import (
    LeadTimeAnalyzer,
    LeadTimeRecord,
)
from app.services.reorder.reorder_engine import (
    ReorderEngine,
    SkuInventoryInfo,
)

router = APIRouter(tags=["reorder"])

forecaster = DemandForecaster()
lead_time_analyzer = LeadTimeAnalyzer()
reorder_engine = ReorderEngine()


@router.post("/reorder/forecast", response_model=ForecastResponse)
async def forecast_demand(req: ForecastRequest) -> ForecastResponse:
    """SKU별 수요 예측"""
    history = [
        DailyPoint(dt=date.fromisoformat(d.date), qty=d.qty)
        for d in req.history
    ]
    result = forecaster.forecast(
        sku=req.sku,
        history=history,
        horizon=req.horizon,
        model=req.model,
    )
    return ForecastResponse(
        sku=result.sku,
        horizon=result.horizon,
        model=result.model,
        dailyForecast=result.daily_forecast,
        totalForecast=result.total_forecast,
        mape=result.mape,
    )


@router.post("/reorder/lead-time", response_model=LeadTimeAnalysisResponse)
async def analyze_lead_time(
    req: LeadTimeAnalysisRequest,
) -> LeadTimeAnalysisResponse:
    """공급업체 리드타임 분석"""
    records = [
        LeadTimeRecord(
            partner_id=r.partnerId,
            partner_name=r.partnerName,
            sku=r.sku,
            order_date=date.fromisoformat(r.orderDate),
            received_date=(
                date.fromisoformat(r.receivedDate) if r.receivedDate else None
            ),
            actual_days=r.actualDays,
            order_qty=r.orderQty,
        )
        for r in req.records
    ]

    stats = lead_time_analyzer.analyze(records, sku=req.sku)

    return LeadTimeAnalysisResponse(
        stats=[
            LeadTimeStatsResponse(
                partnerId=s.partner_id,
                partnerName=s.partner_name,
                sku=s.sku,
                avgDays=s.avg_days,
                minDays=s.min_days,
                maxDays=s.max_days,
                medianDays=s.median_days,
                stdDays=s.std_days,
                sampleCount=s.sample_count,
                ciLower=s.ci_lower,
                ciUpper=s.ci_upper,
                trend=s.trend,
                reliabilityScore=s.reliability_score,
            )
            for s in stats
        ]
    )


@router.post("/reorder/recommend", response_model=ReorderResponse)
async def recommend_reorder(req: ReorderRequest) -> ReorderResponse:
    """발주 추천 생성"""
    # SKU 재고 정보 변환
    skus = [
        SkuInventoryInfo(
            sku=s.sku,
            item_name=s.itemName,
            site_id=s.siteId,
            current_qty=s.currentQty,
            safety_stock=s.safetyStock,
            min_order_qty=s.minOrderQty,
            order_unit=s.orderUnit,
        )
        for s in req.skus
    ]

    # 출고 이력 변환
    usage_history: dict[str, list[DailyPoint]] = {}
    for sku_key, daily_items in req.usageHistory.items():
        usage_history[sku_key] = [
            DailyPoint(dt=date.fromisoformat(d.date), qty=d.qty)
            for d in daily_items
        ]

    # 리드타임 이력 변환
    lt_records = [
        LeadTimeRecord(
            partner_id=r.partnerId,
            partner_name=r.partnerName,
            sku=r.sku,
            order_date=date.fromisoformat(r.orderDate),
            received_date=(
                date.fromisoformat(r.receivedDate) if r.receivedDate else None
            ),
            actual_days=r.actualDays,
            order_qty=r.orderQty,
        )
        for r in req.leadTimeRecords
    ]

    # 추천 생성
    recommendations = reorder_engine.generate_recommendations(
        skus=skus,
        usage_history=usage_history,
        lead_time_records=lt_records,
        forecast_horizon=req.forecastHorizon,
    )

    # 응답 변환
    items = [
        ReorderRecommendationResponse(
            sku=r.sku,
            itemName=r.item_name,
            siteId=r.site_id,
            currentQty=r.current_qty,
            safetyStock=r.safety_stock,
            stockoutDate=r.stockout_date.isoformat() if r.stockout_date else None,
            daysUntilOut=r.days_until_out,
            reorderQty=r.reorder_qty,
            partnerId=r.partner_id,
            partnerName=r.partner_name,
            avgLeadDays=r.avg_lead_days,
            orderByDate=r.order_by_date.isoformat() if r.order_by_date else None,
            urgency=r.urgency,
            forecastMeta=r.forecast_meta,
        )
        for r in recommendations
    ]

    # 요약
    urgency_counts = {}
    for r in recommendations:
        urgency_counts[r.urgency] = urgency_counts.get(r.urgency, 0) + 1

    summary = {
        "totalSkus": len(skus),
        "recommendedCount": len(recommendations),
        "urgencyCounts": urgency_counts,
    }

    return ReorderResponse(recommendations=items, summary=summary)


@router.post("/reorder/auto-voucher", response_model=AutoVoucherResponse)
async def create_auto_voucher(req: AutoVoucherRequest) -> AutoVoucherResponse:
    """추천 기반 발주서 자동 생성 데이터 (ERP 전표 형식)"""
    voucher_data = {
        "siteId": req.siteId,
        "type": "PURCHASE",
        "partnerId": req.partnerId,
        "partnerName": req.partnerName,
        "dueDate": req.dueDate,
        "lines": [
            {
                "sku": line.sku,
                "itemName": line.itemName,
                "qty": line.qty,
                "unitPrice": line.unitPrice,
                "amount": line.qty * line.unitPrice,
                "taxAmount": int(line.qty * line.unitPrice * 0.1),
            }
            for line in req.lines
        ],
        "note": req.note,
        "subtotal": sum(l.qty * l.unitPrice for l in req.lines),
        "taxAmount": sum(int(l.qty * l.unitPrice * 0.1) for l in req.lines),
        "totalAmount": sum(
            l.qty * l.unitPrice + int(l.qty * l.unitPrice * 0.1)
            for l in req.lines
        ),
    }

    return AutoVoucherResponse(vouchers=[voucher_data])
