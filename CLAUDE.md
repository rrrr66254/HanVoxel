# HanVoxel — CLAUDE.md

> Claude Code가 이 프로젝트 작업 시 항상 참고하는 컨텍스트 파일입니다.

---

## 📄 참조 문서

@HanVoxel_BusinessPlan.md
@warehouse-standards.md

- 모든 기능 개발, 설계 결정, DB 스키마 작성 시 비즈니스 플랜을 기준으로 판단한다.
- 모든 3D 오브젝트 치수, 랙/팔레트/컨테이너 규격은 반드시 `warehouse-standards.md` 기준을 따른다.

---

## 🎯 현재 개발 상태

```
현재 Phase: Phase 3 — Intelligence Layer
현재 Step:  Step 5 (업계 벤치마크 기능)
```

### 전체 진행 현황

```
✅ Phase 1 — Foundation
   ✅ Step 1: 3D 창고 뷰어 (Three.js + 그리드 스냅 + 프리셋 카탈로그)
   ✅ Step 2: 재고 기본 처리 (바코드 스캔 + 입출고)
   ✅ Step 3: 재고 현황 대시보드
   ✅ Step 4: 창고 초기 세팅 마법사 (4단계 + layout-generator)
   ✅ Step 5: ROI 계산기 + SaaS 과금 인프라 (Stripe 준비)

✅ Phase 2 — Operations Layer
   ✅ Step 1: 이상 탐지 알림 (ML 4종 알고리즘 + alerts 테이블)
   ✅ Step 2: SLA 모니터링 (sla_targets / sla_metrics / sla_violations)
   ✅ Step 3: 품질 검수 관리 QC (suppliers / qc_inspections / qc_defect_items)
   ✅ Step 4: 모바일 피킹 앱 + FIFO/FEFO/NEAREST 정책 엔진 (PWA)
   ✅ Step 5: SaaS 정식 과금 (Stripe Checkout + Webhook + 플랜 제한 미들웨어)

🔄 Phase 3 — Intelligence Layer
   ✅ Step 1: 물류 특화 경량 ERP (거래처/전표/원가/마진/더존·영림원 커넥터)
   ✅ Step 2: HS 코드 기반 글로벌 무역 인텔리전스 (4개 API 수집 + 야간배치 + 대시보드)
   ✅ Step 3: 자동 발주 추천 엔진 (ML 수요예측 + 리드타임 학습 + 발주서 자동생성)
   ✅ Step 4: 더존/영림원 커넥터 정식 출시 (OAuth2/API_KEY 인증 + 필드매핑 + 모니터링 대시보드)
   ⬜ Step 5: 업계 벤치마크 기능

⬜ Phase 4 — AI & Portal Layer
⬜ Phase 5 — Platform & Global
```

> Phase/Step 완료 시 이 섹션을 업데이트할 것.

---

## 🏗️ 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 18 + TypeScript + Three.js + Tailwind CSS + PWA |
| Backend | Node.js (Express) + TypeScript |
| Database | PostgreSQL 15 + PostGIS + Redis |
| ML / AI | Python 3.11 + FastAPI + scikit-learn + PyTorch + APScheduler |
| Event Bus | Kafka (Phase 3 이후) / 초기에는 직접 호출 |
| Infra | Docker + Docker Compose (로컬) → AWS EKS (프로덕션) |
| CI/CD | GitHub Actions |
| ORM | Prisma (Node.js) / SQLAlchemy (Python) |
| 결제 | Stripe (Checkout + Webhook) |

---

## 📁 프로젝트 구조

```
hanvoxel/
├── CLAUDE.md
├── HanVoxel_BusinessPlan.md
├── warehouse-standards.md
├── .gitignore
├── .github/
│   └── workflows/
├── packages/
│   ├── frontend/              # React + Three.js + PWA
│   ├── api-gateway/           # Node.js BFF
│   ├── spatial-service/       # 핵심 공간 서비스
│   ├── inventory-service/     # 재고 서비스
│   └── ml-service/            # Python FastAPI
│       ├── anomaly/           # 이상 탐지 엔진
│       ├── sla/               # SLA 평가 엔진
│       ├── qc/                # QC 스코어카드
│       ├── picking/           # FIFO/FEFO/NEAREST 정책
│       ├── trade/             # HS 코드 무역 데이터 집계
│       │   ├── trade-aggregator.py   # 멀티 API 수집
│       │   └── nightly-prefetch.py  # 야간 배치 선점
│       └── erp/               # ERP 커넥터
├── database/
│   ├── migrations/
│   └── seeds/
│       ├── presets/
│       │   ├── rack-presets.ts
│       │   ├── pallet-presets.ts
│       │   ├── container-presets.ts
│       │   ├── product-presets.ts
│       │   └── warehouse-templates.ts
│       └── index.ts
├── docker-compose.yml
└── README.md
```

