import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getResumes,
  getResume,
  createResume,
  updateResume,
  deleteResume,
  setPrimaryResume,
  duplicateResume,
  getResumeStats,
  exportResume
} from '../controllers/resume.controller';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Resume routes
router.get('/', getResumes);                    // GET /api/resume - Get all resumes
router.get('/stats', getResumeStats);           // GET /api/resume/stats - Get resume statistics
router.get('/:id', getResume);                  // GET /api/resume/:id - Get single resume
router.post('/', createResume);                 // POST /api/resume - Create new resume
router.put('/:id', updateResume);               // PUT /api/resume/:id - Update resume
router.delete('/:id', deleteResume);            // DELETE /api/resume/:id - Delete resume
router.patch('/:id/primary', setPrimaryResume); // PATCH /api/resume/:id/primary - Set as primary
router.post('/:id/duplicate', duplicateResume); // POST /api/resume/:id/duplicate - Duplicate resume
router.get('/:id/export', exportResume);        // GET /api/resume/:id/export - Export resume

export default router;
