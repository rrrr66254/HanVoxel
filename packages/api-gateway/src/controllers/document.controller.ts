import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as documentService from '../services/document.service';

// ── 문서 목록 조회 ────────────────────────────────────────

// GET /api/v1/documents?siteId=&docType=&relatedType=&relatedId=&search=&status=
export async function listDocuments(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId는 필수입니다'));
      return;
    }

    const docType = req.query.docType as string | undefined;
    const relatedType = req.query.relatedType as string | undefined;
    const relatedId = req.query.relatedId as string | undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const { documents, total } = await documentService.listDocuments(siteId, {
      siteId, docType, relatedType, relatedId, search, status, limit, offset,
    });
    res.json(successResponse(documents, { total }));
  } catch (err) {
    console.error('문서 목록 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '문서 목록 조회에 실패했습니다'));
  }
}

// ── 문서 업로드 (메타데이터 등록) ─────────────────────────

// POST /api/v1/documents/upload
export async function uploadDocument(req: Request, res: Response) {
  try {
    const { siteId, companyId, docType, title, fileUrl, fileName } = req.body;
    if (!siteId || !companyId || !docType || !title || !fileUrl || !fileName) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId, companyId, docType, title, fileUrl, fileName은 필수입니다'));
      return;
    }
    const document = await documentService.createDocument(req.body);
    res.status(201).json(successResponse(document));
  } catch (err) {
    console.error('문서 업로드 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '문서 업로드에 실패했습니다'));
  }
}

// ── 문서 상세 조회 ────────────────────────────────────────

// GET /api/v1/documents/:id
export async function getDocumentById(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const document = await documentService.getDocumentById(id);
    if (!document) {
      res.status(404).json(errorResponse('NOT_FOUND', '문서를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(document));
  } catch (err) {
    console.error('문서 상세 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '문서 상세 조회에 실패했습니다'));
  }
}

// ── 문서 수정 ─────────────────────────────────────────────

// PATCH /api/v1/documents/:id
export async function updateDocument(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const updated = await documentService.updateDocument(id, req.body);
    if (!updated) {
      res.status(404).json(errorResponse('NOT_FOUND', '문서를 찾을 수 없습니다'));
      return;
    }
    res.json(successResponse(updated));
  } catch (err) {
    console.error('문서 수정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '문서 수정에 실패했습니다'));
  }
}

// ── 문서 삭제 (보관 처리) ─────────────────────────────────

// DELETE /api/v1/documents/:id
export async function deleteDocument(req: Request, res: Response) {
  try {
    const id = req.params.id;

    // 존재 여부 확인
    const existing = await documentService.getDocumentById(id);
    if (!existing) {
      res.status(404).json(errorResponse('NOT_FOUND', '문서를 찾을 수 없습니다'));
      return;
    }

    const archived = await documentService.archiveDocument(id);
    res.json(successResponse(archived));
  } catch (err) {
    console.error('문서 삭제 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '문서 삭제에 실패했습니다'));
  }
}

// ── 문서 버전 이력 조회 ───────────────────────────────────

// GET /api/v1/documents/:id/versions
export async function getDocumentVersions(req: Request, res: Response) {
  try {
    const documentId = req.params.id;
    const versions = await documentService.getDocumentVersions(documentId);
    res.json(successResponse(versions, { total: versions.length }));
  } catch (err) {
    console.error('문서 버전 이력 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '문서 버전 이력 조회에 실패했습니다'));
  }
}

// ── 문서 공유 생성 ────────────────────────────────────────

// POST /api/v1/documents/:id/share
export async function createShare(req: Request, res: Response) {
  try {
    const documentId = req.params.id;
    const { sharedWith, sharedBy, permission } = req.body;
    if (!sharedWith || !sharedBy || !permission) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'sharedWith, sharedBy, permission은 필수입니다'));
      return;
    }

    // 문서 존재 여부 확인
    const existing = await documentService.getDocumentById(documentId);
    if (!existing) {
      res.status(404).json(errorResponse('NOT_FOUND', '문서를 찾을 수 없습니다'));
      return;
    }

    const share = await documentService.createShare(documentId, req.body);
    res.status(201).json(successResponse(share));
  } catch (err) {
    console.error('문서 공유 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '문서 공유 생성에 실패했습니다'));
  }
}

// ── 만료 예정 문서 조회 ───────────────────────────────────

// GET /api/v1/documents/expiring?siteId=&days=30
export async function getExpiringDocuments(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'siteId는 필수입니다'));
      return;
    }
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const documents = await documentService.getExpiringDocuments(siteId, days);
    res.json(successResponse(documents, { total: documents.length }));
  } catch (err) {
    console.error('만료 예정 문서 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '만료 예정 문서 조회에 실패했습니다'));
  }
}

// ── 관련 엔티티별 문서 조회 ───────────────────────────────

// GET /api/v1/documents/related/:type/:id
export async function getRelatedDocuments(req: Request, res: Response) {
  try {
    const relatedType = req.params.type;
    const relatedId = req.params.id;
    const documents = await documentService.getRelatedDocuments(relatedType, relatedId);
    res.json(successResponse(documents, { total: documents.length }));
  } catch (err) {
    console.error('관련 문서 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '관련 문서 조회에 실패했습니다'));
  }
}
