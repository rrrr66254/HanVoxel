import { Router } from 'express';
import * as presetController from '../controllers/preset.controller';

const router = Router();

// 프리셋 카테고리 목록
router.get('/preset-categories', presetController.listCategories);

// 프리셋 목록 (쿼리: ?categoryId=&region=)
router.get('/spatial-presets', presetController.listPresets);

// 프리셋 생성 (내 프리셋으로 저장)
router.post('/spatial-presets', presetController.createPreset);

// 프리셋 단건 조회
router.get('/spatial-presets/:code', presetController.getPreset);

export default router;
