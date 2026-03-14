import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as templateService from '../services/warehouse-template.service';

// GET /api/v1/warehouse-templates
export async function listTemplates(req: Request, res: Response) {
  try {
    const industry = typeof req.query.industry === 'string' ? req.query.industry : undefined;
    const templates = await templateService.getTemplates({ industry });
    res.json(successResponse(templates, { total: templates.length }));
  } catch (err) {
    console.error('창고 템플릿 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '템플릿 조회에 실패했습니다'));
  }
}

// GET /api/v1/warehouse-templates/:code
export async function getTemplate(req: Request, res: Response) {
  try {
    const code = req.params.code as string;
    const template = await templateService.getTemplateByCode(code);
    if (!template) {
      res.status(404).json(errorResponse('NOT_FOUND', '템플릿을 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(template));
  } catch (err) {
    console.error('창고 템플릿 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '템플릿 조회에 실패했습니다'));
  }
}
