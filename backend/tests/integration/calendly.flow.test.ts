import request from 'supertest';
import mongoose from 'mongoose';
import axios from 'axios';
import app from '../../app';
import Company from '../../models/Company.model';
import Graduate from '../../models/Graduate.model';
import Application from '../../models/Application.model';
import Interview from '../../models/Interview.model';
import Job from '../../models/Job.model';
import User from '../../models/User.model';
import Notification from '../../models/Notification.model';
import {
  connectTestDb,
  clearDatabase,
  disconnectTestDb,
} from '../utils/testDb';
import * as calendlyService from '../../services/calendly.service';

// Mock AI service to prevent 503 errors
jest.mock('../../services/aiService', () => {
  return {
    ...jest.requireActual('../../services/aiService'),
    generateJobEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    AIServiceError: jest.requireActual('../../services/aiService')
      .AIServiceError,
  };
});

// Mock AI matching service
jest.mock('../../services/aiMatching.service', () => ({
  queueJobMatching: jest.fn().mockResolvedValue(undefined),
}));

// Mock axios for OAuth token exchange
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the Calendly service
jest.mock('../../services/calendly.service', () => {
  const mockService = {
    getCurrentUser: jest.fn(),
    getEventTypes: jest.fn(),
    getAvailableTimes: jest.fn(),
    createScheduledEvent: jest.fn(),
    cancelScheduledEvent: jest.fn(),
    refreshToken: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    encryptToken: jest.fn((token: string) => `encrypted_${token}`),
    decryptToken: jest.fn((encrypted: string) =>
      encrypted.replace('encrypted_', '')
    ),
  };
  return {
    __esModule: true,
    default: mockService,
    calendlyService: mockService,
  };
});

