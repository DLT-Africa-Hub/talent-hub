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
  updateMatchStatus,
  getApplications,
} from '../controllers/company.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize('company'));

router.get('/profile', getProfile);
router.post('/profile', createProfile);
router.put('/profile', updateProfile);
router.post('/jobs', createJob);
router.get('/jobs', getJobs);
router.get('/jobs/:jobId', getJob);
router.put('/jobs/:jobId', updateJob);
router.delete('/jobs/:jobId', deleteJob);
router.get('/jobs/:jobId/matches', getJobMatches);
router.put('/jobs/:jobId/matches/:matchId', updateMatchStatus);
router.get('/applications', getApplications);

export default router;

