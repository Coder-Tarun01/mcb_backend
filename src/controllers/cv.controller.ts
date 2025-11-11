import { Request, Response, NextFunction } from 'express';
import { CVFile, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';
import multer from 'multer';
import { uploadToS3, deleteFromS3 } from '../services/s3Service';
import fs from 'fs';

// Configure multer for S3 uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

export const uploadMiddleware = upload.single('file');

// Get all CV files for a user
export async function getCVFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { type, status, search, page = 1, limit = 50 } = req.query;
    
    let whereClause: any = { userId };
    
    if (type && type !== 'all') {
      whereClause.type = type;
    }
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Add search to database query for better performance
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { originalName: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: cvFiles } = await CVFile.findAndCountAll({
      where: whereClause,
      order: [['uploadDate', 'DESC']],
      limit: Number(limit),
      offset: offset,
      attributes: { exclude: ['filePath'] } // Don't send file path to frontend
    });

    res.json({
      success: true,
      files: cvFiles,
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / Number(limit))
    });
  } catch (error) {
    console.error('Error fetching CV files:', error);
    next(error);
  }
}

// Get a single CV file
export async function getCVFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const cvFile = await CVFile.findOne({
      where: { id, userId }
    });

    if (!cvFile) {
      return res.status(404).json({ message: 'CV file not found' });
    }

    res.json({
      success: true,
      file: cvFile
    });
  } catch (error) {
    console.error('Error fetching CV file:', error);
    next(error);
  }
}

// Upload a new CV file
export async function uploadCVFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { type, description, tags, isPublic } = req.body;
    
    // Validate file type
    const allowedTypes = ['resume', 'cover-letter', 'portfolio', 'certificate'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    console.log('🔄 Uploading CV file to S3...', {
      userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      type
    });

    // Upload file to S3
    const uploadResult = await uploadToS3(req.file, 'cv-files');
    
    console.log('✅ CV file uploaded to S3:', uploadResult);

    // Create CV file record with S3 URL
    const cvFile = await CVFile.create({
      userId,
      name: req.file.originalname,
      originalName: req.file.originalname,
      type: type as 'resume' | 'cover-letter' | 'portfolio' | 'certificate',
      size: req.file.size,
      mimeType: req.file.mimetype,
      filePath: uploadResult.url, // Store S3 URL instead of local path
      uploadDate: new Date(),
      description: description || null,
      tags: tags ? JSON.parse(tags) : null,
      isPublic: isPublic === 'true',
      isPrimary: false,
      status: 'active'
    });

    // If this is a resume upload, update the user's primary resume URL for employer access
    if (type === 'resume') {
      try {
        const user = await User.findByPk(userId);
        if (user) {
          await user.update({ resumeUrl: uploadResult.url });
        }
      } catch (err) {
        console.warn('Failed to update user.resumeUrl after CV upload:', err);
      }
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: cvFile
    });
  } catch (error) {
    console.error('Error uploading CV file:', error);
    next(error);
  }
}

// Update CV file
export async function updateCVFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { name, description, tags, isPublic, status } = req.body;

    // Validate input
    if (name && name.trim().length === 0) {
      return res.status(400).json({ message: 'File name cannot be empty' });
    }

    // Update file properties directly for better performance
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic === 'true' || isPublic === true;
    if (status !== undefined) updateData.status = status;

    const [affectedCount] = await CVFile.update(updateData, {
      where: { id, userId }
    });

    if (affectedCount === 0) {
      return res.status(404).json({ message: 'CV file not found' });
    }

    // Fetch updated file
    const updatedFile = await CVFile.findOne({
      where: { id, userId },
      attributes: { exclude: ['filePath'] }
    });

    res.json({
      success: true,
      message: 'CV file updated successfully',
      file: updatedFile
    });
  } catch (error) {
    console.error('Error updating CV file:', error);
    next(error);
  }
}

