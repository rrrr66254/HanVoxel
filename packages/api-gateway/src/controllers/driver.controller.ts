/**
 * 배송 기사 컨트롤러 — 기사 CRUD + 입출고 배정
 */
import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as driverService from '../services/driver.service';

// ── 기사 목록 ────────────────────────────────────────────

export async function listDrivers(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('BAD_REQUEST', 'siteId 파라미터가 필요합니다'));
      return;
    }
    const drivers = await driverService.getDrivers(siteId);
    res.json(successResponse(drivers));
  } catch (err) {
    console.error('기사 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '기사 목록 조회에 실패했습니다'));
  }
}

// ── 기사 등록 ────────────────────────────────────────────

export async function createDriver(req: Request, res: Response) {
  try {
    const driver = await driverService.createDriver(req.body);
    res.status(201).json(successResponse(driver));
  } catch (err) {
    console.error('기사 등록 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '기사 등록에 실패했습니다'));
  }
}

// ── 기사 수정 ────────────────────────────────────────────

export async function updateDriver(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const driver = await driverService.updateDriver(id, req.body);
    res.json(successResponse(driver));
  } catch (err) {
    console.error('기사 수정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '기사 수정에 실패했습니다'));
  }
}

// ── 기사 비활성화 ────────────────────────────────────────

export async function deleteDriver(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const driver = await driverService.deleteDriver(id);
    res.json(successResponse(driver));
  } catch (err) {
    console.error('기사 비활성화 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '기사 비활성화에 실패했습니다'));
  }
}

// ── 입고에 기사 배정 ─────────────────────────────────────

export async function assignDriverToInbound(req: Request, res: Response) {
  try {
    const orderId = req.params.id as string;
    const order = await driverService.assignDriverToInbound(orderId, req.body);
    res.json(successResponse(order));
  } catch (err) {
    console.error('입고 기사 배정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '입고 기사 배정에 실패했습니다'));
  }
}

// ── 출고에 기사 배정 ─────────────────────────────────────

export async function assignDriverToOutbound(req: Request, res: Response) {
  try {
    const orderId = req.params.id as string;
    const order = await driverService.assignDriverToOutbound(orderId, req.body);
    res.json(successResponse(order));
  } catch (err) {
    console.error('출고 기사 배정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '출고 기사 배정에 실패했습니다'));
  }
}

// ── 입고 전체 상세 ──────────────────────────────────────

export async function getInboundOrderDetail(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const order = await driverService.getInboundOrderDetail(id);
    if (!order) {
      res.status(404).json(errorResponse('NOT_FOUND', '입고 주문을 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(order));
  } catch (err) {
    console.error('입고 상세 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '입고 상세 조회에 실패했습니다'));
  }
}

// ── 출고 전체 상세 ──────────────────────────────────────

export async function getOutboundOrderDetail(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const order = await driverService.getOutboundOrderDetail(id);
    if (!order) {
      res.status(404).json(errorResponse('NOT_FOUND', '출고 주문을 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(order));
  } catch (err) {
    console.error('출고 상세 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '출고 상세 조회에 실패했습니다'));
  }
}
