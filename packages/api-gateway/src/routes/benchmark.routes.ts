/**
 * 업계 벤치마크 라우트
 */
import { Router } from 'express';
import {
  getMyBenchmarkHandler,
  getIndustryBenchmarkHandler,
  generateReportHandler,
  getReportsHandler,
  getBenchmarkHistoryHandler,
  getMyMetricsHandler,
} from '../controllers/benchmark.controller';

const router = Router();

// 내 벤치마크 조회 (순위 + 권고 포함)
router.get('/benchmark/my', getMyBenchmarkHandler);

// 내 사이트 KPI 조회
router.get('/benchmark/metrics', getMyMetricsHandler);

// 업계 벤치마크 집계 조회
router.get('/benchmark/industry', getIndustryBenchmarkHandler);

// 벤치마크 히스토리 (트렌드)
router.get('/benchmark/history', getBenchmarkHistoryHandler);

// 리포트 목록 조회
router.get('/benchmark/reports', getReportsHandler);

// 리포트 생성
router.post('/benchmark/reports', generateReportHandler);

export default router;
