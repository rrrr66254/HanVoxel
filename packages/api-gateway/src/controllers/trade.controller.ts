/**
 * HanVoxel — 무역 인텔리전스 컨트롤러
 */

import type { Request, Response } from 'express';
import {
  searchHsCodes,
  addWatch,
  removeWatch,
  getWatchList,
  getTradeData,
  getCoverageStats,
  getBatchLogs,
} from '../services/trade.service';

// 1. GET /api/v1/trade/hs-search?q=[검색어]
export async function hsSearch(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string) ?? '';
    if (!q || q.length < 2) {
      res.json({ success: true, data: [], meta: { total: 0 } });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const results = await searchHsCodes(q, limit);

    res.json({
      success: true,
      data: results,
      error: null,
      meta: { total: results.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '검색 실패';
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'SEARCH_FAILED', message },
    });
  }
}

// 2. POST /api/v1/trade/watch
export async function addWatchHandler(req: Request, res: Response): Promise<void> {
  try {
    const { companyId, hsCode, description, descriptionEn } = req.body;

    if (!companyId || !hsCode || !description) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'companyId, hsCode, description 필수' },
      });
      return;
    }

    const watch = await addWatch(companyId, hsCode, description, descriptionEn);
    res.status(201).json({ success: true, data: watch, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '즐겨찾기 추가 실패';
    const status = message.includes('최대') ? 409 : 500;
    res.status(status).json({
      success: false,
      data: null,
      error: { code: 'WATCH_ADD_FAILED', message },
    });
  }
}

// 3. DELETE /api/v1/trade/watch/:hsCode
export async function removeWatchHandler(req: Request, res: Response): Promise<void> {
  try {
    const hsCode = String(req.params.hsCode ?? '');
    const companyId = String(req.query.companyId ?? '');

    if (!companyId || !hsCode) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'companyId, hsCode 필수' },
      });
      return;
    }

    await removeWatch(companyId, hsCode);
    res.json({ success: true, data: null, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '즐겨찾기 삭제 실패';
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'WATCH_REMOVE_FAILED', message },
    });
  }
}

// 3-1. GET /api/v1/trade/watch (즐겨찾기 목록)
export async function getWatchListHandler(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'companyId 필수' },
      });
      return;
    }

    const watches = await getWatchList(companyId);
    res.json({
      success: true,
      data: watches,
      error: null,
      meta: { total: watches.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '즐겨찾기 조회 실패';
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'WATCH_LIST_FAILED', message },
    });
  }
}

// 4. GET /api/v1/trade/data
export async function getTradeDataHandler(req: Request, res: Response): Promise<void> {
  try {
    const hsCode = req.query.hsCode as string;
    if (!hsCode) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'hsCode 필수' },
      });
      return;
    }

    // reporterIso는 다중값 지원 (쉼표 구분)
    const reporterIsoParam = (req.query.reporterIso as string) ?? 'KOR';
    const reporterIsos = reporterIsoParam.split(',').map((s) => s.trim());

    const partnerIso = (req.query.partnerIso as string) ?? undefined;
    const period = (req.query.period as string) ?? undefined;
    const flowType = (req.query.flowType as string) ?? undefined;
    const companyId = (req.query.companyId as string) ?? undefined;

    const { records, cacheHit } = await getTradeData({
      hsCode,
      reporterIsos,
      partnerIso,
      period,
      flowType,
      companyId,
    });

    res.json({
      success: true,
      data: records,
      error: null,
      meta: {
        total: records.length,
        cacheHit,
        hsCode,
        reporterIsos,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '무역 데이터 조회 실패';
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'TRADE_DATA_FAILED', message },
    });
  }
}

// 5. GET /api/v1/trade/coverage
export async function getCoverageHandler(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await getCoverageStats();
    res.json({ success: true, data: stats, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '커버리지 조회 실패';
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'COVERAGE_FAILED', message },
    });
  }
}

// 6. GET /api/v1/trade/batch-logs
export async function getBatchLogsHandler(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const logs = await getBatchLogs(days);
    res.json({
      success: true,
      data: logs,
      error: null,
      meta: { total: logs.length, days },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '배치 로그 조회 실패';
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'BATCH_LOG_FAILED', message },
    });
  }
}
