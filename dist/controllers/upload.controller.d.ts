/**
 * File Upload Controller
 * Handles file uploads to AWS S3
 */
import { Request, Response } from 'express';
/**
 * Upload single file to S3
 * POST /upload
 */
export declare const uploadFile: (req: Request, res: Response) => Promise<void>;
/**
 * Upload multiple files to S3
 * POST /upload/multiple
 */
export declare const uploadMultipleFiles: (req: Request, res: Response) => Promise<void>;
/**
 * Health check for S3 service
 * GET /upload/health
 */
export declare const uploadHealthCheck: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=upload.controller.d.ts.map