import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllMessages,
  getUnreadCount,
  getChatList,
  getConversation,
  sendMessage,
  markAsRead,
} from '../controllers/messages.controller';

const router = Router();


router.use(authenticate);


router.get('/conversations', getChatList);


router.get('/conversations/:otherUserId', getConversation);


router.post('/', sendMessage);


router.put('/conversations/:otherUserId/read', markAsRead);


router.get('/', getAllMessages);


router.get('/unread-count', getUnreadCount);

export default router;