# HanVoxel Business Plan
**Spatial Digital Twin Factory Platform**

> Version 1.0 | Confidential

---

## 1. Executive Summary

HanVoxel은 공장과 창고를 3D 공간 중심으로 디지털화하고, WMS·MES·ERP·Simulation을 하나의 플랫폼에 통합하는 **Spatial Digital Twin Factory Platform**이다.
중견 제조업체가 SAP·Oracle 없이도 스마트 팩토리 수준의 운영 가시성과 의사결정 지원을 받을 수 있도록 설계되었다.

| 구분 | 내용 |
|------|------|
| 타겟 시장 | 중견 제조업·물류 창고 (직원 50~300명, 비SAP 기업) |
| 핵심 차별화 | 3D Spatial + WMS + MES + Simulation 올인원 / 국내 중견기업 최적화 |
| 수익 모델 | SaaS 구독 (₩150만~커스텀/월) + 구축 프로젝트 + API 커넥터 |
| Phase 1 목표 | 파일럿 3곳 확보, MVP 출시 |
| 최종 목표 | MRR ₩2억, 고객사 100곳, 동남아 진출 |

---

## 2. 확정 기능 목록 (총 10개)

### Core Platform
| # | 기능명 | Phase | 핵심 가치 |
|---|--------|-------|-----------|
| 0 | **공장 디지털 트윈 (Core)** | Phase 1 | 3D Spatial 모델 기반 WMS·MES·ERP 통합. 모든 기능의 기반 |

### Operations Layer
| # | 기능명 | Phase | 핵심 가치 |
|---|--------|-------|-----------|
| 1 | **이상 탐지 알림** | Phase 2 | 재고 급변·피킹 오류 등 비정상 패턴을 AI가 실시간 감지 |
| 2 | **SLA 모니터링** | Phase 2 | 납기 준수율·오배송률 등 KPI를 고객사별 실시간 추적 |
| 3 | **품질 검수 관리 (QC)** | Phase 2 | 입출고 불량률 추적, 공급업체 품질 스코어카드, 불량 재고 공간 격리 |

### Intelligence Layer
| # | 기능명 | Phase | 핵심 가치 |
|---|--------|-------|-----------|
| 4 | **물류 특화 경량 ERP** | Phase 3 | 거래처 관리, 전표 자동 생성, 재고 원가 계산, 더존/영림원 연동 |
| 5 | **동종업계 인텔리전스** | Phase 3 | 관세청·KOTRA 수출입 데이터 + 업계 매출 벤치마크 + 내 창고 순위 |
| 6 | **자동 발주 추천 엔진** | Phase 3 | ML 기반 재고 소진 예측, 리드타임 학습, 발주서 자동 생성 |

### AI & Portal Layer
| # | 기능명 | Phase | 핵심 가치 |
|---|--------|-------|-----------|
| 7 | **AI 레이아웃 어드바이저** | Phase 4 | 시뮬레이션 결과를 AI가 해석해 창고 레이아웃 변경 ROI 자동 계산 |
| 8 | **고객사 포털** | Phase 4 | 납품 고객이 직접 로그인해 재고·출고 현황 조회. B2B 경쟁력 강화 |

### Platform Layer
| # | 기능명 | Phase | 핵심 가치 |
|---|--------|-------|-----------|
| 9 | **멀티 사이트 관리** | Phase 5 | 다수 공장·창고를 하나의 화면에서 비교·관리. 중견기업 이상 필수 |

---

## 3. Phase별 상세 로드맵

### Phase 1 — Foundation

**목표:** MVP 출시, 파일럿 고객 3곳 확보, PMF 검증
**수익 목표:** ₩0 (투자 단계) → 레퍼런스 케이스 확보
**성공 지표:** 파일럿 3곳 / NPS 40+ / 재방문율 80%
**주요 기능:** 공장 디지털 트윈 (Core MVP)

#### 마일스톤
- **Step 1:** `spatial_objects` 테이블 + Three.js 기반 3D 창고 뷰어 구현
- **Step 2:** 바코드 스캔 → 재고 위치 업데이트 / 기본 입출고 처리
- **Step 3:** `inventory_locations` 연동 재고 현황 대시보드
- **Step 4:** 파일럿 고객 2~3곳 무상/할인 도입, UX 피드백 수집
- **Step 5:** ROI 케이스 스터디 작성, SaaS 과금 인프라 준비

#### 핵심 DB 테이블 (MVP)
```
spatial_objects / spatial_object_types / spatial_hierarchies
inventory_balances / inventory_locations / stock_movements
users / roles / permissions / sites
```

---

### Phase 2 — Operations Layer

