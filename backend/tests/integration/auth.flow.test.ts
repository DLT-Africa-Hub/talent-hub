import request from 'supertest';
import app from '../../app';
import Session from '../../models/Session.model';
import User from '../../models/User.model';
import { connectTestDb, clearDatabase, disconnectTestDb } from '../utils/testDb';
import { fetchCsrfToken } from '../utils/csrf';

describe('Authentication API flow', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('registers, logs in, refreshes tokens, and logs out successfully', async () => {
    const agent = request.agent(app);

    const csrfForRegister = await fetchCsrfToken(agent);

    const registerResponse = await agent
      .post('/api/v1/auth/register')
      .set(csrfForRegister.headerName, csrfForRegister.token)
      .send({
        email: 'graduate@example.com',
        password: 'Password123!',
        role: 'graduate',
      })
      .expect(201);

    expect(registerResponse.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        session: expect.objectContaining({
          id: expect.any(String),
          isActive: true,
        }),
        user: expect.objectContaining({
          id: expect.any(String),
          email: 'graduate@example.com',
          role: 'graduate',
        }),
      })
    );

    const csrfForLogin = await fetchCsrfToken(agent);
    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .set(csrfForLogin.headerName, csrfForLogin.token)
      .send({
        email: 'graduate@example.com',
        password: 'Password123!',
      })
      .expect(200);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();

    const csrfForRefresh = await fetchCsrfToken(agent);
    const refreshResponse = await agent
      .post('/api/v1/auth/refresh')
      .set(csrfForRefresh.headerName, csrfForRefresh.token)
      .send({
        refreshToken: loginResponse.body.refreshToken,
      })
      .expect(200);

    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(refreshResponse.body.session.id).toBeDefined();

    const csrfForLogout = await fetchCsrfToken(agent);
    await agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .set(csrfForLogout.headerName, csrfForLogout.token)
      .send({})
      .expect(200);

    const sessions = await Session.find({}).lean();
    expect(sessions.some((session) => session.revokedAt)).toBe(true);

    const users = await User.find({}).lean();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('graduate@example.com');
  });
});



