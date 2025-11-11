import { Request, Response, NextFunction } from 'express';
import { Resume } from '../models/Resume';
import { AuthRequest } from '../middleware/auth';

// Get all resumes for a user
export async function getResumes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = { userId };
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause.title = {
        [require('sequelize').Op.like]: `%${search}%`
      };
    }

    const { count, rows: resumes } = await Resume.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['updatedAt', 'DESC']]
    });

    res.json({
      success: true,
      resumes,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    next(error);
  }
}

// Get a single resume
export async function getResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const resume = await Resume.findOne({
      where: { id, userId }
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({
      success: true,
      resume
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    next(error);
  }
}

// Create a new resume
export async function createResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { title, personalInfo, settings } = req.body;

    // Check if this should be the primary resume
    const { isPrimary } = req.body;
    if (isPrimary) {
      // Remove primary status from other resumes
      await Resume.update(
        { isPrimary: false },
        { where: { userId } }
      );
    }

    const resume = await Resume.create({
      userId,
      title: title || 'My Resume',
      personalInfo: personalInfo || {
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        linkedin: '',
        website: '',
        summary: ''
      },
      workExperience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      references: [],
      additionalInfo: {
        interests: [],
        volunteerWork: [],
        publications: [],
        awards: []
      },
      settings: settings || {
        template: 'modern',
        colorScheme: 'blue',
        fontFamily: 'Arial',
        fontSize: 12,
        margins: { top: 1, bottom: 1, left: 1, right: 1 },
        sections: {
          personalInfo: true,
          summary: true,
          workExperience: true,
          education: true,
          skills: true,
          projects: false,
          certifications: false,
          languages: false,
          references: false,
          additionalInfo: false
        },
        sectionOrder: ['personalInfo', 'summary', 'workExperience', 'education', 'skills']
      },
      isPrimary: isPrimary || false,
      isPublic: false,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      message: 'Resume created successfully',
      resume
    });
  } catch (error) {
    console.error('Error creating resume:', error);
    next(error);
  }
}

// Update a resume
export async function updateResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const updateData = req.body;

    const resume = await Resume.findOne({
      where: { id, userId }
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Handle primary resume logic
    if (updateData.isPrimary && !resume.isPrimary) {
      await Resume.update(
        { isPrimary: false },
        { where: { userId } }
      );
    }

    await resume.update(updateData);

    res.json({
      success: true,
      message: 'Resume updated successfully',
      resume
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    next(error);
  }
}

// Delete a resume
export async function deleteResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const resume = await Resume.findOne({
      where: { id, userId }
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    await resume.destroy();

    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    next(error);
  }
}

// Set primary resume
export async function setPrimaryResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const resume = await Resume.findOne({
      where: { id, userId }
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Remove primary status from other resumes
    await Resume.update(
      { isPrimary: false },
      { where: { userId } }
    );

    // Set this resume as primary
    await resume.update({ isPrimary: true });

    res.json({
      success: true,
      message: 'Primary resume updated successfully',
      resume
    });
  } catch (error) {
    console.error('Error setting primary resume:', error);
    next(error);
  }
}

// Duplicate a resume
export async function duplicateResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const originalResume = await Resume.findOne({
      where: { id, userId }
    });

    if (!originalResume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const resumeData = originalResume.toJSON();
    delete (resumeData as any).id;
    delete (resumeData as any).createdAt;
    delete (resumeData as any).updatedAt;

    const newResume = await Resume.create({
      ...resumeData,
      title: `${resumeData.title} (Copy)`,
      isPrimary: false,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      message: 'Resume duplicated successfully',
      resume: newResume
    });
  } catch (error) {
    console.error('Error duplicating resume:', error);
    next(error);
  }
}

// Get resume statistics
export async function getResumeStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const totalResumes = await Resume.count({ where: { userId } });
    const publishedResumes = await Resume.count({ where: { userId, status: 'published' } });
    const draftResumes = await Resume.count({ where: { userId, status: 'draft' } });
    const primaryResume = await Resume.findOne({ where: { userId, isPrimary: true } });

    res.json({
      success: true,
      stats: {
        total: totalResumes,
        published: publishedResumes,
        draft: draftResumes,
        primary: primaryResume ? primaryResume.id : null
      }
    });
  } catch (error) {
    console.error('Error fetching resume stats:', error);
    next(error);
  }
}

// Export resume as PDF (placeholder - would need actual PDF generation)
export async function exportResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { format = 'pdf' } = req.query;

    const resume = await Resume.findOne({
      where: { id, userId }
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // This is a placeholder - in a real implementation, you would generate PDF here
    res.json({
      success: true,
      message: `Resume export as ${format} is not yet implemented`,
      resume: {
        id: resume.id,
        title: resume.title,
        status: resume.status
      }
    });
  } catch (error) {
    console.error('Error exporting resume:', error);
    next(error);
  }
}
