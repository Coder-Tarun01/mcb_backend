import type { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import { User } from '../models';
import type { AuthRequest } from '../middleware/auth';
import { deleteFromS3, uploadToS3 } from '../services/s3Service';

// --- Upload configuration --------------------------------------------------

type FileField = 'avatarUrl' | 'resumeUrl' | 'companyLogo';
type PrimaryProfileField =
  | 'name'
  | 'phone'
  | 'companyName'
  | 'skills'
  | FileField;
type AdditionalProfileField =
  | 'professionalTitle'
  | 'languages'
  | 'age'
  | 'currentSalary'
  | 'expectedSalary'
  | 'description'
  | 'country'
  | 'postcode'
  | 'city'
  | 'fullAddress';

type ProfileField = PrimaryProfileField | AdditionalProfileField;

type ProfileUpdatePayload = Partial<Record<ProfileField, unknown>> & {
  skills?: string[];
};

const fileFields: FileField[] = ['avatarUrl', 'resumeUrl', 'companyLogo'];
const primaryFields: ProfileField[] = [
  'name',
  'phone',
  'companyName',
  'skills',
  'avatarUrl',
  'resumeUrl',
  'companyLogo'
];
const additionalFields: AdditionalProfileField[] = [
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
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const allowedAvatarTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];
    const allowedResumeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (file.fieldname === 'avatar') {
      if (allowedAvatarTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed for avatars'));
      }
      return;
    }

    if (allowedResumeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed for resumes'));
    }
  }
});

export const uploadResume: RequestHandler = upload.single('resume');
export const uploadAvatar: RequestHandler = upload.single('avatar');

// --- Helpers ----------------------------------------------------------------

const getAuthUserId = (req: Request): string | number | undefined =>
  (req as AuthRequest).user?.id;

const isString = (value: unknown): value is string => typeof value === 'string';

const isFileField = (field: ProfileField): field is FileField =>
  fileFields.includes(field as FileField);

const isValidFileUrl = (value: string): boolean =>
  value.startsWith('https://') || value.startsWith('/uploads/');

const sanitizeProfilePayload = (body: unknown): ProfileUpdatePayload => {
  const result: ProfileUpdatePayload = {};

  if (!body || typeof body !== 'object') {
    return result;
  }

  const payload = body as Record<string, unknown>;

  for (const field of primaryFields) {
    const value = payload[field];
    if (value === undefined || value === null) continue;

    if (field === 'skills') {
      if (Array.isArray(value)) {
        const normalizedSkills = value
          .filter(isString)
          .map((skill) => skill.trim())
          .filter(Boolean);
        if (normalizedSkills.length > 0) {
          result.skills = normalizedSkills;
        }
      } else if (isString(value) && value.trim()) {
        result.skills = [value.trim()];
      }
      continue;
    }

    if (isFileField(field)) {
      if (isString(value) && isValidFileUrl(value)) {
        result[field] = value;
      } else {
        console.warn(`[profile] Invalid URL format for ${field}:`, value);
      }
      continue;
    }

    if (isString(value)) {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        result[field] = trimmed;
      }
      continue;
    }

    result[field] = value;
  }

  for (const field of additionalFields) {
    const value = payload[field];
    if (value === undefined || value === null) continue;

    if (isString(value)) {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        result[field] = trimmed;
      }
      continue;
    }

    result[field] = value;
  }

  return result;
};

const extractS3Key = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, '');
  } catch {
    const [, key] = url.split('.amazonaws.com/');
    return key ?? null;
  }
};

// --- Controllers ------------------------------------------------------------

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    console.log('[profile] Update request received', {
      userId,
      timestamp: new Date().toISOString()
    });

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updateData = sanitizeProfilePayload(req.body);
    console.log('[profile] Update payload', updateData);

    try {
      await user.update(updateData as Record<string, unknown>);
    } catch (updateError) {
      console.error('[profile] Failed to update user', updateError);
      res.status(500).json({
        message: 'Failed to update profile in database',
        error: updateError instanceof Error ? updateError.message : 'Unknown error'
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

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toJSON(),
      updatedFields: Object.keys(updateData)
    });
  } catch (error) {
    console.error('[profile] Update error', error);
    next(error);
  }
};

export const uploadResumeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
};

export const uploadAvatarHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const existingAvatarUrl =
      typeof user.avatarUrl === 'string' ? user.avatarUrl : undefined;

    if (existingAvatarUrl && existingAvatarUrl.includes('amazonaws.com')) {
      try {
        const s3Key = extractS3Key(existingAvatarUrl);
        if (s3Key) {
          await deleteFromS3(s3Key);
          console.log('[profile] Deleted previous avatar from S3', s3Key);
        }
      } catch (deleteError) {
        console.warn('[profile] Failed to delete previous avatar', deleteError);
      }
    }

    const uploadResult = await uploadToS3(req.file, 'avatars');
    await user.update({ avatarUrl: uploadResult.url });

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: uploadResult.url,
      s3Key: uploadResult.key
    });
  } catch (error) {
    console.error('[profile] Avatar upload error', error);
    res.status(500).json({
      message: 'Failed to upload avatar',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getSkills = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
};

export const updateSkills = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { skills } = req.body as { skills?: unknown };

    if (
      !Array.isArray(skills) ||
      !skills.every((skill) => isString(skill) && skill.trim())
    ) {
      res.status(400).json({ message: 'Skills must be an array of strings' });
      return;
    }

    const normalizedSkills = skills
      .map((skill) => (skill as string).trim())
      .filter(Boolean);

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await user.update({ skills: normalizedSkills });

    res.json({ skills: normalizedSkills });
  } catch (error) {
    next(error);
  }
};