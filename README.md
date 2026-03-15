# HanVoxel

**Spatial Digital Twin Factory Platform**

공장과 창고를 3D 공간 중심으로 디지털화하고, WMS·MES·ERP·Simulation을 하나의 플랫폼에 통합하는 솔루션입니다.

---

## 로컬 개발 환경 설정

### 사전 요구사항

| 소프트웨어 | 버전 | 용도 |
|-----------|------|------|
| Node.js | 18+ | API Gateway, Frontend |
| Python | 3.11+ | ML Service |
| PostgreSQL | 15+ | 데이터베이스 |
| Redis | 7+ | 캐시 |

### 1. 환경 변수 설정

각 서비스 디렉토리에 `.env.example` 파일이 있습니다. 이를 복사하여 `.env` 파일을 만드세요.

```bash
# API Gateway
cp packages/api-gateway/.env.example packages/api-gateway/.env

# ML Service
cp packages/ml-service/.env.example packages/ml-service/.env
```

#### API Gateway 환경 변수 (`packages/api-gateway/.env`)

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `PORT` | API 서버 포트 | `3001` |
| `DATABASE_URL` | PostgreSQL 연결 문자열 | (필수) |
| `REDIS_URL` | Redis 연결 문자열 | `redis://localhost:6379` |
| `ML_SERVICE_URL` | ML Service 주소 | `http://localhost:8000` |
| `JWT_SECRET` | JWT 토큰 서명 키 | (필수, 프로덕션에서는 강력한 키 사용) |
| `FRONTEND_URL` | 프론트엔드 URL | `http://localhost:5173` |
| `STRIPE_SECRET_KEY` | Stripe API 시크릿 키 | (선택, 결제 기능 사용 시) |
| `STRIPE_WEBHOOK_SECRET` | Stripe 웹훅 시크릿 | (선택) |
| `DOUZON_API_URL` | 더존 ERP API URL | (선택) |
| `YOUNGLIMWON_API_URL` | 영림원 ERP API URL | (선택) |

#### ML Service 환경 변수 (`packages/ml-service/.env`)

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `ML_SERVICE_PORT` | ML 서버 포트 | `8000` |
| `LOG_LEVEL` | 로그 레벨 | `INFO` |
| `DATABASE_URL` | PostgreSQL 연결 문자열 | (필수) |
| `REDIS_URL` | Redis 연결 문자열 | `redis://localhost:6379` |
| `API_GATEWAY_URL` | API Gateway 주소 | `http://localhost:3001` |
| `COMTRADE_API_KEY` | UN Comtrade API 키 | (선택, 무역 데이터 사용 시) |
| `KR_CUSTOMS_API_KEY` | 한국 관세청 API 키 | (선택) |
| `US_CENSUS_API_KEY` | 미국 Census Bureau API 키 | (선택) |

### 2. 데이터베이스 설정

```bash
# PostgreSQL에 데이터베이스 생성
createdb hanvoxel

# 또는 psql로 생성
psql -U postgres -c "CREATE USER hanvoxel WITH PASSWORD 'hanvoxel123';"
psql -U postgres -c "CREATE DATABASE hanvoxel OWNER hanvoxel;"

# Prisma 마이그레이션 실행
cd packages/api-gateway
npx prisma migrate dev
```

### 3. 서비스 실행

터미널 3개를 열어 각각 실행합니다:

```bash
# 터미널 1 — API Gateway
cd packages/api-gateway
npm install
npx tsx src/server.ts

# 터미널 2 — ML Service
cd packages/ml-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 터미널 3 — Frontend
cd packages/frontend
npm install
npx vite
```

### 4. 접속

- **프론트엔드**: http://localhost:5173
- **API Gateway**: http://localhost:3001/api/v1
- **ML Service**: http://localhost:8000/docs (Swagger UI)

---

## 프로젝트 구조

```
hanvoxel/
├── packages/
│   ├── frontend/           # React + Three.js + PWA
│   ├── api-gateway/        # Node.js BFF (Express)
│   ├── spatial-service/    # 공간 서비스
│   ├── inventory-service/  # 재고 서비스
│   └── ml-service/         # Python FastAPI (ML/AI)
├── database/
│   ├── migrations/
│   └── seeds/
├── CLAUDE.md               # AI 어시스턴트 컨텍스트
├── warehouse-standards.md  # 창고 표준 규격
└── HanVoxel_BusinessPlan.md
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 18 + TypeScript + Three.js + Tailwind CSS |
| Backend | Node.js (Express) + TypeScript |
| Database | PostgreSQL 15 + PostGIS + Redis |
| ML/AI | Python 3.11 + FastAPI + scikit-learn |
| ORM | Prisma (Node.js) / SQLAlchemy (Python) |

---

*HanVoxel Inc. | Confidential*
