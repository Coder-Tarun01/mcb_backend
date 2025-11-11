import type { Request, Response, NextFunction, Express } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { uploadToS3, deleteFromS3 } from '../services/s3Service';
import type { UserAttributes } from '../models/User';

// Configure multer for S3 uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Allow only image files for avatars
    if (file.fieldname === 'avatar') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed for avatars'));
      }
    } else {
      // For other files (resumes), allow PDF and Word documents
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
  }
});

export const uploadResume = upload.single('resume');
export const uploadAvatar = upload.single('avatar');

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { password, ...profile } = user.toJSON();
    res.json(profile);
  } catch (error) {
    next(error instanceof Error ? error : new Error('Failed to load profile'));
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    console.log('🔍 Profile Update Request:', {
      userId,
      updateData: req.body,
      timestamp: new Date().toISOString()
    });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Get current user data for comparison
    const currentData = user.toJSON();
    console.log('📊 Current User Data:', currentData);

    // Filter out password and only allow specific fields
    const stringFields = ['name', 'phone', 'companyName'] as const;
    type StringField = typeof stringFields[number];
    const urlFields = ['avatarUrl', 'resumeUrl', 'companyLogo'] as const;
    type UrlField = typeof urlFields[number];
    const updateData: Partial<UserAttributes> = {};
    const setField = <K extends keyof UserAttributes>(key: K, value: UserAttributes[K]) => {
      updateData[key] = value;
    };
    const rawBody = req.body as Record<string, unknown>;

    const skillsValue = rawBody.skills;
    if (skillsValue !== undefined && skillsValue !== null) {
      if (Array.isArray(skillsValue)) {
        setField(
          'skills',
          skillsValue.map((skill) => String(skill).trim()).filter(Boolean)
        );
      } else if (typeof skillsValue === 'string') {
        const parsed = skillsValue
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean);
        setField('skills', parsed.length > 0 ? parsed : null);
      } else {
        console.warn('Invalid skills payload, expected array or string');
      }
    }

    for (const field of urlFields) {
      const value = rawBody[field];
      if (typeof value === 'string' && (value.startsWith('https://') || value.startsWith('/uploads/'))) {
        setField(field, value as UserAttributes[UrlField]);
      } else if (value !== undefined) {
        console.warn(`Invalid URL format for ${field}:`, value);
      }
    }

    for (const field of stringFields) {
      const value = rawBody[field];
      if (typeof value === 'string') {
        setField(field, value.trim() as UserAttributes[StringField]);
      } else if (value !== undefined && value !== null) {
        console.warn(`Skipping field ${field} due to unsupported value type`, typeof value);
      }
    }

    // Add support for additional profile fields
    const additionalFields = [
      'professionalTitle', 'languages', 'age', 'currentSalary', 'expectedSalary', 
      'description', 'country', 'postcode', 'city', 'fullAddress'
    ] as const;
    type AdditionalField = typeof additionalFields[number];

    for (const field of additionalFields) {
      const value = rawBody[field];
      if (value === undefined) {
        continue;
      }

      if (value === null) {
        setField(field, null as UserAttributes[AdditionalField]);
        continue;
      }

      if (typeof value === 'string' && value.trim().length > 0) {
        setField(field, value.trim() as UserAttributes[AdditionalField]);
      } else {
        console.warn(`Skipping additional field ${field} due to unsupported value`, value);
      }
    }

    console.log('📝 Filtered Update Data:', updateData);

    // Perform the database update
    try {
      await user.update(updateData);
      console.log('✅ Database Update Completed');
    } catch (updateError: unknown) {
      console.error('❌ Database Update Failed:', updateError);
      return res.status(500).json({ 
        message: 'Failed to update profile in database',
        error: updateError instanceof Error ? updateError.message : 'Unknown error'
      });
    }

    // Fetch updated user data from database
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to retrieve updated user data' });
    }

    console.log('🔄 Updated User Data from DB:', updatedUser.toJSON());

    // Return success response with updated data
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

export async function uploadResumeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Upload resume to S3
    const uploadResult = await uploadToS3(req.file, 'resumes');

    await user.update({ resumeUrl: uploadResult.url });

    res.json({ message: 'Resume uploaded successfully', resumeUrl: uploadResult.url, s3Key: uploadResult.key });
  } catch (error) {
    next(error instanceof Error ? error : new Error('Failed to upload resume'));
  }
}

export async function uploadAvatarHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    console.log('🔄 Uploading avatar to S3...', {
      userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Delete old avatar from S3 if it exists
    if (user.avatarUrl && user.avatarUrl.includes('amazonaws.com')) {
      try {
        // Extract S3 key from URL
        const urlParts = user.avatarUrl.split('/');
        const s3Key = urlParts.slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
        await deleteFromS3(s3Key);
        console.log('🗑️ Deleted old avatar from S3:', s3Key);
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete old avatar:', deleteError);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new avatar to S3
    const uploadResult = await uploadToS3(req.file, 'avatars');
    
    console.log('✅ Avatar uploaded to S3:', uploadResult);

    // Update user record with new avatar URL
    await user.update({ avatarUrl: uploadResult.url });

    res.json({ 
      message: 'Avatar uploaded successfully', 
      avatarUrl: uploadResult.url,
      s3Key: uploadResult.key
    });
  } catch (error: unknown) {
    console.error('❌ Avatar upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload avatar', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}


export async function getSkills(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ skills: user.skills || [] });
  } catch (error) {
    next(error instanceof Error ? error : new Error('Failed to load skills'));
  }
}

export async function updateSkills(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { skills } = req.body;
    if (!Array.isArray(skills)) {
      return res.status(400).json({ message: 'Skills must be an array' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.update({ skills });
    res.json({ skills });
  } catch (error) {
    next(error instanceof Error ? error : new Error('Failed to update skills'));
  }
}
