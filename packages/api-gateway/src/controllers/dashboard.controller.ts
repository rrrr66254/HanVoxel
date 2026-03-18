/**
 * CEO 대시보드 컨트롤러
 */
import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';

// ── CEO 대시보드 요약 데이터 ─────────────────────────

export async function getCeoDashboardHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const period = String(req.query.period ?? 'today') as 'today' | 'week' | 'month';
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await dashboardService.getCeoDashboard(siteId, period);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'CEO 대시보드 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── CEO 대시보드 추이 데이터 ─────────────────────────

export async function getCeoTrendHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const period = String(req.query.period ?? 'month') as 'month' | 'quarter' | 'year';
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await dashboardService.getCeoTrend(siteId, period);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'CEO 대시보드 추이 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}
