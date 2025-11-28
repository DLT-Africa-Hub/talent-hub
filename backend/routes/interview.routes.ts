import { Router } from 'express';
import {
  authenticate,
  authorize,
  requireEmailVerification,
} from '../middleware/auth.middleware';
import { strictLimiter } from '../middleware/rateLimit.middleware';
import { getInterviewBySlug } from '../controllers/interview.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('company', 'graduate'));
router.use(requireEmailVerification);

router.get('/:slug', strictLimiter, getInterviewBySlug);

export default router;

