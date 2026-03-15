/**
 * HanVoxel — 무역 인텔리전스 라우트
 *
 * 1. GET  /api/v1/trade/hs-search?q=[검색어]   → HS 코드 자동완성
 * 2. POST /api/v1/trade/watch                   → 즐겨찾기 추가 (최대 5개)
 * 3. DELETE /api/v1/trade/watch/:hsCode         → 즐겨찾기 삭제
 * 3-1. GET /api/v1/trade/watch                  → 즐겨찾기 목록
 * 4. GET  /api/v1/trade/data                    → 무역 데이터 조회
 * 5. GET  /api/v1/trade/coverage                → 커버리지 현황
 * 6. GET  /api/v1/trade/batch-logs              → 배치 로그 조회
 */

import { Router } from 'express';
import {
  hsSearch,
  addWatchHandler,
  removeWatchHandler,
  getWatchListHandler,
  getTradeDataHandler,
  getCoverageHandler,
  getBatchLogsHandler,
} from '../controllers/trade.controller';

const router = Router();

// 1. HS 코드 자동완성 검색
router.get('/trade/hs-search', hsSearch);

// 2. 즐겨찾기 추가
router.post('/trade/watch', addWatchHandler);

// 3-1. 즐겨찾기 목록
router.get('/trade/watch', getWatchListHandler);

// 3. 즐겨찾기 삭제
router.delete('/trade/watch/:hsCode', removeWatchHandler);

// 4. 무역 데이터 조회 (Redis → DB → ml-service)
router.get('/trade/data', getTradeDataHandler);

// 5. 커버리지 현황
router.get('/trade/coverage', getCoverageHandler);

// 6. 배치 로그
router.get('/trade/batch-logs', getBatchLogsHandler);

export default router;
