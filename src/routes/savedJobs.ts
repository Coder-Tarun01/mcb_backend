import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getSavedJobs, 
  saveJob, 
  unsaveJob, 
  checkJobSaved, 
  bulkSaveJobs, 
  bulkUnsaveJobs, 
  getSavedJobsStats 
} from '../controllers/savedJobs.controller';

const router = Router();
router.use(authenticate);

router.get('/', getSavedJobs);
router.post('/', saveJob);
router.delete('/:jobId', unsaveJob);
router.get('/check/:jobId', checkJobSaved);
router.post('/bulk-save', bulkSaveJobs);
router.post('/bulk-unsave', bulkUnsaveJobs);
router.get('/stats', getSavedJobsStats);

export default router;
