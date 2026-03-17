# Progress — 세션 요약

> 세션 ID: `session_01HAppeYZJXdynr5cSronRP4`
> 날짜: 2026-03-17
> 브랜치: `claude/3d-warehouse-rack-viewer-Sr9S0`

---

## 기능 A — B2C 대량 출고 업로드

### 개요
CSV/Excel 파일을 업로드하여 B2C 출고 주문을 대량 생성하는 기능.
플랫폼별(쿠팡/스마트스토어/커스텀) 컬럼 매핑, 행별 검증, 트랜잭션 일괄 생성 지원.

### 추가된 파일

| 파일 | 설명 |
|------|------|
| `packages/api-gateway/src/services/bulk-outbound.service.ts` | 컬럼 매핑, 행 검증, 대량 주문 생성, 업로드 이력 서비스 |
| `packages/api-gateway/src/controllers/bulk-outbound.controller.ts` | multer(10MB) + CSV/Excel 파싱, 5개 핸들러 |
| `packages/frontend/src/api/bulk-outbound-api.ts` | API 클라이언트 + 타입 정의 |
| `packages/frontend/src/components/inout-management/BulkOutboundUpload.tsx` | 멀티스텝 UI (업로드→매핑→검증→결과→이력) |

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/api-gateway/src/routes/outbound.routes.ts` | 5개 라우트 추가 (`/bulk-upload`, `/bulk-create`, `/bulk-logs`, `/bulk-mapping`, `/bulk-template/:platform`) |
| `packages/frontend/src/components/inout-management/OutboundManagement.tsx` | "B2C 대량 출고" 버튼 + BulkOutboundUpload 렌더링 |
| `packages/frontend/src/components/inout-management/index.ts` | `BulkOutboundUpload` export 추가 |

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/outbound/bulk-upload` | CSV/Excel 파일 업로드 + 파싱 + 검증 |
| POST | `/api/v1/outbound/bulk-create` | 검증된 행으로 출고 주문 일괄 생성 |
| GET | `/api/v1/outbound/bulk-logs` | 업로드 이력 조회 |
| GET | `/api/v1/outbound/bulk-mapping` | 플랫폼별 컬럼 매핑 조회 |
| GET | `/api/v1/outbound/bulk-template/:platform` | 플랫폼별 CSV 템플릿 다운로드 |

---

## 기능 B — 수주 → MRP 소요 분석 → 자동 발주 연동

### 개요
고객 수주 등록 → BOM 기반 MRP 소요량 자동 계산 → 부족 자재 재고 더블체크 → 자동 발주 추천 연동까지의 5단계 흐름.

### 추가된 파일

