import { Router } from 'express';
import {
  getProfile,
  createProfile,
  updateProfile,
  updateProfilePicture,
  replaceSkills,
  addSkill,
  removeSkill,
  updateEducation,
  addWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
  submitAssessment,
  getMatches,
  getMatchById,
  applyToJob,
  getApplications,
  updateApplicationStatus,
} from '../controllers/graduate.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize('graduate'));

router.get('/profile', getProfile);
router.post('/profile', createProfile);
router.put('/profile', updateProfile);
router.patch('/profile/picture', updateProfilePicture);

router.put('/profile/skills', replaceSkills);
router.post('/profile/skills', addSkill);
router.delete('/profile/skills', removeSkill);

router.put('/profile/education', updateEducation);

router.post('/profile/work-experiences', addWorkExperience);
router.put('/profile/work-experiences/:experienceId', updateWorkExperience);
router.delete('/profile/work-experiences/:experienceId', deleteWorkExperience);

router.post('/assessment', submitAssessment);
router.get('/matches', getMatches);
router.get('/matches/:matchId', getMatchById);
router.post('/apply/:jobId', applyToJob);
router.get('/applications', getApplications);
router.put('/applications/:applicationId', updateApplicationStatus);

export default router;

