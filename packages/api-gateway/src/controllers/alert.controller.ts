import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as alertService from '../services/alert.service';

// POST /api/v1/alerts — ML 서비스에서 알림 생성
export async function createAlert(req: Request, res: Response) {
  try {
    const { siteId, metricType, severity, title, message, anomalyCount, detectedAt, metadata } = req.body;
    if (!siteId || !metricType || !severity || !title || !message) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, metricType, severity, title, message는 필수입니다'));
      return;
    }
    const alert = await alertService.createAlert({
      siteId, metricType, severity, title, message, anomalyCount, detectedAt, metadata,
    });
    res.status(201).json(successResponse(alert));
  } catch (err) {
    console.error('알림 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '알림 생성에 실패했습니다'));
  }
}

// GET /api/v1/alerts?siteId=&severity=&isRead=&limit=&offset=
export async function listAlerts(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId 쿼리 파라미터가 필요합니다'));
      return;
    }
    const severity = req.query.severity as string | undefined;
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const { alerts, total } = await alertService.getAlertsBySite(siteId, { severity, isRead, limit, offset });
    res.json(successResponse(alerts, { total }));
  } catch (err) {
    console.error('알림 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '알림 조회에 실패했습니다'));
  }
}

// PATCH /api/v1/alerts/:id/read
export async function markRead(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const alert = await alertService.markAlertRead(id);
    res.json(successResponse(alert));
  } catch (err) {
    console.error('알림 읽음 처리 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '알림 읽음 처리에 실패했습니다'));
  }
}

// PATCH /api/v1/alerts/read-all?siteId=
export async function markAllRead(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId가 필요합니다'));
      return;
    }
    const result = await alertService.markAllAlertsRead(siteId);
    res.json(successResponse({ updated: result.count }));
  } catch (err) {
    console.error('알림 일괄 읽음 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '알림 일괄 읽음에 실패했습니다'));
  }
}

// PATCH /api/v1/alerts/:id/resolve
export async function resolveAlert(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const alert = await alertService.resolveAlert(id);
    res.json(successResponse(alert));
  } catch (err) {
    console.error('알림 해결 처리 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '알림 해결 처리에 실패했습니다'));
  }
}

// GET /api/v1/alerts/unread-count?siteId=
export async function unreadCount(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId가 필요합니다'));
      return;
    }
    const count = await alertService.getUnreadCount(siteId);
    res.json(successResponse({ count }));
  } catch (err) {
    console.error('읽지 않은 알림 수 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '알림 수 조회에 실패했습니다'));
  }
}
