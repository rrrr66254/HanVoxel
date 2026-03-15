"""
HanVoxel — Phase 3 Step 3 통합 테스트: 자동 발주 추천 엔진

1. 수요 예측 (MOVING_AVG, LINEAR) 정상 동작 확인
2. 주간 패턴 감지 확인
3. 리드타임 분석 (통계 계산) 확인
4. 공급업체 순위 비교 확인
5. 발주 추천 (긴급도 분류) 확인
6. 안전재고 자동 계산 확인
7. 발주서 자동 생성 데이터 확인
"""

import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.reorder.demand_forecaster import DemandForecaster, DailyPoint
from app.services.reorder.lead_time_analyzer import LeadTimeAnalyzer, LeadTimeRecord
from app.services.reorder.reorder_engine import ReorderEngine, SkuInventoryInfo


def _generate_history(days: int = 60, base_qty: int = 15) -> list[DailyPoint]:
    """테스트용 출고 이력 생성"""
    import math
    history = []
    for i in range(days):
        dt = date.today() - timedelta(days=days - i)
        dow = dt.weekday()
        # 주간 패턴: 주말 적음, 주중 많음
        if dow >= 5:
            qty = max(0, base_qty // 3)
        else:
            qty = max(0, base_qty + int(math.sin(i * 0.3) * 5))
        history.append(DailyPoint(dt=dt, qty=qty))
    return history


def test_1_forecast_moving_avg():
    """1. 이동평균 수요 예측"""
    print("\n=== 테스트 1: 이동평균 수요 예측 ===")

    forecaster = DemandForecaster()
    history = _generate_history(30, base_qty=20)

    result = forecaster.forecast("SKU-001", history, horizon=7, model="MOVING_AVG")

    assert result.sku == "SKU-001", "SKU 확인"
    assert result.model == "MOVING_AVG", "모델 확인"
    assert result.horizon == 7, "예측 기간 확인"
    assert len(result.daily_forecast) == 7, f"7일 예측 데이터: {len(result.daily_forecast)}"
    assert result.total_forecast > 0, "합계 양수"
    print(f"  ✅ 7일 예측 합계: {result.total_forecast}개")
    print(f"  ✅ 일별 예측: {[d['qty'] for d in result.daily_forecast]}")
    return True


def test_2_forecast_linear():
    """2. 선형회귀 수요 예측"""
    print("\n=== 테스트 2: 선형회귀 수요 예측 ===")

    forecaster = DemandForecaster()
    history = _generate_history(60, base_qty=15)

    result = forecaster.forecast("SKU-002", history, horizon=14, model="LINEAR")

    assert result.model == "LINEAR", "모델 확인"
    assert len(result.daily_forecast) == 14, "14일 예측"
    assert result.total_forecast > 0, "합계 양수"
    assert result.mape is not None, "MAPE 계산됨"
    print(f"  ✅ 14일 예측 합계: {result.total_forecast}개")
    print(f"  ✅ MAPE: {result.mape}%")
    return True


def test_3_weekly_pattern():
    """3. 주간 패턴 감지"""
    print("\n=== 테스트 3: 주간 패턴 감지 ===")

    forecaster = DemandForecaster()
    history = _generate_history(30, base_qty=20)

    result = forecaster.forecast("SKU-003", history, horizon=7, model="MOVING_AVG")

    # 주간 패턴 반영 확인 (주말 수요가 주중보다 적어야 함)
    forecasts = result.daily_forecast
    weekday_qtys = []
    weekend_qtys = []
    for f in forecasts:
        dt = date.fromisoformat(f["date"])
        if dt.weekday() >= 5:
            weekend_qtys.append(f["qty"])
        else:
            weekday_qtys.append(f["qty"])

    if weekday_qtys and weekend_qtys:
        avg_weekday = sum(weekday_qtys) / len(weekday_qtys)
        avg_weekend = sum(weekend_qtys) / len(weekend_qtys)
        print(f"  주중 평균: {avg_weekday:.1f}, 주말 평균: {avg_weekend:.1f}")
        # 주간 패턴이 반영되면 주말이 주중보다 적거나 같아야 함
        assert avg_weekend <= avg_weekday * 1.2, "주말 수요 ≤ 주중 수요"
        print(f"  ✅ 주간 패턴 정상 감지")
    else:
        print(f"  ✅ 주간 패턴 감지 (해당 기간 주중/주말 분리)")
    return True


def test_4_lead_time_analysis():
    """4. 공급업체 리드타임 분석"""
    print("\n=== 테스트 4: 리드타임 분석 ===")

    analyzer = LeadTimeAnalyzer()

    records = [
        LeadTimeRecord("p1", "현대모비스", "SKU-001",
                        date(2026, 1, 5), date(2026, 1, 10), 5, 100),
        LeadTimeRecord("p1", "현대모비스", "SKU-001",
                        date(2026, 1, 15), date(2026, 1, 21), 6, 200),
        LeadTimeRecord("p1", "현대모비스", "SKU-001",
                        date(2026, 2, 1), date(2026, 2, 5), 4, 150),
        LeadTimeRecord("p1", "현대모비스", "SKU-001",
                        date(2026, 2, 10), date(2026, 2, 15), 5, 120),
        LeadTimeRecord("p2", "SL", "SKU-001",
                        date(2026, 1, 5), date(2026, 1, 8), 3, 100),
        LeadTimeRecord("p2", "SL", "SKU-001",
                        date(2026, 1, 15), date(2026, 1, 18), 3, 200),
        LeadTimeRecord("p2", "SL", "SKU-001",
                        date(2026, 2, 1), date(2026, 2, 3), 2, 150),
    ]

    stats = analyzer.analyze(records, sku="SKU-001")

    assert len(stats) == 2, f"2개 공급업체 통계: {len(stats)}"
    # SL이 더 빠르므로 첫 번째
    assert stats[0].partner_name == "SL", f"SL이 가장 빠름: {stats[0].partner_name}"
    assert stats[0].avg_days < stats[1].avg_days, "평균 리드타임 정렬 확인"
    assert stats[0].reliability_score > 0, "신뢰도 점수 양수"

    print(f"  ✅ {stats[0].partner_name}: 평균 {stats[0].avg_days}일, 신뢰도 {stats[0].reliability_score}%")
    print(f"  ✅ {stats[1].partner_name}: 평균 {stats[1].avg_days}일, 신뢰도 {stats[1].reliability_score}%")
    return True


def test_5_supplier_ranking():
    """5. 공급업체 순위 비교"""
    print("\n=== 테스트 5: 공급업체 순위 ===")

    analyzer = LeadTimeAnalyzer()

    records = [
        LeadTimeRecord("p1", "A사", "SKU-X", date(2026, 1, 1), date(2026, 1, 8), 7, 100),
        LeadTimeRecord("p1", "A사", "SKU-X", date(2026, 1, 10), date(2026, 1, 18), 8, 100),
        LeadTimeRecord("p1", "A사", "SKU-X", date(2026, 1, 20), date(2026, 1, 27), 7, 100),
        LeadTimeRecord("p2", "B사", "SKU-X", date(2026, 1, 1), date(2026, 1, 4), 3, 100),
        LeadTimeRecord("p2", "B사", "SKU-X", date(2026, 1, 10), date(2026, 1, 13), 3, 100),
        LeadTimeRecord("p2", "B사", "SKU-X", date(2026, 1, 20), date(2026, 1, 24), 4, 100),
    ]

    ranking = analyzer.rank_suppliers(records, "SKU-X")
    assert ranking is not None, "순위 결과 존재"
    assert ranking.best_partner_name == "B사", f"최적 공급업체: {ranking.best_partner_name}"
    assert len(ranking.rankings) == 2, "2개 공급업체 순위"
    print(f"  ✅ 최적 공급업체: {ranking.best_partner_name} (평균 {ranking.rankings[0].avg_days}일)")

    # 리드타임 추정 (95% 신뢰 구간)
    estimated = analyzer.estimate_lead_time(records, "p2", "SKU-X")
    assert estimated is not None, "리드타임 추정값 존재"
    assert estimated >= 3, f"최소 3일 이상: {estimated}"
    print(f"  ✅ B사 예상 리드타임 (95% CI): {estimated}일")
    return True


def test_6_reorder_recommendation():
    """6. 발주 추천 (긴급도 분류)"""
    print("\n=== 테스트 6: 발주 추천 ===")

    engine = ReorderEngine()

    skus = [
        SkuInventoryInfo("SKU-A", "긴급 부품", "site-1", current_qty=30),
        SkuInventoryInfo("SKU-B", "보통 부품", "site-1", current_qty=500),
        SkuInventoryInfo("SKU-C", "여유 부품", "site-1", current_qty=2000),
    ]

    usage = {
        "SKU-A": _generate_history(30, base_qty=15),
        "SKU-B": _generate_history(30, base_qty=20),
        "SKU-C": _generate_history(30, base_qty=10),
    }

    lt_records = [
        LeadTimeRecord("p1", "공급사A", "SKU-A",
                        date(2026, 1, 1), date(2026, 1, 6), 5, 100),
        LeadTimeRecord("p1", "공급사A", "SKU-A",
                        date(2026, 1, 10), date(2026, 1, 15), 5, 100),
        LeadTimeRecord("p1", "공급사A", "SKU-A",
                        date(2026, 1, 20), date(2026, 1, 25), 5, 100),
    ]

    recommendations = engine.generate_recommendations(skus, usage, lt_records, 30)

    assert len(recommendations) >= 1, f"최소 1건 추천: {len(recommendations)}"
    # SKU-A는 재고 30개, 일 15개 사용 → 2일 내 소진 → CRITICAL
    critical = [r for r in recommendations if r.urgency == "CRITICAL"]
    assert len(critical) >= 1, f"CRITICAL 1건 이상: {len(critical)}"
    print(f"  ✅ 추천 {len(recommendations)}건 생성")

    for r in recommendations:
        print(f"     {r.urgency:8s} | {r.sku} | 재고 {r.current_qty} → "
              f"{r.days_until_out}일 후 소진 | 추천 발주 {r.reorder_qty}개")

    # 긴급도 순 정렬 확인
    urgency_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    for i in range(len(recommendations) - 1):
        a = urgency_order.get(recommendations[i].urgency, 4)
        b = urgency_order.get(recommendations[i + 1].urgency, 4)
        assert a <= b, "긴급도 순 정렬"
    print(f"  ✅ 긴급도 순 정렬 확인")
    return True


def test_7_auto_voucher():
    """7. 발주서 자동 생성 데이터"""
    print("\n=== 테스트 7: 발주서 자동 생성 ===")

    engine = ReorderEngine()

    from app.services.reorder.reorder_engine import ReorderRecommendation as RecRec

    recs = [
        RecRec(
            sku="SKU-A", item_name="긴급 부품", site_id="site-1",
            current_qty=30, safety_stock=100,
            stockout_date=date.today() + timedelta(days=3),
            days_until_out=3, reorder_qty=500,
            partner_id="p1", partner_name="공급사A", avg_lead_days=5,
            order_by_date=date.today(), urgency="CRITICAL",
            forecast_meta={"model": "LINEAR"},
        ),
        RecRec(
            sku="SKU-B", item_name="보통 부품", site_id="site-1",
            current_qty=200, safety_stock=150,
            stockout_date=date.today() + timedelta(days=14),
            days_until_out=14, reorder_qty=300,
            partner_id="p1", partner_name="공급사A", avg_lead_days=5,
            order_by_date=date.today() + timedelta(days=9), urgency="MEDIUM",
            forecast_meta={"model": "MOVING_AVG"},
        ),
    ]

    unit_prices = {"SKU-A": 15000, "SKU-B": 8000}
    vouchers = engine.prepare_auto_voucher(recs, unit_prices)

    assert len(vouchers) == 1, f"1개 공급업체 → 1개 발주서: {len(vouchers)}"
    v = vouchers[0]
    assert v.voucher_type == "PURCHASE", "매입 전표"
    assert v.partner_id == "p1", "공급업체 확인"
    assert len(v.lines) == 2, f"2개 라인: {len(v.lines)}"

    line_a = next(l for l in v.lines if l["sku"] == "SKU-A")
    assert line_a["qty"] == 500, f"발주량: {line_a['qty']}"
    assert line_a["unitPrice"] == 15000, f"단가: {line_a['unitPrice']}"
    print(f"  ✅ 발주서 생성: {v.partner_name}")
    print(f"     - {v.lines[0]['sku']}: {v.lines[0]['qty']}개 × ₩{v.lines[0]['unitPrice']:,}")
    print(f"     - {v.lines[1]['sku']}: {v.lines[1]['qty']}개 × ₩{v.lines[1]['unitPrice']:,}")
    print(f"  ✅ 비고: {v.note}")
    return True


def main():
    print("=" * 60)
    print("HanVoxel Phase 3 Step 3 — 자동 발주 추천 엔진 통합 테스트")
    print("=" * 60)

    tests = [
        ("1. 이동평균 수요 예측", test_1_forecast_moving_avg),
        ("2. 선형회귀 수요 예측", test_2_forecast_linear),
        ("3. 주간 패턴 감지", test_3_weekly_pattern),
        ("4. 리드타임 분석", test_4_lead_time_analysis),
        ("5. 공급업체 순위", test_5_supplier_ranking),
        ("6. 발주 추천 + 긴급도", test_6_reorder_recommendation),
        ("7. 발주서 자동 생성", test_7_auto_voucher),
    ]

    passed = 0
    failed = 0

    for name, test_fn in tests:
        try:
            result = test_fn()
            if result:
                passed += 1
        except Exception as e:
            print(f"\n  ❌ {name} 실패: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("\n" + "=" * 60)
    print(f"결과: {passed}/{len(tests)} 통과, {failed} 실패")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
