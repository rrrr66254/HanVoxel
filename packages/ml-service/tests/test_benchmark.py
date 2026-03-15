"""업계 벤치마크 엔진 통합 테스트"""

import pytest
from app.services.benchmark.benchmark_engine import (
    BenchmarkEngine, CompanyMetrics, KPI_KEYS,
)
from app.services.benchmark.report_generator import ReportGenerator


@pytest.fixture
def engine():
    return BenchmarkEngine()


@pytest.fixture
def report_gen():
    return ReportGenerator()


@pytest.fixture
def sample_metrics():
    """10개 회사의 가상 KPI 데이터"""
    return [
        CompanyMetrics("c1", "s1", 98.5, 12.0, 85.0, 97.0, 2.0, 4.0),
        CompanyMetrics("c2", "s2", 95.0, 10.0, 78.0, 94.0, 3.0, 5.0),
        CompanyMetrics("c3", "s3", 92.0, 8.5, 72.0, 91.0, 3.5, 6.0),
        CompanyMetrics("c4", "s4", 88.0, 7.0, 65.0, 88.0, 4.0, 7.0),
        CompanyMetrics("c5", "s5", 85.0, 6.0, 60.0, 85.0, 4.5, 8.0),
        CompanyMetrics("c6", "s6", 82.0, 5.5, 55.0, 82.0, 5.0, 9.0),
        CompanyMetrics("c7", "s7", 78.0, 5.0, 50.0, 78.0, 5.5, 10.0),
        CompanyMetrics("c8", "s8", 75.0, 4.5, 45.0, 75.0, 6.0, 11.0),
        CompanyMetrics("c9", "s9", 70.0, 4.0, 40.0, 70.0, 7.0, 12.0),
        CompanyMetrics("c10", "s10", 65.0, 3.0, 35.0, 65.0, 8.0, 14.0),
    ]


def test_aggregate_min_participants(engine):
    """최소 참여 회사 수 미달 시 None 반환"""
    metrics = [
        CompanyMetrics(f"c{i}", f"s{i}", 90, 10, 80, 95, 2, 4)
        for i in range(4)
    ]
    result = engine.aggregate("2026-03", "AUTO_PARTS", "MEDIUM", metrics)
    assert result is None


def test_aggregate_success(engine, sample_metrics):
    """정상 집계 테스트"""
    result = engine.aggregate("2026-03", "AUTO_PARTS", "MEDIUM", sample_metrics)
    assert result is not None
    assert result.participant_count == 10
    assert result.industry == "AUTO_PARTS"

    # 피킹 정확도 평균: (98.5+95+92+88+85+82+78+75+70+65)/10 = 82.85
    assert abs(result.averages["picking_accuracy"] - 82.85) < 0.01

    # 백분위 확인
    assert "p25" in result.percentiles["picking_accuracy"]
    assert "p75" in result.percentiles["picking_accuracy"]


def test_percentile_calculation(engine, sample_metrics):
    """백분위 정확도 테스트"""
    result = engine.aggregate("2026-03", "AUTO_PARTS", "MEDIUM", sample_metrics)

    pa_percentiles = result.percentiles["picking_accuracy"]
    # P50 (중앙값) — 5번째와 6번째 사이
    assert 82 <= pa_percentiles["p50"] <= 86


def test_rank_company(engine, sample_metrics):
    """개별 회사 순위 테스트"""
    result = engine.aggregate("2026-03", "AUTO_PARTS", "MEDIUM", sample_metrics)
    all_values = {
        kpi: [getattr(m, kpi) for m in sample_metrics]
        for kpi in KPI_KEYS
    }

    # 최고 실적 회사 (c1)
    best = engine.rank_company(sample_metrics[0], result, all_values)
    assert best.overall_score > 80  # 상위권

    # 최하위 회사 (c10)
    worst = engine.rank_company(sample_metrics[-1], result, all_values)
    assert worst.overall_score < 30  # 하위권

    # 상위 회사가 더 높은 점수
    assert best.overall_score > worst.overall_score


def test_recommendations(engine, sample_metrics):
    """개선 권고 생성 테스트"""
    result = engine.aggregate("2026-03", "AUTO_PARTS", "MEDIUM", sample_metrics)

    # 하위 회사에 대한 권고
    worst = sample_metrics[-1]
    recs = engine.generate_recommendations(worst, result)

    # 평균 이하이므로 권고가 생성됨
    assert len(recs) > 0
    # 우선순위 정렬 확인
    priorities = [r.priority for r in recs]
    assert priorities == sorted(priorities, key=lambda p: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}.get(p, 3))

    # 최고 실적 회사에겐 권고 없어야 함
    best = sample_metrics[0]
    recs_best = engine.generate_recommendations(best, result)
    assert len(recs_best) == 0


def test_report_generation(engine, report_gen, sample_metrics):
    """리포트 데이터 생성 테스트"""
    benchmark = engine.aggregate("2026-03", "AUTO_PARTS", "MEDIUM", sample_metrics)
    company = sample_metrics[4]  # 중간 실적 회사

    all_values = {
        kpi: [getattr(m, kpi) for m in sample_metrics]
        for kpi in KPI_KEYS
    }
    rank = engine.rank_company(company, benchmark, all_values)
    recs = engine.generate_recommendations(company, benchmark)

    title = report_gen.generate_title("2026-03", "테스트기업", "서울창고")
    assert "2026년 03월" in title
    assert "테스트기업" in title

    report_data = report_gen.generate_report_data(
        company=company,
        benchmark=benchmark,
        rank=rank,
        recommendations=recs,
        company_name="테스트기업",
        site_name="서울창고",
    )

    assert "report_meta" in report_data
    assert "summary" in report_data
    assert "kpi_details" in report_data
    assert "radar_chart" in report_data
    assert "recommendations" in report_data

    # 레이더 차트 데이터 검증
    radar = report_data["radar_chart"]
    assert len(radar["labels"]) == 6
    assert len(radar["my_values"]) == 6
    assert len(radar["industry_avg"]) == 6

    # 등급 확인
    assert report_data["summary"]["grade"] in ["S", "A", "B", "C", "D", "F"]


def test_grade_calculation(report_gen):
    """등급 계산 테스트"""
    assert report_gen._compute_grade(95) == "S"
    assert report_gen._compute_grade(85) == "A"
    assert report_gen._compute_grade(75) == "B"
    assert report_gen._compute_grade(65) == "C"
    assert report_gen._compute_grade(55) == "D"
    assert report_gen._compute_grade(40) == "F"
