import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const parseBoolean = (
  value: string | undefined,
  defaultValue: boolean
): boolean => {
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

const parseTrustProxy = (
  value: string | undefined
): boolean | string | number => {
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

// Provide a development default (at least 32 characters) only in non-production environments
// In production, this must be set via environment variable for security
const getJwtSecret = (): string => {
  if (jwtSecretFromEnv) {
    // Trim whitespace (including newlines that might be in GitHub secrets)
    const trimmedSecret = jwtSecretFromEnv.trim();
    if (trimmedSecret.length < 32) {
      throw new Error(
        `JWT_ACCESS_SECRET must be at least 32 characters long for security. Current length: ${trimmedSecret.length} (original: ${jwtSecretFromEnv.length}). Please set a longer secret in your environment variables.`
      );
    }
    return trimmedSecret;
  }

  // Only allow default in development/test environments
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'prod'
  ) {
    const defaultSecret = 'dev-jwt-secret-key-min-32-chars-required!!';
    console.warn(
      '[Security] JWT_ACCESS_SECRET not set. Using development default. This should NEVER be used in production!'
    );
    return defaultSecret;
  }

  // Production: fail early with clear error
  throw new Error(
    'JWT_ACCESS_SECRET (or JWT_SECRET/ACCESS_TOKEN_SECRET) environment variable is required and must be at least 32 characters long. Please set this in your environment variables.'
  );
};

const parsePositiveIntOrUndefined = (
  value: string | undefined
): number | undefined => {
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
    .min(
      32,
      'JWT access secret must be at least 32 characters long for security'
    ),
  enforceHttps: z.boolean(),
  trustProxy: z.union([z.boolean(), z.string(), z.number()]),
});

const parsedConfig = configSchema.parse({
  jwtAccessSecret: getJwtSecret(),
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

  requestTimeoutMs: z.number().int().positive().default(60000), // Increased default to 60 seconds for OpenAI API calls
  maxRetries: z.number().int().min(0).max(5).default(2),
  initialBackoffMs: z.number().int().min(0).default(200),
  backoffMultiplier: z.number().positive().default(2),
  maxBackoffMs: z.number().int().positive().default(2000),
  cacheTtlMs: z
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
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

const timeoutValue = parseMsEnv(process.env.AI_SERVICE_TIMEOUT_MS, 60000);
console.log(
  `[Config] AI_SERVICE_TIMEOUT_MS env: ${process.env.AI_SERVICE_TIMEOUT_MS}, parsed: ${timeoutValue}ms`
);

const parsedAiConfig = aiConfigSchema.parse({
  serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  requestTimeoutMs: timeoutValue, // Increased to 60 seconds for OpenAI API calls
  maxRetries:
    parsePositiveIntOrUndefined(process.env.AI_SERVICE_MAX_RETRIES) ?? 2,

  initialBackoffMs: parseMsEnv(process.env.AI_SERVICE_RETRY_DELAY_MS, 200),
  backoffMultiplier:
    Number.parseFloat(process.env.AI_SERVICE_RETRY_MULTIPLIER || '') || 2,
  maxBackoffMs: parseMsEnv(process.env.AI_SERVICE_MAX_BACKOFF_MS, 2000),
  cacheTtlMs: parseMsEnv(process.env.AI_SERVICE_CACHE_TTL_MS, 15 * 60 * 1000),
  cacheMaxEntries:
    parsePositiveIntOrUndefined(process.env.AI_SERVICE_CACHE_MAX_ENTRIES) ??
    500,
  rateLimit: {
    maxConcurrent:
      parsePositiveIntOrUndefined(
        process.env.AI_SERVICE_RATE_LIMIT_MAX_CONCURRENCY
      ) ?? 3,
    requestsPerInterval:
      parsePositiveIntOrUndefined(
        process.env.AI_SERVICE_RATE_LIMIT_REQUESTS_PER_INTERVAL
      ) ?? 60,
    intervalMs: parseMsEnv(
      process.env.AI_SERVICE_RATE_LIMIT_INTERVAL_MS,
      60_000
    ),
  },
  metricsEnabled: parseBoolean(process.env.AI_SERVICE_METRICS_ENABLED, true),
  match: {
    batchSize:
      parsePositiveIntOrUndefined(process.env.AI_MATCH_BATCH_SIZE) ?? 10,
    maxJobs: parsePositiveIntOrUndefined(process.env.AI_MATCH_MAX_JOBS) ?? 50,
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

// Email Configuration
const emailConfigSchema = z.object({
  enabled: z.boolean().default(true),
  provider: z.enum(['smtp', 'console']).default('smtp'),
  smtp: z.object({
    host: z.string().default('smtp.gmail.com'),
    port: z.number().int().positive().default(587),
    secure: z.boolean().default(false), // true for 465, false for other ports
    auth: z.object({
      user: z.string().email('SMTP user must be a valid email'),
      pass: z.string().min(1, 'SMTP password is required'),
    }),
  }),
  from: z.object({
    name: z.string().default('Talent Hub'),
    email: z.string().email('From email must be valid'),
  }),
  retry: z.object({
    maxAttempts: z.number().int().min(1).max(5).default(3),
    delayMs: z.number().int().positive().default(1000),
  }),
  timeoutMs: z.number().int().positive().default(10000),
});

const parseEmailConfig = () => {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp') as 'smtp' | 'console';
  const enabled = parseBoolean(process.env.EMAIL_ENABLED, true);

  // If disabled or using console, return minimal config
  if (!enabled || provider === 'console') {
    return {
      enabled: false,
      provider: 'console' as const,
      smtp: {
        host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: '',
        },
      },
      from: {
        name: 'Talent Hub',
        email: process.env.EMAIL_FROM || 'noreply@talenthub.com',
      },
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
      },
      timeoutMs: 10000,
    };
  }

  // Validate SMTP configuration
  const smtpUser = process.env.EMAIL_USER;
  const smtpPass = process.env.EMAIL_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn(
      '[Email Config] SMTP credentials not found. Falling back to console mode.'
    );
    return {
      enabled: false,
      provider: 'console' as const,
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: '',
        },
      },
      from: {
        name: 'Talent Hub',
        email: process.env.EMAIL_FROM || smtpUser || 'noreply@talenthub.com',
      },
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
      },
      timeoutMs: 10000,
    };
  }

  const parsed = emailConfigSchema.parse({
    enabled: true,
    provider: 'smtp',
    smtp: {
      host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
      port: parsePositiveIntOrUndefined(process.env.EMAIL_SMTP_PORT) ?? 587,
      secure: parseBoolean(process.env.EMAIL_SMTP_SECURE, false),
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Talent Hub',
      email: process.env.EMAIL_FROM || smtpUser,
    },
    retry: {
      maxAttempts:
        parsePositiveIntOrUndefined(process.env.EMAIL_RETRY_MAX_ATTEMPTS) ?? 3,
      delayMs: parseMsEnv(process.env.EMAIL_RETRY_DELAY_MS, 1000),
    },
    timeoutMs: parseMsEnv(process.env.EMAIL_TIMEOUT_MS, 10000),
  });

  return parsed;
};

export const emailConfig = parseEmailConfig();
