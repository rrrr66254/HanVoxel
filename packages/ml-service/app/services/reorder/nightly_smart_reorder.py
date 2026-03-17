"""
HanVoxel — 스마트 발주 야간 배치 엔진 (Nightly Smart Reorder)

야간 배치 작업:
  1. 전체 SKU 재고 소진일 재계산
  2. 7일 이내 발주 필요 SKU → smart_reorder_schedule 생성
  3. 오늘 발주 안 하면 재고 소진되는 SKU → CRITICAL 알림
  4. 과거 예측 vs 실제 정확도 모니터링
  5. 신규 데이터 10건 이상 시 모델 자동 재학습
  6. vendor_lead_time_stats 테이블 업데이트
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

import numpy as np

from .demand_forecaster import DailyPoint
from .smart_reorder import (
    DemandForecasterV2,
    LeadTimeInput,
    LeadTimePredictor,
    OptimalOrderQtyCalculator,
    ReorderTimingEngine,
    SkuContext,
    SmartReorderOrchestrator,
    SmartReorderSchedule,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# 배치 결과 데이터 클래스
# ─────────────────────────────────────────────

@dataclass
class CriticalAlert:
    """긴급 발주 알림"""
    sku_code: str
    item_name: str
    site_id: str
    current_stock: int
    days_until_stockout: int
    recommended_order_date: Optional[date]
    vendor_id: Optional[str]
    vendor_name: Optional[str]
    order_qty: int
    message: str


@dataclass
class AccuracyMetric:
    """예측 정확도 메트릭"""
    sku_code: str
    metric_type: str  # "DEMAND_MAPE" | "LEAD_TIME_MAE"
    predicted_value: float
    actual_value: float
    error_pct: float
    evaluation_date: date


@dataclass
class ModelRetrainResult:
    """모델 재학습 결과"""
    sku_code: str
    model_type: str  # "DEMAND" | "LEAD_TIME"
    old_mape: Optional[float]
    new_mape: Optional[float]
    data_points_used: int
    retrained_at: date


@dataclass
class VendorLeadTimeStats:
    """공급업체 리드타임 통계 (업데이트용)"""
    vendor_id: str
    vendor_name: str
    sku_code: Optional[str]
    avg_days: float
    min_days: float
    max_days: float
    std_days: float
    p90_days: float
    sample_count: int
    reliability_score: float
    last_updated: date


@dataclass
class NightlyBatchResult:
    """야간 배치 실행 결과"""
    run_date: date
    site_id: str
    # 처리 현황
    skus_processed: int
    schedules_created: int
    # 알림
    critical_alerts: list[CriticalAlert]
    high_alerts_count: int
    # 정확도
    accuracy_metrics: list[AccuracyMetric]
    overall_demand_mape: Optional[float]
    overall_lead_time_mae: Optional[float]
    # 재학습
    models_retrained: list[ModelRetrainResult]
    # 공급업체 통계 업데이트
    vendor_stats_updated: int
    # 소요 시간
    elapsed_seconds: float = 0.0


# ─────────────────────────────────────────────
# 야간 배치 엔진
# ─────────────────────────────────────────────

class NightlySmartReorderEngine:
    """
    야간 배치 스마트 발주 엔진

    매일 자정에 실행되어:
      1. 전체 SKU 재고 소진일 재계산
      2. 7일 이내 발주 필요 SKU 스케줄 생성
      3. CRITICAL 긴급 알림 발송
      4. 예측 정확도 모니터링
      5. 모델 자동 재학습
      6. 공급업체 리드타임 통계 업데이트
    """

    # 발주 스케줄 생성 임계일 (추천 발주일이 N일 이내인 SKU)
    SCHEDULE_HORIZON_DAYS = 7
    # 모델 재학습 최소 신규 데이터 수
    RETRAIN_MIN_NEW_DATA = 10
    # 예측 정확도 평가 기간 (일)
    ACCURACY_EVAL_DAYS = 7

    def __init__(self):
        self.orchestrator = SmartReorderOrchestrator()
        self.demand_forecaster = DemandForecasterV2()
        self.lead_time_predictor = LeadTimePredictor()
        self.qty_calculator = OptimalOrderQtyCalculator()
        self.timing_engine = ReorderTimingEngine()

    def run_nightly_batch(
        self,
        site_id: str,
        sku_contexts: list[SkuContext],
        past_forecasts: Optional[list[dict]] = None,
        past_lead_time_predictions: Optional[list[dict]] = None,
    ) -> NightlyBatchResult:
        """
        야간 배치 메인 실행 함수

        Args:
            site_id: 사이트 ID
            sku_contexts: 전체 SKU 컨텍스트 목록
            past_forecasts: 과거 수요 예측 기록 [{sku, date, predicted_qty, actual_qty}]
            past_lead_time_predictions: 과거 리드타임 예측 [{vendor_id, sku, predicted_days, actual_days}]
        """
        import time
        start_time = time.time()

        today = date.today()
        logger.info(f"[야간배치] 시작 — site_id={site_id}, SKU 수={len(sku_contexts)}")

        # 1) 전체 SKU 재고 소진일 재계산 + 스케줄 생성
        all_schedules = self.orchestrator.generate_smart_schedule(
            site_id=site_id,
            sku_contexts=sku_contexts,
            horizon=60,
        )
        logger.info(f"[야간배치] 전체 스케줄 생성 완료: {len(all_schedules)}건")

        # 2) 7일 이내 발주 필요 SKU 필터
        urgent_schedules = [
            s for s in all_schedules
            if s.days_until_order is not None
            and s.days_until_order <= self.SCHEDULE_HORIZON_DAYS
        ]
        logger.info(f"[야간배치] 7일 내 발주 필요: {len(urgent_schedules)}건")

        # 3) CRITICAL 알림 생성
        critical_alerts = self._generate_critical_alerts(all_schedules, today)
        high_count = sum(1 for s in all_schedules if s.urgency == "HIGH")
        logger.info(f"[야간배치] CRITICAL 알림: {len(critical_alerts)}건, HIGH: {high_count}건")

        # 4) 예측 정확도 모니터링
        accuracy_metrics = self._evaluate_accuracy(
            past_forecasts=past_forecasts or [],
            past_lead_time_predictions=past_lead_time_predictions or [],
        )

        # 전체 MAPE / MAE 계산
        demand_mapes = [
            m.error_pct for m in accuracy_metrics if m.metric_type == "DEMAND_MAPE"
        ]
        lt_maes = [
            m.error_pct for m in accuracy_metrics if m.metric_type == "LEAD_TIME_MAE"
        ]
        overall_demand_mape = round(float(np.mean(demand_mapes)), 1) if demand_mapes else None
        overall_lt_mae = round(float(np.mean(lt_maes)), 1) if lt_maes else None
        logger.info(f"[야간배치] 정확도 — MAPE: {overall_demand_mape}, LT-MAE: {overall_lt_mae}")

        # 5) 모델 자동 재학습
        retrain_results = self._auto_retrain_models(sku_contexts)
        logger.info(f"[야간배치] 모델 재학습: {len(retrain_results)}건")

        # 6) 공급업체 리드타임 통계 업데이트
        vendor_stats = self._update_vendor_stats(sku_contexts)
        logger.info(f"[야간배치] 공급업체 통계 업데이트: {len(vendor_stats)}건")

        elapsed = time.time() - start_time
        logger.info(f"[야간배치] 완료 — {elapsed:.1f}초 소요")

        return NightlyBatchResult(
            run_date=today,
            site_id=site_id,
            skus_processed=len(sku_contexts),
            schedules_created=len(urgent_schedules),
            critical_alerts=critical_alerts,
            high_alerts_count=high_count,
            accuracy_metrics=accuracy_metrics,
            overall_demand_mape=overall_demand_mape,
            overall_lead_time_mae=overall_lt_mae,
            models_retrained=retrain_results,
            vendor_stats_updated=len(vendor_stats),
            elapsed_seconds=round(elapsed, 2),
        )

    def _generate_critical_alerts(
        self,
        schedules: list[SmartReorderSchedule],
        today: date,
    ) -> list[CriticalAlert]:
        """
        CRITICAL 알림 생성

        오늘 발주 안 하면 재고 소진되는 SKU를 감지
        """
        alerts: list[CriticalAlert] = []

        for s in schedules:
            if s.urgency != "CRITICAL":
                continue

            # 알림 메시지 생성
            if s.days_until_stockout is not None and s.days_until_stockout <= 0:
                msg = (
                    f"[긴급] {s.item_name}({s.sku_code}) 재고 소진 임박! "
                    f"현재 재고: {s.current_stock}개. "
                    f"즉시 발주 필요 (추천 수량: {s.order_qty}개)"
                )
            elif s.days_until_order is not None and s.days_until_order <= 0:
                msg = (
                    f"[긴급] {s.item_name}({s.sku_code}) 발주 마감일 경과! "
                    f"현재 재고: {s.current_stock}개, "
                    f"예상 소진일: {s.stockout_date}. "
                    f"오늘 발주하지 않으면 재고 부족 발생"
                )
            else:
                days_left = s.days_until_stockout if s.days_until_stockout is not None else 0
                msg = (
                    f"[긴급] {s.item_name}({s.sku_code}) {days_left}일 후 소진 예상. "
                    f"현재 재고: {s.current_stock}개, "
                    f"안전재고: {s.safety_stock}개. "
                    f"즉시 {s.order_qty}개 발주 권장"
                )

            alerts.append(CriticalAlert(
                sku_code=s.sku_code,
                item_name=s.item_name,
                site_id=s.site_id,
                current_stock=s.current_stock,
                days_until_stockout=s.days_until_stockout or 0,
                recommended_order_date=s.recommended_order_date,
                vendor_id=s.vendor_id,
                vendor_name=s.vendor_name,
                order_qty=s.order_qty,
                message=msg,
            ))

        return alerts

    def _evaluate_accuracy(
        self,
        past_forecasts: list[dict],
        past_lead_time_predictions: list[dict],
    ) -> list[AccuracyMetric]:
        """
        과거 예측 vs 실제 정확도 평가

        Args:
            past_forecasts: [{sku, date, predicted_qty, actual_qty}]
            past_lead_time_predictions: [{vendor_id, sku, predicted_days, actual_days}]
        """
        metrics: list[AccuracyMetric] = []
        today = date.today()

        # 수요 예측 정확도 (MAPE)
        for f in past_forecasts:
            predicted = f.get("predicted_qty", 0)
            actual = f.get("actual_qty", 0)
            if actual > 0:
                error_pct = abs(predicted - actual) / actual * 100
            else:
                error_pct = 0.0

            eval_date = date.fromisoformat(f["date"]) if isinstance(f.get("date"), str) else today

            metrics.append(AccuracyMetric(
                sku_code=f.get("sku", ""),
                metric_type="DEMAND_MAPE",
                predicted_value=float(predicted),
                actual_value=float(actual),
                error_pct=round(error_pct, 1),
                evaluation_date=eval_date,
            ))

        # 리드타임 예측 정확도 (MAE)
        for lt in past_lead_time_predictions:
            predicted = lt.get("predicted_days", 0)
            actual = lt.get("actual_days", 0)
            if actual > 0:
                error_pct = abs(predicted - actual) / actual * 100
            else:
                error_pct = 0.0

            metrics.append(AccuracyMetric(
                sku_code=lt.get("sku", ""),
                metric_type="LEAD_TIME_MAE",
                predicted_value=float(predicted),
                actual_value=float(actual),
                error_pct=round(error_pct, 1),
                evaluation_date=today,
            ))

        return metrics

    def _auto_retrain_models(
        self,
        sku_contexts: list[SkuContext],
    ) -> list[ModelRetrainResult]:
        """
        자동 모델 재학습

        신규 데이터 10건 이상인 SKU의 수요 예측 모델 재학습
        """
        results: list[ModelRetrainResult] = []
        today = date.today()

        for ctx in sku_contexts:
            # 최근 데이터 포인트 수 확인
            recent_cutoff = today - timedelta(days=30)
            recent_data = [
                p for p in ctx.usage_history
                if p.dt >= recent_cutoff
            ]

            if len(recent_data) < self.RETRAIN_MIN_NEW_DATA:
                continue

            # 기존 모델 정확도 측정 (전체 데이터 중 마지막 7일 홀드아웃)
            if len(ctx.usage_history) < 21:
                continue

            # 재학습 전 MAPE
            old_result = self.demand_forecaster.forecast(
                sku_code=ctx.sku_code,
                history=ctx.usage_history[:-7],
                horizon=7,
            )
            old_mape = old_result.mape

            # 재학습 (전체 데이터 사용)
            new_result = self.demand_forecaster.forecast(
                sku_code=ctx.sku_code,
                history=ctx.usage_history,
                horizon=7,
            )
            new_mape = new_result.mape

            results.append(ModelRetrainResult(
                sku_code=ctx.sku_code,
                model_type="DEMAND",
                old_mape=old_mape,
                new_mape=new_mape,
                data_points_used=len(ctx.usage_history),
                retrained_at=today,
            ))

            # 리드타임 모델 재학습 (데이터 충분한 경우)
            recent_lt = [
                r for r in ctx.lead_time_records
                if r.actual_days is not None and r.order_date >= recent_cutoff
            ]
            if len(recent_lt) >= self.RETRAIN_MIN_NEW_DATA:
                results.append(ModelRetrainResult(
                    sku_code=ctx.sku_code,
                    model_type="LEAD_TIME",
                    old_mape=None,
                    new_mape=None,
                    data_points_used=len(ctx.lead_time_records),
                    retrained_at=today,
                ))

        return results

    def _update_vendor_stats(
        self,
        sku_contexts: list[SkuContext],
    ) -> list[VendorLeadTimeStats]:
        """
        공급업체 리드타임 통계 업데이트

        전체 리드타임 이력에서 공급업체별 통계 재계산
        """
        today = date.today()

        # 공급업체별 레코드 수집
        vendor_records: dict[str, list[LeadTimeInput]] = {}
        vendor_names: dict[str, str] = {}
        for ctx in sku_contexts:
            for rec in ctx.lead_time_records:
                if rec.actual_days is not None:
                    vendor_records.setdefault(rec.vendor_id, []).append(rec)
                    vendor_names[rec.vendor_id] = rec.vendor_name

        stats_list: list[VendorLeadTimeStats] = []

        for vendor_id, records in vendor_records.items():
            days = np.array([r.actual_days for r in records], dtype=float)
            n = len(days)
            if n == 0:
                continue

            avg = float(np.mean(days))
            min_d = float(np.min(days))
            max_d = float(np.max(days))
            std = float(np.std(days, ddof=1)) if n > 1 else 0.0
            p90 = float(np.percentile(days, 90))

            # 신뢰도 점수: 변동계수 기반
            cv = std / max(avg, 1)
            reliability = max(0, min(100, round(100 * (1 - cv), 1)))

            stats_list.append(VendorLeadTimeStats(
                vendor_id=vendor_id,
                vendor_name=vendor_names.get(vendor_id, ""),
                sku_code=None,  # 공급업체 전체 통계
                avg_days=round(avg, 1),
                min_days=round(min_d, 1),
                max_days=round(max_d, 1),
                std_days=round(std, 1),
                p90_days=round(p90, 1),
                sample_count=n,
                reliability_score=reliability,
                last_updated=today,
            ))

        return stats_list


# ─────────────────────────────────────────────
# 배치 실행 진입점
# ─────────────────────────────────────────────

def run_nightly_batch(
    site_id: str,
    sku_contexts: list[SkuContext],
    past_forecasts: Optional[list[dict]] = None,
    past_lead_time_predictions: Optional[list[dict]] = None,
) -> NightlyBatchResult:
    """
    야간 배치 실행 편의 함수

    APScheduler 또는 수동 호출 시 사용

    Args:
        site_id: 사이트 ID
        sku_contexts: 전체 SKU 컨텍스트 목록
        past_forecasts: 과거 수요 예측 기록
        past_lead_time_predictions: 과거 리드타임 예측 기록
    """
    engine = NightlySmartReorderEngine()
    return engine.run_nightly_batch(
        site_id=site_id,
        sku_contexts=sku_contexts,
        past_forecasts=past_forecasts,
        past_lead_time_predictions=past_lead_time_predictions,
    )
