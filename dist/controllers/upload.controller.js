"use strict";
/**
 * File Upload Controller
 * Handles file uploads to AWS S3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadHealthCheck = exports.uploadMultipleFiles = exports.uploadFile = void 0;
const s3Service_1 = require("../services/s3Service");
/**
 * Upload single file to S3
 * POST /upload
 */
const uploadFile = async (req, res) => {
    try {
        // Check if file exists in request
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No file provided. Please upload a file with field name "file".'
            });
            return;
        }
        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
            res.status(400).json({
                success: false,
                message: 'File size too large. Maximum allowed size is 10MB.'
            });
            return;
        }
        // Get folder from query parameter (optional)
        const folder = req.query.folder || 'uploads';
        // Upload file to S3
        const result = await (0, s3Service_1.uploadToS3)(req.file, folder);
        // Return success response
        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: result.url,
                key: result.key,
                bucket: result.bucket,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    }
    catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to upload file',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};
exports.uploadFile = uploadFile;
/**
 * Upload multiple files to S3
 * POST /upload/multiple
 */
const uploadMultipleFiles = async (req, res) => {
    try {
        // Check if files exist in request
        if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
            res.status(400).json({
                success: false,
                message: 'No files provided. Please upload files with field name "files".'
            });
            return;
        }
        const files = Array.isArray(req.files) ? req.files : (req.files && 'files' in req.files ? req.files.files : undefined);
        const folder = req.query.folder || 'uploads';
        if (!files || files.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No files provided. Please upload files with field name "files".'
            });
            return;
        }
        // Validate file count (max 5 files)
        if (files.length > 5) {
            res.status(400).json({
                success: false,
                message: 'Too many files. Maximum allowed is 5 files per request.'
            });
            return;
        }
        // Upload all files
        const uploadPromises = files.map(file => (0, s3Service_1.uploadToS3)(file, folder));
        const results = await Promise.all(uploadPromises);
        // Return success response
        res.status(200).json({
            success: true,
            message: `${results.length} files uploaded successfully`,
            data: results.map((result, index) => {
                const file = files[index];
                return {
                    url: result.url,
                    key: result.key,
                    bucket: result.bucket,
                    originalName: file?.originalname || '',
                    size: file?.size || 0,
                    mimetype: file?.mimetype || ''
                };
            })
        });
    }
    catch (error) {
        console.error('Multiple Upload Error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to upload files',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};
exports.uploadMultipleFiles = uploadMultipleFiles;
/**
 * Health check for S3 service
 * GET /upload/health
 */
const uploadHealthCheck = async (req, res) => {
    try {
        const isHealthy = await (0, s3Service_1.validateS3Config)();
        if (isHealthy) {
            res.status(200).json({
                success: true,
                message: 'S3 service is healthy',
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(503).json({
                success: false,
                message: 'S3 service is not available',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('Health Check Error:', error);
        res.status(503).json({
            success: false,
            message: 'S3 service health check failed',
            error: process.env.NODE_ENV === 'development' ? error : undefined,
            timestamp: new Date().toISOString()
        });
    }
};
exports.uploadHealthCheck = uploadHealthCheck;
//# sourceMappingURL=upload.controller.js.map