import { Router } from 'express';
import {
  getProfile,
  createProfile,
  updateProfile,
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  getJobMatches,
  getAllMatches,
  updateMatchStatus,
  getApplications,
  updateApplicationStatus,
  scheduleInterview,
  getCompanyInterviews,
  getAvailableGraduates,
} from '../controllers/company.controller';
import { suggestTimeSlots } from '../controllers/interview.controller';
import {
  authenticate,
  authorize,
  requireEmailVerification,
} from '../middleware/auth.middleware';
import {
  strictLimiter,
  veryStrictLimiter,
} from '../middleware/rateLimit.middleware';

const router = Router();

// All routes require authentication and company role
router.use(authenticate);
router.use(authorize('company'));

// Routes that don't require email verification (onboarding)
router.get('/profile', strictLimiter, getProfile);
router.post('/profile', veryStrictLimiter, createProfile);
router.put('/profile', veryStrictLimiter, updateProfile);

// Routes that require email verification (job management and applications)
router.use(requireEmailVerification);

// Apply rate limiting based on operation type
// GET operations (database queries) - strict limiter
router.get('/jobs', strictLimiter, getJobs);
router.get('/jobs/:jobId', strictLimiter, getJob);
router.get('/jobs/:jobId/matches', strictLimiter, getJobMatches);
router.get('/matches', strictLimiter, getAllMatches);
router.get('/applications', strictLimiter, getApplications);
router.get('/interviews', strictLimiter, getCompanyInterviews);
router.get('/graduates', strictLimiter, getAvailableGraduates);

// Application management
router.put('/applications/:applicationId/status', veryStrictLimiter, updateApplicationStatus);
router.post('/applications/:applicationId/schedule-interview', veryStrictLimiter, scheduleInterview);

// Interview scheduling with multiple time slots
router.post('/interviews/suggest-slots', veryStrictLimiter, suggestTimeSlots);

// Write operations (POST/PUT/DELETE) - very strict limiter
router.post('/jobs', veryStrictLimiter, createJob);
router.put('/jobs/:jobId', veryStrictLimiter, updateJob);
router.delete('/jobs/:jobId', veryStrictLimiter, deleteJob);
router.put(
  '/jobs/:jobId/matches/:matchId',
  veryStrictLimiter,
  updateMatchStatus
);

export default router;
