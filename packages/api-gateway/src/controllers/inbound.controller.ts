/**
 * 입고 관리 컨트롤러
 */
import type { Request, Response } from 'express';
import * as inboundService from '../services/inbound.service';

// ── 입고 주문 생성 ────────────────────────────────

export async function createHandler(req: Request, res: Response) {
  try {
    const { siteId, vendorId, vendorName, reorderRecommendationId, expectedDate, notes, items } = req.body;
    if (!siteId || !items?.length) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, items 필수' } });
      return;
    }

    const order = await inboundService.createInboundOrder({
      siteId, vendorId, vendorName, reorderRecommendationId, expectedDate, notes, items,
    });
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '입고 주문 생성 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 입고 주문 목록 조회 ────────────────────────────

export async function listHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const status = req.query.status ? String(req.query.status) : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await inboundService.getInboundOrders(siteId, status, page, limit);
    res.json({ success: true, data: result.orders, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '입고 주문 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 입고 주문 상세 조회 ───────────────────────────

export async function detailHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const order = await inboundService.getInboundOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '입고 주문을 찾을 수 없습니다' } });
      return;
    }
    res.json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '입고 주문 상세 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 도착 확인 처리 ─────────────────────────────────

export async function arriveHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const { actualItems } = req.body;
    const result = await inboundService.arriveInboundOrder(id, actualItems);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '도착 확인 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 도착 확인 취소 ───────────────────────────────

export async function cancelArriveHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const result = await inboundService.cancelArrivalInboundOrder(id);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '도착 확인 취소 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── QC 통과 처리 ──────────────────────────────────

export async function qcPassHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const result = await inboundService.passQcInboundOrder(id);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'QC 통과 처리 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 입고 달력 데이터 ──────────────────────────────

export async function calendarHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const year = Number(req.query.year ?? new Date().getFullYear());
    const month = Number(req.query.month ?? new Date().getMonth() + 1);
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const data = await inboundService.getInboundCalendar(siteId, year, month);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '달력 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 입고 예정일 변경 ──────────────────────────────

export async function rescheduleHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const { newDate } = req.body;
    if (!newDate) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'newDate 필수' } });
      return;
    }
    const result = await inboundService.rescheduleInbound(id, newDate);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '일정 변경 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 자동발주 → 입고 주문 자동 생성 ────────────────

export async function createFromReorderHandler(req: Request, res: Response) {
  try {
    const { recommendationId } = req.body;
    if (!recommendationId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'recommendationId 필수' } });
      return;
    }
    const order = await inboundService.createFromReorderRecommendation(recommendationId);
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '자동발주 입고 생성 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}