**목표:** 유료 전환, 운영 안정화, MRR ₩1,500만 달성
**수익 목표:** Starter ₩150만 × 10곳 → MRR ₩1,500만
**성공 지표:** 유료 고객 10곳 / 이탈률 5% 이하 / 오류 감지 정확도 90%+
**주요 기능:** 이상 탐지 알림 / SLA 모니터링 / 품질 검수 관리

#### 마일스톤
- **Step 1:** 이상 탐지 알림 — 머신러닝 기반 비정상 패턴 탐지 엔진 구축
- **Step 2:** SLA 모니터링 — 고객사별 납기 준수율·KPI 실시간 대시보드
- **Step 3:** QC 관리 — 입출고 불량률 추적 + 공급업체 품질 스코어카드
- **Step 4:** 모바일 피킹 앱 (PDA/태블릿) + FIFO/FEFO 정책 엔진
- **Step 5:** SaaS 정식 과금 전환 + CS 프로세스 정립

#### 기능 상세

**이상 탐지 알림**
- 재고 수치 급변, 피킹 오류 급증 등 비정상 패턴 실시간 감지
- Slack / 이메일 / 앱 푸시 알림 연동
- 알림 임계값 커스터마이징

**SLA 모니터링**
- 납기 준수율, 오배송률, 피킹 정확도 KPI 추적
- 고객사별 SLA 기준 설정
- 위반 시 자동 에스컬레이션

**품질 검수 관리 (QC)**
- 입고/출고 시 불량률 자동 추적
- 공급업체별 품질 스코어카드
- 불량 재고 격리 위치 관리 (공간 객체 연동)
- QC 이슈 → SLA 영향 자동 분석 연계

---

### Phase 3 — Intelligence Layer

**목표:** Growth 티어 판매, 외부 데이터 연동, MRR ₩5,000만
**수익 목표:** Growth ₩400만 × 50곳 → MRR ₩2억 진입 준비
**성공 지표:** 유료 고객 50곳 / Growth 전환율 30% / 발주 추천 채택률 60%+
**주요 기능:** 물류 특화 경량 ERP / 동종업계 인텔리전스 / 자동 발주 추천 엔진

#### 마일스톤
- **Step 1:** 물류 특화 경량 ERP — 거래처 관리·전표 자동 생성·원가 계산
- **Step 2:** 더존 iCUBE / 영림원 ERP 연동 커넥터 출시
- **Step 3:** 동종업계 인텔리전스 — 관세청·KOTRA API 연동 대시보드
- **Step 4:** 자동 발주 추천 엔진 — ML 수요 예측 + 발주서 자동 생성
- **Step 5:** 업계 벤치마크 기능 — 익명 집계 데이터 기반 내 창고 순위 제공

#### 기능 상세

**물류 특화 경량 ERP**
```
포함 기능 (경량)
├── 거래처 관리 (공급업체 / 고객사 마스터 + 거래 이력)
├── 전표 자동 생성 (입고 → 매입 / 출고 → 매출 / 발주서·납품확인서)
├── 재고 원가 계산 (FIFO / 이동평균)
└── SKU별 마진율 조회

외부 연동 (복잡한 회계는 위임)
├── 더존 iCUBE 커넥터
├── 영림원 커넥터
└── 전자세금계산서 — 연동으로 처리
```

**동종업계 인텔리전스**
```
데이터 소스
├── 관세청 수출입무역통계 OpenAPI
├── KOTRA 무역빅데이터
└── 통계청 광업제조업조사

제공 뷰
├── 월별 수출입 추이 (업종 선택)
├── 주요 교역 국가 현황 + YoY 변화
├── 업계 매출 벤치마크
└── 내 창고 효율 업계 순위 (익명 집계)
```

**자동 발주 추천 엔진**
```
기능
├── 재고 소진 예측 (ML 기반 수요 예측)
├── 공급업체 리드타임 학습
├── 발주서 자동 생성 + ERP 연동
└── "SKU-2891 재고 3일 후 소진 예정" 알림
```

---

### Phase 4 — AI & Portal Layer

**목표:** 엔터프라이즈 딜 수주, AI 기능 고도화
**수익 목표:** Enterprise 커스텀 딜 ₩1,000만+/월 첫 수주
**성공 지표:** Enterprise 고객 5곳 / AI 레이아웃 추천 채택률 50% / 포털 MAU 200+
**주요 기능:** AI 레이아웃 어드바이저 / 고객사 포털

#### 마일스톤
- **Step 1:** Simulation 엔진 완성 — Discrete Event 기반 Worker/AGV/Machine 시뮬레이션
- **Step 2:** AI 레이아웃 어드바이저 — 시뮬레이션 결과 AI 해석 + ROI 자동 계산
- **Step 3:** 고객사 포털 — B2B 납품 고객 전용 재고/출고 현황 조회 UI
- **Step 4:** AGV·로봇 연동 API — `path_graph` 기반 경로 관제
- **Step 5:** Enterprise 패키지 출시 + 대기업 영업 본격화

