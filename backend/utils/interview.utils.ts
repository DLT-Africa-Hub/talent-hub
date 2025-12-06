import crypto from 'crypto';

const CLIENT_BASE_URL =
  process.env.CLIENT_URL ||
  process.env.APP_URL ||
  process.env.FRONTEND_URL ||
  'http://localhost:5174';

export const generateInterviewSlug = (): string =>
  crypto.randomBytes(6).toString('hex');

export const buildInterviewRoomUrl = (slug: string): string => {
  const trimmedBase = CLIENT_BASE_URL.replace(/\/+$/, '');
  return `${trimmedBase}/interviews/${slug}`;
};
