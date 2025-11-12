/**
 * File Upload Routes
 * Handles file upload endpoints with multer middleware
 */

import { Router } from 'express';
import multer from 'multer';
import { uploadFile, uploadMultipleFiles, uploadHealthCheck } from '../controllers/upload.controller';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to validate file types
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed MIME types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files for multiple upload
  },
  fileFilter: fileFilter
});

// Single file upload
router.post('/', upload.single('file'), uploadFile);

// Multiple files upload
router.post('/multiple', upload.array('files', 5), uploadMultipleFiles);

// Health check endpoint
router.get('/health', uploadHealthCheck);

export default router;