#### 기능 상세

**AI 레이아웃 어드바이저**
```
흐름
Simulation 실행 → 결과 분석 → AI 자연어 해석 → 변경 ROI 제안 → 원클릭 적용

출력 예시
"현재 레이아웃에서 랙 B-12 이동 시 피킹 효율 +23% 예상
 예상 연간 절감액: ₩4,800만
 [시뮬레이션 확인] [레이아웃 적용]"
```

**고객사 포털**
- 납품 고객사 전용 로그인
- 내 재고 현황 / 출고 이력 / 납기 상태 조회
- 입고 예정 / 클레임 접수 기능

---

### Phase 5 — Platform & Global

**목표:** 플랫폼 생태계 구축, 동남아 진출, 시리즈 A
**수익 목표:** MRR ₩5억+ / 시리즈 A ₩50~100억
**성공 지표:** 고객사 200곳 / 해외 매출 비중 20% / NRR 120%+
**주요 기능:** 멀티 사이트 관리 / 글로벌 확장

#### 마일스톤
- **Step 1:** 멀티 사이트 관리 — 다수 공장/창고 통합 비교 대시보드
- **Step 2:** SI 파트너 생태계 구축 — 중소 물류 SI 업체 10곳 파트너십
- **Step 3:** 동남아 진출 — 베트남·태국·인도네시아 (삼성·LG 협력사 타겟)
- **Step 4:** 앱 마켓플레이스 오픈 — 3rd party 플러그인 생태계
- **Step 5:** 시리즈 A 투자 유치 / IPO·M&A 준비

#### 동남아 진출 계획
| 국가 | 타겟 | 진입 방식 |
|------|------|-----------|
| 베트남 | 삼성·LG 협력사 공장 (하노이·호치민) | 국내 협력사 레퍼런스 활용 + 현지 파트너 계약 |
| 태국 | 자동차 부품 창고 (방콕·라용) | Toyota·Honda 1차 협력사 타겟 |
| 인도네시아 | FMCG 물류창고 (자카르타) | 현지 물류 SI와 파트너십 |

---

## 4. 수익 모델

### 4-1. SaaS 구독 (메인)

| 플랜 | 가격 | 대상 | 포함 기능 |
|------|------|------|-----------|
| **Starter** | ₩150만/월 | 중소 창고 1곳 | 3D 가시화, 기본 WMS, 이상 탐지, SLA, QC |
| **Growth** | ₩400만/월 | 중견기업 1~3곳 | Starter + ERP + 인텔리전스 + 발주 추천 |
| **Enterprise** | 커스텀 | 대기업·멀티사이트 | Growth + AI 어드바이저 + 포털 + 멀티사이트 |

### 4-2. 추가 수익 항목

| 항목 | 금액 | 설명 |
|------|------|------|
| 구축 프로젝트 | ₩500만~3,000만 | CAD 임포트, 초기 창고 세팅, 데이터 마이그레이션 |
| ERP 커넥터 | ₩50만/월 | SAP, 더존, 영림원 등 추가 연동 |
| API 사용량 | 종량제 | 초과 호출 시 과금 |
| 업계 인텔리전스 리포트 | ₩30만/월 | 월별 업종 수출입·매출 벤치마크 리포트 (PDF) |
| 교육·트레이닝 | ₩100만/회 | 현장 작업자·관리자 교육 |

### 4-3. 매출 목표

| 구분 | Phase 2 말 | Phase 3 말 | Phase 5 말 |
|------|------------|------------|------------|
| 고객사 수 | 10곳 | 50곳 | 200곳+ |
| MRR | ₩1,500만 | ₩5,000만 | ₩5억+ |
| ARR | ₩1.8억 | ₩6억 | ₩60억+ |
| 주요 티어 | Starter 중심 | Growth 전환 | Enterprise 확대 |

---

## 5. 경쟁사 분석 및 포지셔닝

| 경쟁사 | 강점 | 약점 | HanVoxel 기회 |
|--------|------|------|--------------|
| Siemens Xcelerator | 최고 수준 시뮬레이션 | 수억~수십억, 도입 24개월+ | 중견기업 가격·속도 차별화 |
| SAP Digital Mfg. | ERP 완벽 연동 | SAP 없으면 의미 없음 | 비SAP 기업 타겟 |
| NVIDIA Omniverse | 포토리얼리스틱 3D | WMS 기능 전무 | Spatial + WMS 통합 강점 |
| Blue Yonder WMS | AI 공급망 예측 | 3D Spatial 없음, 고가 | Spatial 통합 + 합리적 가격 |
| Infor WMS | 멀티사이트 최적화 | 엔터프라이즈 전용 | 중견기업 도입 장벽 낮춤 |
| Acumatica | 중소기업용, 저렴 | 3D Spatial·시뮬레이션 없음 | Spatial + Simulation 차별화 |

