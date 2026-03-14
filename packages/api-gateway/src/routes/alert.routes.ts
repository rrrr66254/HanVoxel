import { Router } from 'express';
import * as alertController from '../controllers/alert.controller';

const router = Router();

router.post('/alerts', alertController.createAlert);
router.get('/alerts', alertController.listAlerts);
router.get('/alerts/unread-count', alertController.unreadCount);
router.patch('/alerts/read-all', alertController.markAllRead);
router.patch('/alerts/:id/read', alertController.markRead);
router.patch('/alerts/:id/resolve', alertController.resolveAlert);

export default router;
