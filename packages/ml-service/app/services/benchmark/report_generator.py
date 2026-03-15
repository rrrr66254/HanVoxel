"""
벤치마크 PDF 리포트 생성기
- 경영진 보고용 월별 리포트
- 레이더 차트 + 지표별 상세 비교 + 개선 권고
"""

import io
import json
from datetime import datetime
from dataclasses import asdict
from typing import Optional

from .benchmark_engine import (
    BenchmarkEngine,
    CompanyMetrics,
    BenchmarkResult,
    CompanyRankResult,
    Recommendation,
    KPI_KEYS,
    KPI_LABELS,
    KPI_UNITS,
    HIGHER_IS_BETTER,
)


class ReportGenerator:
    """벤치마크 리포트 데이터 생성기"""

    def __init__(self):
        self.engine = BenchmarkEngine()

    def generate_report_data(
        self,
        company: CompanyMetrics,
        benchmark: BenchmarkResult,
        rank: CompanyRankResult,
        recommendations: list[Recommendation],
        company_name: str = "",
        site_name: str = "",
    ) -> dict:
        """PDF 렌더링용 리포트 데이터 생성"""
        now = datetime.now()

        # KPI별 상세 비교 데이터
        kpi_details = []
        for kpi in KPI_KEYS:
            my_val = getattr(company, kpi)
            avg_val = benchmark.averages.get(kpi, 0)
            p_data = benchmark.percentiles.get(kpi, {})
            rank_pct = rank.percentile_ranks.get(kpi, 50)

            if HIGHER_IS_BETTER[kpi]:
                vs_avg = ((my_val - avg_val) / max(avg_val, 0.01)) * 100
            else:
                vs_avg = ((avg_val - my_val) / max(avg_val, 0.01)) * 100

            kpi_details.append({
                "key": kpi,
                "label": KPI_LABELS[kpi],
                "unit": KPI_UNITS[kpi],
                "my_value": round(my_val, 2),
                "industry_avg": round(avg_val, 2),
                "industry_p25": round(p_data.get("p25", 0), 2),
                "industry_p50": round(p_data.get("p50", 0), 2),
                "industry_p75": round(p_data.get("p75", 0), 2),
                "industry_p90": round(p_data.get("p90", 0), 2),
                "percentile_rank": rank_pct,
                "vs_avg_percent": round(vs_avg, 1),
                "higher_is_better": HIGHER_IS_BETTER[kpi],
            })

        # 레이더 차트용 정규화 데이터 (0~100 스케일)
        radar_data = self._build_radar_data(company, benchmark)

        # 등급 산출
        grade = self._compute_grade(rank.overall_score)

        return {
            "report_meta": {
                "generated_at": now.isoformat(),
                "period": benchmark.period,
                "industry": benchmark.industry,
                "company_size": benchmark.company_size,
                "company_name": company_name,
                "site_name": site_name,
                "participant_count": benchmark.participant_count,
            },
            "summary": {
                "overall_score": rank.overall_score,
                "grade": grade,
                "percentile_ranks": rank.percentile_ranks,
            },
            "kpi_details": kpi_details,
            "radar_chart": radar_data,
            "recommendations": [asdict(r) for r in recommendations],
            "trend": None,  # 추후 월별 트렌드 추가 가능
        }

    def generate_title(self, period: str, company_name: str, site_name: str) -> str:
        """리포트 제목 생성"""
        year = period[:4]
        month = period[5:7]
        return f"{year}년 {month}월 {company_name} {site_name} 업계 벤치마크 리포트"

    def _build_radar_data(
        self, company: CompanyMetrics, benchmark: BenchmarkResult,
    ) -> dict:
        """레이더 차트용 0~100 정규화 데이터"""
        my_normalized = {}
        avg_normalized = {}

        for kpi in KPI_KEYS:
            my_val = getattr(company, kpi)
            avg_val = benchmark.averages.get(kpi, 0)
            p_data = benchmark.percentiles.get(kpi, {})
            p90 = p_data.get("p90", max(my_val, avg_val) * 1.2)

            # P90 기준 정규화
            if p90 == 0:
                my_normalized[kpi] = 50.0
                avg_normalized[kpi] = 50.0
            elif HIGHER_IS_BETTER[kpi]:
                my_normalized[kpi] = min(100, round((my_val / p90) * 100, 1))
                avg_normalized[kpi] = min(100, round((avg_val / p90) * 100, 1))
            else:
                # 낮을수록 좋음 → 반전
                my_normalized[kpi] = min(100, max(0, round((1 - my_val / max(p90, 0.01)) * 100, 1)))
                avg_normalized[kpi] = min(100, max(0, round((1 - avg_val / max(p90, 0.01)) * 100, 1)))

        return {
            "labels": [KPI_LABELS[k] for k in KPI_KEYS],
            "my_values": [my_normalized[k] for k in KPI_KEYS],
            "industry_avg": [avg_normalized[k] for k in KPI_KEYS],
        }

    @staticmethod
    def _compute_grade(overall_score: float) -> str:
        """종합 점수 기반 등급"""
        if overall_score >= 90:
            return "S"
        elif overall_score >= 80:
            return "A"
        elif overall_score >= 70:
            return "B"
        elif overall_score >= 60:
            return "C"
        elif overall_score >= 50:
            return "D"
        else:
            return "F"
