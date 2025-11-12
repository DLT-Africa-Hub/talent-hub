import { NextFunction, Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  const status = err.status || err.statusCode || 500;

  const isServerError = status >= 500;

  if (isServerError) {
    console.error('Unhandled error:', err);
  }

  res.status(status).json({
    success: false,
    message: isServerError ? 'Internal server error' : err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && !isServerError && {
      stack: err.stack,
    }),
  });
};


