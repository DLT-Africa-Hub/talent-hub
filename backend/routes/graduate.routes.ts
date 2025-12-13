import { Router, type IRouter } from 'express';
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
  getAssessmentQuestions,
  submitAssessment,
  getMatches,
  getMatchById,
  applyToJob,
  getApplications,
  updateApplicationStatus,
  getAvailableJobs,
  getCVs,
  addCV,
  deleteCV,
  updateCVDisplay,
  alreadyApplied,
  getInterviews,
} from '../controllers/graduate.controller';
import {
  getPendingSelectionInterviews,
  selectTimeSlot,
  getCalendlyAvailability,
  scheduleCalendlyInterview,
} from '../controllers/interview.controller';
import {
  getOffer,
  getOfferById,
  uploadSignedOffer,
  acceptOffer,
  rejectOffer,
} from '../controllers/offer.controller';
import {
  authenticate,
  authorize,
  requireEmailVerification,
} from '../middleware/auth.middleware';

const router: IRouter = Router();

// All routes require authentication and graduate role
router.use(authenticate);
router.use(authorize('graduate'));

// Routes that don't require email verification (onboarding and assessment)
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

router.get('/assessment/questions', getAssessmentQuestions);
router.post('/assessment', submitAssessment);

router.get('/profile/cv', getCVs);
router.post('/profile/cv', addCV);
router.delete('/profile/cv/:cvId', deleteCV);
router.patch('/profile/cv/:cvId/display', updateCVDisplay);

// Routes that require email verification (job matching and applications)
router.use(requireEmailVerification);

router.get('/jobs', getAvailableJobs);
router.get('/matches', getMatches);
router.get('/matches/:matchId', getMatchById);
router.get('/apply/:jobId/already-applied', alreadyApplied);
router.post('/apply/:jobId', applyToJob);

router.get('/applications', getApplications);
router.get('/interviews', getInterviews);
router.get('/interviews/pending-selection', getPendingSelectionInterviews);
router.post('/interviews/:interviewId/select-slot', selectTimeSlot);
router.put('/applications/:applicationId', updateApplicationStatus);

// Offer management
router.get('/offers/:applicationId', getOffer);
router.get('/offers/by-id/:offerId', getOfferById);
router.post('/offers/:offerId/upload-signed', uploadSignedOffer);
router.post('/offers/:offerId/accept', acceptOffer);
router.post('/offers/:offerId/reject', rejectOffer);

// Calendly integration - Candidates view company availability and schedule
router.get(
  '/applications/:applicationId/calendly/availability',
  getCalendlyAvailability
);
router.post(
  '/applications/:applicationId/calendly/schedule',
  scheduleCalendlyInterview
);

export default router;
