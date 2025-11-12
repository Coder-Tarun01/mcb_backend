import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, authorize } from '../middleware/auth';
import {
  getUserApplications,
  applyToJob,
  getApplication,
  updateApplication,
  withdrawApplication,
  getJobApplications,
  getAllEmployerApplications,
  getEmployerStats,
  uploadResumeMiddleware
} from '../controllers/applications.controller';

const router = Router();
router.use(authenticate);

// Use controller-provided upload middleware; remove redundant local multer

// Employer-specific routes (must come before parameter routes)
router.get('/employer/all', authorize('employer'), getAllEmployerApplications);
router.get('/employer/stats', authorize('employer'), getEmployerStats);
router.get('/job/:jobId', authorize('employer'), getJobApplications);

// Employee routes
router.get('/', getUserApplications);
router.post('/', uploadResumeMiddleware, applyToJob);
router.get('/:id', getApplication);
router.put('/:id', updateApplication);
router.delete('/:id', withdrawApplication);

export default router;
