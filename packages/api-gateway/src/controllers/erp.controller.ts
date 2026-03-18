/**
 * 경량 ERP 컨트롤러 — 거래처, 전표, 원가, 커넥터
 */
import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../types/api';
import * as partnerService from '../services/partner.service';
import * as voucherService from '../services/voucher.service';
import * as costService from '../services/cost.service';
import * as erpConnectorService from '../services/erp-connector.service';

// ── 거래처 ─────────────────────────────────────────────

export async function createPartner(req: Request, res: Response) {
  try {
    const partner = await partnerService.createPartner(req.body);
    res.status(201).json(successResponse(partner));
  } catch (err) {
    console.error('거래처 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래처 생성에 실패했습니다'));
  }
}

export async function updatePartner(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const partner = await partnerService.updatePartner(id, req.body);
    res.json(successResponse(partner));
  } catch (err) {
    console.error('거래처 수정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래처 수정에 실패했습니다'));
  }
}

export async function listPartners(req: Request, res: Response) {
  try {
    const { companyId, type, search, limit } = req.query;
    const result = await partnerService.getPartners(
      companyId as string,
      { type: type as string, search: search as string, limit: limit ? parseInt(limit as string) : undefined },
    );
    res.json(successResponse(result.partners, { total: result.total }));
  } catch (err) {
    console.error('거래처 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래처 조회에 실패했습니다'));
  }
}

export async function getPartner(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const partner = await partnerService.getPartnerById(id);
    if (!partner) { res.status(404).json(errorResponse('NOT_FOUND', '거래처를 찾을 수 없습니다')); return; }
    res.json(successResponse(partner));
  } catch (err) {
    console.error('거래처 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래처 조회에 실패했습니다'));
  }
}

export async function getPartnerHistory(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const history = await partnerService.getPartnerHistory(id);
    res.json(successResponse(history));
  } catch (err) {
    console.error('거래 이력 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래 이력 조회에 실패했습니다'));
  }
}

export async function getPartnerStats(req: Request, res: Response) {
  try {
    const companyId = req.query.companyId as string;
    const stats = await partnerService.getPartnerStats(companyId);
    res.json(successResponse(stats));
  } catch (err) {
    console.error('거래처 통계 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래처 통계 조회에 실패했습니다'));
  }
}

// ── 거래처 비활성화 ──────────────────────────────────────

export async function deletePartner(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const partner = await partnerService.deletePartner(id);
    res.json(successResponse(partner));
  } catch (err) {
    console.error('거래처 비활성화 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래처 비활성화에 실패했습니다'));
  }
}

// ── 거래처 자동완성 검색 ─────────────────────────────────

export async function searchPartners(req: Request, res: Response) {
  try {
    const companyId = req.query.companyId as string;
    const q = req.query.q as string;
    if (!companyId || !q) {
      res.status(400).json(errorResponse('BAD_REQUEST', 'companyId와 q 파라미터가 필요합니다'));
      return;
    }
    const partners = await partnerService.searchPartners(companyId, q);
    res.json(successResponse(partners));
  } catch (err) {
    console.error('거래처 검색 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래처 검색에 실패했습니다'));
  }
}

// ── 거래처 대시보드 통계 ─────────────────────────────────

export async function getPartnerDashboard(req: Request, res: Response) {
  try {
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json(errorResponse('BAD_REQUEST', 'companyId 파라미터가 필요합니다'));
      return;
    }
    const stats = await partnerService.getPartnerDashboardStats(companyId);
    res.json(successResponse(stats));
  } catch (err) {
    console.error('거래처 대시보드 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래처 대시보드 조회에 실패했습니다'));
  }
}

// ── 거래액 랭킹 ─────────────────────────────────────────

export async function getPartnerRanking(req: Request, res: Response) {
  try {
    const companyId = req.query.companyId as string;
    const type = req.query.type as 'SUPPLIER' | 'CUSTOMER';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    if (!companyId || !type) {
      res.status(400).json(errorResponse('BAD_REQUEST', 'companyId와 type 파라미터가 필요합니다'));
      return;
    }
    const ranking = await partnerService.getPartnerRanking(companyId, type, limit);
    res.json(successResponse(ranking));
  } catch (err) {
    console.error('거래액 랭킹 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래액 랭킹 조회에 실패했습니다'));
  }
}