| 파일 | 설명 |
|------|------|
| `packages/api-gateway/src/services/sales-order.service.ts` | 수주 CRUD, MRP 엔진, BOM 관리, 재고 더블체크 서비스 |
| `packages/api-gateway/src/controllers/sales-order.controller.ts` | 전체 핸들러 |
| `packages/api-gateway/src/routes/sales-order.routes.ts` | 수주/MRP/BOM/더블체크 라우트 |
| `packages/frontend/src/api/sales-order-api.ts` | API 클라이언트 + 타입 정의 |
| `packages/frontend/src/components/sales-order/SalesOrderDashboard.tsx` | 수주 목록, 상태 필터, D-day 카운트다운, MRP 실행/조회, 자동발주, 등록 모달 |
| `packages/frontend/src/components/sales-order/BomManager.tsx` | BOM 목록 (제품별 그룹), 검색, 추가 모달 |
| `packages/frontend/src/components/sales-order/StockCheckDashboard.tsx` | 더블체크 목록, 실물 수량 입력, 확인/불일치 처리 |
| `packages/frontend/src/components/sales-order/index.ts` | 3개 컴포넌트 export |

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/api-gateway/src/server.ts` | `salesOrderRoutes` import + `app.use('/api/v1', salesOrderRoutes)` |
| `packages/frontend/src/App.tsx` | AppMode 타입에 `'sales-order' \| 'bom' \| 'stock-check'` 추가, `renderSubPage()`에 3개 케이스 추가 |
| `packages/frontend/src/components/layout/Sidebar.tsx` | `ClipboardList, Wrench, PackageCheck` 아이콘 import, 운영 섹션에 메뉴 3개 추가 |
| `packages/frontend/src/i18n/locales/ko.json` | `salesOrder`, `bom`, `stockCheck` 키 추가 |
| `packages/frontend/src/i18n/locales/en.json` | 동일 |
| `packages/frontend/src/i18n/locales/ja.json` | 동일 |

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/sales-orders` | 수주 등록 |
| GET | `/api/v1/sales-orders` | 수주 목록 조회 |
| GET | `/api/v1/sales-orders/:id` | 수주 상세 조회 |
| POST | `/api/v1/sales-orders/:id/mrp` | MRP 소요량 계산 실행 |
| GET | `/api/v1/sales-orders/:id/mrp` | MRP 결과 조회 |
| POST | `/api/v1/sales-orders/:id/reorder` | 부족 자재 일괄 자동 발주 |
| POST | `/api/v1/bom` | BOM 항목 등록 |
| POST | `/api/v1/bom/bulk` | BOM 일괄 등록 (upsert) |
| GET | `/api/v1/bom/:siteId/:productSku` | 제품별 BOM 조회 |
| GET | `/api/v1/stock-checks` | 더블체크 요청 목록 |
| POST | `/api/v1/stock-checks/:id/confirm` | 더블체크 확인 (실물 수량 입력) |
| POST | `/api/v1/stock-checks/:id/discrepancy` | 불일치 보고 |

---

## DB 스키마 변경

### 추가된 테이블 (5개)

| 테이블 | Prisma 모델 | 용도 |
|--------|------------|------|
| `bulk_upload_logs` | `BulkUploadLog` | B2C 대량 출고 업로드 이력 |
| `sales_orders` | `SalesOrder` | 수주 (고객 발주 수신) |
| `bom_items` | `BomItem` | 제품별 소요 자재 목록 |
| `mrp_results` | `MrpResult` | MRP 소요량 계산 결과 |
| `stock_check_requests` | `StockCheckRequest` | 재고 더블체크 요청 |

### 마이그레이션

```
database/prisma/migrations/20260316000000_add_bulk_upload_salesorder_mrp/migration.sql
```

실행 명령어:
```bash
cd database
npx prisma migrate dev
```

---

## 추가된 npm 패키지

### api-gateway
| 패키지 | 용도 |
|--------|------|
| `multer` | 파일 업로드 미들웨어 (메모리 스토리지, 10MB 제한) |
| `@types/multer` | multer TypeScript 타입 |
| `xlsx` | Excel 파일 파싱 (.xlsx, .xls) |

### frontend
| 패키지 | 용도 |
|--------|------|
| `papaparse` | CSV 파일 파싱 |
| `@types/papaparse` | papaparse TypeScript 타입 |
| `xlsx` | Excel 파일 파싱 (브라우저) |

설치 명령어:
```bash
cd packages/api-gateway && npm install multer @types/multer xlsx
cd packages/frontend && npm install papaparse @types/papaparse xlsx
```

---

## 사이드바 메뉴 추가 (운영 섹션)

| 메뉴 ID | 아이콘 | 한국어 | English | 日本語 |
|---------|--------|--------|---------|--------|
| `sales-order` | ClipboardList | 수주 관리 | Sales Orders | 受注管理 |
| `bom` | Wrench | BOM 관리 | BOM Management | BOM 管理 |
| `stock-check` | PackageCheck | 재고 더블체크 | Stock Double-Check | 在庫ダブルチェック |

---

## 다음 세션 TODO

- [ ] 사이드바에 수주/BOM/더블체크 메뉴가 보이지 않는 문제 확인 (로컬 pull + Vite 캐시 클리어 후 재확인)
- [ ] DB 마이그레이션 실행 (`npx prisma migrate dev`)
- [ ] Phase 4 Step 1 — Simulation 엔진 진행
