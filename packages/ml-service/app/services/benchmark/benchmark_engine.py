"""
업계 벤치마크 집계 엔진
- 동일 업종·규모 고객사 데이터 익명 집계
- 백분위 계산 및 순위 산출
- 개선 권고 자동 생성
"""

from dataclasses import dataclass, field, asdict
from typing import Optional
import math


# 핵심 KPI 정의
KPI_KEYS = [
    "picking_accuracy",
    "inventory_turnover",
    "space_utilization",
    "on_time_delivery",
    "receiving_time",
    "order_cycle_time",
]

# KPI 한글 이름
KPI_LABELS = {
    "picking_accuracy": "피킹 정확도",
    "inventory_turnover": "재고회전율",
    "space_utilization": "공간활용률",
    "on_time_delivery": "납기준수율",
    "receiving_time": "입고처리 시간",
    "order_cycle_time": "주문처리 시간",
}

# KPI 단위
KPI_UNITS = {
    "picking_accuracy": "%",
    "inventory_turnover": "회/년",
    "space_utilization": "%",
    "on_time_delivery": "%",
    "receiving_time": "시간",
    "order_cycle_time": "시간",
}

# 높을수록 좋은 지표 vs 낮을수록 좋은 지표
HIGHER_IS_BETTER = {
    "picking_accuracy": True,
    "inventory_turnover": True,
    "space_utilization": True,
    "on_time_delivery": True,
    "receiving_time": False,
    "order_cycle_time": False,
}


@dataclass
class CompanyMetrics:
    """개별 회사의 KPI 지표"""
    company_id: str
    site_id: str
    picking_accuracy: float = 0.0
    inventory_turnover: float = 0.0
    space_utilization: float = 0.0
    on_time_delivery: float = 0.0
    receiving_time: float = 0.0
    order_cycle_time: float = 0.0


@dataclass
class PercentileData:
    """KPI별 백분위 분포"""
    p25: float = 0.0
    p50: float = 0.0
    p75: float = 0.0
    p90: float = 0.0


@dataclass
class BenchmarkResult:
    """벤치마크 집계 결과"""
    period: str
    industry: str
    company_size: str
    participant_count: int
    averages: dict = field(default_factory=dict)
    percentiles: dict = field(default_factory=dict)


@dataclass
class CompanyRankResult:
    """개별 회사의 업계 대비 순위"""
    company_id: str
    site_id: str
    metrics: dict = field(default_factory=dict)
    percentile_ranks: dict = field(default_factory=dict)
    overall_score: float = 0.0


@dataclass
class Recommendation:
    """개선 권고 사항"""
    kpi: str
    kpi_label: str
    current_value: float
    industry_avg: float
    industry_p75: float
    gap_percent: float
    priority: str  # HIGH, MEDIUM, LOW
    message: str


