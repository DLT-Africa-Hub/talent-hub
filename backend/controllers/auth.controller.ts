import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User, { UserDocument } from '../models/User.model';
import Session, { SessionDocument } from '../models/Session.model';
import Token, {
  TOKEN_TYPES,
  TokenDocument,
  TokenType,
} from '../models/Token.model';
import { sendEmail } from '../services/email.service';
import { generateAccessToken } from '../utils/jwt.utils';
import {
  calculateExpiryDate,
  generateSecureToken,
  hashToken,
} from '../utils/security.utils';

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
  process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:5173';

const buildUrlWithToken = (path: string, token: string): string => {
  const trimmedBase = CLIENT_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}?token=${token}`;
};

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
  const tokenHash = hashToken(token);
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
  const text = [
    'Welcome to Talent Hub!',
    '',
    'Please verify your email address to activate your account.',
    `Verification link: ${verificationLink}`,
    '',
    'If you did not create this account, you can ignore this email.',
  ].join('\n');

  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify your Talent Hub email',
      text,
    });
  } catch (error) {
    console.error('Email verification send error:', error);
  }
};

const sendPasswordResetMessage = async (
  user: UserDocument,
  token: string
): Promise<void> => {
  const resetLink = buildUrlWithToken('/reset-password', token);
  const text = [
    'We received a request to reset your Talent Hub password.',
    '',
    'You can reset your password using the link below:',
    resetLink,
    '',
    'If you did not request a password reset, you can ignore this email.',
  ].join('\n');

  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your Talent Hub password',
      text,
    });
  } catch (error) {
    console.error('Password reset email error:', error);
  }
};

/**
 * Register a new user (graduate, company, or admin)
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      res.status(400).json({ message: 'Email, password, and role are required' });
      return;
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

    res.status(201).json(
      buildAuthPayload(user, session, refreshToken, 'User registered successfully')
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
    const { email, password } = req.body;

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
    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    const refreshTokenHash = hashToken(refreshToken);
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
export const getSessions = async (req: Request, res: Response): Promise<void> => {
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
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ message: 'Verification token is required' });
      return;
    }

    const tokenDoc = await findActiveTokenByValue(
      token,
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

    res.json({ message: 'Email verified successfully' });
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
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
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
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body as {
      token?: string;
      password?: string;
    };

    if (!token || typeof token !== 'string') {
      res.status(400).json({ message: 'Reset token is required' });
      return;
    }

    if (!password || typeof password !== 'string' || password.trim().length < 8) {
      res.status(400).json({
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    const tokenDoc = await findActiveTokenByValue(token, TOKEN_TYPES.PASSWORD_RESET);
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

