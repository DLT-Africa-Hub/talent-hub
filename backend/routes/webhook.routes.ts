import { Router, type IRouter } from 'express';
import { handleCalendlyWebhook } from '../controllers/calendly.webhook.controller';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router: IRouter = Router();

// Webhook routes don't require authentication (they use signature verification)
// But we apply rate limiting to prevent abuse
router.post('/calendly', apiLimiter, handleCalendlyWebhook);

export default router;
