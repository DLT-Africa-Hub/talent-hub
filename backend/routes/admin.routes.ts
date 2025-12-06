import { Router, type IRouter } from 'express';
import {
  // User Management
  getAllUsers,
  searchUsers,
  getUserById,
  updateUser,
  deleteUser,
  
  // Job Management
  getAllJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
  getJobStatistics,
  getJobApplications,

  // Match Management
  getAllMatches,
  
  // Statistics
  getAIStats,
  getSystemStats,
  getUserActivityLogs,
  getHealthStatus,
  getDatabaseStats,
  getRankStatistics,
  getGraduatesCount,
  getCompanyCount,
  getActiveJobsCount,
  getApplicationActivityDetail,
  
  // Company Management
  getCompanyById,
  companiesStatsProvider,
  getAllCompanies,
  getCompanyDetails,
  toggleCompanyStatus,
  
  // Graduate Management
  getAllGraduates,
  getGraduateById,
} from '../controllers/admin.controller';

import {
  authenticate,
  authorize,
  requireEmailVerification,
} from '../middleware/auth.middleware';

const router: IRouter = Router();

// ============================================
// MIDDLEWARE - All routes require authentication, email verification, and admin role
// ============================================
router.use(authenticate);
router.use(authorize('admin'));
router.use(requireEmailVerification);

// ============================================
// USER MANAGEMENT ROUTES
// ============================================
router.get('/users', getAllUsers);
router.get('/users/search', searchUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

// ============================================
// JOB MANAGEMENT ROUTES
// ============================================
// Statistics must come before :jobId to avoid route conflicts
router.get('/jobs/statistics', getJobStatistics);

// Job CRUD operations
router.get('/jobs', getAllJobs); // List all jobs with filters
router.get('/jobs/:jobId', getJobById); // Get job details
router.put('/jobs/:jobId', updateJob); // Update job details
router.delete('/jobs/:jobId', deleteJob); // Delete job

// Job status management
router.put('/jobs/:jobId/status', updateJobStatus); // Activate/deactivate job

// Job applications
router.get('/jobs/:jobId/applications', getJobApplications); // Get applications for a job

// ============================================
// MATCH MANAGEMENT ROUTES
// ============================================
router.get('/matches', getAllMatches);

// ============================================
// COMPANY MANAGEMENT ROUTES
// ============================================
router.get('/companies', getAllCompanies);
router.get('/companies/:companyId', getCompanyDetails);
router.put('/companies/:companyId/status', toggleCompanyStatus);
router.get('/get-a-company/:companyId', getCompanyById); // Backward compatibility
router.get('/companies-stats', companiesStatsProvider);

// ============================================
// GRADUATE MANAGEMENT ROUTES
// ============================================
router.get('/graduates', getAllGraduates);
router.get('/graduates/:graduateId', getGraduateById);

// ============================================
// STATISTICS & MONITORING ROUTES
// ============================================
router.get('/ai-stats', getAIStats);
router.get('/system-stats', getSystemStats);
router.get('/user-activity', getUserActivityLogs);
router.get('/health', getHealthStatus);
router.get('/db-stats', getDatabaseStats);
router.get('/rank-statistics', getRankStatistics);
router.get('/talent-count', getGraduatesCount);
router.get('/company-count', getCompanyCount);
router.get('/active-jobs', getActiveJobsCount);
router.get('/application-activity-detail', getApplicationActivityDetail);

export default router;