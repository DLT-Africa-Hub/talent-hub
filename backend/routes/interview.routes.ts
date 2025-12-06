import { Router, type IRouter } from 'express';
import {
  authenticate,
  authorize,
  requireEmailVerification,
} from '../middleware/auth.middleware';
import { strictLimiter, apiLimiter } from '../middleware/rateLimit.middleware';
import {
  getInterviewBySlug,
  generateStreamTokenController,
} from '../controllers/interview.controller';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize('company', 'graduate'));
router.use(requireEmailVerification);

// Use apiLimiter (100 req/15min) instead of strictLimiter (50 req/15min)
// since token generation is lightweight and may be called multiple times during video setup
router.get('/token/stream', apiLimiter, generateStreamTokenController);
router.get('/:slug', strictLimiter, getInterviewBySlug);

export default router;
