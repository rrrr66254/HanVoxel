# HanVoxel — CLAUDE.md

> Claude Code가 이 프로젝트 작업 시 항상 참고하는 컨텍스트 파일입니다.

---

## 📄 비즈니스 플랜 참조

@HanVoxel_BusinessPlan.md

모든 기능 개발, 설계 결정, DB 스키마 작성 시 위 비즈니스 플랜을 기준으로 판단한다.

---

## 🎯 현재 개발 상태

```
현재 Phase: Phase 1 — Foundation
현재 Step:  Step 1 (진행 중) — Docker + PostgreSQL/PostGIS + Prisma 스키마 완료
```

> Phase가 진행될 때마다 이 섹션을 업데이트할 것.

---

## 🏗️ 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 18 + TypeScript + Three.js + Tailwind CSS |
| Backend | Node.js (Express) + TypeScript |
| Database | PostgreSQL 15 + PostGIS + Redis |
| ML / AI | Python 3.11 + FastAPI + scikit-learn + PyTorch |
| Event Bus | Kafka (Phase 3 이후) / 초기에는 직접 호출 |
| Infra | Docker + Docker Compose (로컬) → AWS EKS (프로덕션) |
| CI/CD | GitHub Actions |
| ORM | Prisma (Node.js) / SQLAlchemy (Python) |

---

## 📁 프로젝트 구조

```
hanvoxel/
├── CLAUDE.md
├── HanVoxel_BusinessPlan.md
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
│   └── seeds/             # 초기 데이터
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

---

## 🗃️ DB 규칙

- **DB**: PostgreSQL 15 + PostGIS
- **ORM**: Prisma
- **좌표 단위**: meter, origin은 site 기준
- **rotation**: Euler 방식
- **타임스탬프**: 모든 테이블에 `created_at`, `updated_at` 필수
- **소프트 삭제**: 중요 데이터는 `deleted_at` 컬럼으로 처리

### Phase 1 핵심 테이블 (MVP)
```
spatial_objects, spatial_object_types, spatial_hierarchies
inventory_balances, inventory_locations, stock_movements
companies, sites, users, roles, permissions, role_permissions
```

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
feature/      ← 기능 개발 (예: feature/spatial-viewer)
fix/          ← 버그 수정 (예: fix/inventory-sync)
phase/        ← Phase 단위 작업 (예: phase1/mvp)
```

### 커밋 메시지 규칙
```
feat: 3D 창고 뷰어 컴포넌트 추가
fix: inventory_locations 동기화 오류 수정
chore: Prisma migration 파일 추가
docs: API 스펙 문서 업데이트
refactor: spatial_objects 쿼리 최적화
```

---

## ✅ 작업 요청 시 기본 흐름

Claude Code에 작업을 요청할 때 아래 순서로 진행한다.

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
