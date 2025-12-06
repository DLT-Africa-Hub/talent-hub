import { Router, type IRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notification.controller';

const router: IRouter = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:notificationId/read', markNotificationRead);

export default router;
