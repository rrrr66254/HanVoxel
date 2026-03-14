import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as presetService from '../services/preset.service';

// GET /api/v1/preset-categories
export async function listCategories(_req: Request, res: Response) {
  try {
    const categories = await presetService.getAllCategories();
    res.json(successResponse(categories));
  } catch (err) {
    console.error('프리셋 카테고리 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '카테고리 조회에 실패했습니다'));
  }
}

// GET /api/v1/spatial-presets
export async function listPresets(req: Request, res: Response) {
  try {
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const region = typeof req.query.region === 'string' ? req.query.region : undefined;
    const presets = await presetService.getPresets({ categoryId, region });
    res.json(successResponse(presets, { total: presets.length }));
  } catch (err) {
    console.error('프리셋 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '프리셋 조회에 실패했습니다'));
  }
}

// GET /api/v1/spatial-presets/:code
export async function getPreset(req: Request, res: Response) {
  try {
    const code = req.params.code as string;
    const preset = await presetService.getPresetByCode(code);
    if (!preset) {
      res.status(404).json(errorResponse('NOT_FOUND', '프리셋을 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(preset));
  } catch (err) {
    console.error('프리셋 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '프리셋 조회에 실패했습니다'));
  }
}
