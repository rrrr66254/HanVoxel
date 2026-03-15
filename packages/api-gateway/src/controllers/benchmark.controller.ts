/**
 * 업계 벤치마크 컨트롤러
 */
import { Request, Response } from 'express';
import {
  getMyBenchmark,
  aggregateBenchmark,
  generateReport,
  getReports,
  getBenchmarkHistory,
  collectSiteMetrics,
} from '../services/benchmark.service';

// 데모용 기본 ID
const DEMO_COMPANY = 'demo-company-001';
const DEMO_SITE = 'demo-site-001';

/** 내 벤치마크 조회 */
export async function getMyBenchmarkHandler(req: Request, res: Response) {
  try {
    const companyId = (req.query.companyId as string) ?? DEMO_COMPANY;
    const siteId = (req.query.siteId as string) ?? DEMO_SITE;
    const period = (req.query.period as string) ?? getCurrentPeriod();

    const result = await getMyBenchmark(companyId, siteId, period);
    if (!result) {
      return res.json({
        success: true,
        data: null,
        error: null,
        meta: { message: '벤치마크 데이터가 충분하지 않습니다 (최소 5개 회사 필요)' },
      });
    }

    res.json({ success: true, data: result, error: null });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'BENCHMARK_ERROR', message: (err as Error).message },
    });
  }
}

/** 업계 벤치마크 집계 조회 */
export async function getIndustryBenchmarkHandler(req: Request, res: Response) {
  try {
    const { period, industry, companySize } = req.query;
    if (!period || !industry || !companySize) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'MISSING_PARAMS', message: 'period, industry, companySize는 필수입니다' },
      });
    }

    const result = await aggregateBenchmark(
      period as string,
      industry as string,
      companySize as string,
    );

    res.json({ success: true, data: result, error: null });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'AGGREGATE_ERROR', message: (err as Error).message },
    });
  }
}

/** 리포트 생성 */
export async function generateReportHandler(req: Request, res: Response) {
  try {
    const { companyId, siteId, period } = req.body;
    const result = await generateReport(
      companyId ?? DEMO_COMPANY,
      siteId ?? DEMO_SITE,
      period ?? getCurrentPeriod(),
    );

    if (!result) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'REPORT_FAILED', message: '리포트 생성에 실패했습니다' },
      });
    }

    res.status(201).json({ success: true, data: result, error: null });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'REPORT_ERROR', message: (err as Error).message },
    });
  }
}

/** 리포트 목록 */
export async function getReportsHandler(req: Request, res: Response) {
  try {
    const companyId = (req.query.companyId as string) ?? DEMO_COMPANY;
    const limit = parseInt(req.query.limit as string, 10) || 12;

    const reports = await getReports(companyId, limit);
    res.json({ success: true, data: reports, error: null });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'REPORTS_ERROR', message: (err as Error).message },
    });
  }
}

/** 벤치마크 히스토리 (트렌드) */
export async function getBenchmarkHistoryHandler(req: Request, res: Response) {
  try {
    const companyId = (req.query.companyId as string) ?? DEMO_COMPANY;
    const siteId = (req.query.siteId as string) ?? DEMO_SITE;
    const months = parseInt(req.query.months as string, 10) || 6;

    const history = await getBenchmarkHistory(companyId, siteId, months);
    res.json({ success: true, data: history, error: null });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'HISTORY_ERROR', message: (err as Error).message },
    });
  }
}

/** 내 사이트 KPI 조회 */
export async function getMyMetricsHandler(req: Request, res: Response) {
  try {
    const companyId = (req.query.companyId as string) ?? DEMO_COMPANY;
    const siteId = (req.query.siteId as string) ?? DEMO_SITE;
    const period = (req.query.period as string) ?? getCurrentPeriod();

    const metrics = await collectSiteMetrics(companyId, siteId, period);
    res.json({ success: true, data: metrics, error: null });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'METRICS_ERROR', message: (err as Error).message },
    });
  }
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
