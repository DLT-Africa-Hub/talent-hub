import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../middleware/error.middleware';

const createResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe('error.middleware', () => {
  it('handles CSRF errors with 403 status', () => {
    const res = createResponse();
    const err = { code: 'EBADCSRFTOKEN' };

    errorHandler(err, {} as Request, res, (() => {}) as NextFunction);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  });

  it('logs server errors and returns fallback response', () => {
    const res = createResponse();
    const error = new Error('Unexpected failure');
    const statusSpy = jest.spyOn(console, 'error').mockImplementation();

    errorHandler(error, {} as Request, res, (() => {}) as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal server error',
      })
    );

    statusSpy.mockRestore();
  });
});



