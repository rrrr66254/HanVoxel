import { Router } from 'express';
import * as connectorCtrl from '../controllers/connector.controller';

const router = Router();

// ── 커넥터 설정 ──────────────────────────────────────
router.get('/connector/configs', connectorCtrl.listConnectors);
router.post('/connector/configs', connectorCtrl.upsertConnector);
router.patch('/connector/configs/:id/toggle', connectorCtrl.toggleConnector);
router.post('/connector/configs/:id/ping', connectorCtrl.pingConnector);

// ── 동기화 ───────────────────────────────────────────
router.post('/connector/sync/voucher', connectorCtrl.syncVoucher);
router.post('/connector/sync/partner', connectorCtrl.syncPartner);

// ── 동기화 로그 ──────────────────────────────────────
router.get('/connector/:id/logs', connectorCtrl.getSyncLogs);
router.get('/connector/:id/stats', connectorCtrl.getSyncStats);

// ── 필드 매핑 ────────────────────────────────────────
router.get('/connector/:id/mappings', connectorCtrl.getFieldMappings);
router.put('/connector/:id/mappings', connectorCtrl.upsertFieldMapping);
router.delete('/connector/:id/mappings/:mappingId', connectorCtrl.deleteFieldMapping);

// ── 프리뷰 (레거시 호환) ────────────────────────────
router.post('/connector/preview', connectorCtrl.previewMapping);

export default router;
