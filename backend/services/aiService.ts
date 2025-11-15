import axios, { AxiosError, AxiosResponse } from 'axios';
import http from 'http';
import https from 'https';
import { aiConfig } from '../config/secrets';
import { hashToken } from '../utils/security.utils';
import { TTLCache } from '../utils/cache.utils';

export interface EmbedResponse {
  embedding: number[];
}

export interface MatchFactors {
  embedding: number;
  skills: number;
  education: number;
  experience: number;
  freshness: number;
}

export interface MatchItem {
  id: string;
  score: number;
  factors?: MatchFactors;
}

export interface MatchResponse {
  matches: MatchItem[];
}

export interface GraduateMatchMetadata {
  skills?: string[];
  education?: string;
  experienceYears?: number;
  latestExperienceYear?: number;
}

export interface MatchJobMetadata {
  skills?: string[];
  education?: string;
  experienceYears?: number;
  updatedAt?: string;
}

export interface MatchJobEmbedding {
  id: string;
  embedding: number[];
  metadata?: MatchJobMetadata;
}

export interface MatchWeights {
  embedding?: number;
  skills?: number;
  education?: number;
  experience?: number;
  freshness?: number;
}

export interface MatchOptions {
  minScore?: number;
  limit?: number;
  weights?: MatchWeights;
}

export interface MatchBatchResult {
  graduateId?: string;
  matches: MatchItem[];
}

export interface MatchBatchResponse {
  results: MatchBatchResult[];
}

interface MatchRequestPayload {
  graduateEmbedding: number[];
  jobEmbeddings: MatchJobEmbedding[];
  graduateMetadata?: GraduateMatchMetadata;
  options?: MatchOptions;
}

interface MatchBatchRequestPayload {
  graduates: Array<{
    id?: string;
    embedding: number[];
    metadata?: GraduateMatchMetadata;
  }>;
  jobEmbeddings: MatchJobEmbedding[];
  options?: MatchOptions;
}

type RequestMetricState = {
  total: number;
  success: number;
  failure: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
  lastError?: string;
  lastUpdatedAt?: number;
};

class AIRequestScheduler {
  private active = 0;
  private tokens: number;
  private lastRefill = Date.now();
  private readonly queue: Array<() => void> = [];
  private refillTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly maxConcurrent: number,
    private readonly requestsPerInterval: number,
    private readonly intervalMs: number
  ) {
    this.tokens = requestsPerInterval;
  }

  private refillTokens(): void {
    const now = Date.now();
    if (now - this.lastRefill < this.intervalMs) {
      return;
    }

    const intervals = Math.floor((now - this.lastRefill) / this.intervalMs);
    if (intervals > 0) {
      this.tokens = this.requestsPerInterval;
      this.lastRefill += intervals * this.intervalMs;
    }
  }

  private scheduleRefill(): void {
    if (this.intervalMs <= 0 || this.refillTimeout) {
      return;
    }

    const delay = Math.max(this.intervalMs - (Date.now() - this.lastRefill), 0);
    this.refillTimeout = setTimeout(() => {
      this.refillTimeout = null;
      this.tryDispatch();
    }, delay);
  }

  private tryDispatch(): void {
    this.refillTokens();

    while (
      this.queue.length > 0 &&
      this.active < this.maxConcurrent &&
      this.tokens > 0
    ) {
      const resolve = this.queue.shift();
      if (!resolve) {
        continue;
      }

      this.active += 1;
      this.tokens -= 1;
      resolve();
    }

    if (this.queue.length > 0 && this.tokens === 0) {
      this.scheduleRefill();
    }
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    this.tryDispatch();
  }

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    await new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.tryDispatch();
    });

    try {
      return await task();
    } finally {
      this.release();
    }
  }
}

const metricsEnabled = aiConfig.metrics.enabled;
const requestMetrics: Record<string, RequestMetricState> = {};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch (jsonError) {
    return `Unknown error: ${String(jsonError)}`;
  }
};

