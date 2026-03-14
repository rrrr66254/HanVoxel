import { Router } from 'express';
import * as pickingController from '../controllers/picking.controller';

const router = Router();

router.post('/picking/orders', pickingController.createOrder);
router.get('/picking/orders', pickingController.listOrders);
router.get('/picking/orders/:id', pickingController.getOrder);
router.patch('/picking/orders/:id/assign', pickingController.assignOrder);
router.patch('/picking/orders/:id/start', pickingController.startPicking);
router.patch('/picking/lines/:id/pick', pickingController.pickLine);
router.get('/picking/stats', pickingController.getStats);

export default router;
