import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { validateRequest } from '../../../middleware/validation.middleware';

const createMockResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe('validation.middleware', () => {
  it('parses and normalizes request data', async () => {
    const schema = z.object({
      body: z.object({
        name: z
          .string()
          .min(1)
          .transform((value) => value.trim()),
      }),
    });

    const req = {
      body: { name: '   Alice   ' },
      query: {},
      params: {},
    } as unknown as Request;

    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await validateRequest(schema)(req, res, next);

    expect(req.body).toEqual({ name: 'Alice' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds with validation errors when parsing fails', async () => {
    const schema = z.object({
      body: z.object({
        email: z.string().email(),
      }),
    });

    const req = {
      body: { email: 'invalid-email' },
      query: {},
      params: {},
    } as unknown as Request;

    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await validateRequest(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'body.email',
          }),
        ]),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});