function recordRequestMetric(
  path: string,
  success: boolean,
  durationMs: number,
  error?: unknown
): void {
  if (!metricsEnabled) {
    return;
  }

  const key = path.replace(/^\//, '') || 'unknown';
  const state: RequestMetricState =
    requestMetrics[key] ??
    (requestMetrics[key] = {
      total: 0,
      success: 0,
      failure: 0,
      totalLatencyMs: 0,
      maxLatencyMs: 0,
    });

  state.total += 1;
  state.totalLatencyMs += durationMs;
  state.maxLatencyMs = Math.max(state.maxLatencyMs, durationMs);
  state.lastUpdatedAt = Date.now();

  if (success) {
    state.success += 1;
  } else {
    state.failure += 1;
    state.lastError = toErrorMessage(error);
  }
}

export interface FeedbackResponse {
  feedback: string;
  skillGaps: string[];
  recommendations: string[];
}

export interface FeedbackOptions {
  language?: string;
  additionalContext?: string;
  templateOverrides?: Record<string, string>;
}

export interface AssessmentQuestion {
  question: string;
  options: string[];
  answer: string;
  skill?: string;
}

export interface AssessmentQuestionResponse {
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestionOptions {
  attempt?: number;
  numQuestions?: number;
  language?: string;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const createCacheKey = (prefix: string, payload: string): string =>
  `${prefix}:${hashToken(payload)}`;

export class AIServiceError extends Error {
  public readonly cause?: unknown;

  constructor(
    message: string,
    public readonly statusCode?: number,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.cause = options?.cause;
  }
}

class AIServiceClient {
  private readonly scheduler = new AIRequestScheduler(
    aiConfig.rateLimit.maxConcurrent,
    aiConfig.rateLimit.requestsPerInterval,
    aiConfig.rateLimit.intervalMs
  );

  private readonly httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: aiConfig.rateLimit.maxConcurrent * 4,
    timeout: aiConfig.requestTimeoutMs + 5000, // Add buffer for agent timeout
  });

  private readonly httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: aiConfig.rateLimit.maxConcurrent * 4,
    timeout: aiConfig.requestTimeoutMs + 5000, // Add buffer for agent timeout
  });

  private readonly http = axios.create({
    baseURL: aiConfig.serviceUrl,
    timeout: aiConfig.requestTimeoutMs,
    headers: {
      'Content-Type': 'application/json',
    },
    httpAgent: this.httpAgent,
    httpsAgent: this.httpsAgent,
  });

  constructor() {
    // Log the configured timeout for debugging
    console.log(`[AIServiceClient] Configured timeout: ${aiConfig.requestTimeoutMs}ms`);
  }

  async fetchEmbedding(text: string): Promise<number[]> {
    const response = await this.post<EmbedResponse>('/embed', { text });
    return response.embedding;
  }

  async findMatches(payload: MatchRequestPayload): Promise<MatchResponse> {
    return this.post<MatchResponse>('/match', {
      graduate_embedding: payload.graduateEmbedding,
      job_embeddings: payload.jobEmbeddings.map((job) => ({
        id: job.id,
        embedding: job.embedding,
        metadata: job.metadata
          ? {
              skills: job.metadata.skills,
              education: job.metadata.education,
              experience_years: job.metadata.experienceYears,
              updated_at: job.metadata.updatedAt,
            }
          : undefined,
      })),
      graduate_metadata: payload.graduateMetadata
        ? {
            skills: payload.graduateMetadata.skills,
            education: payload.graduateMetadata.education,
            experience_years: payload.graduateMetadata.experienceYears,
            latest_experience_year:
              payload.graduateMetadata.latestExperienceYear,
          }
        : undefined,
      options: payload.options
        ? {
            min_score: payload.options.minScore,
            limit: payload.options.limit,
            weights: payload.options.weights
              ? {
                  embedding: payload.options.weights.embedding,
                  skills: payload.options.weights.skills,
                  education: payload.options.weights.education,
                  experience: payload.options.weights.experience,
                  freshness: payload.options.weights.freshness,
                }
              : undefined,
          }
        : undefined,
    });
  }

  async findMatchesBatch(
    payload: MatchBatchRequestPayload
  ): Promise<MatchBatchResponse> {
    return this.post<MatchBatchResponse>('/match/batch', {
      graduates: payload.graduates.map((graduate) => ({
        id: graduate.id,
        embedding: graduate.embedding,
        metadata: graduate.metadata
          ? {
              skills: graduate.metadata.skills,
              education: graduate.metadata.education,
              experience_years: graduate.metadata.experienceYears,
              latest_experience_year: graduate.metadata.latestExperienceYear,
            }
          : undefined,
      })),
      job_embeddings: payload.jobEmbeddings.map((job) => ({
        id: job.id,
        embedding: job.embedding,
        metadata: job.metadata
          ? {
              skills: job.metadata.skills,
              education: job.metadata.education,
              experience_years: job.metadata.experienceYears,
              updated_at: job.metadata.updatedAt,
            }
          : undefined,
      })),
      options: payload.options
        ? {
            min_score: payload.options.minScore,
            limit: payload.options.limit,
            weights: payload.options.weights
              ? {
                  embedding: payload.options.weights.embedding,
                  skills: payload.options.weights.skills,
                  education: payload.options.weights.education,
                  experience: payload.options.weights.experience,
                  freshness: payload.options.weights.freshness,
                }
              : undefined,
          }
        : undefined,
    });
  }

  async generateFeedback(
    graduateProfile: {
      skills: string[];
      education: string;
      experience?: string;
    },
    jobRequirements: {
      skills: string[];
      education?: string;
      experience?: string;
    },
    options?: FeedbackOptions
  ): Promise<FeedbackResponse> {
    return this.post<FeedbackResponse>('/feedback', {
      graduate_profile: graduateProfile,
      job_requirements: jobRequirements,
      language: options?.language,
      additional_context: options?.additionalContext,
      template_overrides: options?.templateOverrides,
    });
  }

  async generateAssessmentQuestions(
    skills: string[],
    options?: AssessmentQuestionOptions
  ): Promise<AssessmentQuestionResponse> {
    return this.post<AssessmentQuestionResponse>('/assessment/questions', {
      skills,
      attempt: options?.attempt,
      num_questions: options?.numQuestions,
      language: options?.language,
    });
  }

  private async post<T>(path: string, data: unknown, attempt = 1): Promise<T> {
    const start = process.hrtime.bigint();
    try {
      const response = await this.scheduler.schedule<AxiosResponse<T>>(() =>
        this.http.post<T>(path, data)
      );
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      recordRequestMetric(path, true, durationMs);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

      if (
        this.shouldRetry(axiosError) &&
        attempt < aiConfig.retries.maxAttempts
      ) {
        const backoff = Math.min(
          aiConfig.retries.initialBackoffMs *
            aiConfig.retries.backoffMultiplier ** (attempt - 1),
          aiConfig.retries.maxBackoffMs
        );
        await delay(backoff);
        recordRequestMetric(path, false, durationMs, axiosError);
        return this.post<T>(path, data, attempt + 1);
      }

      recordRequestMetric(path, false, durationMs, axiosError);

      throw this.toAIServiceError(axiosError);
    }
  }

  private shouldRetry(error: AxiosError): boolean {
    if (error.code === 'ECONNABORTED') {
      return true;
    }

    if (!error.response) {
      return true;
    }

    const status = error.response.status;
    if (status >= 500) {
      return true;
    }

    return status === 429;
  }

  private toAIServiceError(error: AxiosError): AIServiceError {
    if (!error.response) {
      return new AIServiceError(
        'AI service is unavailable. Please try again later.',
        503,
        { cause: error }
      );
    }

    const status = error.response.status;
    const responseData = error.response.data as any;
    
    // FastAPI returns errors in 'detail' field, OpenAI errors may be in 'error.message'
    const errorMessage = 
      responseData?.detail || 
      responseData?.error?.message || 
      responseData?.message || 
      '';
    
    // Check for quota-related errors in the response
    const isQuotaError = 
      errorMessage.toLowerCase().includes('quota') ||
      errorMessage.toLowerCase().includes('insufficient_quota') ||
      responseData?.error?.code === 'insufficient_quota';
    
    if (status === 400) {
      if (isQuotaError) {
        return new AIServiceError(
          'OpenAI API quota has been exceeded. Please check your OpenAI account billing and quota limits.',
          402, // Payment Required
          {
            cause: error,
          }
        );
      }
      return new AIServiceError(
        errorMessage || 'AI service rejected the request payload.',
        400,
        {
          cause: error,
        }
      );
    }

    if (status === 401 || status === 403) {
      return new AIServiceError('AI service access is unauthorized.', status, {
        cause: error,
      });
    }

    if (status === 404) {
      return new AIServiceError('AI service endpoint was not found.', 502, {
        cause: error,
      });
    }

    if (status === 429) {
      return new AIServiceError(
        'AI service rate limit exceeded. Please retry shortly.',
        429,
        { cause: error }
      );
    }

    if (status >= 500) {
      return new AIServiceError('AI service encountered an error.', 503, {
        cause: error,
      });
    }

    return new AIServiceError('Unexpected AI service error.', status, {
      cause: error,
    });
  }
}

