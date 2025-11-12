import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        sessionId: string;
      };
      csrfToken?: () => string;
    }
    interface Response {
      success: (data: unknown, meta?: Record<string, unknown>) => void;
      fail: (message: string, status?: number) => void;
    }
    interface Locals {
      csrfToken?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    }
  }
}

export {};

