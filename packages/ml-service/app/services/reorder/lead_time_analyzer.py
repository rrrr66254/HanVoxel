"""
HanVoxel — 공급업체 리드타임 학습 모듈

과거 발주→입고 이력에서 실제 리드타임을 학습하여:
  - 공급업체별 평균/최소/최대 리드타임 산출
  - SKU별 공급업체 리드타임 비교
  - 최적 공급업체 추천
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional

import numpy as np


@dataclass
class LeadTimeRecord:
    """리드타임 학습 레코드"""
    partner_id: str
    partner_name: str
    sku: str
    order_date: date
    received_date: Optional[date]
    actual_days: Optional[int]
    order_qty: int


@dataclass
class LeadTimeStats:
    """공급업체별 리드타임 통계"""
    partner_id: str
    partner_name: str
    sku: Optional[str]  # None이면 전체 SKU 통합
    avg_days: float
    min_days: int
    max_days: int
    median_days: float
    std_days: float
    sample_count: int
    # 신뢰 구간 (95%)
    ci_lower: float
    ci_upper: float
    # 최근 추세 (양수: 느려지는 중, 음수: 빨라지는 중)
    trend: float
    reliability_score: float  # 0~100, 높을수록 일관적


@dataclass
class SupplierRanking:
    """SKU별 공급업체 순위"""
    sku: str
    rankings: list[LeadTimeStats]
    best_partner_id: str
    best_partner_name: str


class LeadTimeAnalyzer:
    """공급업체 리드타임 분석기"""

    # 최소 학습 데이터
    MIN_RECORDS = 3

    def analyze(
        self,
        records: list[LeadTimeRecord],
        sku: Optional[str] = None,
    ) -> list[LeadTimeStats]:
        """
        공급업체별 리드타임 통계 산출

        Args:
            records: 리드타임 이력 (completed만)
            sku: 특정 SKU 필터 (None이면 전체)
        """
        # 완료된 레코드만 필터
        completed = [
            r for r in records
            if r.actual_days is not None
            and (sku is None or r.sku == sku)
        ]

        # 공급업체별 그룹핑
        by_partner: dict[str, list[LeadTimeRecord]] = {}
        for r in completed:
            by_partner.setdefault(r.partner_id, []).append(r)

        results: list[LeadTimeStats] = []
        for partner_id, recs in by_partner.items():
            if len(recs) < self.MIN_RECORDS:
                continue
            stats = self._compute_stats(recs, sku)
            results.append(stats)

        # 평균 리드타임 기준 정렬 (빠른 순)
        results.sort(key=lambda s: s.avg_days)
        return results

    def rank_suppliers(
        self, records: list[LeadTimeRecord], sku: str
    ) -> Optional[SupplierRanking]:
        """SKU별 공급업체 리드타임 순위"""
        stats = self.analyze(records, sku=sku)
        if not stats:
            return None

        return SupplierRanking(
            sku=sku,
            rankings=stats,
            best_partner_id=stats[0].partner_id,
            best_partner_name=stats[0].partner_name,
        )

    def estimate_lead_time(
        self,
        records: list[LeadTimeRecord],
        partner_id: str,
        sku: str,
    ) -> Optional[int]:
        """
        특정 공급업체-SKU 조합의 예상 리드타임 (안전 마진 포함)

        반환: 95% 신뢰 구간 상한 (정수, 영업일)
        """
        completed = [
            r for r in records
            if r.actual_days is not None
            and r.partner_id == partner_id
            and r.sku == sku
        ]
        if len(completed) < self.MIN_RECORDS:
            # 데이터 부족 → SKU 무관 공급업체 전체 데이터
            completed = [
                r for r in records
                if r.actual_days is not None
                and r.partner_id == partner_id
            ]
        if len(completed) < self.MIN_RECORDS:
            return None

        days = np.array([r.actual_days for r in completed], dtype=float)
        mean = np.mean(days)
        std = np.std(days, ddof=1) if len(days) > 1 else 0
        # 95% 신뢰 구간 상한 (안전 마진)
        return int(np.ceil(mean + 1.96 * std))

    def _compute_stats(
        self,
        records: list[LeadTimeRecord],
        sku: Optional[str],
    ) -> LeadTimeStats:
        """리드타임 통계 계산"""
        days = np.array([r.actual_days for r in records], dtype=float)
        n = len(days)
        mean = float(np.mean(days))
        std = float(np.std(days, ddof=1)) if n > 1 else 0.0
        median = float(np.median(days))

        # 95% 신뢰 구간
        se = std / max(np.sqrt(n), 1)
        ci_lower = max(0, mean - 1.96 * se)
        ci_upper = mean + 1.96 * se

        # 최근 추세: 최근 절반 평균 - 이전 절반 평균
        half = n // 2
        if half >= 2:
            old_avg = float(np.mean(days[:half]))
            new_avg = float(np.mean(days[half:]))
            trend = round(new_avg - old_avg, 1)
        else:
            trend = 0.0

        # 신뢰도 점수: 변동계수 낮을수록 높음
        cv = std / max(mean, 1)
        reliability = max(0, min(100, round(100 * (1 - cv), 1)))

        return LeadTimeStats(
            partner_id=records[0].partner_id,
            partner_name=records[0].partner_name,
            sku=sku,
            avg_days=round(mean, 1),
            min_days=int(np.min(days)),
            max_days=int(np.max(days)),
            median_days=round(median, 1),
            std_days=round(std, 1),
            sample_count=n,
            ci_lower=round(ci_lower, 1),
            ci_upper=round(ci_upper, 1),
            trend=trend,
            reliability_score=reliability,
        )
