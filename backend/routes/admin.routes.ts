import { Router } from 'express';
import {
  getAllUsers,
  searchUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllJobs,
  getAllMatches,
  getAIStats,
  getSystemStats,
  getUserActivityLogs,
  getHealthStatus,
  getDatabaseStats,
} from '../controllers/admin.controller';
import {
  authenticate,
  authorize,
  requireEmailVerification,
} from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication, email verification, and admin role
router.use(authenticate);
router.use(authorize('admin'));
router.use(requireEmailVerification);

router.get('/users', getAllUsers);
router.get('/users/search', searchUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.get('/jobs', getAllJobs);
router.get('/matches', getAllMatches);
router.get('/ai-stats', getAIStats);
router.get('/system-stats', getSystemStats);
router.get('/user-activity', getUserActivityLogs);
router.get('/health', getHealthStatus);
router.get('/db-stats', getDatabaseStats);

export default router;
