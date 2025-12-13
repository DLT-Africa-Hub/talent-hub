import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import Notification from '../../models/Notification.model';
import Graduate from '../../models/Graduate.model';
import Match from '../../models/Match.model';
import User from '../../models/User.model';
import {
  connectTestDb,
  clearDatabase,
  disconnectTestDb,
} from '../utils/testDb';

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
      amount: 80000,
      currency: 'USD',
    },
    status: 'active',
  });

  const buildGraduateProfilePayload = () => ({
    firstName: 'Jane',
    lastName: 'Doe',
    phoneNumber: 1234567890,
    expLevel: 'mid level' as const,
    expYears: 3,
    position: 'frontend developer' as const,
    skills: ['JavaScript', 'React'],
    interests: ['UX'],
    location: 'Lagos, Nigeria',
    cv: [
      {
        fileName: 'resume.pdf',
        fileUrl: 'https://example.com/resume.pdf',
        size: 1024,
        publicId: 'test-public-id',
        onDisplay: true,
      },
    ],
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
        email: 'company@testcorp.com',
        password: 'Password123!',
        role: 'company',
        companyWebsite: 'https://testcorp.com',
      })
      .expect(201);

    const companyToken = companyRegisterResponse.body.accessToken;
    const companyUserId = companyRegisterResponse.body.user.id;

    // Verify email for test user (bypass email verification requirement)
    await User.findByIdAndUpdate(companyUserId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

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

    // Verify email for test user (bypass email verification requirement)
    const graduateUserId = graduateRegisterResponse.body.user.id;
    await User.findByIdAndUpdate(graduateUserId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    const graduateToken = graduateRegisterResponse.body.accessToken;

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

    // Filter for application notifications (there may be other notifications like job creation)
    const applicationNotifications =
      notificationsResponse.body.notifications.filter(
        (n: { type: string }) => n.type === 'application'
      );

    expect(applicationNotifications).toHaveLength(1);
    expect(applicationNotifications[0]).toEqual(
      expect.objectContaining({
        type: 'application',
        title: 'New Application Received',
        relatedType: 'application',
        read: false,
      })
    );

    const unreadCountResponse = await companyAgent
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${companyToken}`)
      .expect(200);

    // There are 2 unread notifications: job creation and application
    expect(unreadCountResponse.body.count).toBeGreaterThanOrEqual(1);

    // Use the application notification ID
    const notificationId = applicationNotifications[0].id;

    await companyAgent
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${companyToken}`)
      .expect(200);

    const unreadCountAfterRead = await companyAgent
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${companyToken}`)
      .expect(200);

    // Unread count should decrease by 1 (job creation notification is still unread)
    expect(unreadCountAfterRead.body.count).toBe(
      unreadCountResponse.body.count - 1
    );

    // Verify the application notification was marked as read
    const storedApplicationNotification = await Notification.findOne({
      userId: companyUserId,
      relatedType: 'application',
    }).lean();

    expect(storedApplicationNotification).toBeDefined();
    expect(storedApplicationNotification?.read).toBe(true);
    expect(storedApplicationNotification?.relatedType).toBe('application');
  });

  it('notifies a graduate when a company updates a match status', async () => {
    const companyAgent = request.agent(app);

    const companyRegisterResponse = await companyAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'company2@testcorp.com',
        password: 'Password123!',
        role: 'company',
        companyWebsite: 'https://testcorp.com',
      })
      .expect(201);

    const companyToken = companyRegisterResponse.body.accessToken;
    const companyUserId2 = companyRegisterResponse.body.user.id;

    // Verify email for test user (bypass email verification requirement)
    await User.findByIdAndUpdate(companyUserId2, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

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

    // Verify email for test user (bypass email verification requirement)
    const graduateUserId = graduateRegisterResponse.body.user.id;
    await User.findByIdAndUpdate(graduateUserId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    const graduateToken = graduateRegisterResponse.body.accessToken;

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
