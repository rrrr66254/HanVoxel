import { Router } from 'express';
import * as templateController from '../controllers/warehouse-template.controller';

const router = Router();

// 창고 템플릿 목록 (쿼리: ?industry=)
router.get('/warehouse-templates', templateController.listTemplates);

// 창고 템플릿 단건 조회
router.get('/warehouse-templates/:code', templateController.getTemplate);

export default router;
