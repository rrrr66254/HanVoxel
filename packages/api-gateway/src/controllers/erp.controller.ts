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
