/**
 * AWS S3 Service for File Uploads
 * Handles file uploads to AWS S3 bucket with proper error handling
 */

import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Create S3 instance
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

// File upload interface
interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

/**
 * Upload file to S3 bucket
 * @param file - Multer file object
 * @param folder - Optional folder path in S3 bucket
 * @returns Promise<UploadResult>
 */
export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<UploadResult> => {
  try {
    // Validate file type
    if (!ALLOWED_FILE_TYPES[file.mimetype as keyof typeof ALLOWED_FILE_TYPES]) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    // Generate unique filename
    const fileExtension = ALLOWED_FILE_TYPES[file.mimetype as keyof typeof ALLOWED_FILE_TYPES];
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const key = `${folder}/${uniqueFileName}`;

    // S3 upload parameters
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Removed ACL: 'public-read' - bucket doesn't allow ACLs
      Metadata: {
        'original-name': file.originalname,
        'uploaded-at': new Date().toISOString()
      }
    };

    // Upload to S3
    const result = await s3.upload(uploadParams).promise();

    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket
    };

  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete file from S3 bucket
 * @param key - S3 object key
 * @returns Promise<boolean>
 */
export const deleteFromS3 = async (key: string): Promise<boolean> => {
  try {
    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key
    };

    await s3.deleteObject(deleteParams).promise();
    return true;

  } catch (error) {
    console.error('S3 Delete Error:', error);
    return false;
  }
};

/**
 * Get file URL from S3 key
 * @param key - S3 object key
 * @returns string - Public URL
 */
export const getS3Url = (key: string): string => {
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

/**
 * Generate a signed URL for downloading a file from S3
 * @param key - S3 object key (can be extracted from full URL or be just the key)
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise<string> - Signed URL for downloading the file
 */
export const getSignedUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  try {
    const bucketName = process.env.AWS_BUCKET_NAME!;

    let s3Key: string = key;

    try {
      const parsed = new URL(key);

      const hostnameParts = parsed.hostname.split('.');
      const isVirtualHostedStyle = hostnameParts[0] === bucketName;
      const isPathStyle = hostnameParts[0] === 's3';

      let pathname = decodeURIComponent(parsed.pathname || '');
      pathname = pathname.replace(/^\/+/g, '');

      if (isVirtualHostedStyle) {
        s3Key = pathname;
      } else if (isPathStyle) {
        const segments = pathname.split('/').filter(Boolean);
        if (segments[0] === bucketName) {
          segments.shift();
        }
        s3Key = segments.join('/');
      } else {
        s3Key = pathname || parsed.searchParams.get('key') || '';
      }
    } catch {
      s3Key = key;
    }

    if (s3Key.includes('?')) {
      const cleanKey = s3Key.split('?')[0] ?? '';
      s3Key = cleanKey;
    }

    s3Key = s3Key.replace(/^\/+/g, '');

    if (!s3Key) {
      throw new Error('Empty S3 object key derived from URL');
    }

    const params = {
      Bucket: bucketName,
      Key: s3Key,
      Expires: expiresIn,
    };

    const signedUrl = s3.getSignedUrl('getObject', params);
    return signedUrl;
  } catch (error) {
    console.error('S3 Signed URL Error:', error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Validate AWS credentials and bucket access
 * @returns Promise<boolean>
 */
export const validateS3Config = async (): Promise<boolean> => {
  try {
    // Check if required environment variables are set
    const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing AWS environment variables:', missingVars);
      return false;
    }

    // Test S3 access by trying to upload a small test file (since ListBucket might be denied)
    const testKey = `health-check-${Date.now()}.txt`;
    const testContent = 'Health check test file';
    
    try {
      await s3.upload({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain'
      }).promise();
      
      console.log('✅ AWS S3 configuration validated successfully');
      return true;
    } catch (uploadError) {
      console.error('❌ AWS S3 upload test failed:', uploadError);
      return false;
    }

  } catch (error) {
    console.error('❌ AWS S3 configuration validation failed:', error);
    return false;
  }
};

export default {
  uploadToS3,
  deleteFromS3,
  getS3Url,
  getSignedUrl,
  validateS3Config
};
