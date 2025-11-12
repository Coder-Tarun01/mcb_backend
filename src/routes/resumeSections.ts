import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  // Resume Headline
  getResumeHeadline,
  updateResumeHeadline,
  
  // Skills
  getSkills,
  updateSkills,
  
  // Employment
  getEmployment,
  updateEmployment,
  
  // Education
  getEducation,
  updateEducation,
  
  // Projects
  getProjects,
  updateProjects,
  
  // Profile Summary
  getProfileSummary,
  updateProfileSummary,
  
  // Accomplishments
  getAccomplishments,
  updateAccomplishments,
  
  // Desired Career Profile
  getDesiredCareer,
  updateDesiredCareer,
  
  // Personal Details
  getPersonalDetails,
  updatePersonalDetails,
  
  // Resume Overview
  getResumeOverview,
  
  // Generic CRUD operations
  createResumeSection,
  deleteResumeSection
} from '../controllers/resumeSections.controller';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Resume Overview
router.get('/overview', getResumeOverview);

// Resume Headline
router.get('/headline', getResumeHeadline);
router.put('/headline', updateResumeHeadline);

// Skills
router.get('/skills', getSkills);
router.put('/skills', updateSkills);

// Employment
router.get('/employment', getEmployment);
router.put('/employment', updateEmployment);

// Education
router.get('/education', getEducation);
router.put('/education', updateEducation);

// Projects
router.get('/projects', getProjects);
router.put('/projects', updateProjects);

// Profile Summary
router.get('/profile-summary', getProfileSummary);
router.put('/profile-summary', updateProfileSummary);

// Accomplishments
router.get('/accomplishments', getAccomplishments);
router.put('/accomplishments', updateAccomplishments);

// Desired Career Profile
router.get('/desired-career', getDesiredCareer);
router.put('/desired-career', updateDesiredCareer);

// Personal Details
router.get('/personal-details', getPersonalDetails);
router.put('/personal-details', updatePersonalDetails);

// Generic CRUD operations for array items
router.post('/:section', createResumeSection);
router.delete('/:section/:itemId', deleteResumeSection);

export default router;