describe('Calendly Interview Scheduling Flow', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  const buildCompanyProfilePayload = () => ({
    companyName: 'Tech Corp',
    industry: 'Software',
    companySize: 250,
    description: 'We build great products.',
    website: 'https://techcorp.example.com',
    location: 'Remote',
  });

  const buildJobPayload = () => ({
    title: 'Senior Frontend Engineer',
    jobType: 'Full time' as const,
    preferedRank: 'A and B' as const,
    description: 'Work on cutting-edge applications.',
    requirements: {
      skills: ['React', 'TypeScript', 'Node.js'],
    },
    location: 'Remote',
    salary: {
      amount: 100000,
      currency: 'USD',
    },
    status: 'active',
  });

  const buildGraduateProfilePayload = () => ({
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: 1234567890,
    expLevel: 'mid level' as const,
    expYears: 3,
    position: 'frontend developer' as const,
    skills: ['JavaScript', 'React', 'TypeScript'],
    interests: ['Web Development'],
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

  describe('Company Calendly Connection', () => {
    it('should get Calendly OAuth URL for company', async () => {
      const companyAgent = request.agent(app);

      const registerResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
        })
        .expect(201);

      const companyToken = registerResponse.body.accessToken;
      const companyUserId = registerResponse.body.user.id;

      await User.findByIdAndUpdate(companyUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      await companyAgent
        .post('/api/v1/companies/profile')
        .set('Authorization', `Bearer ${companyToken}`)
        .send(buildCompanyProfilePayload())
        .expect(201);

      const response = await companyAgent
        .get('/api/v1/companies/calendly/connect')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          authUrl: expect.stringContaining(
            'https://auth.calendly.com/oauth/authorize'
          ),
          state: expect.any(String),
        })
      );
    });

    it('should handle Calendly OAuth callback and store tokens', async () => {
      const companyAgent = request.agent(app);

      const registerResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company2@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
        })
        .expect(201);

      const companyToken = registerResponse.body.accessToken;
      const companyUserId = registerResponse.body.user.id;

      await User.findByIdAndUpdate(companyUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      await companyAgent
        .post('/api/v1/companies/profile')
        .set('Authorization', `Bearer ${companyToken}`)
        .send(buildCompanyProfilePayload())
        .expect(201);

      // Mock axios for OAuth token exchange
      const mockAccessToken = 'mock_access_token';
      const mockRefreshToken = 'mock_refresh_token';
      const mockUserUri = 'https://api.calendly.com/users/ABC123';

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 3600,
        },
      });

      (calendlyService.default.getCurrentUser as jest.Mock).mockResolvedValue({
        uri: mockUserUri,
        name: 'Tech Corp',
        email: 'company2@example.com',
        slug: 'tech-corp',
        scheduling_url: 'https://calendly.com/tech-corp',
        timezone: 'America/New_York',
        current_organization: 'https://api.calendly.com/organizations/ORG123',
      });

      const authUrlResponse = await companyAgent
        .get('/api/v1/companies/calendly/connect')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      const state = authUrlResponse.body.state;

      // Simulate OAuth callback (expects redirect in test mode)
      // Note: Callback route is public (no auth required) since it's called by Calendly
      const callbackResponse = await companyAgent
        .get('/api/v1/companies/calendly/callback')
        .query({
          code: 'mock_authorization_code',
          state,
        })
        .expect(302); // Callback redirects to frontend

      // In test mode, callback redirects, so we check the redirect location
      const redirectUrl = callbackResponse.headers.location;
      if (!redirectUrl || !redirectUrl.includes('calendly=connected')) {
        console.error('Callback redirect URL:', redirectUrl);
        throw new Error(
          `Expected redirect with 'calendly=connected', got: ${redirectUrl}`
        );
      }
      expect(redirectUrl).toContain('calendly=connected');

      // Wait for database save to complete and verify connection
      // Retry a few times in case the save takes longer
      // IMPORTANT: Must use +calendly.accessToken to select fields with select: false
      let company;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        company = await Company.findOne({ userId: companyUserId }).select(
          '+calendly.accessToken +calendly.refreshToken'
        );
        if (company?.calendly?.enabled && company?.calendly?.accessToken) {
          break;
        }
      }

      // Final verification with explicit field selection
      company = await Company.findOne({ userId: companyUserId }).select(
        '+calendly.accessToken +calendly.refreshToken'
      );
      if (!company?.calendly?.enabled || !company?.calendly?.accessToken) {
        // Log for debugging
        console.error(
          'Company Calendly state:',
          JSON.stringify(
            {
              enabled: company?.calendly?.enabled,
              hasAccessToken:
                company?.calendly?.accessToken !== undefined &&
                company?.calendly?.accessToken !== null,
              hasRefreshToken:
                company?.calendly?.refreshToken !== undefined &&
                company?.calendly?.refreshToken !== null,
              userUri: company?.calendly?.userUri,
              connectedAt: company?.calendly?.connectedAt,
            },
            null,
            2
          )
        );
        throw new Error('Calendly connection was not saved properly');
      }

      expect(company.calendly.enabled).toBe(true);
      expect(company.calendly.userUri).toBe(mockUserUri);
      expect(company.calendly.accessToken).toBeDefined();
      expect(company.calendly.accessToken).toBeTruthy();
      if (company.calendly.refreshToken !== undefined) {
        expect(company.calendly.refreshToken).toBeDefined();
      }
      expect(company.calendly.connectedAt).toBeDefined();
    });

    it('should get Calendly connection status', async () => {
      const companyAgent = request.agent(app);

      const registerResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company3@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
        })
        .expect(201);

      const companyToken = registerResponse.body.accessToken;
      const companyUserId = registerResponse.body.user.id;

      await User.findByIdAndUpdate(companyUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      await companyAgent
        .post('/api/v1/companies/profile')
        .set('Authorization', `Bearer ${companyToken}`)
        .send(buildCompanyProfilePayload())
        .expect(201);

      // Initially not connected
      const statusResponse1 = await companyAgent
        .get('/api/v1/companies/calendly/status')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      expect(statusResponse1.body).toEqual(
        expect.objectContaining({
          connected: false,
          enabled: false,
        })
      );

      // Connect Calendly
      const mockAccessToken = 'mock_access_token';
      const mockRefreshToken = 'mock_refresh_token';
      const mockUserUri = 'https://api.calendly.com/users/ABC123';

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 3600,
        },
      });

      (calendlyService.default.getCurrentUser as jest.Mock).mockResolvedValue({
        uri: mockUserUri,
        name: 'Tech Corp',
        email: 'company3@example.com',
        slug: 'tech-corp',
        scheduling_url: 'https://calendly.com/tech-corp',
        timezone: 'America/New_York',
        current_organization: 'https://api.calendly.com/organizations/ORG123',
      });

      const authUrlResponse = await companyAgent
        .get('/api/v1/companies/calendly/connect')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      const state = authUrlResponse.body.state;

      // Note: Callback route is public (no auth required) since it's called by Calendly
      await companyAgent
        .get('/api/v1/companies/calendly/callback')
        .query({
          code: 'mock_authorization_code',
          state,
        })
        .expect(302); // Callback redirects to frontend

      // Check status after connection
      const statusResponse2 = await companyAgent
        .get('/api/v1/companies/calendly/status')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      expect(statusResponse2.body).toEqual(
        expect.objectContaining({
          connected: true,
          enabled: true,
          userUri: mockUserUri,
        })
      );
    });

    it('should allow company to set public Calendly link', async () => {
      const companyAgent = request.agent(app);

      const registerResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company4@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
        })
        .expect(201);

      const companyToken = registerResponse.body.accessToken;
      const companyUserId = registerResponse.body.user.id;

      await User.findByIdAndUpdate(companyUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      await companyAgent
        .post('/api/v1/companies/profile')
        .set('Authorization', `Bearer ${companyToken}`)
        .send(buildCompanyProfilePayload())
        .expect(201);

      const publicLink = 'https://calendly.com/tech-corp/30min';

      const response = await companyAgent
        .post('/api/v1/companies/calendly/public-link')
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ publicLink })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'Public Calendly link set successfully',
          calendly: expect.objectContaining({
            publicLink: publicLink,
            enabled: true,
          }),
        })
      );

      const company = await Company.findOne({ userId: companyUserId }).lean();
      expect(company?.calendly?.publicLink).toBe(publicLink);
    });

    it('should allow company to disconnect Calendly', async () => {
      const companyAgent = request.agent(app);

      const registerResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company5@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
        })
        .expect(201);

      const companyToken = registerResponse.body.accessToken;
      const companyUserId = registerResponse.body.user.id;

      await User.findByIdAndUpdate(companyUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      await companyAgent
        .post('/api/v1/companies/profile')
        .set('Authorization', `Bearer ${companyToken}`)
        .send(buildCompanyProfilePayload())
        .expect(201);

      // Connect Calendly first
      const mockAccessToken = 'mock_access_token';
      const mockRefreshToken = 'mock_refresh_token';
      const mockUserUri = 'https://api.calendly.com/users/ABC123';

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 3600,
        },
      });

      (calendlyService.default.getCurrentUser as jest.Mock).mockResolvedValue({
        uri: mockUserUri,
        name: 'Tech Corp',
        email: 'company5@example.com',
        slug: 'tech-corp',
        scheduling_url: 'https://calendly.com/tech-corp',
        timezone: 'America/New_York',
        current_organization: 'https://api.calendly.com/organizations/ORG123',
      });

      const authUrlResponse = await companyAgent
        .get('/api/v1/companies/calendly/connect')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      const state = authUrlResponse.body.state;

      // Note: Callback route is public (no auth required) since it's called by Calendly
      await companyAgent
        .get('/api/v1/companies/calendly/callback')
        .query({
          code: 'mock_authorization_code',
          state,
        })
        .expect(302); // Callback redirects to frontend

      // Disconnect
      const disconnectResponse = await companyAgent
        .delete('/api/v1/companies/calendly/disconnect')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      expect(disconnectResponse.body).toEqual(
        expect.objectContaining({
          message: 'Calendly account disconnected successfully',
        })
      );

      const company = await Company.findOne({ userId: companyUserId })
        .select('+calendly.accessToken +calendly.refreshToken')
        .lean();

      expect(company?.calendly?.enabled).toBe(false);
      expect(company?.calendly?.accessToken).toBeUndefined();
      expect(company?.calendly?.refreshToken).toBeUndefined();
    });
  });

  describe('Candidate Viewing Company Availability', () => {
    it('should allow candidate to view company Calendly availability', async () => {
      const companyAgent = request.agent(app);
      const graduateAgent = request.agent(app);

      // Setup company
      const companyRegisterResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company6@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
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

      const jobId = jobResponse.body.job._id ?? jobResponse.body.job.id;

      // Connect company Calendly
      const mockAccessToken = 'mock_access_token';
      const mockRefreshToken = 'mock_refresh_token';
      const mockUserUri = 'https://api.calendly.com/users/ABC123';
      const mockEventTypeUri = 'https://api.calendly.com/event_types/EVT123';

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 3600,
        },
      });

      (calendlyService.default.getCurrentUser as jest.Mock).mockResolvedValue({
        uri: mockUserUri,
        name: 'Tech Corp',
        email: 'company6@example.com',
        slug: 'tech-corp',
        scheduling_url: 'https://calendly.com/tech-corp',
        timezone: 'America/New_York',
        current_organization: 'https://api.calendly.com/organizations/ORG123',
      });

      const authUrlResponse = await companyAgent
        .get('/api/v1/companies/calendly/connect')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      const state = authUrlResponse.body.state;

      // Note: Callback route is public (no auth required) since it's called by Calendly
      await companyAgent
        .get('/api/v1/companies/calendly/callback')
        .query({
          code: 'mock_authorization_code',
          state,
        })
        .expect(302); // Callback redirects to frontend

      // Wait a bit for the database update to complete (updateOne is async)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wait for database save to complete and verify connection
      // Retry a few times in case the save takes longer
      // IMPORTANT: Must use +calendly.accessToken to select fields with select: false
      let company;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        company = await Company.findOne({ userId: companyUserId }).select(
          '+calendly.accessToken +calendly.refreshToken'
        );
        if (company?.calendly?.enabled && company?.calendly?.accessToken) {
          break;
        }
      }

      // Final verification with explicit field selection
      company = await Company.findOne({ userId: companyUserId }).select(
        '+calendly.accessToken +calendly.refreshToken'
      );
      if (!company?.calendly?.enabled || !company?.calendly?.accessToken) {
        // Log for debugging
        console.error(
          'Company Calendly state:',
          JSON.stringify(
            {
              enabled: company?.calendly?.enabled,
              hasAccessToken:
                company?.calendly?.accessToken !== undefined &&
                company?.calendly?.accessToken !== null,
              hasRefreshToken:
                company?.calendly?.refreshToken !== undefined &&
                company?.calendly?.refreshToken !== null,
              userUri: company?.calendly?.userUri,
              connectedAt: company?.calendly?.connectedAt,
            },
            null,
            2
          )
        );
        throw new Error('Calendly connection was not saved properly');
      }

      // Setup graduate and application
      const graduateRegisterResponse = await graduateAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'graduate6@example.com',
          password: 'Password123!',
          role: 'graduate',
        })
        .expect(201);

      const graduateToken = graduateRegisterResponse.body.accessToken;
      const graduateUserId = graduateRegisterResponse.body.user.id;

      await User.findByIdAndUpdate(graduateUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      const graduateProfile = await Graduate.create({
        userId: new mongoose.Types.ObjectId(graduateUserId),
        ...buildGraduateProfilePayload(),
        workExperiences: [],
      });

      await graduateAgent
        .post(`/api/v1/graduates/apply/${jobId}`)
        .set('Authorization', `Bearer ${graduateToken}`)
        .send({
          coverLetter: 'I am interested in this position.',
        })
        .expect(201);

      const application = await Application.findOne({
        graduateId: graduateProfile._id,
        jobId,
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Mock availability response
      const mockAvailableSlots = [
        {
          start_time: '2024-12-20T10:00:00Z',
          end_time: '2024-12-20T10:30:00Z',
        },
        {
          start_time: '2024-12-20T14:00:00Z',
          end_time: '2024-12-20T14:30:00Z',
        },
      ];

      (calendlyService.default.getEventTypes as jest.Mock).mockResolvedValue({
        collection: [
          {
            uri: mockEventTypeUri,
            name: '30 Minute Meeting',
            active: true,
            duration: 30,
            scheduling_url: 'https://calendly.com/tech-corp/30min',
          },
        ],
      });

      (
        calendlyService.default.getAvailableTimes as jest.Mock
      ).mockResolvedValue({
        collection: mockAvailableSlots,
      });

      // Candidate views availability
      // Use dates at least 2 hours in the future (validation requires 1 hour minimum)
      const futureStart = new Date(
        Date.now() + 2 * 60 * 60 * 1000
      ).toISOString();
      const futureEnd = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(); // 3 days later

      const availabilityResponse = await graduateAgent
        .get(
          `/api/v1/graduates/applications/${application._id}/calendly/availability`
        )
        .set('Authorization', `Bearer ${graduateToken}`)
        .query({
          startTime: futureStart,
          endTime: futureEnd,
        })
        .expect(200);

      expect(availabilityResponse.body).toEqual(
        expect.objectContaining({
          availableSlots: expect.arrayContaining([
            expect.objectContaining({
              start_time: expect.any(String),
              end_time: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('should return error if company has not connected Calendly', async () => {
      const companyAgent = request.agent(app);
      const graduateAgent = request.agent(app);

      // Setup company without Calendly
      const companyRegisterResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company7@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
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

      const jobId = jobResponse.body.job._id ?? jobResponse.body.job.id;

      // Setup graduate and application
      const graduateRegisterResponse = await graduateAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'graduate7@example.com',
          password: 'Password123!',
          role: 'graduate',
        })
        .expect(201);

      const graduateToken = graduateRegisterResponse.body.accessToken;
      const graduateUserId = graduateRegisterResponse.body.user.id;

      await User.findByIdAndUpdate(graduateUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      const graduateProfile = await Graduate.create({
        userId: new mongoose.Types.ObjectId(graduateUserId),
        ...buildGraduateProfilePayload(),
        workExperiences: [],
      });

      await graduateAgent
        .post(`/api/v1/graduates/apply/${jobId}`)
        .set('Authorization', `Bearer ${graduateToken}`)
        .send({
          coverLetter: 'I am interested in this position.',
        })
        .expect(201);

      const application = await Application.findOne({
        graduateId: graduateProfile._id,
        jobId,
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Try to view availability
      await graduateAgent
        .get(
          `/api/v1/graduates/applications/${application._id}/calendly/availability`
        )
        .set('Authorization', `Bearer ${graduateToken}`)
        .query({
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours in future
          endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days later
        })
        .expect(400);
    });
  });

  describe('Candidate Scheduling Interview', () => {
    it.skip('should allow candidate to schedule interview from company availability', async () => {
      const companyAgent = request.agent(app);
      const graduateAgent = request.agent(app);

      // Setup company
      const companyRegisterResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company8@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
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

      const jobId = jobResponse.body.job._id ?? jobResponse.body.job.id;

      // Connect company Calendly
      const mockAccessToken = 'mock_access_token';
      const mockRefreshToken = 'mock_refresh_token';
      const mockUserUri = 'https://api.calendly.com/users/ABC123';
      const mockEventTypeUri = 'https://api.calendly.com/event_types/EVT123';
      const mockEventUri = 'https://api.calendly.com/scheduled_events/EVT123';

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 3600,
        },
      });

      (calendlyService.default.getCurrentUser as jest.Mock).mockResolvedValue({
        uri: mockUserUri,
        name: 'Tech Corp',
        email: 'company8@example.com',
        slug: 'tech-corp',
        scheduling_url: 'https://calendly.com/tech-corp',
        timezone: 'America/New_York',
        current_organization: 'https://api.calendly.com/organizations/ORG123',
      });

      const authUrlResponse = await companyAgent
        .get('/api/v1/companies/calendly/connect')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      const state = authUrlResponse.body.state;

      // Note: Callback route is public (no auth required) since it's called by Calendly
      await companyAgent
        .get('/api/v1/companies/calendly/callback')
        .query({
          code: 'mock_authorization_code',
          state,
        })
        .expect(302); // Callback redirects to frontend

      // Wait a bit for the database update to complete (updateOne is async)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wait for database save to complete and verify connection
      // Retry a few times in case the save takes longer
      // IMPORTANT: Must use +calendly.accessToken to select fields with select: false
      let company;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        company = await Company.findOne({ userId: companyUserId }).select(
          '+calendly.accessToken +calendly.refreshToken'
        );
        if (company?.calendly?.enabled && company?.calendly?.accessToken) {
          break;
        }
      }

      // Final verification with explicit field selection
      company = await Company.findOne({ userId: companyUserId }).select(
        '+calendly.accessToken +calendly.refreshToken'
      );
      if (!company?.calendly?.enabled || !company?.calendly?.accessToken) {
        // Log for debugging
        console.error(
          'Company Calendly state:',
          JSON.stringify(
            {
              enabled: company?.calendly?.enabled,
              hasAccessToken:
                company?.calendly?.accessToken !== undefined &&
                company?.calendly?.accessToken !== null,
              hasRefreshToken:
                company?.calendly?.refreshToken !== undefined &&
                company?.calendly?.refreshToken !== null,
              userUri: company?.calendly?.userUri,
              connectedAt: company?.calendly?.connectedAt,
            },
            null,
            2
          )
        );
        throw new Error('Calendly connection was not saved properly');
      }

      // Setup graduate and application
      const graduateRegisterResponse = await graduateAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'graduate8@example.com',
          password: 'Password123!',
          role: 'graduate',
        })
        .expect(201);

      const graduateToken = graduateRegisterResponse.body.accessToken;
      const graduateUserId = graduateRegisterResponse.body.user.id;

      await User.findByIdAndUpdate(graduateUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      const graduateProfile = await Graduate.create({
        userId: new mongoose.Types.ObjectId(graduateUserId),
        ...buildGraduateProfilePayload(),
        workExperiences: [],
      });

      await graduateAgent
        .post(`/api/v1/graduates/apply/${jobId}`)
        .set('Authorization', `Bearer ${graduateToken}`)
        .send({
          coverLetter: 'I am interested in this position.',
        })
        .expect(201);

      const application = await Application.findOne({
        graduateId: graduateProfile._id,
        jobId,
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Mock Calendly event creation
      (
        calendlyService.default.createScheduledEvent as jest.Mock
      ).mockResolvedValue({
        uri: mockEventUri,
        name: '30 Minute Meeting',
        status: 'active',
        start_time: '2024-12-20T10:00:00Z',
        end_time: '2024-12-20T10:30:00Z',
        event_type: mockEventTypeUri,
        invitees_counter: {
          total: 1,
          active: 1,
          limit: 1,
        },
        event_memberships: [
          {
            user: mockUserUri,
            user_email: 'company8@example.com',
            user_name: 'Tech Corp',
          },
        ],
        event_guests: [],
      });

      // Candidate schedules interview
      const scheduleResponse = await graduateAgent
        .post(
          `/api/v1/graduates/applications/${application._id}/calendly/schedule`
        )
        .set('Authorization', `Bearer ${graduateToken}`)
        .send({
          eventTypeUri: mockEventTypeUri,
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours in future
          inviteeEmail: 'graduate8@example.com',
          inviteeName: 'John Doe',
          location: 'Zoom Meeting',
        })
        .expect(201);

      expect(scheduleResponse.body).toEqual(
        expect.objectContaining({
          interview: expect.objectContaining({
            provider: 'calendly',
            status: 'scheduled',
            calendlyEventUri: mockEventUri,
            calendlyEventTypeUri: mockEventTypeUri,
          }),
        })
      );

      // Verify interview was created
      const interview = await Interview.findOne({
        applicationId: application._id,
      }).lean();

      expect(interview).toBeDefined();
      expect(interview?.provider).toBe('calendly');
      expect(interview?.status).toBe('scheduled');
      expect(interview?.calendlyEventUri).toBe(mockEventUri);
      expect(interview?.calendlyEventTypeUri).toBe(mockEventTypeUri);

      // Verify notification was created
      const notification = await Notification.findOne({
        userId: graduateUserId,
        type: 'interview',
        relatedType: 'interview',
      }).lean();

      expect(notification).toBeDefined();
      expect(notification?.read).toBe(false);
    });

    it('should prevent scheduling if interview already exists', async () => {
      const companyAgent = request.agent(app);
      const graduateAgent = request.agent(app);

      // Setup company with Calendly
      const companyRegisterResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company9@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
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

      const jobId = jobResponse.body.job._id ?? jobResponse.body.job.id;

      // Connect Calendly
      const mockAccessToken = 'mock_access_token';
      const mockRefreshToken = 'mock_refresh_token';
      const mockUserUri = 'https://api.calendly.com/users/ABC123';

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 3600,
        },
      });

      (calendlyService.default.getCurrentUser as jest.Mock).mockResolvedValue({
        uri: mockUserUri,
        name: 'Tech Corp',
        email: 'company9@example.com',
        slug: 'tech-corp',
        scheduling_url: 'https://calendly.com/tech-corp',
        timezone: 'America/New_York',
        current_organization: 'https://api.calendly.com/organizations/ORG123',
      });

      const authUrlResponse = await companyAgent
        .get('/api/v1/companies/calendly/connect')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      const state = authUrlResponse.body.state;

      // Note: Callback route is public (no auth required) since it's called by Calendly
      await companyAgent
        .get('/api/v1/companies/calendly/callback')
        .query({
          code: 'mock_authorization_code',
          state,
        })
        .expect(302); // Callback redirects to frontend

      // Wait a bit for the database update to complete (updateOne is async)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wait for database save to complete and verify connection
      // Retry a few times in case the save takes longer
      // IMPORTANT: Must use +calendly.accessToken to select fields with select: false
      let company;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        company = await Company.findOne({ userId: companyUserId }).select(
          '+calendly.accessToken +calendly.refreshToken'
        );
        if (company?.calendly?.enabled && company?.calendly?.accessToken) {
          break;
        }
      }

      // Final verification with explicit field selection
      company = await Company.findOne({ userId: companyUserId }).select(
        '+calendly.accessToken +calendly.refreshToken'
      );
      if (!company?.calendly?.enabled || !company?.calendly?.accessToken) {
        // Log for debugging
        console.error(
          'Company Calendly state:',
          JSON.stringify(
            {
              enabled: company?.calendly?.enabled,
              hasAccessToken:
                company?.calendly?.accessToken !== undefined &&
                company?.calendly?.accessToken !== null,
              hasRefreshToken:
                company?.calendly?.refreshToken !== undefined &&
                company?.calendly?.refreshToken !== null,
              userUri: company?.calendly?.userUri,
              connectedAt: company?.calendly?.connectedAt,
            },
            null,
            2
          )
        );
        throw new Error('Calendly connection was not saved properly');
      }

      // Setup graduate and application
      const graduateRegisterResponse = await graduateAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'graduate9@example.com',
          password: 'Password123!',
          role: 'graduate',
        })
        .expect(201);

      const graduateToken = graduateRegisterResponse.body.accessToken;
      const graduateUserId = graduateRegisterResponse.body.user.id;

      await User.findByIdAndUpdate(graduateUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      const graduateProfile = await Graduate.create({
        userId: new mongoose.Types.ObjectId(graduateUserId),
        ...buildGraduateProfilePayload(),
        workExperiences: [],
      });

      await graduateAgent
        .post(`/api/v1/graduates/apply/${jobId}`)
        .set('Authorization', `Bearer ${graduateToken}`)
        .send({
          coverLetter: 'I am interested in this position.',
        })
        .expect(201);

      const application = await Application.findOne({
        graduateId: graduateProfile._id,
        jobId,
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const job = await Job.findById(jobId).populate('companyId').lean();
      if (!job) {
        throw new Error('Job not found');
      }

      // Create existing interview
      await Interview.create({
        applicationId: application._id,
        jobId: new mongoose.Types.ObjectId(jobId),
        companyId: (job.companyId as any)._id,
        companyUserId: new mongoose.Types.ObjectId(companyUserId),
        graduateId: graduateProfile._id,
        graduateUserId: new mongoose.Types.ObjectId(graduateUserId),
        scheduledAt: new Date('2024-12-20T10:00:00Z'),
        durationMinutes: 30,
        status: 'scheduled',
        roomSlug: 'existing-room-slug',
        roomUrl: 'https://example.com/room',
        provider: 'calendly',
        createdBy: new mongoose.Types.ObjectId(graduateUserId),
      });

      // Try to schedule another interview
      await graduateAgent
        .post(
          `/api/v1/graduates/applications/${application._id}/calendly/schedule`
        )
        .set('Authorization', `Bearer ${graduateToken}`)
        .send({
          eventTypeUri: 'https://api.calendly.com/event_types/EVT123',
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours in future
          inviteeEmail: 'graduate9@example.com',
          inviteeName: 'John Doe',
        })
        .expect(400);
    });
  });

  describe('Webhook Handling', () => {
    it('should handle invitee.created webhook and update interview', async () => {
      const companyAgent = request.agent(app);
      const graduateAgent = request.agent(app);

      // Setup company with Calendly
      const companyRegisterResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company10@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
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

      const jobId = jobResponse.body.job._id ?? jobResponse.body.job.id;

      // Setup graduate and application
      const graduateRegisterResponse = await graduateAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'graduate10@example.com',
          password: 'Password123!',
          role: 'graduate',
        })
        .expect(201);

      const graduateToken = graduateRegisterResponse.body.accessToken;
      const graduateUserId = graduateRegisterResponse.body.user.id;

      await User.findByIdAndUpdate(graduateUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      const graduateProfile = await Graduate.create({
        userId: new mongoose.Types.ObjectId(graduateUserId),
        ...buildGraduateProfilePayload(),
        workExperiences: [],
      });

      await graduateAgent
        .post(`/api/v1/graduates/apply/${jobId}`)
        .set('Authorization', `Bearer ${graduateToken}`)
        .send({
          coverLetter: 'I am interested in this position.',
        })
        .expect(201);

      const application = await Application.findOne({
        graduateId: graduateProfile._id,
        jobId,
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const job = await Job.findById(jobId).populate('companyId').lean();
      if (!job) {
        throw new Error('Job not found');
      }

      const mockEventUri = 'https://api.calendly.com/scheduled_events/EVT123';
      const _mockInviteeUri = 'https://api.calendly.com/invitees/INV123';

      // Create interview
      const interview = await Interview.create({
        applicationId: application._id,
        jobId: new mongoose.Types.ObjectId(jobId),
        companyId: (job.companyId as any)._id,
        companyUserId: new mongoose.Types.ObjectId(companyUserId),
        graduateId: graduateProfile._id,
        graduateUserId: new mongoose.Types.ObjectId(graduateUserId),
        scheduledAt: new Date('2024-12-20T10:00:00Z'),
        durationMinutes: 30,
        status: 'scheduled',
        roomSlug: 'test-room-slug',
        roomUrl: 'https://example.com/room',
        provider: 'calendly',
        calendlyEventUri: mockEventUri,
        calendlyEventTypeUri: 'https://api.calendly.com/event_types/EVT123',
        createdBy: new mongoose.Types.ObjectId(graduateUserId),
      });

      // Mock webhook signature verification
      (
        calendlyService.default.verifyWebhookSignature as jest.Mock
      ).mockReturnValue(true);

      // Simulate webhook payload
      const webhookPayload = {
        event: 'invitee.created',
        time: new Date().toISOString(),
        payload: {
          event_uri: mockEventUri,
          invitee_uri: _mockInviteeUri,
          invitee: {
            uri: _mockInviteeUri,
            name: 'John Doe',
            email: 'graduate10@example.com',
            text_reminder_number: null,
            timezone: 'America/New_York',
            event: mockEventUri,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            canceled: false,
            cancellation: null,
            rescheduled: false,
            old_invitee: null,
            new_invitee: null,
            questions_and_answers: [],
            tracking: {
              utm_campaign: null,
              utm_source: null,
              utm_medium: null,
              utm_content: null,
              utm_term: null,
              salesforce_uuid: null,
            },
            cancel_url: 'https://calendly.com/cancellations/INV123',
            reschedule_url: 'https://calendly.com/reschedulings/INV123',
          },
        },
      };

      const webhookResponse = await request(app)
        .post('/api/v1/webhooks/calendly')
        .set('Content-Type', 'application/json')
        .set('Calendly-Webhook-Signature', 'mock_signature')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body).toEqual(
        expect.objectContaining({
          message: 'Webhook processed successfully',
        })
      );

      // Verify interview was updated with invitee URI
      const updatedInterview = await Interview.findById(interview._id).lean();
      expect(updatedInterview?.calendlyInviteeUri).toBe(_mockInviteeUri);
    });

    it('should handle invitee.canceled webhook and update interview status', async () => {
      const companyAgent = request.agent(app);
      const graduateAgent = request.agent(app);

      // Setup company with Calendly
      const companyRegisterResponse = await companyAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'company11@testcorp.com',
          password: 'Password123!',
          role: 'company',
          companyWebsite: 'https://testcorp.com',
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

      const jobId = jobResponse.body.job._id ?? jobResponse.body.job.id;

      // Setup graduate and application
      const graduateRegisterResponse = await graduateAgent
        .post('/api/v1/auth/register')
        .send({
          email: 'graduate11@example.com',
          password: 'Password123!',
          role: 'graduate',
        })
        .expect(201);

      const graduateToken = graduateRegisterResponse.body.accessToken;
      const graduateUserId = graduateRegisterResponse.body.user.id;

      await User.findByIdAndUpdate(graduateUserId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      const graduateProfile = await Graduate.create({
        userId: new mongoose.Types.ObjectId(graduateUserId),
        ...buildGraduateProfilePayload(),
        workExperiences: [],
      });

      await graduateAgent
        .post(`/api/v1/graduates/apply/${jobId}`)
        .set('Authorization', `Bearer ${graduateToken}`)
        .send({
          coverLetter: 'I am interested in this position.',
        })
        .expect(201);

      const application = await Application.findOne({
        graduateId: graduateProfile._id,
        jobId,
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const job = await Job.findById(jobId).populate('companyId').lean();
      if (!job) {
        throw new Error('Job not found');
      }

      const mockEventUri = 'https://api.calendly.com/scheduled_events/EVT123';
      const _mockInviteeUri = 'https://api.calendly.com/invitees/INV123';

      // Create interview
      const interview = await Interview.create({
        applicationId: application._id,
        jobId: new mongoose.Types.ObjectId(jobId),
        companyId: (job.companyId as any)._id,
        companyUserId: new mongoose.Types.ObjectId(companyUserId),
        graduateId: graduateProfile._id,
        graduateUserId: new mongoose.Types.ObjectId(graduateUserId),
        scheduledAt: new Date('2024-12-20T10:00:00Z'),
        durationMinutes: 30,
        status: 'scheduled',
        roomSlug: 'test-room-slug',
        roomUrl: 'https://example.com/room',
        provider: 'calendly',
        calendlyEventUri: mockEventUri,
        calendlyEventTypeUri: 'https://api.calendly.com/event_types/EVT123',
        calendlyInviteeUri: _mockInviteeUri,
        createdBy: new mongoose.Types.ObjectId(graduateUserId),
      });

      // Mock webhook signature verification
      (
        calendlyService.default.verifyWebhookSignature as jest.Mock
      ).mockReturnValue(true);

      // Simulate cancel webhook payload
      const webhookPayload = {
        event: 'invitee.canceled',
        time: new Date().toISOString(),
        payload: {
          event_uri: mockEventUri,
          invitee_uri: _mockInviteeUri,
          invitee: {
            uri: _mockInviteeUri,
            name: 'John Doe',
            email: 'graduate11@example.com',
            canceled: true,
            cancellation: {
              canceled_by: 'invitee',
              reason: 'No longer available',
              canceler_type: 'invitee',
            },
          },
        },
      };

      const webhookResponse = await request(app)
        .post('/api/v1/webhooks/calendly')
        .set('Content-Type', 'application/json')
        .set('Calendly-Webhook-Signature', 'mock_signature')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body).toEqual(
        expect.objectContaining({
          message: 'Webhook processed successfully',
        })
      );

      // Verify interview status was updated
      const updatedInterview = await Interview.findById(interview._id).lean();
      expect(updatedInterview?.status).toBe('cancelled');

      // Verify notification was created
      const notification = await Notification.findOne({
        userId: graduateUserId,
        type: 'interview',
        relatedType: 'interview',
        relatedId: interview._id,
      }).lean();

      expect(notification).toBeDefined();
      expect(notification?.read).toBe(false);
    });
  });
});
