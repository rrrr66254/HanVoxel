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

// POST /api/v1/spatial-presets
export async function createPreset(req: Request, res: Response) {
  try {
    const { categoryId, code, name } = req.body;
    if (!categoryId || !code || !name) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'categoryId, code, name은 필수입니다'));
      return;
    }
    const preset = await presetService.createPreset(req.body);
    res.status(201).json(successResponse(preset));
  } catch (err: unknown) {
    console.error('프리셋 생성 실패:', err);
    const message = err instanceof Error && err.message.includes('Unique constraint')
      ? '이미 존재하는 프리셋 코드입니다'
      : '프리셋 생성에 실패했습니다';
    const status = message.includes('이미') ? 409 : 500;
    res.status(status).json(errorResponse('CREATE_ERROR', message));
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
