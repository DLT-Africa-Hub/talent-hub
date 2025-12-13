import { Request, Response, CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';
import User, { UserDocument } from '../models/User.model';
import Session, { SessionDocument } from '../models/Session.model';
import Token, {
  TOKEN_TYPES,
  TokenDocument,
  TokenType,
} from '../models/Token.model';
import {
  sendEmailVerification,
  sendPasswordReset,
} from '../services/email.service';
import { generateAccessToken } from '../utils/jwt.utils';
import {
  calculateExpiryDate,
  generateSecureToken,
  hashToken,
} from '../utils/security.utils';
import { isLikelyCompanyEmail } from '../utils/companyEmailCheck';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  `${process.env.APP_URL || 'http://localhost:5174'}/api/v1/auth/google/callback`;

const googleClientForVerify = new OAuth2Client(GOOGLE_CLIENT_ID);
const googleClientForServerFlow = new OAuth2Client({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: GOOGLE_REDIRECT_URI,
});

type GoogleProfile = {
  email: string;
  emailVerified: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
};

const DEFAULT_REFRESH_TOKEN_DAYS = 7;
const DEFAULT_EMAIL_VERIFICATION_DAYS = 2;
const DEFAULT_PASSWORD_RESET_HOURS = 1;

const millisPerDay = 24 * 60 * 60 * 1000;
const millisPerHour = 60 * 60 * 1000;

const parsePositiveNumber = (value?: string): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const resolveTtlMs = (
  msKey: string,
  daysKey: string,
  defaultDays: number,
  multiplier: number
): number => {
  const msValue = parsePositiveNumber(process.env[msKey]);
  if (msValue) {
    return msValue;
  }

  const daysValue = parsePositiveNumber(process.env[daysKey]);
  if (daysValue) {
    return daysValue * multiplier;
  }

  return defaultDays * multiplier;
};

const getRefreshTokenTtlMs = (): number =>
  resolveTtlMs(
    'REFRESH_TOKEN_TTL_MS',
    'REFRESH_TOKEN_DAYS',
    DEFAULT_REFRESH_TOKEN_DAYS,
    millisPerDay
  );

const REFRESH_TOKEN_TTL_MS = getRefreshTokenTtlMs();
const USER_TOKEN_HEX_LENGTH = 96;
const EMAIL_VERIFICATION_TTL_MS = resolveTtlMs(
  'EMAIL_VERIFICATION_TTL_MS',
  'EMAIL_VERIFICATION_DAYS',
  DEFAULT_EMAIL_VERIFICATION_DAYS,
  millisPerDay
);
const PASSWORD_RESET_TTL_MS = resolveTtlMs(
  'PASSWORD_RESET_TTL_MS',
  'PASSWORD_RESET_HOURS',
  DEFAULT_PASSWORD_RESET_HOURS,
  millisPerHour
);

const CLIENT_BASE_URL =
  process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:5174';

const REFRESH_TOKEN_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME || 'talent_hub_refresh';
const isProduction = process.env.NODE_ENV === 'production';

const buildUrlWithToken = (path: string, token: string): string => {
  const trimmedBase = CLIENT_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}?token=${token}`;
};

const isValidHexToken = (
  value: unknown,
  expectedLength: number
): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim();
  if (normalized.length !== expectedLength) {
    return false;
  }

  return /^[a-f0-9]+$/i.test(normalized);
};

const normalizeEmailInput = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase();
};

const normalizePasswordInput = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return value.length > 0 ? value : null;
};

const normalizeHexToken = (value: string): string => value.trim().toLowerCase();

const serializeSession = (session: SessionDocument) => ({
  id: session.id,
  createdAt: session.createdAt,
  expiresAt: session.expiresAt,
  ipAddress: session.ipAddress,
  userAgent: session.userAgent,
  isActive: session.isActive(),
});

const buildAuthPayload = (
  user: UserDocument,
  session: SessionDocument,
  refreshToken: string,
  message: string
) => {
  const accessToken = generateAccessToken({
    userId: user._id.toString(),
    role: user.role,
    sessionId: session.id,
  });

  return {
    message,
    accessToken,
    refreshToken,
    session: serializeSession(session),
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  };
};

const createSession = async (params: {
  userId: mongoose.Types.ObjectId;
  ipAddress?: string | null;
  userAgent?: string;
}): Promise<{ session: SessionDocument; refreshToken: string }> => {
  const refreshToken = generateSecureToken();
  const refreshTokenHash = hashToken(refreshToken);
  const session = await Session.create({
    user: params.userId,
    refreshTokenHash,
    ipAddress: params.ipAddress ?? undefined,
    userAgent: params.userAgent,
    expiresAt: calculateExpiryDate(REFRESH_TOKEN_TTL_MS),
  });

  return { session, refreshToken };
};

const rotateSessionToken = async (
  session: SessionDocument
): Promise<{ session: SessionDocument; refreshToken: string }> => {
  const refreshToken = generateSecureToken();
  session.refreshTokenHash = hashToken(refreshToken);
  session.expiresAt = calculateExpiryDate(REFRESH_TOKEN_TTL_MS);
  session.revokedAt = undefined;
  await session.save();
  return { session, refreshToken };
};

const revokeSession = async (session: SessionDocument): Promise<void> => {
  if (!session.revokedAt) {
    session.revokedAt = new Date();
    await session.save();
  }
};

const createUserToken = async (params: {
  userId: mongoose.Types.ObjectId;
  type: TokenType;
  ttlMs: number;
  metadata?: Record<string, unknown>;
}): Promise<{ token: string; tokenDoc: TokenDocument }> => {
  const token = generateSecureToken(48);
  const tokenDoc = await Token.create({
    user: params.userId,
    type: params.type,
    tokenHash: hashToken(token),
    metadata: params.metadata,
    expiresAt: calculateExpiryDate(params.ttlMs),
  });

  return { token, tokenDoc };
};

const invalidateExistingTokens = async (
  userId: mongoose.Types.ObjectId,
  type: TokenType
): Promise<void> => {
  await Token.updateMany(
    {
      user: userId,
      type,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } }
  );
};

const findActiveTokenByValue = async (
  token: string,
  type: TokenType
): Promise<TokenDocument | null> => {
  const tokenHash = hashToken(normalizeHexToken(token));
  const tokenDoc = await Token.findOne({ tokenHash, type });
  if (!tokenDoc || !tokenDoc.isActive()) {
    return null;
  }
  return tokenDoc;
};

const consumeToken = async (tokenDoc: TokenDocument): Promise<void> => {
  tokenDoc.consumedAt = new Date();
  await tokenDoc.save();
};

const sendEmailVerificationMessage = async (
  user: UserDocument,
  token: string
): Promise<void> => {
  const verificationLink = buildUrlWithToken('/verify-email', token);
  try {
    await sendEmailVerification(user.email, verificationLink);
  } catch (error) {
    console.error('Email verification send error:', error);
  }
};

const sendPasswordResetMessage = async (
  user: UserDocument,
  token: string
): Promise<void> => {
  const resetLink = buildUrlWithToken('/reset-password', token);
  try {
    await sendPasswordReset(user.email, resetLink);
  } catch (error) {
    console.error('Password reset email error:', error);
  }
};

const findOrCreateUserFromGoogle = async (
  profile: GoogleProfile,
  role?: 'graduate' | 'company' | 'admin'
): Promise<UserDocument> => {
  const defaultRole = 'graduate';
  const resolvedRole = role ?? defaultRole;

  let user = await User.findOne({ email: profile.email });

  if (!user) {
    // generate random password (schema requires it)
    const randomPassword = generateSecureToken(32);
    const hashed = await bcrypt.hash(randomPassword, 10);

    user = new User({
      email: profile.email,
      password: hashed,
      role: resolvedRole,
      emailVerified: !!profile.emailVerified,
      emailVerifiedAt: profile.emailVerified ? new Date() : undefined,
    });

    await user.save();
  } else {
    let updated = false;

    // update email verification if Google confirms it
    if (!user.emailVerified && profile.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      updated = true;
    }

    // do NOT update existing role — safer
    // if you want to allow role updates, you could add logic here

    if (updated) {
      await user.save();
    }
  }

  return user;
};

const validateCompanyEmailForGoogle = async (
  email: string,
  companyWebsite?: string
): Promise<{ ok: boolean; reason?: string }> => {
  return await isLikelyCompanyEmail({
    email,
    companyWebsite,
    requireMx: true,
  });
};

/**
 * Register a new user (graduate, company, or admin)
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    const email = normalizeEmailInput(req.body?.email);
    const password = normalizePasswordInput(req.body?.password);

    if (!email || !password || !role) {
      res
        .status(400)
        .json({ message: 'Email, password, and role are required' });
      return;
    }

    if (role === 'company') {
      const companyWebsite = req.body.companyWebsite;
      // In test environment, skip MX record check
      const isTestEnv = process.env.NODE_ENV === 'test';
      const check = await isLikelyCompanyEmail({
        email,
        companyWebsite,
        requireMx: !isTestEnv, // Skip MX check in tests
      });
      if (!check.ok) {
        res.status(400).json({
          message: 'Please sign up with a company email address.',
          reason: check.reason,
        });
        return;
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      role,
    });

    await user.save();

    const { session, refreshToken } = await createSession({
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    await invalidateExistingTokens(user._id, TOKEN_TYPES.EMAIL_VERIFICATION);

    const { token: verificationToken } = await createUserToken({
      userId: user._id,
      type: TOKEN_TYPES.EMAIL_VERIFICATION,
      ttlMs: EMAIL_VERIFICATION_TTL_MS,
      metadata: { reason: 'registration' },
    });

    await sendEmailVerificationMessage(user, verificationToken);

    res
      .status(201)
      .json(
        buildAuthPayload(
          user,
          session,
          refreshToken,
          'User registered successfully'
        )
      );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmailInput(req.body?.email);
    const password = normalizePasswordInput(req.body?.password);

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { session, refreshToken } = await createSession({
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    res.json(buildAuthPayload(user, session, refreshToken, 'Login successful'));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!isValidHexToken(refreshToken, 128)) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    const normalizedRefreshToken = normalizeHexToken(refreshToken);
    const refreshTokenHash = hashToken(normalizedRefreshToken);
    const session = await Session.findOne({ refreshTokenHash });

    if (!session || !session.isActive()) {
      res.status(401).json({ message: 'Invalid or expired refresh token' });
      return;
    }

    const user = await User.findById(session.user);
    if (!user) {
      await revokeSession(session);
      res.status(401).json({ message: 'Invalid session' });
      return;
    }

    const rotationResult = await rotateSessionToken(session);

    res.json(
      buildAuthPayload(
        user,
        rotationResult.session,
        rotationResult.refreshToken,
        'Token refreshed'
      )
    );
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Logout current session
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const session = await Session.findById(req.user.sessionId);
    if (!session) {
      res.status(200).json({ message: 'Logged out successfully' });
      return;
    }

    if (!session.user.equals(req.user.userId)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await revokeSession(session);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Logout all sessions for the current user
 * POST /api/auth/logout-all
 */
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await Session.updateMany(
      {
        user: req.user.userId,
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } }
    );

    res.json({ message: 'All sessions revoked' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get active sessions for the current user
 * GET /api/auth/sessions
 */
export const getSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const sessions = await Session.find({
      user: req.user.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      sessions: sessions.map((sessionDoc) => ({
        id: sessionDoc._id.toString(),
        createdAt: sessionDoc.createdAt,
        expiresAt: sessionDoc.expiresAt,
        ipAddress: sessionDoc.ipAddress,
        userAgent: sessionDoc.userAgent,
        revokedAt: sessionDoc.revokedAt,
        isActive:
          !sessionDoc.revokedAt && sessionDoc.expiresAt.getTime() > Date.now(),
      })),
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Revoke a specific session by ID
 * DELETE /api/auth/sessions/:sessionId
 */
export const revokeSessionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { sessionId } = req.params;
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      res.status(400).json({ message: 'Invalid session id' });
      return;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    if (!session.user.equals(req.user.userId)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await revokeSession(session);

    const isCurrentSession = session.id === req.user.sessionId;

    res.json({
      message: 'Session revoked',
      currentSessionRevoked: isCurrentSession,
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Request a fresh email verification link
 * POST /api/auth/request-email-verification
 */
export const requestEmailVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.emailVerified) {
      res.json({ message: 'Email already verified' });
      return;
    }

    await invalidateExistingTokens(user._id, TOKEN_TYPES.EMAIL_VERIFICATION);

    const { token } = await createUserToken({
      userId: user._id,
      type: TOKEN_TYPES.EMAIL_VERIFICATION,
      ttlMs: EMAIL_VERIFICATION_TTL_MS,
      metadata: { reason: 'resend-verification', requestedBy: req.user.userId },
    });

    await sendEmailVerificationMessage(user, token);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Request email verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify email via token
 * POST /api/auth/verify-email
 */
export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.body;
    if (!isValidHexToken(token, USER_TOKEN_HEX_LENGTH)) {
      res.status(400).json({ message: 'Verification token is required' });
      return;
    }

    const normalizedToken = normalizeHexToken(token);
    const tokenDoc = await findActiveTokenByValue(
      normalizedToken,
      TOKEN_TYPES.EMAIL_VERIFICATION
    );
    if (!tokenDoc) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    const user = await User.findById(tokenDoc.user);
    if (!user) {
      await consumeToken(tokenDoc);
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    await consumeToken(tokenDoc);
    await invalidateExistingTokens(user._id, TOKEN_TYPES.EMAIL_VERIFICATION);

    // Create a session and auto-login the user after email verification
    // This provides better UX - users don't need to login again after verifying
    const { session, refreshToken } = await createSession({
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    res.json(
      buildAuthPayload(
        user,
        session,
        refreshToken,
        'Email verified successfully'
      )
    );
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Request password reset email
 * POST /api/auth/request-password-reset
 */
export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const email = normalizeEmailInput(req.body?.email);
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const user = await User.findOne({ email });
    if (user) {
      await invalidateExistingTokens(user._id, TOKEN_TYPES.PASSWORD_RESET);

      const { token } = await createUserToken({
        userId: user._id,
        type: TOKEN_TYPES.PASSWORD_RESET,
        ttlMs: PASSWORD_RESET_TTL_MS,
        metadata: { requestedIp: req.ip },
      });

      await sendPasswordResetMessage(user, token);
    }

    // Always respond with success to avoid leaking user existence
    res.json({
      message:
        'If an account exists for this email, a password reset link has been sent',
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reset password via token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.body as { token?: unknown };
    const password = normalizePasswordInput(req.body?.password);

    if (!isValidHexToken(token, USER_TOKEN_HEX_LENGTH)) {
      res.status(400).json({ message: 'Reset token is required' });
      return;
    }

    if (!password || password.trim().length < 8) {
      res.status(400).json({
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    const normalizedToken = normalizeHexToken(token);
    const tokenDoc = await findActiveTokenByValue(
      normalizedToken,
      TOKEN_TYPES.PASSWORD_RESET
    );
    if (!tokenDoc) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    const user = await User.findById(tokenDoc.user);
    if (!user) {
      await consumeToken(tokenDoc);
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    await consumeToken(tokenDoc);

    // Invalidate any other password reset tokens and active sessions
    await invalidateExistingTokens(user._id, TOKEN_TYPES.PASSWORD_RESET);
    await Session.updateMany(
      { user: user._id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Change password for authenticated user
 * POST /api/auth/change-password
 */
export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const oldPassword = normalizePasswordInput(req.body?.oldPassword);
    const newPassword = normalizePasswordInput(req.body?.newPassword);

    if (!oldPassword || !newPassword) {
      res.status(400).json({
        message: 'Old password and new password are required',
      });
      return;
    }

    if (newPassword.trim().length < 8) {
      res.status(400).json({
        message: 'New password must be at least 8 characters long',
      });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      res.status(400).json({
        message: 'New password must be different from current password',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const googleSignIn = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { idToken, role, companyWebsite } = req.body;
    if (typeof idToken !== 'string' || !idToken.trim()) {
      res.status(400).json({ message: 'idToken is required' });
      return;
    }

    // Verify idToken
    const ticket = await googleClientForVerify.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID || undefined,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ message: 'Invalid Google token payload' });
      return;
    }

    // Validate company email if role is 'company'
    if (role === 'company') {
      const validation = await validateCompanyEmailForGoogle(
        payload.email,
        companyWebsite
      );
      if (!validation.ok) {
        res.status(400).json({
          message: 'Please sign in with a company email address.',
          reason: validation.reason,
        });
        return;
      }
    }

    const profile: GoogleProfile = {
      email: payload.email,
      emailVerified: !!payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      givenName: payload.given_name,
      familyName: payload.family_name,
    };

    const user = await findOrCreateUserFromGoogle(profile, role);

    // create a session
    const { session, refreshToken } = await createSession({
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    await invalidateExistingTokens(user._id, TOKEN_TYPES.EMAIL_VERIFICATION);

    res.json(
      buildAuthPayload(user, session, refreshToken, 'Signed in with Google')
    );
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const googleAuthCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code, role, companyWebsite } = req.body;

    if (typeof code !== 'string' || !code.trim()) {
      res.status(400).json({ message: 'Authorization code is required' });
      return;
    }

    const authCodeClient = new OAuth2Client({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    });

    const { tokens } = await authCodeClient.getToken({
      code,
      redirect_uri: 'postmessage',
    });

    if (!tokens.id_token) {
      res.status(400).json({ message: 'Missing id_token from Google' });
      return;
    }

    const ticket = await googleClientForVerify.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID || undefined,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ message: 'Invalid Google token payload' });
      return;
    }

    if (role === 'company') {
      const validation = await validateCompanyEmailForGoogle(
        payload.email,
        companyWebsite
      );
      if (!validation.ok) {
        res.status(400).json({
          message: 'Please sign in with an organization email address.',
          reason: validation.reason,
        });
        return;
      }
    }

    const profile: GoogleProfile = {
      email: payload.email,
      emailVerified: !!payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      givenName: payload.given_name,
      familyName: payload.family_name,
    };

    const user = await findOrCreateUserFromGoogle(profile, role);

    const { session, refreshToken } = await createSession({
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    await invalidateExistingTokens(user._id, TOKEN_TYPES.EMAIL_VERIFICATION);

    res.json(
      buildAuthPayload(user, session, refreshToken, 'Signed in with Google')
    );
  } catch (error) {
    console.error('Google auth-code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGoogleAuthUrl = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const url = googleClientForServerFlow.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['openid', 'email', 'profile'],
    });

    res.json({ url });
  } catch (error) {
    console.error('Get Google auth url error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const googleOAuthCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      res.status(400).json({ message: 'Missing code parameter' });
      return;
    }

    // Exchange code for tokens
    const tokenResponse = await googleClientForServerFlow.getToken(code);
    const tokens = tokenResponse.tokens;

    const idToken = tokens.id_token;
    if (!idToken) {
      res.status(400).json({ message: 'Missing id_token from Google' });
      return;
    }

    const ticket = await googleClientForVerify.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID || undefined,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ message: 'Invalid Google token payload' });
      return;
    }

    const profile: GoogleProfile = {
      email: payload.email,
      emailVerified: !!payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      givenName: payload.given_name,
      familyName: payload.family_name,
    };

    const defaultRole = 'graduate';
    const user = await findOrCreateUserFromGoogle(profile, defaultRole);

    const { refreshToken } = await createSession({
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    const refreshCookieOptions: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/',
    };
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieOptions);

    const redirectTo = `${CLIENT_BASE_URL.replace(/\/+$/, '')}/auth/google/success`;

    // Optionally: set cookie with refresh token here instead of query param.
    res.redirect(redirectTo);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
