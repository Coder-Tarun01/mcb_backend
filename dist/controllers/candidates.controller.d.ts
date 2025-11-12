import { Request, Response, NextFunction } from 'express';
export declare function listCandidates(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getCandidate(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get a signed download URL for a candidate's resume (employer-only)
 */
export declare function getCandidateResumeDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Download candidate resume
 * Generates a signed URL for S3 files or returns the resume URL directly
 */
export declare function downloadCandidateResume(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=candidates.controller.d.ts.map