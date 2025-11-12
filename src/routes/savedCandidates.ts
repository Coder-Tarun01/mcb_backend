import { Router } from 'express';
import { getSavedCandidates, saveCandidate, unsaveCandidate, checkIfSaved } from '../controllers/savedCandidates.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // All routes require authentication

router.get('/', getSavedCandidates);
router.post('/', saveCandidate);
router.delete('/:candidateId', unsaveCandidate);
router.get('/:candidateId/check', checkIfSaved);

export default router;

