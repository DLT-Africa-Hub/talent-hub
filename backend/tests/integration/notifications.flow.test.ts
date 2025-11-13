import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import Notification from '../../models/Notification.model';
import Graduate from '../../models/Graduate.model';
import Match from '../../models/Match.model';
import { connectTestDb, clearDatabase, disconnectTestDb } from '../utils/testDb';

jest.mock('../../services/aiService', () => {
  const actual = jest.requireActual('../../services/aiService');
  return {
    ...actual,
    generateJobEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  };
});

describe('Notification workflows', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  const buildCompanyProfilePayload = () => ({
    companyName: 'Acme Inc.',
    industry: 'Software',
    companySize: 250,
    description: 'We build products.',
    website: 'https://acme.example.com',
    location: 'Remote',
  });

  const buildJobPayload = () => ({
    title: 'Frontend Engineer',
    jobType: 'Full time' as const,
    preferedRank: 'A and B' as const,
    description: 'Work on client applications.',
    requirements: {
      skills: ['React', 'TypeScript'],
    },
    location: 'Remote',
    salary: {
      min: 70000,
      max: 90000,
      currency: 'USD',
    },
    status: 'active',
  });

  const buildGraduateProfilePayload = () => ({
    firstName: 'Jane',
    lastName: 'Doe',
    phoneNumber: 1234567890,
    expLevel: 'mid' as const,
    expYears: 3,
    position: 'frontend' as const,
    skills: ['JavaScript', 'React'],
    interests: ['UX'],
    education: {
      degree: 'BSc Computer Science',
      field: 'Computer Science',
      institution: 'State University',
      graduationYear: 2022,
    },
  });

  it('creates a company notification when a graduate applies to a job', async () => {
    const companyAgent = request.agent(app);

    const companyRegisterResponse = await companyAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'company@example.com',
        password: 'Password123!',
        role: 'company',
      })
      .expect(201);

    const companyToken = companyRegisterResponse.body.accessToken;
    const companyUserId = companyRegisterResponse.body.user.id;

    await companyAgent
      .post('/api/v1/companies/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send(buildCompanyProfilePayload())
      .expect(201);

    const jobResponse = await companyAgent
      .post('/api/v1/companies/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send(buildJobPayload())
      .expect(201);

    const jobId: string = jobResponse.body.job._id ?? jobResponse.body.job.id;
    expect(jobId).toBeDefined();

    const graduateAgent = request.agent(app);

    const graduateRegisterResponse = await graduateAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'graduate@example.com',
        password: 'Password123!',
        role: 'graduate',
      })
      .expect(201);

    const graduateToken = graduateRegisterResponse.body.accessToken;
    const graduateUserId = graduateRegisterResponse.body.user.id;

    await Graduate.create({
      userId: new mongoose.Types.ObjectId(graduateUserId),
      ...buildGraduateProfilePayload(),
      workExperiences: [],
    });

    await graduateAgent
      .post(`/api/v1/graduates/apply/${jobId}`)
      .set('Authorization', `Bearer ${graduateToken}`)
      .send({
        coverLetter: 'I am excited about this role.',
      })
      .expect(201);

    const notificationsResponse = await companyAgent
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${companyToken}`)
      .expect(200);

    expect(notificationsResponse.body.notifications).toHaveLength(1);
    expect(notificationsResponse.body.notifications[0]).toEqual(
      expect.objectContaining({
        type: 'application',
        title: 'New application received',
        relatedType: 'application',
        read: false,
      })
    );

    const unreadCountResponse = await companyAgent
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${companyToken}`)
      .expect(200);

    expect(unreadCountResponse.body.count).toBe(1);

    const notificationId = notificationsResponse.body.notifications[0].id;

    await companyAgent
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${companyToken}`)
      .expect(200);

    const unreadCountAfterRead = await companyAgent
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${companyToken}`)
      .expect(200);

    expect(unreadCountAfterRead.body.count).toBe(0);

    const storedNotifications = await Notification.find({
      userId: companyUserId,
    }).lean();

    expect(storedNotifications).toHaveLength(1);
    expect(storedNotifications[0].read).toBe(true);
    expect(storedNotifications[0].relatedType).toBe('application');
  });

  it('notifies a graduate when a company updates a match status', async () => {
    const companyAgent = request.agent(app);

    const companyRegisterResponse = await companyAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'company2@example.com',
        password: 'Password123!',
        role: 'company',
      })
      .expect(201);

    const companyToken = companyRegisterResponse.body.accessToken;

    await companyAgent
      .post('/api/v1/companies/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send(buildCompanyProfilePayload())
      .expect(201);

    const jobResponse = await companyAgent
      .post('/api/v1/companies/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send(buildJobPayload())
      .expect(201);

    const jobId: string = jobResponse.body.job._id ?? jobResponse.body.job.id;

    const graduateAgent = request.agent(app);

    const graduateRegisterResponse = await graduateAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'graduate2@example.com',
        password: 'Password123!',
        role: 'graduate',
      })
      .expect(201);

    const graduateToken = graduateRegisterResponse.body.accessToken;
    const graduateUserId = graduateRegisterResponse.body.user.id;

    const graduateProfile = await Graduate.create({
      userId: new mongoose.Types.ObjectId(graduateUserId),
      ...buildGraduateProfilePayload(),
      workExperiences: [],
    });

    const match = await Match.create({
      graduateId: graduateProfile._id,
      jobId: new mongoose.Types.ObjectId(jobId),
      score: 85,
      status: 'pending',
    });

    const matchId = (match._id as mongoose.Types.ObjectId).toString();

    await companyAgent
      .put(`/api/v1/companies/jobs/${jobId}/matches/${matchId}`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'accepted' })
      .expect(200);

    const notificationsResponse = await graduateAgent
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${graduateToken}`)
      .expect(200);

    expect(notificationsResponse.body.notifications).toHaveLength(1);
    expect(notificationsResponse.body.notifications[0]).toEqual(
      expect.objectContaining({
        type: 'match',
        title: 'Match accepted',
        relatedType: 'match',
        read: false,
      })
    );
  });
});