// Set primary CV file
export async function setPrimaryCVFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const cvFile = await CVFile.findOne({
      where: { id, userId }
    });

    if (!cvFile) {
      return res.status(404).json({ message: 'CV file not found' });
    }

    // Remove primary status from all other files of the same type
    await CVFile.update(
      { isPrimary: false },
      { where: { userId, type: cvFile.type } }
    );

    // Set this file as primary
    await cvFile.update({ isPrimary: true });

    // If the primary file is a resume, reflect it on the user's profile for employer visibility
    if (cvFile.type === 'resume') {
      try {
        const user = await User.findByPk(userId);
        if (user) {
          await user.update({ resumeUrl: cvFile.filePath });
        }
      } catch (err) {
        console.warn('Failed to sync user.resumeUrl when setting primary CV:', err);
      }
    }

    res.json({
      success: true,
      message: 'Primary CV file updated successfully',
      file: cvFile
    });
  } catch (error) {
    console.error('Error setting primary CV file:', error);
    next(error);
  }
}

// View CV file (stream for preview)
export async function viewCVFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const cvFile = await CVFile.findOne({
      where: { id, userId }
    });

    if (!cvFile) {
      return res.status(404).json({ message: 'CV file not found' });
    }

    // Check if file exists
    if (!fs.existsSync(cvFile.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Update last viewed (but not download count for viewing)
    await cvFile.update({
      lastViewed: new Date()
    });

    // Set headers for file viewing (inline display)
    res.setHeader('Content-Disposition', `inline; filename="${cvFile.originalName}"`);
    res.setHeader('Content-Type', cvFile.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Stream the file for viewing
    const fileStream = fs.createReadStream(cvFile.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error viewing CV file:', error);
    next(error);
  }
}

// Download CV file
export async function downloadCVFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const cvFile = await CVFile.findOne({
      where: { id, userId }
    });

    if (!cvFile) {
      return res.status(404).json({ message: 'CV file not found' });
    }

    // Update download count and last viewed
    await cvFile.update({
      downloadCount: cvFile.downloadCount + 1,
      lastViewed: new Date()
    });

    // For S3 files, redirect to the S3 URL
    if (cvFile.filePath && cvFile.filePath.includes('amazonaws.com')) {
      return res.redirect(cvFile.filePath);
    }

    // For local files (legacy support)
    if (!fs.existsSync(cvFile.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${cvFile.originalName}"`);
    res.setHeader('Content-Type', cvFile.mimeType);

    // Stream the file
    const fileStream = fs.createReadStream(cvFile.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading CV file:', error);
    next(error);
  }
}

// Delete CV file
export async function deleteCVFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    
    // First, get the file to extract S3 key for deletion
    const cvFile = await CVFile.findOne({
      where: { id, userId }
    });

    if (!cvFile) {
      return res.status(404).json({ message: 'CV file not found' });
    }

    // Delete from S3 if it's an S3 URL
    if (cvFile.filePath && cvFile.filePath.includes('amazonaws.com')) {
      try {
        const urlParts = cvFile.filePath.split('/');
        const s3Key = urlParts.slice(3).join('/');
        await deleteFromS3(s3Key);
        console.log('🗑️ Deleted CV file from S3:', s3Key);
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete CV file from S3:', deleteError);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await CVFile.destroy({
      where: { id, userId }
    });

    res.json({
      success: true,
      message: 'CV file deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting CV file:', error);
    next(error);
  }
}

// Rename CV file
export async function renameCVFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'File name is required' });
    }

    const [affectedCount] = await CVFile.update(
      { name: name.trim() },
      { where: { id, userId } }
    );

    if (affectedCount === 0) {
      return res.status(404).json({ message: 'CV file not found' });
    }

    res.json({
      success: true,
      message: 'File renamed successfully'
    });
  } catch (error) {
    console.error('Error renaming CV file:', error);
    next(error);
  }
}

// Get CV file statistics
export async function getCVStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const totalFiles = await CVFile.count({ where: { userId } });
    const primaryFiles = await CVFile.count({ where: { userId, isPrimary: true } });
    const publicFiles = await CVFile.count({ where: { userId, isPublic: true } });
    const activeFiles = await CVFile.count({ where: { userId, status: 'active' } });

    res.json({
      success: true,
      stats: {
        totalFiles,
        primaryFiles,
        publicFiles,
        activeFiles
      }
    });
  } catch (error) {
    console.error('Error fetching CV stats:', error);
    next(error);
  }
}
