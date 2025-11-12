import axios, { AxiosError } from 'axios';
import { aiConfig } from '../config/secrets';
import { hashToken } from '../utils/security.utils';
import { TTLCache } from '../utils/cache.utils';

export interface EmbedResponse {
  embedding: number[];
}

export interface MatchResponse {
  matches: Array<{
    id: string;
    score: number;
  }>;
}

export interface FeedbackResponse {
  feedback: string;
  skillGaps: string[];
  recommendations: string[];
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
  private readonly http = axios.create({
    baseURL: aiConfig.serviceUrl,
    timeout: aiConfig.requestTimeoutMs,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  async fetchEmbedding(text: string): Promise<number[]> {
    const response = await this.post<EmbedResponse>('/embed', { text });
    return response.embedding;
  }

  async findMatches(
    graduateEmbedding: number[],
    jobEmbeddings: Array<{ id: string; embedding: number[] }>
  ): Promise<MatchResponse> {
    return this.post<MatchResponse>('/match', {
      graduate_embedding: graduateEmbedding,
      job_embeddings: jobEmbeddings,
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
    }
  ): Promise<FeedbackResponse> {
    return this.post<FeedbackResponse>('/feedback', {
      graduate_profile: graduateProfile,
      job_requirements: jobRequirements,
    });
  }

  private async post<T>(path: string, data: unknown, attempt = 1): Promise<T> {
    try {
      const response = await this.http.post<T>(path, data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (this.shouldRetry(axiosError) && attempt < aiConfig.retries.maxAttempts) {
        const backoff = Math.min(
          aiConfig.retries.initialBackoffMs *
            aiConfig.retries.backoffMultiplier ** (attempt - 1),
          aiConfig.retries.maxBackoffMs
        );
        await delay(backoff);
        return this.post<T>(path, data, attempt + 1);
      }

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
    if (status === 400) {
      return new AIServiceError('AI service rejected the request payload.', 400, {
        cause: error,
      });
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

export async function generateProfileEmbedding(text: string): Promise<number[]> {
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
    throw new AIServiceError('Cannot generate embedding for empty job description.', 400);
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
  }
): Promise<FeedbackResponse> {
  const cacheKey = createCacheKey(
    'feedback',
    JSON.stringify({ graduateProfile, jobRequirements })
  );

  const cached = feedbackCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const feedback = await aiClient.generateFeedback(graduateProfile, jobRequirements);
  feedbackCache.set(cacheKey, feedback);
  return feedback;
}

export async function findMatches(
  graduateEmbedding: number[],
  jobEmbeddings: Array<{ id: string; embedding: number[] }>
): Promise<MatchResponse> {
  return aiClient.findMatches(graduateEmbedding, jobEmbeddings);
}

export const aiService = aiClient;

