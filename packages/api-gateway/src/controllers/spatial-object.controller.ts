import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as spatialObjectService from '../services/spatial-object.service';

// POST /api/v1/spatial-objects
export async function createObject(req: Request, res: Response) {
  try {
    const { siteId, typeId, name, code, ...rest } = req.body;

    if (!siteId || !typeId || !name || !code) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, typeId, name, code는 필수입니다'));
      return;
    }

    const obj = await spatialObjectService.createSpatialObject({ siteId, typeId, name, code, ...rest });
    res.status(201).json(successResponse(obj));
  } catch (err) {
    console.error('공간 객체 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '공간 객체 생성에 실패했습니다'));
  }
}

// GET /api/v1/spatial-objects?siteId=
export async function listObjects(req: Request, res: Response) {
  try {
    const siteId = typeof req.query.siteId === 'string' ? req.query.siteId : undefined;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId 쿼리 파라미터가 필요합니다'));
      return;
    }
    const objects = await spatialObjectService.getObjectsBySite(siteId);
    res.json(successResponse(objects, { total: objects.length }));
  } catch (err) {
    console.error('공간 객체 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '공간 객체 조회에 실패했습니다'));
  }
}

// GET /api/v1/spatial-objects/:id
export async function getObject(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const obj = await spatialObjectService.getObjectById(id);
    if (!obj) {
      res.status(404).json(errorResponse('NOT_FOUND', '공간 객체를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(obj));
  } catch (err) {
    console.error('공간 객체 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '공간 객체 조회에 실패했습니다'));
  }
}

// PATCH /api/v1/spatial-objects/:id
export async function updateObject(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const obj = await spatialObjectService.updateSpatialObject(id, req.body);
    res.json(successResponse(obj));
  } catch (err) {
    console.error('공간 객체 수정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '공간 객체 수정에 실패했습니다'));
  }
}

// DELETE /api/v1/spatial-objects/:id
export async function deleteObject(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await spatialObjectService.deleteSpatialObject(id);
    res.json(successResponse({ deleted: true }));
  } catch (err) {
    console.error('공간 객체 삭제 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '공간 객체 삭제에 실패했습니다'));
  }
}
