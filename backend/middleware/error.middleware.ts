import { NextFunction, Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const error = err as ErrorWithStatus;

  if (error.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  const status = error.status || error.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error('Unhandled error:', err);
  }

  res.status(status).json({
    success: false,
    message: isServerError
      ? 'Internal server error'
      : error.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' &&
      !isServerError && {
        stack: error.stack,
      }),
  });
};
