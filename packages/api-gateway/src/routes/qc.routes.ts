import { Router } from 'express';
import * as qcController from '../controllers/qc.controller';

const router = Router();

// 공급업체
router.put('/qc/suppliers', qcController.upsertSupplier);
router.get('/qc/suppliers', qcController.listSuppliers);
router.get('/qc/suppliers/:id/scorecard', qcController.getScorecard);

// 검수 기록
router.post('/qc/inspections', qcController.createInspection);
router.get('/qc/inspections', qcController.listInspections);
router.get('/qc/inspections/:id', qcController.getInspection);

// 격리 재고
router.get('/qc/quarantine', qcController.getQuarantineItems);

// QC 통계
router.get('/qc/stats', qcController.getStats);

export default router;
