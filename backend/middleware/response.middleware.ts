import { NextFunction, Request, Response } from 'express';

export const responseFormatter = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.success = (
    data: unknown,
    meta?: Record<string, unknown> | boolean | number | string | null
  ) => {
    const payload: Record<string, unknown> = {
      success: true,
      data,
    };

    if (meta !== undefined) {
      payload.meta =
        meta && typeof meta === 'object'
          ? (meta as Record<string, unknown>)
          : { value: meta };
    }

    res.json(payload);
  };

  res.fail = (message: string, status = 400) => {
    res.status(status).json({
      success: false,
      message,
    });
  };

  next();
};


