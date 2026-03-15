"""업계 벤치마크 라우터"""

from fastapi import APIRouter, HTTPException

from app.schemas.benchmark import (
    AggregateRequest, AggregateResponse,
    RankRequest, RankResponse,
    RecommendationsRequest, RecommendationsResponse,
    ReportRequest, ReportResponse,
)
from app.services.benchmark.benchmark_engine import (
    BenchmarkEngine, CompanyMetrics,
    BenchmarkResult,
)
from app.services.benchmark.report_generator import ReportGenerator

router = APIRouter()
engine = BenchmarkEngine()
report_gen = ReportGenerator()


def _to_company_metrics(item) -> CompanyMetrics:
    """스키마 → 데이터 클래스 변환"""
    return CompanyMetrics(
        company_id=item.company_id,
        site_id=item.site_id,
        picking_accuracy=item.picking_accuracy,
        inventory_turnover=item.inventory_turnover,
        space_utilization=item.space_utilization,
        on_time_delivery=item.on_time_delivery,
        receiving_time=item.receiving_time,
        order_cycle_time=item.order_cycle_time,
    )


def _to_benchmark_result(b) -> BenchmarkResult:
    """응답 스키마 → BenchmarkResult 변환"""
    return BenchmarkResult(
        period=b.period,
        industry=b.industry,
        company_size=b.company_size,
        participant_count=b.participant_count,
        averages=b.averages,
        percentiles=b.percentiles,
    )


@router.post("/benchmark/aggregate", response_model=AggregateResponse)
async def aggregate_benchmark(req: AggregateRequest):
    """동일 업종·규모 회사 데이터 익명 집계"""
    metrics_list = [_to_company_metrics(m) for m in req.metrics_list]

    result = engine.aggregate(
        period=req.period,
        industry=req.industry,
        company_size=req.company_size,
        metrics_list=metrics_list,
    )

    if result is None:
        raise HTTPException(
            status_code=400,
            detail=f"최소 {engine.MIN_PARTICIPANTS}개 이상의 회사 데이터가 필요합니다.",
        )

    return AggregateResponse(
        period=result.period,
        industry=result.industry,
        company_size=result.company_size,
        participant_count=result.participant_count,
        averages=result.averages,
        percentiles=result.percentiles,
    )


@router.post("/benchmark/rank", response_model=RankResponse)
async def rank_company(req: RankRequest):
    """업계 대비 개별 회사 순위 계산"""
    company = _to_company_metrics(req.company)
    benchmark = _to_benchmark_result(req.benchmark)

    result = engine.rank_company(
        company=company,
        benchmark=benchmark,
        all_values=req.all_values,
    )

    return RankResponse(
        company_id=result.company_id,
        site_id=result.site_id,
        metrics=result.metrics,
        percentile_ranks=result.percentile_ranks,
        overall_score=result.overall_score,
    )


@router.post("/benchmark/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(req: RecommendationsRequest):
    """개선 권고 자동 생성"""
    company = _to_company_metrics(req.company)
    benchmark = _to_benchmark_result(req.benchmark)

    recs = engine.generate_recommendations(company, benchmark)

    return RecommendationsResponse(
        recommendations=[
            {
                "kpi": r.kpi,
                "kpi_label": r.kpi_label,
                "current_value": r.current_value,
                "industry_avg": r.industry_avg,
                "industry_p75": r.industry_p75,
                "gap_percent": r.gap_percent,
                "priority": r.priority,
                "message": r.message,
            }
            for r in recs
        ],
    )


@router.post("/benchmark/report", response_model=ReportResponse)
async def generate_report(req: ReportRequest):
    """벤치마크 리포트 데이터 생성"""
    company = _to_company_metrics(req.company)
    benchmark = _to_benchmark_result(req.benchmark)

    from app.services.benchmark.benchmark_engine import CompanyRankResult, Recommendation
    rank = CompanyRankResult(
        company_id=req.rank.company_id,
        site_id=req.rank.site_id,
        metrics=req.rank.metrics,
        percentile_ranks=req.rank.percentile_ranks,
        overall_score=req.rank.overall_score,
    )
    recs = [
        Recommendation(
            kpi=r.kpi, kpi_label=r.kpi_label,
            current_value=r.current_value, industry_avg=r.industry_avg,
            industry_p75=r.industry_p75, gap_percent=r.gap_percent,
            priority=r.priority, message=r.message,
        )
        for r in req.recommendations
    ]

    title = report_gen.generate_title(
        benchmark.period, req.company_name, req.site_name,
    )
    report_data = report_gen.generate_report_data(
        company=company,
        benchmark=benchmark,
        rank=rank,
        recommendations=recs,
        company_name=req.company_name,
        site_name=req.site_name,
    )

    return ReportResponse(title=title, report_data=report_data)
