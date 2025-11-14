/**
 * AWS S3 Service for File Uploads
 * Handles file uploads to AWS S3 bucket with proper error handling
 */
interface UploadResult {
    url: string;
    key: string;
    bucket: string;
}
/**
 * Upload file to S3 bucket
 * @param file - Multer file object
 * @param folder - Optional folder path in S3 bucket
 * @returns Promise<UploadResult>
 */
export declare const uploadToS3: (file: Express.Multer.File, folder?: string) => Promise<UploadResult>;
/**
 * Delete file from S3 bucket
 * @param key - S3 object key
 * @returns Promise<boolean>
 */
export declare const deleteFromS3: (key: string) => Promise<boolean>;
/**
 * Get file URL from S3 key
 * @param key - S3 object key
 * @returns string - Public URL
 */
export declare const getS3Url: (key: string) => string;
/**
 * Generate a signed URL for downloading a file from S3
 * @param key - S3 object key (can be extracted from full URL or be just the key)
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise<string> - Signed URL for downloading the file
 */
export declare const getSignedUrl: (key: string, expiresIn?: number) => Promise<string>;
/**
 * Validate AWS credentials and bucket access
 * @returns Promise<boolean>
 */
export declare const validateS3Config: () => Promise<boolean>;
declare const _default: {
    uploadToS3: (file: Express.Multer.File, folder?: string) => Promise<UploadResult>;
    deleteFromS3: (key: string) => Promise<boolean>;
    getS3Url: (key: string) => string;
    getSignedUrl: (key: string, expiresIn?: number) => Promise<string>;
    validateS3Config: () => Promise<boolean>;
};
export default _default;
//# sourceMappingURL=s3Service.d.ts.map