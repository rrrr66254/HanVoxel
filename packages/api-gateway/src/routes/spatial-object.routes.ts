import { Router } from 'express';
import * as spatialObjectController from '../controllers/spatial-object.controller';

const router = Router();

// 공간 객체 생성
router.post('/spatial-objects', spatialObjectController.createObject);

// 공간 객체 목록 조회 (쿼리: ?siteId=)
router.get('/spatial-objects', spatialObjectController.listObjects);

// 공간 객체 단건 조회
router.get('/spatial-objects/:id', spatialObjectController.getObject);

// 공간 객체 수정
router.patch('/spatial-objects/:id', spatialObjectController.updateObject);

// 공간 객체 삭제 (소프트 삭제)
router.delete('/spatial-objects/:id', spatialObjectController.deleteObject);

export default router;