### HanVoxel 포지셔닝

```
                    고기능
                      ▲
         Siemens   SAP   IBM
                      │
    ──────────────────────────► 고가격
                      │
         Blue Yonder  Infor
                      │
              ┌───────┴───────┐
              │   HanVoxel    │  ← 중견기업 / 빠른 도입 / 합리적 가격
              └───────────────┘
         Acumatica   Epicor
                      ▼
                    기본기능
```

**HanVoxel만의 독보적 강점**
- ✅ 3D Spatial + WMS + MES + Simulation 올인원 — 경쟁사 중 유일한 통합 솔루션
- ✅ 중견기업 최적화 가격 — 대기업 솔루션 대비 1/10 비용, 빠른 도입
- ✅ 동종업계 인텔리전스 — 수출입·매출 벤치마크 제공, 타 WMS 불가능한 데이터 Lock-in
- ✅ 한국 제조업 특화 — 로컬 지원, 한국어 UX, 더존/영림원 연동

---

## 6. GTM (Go-To-Market) 전략

### 6-1. 초기 타겟 세그먼트

| 우선순위 | 타겟 | 이유 |
|----------|------|------|
| 1순위 | 중견 자동차 부품 창고 (50~300명) | ERP는 있지만 Spatial 가시화 없는 경우 많음 |
| 2순위 | 식품·냉장 창고 | FEFO 알고리즘 강점 활용, 온도 조건 관리 필요 |
| 3순위 | 이커머스 풀필먼트 센터 | 피킹 최적화·SLA 모니터링 즉시 ROI 증명 가능 |

### 6-2. 채널 전략

- **파일럿 프로그램** — 초기 3곳 무상/할인 도입으로 레퍼런스 케이스 확보
- **SI 파트너십** — 중소 물류 SI 업체와 협력, 영업망 활용 (Phase 3~)
- **ROI 계산기** — 웹 랜딩페이지에 '우리 창고 도입 시 연간 절약액' 계산기 제공
- **콘텐츠 마케팅** — '공장 3D로 만들어봤습니다' 유튜브/링크드인 시리즈
- **전시회·컨퍼런스** — 스마트팩토리+오토메이션월드, 물류산업전 참가

---

## 7. 기술 스택

| 레이어 | 기술 선택 |
|--------|-----------|
| Frontend | React + Three.js (3D) / Tailwind CSS / TypeScript |
| API Gateway | Node.js BFF / JWT Auth / REST + WebSocket |
| Microservices | 9개 서비스 (Spatial, Inventory, WES, Production, Simulation 등) |
| Event Bus | Kafka / Redpanda |
| Database | PostgreSQL + PostGIS / Redis / S3 (3D 에셋) |
| ML / AI | Python FastAPI / scikit-learn / PyTorch |
| Infra | AWS EKS (Kubernetes) / Terraform / GitHub Actions CI/CD |
| 외부 연동 | 관세청 OpenAPI / KOTRA 무역빅데이터 / 더존·영림원 ERP 커넥터 |

### 전체 시스템 아키텍처

```
Client Applications
(Web / Tablet / Mobile / Dashboard)
        │
        ▼
API Gateway / BFF
(Auth / Routing / Aggregation)
        │
        ├── Identity Service
        ├── Spatial Service
        ├── Master Data Service
        ├── Inventory Service
        ├── Warehouse Execution Service
        ├── Production Service
        ├── Simulation Service
        ├── Analytics Service
        └── Integration Service
        │
        ▼
Event Bus (Kafka / Redpanda)
        │
        ▼
Data Platform
(PostgreSQL + PostGIS / Redis / S3)
```

### Spatial 계층 구조

```
SITE
 └── BUILDING
       └── FLOOR
             └── ZONE
                   ├── AISLE
                   ├── RACK
                   │     └── BIN
                   ├── WORKSTATION
                   ├── MACHINE
                   └── SAFETY_ZONE
```

---

## 8. 핵심 DB 테이블 (전체 ~80개)

```
Organization / Access       → companies, sites, users, roles, permissions
Spatial Core                → spatial_objects, racks, bins, path_nodes, path_edges
Spatial Geometry            → spatial_mesh_assets, spatial_snapshots, cad_import_jobs
Master Data                 → items, sku_master, suppliers, customers
Inventory / Warehouse       → inventory_balances, inventory_locations, stock_movements
Warehouse Execution         → warehouse_tasks, task_assignments, handling_units
Production / MES            → work_orders, bom_headers, machine_states, quality_inspections
Simulation                  → simulation_scenarios, simulation_runs, simulation_results
Integration                 → integration_endpoints, external_object_mappings
ERP (경량)                  → vendors, purchase_orders, sales_orders, cost_ledger
```

---

*HanVoxel Inc. | Confidential*
