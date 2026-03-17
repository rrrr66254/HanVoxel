/**
 * 출고 관리 컨트롤러
 */
import type { Request, Response } from 'express';
import * as outboundService from '../services/outbound.service';

// ── 출고 주문 생성 ────────────────────────────────

export async function createHandler(req: Request, res: Response) {
  try {
    const { siteId, type, scheduledDate, timeSlot, customerName, destination, notes, containerSpec, hsCode, items } = req.body;
    if (!siteId || !items?.length) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, items 필수' } });
      return;
    }

    const order = await outboundService.createOutboundOrder({
      siteId, type, scheduledDate, timeSlot, customerName, destination, notes, containerSpec, hsCode, items,
    });
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '출고 주문 생성 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 출고 주문 목록 조회 ────────────────────────────

export async function listHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const status = req.query.status ? String(req.query.status) : undefined;
    const type = req.query.type ? String(req.query.type) : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await outboundService.getOutboundOrders(siteId, status, type, page, limit);
    res.json({ success: true, data: result.orders, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '출고 주문 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 출고 주문 상세 조회 ───────────────────────────

export async function detailHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const order = await outboundService.getOutboundOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '출고 주문을 찾을 수 없습니다' } });
      return;
    }
    res.json({ success: true, data: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '출고 주문 상세 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 출고 완료 처리 ────────────────────────────────

export async function dispatchHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const result = await outboundService.dispatchOutboundOrder(id);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '출고 완료 처리 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 출고 명세표 데이터 조회 ────────────────────────

export async function manifestHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const data = await outboundService.getManifestData(id);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '명세표 조회 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}

// ── 출고 달력 데이터 ──────────────────────────────

export async function calendarHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const year = Number(req.query.year ?? new Date().getFullYear());
    const month = Number(req.query.month ?? new Date().getMonth() + 1);
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const data = await outboundService.getOutboundCalendar(siteId, year, month);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '달력 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 통합 달력 데이터 ──────────────────────────────

export async function calendarAllHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const year = Number(req.query.year ?? new Date().getFullYear());
    const month = Number(req.query.month ?? new Date().getMonth() + 1);
    const filter = req.query.filter ? String(req.query.filter) as 'INBOUND' | 'OUTBOUND' : undefined;
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const data = await outboundService.getCalendarData(siteId, year, month, filter);
    res.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '달력 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 출고 예정일 변경 ──────────────────────────────

export async function rescheduleHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const { newDate, timeSlot } = req.body;
    if (!newDate) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'newDate 필수' } });
      return;
    }
    const result = await outboundService.rescheduleOutbound(id, newDate, timeSlot);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '일정 변경 실패';
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: msg } });
  }
}
