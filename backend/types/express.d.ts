import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        sessionId: string;
      };
    }
    interface Response {
      success: (data: unknown, meta?: Record<string, unknown>) => void;
      fail: (message: string, status?: number) => void;
    }
  }
}

export {};

