import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Session from '../../../models/Session.model';
import { logout } from '../../../controllers/auth.controller';

jest.mock('../../../models/Session.model');

const createResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe('auth.controller - logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when user is missing', async () => {
    const req = { user: undefined } as unknown as Request;
    const res = createResponse();

    await logout(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('revokes active session and responds with success', async () => {
    const userId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();

    const sessionMock = {
      _id: sessionId,
      user: userId,
      revokedAt: undefined as Date | undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Session.findById as jest.Mock).mockResolvedValue(sessionMock);

    const req = {
      user: {
        userId: userId.toHexString(),
        role: 'graduate',
        sessionId: sessionId.toHexString(),
      },
    } as unknown as Request;

    const res = createResponse();

    await logout(req, res);

    expect(Session.findById).toHaveBeenCalledWith(sessionId.toHexString());
    expect(sessionMock.save).toHaveBeenCalled();
    expect(sessionMock.revokedAt).toBeInstanceOf(Date);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });
});



