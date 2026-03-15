"""
HanVoxel — 발주 추천 엔진

수요 예측 + 리드타임 분석 결과를 종합하여:
  1. 재고 소진 예상일 계산
  2. 안전재고 수준 결정
  3. 최적 발주 시점 + 발주량 추천
  4. 긴급도 분류 (CRITICAL / HIGH / MEDIUM / LOW)
  5. ERP 전표(Voucher) 자동 생성 데이터 준비
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

from .demand_forecaster import DemandForecaster, DailyPoint, ForecastResult
from .lead_time_analyzer import LeadTimeAnalyzer, LeadTimeRecord


@dataclass
class SkuInventoryInfo:
    """SKU 현재 재고 정보"""
    sku: str
    item_name: str
    site_id: str
    current_qty: int
    # 안전재고 설정 (설정값 없으면 자동 계산)
    safety_stock: Optional[int] = None
    # 최소 발주 수량 (MOQ)
    min_order_qty: int = 1
    # 발주 단위 (이 배수로 발주)
    order_unit: int = 1


@dataclass
class ReorderRecommendation:
    """발주 추천 결과"""
    sku: str
    item_name: str
    site_id: str
    current_qty: int
    safety_stock: int
    # 예상 소진일
    stockout_date: Optional[date]
    days_until_out: Optional[int]
    # 추천 발주량
    reorder_qty: int
    # 추천 공급업체
    partner_id: Optional[str]
    partner_name: Optional[str]
    avg_lead_days: Optional[int]
    # "이 날까지 발주하면 납기 맞춤"
    order_by_date: Optional[date]
    # 긴급도
    urgency: str  # CRITICAL, HIGH, MEDIUM, LOW
    # 예측 메타
    forecast_meta: dict


@dataclass
class AutoVoucherData:
    """자동 발주서 생성 데이터"""
    site_id: str
    partner_id: str
    partner_name: str
    voucher_type: str  # PURCHASE
    due_date: Optional[date]
    lines: list[dict]  # [{sku, itemName, qty, unitPrice}]
    note: str


class ReorderEngine:
    """발주 추천 엔진"""

    def __init__(self):
        self.forecaster = DemandForecaster()
        self.lead_time_analyzer = LeadTimeAnalyzer()

    def generate_recommendations(
        self,
        skus: list[SkuInventoryInfo],
        usage_history: dict[str, list[DailyPoint]],  # sku → 일별 출고
        lead_time_records: list[LeadTimeRecord],
        forecast_horizon: int = 30,
    ) -> list[ReorderRecommendation]:
        """
        전체 SKU에 대한 발주 추천 생성

        Args:
            skus: SKU별 현재 재고 정보
            usage_history: SKU별 과거 출고 이력
            lead_time_records: 공급업체 리드타임 이력
            forecast_horizon: 예측 기간 (일)
        """
        recommendations: list[ReorderRecommendation] = []

        for sku_info in skus:
            history = usage_history.get(sku_info.sku, [])
            if not history:
                continue

            rec = self._evaluate_sku(
                sku_info, history, lead_time_records, forecast_horizon
            )
            if rec:
                recommendations.append(rec)

        # 긴급도 순으로 정렬
        urgency_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        recommendations.sort(
            key=lambda r: (
                urgency_order.get(r.urgency, 4),
                r.days_until_out or 999,
            )
        )
        return recommendations

    def _evaluate_sku(
        self,
        sku_info: SkuInventoryInfo,
        history: list[DailyPoint],
        lead_time_records: list[LeadTimeRecord],
        horizon: int,
    ) -> Optional[ReorderRecommendation]:
        """단일 SKU 발주 필요성 평가"""

        # 1. 수요 예측
        forecast = self.forecaster.forecast(sku_info.sku, history, horizon)

        # 2. 일평균 수요 계산
        daily_avg = forecast.total_forecast / max(horizon, 1)
        if daily_avg <= 0:
            return None

        # 3. 안전재고 결정
        safety = sku_info.safety_stock
        if safety is None:
            # 자동 계산: 7일 수요 기준 + 변동 마진
            qtys = [p.qty for p in history[-30:]]
            if qtys:
                import numpy as np
                std_dev = float(np.std(qtys))
                safety = max(1, int(daily_avg * 7 + 1.65 * std_dev * 2.65))
                # 1.65 = Z95%, 2.65 ≈ sqrt(7) 안전계수
            else:
                safety = max(1, int(daily_avg * 7))

        # 4. 재고 소진일 계산
        remaining = sku_info.current_qty
        stockout_date = None
        days_until_out = None

        cum = 0
        for day_data in forecast.daily_forecast:
            cum += day_data["qty"]
            if cum >= remaining:
                stockout_date = date.fromisoformat(day_data["date"])
                days_until_out = (stockout_date - date.today()).days
                break

        if stockout_date is None:
            # 예측 기간 내 소진 안 됨
            if remaining > safety * 3:
                return None  # 충분한 재고 → 추천 불필요
            days_until_out = int(remaining / max(daily_avg, 0.1))
            stockout_date = date.today() + timedelta(days=days_until_out)

        # 5. 최적 공급업체 선택 + 리드타임
        sku_lt_records = [
            r for r in lead_time_records if r.sku == sku_info.sku
        ]
        ranking = self.lead_time_analyzer.rank_suppliers(
            sku_lt_records, sku_info.sku
        )

        partner_id = None
        partner_name = None
        avg_lead_days = None
        order_by_date = None

        if ranking:
            best = ranking.rankings[0]
            partner_id = best.partner_id
            partner_name = best.partner_name
            avg_lead_days = int(best.ci_upper)  # 95% 상한 사용
            # 발주 마감일: 소진일 - 리드타임
            if stockout_date:
                order_by_date = stockout_date - timedelta(days=avg_lead_days)
        else:
            # 리드타임 데이터 없으면 기본 7일 가정
            avg_lead_days = 7
            if stockout_date:
                order_by_date = stockout_date - timedelta(days=7)

        # 6. 발주량 계산 (리드타임 동안 수요 + 안전재고 - 현재재고)
        lead_demand = int(daily_avg * (avg_lead_days or 7))
        reorder_qty = max(
            0,
            lead_demand + safety - sku_info.current_qty
            + int(daily_avg * 14),  # 2주 추가 여유분
        )
        # MOQ 및 발주 단위 적용
        reorder_qty = max(reorder_qty, sku_info.min_order_qty)
        if sku_info.order_unit > 1:
            reorder_qty = (
                (reorder_qty + sku_info.order_unit - 1)
                // sku_info.order_unit
                * sku_info.order_unit
            )

        # 7. 긴급도 분류
        urgency = self._classify_urgency(
            days_until_out, safety, sku_info.current_qty, avg_lead_days
        )

        return ReorderRecommendation(
            sku=sku_info.sku,
            item_name=sku_info.item_name,
            site_id=sku_info.site_id,
            current_qty=sku_info.current_qty,
            safety_stock=safety,
            stockout_date=stockout_date,
            days_until_out=days_until_out,
            reorder_qty=reorder_qty,
            partner_id=partner_id,
            partner_name=partner_name,
            avg_lead_days=avg_lead_days,
            order_by_date=order_by_date,
            urgency=urgency,
            forecast_meta={
                "model": forecast.model,
                "horizon": forecast.horizon,
                "totalForecast": forecast.total_forecast,
                "mape": forecast.mape,
                "dailyAvg": round(daily_avg, 1),
            },
        )

    @staticmethod
    def _classify_urgency(
        days_until_out: Optional[int],
        safety_stock: int,
        current_qty: int,
        lead_days: Optional[int],
    ) -> str:
        """
        긴급도 분류:
          CRITICAL: 이미 소진 or 리드타임 내 소진
          HIGH:     7일 내 소진
          MEDIUM:   14일 내 소진 or 안전재고 이하
          LOW:      30일 내 소진
        """
        if days_until_out is None:
            return "LOW"

        effective_lead = lead_days or 7

        if days_until_out <= 0 or current_qty <= 0:
            return "CRITICAL"
        if days_until_out <= effective_lead:
            return "CRITICAL"
        if days_until_out <= 7:
            return "HIGH"
        if days_until_out <= 14 or current_qty <= safety_stock:
            return "MEDIUM"
        return "LOW"

    def prepare_auto_voucher(
        self,
        recommendations: list[ReorderRecommendation],
        unit_prices: dict[str, int],  # sku → 최근 매입 단가
    ) -> list[AutoVoucherData]:
        """
        추천 결과를 공급업체별 발주서 데이터로 변환

        Args:
            recommendations: 발주 추천 목록 (ACCEPTED 상태만)
            unit_prices: SKU별 최근 매입 단가 (원)
        """
        # 공급업체별 그룹핑
        by_partner: dict[str, list[ReorderRecommendation]] = {}
        for rec in recommendations:
            if rec.partner_id:
                by_partner.setdefault(rec.partner_id, []).append(rec)

        vouchers: list[AutoVoucherData] = []
        for partner_id, recs in by_partner.items():
            lines: list[dict] = []
            earliest_due = None

            for rec in recs:
                price = unit_prices.get(rec.sku, 0)
                lines.append({
                    "sku": rec.sku,
                    "itemName": rec.item_name,
                    "qty": rec.reorder_qty,
                    "unitPrice": price,
                })
                if rec.stockout_date:
                    if earliest_due is None or rec.stockout_date < earliest_due:
                        earliest_due = rec.stockout_date

            skus_str = ", ".join(r.sku for r in recs)
            vouchers.append(AutoVoucherData(
                site_id=recs[0].site_id,
                partner_id=partner_id,
                partner_name=recs[0].partner_name or "",
                voucher_type="PURCHASE",
                due_date=earliest_due,
                lines=lines,
                note=f"[자동발주] SKU: {skus_str}",
            ))

        return vouchers