class BenchmarkEngine:
    """업계 벤치마크 집계 엔진"""

    # 최소 참여 회사 수 (익명성 보장)
    MIN_PARTICIPANTS = 5

    def aggregate(
        self,
        period: str,
        industry: str,
        company_size: str,
        metrics_list: list[CompanyMetrics],
    ) -> Optional[BenchmarkResult]:
        """동일 업종·규모 회사 데이터를 익명 집계"""
        if len(metrics_list) < self.MIN_PARTICIPANTS:
            return None

        averages = {}
        percentiles = {}

        for kpi in KPI_KEYS:
            values = [getattr(m, kpi) for m in metrics_list]
            values.sort()

            averages[kpi] = sum(values) / len(values)
            percentiles[kpi] = asdict(PercentileData(
                p25=self._percentile(values, 25),
                p50=self._percentile(values, 50),
                p75=self._percentile(values, 75),
                p90=self._percentile(values, 90),
            ))

        return BenchmarkResult(
            period=period,
            industry=industry,
            company_size=company_size,
            participant_count=len(metrics_list),
            averages=averages,
            percentiles=percentiles,
        )

    def rank_company(
        self,
        company: CompanyMetrics,
        benchmark: BenchmarkResult,
        all_values: dict[str, list[float]],
    ) -> CompanyRankResult:
        """업계 대비 개별 회사 순위 계산"""
        percentile_ranks = {}

        for kpi in KPI_KEYS:
            my_value = getattr(company, kpi)
            values = sorted(all_values.get(kpi, []))

            if not values:
                percentile_ranks[kpi] = 50.0
                continue

            # 백분위 계산 (상위 몇 %)
            if HIGHER_IS_BETTER[kpi]:
                # 높을수록 좋음 → 나보다 높은 비율 = 상위 %
                above = sum(1 for v in values if v > my_value)
                percentile_ranks[kpi] = round((above / len(values)) * 100, 1)
            else:
                # 낮을수록 좋음 → 나보다 낮은 비율 = 상위 %
                below = sum(1 for v in values if v < my_value)
                percentile_ranks[kpi] = round((below / len(values)) * 100, 1)

        # 종합 점수: 각 KPI 순위의 평균을 100점으로 환산
        avg_rank = sum(percentile_ranks.values()) / len(percentile_ranks)
        overall_score = round(100 - avg_rank, 1)

        return CompanyRankResult(
            company_id=company.company_id,
            site_id=company.site_id,
            metrics={kpi: getattr(company, kpi) for kpi in KPI_KEYS},
            percentile_ranks=percentile_ranks,
            overall_score=overall_score,
        )

    def generate_recommendations(
        self,
        company: CompanyMetrics,
        benchmark: BenchmarkResult,
    ) -> list[Recommendation]:
        """개선 권고 사항 자동 생성"""
        recs = []

        for kpi in KPI_KEYS:
            my_value = getattr(company, kpi)
            avg_value = benchmark.averages.get(kpi, 0)
            p75_value = benchmark.percentiles.get(kpi, {}).get("p75", avg_value)

            if HIGHER_IS_BETTER[kpi]:
                gap = ((avg_value - my_value) / max(avg_value, 0.01)) * 100
                is_below = my_value < avg_value
            else:
                gap = ((my_value - avg_value) / max(avg_value, 0.01)) * 100
                is_below = my_value > avg_value

            if not is_below:
                continue

            # 우선순위 결정
            if abs(gap) > 20:
                priority = "HIGH"
            elif abs(gap) > 10:
                priority = "MEDIUM"
            else:
                priority = "LOW"

            label = KPI_LABELS[kpi]
            unit = KPI_UNITS[kpi]
            message = self._build_message(kpi, my_value, avg_value, p75_value, unit, label)

            recs.append(Recommendation(
                kpi=kpi,
                kpi_label=label,
                current_value=round(my_value, 2),
                industry_avg=round(avg_value, 2),
                industry_p75=round(p75_value, 2),
                gap_percent=round(abs(gap), 1),
                priority=priority,
                message=message,
            ))

        # 우선순위 정렬: HIGH → MEDIUM → LOW
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        recs.sort(key=lambda r: priority_order.get(r.priority, 3))
        return recs

    def _build_message(
        self, kpi: str, my_val: float, avg_val: float,
        p75_val: float, unit: str, label: str,
    ) -> str:
        """개선 권고 메시지 생성"""
        if HIGHER_IS_BETTER[kpi]:
            return (
                f"{label}이(가) 업계 평균({avg_val:.1f}{unit}) 대비 "
                f"{my_val:.1f}{unit}으로 낮습니다. "
                f"상위 25% 수준({p75_val:.1f}{unit})을 목표로 개선하세요."
            )
        else:
            return (
                f"{label}이(가) 업계 평균({avg_val:.1f}{unit}) 대비 "
                f"{my_val:.1f}{unit}으로 높습니다. "
                f"상위 25% 수준({p75_val:.1f}{unit})까지 단축을 목표로 하세요."
            )

    @staticmethod
    def _percentile(sorted_values: list[float], p: int) -> float:
        """백분위 계산 (선형 보간)"""
        n = len(sorted_values)
        if n == 0:
            return 0.0
        if n == 1:
            return sorted_values[0]

        k = (p / 100) * (n - 1)
        f = math.floor(k)
        c = math.ceil(k)

        if f == c:
            return sorted_values[int(k)]

        return sorted_values[f] + (k - f) * (sorted_values[c] - sorted_values[f])
