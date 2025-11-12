import type { Express, NextFunction, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { User } from '../models';
import type { UserAttributes } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { uploadToS3, deleteFromS3 } from '../services/s3Service';

// Configure multer for S3 uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
    if (file.fieldname === 'avatar') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed for avatars'));
      }
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed for resumes'));
    }
  }
});

export const uploadResume = upload.single('resume');
export const uploadAvatar = upload.single('avatar');

const SIMPLE_STRING_FIELDS = ['name', 'phone', 'companyName'] as const;
type SimpleStringField = (typeof SIMPLE_STRING_FIELDS)[number];

const FILE_URL_FIELDS = ['avatarUrl', 'resumeUrl', 'companyLogo'] as const;
type FileUrlField = (typeof FILE_URL_FIELDS)[number];

const ADDITIONAL_FIELDS = [
  'professionalTitle',
  'languages',
  'age',
  'currentSalary',
  'expectedSalary',
  'description',
  'country',
  'postcode',
  'city',
  'fullAddress'
] as const;
type AdditionalField = (typeof ADDITIONAL_FIELDS)[number];

type MutablePartialUser = Partial<UserAttributes>;

function getAuthUserId(req: Request): string | undefined {
  return (req as AuthRequest).user?.id;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function sanitizeProfilePayload(body: unknown): MutablePartialUser {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const source = body as Record<string, unknown>;
  const result: MutablePartialUser = {};

  for (const field of SIMPLE_STRING_FIELDS) {
    const value = source[field];
    if (isString(value) && value.trim().length > 0) {
      result[field] = value.trim();
    }
  }

  for (const field of FILE_URL_FIELDS) {
    const value = source[field];
    if (
      isString(value) &&
      (value.startsWith('https://') || value.startsWith('/uploads/'))
    ) {
      result[field] = value;
    }
  }

  const skillsValue = source.skills;
  if (Array.isArray(skillsValue)) {
    const normalized = skillsValue
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .map((entry) => entry.trim());
    if (normalized.length > 0) {
      result.skills = normalized;
    }
  } else if (isString(skillsValue) && skillsValue.trim().length > 0) {
    result.skills = [skillsValue.trim()];
  }

  for (const field of ADDITIONAL_FIELDS) {
    const value = source[field];
    if (isString(value)) {
      result[field] = value;
    }
  }

  return result;
}

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const { password, ...profile } = user.toJSON();
    res.json(profile);
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    console.log('🔍 Profile Update Request:', {
      userId,
      updateData: req.body,
      timestamp: new Date().toISOString()
    });

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    console.log('📊 Current User Data:', user.toJSON());

    const updateData = sanitizeProfilePayload(req.body);

    console.log('📝 Filtered Update Data:', updateData);

    try {
      await user.update(updateData);
      console.log('✅ Database Update Completed');
    } catch (updateError) {
      console.error('❌ Database Update Failed:', updateError);
      const message = updateError instanceof Error ? updateError.message : 'Unknown error';
      res.status(500).json({
        message: 'Failed to update profile in database',
        error: message
      });
      return;
    }

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!updatedUser) {
      res.status(500).json({ message: 'Failed to retrieve updated user data' });
      return;
    }

    console.log('🔄 Updated User Data from DB:', updatedUser.toJSON());

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toJSON(),
      updatedFields: Object.keys(updateData)
    });
  } catch (error: unknown) {
    console.error('❌ Profile Update Error:', error);
    next(error);
  }
}

export async function uploadResumeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const uploadResult = await uploadToS3(req.file, 'resumes');
    await user.update({ resumeUrl: uploadResult.url });

    res.json({
      message: 'Resume uploaded successfully',
      resumeUrl: uploadResult.url,
      s3Key: uploadResult.key
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadAvatarHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    console.log('🔄 Uploading avatar to S3...', {
      userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    if (user.avatarUrl && user.avatarUrl.includes('amazonaws.com')) {
      try {
        const urlParts = user.avatarUrl.split('/');
        const s3Key = urlParts.slice(3).join('/');
        await deleteFromS3(s3Key);
        console.log('🗑️ Deleted old avatar from S3:', s3Key);
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete old avatar:', deleteError);
      }
    }

    const uploadResult = await uploadToS3(req.file, 'avatars');
    console.log('✅ Avatar uploaded to S3:', uploadResult);

    await user.update({ avatarUrl: uploadResult.url });

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: uploadResult.url,
      s3Key: uploadResult.key
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Avatar upload error:', error);
    res.status(500).json({
      message: 'Failed to upload avatar',
      error: message
    });
  }
}

export async function getSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ skills: user.skills ?? [] });
  } catch (error) {
    next(error);
  }
}

export async function updateSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { skills } = req.body as { skills?: unknown };
    if (!Array.isArray(skills)) {
      res.status(400).json({ message: 'Skills must be an array' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await user.update({ skills });
    res.json({ skills });
  } catch (error) {
    next(error);
  }
}
