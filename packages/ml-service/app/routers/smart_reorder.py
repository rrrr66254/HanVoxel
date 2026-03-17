"""
HanVoxel — 스마트 발주 추천 엔진 FastAPI 라우터

엔드포인트:
  POST /smart-reorder/schedule         — 스마트 발주 스케줄 생성
  GET  /smart-reorder/predict-arrival   — 도착 예상일 예측
  GET  /smart-reorder/accuracy          — 예측 정확도 리포트
  POST /smart-reorder/train             — 수동 모델 재학습
  POST /smart-reorder/nightly           — 수동 야간 배치 실행
"""

from datetime import date, timedelta

from fastapi import APIRouter

from app.schemas.smart_reorder import (
    SmartScheduleRequest,
    SmartScheduleResponse,
    SmartScheduleItem,
    ScheduleSummary,
    LeadTimePredictionRequest,
    LeadTimePredictionResponse,
    ArrivalPredictionRequest,
    ArrivalPredictionResponse,
    AccuracyReportResponse,
    PerSkuAccuracy,
    PerVendorReliability,
    TrainRequest,
    TrainResponse,
    TrainResultItem,
    NightlyBatchResponse,
    CriticalAlertItem,
)
from app.services.reorder.demand_forecaster import DailyPoint
from app.services.reorder.smart_reorder import (
    LeadTimeInput,
    LeadTimePredictor,
    DemandForecasterV2,
    SkuContext,
    SmartReorderOrchestrator,
)
from app.services.reorder.nightly_smart_reorder import (
    NightlySmartReorderEngine,
)

router = APIRouter(tags=["smart-reorder"])

# 엔진 인스턴스 초기화
orchestrator = SmartReorderOrchestrator()
lead_time_predictor = LeadTimePredictor()
demand_forecaster = DemandForecasterV2()
nightly_engine = NightlySmartReorderEngine()


def _build_sku_contexts(req: SmartScheduleRequest) -> list[SkuContext]:
    """요청 데이터를 SkuContext 목록으로 변환"""
    contexts: list[SkuContext] = []
    for sku_input in req.skus:
        # 출고 이력 변환
        usage_history = [
            DailyPoint(
                dt=date.fromisoformat(d.date),
                qty=d.qty,
            )
            for d in sku_input.usageHistory
        ]

        # 리드타임 이력 변환
        lt_records = [
            LeadTimeInput(
                vendor_id=r.vendorId,
                vendor_name=r.vendorName,
                sku_code=r.skuCode,
                order_date=date.fromisoformat(r.orderDate),
                received_date=(
                    date.fromisoformat(r.receivedDate) if r.receivedDate else None
                ),
                actual_days=r.actualDays,
                order_qty=r.orderQty,
            )
            for r in sku_input.leadTimeRecords
        ]

        # 확정 수주 변환
        confirmed_orders = [
            {"date": o.date, "qty": o.qty}
            for o in sku_input.confirmedOrders
        ]

        contexts.append(SkuContext(
            sku_code=sku_input.skuCode,
            item_name=sku_input.itemName,
            site_id=req.siteId,
            current_stock=sku_input.currentStock,
            usage_history=usage_history,
            lead_time_records=lt_records,
            confirmed_orders=confirmed_orders,
            min_order_qty=sku_input.minOrderQty,
            order_unit=sku_input.orderUnit,
            order_cost=sku_input.orderCost,
            holding_cost_rate=sku_input.holdingCostRate,
            unit_price=sku_input.unitPrice,
        ))

    return contexts


@router.post(
    "/smart-reorder/schedule",
    response_model=SmartScheduleResponse,
)
async def generate_smart_schedule(
    req: SmartScheduleRequest,
) -> SmartScheduleResponse:
    """
    스마트 발주 스케줄 생성

    수요 예측 + 리드타임 예측 + EOQ + ROP 계산을 통합하여
    각 SKU별 최적 발주 시점과 수량을 추천한다.
    """
    contexts = _build_sku_contexts(req)

    # 스케줄 생성
    schedules = orchestrator.generate_smart_schedule(
        site_id=req.siteId,
        sku_contexts=contexts,
        horizon=req.horizonDays,
    )

    # 응답 변환
    items = [
        SmartScheduleItem(
            skuCode=s.sku_code,
            itemName=s.item_name,
            siteId=s.site_id,
            currentStock=s.current_stock,
            safetyStock=s.safety_stock,
            reorderPoint=s.reorder_point,
            avgDailyDemand=s.avg_daily_demand,
            forecastModel=s.forecast_model,
            forecastMape=s.forecast_mape,
            vendorId=s.vendor_id,
            vendorName=s.vendor_name,
            predictedLeadDays=s.predicted_lead_days,
            leadTimeConfidence=s.lead_time_confidence,
            leadTimeAlgorithm=s.lead_time_algorithm,
            stockoutDate=s.stockout_date.isoformat() if s.stockout_date else None,
            daysUntilStockout=s.days_until_stockout,
            recommendedOrderDate=s.recommended_order_date.isoformat() if s.recommended_order_date else None,
            daysUntilOrder=s.days_until_order,
            eoq=s.eoq,
            orderQty=s.order_qty,
            estimatedArrivalMin=s.estimated_arrival_min.isoformat() if s.estimated_arrival_min else None,
            estimatedArrivalAvg=s.estimated_arrival_avg.isoformat() if s.estimated_arrival_avg else None,
            estimatedArrivalMax=s.estimated_arrival_max.isoformat() if s.estimated_arrival_max else None,
            urgency=s.urgency,
            seasonalFactors=s.seasonal_factors,
            detectedEvents=s.detected_events,
        )
        for s in schedules
    ]

    # 긴급도별 카운트
    urgency_counts: dict[str, int] = {}
    for s in schedules:
        urgency_counts[s.urgency] = urgency_counts.get(s.urgency, 0) + 1

    # 평균 MAPE 계산
    mapes = [s.forecast_mape for s in schedules if s.forecast_mape is not None]
    avg_mape = round(sum(mapes) / len(mapes), 1) if mapes else None

    summary = ScheduleSummary(
        totalSkus=len(contexts),
        schedulesCreated=len(schedules),
        urgencyCounts=urgency_counts,
        avgForecastMape=avg_mape,
    )

    return SmartScheduleResponse(schedules=items, summary=summary)


