import request from 'supertest';
import type { Agent } from 'supertest';
import app from '../../app';
import User from '../../models/User.model';
import {
  connectTestDb,
  clearDatabase,
  disconnectTestDb,
} from '../utils/testDb';

describe('Admin authorization protections', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  const registerUser = async (
    agent: Agent,
    email: string,
    role: 'admin' | 'graduate'
  ) => {
    return agent
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123!',
        role,
      })
      .expect(201);
  };

  it('prevents non-admin users from accessing protected admin routes', async () => {
    const agent = request.agent(app);
    const registerResponse = await registerUser(
      agent,
      'user@example.com',
      'graduate'
    );

    await agent
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .expect(403);
  });

  it('allows admin users to access admin routes', async () => {
    const agent = request.agent(app);
    const adminResponse = await registerUser(
      agent,
      'admin@example.com',
      'admin'
    );

    // Verify email for test admin user (bypass email verification requirement)
    const adminUserId = adminResponse.body.user.id;
    await User.findByIdAndUpdate(adminUserId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    await agent
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminResponse.body.accessToken}`)
      .expect(200);
  });
});
