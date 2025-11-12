import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  searchJobs, 
  getFilterOptions, 
  getRecommendedJobs
} from '../controllers/search.controller';

const router = Router();

router.get('/jobs', searchJobs);
router.get('/filters', getFilterOptions);
router.get('/recommended', authenticate, getRecommendedJobs);

export default router;