---

## 🗄️ 핵심 설계 원칙

1. **Spatial First** — 모든 데이터는 반드시 `spatial_objects`와 연결되어야 한다
2. **Phase 범위 준수** — 현재 Phase에 없는 기능은 설계에 포함하지 않는다
3. **한국어 주석** — 코드 주석은 한국어로 작성한다
4. **API 우선** — UI보다 API 스펙을 먼저 설계한다
5. **타입 안전** — TypeScript strict 모드, any 사용 금지
6. **캐시 우선** — 외부 API 호출 전 항상 Redis → DB 캐시 순으로 확인

---

## 🗃️ DB 규칙

- **DB**: PostgreSQL 15 + PostGIS
- **ORM**: Prisma
- **좌표 단위**: meter, origin은 site 기준
- **rotation**: Euler 방식
- **타임스탬프**: 모든 테이블에 `created_at`, `updated_at` 필수
- **소프트 삭제**: 중요 데이터는 `deleted_at` 컬럼으로 처리

### 전체 테이블 목록

```
# Phase 1
spatial_objects, spatial_object_types, spatial_hierarchies
inventory_balances, inventory_locations, stock_movements
companies, sites, users, roles, permissions, role_permissions
preset_categories, spatial_presets, warehouse_templates
plans, payment_history

# Phase 2
alerts
sla_targets, sla_metrics, sla_violations
suppliers, qc_inspections, qc_defect_items
picking_orders, picking_lines

# Phase 3 (진행 중)
erp_vendors, erp_customers, erp_vouchers, erp_cost_ledger
hs_code_watch, hs_code_master, hs_code_coverage
trade_data_cache, hs_search_log, prefetch_batch_log
sku_daily_usage, supplier_lead_times
demand_forecasts, reorder_recommendations
```

---

## 🌐 HS 코드 글로벌 무역 인텔리전스

> Phase 3 Step 2 핵심 기능. 데이터 플라이휠 전략으로 DB 자산을 지속 축적한다.

### 데이터 소스 우선순위

| 우선순위 | API | 커버리지 | 무료 한도 | HS 지원 | 업데이트 |
|---------|-----|---------|---------|---------|---------|
| ⭐⭐⭐ | **UN Comtrade** | 200개국 | 500 calls/일 | 6자리 | 월별/연별 |
| ⭐⭐⭐ | **한국 관세청 UNI-PASS** | 한국 | 무제한 | 10자리 | 월별 |
| ⭐⭐ | **미국 Census Bureau** | 미국 | 무제한 | 10자리 | 월별 |
| ⭐⭐ | **EU Eurostat** | EU 27개국 | 무제한 | 8자리 | 월별 |
| ⭐ | **World Bank WITS** | 200개국 | 무제한 | 6자리 | 연별 |
| ⭐ | **일본 e-Stat** | 일본 | 무제한 | 9자리 | 월별 |

### 500 calls/일 배분 전략 (UN Comtrade)

```
하루 500 calls
├── 실시간 유저 요청    200 calls  (예약, 소진 시 캐시 응답)
├── 인기 코드 갱신      100 calls  (검색 10회+ 코드 월별 갱신)
└── 신규 코드 선점      200 calls  (야간 배치, 우선순위 알고리즘)
```

### 데이터 플라이휠 흐름

```
유저가 HS 코드 검색
        │
        ├── HsSearchLog 기록
        │
        ▼
Redis 캐시 → DB 캐시 확인 → 있으면 즉시 응답
        │ 없으면
        ▼
멀티 API 동시 조회 (trade-aggregator.py)
결과 정규화 (USD 기준) → Redis + DB 저장
        │
        ▼
같은 챕터 연관 코드 → 야간 배치 큐 자동 등록
        │
        ▼
야간 배치 자정 실행 (nightly-prefetch.py)
우선순위: 인접코드(+40) > 한국주요챕터(+30) > 글로벌상위(+20) > 랜덤(+10)
```

### 한국 주요 챕터 (선점 우선순위 높음)

```
87 자동차·트랙터    85 전기기기·전자    84 기계류
90 광학·정밀기기    39 플라스틱         72 철강
29 유기화학품       27 광물성 연료
```

### DB 스키마

