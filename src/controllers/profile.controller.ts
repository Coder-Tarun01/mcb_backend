import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { uploadToS3, deleteFromS3 } from '../services/s3Service';

// Configure multer for S3 uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
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
  } catch (e) { next(e); }
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
    const allowedFields = ['name', 'phone', 'companyName', 'skills', 'avatarUrl', 'resumeUrl', 'companyLogo'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        // Validate S3 URLs for file fields
        if ((field === 'avatarUrl' || field === 'resumeUrl' || field === 'companyLogo') && req.body[field]) {
          const url = req.body[field];
          // Check if it's a valid S3 URL or local upload URL
          if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('/uploads/'))) {
            updateData[field] = url;
          } else {
            console.warn(`Invalid URL format for ${field}:`, url);
            // Skip invalid URLs
            continue;
          }
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    // Add support for additional profile fields
    const additionalFields = [
      'professionalTitle', 'languages', 'age', 'currentSalary', 'expectedSalary', 
      'description', 'country', 'postcode', 'city', 'fullAddress'
    ];
    
    for (const field of additionalFields) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        updateData[field] = req.body[field];
      }
    }

    console.log('📝 Filtered Update Data:', updateData);

    // Perform the database update
    try {
      await user.update(updateData);
      console.log('✅ Database Update Completed');
    } catch (updateError: any) {
      console.error('❌ Database Update Failed:', updateError);
      return res.status(500).json({ 
        message: 'Failed to update profile in database',
        error: updateError.message 
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
  } catch (error) {
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
  } catch (e) { next(e); }
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
  } catch (error: any) {
    console.error('❌ Avatar upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload avatar', 
      error: error.message 
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
  } catch (e) { next(e); }
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
  } catch (e) { next(e); }
}
