HanVoxel — CLAUDE.md
Claude Code가 이 프로젝트 작업 시 항상 참고하는 컨텍스트 파일입니다.
📄 참조 문서
@HanVoxel_BusinessPlan.md
@warehouse-standards.md
모든 기능 개발, 설계 결정, DB 스키마 작성 시 비즈니스 플랜을 기준으로 판단한다.
모든 3D 오브젝트 치수, 랙/팔레트/컨테이너 규격은 반드시 warehouse-standards.md 기준을 따른다.
🎯 현재 개발 상태
현재 Phase: Phase 2 — Intelligence Layer
현재 Step:  Step 3 (품질 검수 관리)

Phase 1 완료 항목:
- Step 1: Docker + PostgreSQL/PostGIS + Prisma 스키마 + 3D 창고 뷰어
- Step 2: warehouse-standards.md 기반 현실적 창고 레이아웃
- Step 3: 프리셋 카탈로그 (API + UI) + 드래그 배치 + 치수 편집 + DB 저장
- Step 4: 창고 초기 세팅 마법사 (4단계 온보딩)
- Step 5: ROI 계산기 + SaaS 과금 인프라 (Starter/Growth/Enterprise)

Phase 2 완료 항목:
- Step 1: ML 이상 탐지 엔진 (Z-Score/IQR/Isolation Forest/Ensemble) + 알림 시스템
- Step 2: SLA 모니터링 (KPI 대시보드 + 위반 탐지 + 에스컬레이션 + 리포트)

Phase가 진행될 때마다 이 섹션을 업데이트할 것.
🏗️ 기술 스택
레이어
기술
Frontend
React 18 + TypeScript + Three.js + Tailwind CSS
Backend
Node.js (Express) + TypeScript
Database
PostgreSQL 15 + PostGIS + Redis
ML / AI
Python 3.11 + FastAPI + scikit-learn + PyTorch
Event Bus
Kafka (Phase 3 이후) / 초기에는 직접 호출
Infra
Docker + Docker Compose (로컬) → AWS EKS (프로덕션)
CI/CD
GitHub Actions
ORM
Prisma (Node.js) / SQLAlchemy (Python)
📁 프로젝트 구조
hanvoxel/
├── CLAUDE.md
├── HanVoxel_BusinessPlan.md
├── warehouse-standards.md
├── .github/
│   └── workflows/
├── packages/
│   ├── frontend/          # React + Three.js
│   ├── api-gateway/       # Node.js BFF
│   ├── spatial-service/   # 핵심 공간 서비스
│   ├── inventory-service/ # 재고 서비스
│   └── ml-service/        # Python FastAPI (AI 기능)
├── database/
│   ├── migrations/        # Prisma migration 파일
│   └── seeds/
│       ├── presets/       # 표준 규격 프리셋 시드 데이터
│       │   ├── rack-presets.ts
│       │   ├── pallet-presets.ts
│       │   ├── container-presets.ts
│       │   ├── product-presets.ts
│       │   └── warehouse-templates.ts
│       └── index.ts
├── docker-compose.yml
└── README.md
🗄️ 핵심 설계 원칙
Spatial First — 모든 데이터는 반드시 spatial_objects와 연결되어야 한다
Phase 범위 준수 — 현재 Phase에 없는 기능은 설계에 포함하지 않는다
한국어 주석 — 코드 주석은 한국어로 작성한다
API 우선 — UI보다 API 스펙을 먼저 설계한다
타입 안전 — TypeScript strict 모드, any 사용 금지
🗃️ DB 규칙
DB: PostgreSQL 15 + PostGIS
ORM: Prisma
좌표 단위: meter, origin은 site 기준
rotation: Euler 방식
타임스탬프: 모든 테이블에 created_at, updated_at 필수
소프트 삭제: 중요 데이터는 deleted_at 컬럼으로 처리
Phase 1 핵심 테이블 (MVP)
spatial_objects, spatial_object_types, spatial_hierarchies
inventory_balances, inventory_locations, stock_movements
companies, sites, users, roles, permissions, role_permissions

# 프리셋 카탈로그 (Phase 1 포함)
preset_categories, spatial_presets, warehouse_templates
🔌 API 규칙
형식: REST + JSON
버전: /api/v1/
인증: JWT Bearer Token
응답 형식:
{
  "success": true,
  "data": {},
  "error": null,
  "meta": { "page": 1, "total": 100 }
}
에러 응답:
{
  "success": false,
  "data": null,
  "error": { "code": "NOT_FOUND", "message": "리소스를 찾을 수 없습니다" }
}
📦 프리셋 카탈로그 시스템
warehouse-standards.md에 정의된 모든 규격을 DB seed 데이터로 관리한다.
유저는 프리셋을 선택해 3D 뷰어에서 바로 배치하고, 커스터마이징 후 저장할 수 있다.
프리셋 레이어 구조
Layer 1 — 단일 오브젝트 프리셋  (랙 1개, 팔레트 1개 등 개별 객체)
Layer 2 — 조합 프리셋          (랙 + 통로 세트, 도크 구역 세트 등)
Layer 3 — 창고 템플릿          (업종별 완성형 레이아웃)
DB 스키마
// 프리셋 카테고리
model PresetCategory {
  id          String          @id @default(cuid())
  code        String          @unique  // RACK / PALLET / PRODUCT / CONTAINER / TEMPLATE
  name        String
  presets     SpatialPreset[]
  createdAt   DateTime        @default(now())
}