```prisma
model HsCodeWatch {
  id            String   @id @default(cuid())
  companyId     String
  hsCode        String
  description   String
  descriptionEn String?
  isMain        Boolean  @default(false)
  createdAt     DateTime @default(now())
  @@unique([companyId, hsCode])
}

model TradeDataCache {
  id          String   @id @default(cuid())
  hsCode      String
  reporterIso String
  partnerIso  String
  period      String
  flowType    String   // "EXPORT" | "IMPORT"
  valueUsd    Float
  weightKg    Float?
  source      String   // "UN_COMTRADE" | "KR_CUSTOMS" | "US_CENSUS" | "EU_EUROSTAT"
  fetchedAt   DateTime @default(now())
  expiresAt   DateTime
  @@unique([hsCode, reporterIso, partnerIso, period, flowType])
}

model HsCodeMaster {
  hsCode        String @id
  description   String
  descriptionEn String
  chapter       String
  heading       String
}

model HsSearchLog {
  id          String   @id @default(cuid())
  companyId   String?
  hsCode      String
  reporterIso String
  searchedAt  DateTime @default(now())
  resultCount Int
  cacheHit    Boolean
  @@index([hsCode])
  @@index([searchedAt])
}

model HsCodeCoverage {
  hsCode          String    @id
  lastFetchedAt   DateTime?
  fetchCount      Int       @default(0)
  searchCount     Int       @default(0)
  priority        Float     @default(0)
  isPopular       Boolean   @default(false)
  countriesCached String[]
  updatedAt       DateTime  @updatedAt
}

model PrefetchBatchLog {
  id           String   @id @default(cuid())
  runAt        DateTime @default(now())
  callsUsed    Int
  codesAdded   Int
  cacheHitRate Float
  strategy     String   // "POPULAR" | "ADJACENT" | "RANDOM"
}
```

### 캐시 TTL 정책

| 데이터 유형 | TTL |
|-----------|-----|
| 월별 수출입 데이터 | 30일 |
| 연별 집계 데이터 | 90일 |
| HS 코드 마스터 | 영구 |
| 인기 코드 (검색 10회+) | 7일 |

---

## 📦 프리셋 카탈로그 시스템

> `warehouse-standards.md`에 정의된 모든 규격을 DB seed 데이터로 관리한다.

### Seed 데이터 (실제 적재 완료: 67개 레코드)

| 카테고리 | 수량 |
|---------|------|
| 랙 | 15종 (국내 4 + 국제 5 + 특수 6) |
| 팔레트 | 14종 (국내 3 + ISO 6 + 특수 5) |
| 적재 팔레트 | 5종 |
| 컨테이너 | 10종 |
| 통로 | 9종 |
| 제품 박스 | 7종 |
| 창고 템플릿 | 7종 |

### 규칙

- `isSystem: true` 프리셋은 수정/삭제 불가 (읽기 전용)
- 유저가 편집하면 `isSystem: false`인 새 프리셋으로 저장
- 모든 치수는 `warehouse-standards.md`의 meter 단위 기준값 사용

---

## 🔌 API 규칙

- **형식**: REST + JSON
- **버전**: `/api/v1/`
- **인증**: JWT Bearer Token
- **응답 형식**:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": { "page": 1, "total": 100 }
}
```
- **에러 응답**:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "NOT_FOUND", "message": "리소스를 찾을 수 없습니다" }
}
```

---

## 🌿 Git 브랜치 전략

```
main          ← 프로덕션 배포용 (직접 push 금지)
develop       ← 개발 통합 브랜치
feature/      ← 기능 개발 (예: feature/hs-code-intelligence)
fix/          ← 버그 수정 (예: fix/trade-cache-ttl)
phase/        ← Phase 단위 작업 (예: phase3/intelligence)
```

### 커밋 메시지 규칙

```
feat: HS 코드 글로벌 무역 인텔리전스 대시보드 추가
fix: UN Comtrade API rate limit 처리 수정
chore: 야간 배치 스케줄러 설정 추가
docs: 무역 데이터 캐시 TTL 정책 업데이트
refactor: trade-aggregator 병렬 처리 최적화
```

---

## ✅ 작업 요청 시 기본 흐름

```
1. DB 스키마 / Migration
2. API 엔드포인트 (라우터 + 컨트롤러)
3. 서비스 로직
4. 프론트엔드 컴포넌트
5. 테스트 코드
```

---

## 🚫 하지 말아야 할 것

- 현재 Phase에 없는 기능 선구현 금지
- `any` 타입 사용 금지
- 하드코딩된 좌표값 금지 (항상 DB에서 조회)
- 직접 DB 접근 금지 (반드시 서비스 레이어 경유)
- 프론트에서 비즈니스 로직 처리 금지
- 외부 API 직접 호출 금지 (반드시 캐시 레이어 경유)
- UN Comtrade 500 calls/일 한도 초과 금지 (배분 전략 준수)
