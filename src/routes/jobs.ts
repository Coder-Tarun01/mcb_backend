import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listJobs, getJob, createJob, updateJob, deleteJob, getEmployerJobs, recordApplyClick } from '../controllers/jobs.controller';

const router = Router();

// Public routes (no authentication required)
router.get('/', listJobs);

// Protected routes (authentication required) - specific routes before parameter routes
router.get('/employer/my-jobs', authenticate, authorize('employer'), getEmployerJobs);
router.post('/', authenticate, authorize('employer'), createJob);

// Apply click tracking (candidates only, but auth required)
router.post('/:id/apply-click', authenticate, recordApplyClick);

// Parameter routes (must come after specific routes)
// Accept either slug or id for backward compatibility
router.get('/:id', getJob);
router.put('/:id', authenticate, authorize('employer'), updateJob);
router.delete('/:id', authenticate, authorize('employer'), deleteJob);

export default router;