// 표준 규격 프리셋
model SpatialPreset {
  id             String          @id @default(cuid())
  categoryId     String
  category       PresetCategory  @relation(fields: [categoryId], references: [id])
  standardCode   String          // KR_STANDARD / T11 / DRY_40FT 등
  name           String          // "국내 표준 랙" / "T11 팔레트" 등
  nameEn         String?
  dimensionsJson Json            // { w, d, h, levels, levelHeight, maxLoad, ... }
  metaJson       Json?           // 추가 속성 (색상, 아이콘, 통로 권장 너비 등)
  isSystem       Boolean         @default(true)   // true = 시스템 제공 표준 규격
  isPublic       Boolean         @default(false)  // true = 다른 유저와 공유
  companyId      String?         // null = 시스템 전체 공용
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

// 창고 템플릿 (업종별 완성형 레이아웃)
model WarehouseTemplate {
  id             String   @id @default(cuid())
  code           String   @unique  // FOOD_BASIC / AUTO_PARTS_STANDARD 등
  name           String   // "식품창고 기본형"
  industry       String   // FOOD / AUTO_PARTS / ELECTRONICS / PHARMA / GENERAL
  layoutJson     Json     // 랙 배치 + 통로 + 도크 + 스테이징 전체 구성
  thumbnailUrl   String?
  isSystem       Boolean  @default(true)
  createdAt      DateTime @default(now())
}
Seed 데이터 기준
warehouse-standards.md 기준으로 아래 항목을 seed 데이터로 초기 적재한다.
카테고리
seed 항목 수
기준
랙 (RACK)
11종
국내 4 + 국제 5 + 특수 2
팔레트 (PALLET)
11종
국내 3 + ISO 6 + 특수 2
제품 (PRODUCT)
7종
업종별 박스 규격
컨테이너 (CONTAINER)
8종
ISO 드라이 4 + 특수 4
창고 템플릿
5종
식품 / 자동차 / 전자 / 의약품 / 일반
UX 흐름
창고 생성
    │
    ▼
[템플릿 선택] 또는 [빈 캔버스 시작]
    │
    ▼
3D 뷰어
    │
우측 패널: 프리셋 카탈로그
├── 🗄️ 랙       → 클릭 → 드래그로 배치 → 치수 자동 적용
├── 📦 팔레트   → 랙 BIN에 자동 스냅
├── 🚢 컨테이너 → 도크 영역에 배치
├── 📫 제품     → 팔레트 위에 적재 시뮬레이션
└── ⚙️ 내 프리셋 → 커스터마이징 저장본
    │
    ▼
배치 후 클릭 → 치수 직접 편집 가능
    │
    ▼
"내 프리셋으로 저장" → spatial_presets (isSystem: false)
    │
    ▼
DB에 spatial_objects로 기록
규칙
isSystem: true 프리셋은 수정/삭제 불가 (읽기 전용)
유저가 편집하면 isSystem: false인 새 프리셋으로 저장
모든 치수는 warehouse-standards.md의 meter 단위 기준값 사용
프리셋 배치 시 권장 통로 너비(AISLE_STANDARDS)를 자동으로 안내
main          ← 프로덕션 배포용 (직접 push 금지)
develop       ← 개발 통합 브랜치
feature/      ← 기능 개발 (예: feature/spatial-viewer)
fix/          ← 버그 수정 (예: fix/inventory-sync)
phase/        ← Phase 단위 작업 (예: phase1/mvp)
커밋 메시지 규칙
feat: 3D 창고 뷰어 컴포넌트 추가
fix: inventory_locations 동기화 오류 수정
chore: Prisma migration 파일 추가
docs: API 스펙 문서 업데이트
refactor: spatial_objects 쿼리 최적화
✅ 작업 요청 시 기본 흐름
Claude Code에 작업을 요청할 때 아래 순서로 진행한다.
1. DB 스키마 / Migration
2. API 엔드포인트 (라우터 + 컨트롤러)
3. 서비스 로직
4. 프론트엔드 컴포넌트
5. 테스트 코드
🚫 하지 말아야 할 것
현재 Phase에 없는 기능 선구현 금지
any 타입 사용 금지
하드코딩된 좌표값 금지 (항상 DB에서 조회)
직접 DB 접근 금지 (반드시 서비스 레이어 경유)
프론트에서 비즈니스 로직 처리 금지
