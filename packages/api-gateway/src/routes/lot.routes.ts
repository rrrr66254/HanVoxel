import { Router } from 'express';
import * as lotController from '../controllers/lot.controller';

const router = Router();

// LOT 리콜 분석 (/:id 라우트보다 먼저 등록)
router.get('/lots/recall', lotController.recallAnalysis);

// LOT 목록 조회
router.get('/lots', lotController.listLots);

// LOT 생성
router.post('/lots', lotController.createLot);

// LOT 상세 조회
router.get('/lots/:id', lotController.getLotById);

// 정방향 추적 (원재료 → 완제품 → 출고)
router.get('/lots/:id/trace-forward', lotController.traceForward);

// 역방향 추적 (완제품 → 원재료)
router.get('/lots/:id/trace-backward', lotController.traceBackward);

// LOT 라벨 데이터 (QR 코드용)
router.get('/lots/:id/label', lotController.getLotLabel);

// LOT 이동 기록 추가
router.post('/lots/:id/movements', lotController.addMovement);

export default router;
