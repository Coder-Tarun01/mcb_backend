import { Router } from 'express';
import { listCandidates, getCandidate, getCandidateResumeDownloadUrl } from '../controllers/candidates.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.get('/', listCandidates);
router.get('/:id', getCandidate);
router.get('/:id/resume/download', authenticate, authorize('employer'), getCandidateResumeDownloadUrl);
// Note: POST, PUT, DELETE are not needed since we use real User records
export default router;
