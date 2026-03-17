/**
 * 스마트 발주 스케줄 컨트롤러
 */
import type { Request, Response } from 'express';
import * as smartReorderService from '../services/smart-reorder.service';

// ── 스마트 스케줄 목록 조회 ───────────────────────────────

export async function scheduleHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const filters = {
      urgency: req.query.urgency ? String(req.query.urgency) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      vendorId: req.query.vendorId ? String(req.query.vendorId) : undefined,
    };

    const result = await smartReorderService.getSmartSchedules(siteId, filters);
    res.json({ success: true, data: result, meta: { total: result.length } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '스마트 스케줄 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 타임라인 데이터 조회 ──────────────────────────────────

export async function timelineHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const days = Number(req.query.days ?? 60);
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await smartReorderService.getTimeline(siteId, days);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '타임라인 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 도착 예측 ─────────────────────────────────────────────

export async function predictArrivalHandler(req: Request, res: Response) {
  try {
    const vendorId = String(req.query.vendorId ?? '');
    const skuCode = String(req.query.skuCode ?? '');
    const orderDate = String(req.query.orderDate ?? '');
    if (!vendorId || !skuCode || !orderDate) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'vendorId, skuCode, orderDate 필수' },
      });
      return;
    }

    const result = await smartReorderService.predictArrival(vendorId, skuCode, orderDate);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '도착 예측 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 예측 정확도 리포트 ────────────────────────────────────

export async function accuracyHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await smartReorderService.getAccuracyReport(siteId);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '정확도 리포트 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 스케줄 확정 ───────────────────────────────────────────

export async function confirmHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    if (!id) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'id 필수' } });
      return;
    }

    const result = await smartReorderService.confirmSchedule(id);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '스케줄 확정 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── ML 모델 재학습 트리거 ─────────────────────────────────

export async function trainHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.body.siteId ?? req.query.siteId ?? '');
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await smartReorderService.triggerTraining(siteId);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ML 재학습 트리거 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}