// ── 거래 실적 집계 ──────────────────────────────────────

export async function getPartnerTransactionSummary(req: Request, res: Response) {
  try {
    const partnerId = req.params.id as string;
    const summary = await partnerService.getPartnerTransactionSummary(partnerId);
    res.json(successResponse(summary));
  } catch (err) {
    console.error('거래 실적 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '거래 실적 조회에 실패했습니다'));
  }
}

// ── 담당자 등록 ─────────────────────────────────────────

export async function createPartnerContact(req: Request, res: Response) {
  try {
    const partnerId = req.params.id as string;
    const contact = await partnerService.createPartnerContact({ ...req.body, partnerId });
    res.status(201).json(successResponse(contact));
  } catch (err) {
    console.error('담당자 등록 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '담당자 등록에 실패했습니다'));
  }
}

// ── 담당자 목록 ─────────────────────────────────────────

export async function getPartnerContacts(req: Request, res: Response) {
  try {
    const partnerId = req.params.id as string;
    const contacts = await partnerService.getPartnerContacts(partnerId);
    res.json(successResponse(contacts));
  } catch (err) {
    console.error('담당자 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '담당자 조회에 실패했습니다'));
  }
}

// ── 담당자 수정 ─────────────────────────────────────────

export async function updatePartnerContact(req: Request, res: Response) {
  try {
    const contactId = req.params.contactId as string;
    const contact = await partnerService.updatePartnerContact(contactId, req.body);
    res.json(successResponse(contact));
  } catch (err) {
    console.error('담당자 수정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '담당자 수정에 실패했습니다'));
  }
}

// ── 담당자 삭제 ─────────────────────────────────────────

export async function deletePartnerContact(req: Request, res: Response) {
  try {
    const contactId = req.params.contactId as string;
    await partnerService.deletePartnerContact(contactId);
    res.json(successResponse({ deleted: true }));
  } catch (err) {
    console.error('담당자 삭제 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '담당자 삭제에 실패했습니다'));
  }
}

// ── 계좌 CRUD ──────────────────────────────────────────

export async function createBankAccount(req: Request, res: Response) {
  try {
    const partnerId = req.params.id as string;
    const account = await partnerService.createBankAccount({ ...req.body, partnerId });
    res.status(201).json(successResponse(account));
  } catch (err) {
    console.error('계좌 등록 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '계좌 등록에 실패했습니다'));
  }
}

export async function getBankAccounts(req: Request, res: Response) {
  try {
    const partnerId = req.params.id as string;
    const accounts = await partnerService.getBankAccounts(partnerId);
    res.json(successResponse(accounts));
  } catch (err) {
    console.error('계좌 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '계좌 조회에 실패했습니다'));
  }
}

export async function updateBankAccount(req: Request, res: Response) {
  try {
    const accountId = req.params.accountId as string;
    const account = await partnerService.updateBankAccount(accountId, req.body);
    res.json(successResponse(account));
  } catch (err) {
    console.error('계좌 수정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '계좌 수정에 실패했습니다'));
  }
}

export async function deleteBankAccount(req: Request, res: Response) {
  try {
    const accountId = req.params.accountId as string;
    await partnerService.deleteBankAccount(accountId);
    res.json(successResponse({ deleted: true }));
  } catch (err) {
    console.error('계좌 삭제 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '계좌 삭제에 실패했습니다'));
  }
}

// ── 첨부파일 CRUD ──────────────────────────────────────

export async function createAttachment(req: Request, res: Response) {
  try {
    const partnerId = req.params.id as string;
    const attachment = await partnerService.createAttachment({ ...req.body, partnerId });
    res.status(201).json(successResponse(attachment));
  } catch (err) {
    console.error('첨부파일 등록 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '첨부파일 등록에 실패했습니다'));
  }
}

export async function getAttachments(req: Request, res: Response) {
  try {
    const partnerId = req.params.id as string;
    const attachments = await partnerService.getAttachments(partnerId);
    res.json(successResponse(attachments));
  } catch (err) {
    console.error('첨부파일 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '첨부파일 조회에 실패했습니다'));
  }
}

export async function deleteAttachment(req: Request, res: Response) {
  try {
    const attachmentId = req.params.attachmentId as string;
    await partnerService.deleteAttachment(attachmentId);
    res.json(successResponse({ deleted: true }));
  } catch (err) {
    console.error('첨부파일 삭제 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '첨부파일 삭제에 실패했습니다'));
  }
}

// ── 전표 ───────────────────────────────────────────────

export async function createVoucher(req: Request, res: Response) {
  try {
    const voucher = await voucherService.createVoucher(req.body);
    res.status(201).json(successResponse(voucher));
  } catch (err) {
    console.error('전표 생성 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '전표 생성에 실패했습니다'));
  }
}

export async function confirmVoucher(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const voucher = await voucherService.confirmVoucher(id);
    res.json(successResponse(voucher));
  } catch (err) {
    const message = err instanceof Error ? err.message : '전표 확정 실패';
    console.error('전표 확정 실패:', err);
    res.status(500).json(errorResponse('CONFIRM_ERROR', message));
  }
}

export async function cancelVoucher(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const voucher = await voucherService.cancelVoucher(id);
    res.json(successResponse(voucher));
  } catch (err) {
    console.error('전표 취소 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '전표 취소에 실패했습니다'));
  }
}

export async function listVouchers(req: Request, res: Response) {
  try {
    const { siteId, type, status, partnerId, from, to, limit } = req.query;
    const result = await voucherService.getVouchers(
      siteId as string,
      { type: type as string, status: status as string, partnerId: partnerId as string, from: from as string, to: to as string, limit: limit ? parseInt(limit as string) : undefined },
    );
    res.json(successResponse(result.vouchers, { total: result.total }));
  } catch (err) {
    console.error('전표 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '전표 조회에 실패했습니다'));
  }
}

export async function getVoucher(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const voucher = await voucherService.getVoucherById(id);
    if (!voucher) { res.status(404).json(errorResponse('NOT_FOUND', '전표를 찾을 수 없습니다')); return; }
    res.json(successResponse(voucher));
  } catch (err) {
    console.error('전표 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '전표 조회에 실패했습니다'));
  }
}

export async function getVoucherStats(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const stats = await voucherService.getVoucherStats(siteId, days);
    res.json(successResponse(stats));
  } catch (err) {
    console.error('전표 통계 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '전표 통계 조회에 실패했습니다'));
  }
}

export async function getVoucherPdf(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const docType = (req.query.docType as string) === 'delivery_note' ? 'delivery_note' as const : 'purchase_order' as const;
    const html = await voucherService.generateVoucherPdfHtml(id, docType);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF 생성 실패';
    console.error('PDF 생성 실패:', err);
    res.status(500).json(errorResponse('PDF_ERROR', message));
  }
}

// ── 원가 / 마진 ───────────────────────────────────────

export async function listSkuCosts(req: Request, res: Response) {
  try {
    const { siteId, search, limit } = req.query;
    const costs = await costService.getSkuCosts(
      siteId as string,
      { search: search as string, limit: limit ? parseInt(limit as string) : undefined },
    );
    res.json(successResponse(costs));
  } catch (err) {
    console.error('원가 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '원가 조회에 실패했습니다'));
  }
}

export async function getSkuMargins(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId as string;
    const margins = await costService.getSkuMargins(siteId);
    res.json(successResponse(margins));
  } catch (err) {
    console.error('마진 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '마진율 조회에 실패했습니다'));
  }
}

export async function updateSellingPrice(req: Request, res: Response) {
  try {
    const { siteId, sku, sellingPrice } = req.body;
    const result = await costService.updateSellingPrice(siteId, sku, sellingPrice);
    res.json(successResponse(result));
  } catch (err) {
    console.error('판매 단가 설정 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '판매 단가 설정에 실패했습니다'));
  }
}

// ── ERP 커넥터 ─────────────────────────────────────────

export async function getConnectorStatus(_req: Request, res: Response) {
  try {
    const status = erpConnectorService.getConnectorStatus();
    res.json(successResponse(status));
  } catch (err) {
    console.error('커넥터 상태 조회 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '커넥터 상태 조회에 실패했습니다'));
  }
}

export async function previewErpMapping(req: Request, res: Response) {
  try {
    const { voucherData, erpType } = req.body;
    const result = erpConnectorService.previewErpMapping(voucherData, erpType);
    res.json(successResponse(result));
  } catch (err) {
    console.error('ERP 매핑 프리뷰 실패:', err);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'ERP 매핑 프리뷰에 실패했습니다'));
  }
}
