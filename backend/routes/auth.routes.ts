import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getSessions,
  revokeSessionById,
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
  googleSignIn,
  getGoogleAuthUrl,
  googleOAuthCallback,
  googleAuthCode,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  requestEmailVerificationSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validation/auth.validation';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh', validateRequest(refreshSchema), refresh);
router.post(
  '/logout',
  authenticate,
  validateRequest(requestEmailVerificationSchema),
  logout
);
router.post(
  '/logout-all',
  authenticate,
  validateRequest(requestEmailVerificationSchema),
  logoutAll
);
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/:sessionId', authenticate, revokeSessionById);
router.post(
  '/request-email-verification',
  authenticate,
  validateRequest(requestEmailVerificationSchema),
  requestEmailVerification
);
router.post('/verify-email', verifyEmail);
router.post(
  '/request-password-reset',
  validateRequest(requestPasswordResetSchema),
  requestPasswordReset
);
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  resetPassword
);
router.post(
  '/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  changePassword
);

router.post('/google/authcode', googleAuthCode); 
router.post('/google', googleSignIn); 
router.get('/google/url', getGoogleAuthUrl); 
router.get('/google/callback', googleOAuthCallback); 

export default router;
