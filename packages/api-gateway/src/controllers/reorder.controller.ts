/**
 * 자동 발주 추천 컨트롤러
 */
import type { Request, Response } from 'express';
import * as reorderService from '../services/reorder.service';

// ── 발주 추천 생성 (ML 서비스 호출) ────────────────────

export async function generateHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const horizon = Number(req.query.horizon ?? 30);
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await reorderService.generateRecommendations(siteId, horizon);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '발주 추천 생성 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 추천 목록 조회 ─────────────────────────────────────

export async function listHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const status = req.query.status ? String(req.query.status) : undefined;
    const urgency = req.query.urgency ? String(req.query.urgency) : undefined;
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const list = await reorderService.getRecommendations(siteId, status, urgency);
    res.json({ success: true, data: list, meta: { total: list.length } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '추천 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 추천 수락 → 자동 발주서 생성 ──────────────────────

export async function acceptHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const result = await reorderService.acceptRecommendation(id);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '추천 수락 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 추천 무시 ──────────────────────────────────────────

export async function dismissHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const result = await reorderService.dismissRecommendation(id);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '추천 무시 실패';
    res.status(400).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 수요 예측 조회 ─────────────────────────────────────

export async function forecastHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const sku = String(req.query.sku ?? '');
    const horizon = Number(req.query.horizon ?? 30);
    if (!siteId || !sku) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, sku 필수' } });
      return;
    }

    const result = await reorderService.getForecast(siteId, sku, horizon);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '수요 예측 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 리드타임 이력 조회 ─────────────────────────────────

export async function leadTimeHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const sku = req.query.sku ? String(req.query.sku) : undefined;
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const records = await reorderService.getLeadTimeRecords(siteId, sku);
    res.json({ success: true, data: records });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '리드타임 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 대시보드 요약 ──────────────────────────────────────

export async function summaryHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const summary = await reorderService.getReorderSummary(siteId);
    res.json({ success: true, data: summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '요약 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}
