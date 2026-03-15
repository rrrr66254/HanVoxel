"""
HanVoxel — SKU별 수요 예측 엔진

지원 모델:
  1. MOVING_AVG: 이동평균 (7일/14일/30일 윈도우)
  2. LINEAR: 선형회귀 (sklearn)
  3. PROPHET: Prophet 모델 (fbprophet 미설치 시 LINEAR fallback)

입력: SKU별 일별 출고 이력 (sku_daily_usage)
출력: 향후 N일간 일별 수요 예측 + 합계 + 정확도(MAPE)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

import numpy as np


@dataclass
class DailyPoint:
    """일별 수요 데이터 포인트"""
    dt: date
    qty: int


@dataclass
class ForecastResult:
    """예측 결과"""
    sku: str
    horizon: int
    model: str
    daily_forecast: list[dict]  # [{date: "YYYY-MM-DD", qty: int}]
    total_forecast: int
    mape: Optional[float] = None  # 평균 절대 백분율 오차 (%)


class DemandForecaster:
    """SKU별 수요 예측기"""

    # 최소 데이터 요구량
    MIN_DATA_DAYS = 14

    def __init__(self):
        self._prophet_available = False
        try:
            from prophet import Prophet  # noqa: F401
            self._prophet_available = True
        except ImportError:
            pass

    def forecast(
        self,
        sku: str,
        history: list[DailyPoint],
        horizon: int = 7,
        model: str = "AUTO",
    ) -> ForecastResult:
        """
        수요 예측 실행

        Args:
            sku: SKU 코드
            history: 과거 일별 출고 이력 (날짜순 정렬)
            horizon: 예측 기간 (일)
            model: 모델 선택 (AUTO, MOVING_AVG, LINEAR, PROPHET)
        """
        if len(history) < self.MIN_DATA_DAYS:
            # 데이터 부족 시 단순 평균으로 대체
            avg = max(1, int(sum(p.qty for p in history) / max(len(history), 1)))
            return self._build_result(sku, horizon, "MOVING_AVG", avg, history)

        # AUTO 모델 선택 로직
        if model == "AUTO":
            if self._prophet_available and len(history) >= 60:
                model = "PROPHET"
            elif len(history) >= 30:
                model = "LINEAR"
            else:
                model = "MOVING_AVG"

        if model == "PROPHET" and self._prophet_available:
            return self._forecast_prophet(sku, history, horizon)
        elif model == "LINEAR":
            return self._forecast_linear(sku, history, horizon)
        else:
            return self._forecast_moving_avg(sku, history, horizon)

    def _forecast_moving_avg(
        self, sku: str, history: list[DailyPoint], horizon: int
    ) -> ForecastResult:
        """이동평균 예측 (7일 윈도우)"""
        window = min(7, len(history))
        recent = [p.qty for p in history[-window:]]
        avg_qty = max(1, int(sum(recent) / len(recent)))

        # 주간 패턴 감지 (7일 이상 데이터)
        weekly_pattern = self._detect_weekly_pattern(history)

        daily: list[dict] = []
        last_date = history[-1].dt
        for i in range(1, horizon + 1):
            forecast_date = last_date + timedelta(days=i)
            dow = forecast_date.weekday()  # 0=월 ... 6=일
            if weekly_pattern and dow < len(weekly_pattern):
                qty = max(0, int(avg_qty * weekly_pattern[dow]))
            else:
                qty = avg_qty
            daily.append({"date": forecast_date.isoformat(), "qty": qty})

        mape = self._calculate_mape(history, "MOVING_AVG", window)
        total = sum(d["qty"] for d in daily)
        return ForecastResult(sku, horizon, "MOVING_AVG", daily, total, mape)

    def _forecast_linear(
        self, sku: str, history: list[DailyPoint], horizon: int
    ) -> ForecastResult:
        """선형회귀 예측 (sklearn)"""
        qtys = np.array([p.qty for p in history], dtype=float)
        x = np.arange(len(qtys)).reshape(-1, 1)
        y = qtys

        # 수동 선형회귀 (sklearn 미설치 대비)
        x_flat = x.flatten()
        n = len(x_flat)
        x_mean = x_flat.mean()
        y_mean = y.mean()
        slope = np.sum((x_flat - x_mean) * (y - y_mean)) / max(
            np.sum((x_flat - x_mean) ** 2), 1e-10
        )
        intercept = y_mean - slope * x_mean

        daily: list[dict] = []
        last_date = history[-1].dt
        weekly_pattern = self._detect_weekly_pattern(history)

        for i in range(1, horizon + 1):
            forecast_date = last_date + timedelta(days=i)
            x_val = n + i - 1
            pred = slope * x_val + intercept
            # 주간 패턴 보정
            dow = forecast_date.weekday()
            if weekly_pattern and dow < len(weekly_pattern):
                pred *= weekly_pattern[dow]
            qty = max(0, int(round(pred)))
            daily.append({"date": forecast_date.isoformat(), "qty": qty})

        # 학습 데이터로 MAPE 계산 (마지막 7일)
        mape = self._calculate_mape_linear(history, slope, intercept)
        total = sum(d["qty"] for d in daily)
        return ForecastResult(sku, horizon, "LINEAR", daily, total, mape)

    def _forecast_prophet(
        self, sku: str, history: list[DailyPoint], horizon: int
    ) -> ForecastResult:
        """Prophet 모델 예측"""
        try:
            import pandas as pd
            from prophet import Prophet

            df = pd.DataFrame(
                [{"ds": p.dt, "y": p.qty} for p in history]
            )
            model = Prophet(
                daily_seasonality=False,
                weekly_seasonality=True,
                yearly_seasonality=False,
                changepoint_prior_scale=0.05,
            )
            model.fit(df)

            future = model.make_future_dataframe(periods=horizon)
            forecast = model.predict(future)

            daily: list[dict] = []
            forecast_rows = forecast.tail(horizon)
            for _, row in forecast_rows.iterrows():
                qty = max(0, int(round(row["yhat"])))
                daily.append({
                    "date": row["ds"].strftime("%Y-%m-%d"),
                    "qty": qty,
                })

            # MAPE 계산
            train_pred = forecast.head(len(history))["yhat"].values
            actuals = np.array([p.qty for p in history], dtype=float)
            mape = self._mape(actuals, train_pred)
            total = sum(d["qty"] for d in daily)
            return ForecastResult(sku, horizon, "PROPHET", daily, total, mape)
        except Exception:
            # Prophet 실패 시 LINEAR fallback
            return self._forecast_linear(sku, history, horizon)

    def _detect_weekly_pattern(
        self, history: list[DailyPoint]
    ) -> Optional[list[float]]:
        """주간 패턴 감지 (요일별 평균 / 전체 평균)"""
        if len(history) < 14:
            return None

        dow_totals: dict[int, list[int]] = {i: [] for i in range(7)}
        for p in history:
            dow_totals[p.dt.weekday()].append(p.qty)

        overall_avg = max(1, sum(p.qty for p in history) / len(history))
        pattern = []
        for dow in range(7):
            if dow_totals[dow]:
                avg = sum(dow_totals[dow]) / len(dow_totals[dow])
                pattern.append(avg / overall_avg)
            else:
                pattern.append(1.0)
        return pattern

    def _calculate_mape(
        self, history: list[DailyPoint], model: str, window: int
    ) -> Optional[float]:
        """MAPE 계산 (이동평균 기반)"""
        if len(history) < window + 7:
            return None
        # 마지막 7일 예측 vs 실제
        test = history[-7:]
        train = history[-(window + 7):-7]
        avg_pred = sum(p.qty for p in train[-window:]) / window
        return self._mape(
            np.array([p.qty for p in test], dtype=float),
            np.full(7, avg_pred),
        )

    def _calculate_mape_linear(
        self, history: list[DailyPoint], slope: float, intercept: float
    ) -> Optional[float]:
        """MAPE 계산 (선형회귀)"""
        if len(history) < 14:
            return None
        test_size = min(7, len(history) // 4)
        test = history[-test_size:]
        train_size = len(history) - test_size
        actuals = np.array([p.qty for p in test], dtype=float)
        preds = np.array(
            [slope * (train_size + i) + intercept for i in range(test_size)]
        )
        return self._mape(actuals, preds)

    @staticmethod
    def _mape(actuals: np.ndarray, predictions: np.ndarray) -> float:
        """MAPE (Mean Absolute Percentage Error) 계산"""
        mask = actuals > 0
        if not mask.any():
            return 0.0
        ape = np.abs((actuals[mask] - predictions[mask]) / actuals[mask]) * 100
        return round(float(np.mean(ape)), 1)

    def _build_result(
        self,
        sku: str,
        horizon: int,
        model: str,
        avg_qty: int,
        history: list[DailyPoint],
    ) -> ForecastResult:
        """단순 평균 기반 결과 생성"""
        last_date = history[-1].dt if history else date.today()
        daily = [
            {"date": (last_date + timedelta(days=i + 1)).isoformat(), "qty": avg_qty}
            for i in range(horizon)
        ]
        return ForecastResult(sku, horizon, model, daily, avg_qty * horizon, None)
