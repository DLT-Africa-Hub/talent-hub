import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import Application from '../../models/Application.model';
import Interview from '../../models/Interview.model';
import Graduate from '../../models/Graduate.model';
import Company from '../../models/Company.model';
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

jest.mock('../../services/offer.service', () => {
  const actual = jest.requireActual('../../services/offer.service');
  return {
    ...actual,
    createAndSendOffer: jest
      .fn()
      .mockImplementation(async (applicationId: string) => {
        // Import Application here to avoid circular dependency
        const Application = (await import('../../models/Application.model'))
          .default;
        const application = await Application.findById(applicationId);
        if (application) {
          application.status = 'offer_sent';
          await application.save();
        }
        return undefined;
      }),
    generateOfferPDF: jest.fn().mockResolvedValue(Buffer.from('test')),
    uploadOfferPDF: jest
      .fn()
      .mockResolvedValue('https://example.com/offer.pdf'),
  };
});

jest.mock('../../services/email.service', () => {
  return {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendTemplatedEmail: jest.fn().mockResolvedValue(undefined),
  };
});

describe('Application Status Update', () => {
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
    companyName: 'Test Corp',
    industry: 'Software',
    companySize: 100,
    description: 'A test company',
    website: 'https://testcorp.com',
    location: 'Remote',
  });

  const buildJobPayload = () => ({
    title: 'Software Engineer',
    jobType: 'Full time' as const,
    preferedRank: 'A and B' as const,
    description: 'Build great software',
    requirements: {
      skills: ['JavaScript', 'TypeScript'],
    },
    location: 'Remote',
  });

  const buildGraduateProfilePayload = () => ({
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: 1234567890,
    expLevel: 'mid level' as const,
    expYears: 3,
    position: ['frontend developer'] as const,
    skills: ['JavaScript', 'TypeScript', 'React'],
    interests: ['Web Development'],
    location: 'Lagos, Nigeria',
    education: {
      degree: 'Bachelor',
      field: 'Computer Science',
      institution: 'University of Lagos',
      graduationYear: 2020,
    },
    rank: 'A',
  });

  it('should update application status to accepted and return offerSent: false when interview not completed', async () => {
    const companyAgent = request.agent(app);

    // Register and setup company
    const companyRegisterResponse = await companyAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'company@test.com',
        password: 'Password123!',
        role: 'company',
        companyWebsite: 'https://test.com',
      })
      .expect(201);

    const companyToken = companyRegisterResponse.body.accessToken;
    const companyUserId = companyRegisterResponse.body.user.id;

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

    const jobId = jobResponse.body.job._id || jobResponse.body.job.id;

    // Register and setup graduate
    const graduateAgent = request.agent(app);
    const graduateRegisterResponse = await graduateAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'graduate@test.com',
        password: 'Password123!',
        role: 'graduate',
      })
      .expect(201);

    const graduateUserId = graduateRegisterResponse.body.user.id;
    await User.findByIdAndUpdate(graduateUserId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    const graduateProfile = await Graduate.create({
      userId: new mongoose.Types.ObjectId(graduateUserId),
      ...buildGraduateProfilePayload(),
    });

    // Create application
    const application = await Application.create({
      graduateId: graduateProfile._id,
      jobId: new mongoose.Types.ObjectId(jobId),
      status: 'pending',
      appliedAt: new Date(),
    });

    const applicationId = String(application._id);

    // Update application status to accepted
    const updateResponse = await companyAgent
      .put(`/api/v1/companies/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'accepted' })
      .expect(200);

    expect(updateResponse.body).toHaveProperty('message');
    expect(updateResponse.body).toHaveProperty('application');
    expect(updateResponse.body).toHaveProperty('offerSent', false);
    expect(updateResponse.body.application.status).toBe('accepted');

    // Verify application was updated in database
    const updatedApp = await Application.findById(applicationId);
    expect(updatedApp?.status).toBe('accepted');
  });

  it('should update application status to accepted and return offerSent: true with graduateUserId when interview is completed', async () => {
    const companyAgent = request.agent(app);

    // Register and setup company
    const companyRegisterResponse = await companyAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'company2@test.com',
        password: 'Password123!',
        role: 'company',
        companyWebsite: 'https://test2.com',
      })
      .expect(201);

    const companyToken = companyRegisterResponse.body.accessToken;
    const companyUserId = companyRegisterResponse.body.user.id;

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

    const jobId = jobResponse.body.job._id || jobResponse.body.job.id;

    // Register and setup graduate
    const graduateAgent = request.agent(app);
    const graduateRegisterResponse = await graduateAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'graduate2@test.com',
        password: 'Password123!',
        role: 'graduate',
      })
      .expect(201);

    const graduateUserId = graduateRegisterResponse.body.user.id;
    await User.findByIdAndUpdate(graduateUserId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    const graduateProfile = await Graduate.create({
      userId: new mongoose.Types.ObjectId(graduateUserId),
      ...buildGraduateProfilePayload(),
    });

    // Create application
    const application = await Application.create({
      graduateId: graduateProfile._id,
      jobId: new mongoose.Types.ObjectId(jobId),
      status: 'pending',
      appliedAt: new Date(),
    });

    const applicationId = String(application._id);
    const applicationObjectId = application._id as mongoose.Types.ObjectId;

    // Get company and job details for interview
    const updatedCompany = await Company.findOne({ userId: companyUserId });

    // Create completed interview with all required fields
    const roomSlug = 'test-room-slug-' + Date.now();
    const roomUrl = `http://localhost:5174/interviews/${roomSlug}`;
    const interview = await Interview.create({
      applicationId: applicationObjectId,
      jobId: new mongoose.Types.ObjectId(jobId),
      companyId: updatedCompany!._id,
      companyUserId: new mongoose.Types.ObjectId(companyUserId),
      graduateId: graduateProfile._id,
      graduateUserId: new mongoose.Types.ObjectId(graduateUserId),
      status: 'completed',
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      durationMinutes: 30,
      roomSlug,
      roomUrl,
      createdBy: new mongoose.Types.ObjectId(companyUserId),
      provider: 'stream',
    });

    // Link interview to application
    await Application.findByIdAndUpdate(applicationObjectId, {
      interviewId: interview._id,
    });

    // Update application status to accepted (should trigger offer creation)
    const updateResponse = await companyAgent
      .put(`/api/v1/companies/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'accepted' })
      .expect(200);

    expect(updateResponse.body).toHaveProperty('message');
    expect(updateResponse.body).toHaveProperty('offerSent', true);
    expect(updateResponse.body).toHaveProperty('graduateUserId');
    expect(updateResponse.body.graduateUserId).toBe(graduateUserId);

    // Verify application status was updated to offer_sent
    const updatedApp = await Application.findById(applicationId);
    expect(updatedApp?.status).toBe('offer_sent');
  });

  it('should update application status to rejected and return offerSent: false', async () => {
    const companyAgent = request.agent(app);

    // Register and setup company
    const companyRegisterResponse = await companyAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'company3@test.com',
        password: 'Password123!',
        role: 'company',
        companyWebsite: 'https://test3.com',
      })
      .expect(201);

    const companyToken = companyRegisterResponse.body.accessToken;
    const companyUserId = companyRegisterResponse.body.user.id;

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

    const jobId = jobResponse.body.job._id || jobResponse.body.job.id;

    // Register and setup graduate
    const graduateAgent = request.agent(app);
    const graduateRegisterResponse = await graduateAgent
      .post('/api/v1/auth/register')
      .send({
        email: 'graduate3@test.com',
        password: 'Password123!',
        role: 'graduate',
      })
      .expect(201);

    const graduateUserId = graduateRegisterResponse.body.user.id;
    await User.findByIdAndUpdate(graduateUserId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    const graduateProfile = await Graduate.create({
      userId: new mongoose.Types.ObjectId(graduateUserId),
      ...buildGraduateProfilePayload(),
    });

    // Create application
    const application = await Application.create({
      graduateId: graduateProfile._id,
      jobId: new mongoose.Types.ObjectId(jobId),
      status: 'pending',
      appliedAt: new Date(),
    });

    const applicationId = String(application._id);

    // Update application status to rejected
    const updateResponse = await companyAgent
      .put(`/api/v1/companies/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'rejected' })
      .expect(200);

    expect(updateResponse.body).toHaveProperty('message');
    expect(updateResponse.body).toHaveProperty('application');
    expect(updateResponse.body).toHaveProperty('offerSent', false);
    expect(updateResponse.body.application.status).toBe('rejected');

    // Verify application was updated in database
    const updatedApp = await Application.findById(applicationId);
    expect(updatedApp?.status).toBe('rejected');
  });
});
