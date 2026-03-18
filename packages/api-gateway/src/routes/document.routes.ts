import { Router } from 'express';
import * as documentController from '../controllers/document.controller';

const router = Router();

// 만료 예정 문서 조회 (/:id 라우트보다 먼저 등록)
router.get('/documents/expiring', documentController.getExpiringDocuments);

// 관련 엔티티별 문서 조회
router.get('/documents/related/:type/:id', documentController.getRelatedDocuments);

// 문서 목록 조회
router.get('/documents', documentController.listDocuments);

// 문서 업로드 (메타데이터 등록)
router.post('/documents/upload', documentController.uploadDocument);

// 문서 상세 조회
router.get('/documents/:id', documentController.getDocumentById);

// 문서 수정 (파일 변경 시 새 버전 생성)
router.patch('/documents/:id', documentController.updateDocument);

// 문서 삭제 (보관 처리)
router.delete('/documents/:id', documentController.deleteDocument);

// 문서 버전 이력 조회
router.get('/documents/:id/versions', documentController.getDocumentVersions);

// 문서 공유 생성
router.post('/documents/:id/share', documentController.createShare);

export default router;