const aiClient = new AIServiceClient();

const profileEmbeddingCache = new TTLCache<string, number[]>(
  aiConfig.cache.ttlMs,
  aiConfig.cache.maxEntries
);
const jobEmbeddingCache = new TTLCache<string, number[]>(
  aiConfig.cache.ttlMs,
  aiConfig.cache.maxEntries
);
const feedbackCache = new TTLCache<string, FeedbackResponse>(
  aiConfig.cache.ttlMs,
  aiConfig.cache.maxEntries
);

const normalizeText = (value: string): string => value.trim();

export async function generateProfileEmbedding(
  text: string
): Promise<number[]> {
  const normalized = normalizeText(text);
  if (!normalized) {
    throw new AIServiceError('Cannot generate embedding for empty text.', 400);
  }

  const cacheKey = createCacheKey('profile', normalized);
  const cached = profileEmbeddingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const embedding = await aiClient.fetchEmbedding(normalized);
  profileEmbeddingCache.set(cacheKey, embedding);
  return embedding;
}

export async function generateJobEmbedding(text: string): Promise<number[]> {
  const normalized = normalizeText(text);
  if (!normalized) {
    throw new AIServiceError(
      'Cannot generate embedding for empty job description.',
      400
    );
  }

  const cacheKey = createCacheKey('job', normalized);
  const cached = jobEmbeddingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const embedding = await aiClient.fetchEmbedding(normalized);
  jobEmbeddingCache.set(cacheKey, embedding);
  return embedding;
}

