import type { Request, Response } from 'express';
import * as driverService from '../services/driver.service';

export async function createHandler(req: Request, res: Response) {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'name, phone 필수' } });
      return;
    }
    const driver = await driverService.createDriver(req.body);
    res.status(201).json({ success: true, data: driver });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '기사 등록 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function listHandler(req: Request, res: Response) {
  try {
    const partnerId = req.query.partnerId ? String(req.query.partnerId) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);

    const result = await driverService.listDrivers({ partnerId, search, isActive, page, limit });
    res.json({ success: true, data: result.drivers, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '기사 목록 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function detailHandler(req: Request, res: Response) {
  try {
    const driver = await driverService.getDriver(req.params.id);
    if (!driver) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '기사를 찾을 수 없습니다' } });
      return;
    }
    res.json({ success: true, data: driver });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '기사 상세 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function updateHandler(req: Request, res: Response) {
  try {
    const driver = await driverService.updateDriver(req.params.id, req.body);
    res.json({ success: true, data: driver });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '기사 수정 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function deleteHandler(req: Request, res: Response) {
  try {
    await driverService.deleteDriver(req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '기사 삭제 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}