@router.get(
    "/smart-reorder/predict-arrival",
    response_model=ArrivalPredictionResponse,
)
async def predict_arrival(
    vendorId: str,
    skuCode: str,
    orderDate: str,
) -> ArrivalPredictionResponse:
    """
    특정 공급업체+SKU+발주일 조합의 도착 예상일 예측

    리드타임 이력 데이터가 없으면 기본값(7일) 사용
    """
    order_dt = date.fromisoformat(orderDate)

    # 리드타임 예측 (이력 없이 기본값 사용)
    prediction = lead_time_predictor.predict(
        records=[],
        vendor_id=vendorId,
        sku_code=skuCode,
    )

    # 도착 예상일 계산
    arrival_min = order_dt + timedelta(days=int(prediction.min_days))
    arrival_avg = order_dt + timedelta(days=int(prediction.avg_days))
    arrival_max = order_dt + timedelta(days=int(prediction.max_days))

    return ArrivalPredictionResponse(
        vendorId=vendorId,
        skuCode=skuCode,
        orderDate=orderDate,
        estimatedArrivalMin=arrival_min.isoformat(),
        estimatedArrivalAvg=arrival_avg.isoformat(),
        estimatedArrivalMax=arrival_max.isoformat(),
        predictedLeadDays=prediction.predicted_days,
        confidence=prediction.confidence,
    )


@router.get(
    "/smart-reorder/accuracy",
    response_model=AccuracyReportResponse,
)
async def get_accuracy_report(
    siteId: str,
    periodDays: int = 30,
) -> AccuracyReportResponse:
    """
    예측 정확도 리포트

    수요 예측 MAPE와 공급업체 리드타임 신뢰도 요약.
    실제 운영에서는 DB에서 과거 예측/실제 데이터를 조회하여 계산하지만,
    현재는 빈 리포트를 반환한다 (데이터 축적 후 활성화).
    """
    today = date.today()

    return AccuracyReportResponse(
        overallMape=None,
        perSkuAccuracy=[],
        perVendorReliability=[],
        evaluationPeriodDays=periodDays,
        evaluatedAt=today.isoformat(),
    )


@router.post(
    "/smart-reorder/train",
    response_model=TrainResponse,
)
async def manual_train(req: TrainRequest) -> TrainResponse:
    """
    수동 모델 재학습

    지정한 SKU들의 수요 예측 모델을 즉시 재학습한다.
    """
    # SkuContext 변환 (TrainRequest → SmartScheduleRequest 형태 재활용)
    results: list[TrainResultItem] = []

    for sku_input in req.skus:
        # 출고 이력 변환
        usage_history = [
            DailyPoint(dt=date.fromisoformat(d.date), qty=d.qty)
            for d in sku_input.usageHistory
        ]

        if len(usage_history) < 21:
            continue

        # 재학습 전 정확도 (마지막 7일 홀드아웃)
        old_result = demand_forecaster.forecast(
            sku_code=sku_input.skuCode,
            history=usage_history[:-7],
            horizon=7,
        )

        # 재학습 (전체 데이터)
        new_result = demand_forecaster.forecast(
            sku_code=sku_input.skuCode,
            history=usage_history,
            horizon=7,
        )

        results.append(TrainResultItem(
            skuCode=sku_input.skuCode,
            modelType="DEMAND",
            oldMape=old_result.mape,
            newMape=new_result.mape,
            dataPointsUsed=len(usage_history),
        ))

    return TrainResponse(
        modelsRetrained=len(results),
        results=results,
    )


@router.post(
    "/smart-reorder/nightly",
    response_model=NightlyBatchResponse,
)
async def manual_nightly_batch(
    req: SmartScheduleRequest,
) -> NightlyBatchResponse:
    """
    수동 야간 배치 실행

    전체 SKU 재고 소진일 재계산, 스케줄 생성, 알림 발송을 수동 트리거한다.
    """
    contexts = _build_sku_contexts(req)

    # 배치 실행
    result = nightly_engine.run_nightly_batch(
        site_id=req.siteId,
        sku_contexts=contexts,
    )

    # 응답 변환
    critical_items = [
        CriticalAlertItem(
            skuCode=a.sku_code,
            itemName=a.item_name,
            siteId=a.site_id,
            currentStock=a.current_stock,
            daysUntilStockout=a.days_until_stockout,
            recommendedOrderDate=(
                a.recommended_order_date.isoformat() if a.recommended_order_date else None
            ),
            vendorId=a.vendor_id,
            vendorName=a.vendor_name,
            orderQty=a.order_qty,
            message=a.message,
        )
        for a in result.critical_alerts
    ]

    return NightlyBatchResponse(
        runDate=result.run_date.isoformat(),
        siteId=result.site_id,
        skusProcessed=result.skus_processed,
        schedulesCreated=result.schedules_created,
        criticalAlerts=critical_items,
        highAlertsCount=result.high_alerts_count,
        overallDemandMape=result.overall_demand_mape,
        overallLeadTimeMae=result.overall_lead_time_mae,
        modelsRetrained=len(result.models_retrained),
        vendorStatsUpdated=result.vendor_stats_updated,
        elapsedSeconds=result.elapsed_seconds,
    )