export async function generateFeedback(
  graduateProfile: {
    skills: string[];
    education: string;
    experience?: string;
  },
  jobRequirements: {
    skills: string[];
    education?: string;
    experience?: string;
  },
  options?: FeedbackOptions
): Promise<FeedbackResponse> {
  const cacheKey = createCacheKey(
    'feedback',
    JSON.stringify({ graduateProfile, jobRequirements, options })
  );

  const cached = feedbackCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const feedback = await aiClient.generateFeedback(
    graduateProfile,
    jobRequirements,
    options
  );
  feedbackCache.set(cacheKey, feedback);
  return feedback;
}

export async function findMatches(
  graduateEmbedding: number[],
  jobEmbeddings: MatchJobEmbedding[],
  options?: {
    graduateMetadata?: GraduateMatchMetadata;
    matchOptions?: MatchOptions;
  }
): Promise<MatchResponse> {
  if (jobEmbeddings.length === 0) {
    return { matches: [] };
  }

  return aiClient.findMatches({
    graduateEmbedding,
    jobEmbeddings,
    graduateMetadata: options?.graduateMetadata,
    options: options?.matchOptions,
  });
}

export async function findMatchesBatch(
  graduates: MatchBatchRequestPayload['graduates'],
  jobEmbeddings: MatchJobEmbedding[],
  options?: MatchOptions
): Promise<MatchBatchResponse> {
  if (graduates.length === 0 || jobEmbeddings.length === 0) {
    return { results: [] };
  }

  return aiClient.findMatchesBatch({
    graduates,
    jobEmbeddings,
    options,
  });
}

export const aiService = aiClient;

export function getAIServiceMetrics(): Record<
  string,
  {
    total: number;
    success: number;
    failure: number;
    avgLatencyMs: number;
    maxLatencyMs: number;
    lastError?: string;
    lastUpdatedAt?: number;
  }
> {
  if (!metricsEnabled) {
    return {};
  }

  return Object.entries(requestMetrics).reduce(
    (acc, [key, state]) => {
      acc[key] = {
        total: state.total,
        success: state.success,
        failure: state.failure,
        avgLatencyMs:
          state.success > 0 ? state.totalLatencyMs / state.success : 0,
        maxLatencyMs: state.maxLatencyMs,
        lastError: state.lastError,
        lastUpdatedAt: state.lastUpdatedAt,
      };
      return acc;
    },
    {} as Record<
      string,
      {
        total: number;
        success: number;
        failure: number;
        avgLatencyMs: number;
        maxLatencyMs: number;
        lastError?: string;
        lastUpdatedAt?: number;
      }
    >
  );
}

export async function generateAssessmentQuestions(
  skills: string[],
  options?: AssessmentQuestionOptions
): Promise<AssessmentQuestion[]> {
  if (skills.length === 0) {
    throw new AIServiceError(
      'At least one skill is required to generate assessment questions.',
      400
    );
  }

  const response = await aiClient.generateAssessmentQuestions(skills, options);
  return response.questions;
}
