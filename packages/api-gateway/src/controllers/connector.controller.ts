/**
 * ERP 커넥터 관리 컨트롤러
 */
import type { Request, Response } from 'express';
import * as connectorService from '../services/erp-connector.service';

// ── 커넥터 설정 ──────────────────────────────────────

export async function listConnectors(req: Request, res: Response) {
  try {
    const companyId = String(req.query.companyId ?? '');
    if (!companyId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'companyId 필수' } });
      return;
    }
    const configs = await connectorService.getConnectorConfigs(companyId);
    res.json({ success: true, data: configs });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
}

export async function upsertConnector(req: Request, res: Response) {
  try {
    const { companyId, erpType, displayName, baseUrl, authType, credentials, configJson } = req.body;
    if (!companyId || !erpType) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'companyId, erpType 필수' } });
      return;
    }
    const result = await connectorService.upsertConnectorConfig(companyId, erpType, {
      displayName: displayName ?? erpType,
      baseUrl: baseUrl ?? '',
      authType: authType ?? 'API_KEY',
      credentials: credentials ?? {},
      configJson,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
}

export async function toggleConnector(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const { isActive } = req.body;
    const result = await connectorService.toggleConnector(id, isActive);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: String(e) } });
  }
}

// ── 연결 상태 ────────────────────────────────────────

export async function pingConnector(req: Request, res: Response) {
  try {
    const id = String(req.params.id ?? '');
    const result = await connectorService.pingConnector(id);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
}

// ── 동기화 ───────────────────────────────────────────

export async function syncVoucher(req: Request, res: Response) {
  try {
    const { connectorId, voucherId } = req.body;
    if (!connectorId || !voucherId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'connectorId, voucherId 필수' } });
      return;
    }
    const result = await connectorService.syncVoucher(connectorId, voucherId);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, error: { code: 'SYNC_ERROR', message: msg } });
  }
}

export async function syncPartner(req: Request, res: Response) {
  try {
    const { connectorId, partnerId } = req.body;
    if (!connectorId || !partnerId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'connectorId, partnerId 필수' } });
      return;
    }
    const result = await connectorService.syncPartner(connectorId, partnerId);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, error: { code: 'SYNC_ERROR', message: msg } });
  }
}

// ── 동기화 로그 ──────────────────────────────────────

export async function getSyncLogs(req: Request, res: Response) {
  try {
    const connectorId = String(req.params.id ?? '');
    const status = req.query.status ? String(req.query.status) : undefined;
    const entityType = req.query.entityType ? String(req.query.entityType) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const logs = await connectorService.getSyncLogs(connectorId, { status, entityType, limit });
    res.json({ success: true, data: logs, meta: { total: logs.length } });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
}

export async function getSyncStats(req: Request, res: Response) {
  try {
    const connectorId = String(req.params.id ?? '');
    const stats = await connectorService.getSyncStats(connectorId);
    res.json({ success: true, data: stats });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
}

// ── 필드 매핑 ────────────────────────────────────────

export async function getFieldMappings(req: Request, res: Response) {
  try {
    const connectorId = String(req.params.id ?? '');
    const entityType = req.query.entityType ? String(req.query.entityType) : undefined;
    const mappings = await connectorService.getFieldMappings(connectorId, entityType);
    res.json({ success: true, data: mappings });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
}

export async function upsertFieldMapping(req: Request, res: Response) {
  try {
    const connectorId = String(req.params.id ?? '');
    const { entityType, sourceField, targetField, transformType, transformParam, isRequired } = req.body;
    if (!entityType || !sourceField || !targetField) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'entityType, sourceField, targetField 필수' } });
      return;
    }
    const result = await connectorService.upsertFieldMapping(connectorId, entityType, sourceField, {
      targetField,
      transformType,
      transformParam,
      isRequired,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
}

export async function deleteFieldMapping(req: Request, res: Response) {
  try {
    const mappingId = String(req.params.mappingId ?? '');
    await connectorService.deleteFieldMapping(mappingId);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
}

// ── 프리뷰 (레거시 호환) ────────────────────────────

export async function previewMapping(req: Request, res: Response) {
  try {
    const { voucherData, erpType } = req.body;
    const result = connectorService.previewErpMapping(voucherData, erpType);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: String(e) } });
  }
}
