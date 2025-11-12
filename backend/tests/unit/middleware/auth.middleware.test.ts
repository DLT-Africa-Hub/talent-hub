import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../../../middleware/auth.middleware';
import Session from '../../../models/Session.model';

jest.mock('../../../models/Session.model');
jest.mock('../../../utils/jwt.utils', () => ({
  verifyAccessToken: jest.fn(),
}));

const mockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe('auth.middleware - authenticate', () => {
  const verifyAccessToken = jest.requireMock('../../../utils/jwt.utils')
    .verifyAccessToken as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without a bearer token', async () => {
    const req = {
      headers: {},
    } as unknown as Request;

    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects inactive sessions', async () => {
    verifyAccessToken.mockReturnValue({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'graduate',
      sessionId: new mongoose.Types.ObjectId().toHexString(),
    });

    (Session.findById as jest.Mock).mockResolvedValue({
      isActive: () => false,
    });

    const req = {
      headers: {
        authorization: 'Bearer fake-token',
      },
    } as unknown as Request;

    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired session' });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes control to next middleware when session is active', async () => {
    const userId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();

    verifyAccessToken.mockReturnValue({
      userId: userId.toHexString(),
      role: 'graduate',
      sessionId: sessionId.toHexString(),
    });

    (Session.findById as jest.Mock).mockResolvedValue({
      user: userId,
      isActive: () => true,
    });

    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as unknown as Request;

    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});



