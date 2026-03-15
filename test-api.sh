#!/usr/bin/env bash
# HanVoxel — Phase 1~3 주요 엔드포인트 통합 테스트
# 실행: bash test-api.sh

API="http://localhost:3001/api/v1"
ML="http://localhost:8000/api/v1"
PASS=0
FAIL=0
SKIP=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

check() {
  local label="$1"
  local url="$2"
  local method="${3:-GET}"
  local body="$4"
  local expect_key="${5:-success}"

  if [ "$method" = "POST" ]; then
    resp=$(curl -s -X POST -H "Content-Type: application/json" -d "$body" "$url" 2>/dev/null)
  else
    resp=$(curl -s "$url" 2>/dev/null)
  fi

  if echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('$expect_key') is not None else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ $label${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ $label${NC}"
    echo "   URL: $url"
    echo "   Response: ${resp:0:150}"
    ((FAIL++))
  fi
}

check_ml() {
  local label="$1"
  local url="$2"
  local method="${3:-POST}"
  local body="$4"

  resp=$(curl -s -X "$method" -H "Content-Type: application/json" -d "$body" "$url" 2>/dev/null)
  if echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0)" 2>/dev/null; then
    echo -e "${GREEN}✅ $label${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ $label${NC}"
    echo "   Response: ${resp:0:200}"
    ((FAIL++))
  fi
}

echo "======================================"
echo " HanVoxel API 통합 테스트"
echo " 대상: $API"
echo "======================================"
echo ""

# ── Phase 1: Foundation ──
echo "── Phase 1: Foundation ──"
check "프리셋 카테고리 목록" "$API/preset-categories"
check "공간 프리셋 목록 (랙)" "$API/spatial-presets?categoryId=10000000-0000-0000-0000-000000000001"
check "창고 템플릿 목록" "$API/warehouse-templates"
check "요금 플랜 목록" "$API/plans"
echo ""

# ── Phase 2: Operations Layer ──
echo "── Phase 2: Operations Layer ──"
check "알림 목록" "$API/alerts"
check "SLA 타겟 목록" "$API/sla/targets"
check "SLA 메트릭 조회" "$API/sla/metrics?siteId=test"
check "QC 공급업체 목록" "$API/qc/suppliers"
check "피킹 주문 목록" "$API/picking/orders"
echo ""

# ── Phase 3: Intelligence Layer ──
echo "── Phase 3: Intelligence Layer ──"
check "ERP 거래처/고객 목록" "$API/erp/partners"
check "ERP 전표 목록" "$API/erp/vouchers"
check "ERP SKU 원가 목록" "$API/erp/costs"
check "HS 코드 감시 목록" "$API/trade/watch"
check "무역 데이터 조회" "$API/trade/data?hsCode=870323&reporterIso=KR&period=2024-01"
check "발주 추천 목록" "$API/reorder/recommendations?companyId=DEMO_COMPANY&siteId=DEMO_SITE"
check "ERP 커넥터 목록" "$API/connector/configs"
check "벤치마크 내 지표" "$API/benchmark/metrics?companyId=DEMO_COMPANY&siteId=DEMO_SITE&period=2024-01"
check "벤치마크 대시보드" "$API/benchmark/my?companyId=DEMO_COMPANY&siteId=DEMO_SITE&period=2024-01"
check "벤치마크 리포트 목록" "$API/benchmark/reports?companyId=DEMO_COMPANY"
check "벤치마크 히스토리" "$API/benchmark/history?companyId=DEMO_COMPANY&siteId=DEMO_SITE&months=3"
echo ""

# ── ML 서비스 ──
echo "── ML 서비스 ($ML) ──"
check_ml "이상 탐지 (단건)" "$ML/anomaly/detect" "POST" '{"companyId":"DEMO","siteId":"DEMO","timestamp":"2024-01-15T10:00:00","metric":"inventory_level","value":150,"historicalMean":100,"historicalStd":10}'
check_ml "SLA 평가" "$ML/sla/evaluate" "POST" '{"targetId":"t1","metricType":"ON_TIME_DELIVERY","recordDate":"2024-01-15","measuredValue":95.0,"targetValue":98.0}'
check_ml "피킹 최적화" "$ML/picking/optimize" "POST" '{"orderId":"o1","siteId":"DEMO","policy":"FIFO","items":[{"skuId":"SKU001","quantity":2,"bins":[{"binId":"A-01","quantity":10,"receivedAt":"2024-01-01T00:00:00","location":{"aisle":"A","rack":"01","level":1},"distanceFromPicking":5.0}]}]}'
check_ml "수요 예측" "$ML/reorder/forecast" "POST" '{"skuId":"SKU001","siteId":"DEMO","dailyUsages":[100,110,95,120,105,98,115],"forecastDays":7}'
check_ml "벤치마크 집계" "$ML/benchmark/aggregate" "POST" '{"period":"2024-01","industry":"LOGISTICS","companySize":"MEDIUM","companies":[{"companyId":"A","siteId":"S1","pickingAccuracy":97.5,"inventoryTurnover":8.2,"spaceUtilization":75.0,"onTimeDelivery":95.3,"receivingTime":2.1,"orderCycleTime":4.5},{"companyId":"B","siteId":"S1","pickingAccuracy":94.0,"inventoryTurnover":6.5,"spaceUtilization":68.0,"onTimeDelivery":91.0,"receivingTime":3.2,"orderCycleTime":6.1},{"companyId":"C","siteId":"S1","pickingAccuracy":99.0,"inventoryTurnover":10.0,"spaceUtilization":82.0,"onTimeDelivery":98.5,"receivingTime":1.5,"orderCycleTime":3.2},{"companyId":"D","siteId":"S1","pickingAccuracy":96.0,"inventoryTurnover":7.8,"spaceUtilization":72.0,"onTimeDelivery":93.0,"receivingTime":2.8,"orderCycleTime":5.0},{"companyId":"E","siteId":"S1","pickingAccuracy":92.0,"inventoryTurnover":5.5,"spaceUtilization":65.0,"onTimeDelivery":88.0,"receivingTime":4.0,"orderCycleTime":7.5}]}'
echo ""

echo "======================================"
echo -e " 결과: ${GREEN}${PASS} 통과${NC} | ${RED}${FAIL} 실패${NC} | ${YELLOW}${SKIP} 스킵${NC}"
echo "======================================"
