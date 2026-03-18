import type { Request, Response } from 'express';
import * as partnerService from '../services/partner.service';

// ── 거래처 CRUD ─────────────────────────────────

export async function createHandler(req: Request, res: Response) {
  try {
    const { companyId, type, name, code } = req.body;
    if (!companyId || !type || !name || !code) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'companyId, type, name, code 필수' } });
      return;
    }
    const partner = await partnerService.createPartner(req.body);
    res.status(201).json({ success: true, data: partner });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '거래처 생성 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function listHandler(req: Request, res: Response) {
  try {
    const companyId = String(req.query.companyId ?? '');
    if (!companyId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'companyId 필수' } });
      return;
    }
    const type = req.query.type ? String(req.query.type) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const result = await partnerService.listPartners(companyId, { type, search, isActive, page, limit });
    res.json({ success: true, data: result.partners, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '거래처 목록 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function detailHandler(req: Request, res: Response) {
  try {
    const partner = await partnerService.getPartner(req.params.id);
    if (!partner) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '거래처를 찾을 수 없습니다' } });
      return;
    }
    res.json({ success: true, data: partner });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '거래처 상세 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function updateHandler(req: Request, res: Response) {
  try {
    const partner = await partnerService.updatePartner(req.params.id, req.body);
    res.json({ success: true, data: partner });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '거래처 수정 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function deleteHandler(req: Request, res: Response) {
  try {
    await partnerService.deletePartner(req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '거래처 삭제 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 담당자 ──────────────────────────────────────

export async function addContactHandler(req: Request, res: Response) {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'name 필수' } });
      return;
    }
    const contact = await partnerService.addContact({ ...req.body, partnerId: req.params.id });
    res.status(201).json({ success: true, data: contact });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '담당자 추가 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function updateContactHandler(req: Request, res: Response) {
  try {
    const contact = await partnerService.updateContact(req.params.contactId, req.body);
    res.json({ success: true, data: contact });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '담당자 수정 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function deleteContactHandler(req: Request, res: Response) {
  try {
    await partnerService.deleteContact(req.params.contactId);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '담당자 삭제 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 계좌 ────────────────────────────────────────

export async function addBankAccountHandler(req: Request, res: Response) {
  try {
    const { bankName, accountNo, holder } = req.body;
    if (!bankName || !accountNo || !holder) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'bankName, accountNo, holder 필수' } });
      return;
    }
    const account = await partnerService.addBankAccount({ ...req.body, partnerId: req.params.id });
    res.status(201).json({ success: true, data: account });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '계좌 추가 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

export async function deleteBankAccountHandler(req: Request, res: Response) {
  try {
    await partnerService.deleteBankAccount(req.params.accountId);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '계좌 삭제 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 거래 요약 갱신 ──────────────────────────────

export async function refreshSummaryHandler(req: Request, res: Response) {
  try {
    const summary = await partnerService.refreshTransactionSummary(req.params.id);
    res.json({ success: true, data: summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '거래 요약 갱신 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}
