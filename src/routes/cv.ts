import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getCVFiles,
  getCVFile,
  uploadCVFile,
  updateCVFile,
  setPrimaryCVFile,
  downloadCVFile,
  deleteCVFile,
  getCVStats,
  renameCVFile,
  viewCVFile,
  uploadMiddleware
} from '../controllers/cv.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all CV files for the authenticated user
router.get('/', getCVFiles);

// Get CV file statistics
router.get('/stats', getCVStats);

// Get a specific CV file
router.get('/:id', getCVFile);

// View a CV file (for preview)
router.get('/:id/view', viewCVFile);

// Upload a new CV file
router.post('/upload', uploadMiddleware, uploadCVFile);

// Update a CV file
router.put('/:id', updateCVFile);

// Rename a CV file
router.patch('/:id/rename', renameCVFile);

// Set primary CV file
router.patch('/:id/primary', setPrimaryCVFile);

// Download a CV file
router.get('/:id/download', downloadCVFile);

// Delete a CV file
router.delete('/:id', deleteCVFile);

export default router;
