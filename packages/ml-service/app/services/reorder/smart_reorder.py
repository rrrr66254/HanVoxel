"""
HanVoxel — 스마트 발주 추천 엔진 (Smart Reorder Engine)

기존 발주 추천 엔진을 ML 기반으로 고도화:
  ① LeadTimePredictor: 리드타임 ML 예측 (샘플 수에 따라 알고리즘 자동 선택)
  ② DemandForecasterV2: 계절성 + 이벤트 감지 + 확정 수주 반영 수요 예측
  ③ OptimalOrderQtyCalculator: EOQ + 안전재고 최적화
  ④ ReorderTimingEngine: ROP 기반 발주 시점 결정
  ⑤ SmartReorderOrchestrator: 전체 파이프라인 오케스트레이터
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

import numpy as np
from sklearn.ensemble import RandomForestRegressor

from .demand_forecaster import DailyPoint


# ─────────────────────────────────────────────
# 공통 데이터 클래스
# ─────────────────────────────────────────────

@dataclass
class LeadTimeInput:
    """리드타임 예측 입력 레코드"""
    vendor_id: str
    vendor_name: str
    sku_code: str
    order_date: date
    received_date: Optional[date]
    actual_days: Optional[int]
    order_qty: int
    season: Optional[str] = None  # "Q1" | "Q2" | "Q3" | "Q4"


@dataclass
class LeadTimePrediction:
    """리드타임 예측 결과"""
    vendor_id: str
    sku_code: str
    predicted_days: float
    min_days: float
    avg_days: float
    max_days: float
    std_days: float
    p90_days: float
    confidence: str  # "HIGH" | "MEDIUM" | "LOW"
    algorithm: str  # "VENDOR_AVG" | "WEIGHTED_MA" | "RANDOM_FOREST"
    sample_count: int


@dataclass
class DemandForecastV2Result:
    """수요 예측 V2 결과"""
    sku_code: str
    horizon: int
    model: str
    daily_forecast: list[dict]  # [{date, qty, lower, upper}]
    total_forecast: int
    avg_daily_demand: float
    std_daily_demand: float
    mape: Optional[float] = None
    seasonal_factors: Optional[dict] = None  # {Q1: 1.2, Q2: 0.8, ...}
    detected_events: list[dict] = field(default_factory=list)  # [{date, type, magnitude}]


@dataclass
class OptimalOrderResult:
    """최적 발주량 계산 결과"""
    sku_code: str
    eoq: int  # 경제적 주문량
    safety_stock: int  # 안전재고
    reorder_point: int  # 재주문점
    order_qty: int  # 최종 발주량 (MOQ/단위 적용)


@dataclass
class ReorderTimingResult:
    """발주 시점 결정 결과"""
    sku_code: str
    current_stock: int
    safety_stock: int
    reorder_point: int
    avg_daily_demand: float
    lead_time_demand: float
    stockout_date: Optional[date]
    days_until_stockout: Optional[int]
    recommended_order_date: Optional[date]
    days_until_order: Optional[int]
    urgency: str  # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"


@dataclass
class SmartReorderSchedule:
    """스마트 발주 스케줄 (최종 출력)"""
    sku_code: str
    item_name: str
    site_id: str
    # 재고 현황
    current_stock: int
    safety_stock: int
    reorder_point: int
    # 수요 예측
    avg_daily_demand: float
    forecast_model: str
    forecast_mape: Optional[float]
    # 리드타임 예측
    vendor_id: Optional[str]
    vendor_name: Optional[str]
    predicted_lead_days: float
    lead_time_confidence: str
    lead_time_algorithm: str
    # 발주 타이밍
    stockout_date: Optional[date]
    days_until_stockout: Optional[int]
    recommended_order_date: Optional[date]
    days_until_order: Optional[int]
    # 발주량
    eoq: int
    order_qty: int
    # 도착 예상
    estimated_arrival_min: Optional[date]
    estimated_arrival_avg: Optional[date]
    estimated_arrival_max: Optional[date]
    # 긴급도
    urgency: str
    # 메타데이터
    seasonal_factors: Optional[dict] = None
    detected_events: list[dict] = field(default_factory=list)


@dataclass
class SkuContext:
    """SKU별 발주 분석 컨텍스트"""
    sku_code: str
    item_name: str
    site_id: str
    current_stock: int
    # 과거 출고 이력
    usage_history: list[DailyPoint]
    # 리드타임 이력
    lead_time_records: list[LeadTimeInput]
    # 확정 수주 (향후 출고 확정 건)
    confirmed_orders: list[dict] = field(default_factory=list)  # [{date, qty}]
    # 설정값
    min_order_qty: int = 1
    order_unit: int = 1
    order_cost: float = 50000.0  # 발주 1건 처리 비용 (원)
    holding_cost_rate: float = 0.25  # 연간 보관비율 (재고가치 대비)
    unit_price: float = 10000.0  # 단가 (원)


# ─────────────────────────────────────────────
# ① LeadTimePredictor — 리드타임 ML 예측
# ─────────────────────────────────────────────

class LeadTimePredictor:
    """
    공급업체-SKU별 리드타임 예측기

    알고리즘 자동 선택:
      - 5개 미만: 공급업체 평균 리드타임 사용
      - 5~20개: 가중 이동평균 (최근 주문에 높은 가중치)
      - 20개 이상: RandomForest 회귀 (계절, 수량, 납기율, 요일 피처)
    """

    # 알고리즘 선택 임계값
    THRESHOLD_WMA = 5
    THRESHOLD_RF = 20

    def predict(
        self,
        records: list[LeadTimeInput],
        vendor_id: str,
        sku_code: str,
        season: Optional[str] = None,
        order_qty: int = 1,
    ) -> LeadTimePrediction:
        """
        리드타임 예측 실행

        Args:
            records: 전체 리드타임 이력
            vendor_id: 공급업체 ID
            sku_code: SKU 코드
            season: 계절 ("Q1"~"Q4", None이면 자동 판단)
            order_qty: 발주 수량
        """
        # 해당 공급업체-SKU 완료 레코드 필터
        completed = [
            r for r in records
            if r.actual_days is not None
            and r.vendor_id == vendor_id
            and r.sku_code == sku_code
        ]

        # SKU 매칭 안 되면 공급업체 전체 레코드로 폴백
        if len(completed) < self.THRESHOLD_WMA:
            completed = [
                r for r in records
                if r.actual_days is not None
                and r.vendor_id == vendor_id
            ]

        n = len(completed)

        if n == 0:
            # 데이터 없음 — 기본값 7일
            return LeadTimePrediction(
                vendor_id=vendor_id,
                sku_code=sku_code,
                predicted_days=7.0,
                min_days=5.0,
                avg_days=7.0,
                max_days=10.0,
                std_days=2.0,
                p90_days=10.0,
                confidence="LOW",
                algorithm="DEFAULT",
                sample_count=0,
            )

        # 공통 통계 계산
        days_arr = np.array([r.actual_days for r in completed], dtype=float)
        avg = float(np.mean(days_arr))
        min_d = float(np.min(days_arr))
        max_d = float(np.max(days_arr))
        std = float(np.std(days_arr, ddof=1)) if n > 1 else 0.0
        p90 = float(np.percentile(days_arr, 90))

        # 알고리즘 자동 선택
        if n < self.THRESHOLD_WMA:
            predicted, algorithm, confidence = self._vendor_average(days_arr)
        elif n < self.THRESHOLD_RF:
            predicted, algorithm, confidence = self._weighted_moving_average(completed)
        else:
            predicted, algorithm, confidence = self._random_forest(
                completed, season, order_qty
            )

        return LeadTimePrediction(
            vendor_id=vendor_id,
            sku_code=sku_code,
            predicted_days=round(predicted, 1),
            min_days=round(min_d, 1),
            avg_days=round(avg, 1),
            max_days=round(max_d, 1),
            std_days=round(std, 1),
            p90_days=round(p90, 1),
            confidence=confidence,
            algorithm=algorithm,
            sample_count=n,
        )

    def _vendor_average(
        self, days_arr: np.ndarray
    ) -> tuple[float, str, str]:
        """공급업체 평균 리드타임 (5개 미만 데이터)"""
        avg = float(np.mean(days_arr))
        return avg, "VENDOR_AVG", "LOW"

    def _weighted_moving_average(
        self, records: list[LeadTimeInput]
    ) -> tuple[float, str, str]:
        """
        가중 이동평균 (5~20개 데이터)
        최근 주문일수록 높은 가중치 부여
        """
        # 주문일 기준 정렬 (오래된 순)
        sorted_recs = sorted(records, key=lambda r: r.order_date)
        n = len(sorted_recs)
        days = np.array([r.actual_days for r in sorted_recs], dtype=float)

        # 지수 가중치: 최근에 더 큰 가중치
        weights = np.array([math.exp(i / n) for i in range(n)])
        weights = weights / weights.sum()

        predicted = float(np.dot(days, weights))
        return predicted, "WEIGHTED_MA", "MEDIUM"

    def _random_forest(
        self,
        records: list[LeadTimeInput],
        season: Optional[str],
        order_qty: int,
    ) -> tuple[float, str, str]:
        """
        RandomForest 회귀 (20개 이상 데이터)
        피처: season(분기), order_qty, recent_on_time_rate, day_of_week
        """
        sorted_recs = sorted(records, key=lambda r: r.order_date)

        # 피처 행렬 구성
        X: list[list[float]] = []
        y: list[float] = []

        for i, rec in enumerate(sorted_recs):
            # 계절 (분기) — 원-핫 인코딩 대신 숫자
            quarter = self._get_quarter(rec.order_date)
            # 최근 납기 준수율 (직전 5건 중 평균 리드타임 대비)
            recent_on_time = self._calc_recent_on_time(sorted_recs[:i], window=5)
            # 요일 (0=월 ~ 6=일)
            dow = rec.order_date.weekday()

            X.append([quarter, rec.order_qty, recent_on_time, dow])
            y.append(float(rec.actual_days))

        X_arr = np.array(X)
        y_arr = np.array(y)

        # RandomForest 학습
        rf = RandomForestRegressor(
            n_estimators=50,
            max_depth=5,
            random_state=42,
        )
        rf.fit(X_arr, y_arr)

        # 예측 입력 구성
        if season:
            pred_quarter = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}.get(season, 1)
        else:
            pred_quarter = self._get_quarter(date.today())

        recent_on_time = self._calc_recent_on_time(sorted_recs, window=5)
        pred_dow = date.today().weekday()
        X_pred = np.array([[pred_quarter, order_qty, recent_on_time, pred_dow]])

        predicted = float(rf.predict(X_pred)[0])
        return max(1.0, predicted), "RANDOM_FOREST", "HIGH"

    @staticmethod
    def _get_quarter(dt: date) -> int:
        """날짜에서 분기 추출"""
        return (dt.month - 1) // 3 + 1

    @staticmethod
    def _calc_recent_on_time(
        records: list[LeadTimeInput], window: int = 5
    ) -> float:
        """최근 N건의 납기 준수율 (평균 리드타임 이내 비율)"""
        if not records:
            return 0.5

        recent = records[-window:]
        completed = [r for r in recent if r.actual_days is not None]
        if not completed:
            return 0.5

        days = [r.actual_days for r in completed]
        avg = sum(days) / len(days)
        on_time = sum(1 for d in days if d <= avg)
        return on_time / len(days)


# ─────────────────────────────────────────────
# ② DemandForecasterV2 — 고도화 수요 예측
# ─────────────────────────────────────────────

class DemandForecasterV2:
    """
    수요 예측 V2 — 기존 DemandForecaster 고도화

    추가 기능:
      - 계절성 가중치 (분기별 패턴)
      - 이벤트(스파이크) 감지 (공휴일/프로모션)
      - 확정 수주 반영 (confirmed orders로 예측 보정)
      - 앙상블 모델 (이동평균 + 선형회귀 가중 평균)
    """

    # 이동평균 윈도우 크기
    WINDOWS = [7, 14, 30]
    # 스파이크 감지 임계값 (평균 대비 배수)
    SPIKE_THRESHOLD = 2.5

    def forecast(
        self,
        sku_code: str,
        history: list[DailyPoint],
        horizon: int = 60,
        confirmed_orders: Optional[list[dict]] = None,
    ) -> DemandForecastV2Result:
        """
        수요 예측 V2 실행

        Args:
            sku_code: SKU 코드
            history: 과거 일별 출고 이력 (날짜순)
            horizon: 예측 기간 (일)
            confirmed_orders: 확정 수주 [{date: "YYYY-MM-DD", qty: int}]
        """
        if not history or len(history) < 7:
            # 데이터 부족 — 단순 평균
            avg = max(1, int(sum(p.qty for p in history) / max(len(history), 1))) if history else 1
            return self._build_simple_result(sku_code, horizon, avg)

        # 1) 계절성 분석
        seasonal_factors = self._analyze_seasonality(history)

        # 2) 이벤트 감지 (스파이크)
        detected_events = self._detect_events(history)

        # 3) 모델별 예측
        ma_forecast = self._forecast_moving_avg(history, horizon, seasonal_factors)
        linear_forecast = self._forecast_linear(history, horizon, seasonal_factors)

        # 4) 앙상블 (ENSEMBLE): 가중 평균
        #    데이터 30일 이상이면 선형회귀에 더 높은 가중치
        if len(history) >= 30:
            w_ma, w_linear = 0.4, 0.6
        else:
            w_ma, w_linear = 0.7, 0.3

        daily_forecast: list[dict] = []
        last_date = history[-1].dt

        for i in range(horizon):
            forecast_date = last_date + timedelta(days=i + 1)
            ma_qty = ma_forecast[i] if i < len(ma_forecast) else ma_forecast[-1]
            lr_qty = linear_forecast[i] if i < len(linear_forecast) else linear_forecast[-1]

            ensemble_qty = w_ma * ma_qty + w_linear * lr_qty

            # 5) 확정 수주 반영 — 해당 날짜에 확정 수주가 있으면 max(예측, 수주)
            if confirmed_orders:
                date_str = forecast_date.isoformat()
                confirmed_qty = sum(
                    o.get("qty", 0) for o in confirmed_orders
                    if o.get("date") == date_str
                )
                if confirmed_qty > 0:
                    ensemble_qty = max(ensemble_qty, confirmed_qty)

            qty = max(0, int(round(ensemble_qty)))

            # 예측 구간 (상하한)
            std_factor = 0.3 if len(history) < 30 else 0.2
            lower = max(0, int(qty * (1 - std_factor)))
            upper = int(qty * (1 + std_factor))

            daily_forecast.append({
                "date": forecast_date.isoformat(),
                "qty": qty,
                "lower": lower,
                "upper": upper,
            })

        total = sum(d["qty"] for d in daily_forecast)
        qtys = np.array([p.qty for p in history], dtype=float)
        avg_daily = float(np.mean(qtys))
        std_daily = float(np.std(qtys, ddof=1)) if len(qtys) > 1 else 0.0

        # MAPE 계산 (마지막 7일 홀드아웃)
        mape = self._calculate_ensemble_mape(history, w_ma, w_linear, seasonal_factors)

        return DemandForecastV2Result(
            sku_code=sku_code,
            horizon=horizon,
            model="ENSEMBLE",
            daily_forecast=daily_forecast,
            total_forecast=total,
            avg_daily_demand=round(avg_daily, 2),
            std_daily_demand=round(std_daily, 2),
            mape=mape,
            seasonal_factors=seasonal_factors,
            detected_events=detected_events,
        )

    def _analyze_seasonality(
        self, history: list[DailyPoint]
    ) -> Optional[dict]:
        """
        분기별 계절성 분석

        각 분기의 평균 수요 / 전체 평균 비율 계산
        최소 60일 데이터 필요
        """
        if len(history) < 60:
            return None

        quarter_totals: dict[str, list[int]] = {"Q1": [], "Q2": [], "Q3": [], "Q4": []}
        for p in history:
            q = f"Q{(p.dt.month - 1) // 3 + 1}"
            quarter_totals[q].append(p.qty)

        overall_avg = max(1, sum(p.qty for p in history) / len(history))
        factors = {}
        for q, qtys in quarter_totals.items():
            if qtys:
                q_avg = sum(qtys) / len(qtys)
                factors[q] = round(q_avg / overall_avg, 3)
            else:
                factors[q] = 1.0

        return factors

    def _detect_events(
        self, history: list[DailyPoint]
    ) -> list[dict]:
        """
        이벤트(스파이크) 감지

        평균 대비 SPIKE_THRESHOLD 배 이상인 날을 이벤트로 탐지
        """
        if len(history) < 14:
            return []

        qtys = np.array([p.qty for p in history], dtype=float)
        avg = float(np.mean(qtys))
        std = float(np.std(qtys, ddof=1)) if len(qtys) > 1 else 0.0
        threshold = avg + self.SPIKE_THRESHOLD * max(std, 1.0)

        events: list[dict] = []
        for p in history:
            if p.qty > threshold:
                magnitude = round(p.qty / max(avg, 1), 2)
                events.append({
                    "date": p.dt.isoformat(),
                    "type": "SPIKE",
                    "magnitude": magnitude,
                    "qty": p.qty,
                })

        return events

    def _forecast_moving_avg(
        self,
        history: list[DailyPoint],
        horizon: int,
        seasonal_factors: Optional[dict],
    ) -> list[float]:
        """다중 윈도우 이동평균 예측 (7/14/30일 앙상블)"""
        predictions: list[float] = []
        last_date = history[-1].dt

        for i in range(horizon):
            forecast_date = last_date + timedelta(days=i + 1)
            window_preds: list[float] = []

            for w in self.WINDOWS:
                if len(history) >= w:
                    recent = [p.qty for p in history[-w:]]
                    window_preds.append(sum(recent) / len(recent))

            if not window_preds:
                avg = sum(p.qty for p in history) / max(len(history), 1)
                window_preds.append(avg)

            # 윈도우별 가중 평균 (짧은 윈도우에 높은 가중치)
            weights = [0.5, 0.3, 0.2][:len(window_preds)]
            w_sum = sum(weights)
            pred = sum(p * w / w_sum for p, w in zip(window_preds, weights))

            # 계절성 보정
            if seasonal_factors:
                q = f"Q{(forecast_date.month - 1) // 3 + 1}"
                factor = seasonal_factors.get(q, 1.0)
                pred *= factor

            predictions.append(max(0, pred))

        return predictions

    def _forecast_linear(
        self,
        history: list[DailyPoint],
        horizon: int,
        seasonal_factors: Optional[dict],
    ) -> list[float]:
        """선형회귀 예측 + 계절성 보정"""
        qtys = np.array([p.qty for p in history], dtype=float)
        x = np.arange(len(qtys), dtype=float)
        n = len(x)
        x_mean = x.mean()
        y_mean = qtys.mean()

        denom = np.sum((x - x_mean) ** 2)
        slope = np.sum((x - x_mean) * (qtys - y_mean)) / max(denom, 1e-10)
        intercept = y_mean - slope * x_mean

        predictions: list[float] = []
        last_date = history[-1].dt

        for i in range(horizon):
            forecast_date = last_date + timedelta(days=i + 1)
            x_val = n + i
            pred = slope * x_val + intercept

            # 계절성 보정
            if seasonal_factors:
                q = f"Q{(forecast_date.month - 1) // 3 + 1}"
                factor = seasonal_factors.get(q, 1.0)
                pred *= factor

            predictions.append(max(0, pred))

        return predictions

    def _calculate_ensemble_mape(
        self,
        history: list[DailyPoint],
        w_ma: float,
        w_linear: float,
        seasonal_factors: Optional[dict],
    ) -> Optional[float]:
        """앙상블 모델의 MAPE 계산 (마지막 7일 홀드아웃)"""
        if len(history) < 21:
            return None

        test_size = 7
        train = history[:-test_size]
        test = history[-test_size:]

        # 학습 데이터로 예측
        ma_pred = self._forecast_moving_avg(train, test_size, seasonal_factors)
        lr_pred = self._forecast_linear(train, test_size, seasonal_factors)

        actuals = np.array([p.qty for p in test], dtype=float)
        predictions = np.array([
            w_ma * ma + w_linear * lr
            for ma, lr in zip(ma_pred, lr_pred)
        ])

        mask = actuals > 0
        if not mask.any():
            return 0.0

        ape = np.abs((actuals[mask] - predictions[mask]) / actuals[mask]) * 100
        return round(float(np.mean(ape)), 1)

    def _build_simple_result(
        self, sku_code: str, horizon: int, avg_qty: int
    ) -> DemandForecastV2Result:
        """데이터 부족 시 단순 평균 결과"""
        today = date.today()
        daily = [
            {"date": (today + timedelta(days=i + 1)).isoformat(), "qty": avg_qty, "lower": 0, "upper": avg_qty * 2}
            for i in range(horizon)
        ]
        return DemandForecastV2Result(
            sku_code=sku_code,
            horizon=horizon,
            model="SIMPLE_AVG",
            daily_forecast=daily,
            total_forecast=avg_qty * horizon,
            avg_daily_demand=float(avg_qty),
            std_daily_demand=0.0,
        )


# ─────────────────────────────────────────────
# ③ OptimalOrderQtyCalculator — EOQ + 안전재고
# ─────────────────────────────────────────────

class OptimalOrderQtyCalculator:
    """
    경제적 주문량(EOQ) + 안전재고 계산기

    - EOQ = sqrt(2 * 연간수요 * 발주비용 / 보관비용)
    - 안전재고 = 일평균수요 * (리드타임 + Z * sqrt(리드타임) * 수요표준편차)
    - Z = 1.65 (95% 서비스 수준)
    """

    # 95% 서비스 수준 Z값
    Z_FACTOR = 1.65

    def calculate(
        self,
        sku_code: str,
        avg_daily_demand: float,
        std_daily_demand: float,
        lead_time_days: float,
        order_cost: float = 50000.0,
        holding_cost_rate: float = 0.25,
        unit_price: float = 10000.0,
        min_order_qty: int = 1,
        order_unit: int = 1,
    ) -> OptimalOrderResult:
        """
        최적 발주량 계산

        Args:
            sku_code: SKU 코드
            avg_daily_demand: 일평균 수요
            std_daily_demand: 수요 표준편차 (일별)
            lead_time_days: 예상 리드타임 (일)
            order_cost: 발주 1건 처리 비용 (원)
            holding_cost_rate: 연간 보관비율 (재고가치 대비)
            unit_price: SKU 단가 (원)
            min_order_qty: 최소 발주 수량 (MOQ)
            order_unit: 발주 단위 배수
        """
        # 연간 수요 추정
        annual_demand = avg_daily_demand * 365
        # 단위당 연간 보관비용
        holding_cost_per_unit = unit_price * holding_cost_rate

        # EOQ 계산
        if holding_cost_per_unit > 0 and annual_demand > 0:
            eoq_raw = math.sqrt(
                2 * annual_demand * order_cost / holding_cost_per_unit
            )
            eoq = max(1, int(round(eoq_raw)))
        else:
            eoq = max(1, int(avg_daily_demand * 14))  # 2주 분량 기본값

        # 안전재고 계산
        # safety_stock = avg_daily_demand * (lead_time + Z * sqrt(lead_time) * std_demand / avg_demand)
        if avg_daily_demand > 0 and lead_time_days > 0:
            safety_stock = avg_daily_demand * lead_time_days + \
                self.Z_FACTOR * math.sqrt(lead_time_days) * std_daily_demand
            safety_stock = max(1, int(math.ceil(safety_stock)))
        else:
            safety_stock = max(1, int(avg_daily_demand * 7))

        # 재주문점 (ROP) = 리드타임 수요 + 안전재고
        lead_time_demand = avg_daily_demand * lead_time_days
        reorder_point = int(math.ceil(lead_time_demand)) + safety_stock

        # 최종 발주량: max(EOQ, MOQ), 단위 배수 적용
        order_qty = max(eoq, min_order_qty)
        if order_unit > 1:
            order_qty = (
                (order_qty + order_unit - 1) // order_unit * order_unit
            )

        return OptimalOrderResult(
            sku_code=sku_code,
            eoq=eoq,
            safety_stock=safety_stock,
            reorder_point=reorder_point,
            order_qty=order_qty,
        )


# ─────────────────────────────────────────────
# ④ ReorderTimingEngine — ROP 기반 발주 시점
# ─────────────────────────────────────────────

class ReorderTimingEngine:
    """
    발주 시점 결정 엔진

    - ROP (Reorder Point) = 리드타임 수요 + 안전재고
    - 리드타임 수요 = 일평균수요 * P90 리드타임
    - 재고 소진일 = 오늘 + (현재재고 - 안전재고) / 일평균수요
    - 추천 발주일 = 재고 소진일 - P90 리드타임
    """

    def calculate(
        self,
        sku_code: str,
        current_stock: int,
        avg_daily_demand: float,
        safety_stock: int,
        reorder_point: int,
        p90_lead_time: float,
    ) -> ReorderTimingResult:
        """
        발주 시점 결정

        Args:
            sku_code: SKU 코드
            current_stock: 현재 재고량
            avg_daily_demand: 일평균 수요
            safety_stock: 안전재고
            reorder_point: 재주문점
            p90_lead_time: P90 리드타임 (일)
        """
        today = date.today()

        # 리드타임 수요
        lead_time_demand = avg_daily_demand * p90_lead_time

        # 재고 소진일 계산
        if avg_daily_demand > 0:
            effective_stock = current_stock - safety_stock
            if effective_stock <= 0:
                # 이미 안전재고 이하 → 즉시 발주 필요
                days_until_stockout = 0
                stockout_date = today
            else:
                days_until_stockout = int(effective_stock / avg_daily_demand)
                stockout_date = today + timedelta(days=days_until_stockout)
        else:
            # 수요 없음
            days_until_stockout = None
            stockout_date = None

        # 추천 발주일 = 재고 소진일 - P90 리드타임
        recommended_order_date = None
        days_until_order = None
        if stockout_date is not None:
            recommended_order_date = stockout_date - timedelta(
                days=int(math.ceil(p90_lead_time))
            )
            days_until_order = (recommended_order_date - today).days

        # 긴급도 분류
        urgency = self._classify_urgency(
            days_until_stockout=days_until_stockout,
            days_until_order=days_until_order,
            current_stock=current_stock,
            safety_stock=safety_stock,
            p90_lead_time=p90_lead_time,
        )

        return ReorderTimingResult(
            sku_code=sku_code,
            current_stock=current_stock,
            safety_stock=safety_stock,
            reorder_point=reorder_point,
            avg_daily_demand=round(avg_daily_demand, 2),
            lead_time_demand=round(lead_time_demand, 2),
            stockout_date=stockout_date,
            days_until_stockout=days_until_stockout,
            recommended_order_date=recommended_order_date,
            days_until_order=days_until_order,
            urgency=urgency,
        )

    @staticmethod
    def _classify_urgency(
        days_until_stockout: Optional[int],
        days_until_order: Optional[int],
        current_stock: int,
        safety_stock: int,
        p90_lead_time: float,
    ) -> str:
        """
        긴급도 분류:
          CRITICAL: 이미 소진 / 발주일 경과 / 리드타임 내 소진
          HIGH:     발주 추천일 3일 이내
          MEDIUM:   발주 추천일 7일 이내 or 안전재고 이하
          LOW:      여유 있음
        """
        # 재고 소진 또는 안전재고 미달
        if current_stock <= 0:
            return "CRITICAL"

        if days_until_stockout is not None and days_until_stockout <= 0:
            return "CRITICAL"

        # 발주일이 이미 지남
        if days_until_order is not None and days_until_order <= 0:
            return "CRITICAL"

        # 발주일 3일 이내
        if days_until_order is not None and days_until_order <= 3:
            return "HIGH"

        # 발주일 7일 이내 또는 안전재고 이하
        if days_until_order is not None and days_until_order <= 7:
            return "MEDIUM"

        if current_stock <= safety_stock:
            return "MEDIUM"

        return "LOW"


# ─────────────────────────────────────────────
# ⑤ SmartReorderOrchestrator — 전체 파이프라인
# ─────────────────────────────────────────────

class SmartReorderOrchestrator:
    """
    스마트 발주 오케스트레이터

    전체 파이프라인:
      1. 수요 예측 (DemandForecasterV2)
      2. 최적 발주량 계산 (OptimalOrderQtyCalculator)
      3. 리드타임 예측 (LeadTimePredictor)
      4. 발주 시점 결정 (ReorderTimingEngine)
      5. 도착 예상일 산출
    """

    def __init__(self):
        self.demand_forecaster = DemandForecasterV2()
        self.lead_time_predictor = LeadTimePredictor()
        self.qty_calculator = OptimalOrderQtyCalculator()
        self.timing_engine = ReorderTimingEngine()

    def generate_smart_schedule(
        self,
        site_id: str,
        sku_contexts: list[SkuContext],
        horizon: int = 60,
    ) -> list[SmartReorderSchedule]:
        """
        전체 SKU에 대한 스마트 발주 스케줄 생성

        Args:
            site_id: 사이트 ID
            sku_contexts: SKU별 분석 컨텍스트 목록
            horizon: 예측 기간 (일)
        """
        schedules: list[SmartReorderSchedule] = []

        for ctx in sku_contexts:
            schedule = self._process_single_sku(ctx, horizon)
            if schedule:
                schedules.append(schedule)

        # 긴급도 순 정렬
        urgency_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        schedules.sort(
            key=lambda s: (
                urgency_order.get(s.urgency, 4),
                s.days_until_stockout if s.days_until_stockout is not None else 999,
            )
        )

        return schedules

    def _process_single_sku(
        self,
        ctx: SkuContext,
        horizon: int,
    ) -> Optional[SmartReorderSchedule]:
        """단일 SKU 스마트 발주 스케줄 생성"""

        # 1) 수요 예측
        demand_result = self.demand_forecaster.forecast(
            sku_code=ctx.sku_code,
            history=ctx.usage_history,
            horizon=horizon,
            confirmed_orders=ctx.confirmed_orders or None,
        )

        avg_daily = demand_result.avg_daily_demand
        std_daily = demand_result.std_daily_demand

        if avg_daily <= 0:
            return None

        # 2) 최적 공급업체 선택 + 리드타임 예측
        # 가장 최근 공급업체를 기본으로 선택
        vendor_id = None
        vendor_name = None
        lead_prediction = None

        if ctx.lead_time_records:
            # 최근 발주 기록의 공급업체
            sorted_lt = sorted(
                ctx.lead_time_records, key=lambda r: r.order_date, reverse=True
            )
            vendor_id = sorted_lt[0].vendor_id
            vendor_name = sorted_lt[0].vendor_name

            # 현재 분기 결정
            current_quarter = f"Q{(date.today().month - 1) // 3 + 1}"

            lead_prediction = self.lead_time_predictor.predict(
                records=ctx.lead_time_records,
                vendor_id=vendor_id,
                sku_code=ctx.sku_code,
                season=current_quarter,
                order_qty=ctx.min_order_qty,
            )

        # 리드타임 기본값 설정
        p90_lead_time = lead_prediction.p90_days if lead_prediction else 7.0
        avg_lead_time = lead_prediction.avg_days if lead_prediction else 7.0
        min_lead_time = lead_prediction.min_days if lead_prediction else 5.0
        max_lead_time = lead_prediction.max_days if lead_prediction else 10.0

        # 3) 최적 발주량 계산
        qty_result = self.qty_calculator.calculate(
            sku_code=ctx.sku_code,
            avg_daily_demand=avg_daily,
            std_daily_demand=std_daily,
            lead_time_days=p90_lead_time,
            order_cost=ctx.order_cost,
            holding_cost_rate=ctx.holding_cost_rate,
            unit_price=ctx.unit_price,
            min_order_qty=ctx.min_order_qty,
            order_unit=ctx.order_unit,
        )

        # 4) 발주 시점 결정
        timing_result = self.timing_engine.calculate(
            sku_code=ctx.sku_code,
            current_stock=ctx.current_stock,
            avg_daily_demand=avg_daily,
            safety_stock=qty_result.safety_stock,
            reorder_point=qty_result.reorder_point,
            p90_lead_time=p90_lead_time,
        )

        # 5) 도착 예상일 산출
        today = date.today()
        order_date = timing_result.recommended_order_date or today
        estimated_arrival_min = order_date + timedelta(days=int(min_lead_time))
        estimated_arrival_avg = order_date + timedelta(days=int(avg_lead_time))
        estimated_arrival_max = order_date + timedelta(days=int(max_lead_time))

        return SmartReorderSchedule(
            sku_code=ctx.sku_code,
            item_name=ctx.item_name,
            site_id=ctx.site_id,
            # 재고 현황
            current_stock=ctx.current_stock,
            safety_stock=qty_result.safety_stock,
            reorder_point=qty_result.reorder_point,
            # 수요 예측
            avg_daily_demand=round(avg_daily, 2),
            forecast_model=demand_result.model,
            forecast_mape=demand_result.mape,
            # 리드타임 예측
            vendor_id=vendor_id,
            vendor_name=vendor_name,
            predicted_lead_days=round(p90_lead_time, 1),
            lead_time_confidence=lead_prediction.confidence if lead_prediction else "LOW",
            lead_time_algorithm=lead_prediction.algorithm if lead_prediction else "DEFAULT",
            # 발주 타이밍
            stockout_date=timing_result.stockout_date,
            days_until_stockout=timing_result.days_until_stockout,
            recommended_order_date=timing_result.recommended_order_date,
            days_until_order=timing_result.days_until_order,
            # 발주량
            eoq=qty_result.eoq,
            order_qty=qty_result.order_qty,
            # 도착 예상
            estimated_arrival_min=estimated_arrival_min,
            estimated_arrival_avg=estimated_arrival_avg,
            estimated_arrival_max=estimated_arrival_max,
            # 긴급도
            urgency=timing_result.urgency,
            # 메타데이터
            seasonal_factors=demand_result.seasonal_factors,
            detected_events=demand_result.detected_events,
        )
