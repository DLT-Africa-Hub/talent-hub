import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const parseTrustProxy = (value: string | undefined): boolean | string | number => {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  const parsedNumber = Number(value);
  if (!Number.isNaN(parsedNumber)) {
    return parsedNumber;
  }

  return value;
};

const jwtSecretFromEnv =
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET ||
  process.env.ACCESS_TOKEN_SECRET;

const parsePositiveIntOrUndefined = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const configSchema = z.object({
  jwtAccessSecret: z
    .string({
      required_error:
        'JWT_ACCESS_SECRET (or JWT_SECRET/ACCESS_TOKEN_SECRET) environment variable is required',
    })
    .min(32, 'JWT access secret must be at least 32 characters long for security'),
  enforceHttps: z.boolean(),
  trustProxy: z.union([z.boolean(), z.string(), z.number()]),
});

const parsedConfig = configSchema.parse({
  jwtAccessSecret: jwtSecretFromEnv,
  enforceHttps: parseBoolean(
    process.env.ENFORCE_HTTPS,
    process.env.NODE_ENV === 'production'
  ),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
});

export const securityConfig = {
  jwt: {
    accessSecret: parsedConfig.jwtAccessSecret,
  },
  https: {
    enforce: parsedConfig.enforceHttps,
    trustProxy: parsedConfig.trustProxy,
  },
};

const aiConfigSchema = z.object({
  serviceUrl: z
    .string()
    .url('AI_SERVICE_URL must be a valid URL')
    .default('http://localhost:8000'),
  requestTimeoutMs: z
    .number()
    .int()
    .positive()
    .default(5000),
  maxRetries: z.number().int().min(0).max(5).default(2),
  initialBackoffMs: z.number().int().min(0).default(200),
  backoffMultiplier: z.number().positive().default(2),
  maxBackoffMs: z.number().int().positive().default(2000),
  cacheTtlMs: z.number().int().positive().default(15 * 60 * 1000),
  cacheMaxEntries: z.number().int().positive().default(500),
  rateLimit: z.object({
    maxConcurrent: z.number().int().positive().default(3),
    requestsPerInterval: z.number().int().positive().default(60),
    intervalMs: z.number().int().positive().default(60_000),
  }),
  metricsEnabled: z.boolean().default(true),
  match: z.object({
    batchSize: z.number().int().positive().default(10),
    maxJobs: z.number().int().positive().default(50),
    maxGraduates: z.number().int().positive().default(50),
    minScore: z.number().min(0).max(1).default(0.6),
    maxResults: z.number().int().positive().default(20),
  }),
});

const parseMsEnv = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parsedAiConfig = aiConfigSchema.parse({
  serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  requestTimeoutMs: parseMsEnv(process.env.AI_SERVICE_TIMEOUT_MS, 5000),
  maxRetries: parsePositiveIntOrUndefined(process.env.AI_SERVICE_MAX_RETRIES) ?? 2,
  initialBackoffMs: parseMsEnv(process.env.AI_SERVICE_RETRY_DELAY_MS, 200),
  backoffMultiplier:
    Number.parseFloat(process.env.AI_SERVICE_RETRY_MULTIPLIER || '') || 2,
  maxBackoffMs: parseMsEnv(process.env.AI_SERVICE_MAX_BACKOFF_MS, 2000),
  cacheTtlMs: parseMsEnv(process.env.AI_SERVICE_CACHE_TTL_MS, 15 * 60 * 1000),
  cacheMaxEntries:
    parsePositiveIntOrUndefined(process.env.AI_SERVICE_CACHE_MAX_ENTRIES) ?? 500,
  rateLimit: {
    maxConcurrent:
      parsePositiveIntOrUndefined(process.env.AI_SERVICE_RATE_LIMIT_MAX_CONCURRENCY) ?? 3,
    requestsPerInterval:
      parsePositiveIntOrUndefined(process.env.AI_SERVICE_RATE_LIMIT_REQUESTS_PER_INTERVAL) ?? 60,
    intervalMs: parseMsEnv(process.env.AI_SERVICE_RATE_LIMIT_INTERVAL_MS, 60_000),
  },
  metricsEnabled: parseBoolean(process.env.AI_SERVICE_METRICS_ENABLED, true),
  match: {
    batchSize:
      parsePositiveIntOrUndefined(process.env.AI_MATCH_BATCH_SIZE) ?? 10,
    maxJobs:
      parsePositiveIntOrUndefined(process.env.AI_MATCH_MAX_JOBS) ?? 50,
    maxGraduates:
      parsePositiveIntOrUndefined(process.env.AI_MATCH_MAX_GRADUATES) ?? 50,
    minScore: (() => {
      if (process.env.AI_MATCH_MIN_SCORE === undefined) {
        return undefined;
      }

      const parsed = Number.parseFloat(process.env.AI_MATCH_MIN_SCORE);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
        return undefined;
      }
      return parsed;
    })(),
    maxResults:
      parsePositiveIntOrUndefined(process.env.AI_MATCH_MAX_RESULTS) ?? 20,
  },
});

export const aiConfig = {
  serviceUrl: parsedAiConfig.serviceUrl,
  requestTimeoutMs: parsedAiConfig.requestTimeoutMs,
  retries: {
    maxAttempts: parsedAiConfig.maxRetries + 1,
    initialBackoffMs: parsedAiConfig.initialBackoffMs,
    backoffMultiplier: parsedAiConfig.backoffMultiplier,
    maxBackoffMs: parsedAiConfig.maxBackoffMs,
  },
  cache: {
    ttlMs: parsedAiConfig.cacheTtlMs,
    maxEntries: parsedAiConfig.cacheMaxEntries,
  },
  rateLimit: {
    maxConcurrent: parsedAiConfig.rateLimit.maxConcurrent,
    requestsPerInterval: parsedAiConfig.rateLimit.requestsPerInterval,
    intervalMs: parsedAiConfig.rateLimit.intervalMs,
  },
  metrics: {
    enabled: parsedAiConfig.metricsEnabled,
  },
  match: {
    batchSize: parsedAiConfig.match.batchSize,
    maxJobs: parsedAiConfig.match.maxJobs,
    maxGraduates: parsedAiConfig.match.maxGraduates,
    minScore: parsedAiConfig.match.minScore,
    maxResults: parsedAiConfig.match.maxResults,
  },
};

