import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getApplicationAnalytics, getJobAnalytics, getUserAnalytics } from '../controllers/analytics.controller';

const router = Router();

router.get('/applications', authenticate, authorize('employer'), getApplicationAnalytics);
router.get('/jobs', authenticate, authorize('employer'), getJobAnalytics);
router.get('/user', authenticate, getUserAnalytics);

export default router;
