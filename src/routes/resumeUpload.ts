import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadAndParseResume, uploadMiddleware } from '../controllers/resumeUpload.controller';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Upload and parse resume
router.post('/upload-and-parse', uploadMiddleware, uploadAndParseResume);

export default router;
