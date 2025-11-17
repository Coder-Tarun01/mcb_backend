import { Request, Response, NextFunction } from 'express';
import { Application, Job, User } from '../models';
import * as models from '../models';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import { uploadToS3, getSignedUrl } from '../services/s3Service';

// Extend Request type to include multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for in-memory storage and S3 upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
  }
});

export const uploadResumeMiddleware = upload.single('resume');

export async function getUserApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Limit selected attributes to columns that exist in DB
    const applications = await Application.findAll({ 
      where: { userId },
      attributes: ['id', 'userId', 'jobId', 'status', 'coverLetter', 'resumeUrl', 'appliedAt', 'createdAt', 'updatedAt'],
      include: [{ model: Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] }]
    });
    return res.json(applications);
  } catch (e) { next(e); }
}

export async function getApplicationResumeDownloadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = (req as AuthRequest).user;
    if (!requester) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const application = await Application.findByPk(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const isOwner = application.userId === requester.id;
    const isEmployer = requester.role === 'employer';
    if (!isOwner && !isEmployer) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let resumeUrl = application.resumeUrl || null;
    if (!resumeUrl && isEmployer) {
      const candidate = await User.findByPk(application.userId);
      resumeUrl = candidate?.resumeUrl || null;
    }

    if (!resumeUrl) {
      return res.status(404).json({ message: 'Resume not available for this application' });
    }

    let downloadUrl = resumeUrl;
    if (resumeUrl.includes('amazonaws.com') || resumeUrl.includes('.s3.')) {
      try {
        downloadUrl = await getSignedUrl(resumeUrl, 3600);
      } catch (err) {
        console.error('Failed to generate signed resume URL:', err);
      }
    }

    return res.json({
      success: true,
      downloadUrl,
      applicationId: application.id
    });
  } catch (e) {
    next(e);
  }
}

export async function applyToJob(req: MulterRequest, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Accept both JSON and multipart/form-data. Collect known fields and keep others.
    const { jobId, coverLetter, resumeUrl, resumeId, ...otherFields } = req.body || {};

    // Normalize potential array fields coming from FormData clients
    const cleanJobId = Array.isArray(jobId) ? jobId[0] : jobId;
    const cleanCoverLetter = Array.isArray(coverLetter) ? (coverLetter as any).join(' ') : (coverLetter || '');
    const cleanResumeUrl = Array.isArray(resumeUrl) ? resumeUrl[0] : resumeUrl;
    const cleanResumeId = Array.isArray(resumeId) ? resumeId[0] : resumeId;

    // Basic validation
    if (!cleanJobId) return res.status(400).json({ message: 'Job ID is required' });

    // Check if job exists
    const job = await Job.findByPk(cleanJobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Prevent duplicate application
    const existing = await Application.findOne({ where: { userId, jobId: cleanJobId } });
    if (existing) return res.status(409).json({ message: 'Already applied to this job' });

    // Resolve resume URL: uploaded file (S3) > CVFile by id > explicit resumeUrl field > user's profile
    let finalResumeUrl: string | null = null;
    if (req.file) {
      const s3 = await uploadToS3(req.file, 'resumes');
      finalResumeUrl = s3.url;
    } else if (cleanResumeId) {
      try {
        const CVFile = (models as any).CVFile;
        if (CVFile) {
          const cv = await CVFile.findByPk(cleanResumeId);
          if (cv && cv.userId === userId) finalResumeUrl = cv.filePath;
        }
      } catch (err) {
        // ignore optional CVFile resolution errors
      }
    }
    if (!finalResumeUrl && cleanResumeUrl) finalResumeUrl = cleanResumeUrl;
    if (!finalResumeUrl) {
      const user = await User.findByPk(userId);
      if (user && (user as any).resumeUrl) finalResumeUrl = (user as any).resumeUrl;
    }

    // Create application
    let application;
    try {
      application = await Application.create({
        userId,
        jobId: cleanJobId,
        status: 'pending',
        coverLetter: cleanCoverLetter,
        resumeUrl: finalResumeUrl,
        ...otherFields
      });
    } catch (err: any) {
      console.error('Application creation failed:', err);
      if (err && err.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: 'Validation error', details: err.errors?.map((e: any) => e.message) });
      }
      return res.status(500).json({ message: 'Failed to create application', error: err?.message });
    }

    return res.status(201).json({ success: true, applicationId: application.id, application });
  } catch (e) { 
    console.error('Error in applyToJob:', e); 
    next(e); 
  }
}

export async function getApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const application = await Application.findOne({ 
      where: { id: req.params.id, userId },
      attributes: ['id', 'userId', 'jobId', 'status', 'coverLetter', 'resumeUrl', 'appliedAt', 'createdAt', 'updatedAt'],
      include: [{ model: Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] }]
    });
    if (!application) return res.status(404).json({ message: 'Not found' });
    return res.json(application);
  } catch (e) { next(e); }
}

export async function updateApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    let application;

    if (userRole === 'employer') {
      // For employers, find application by job ownership
      application = await Application.findOne({
        where: { id: req.params.id },
        include: [{ model: Job, as: 'job', where: { companyId: userId } }]
      });
    } else {
      // For employees, find their own applications
      application = await Application.findOne({ where: { id: req.params.id, userId } });
    }

    if (!application) return res.status(404).json({ message: 'Not found' });

    await application.update(req.body);
    return res.json(application);
  } catch (e) { next(e); }
}

export async function withdrawApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const deleted = await Application.destroy({ where: { id: req.params.id, userId } });
    return res.json({ deleted: deleted > 0 });
  } catch (e) { next(e); }
}

export async function getJobApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const userRole = (req as AuthRequest).user?.role;
    if (userRole !== 'employer') return res.status(403).json({ message: 'Forbidden' });

    // Use raw query to avoid association issues
    const { sequelize } = require('../models');
    const { QueryTypes } = require('sequelize');

    const query = `
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.skills as user_skills,
        u."resumeUrl" as user_resumeUrl,
        j.title as job_title,
        j.company as job_company,
        j.location as job_location
      FROM applications a
      LEFT JOIN users u ON a."userId" = u.id
      LEFT JOIN jobs j ON a."jobId" = j.id
      WHERE a."jobId" = :jobId
      ORDER BY a."createdAt" DESC
    `;

    const applications = await sequelize.query(query, { replacements: { jobId: req.params.jobId }, type: QueryTypes.SELECT });

    // Transform the raw data to match the expected format
    const transformedApplications = applications.map((app: any) => ({
      id: app.id,
      userId: app.userId,
      jobId: app.jobId,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      appliedAt: app.appliedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      // Additional application data
      name: app.name,
      email: app.email,
      phone: app.phone,
      location: app.location,
      experience: app.experience,
      currentJobTitle: app.currentJobTitle,
      currentCompany: app.currentCompany,
      currentCTC: app.currentCTC,
      expectedCTC: app.expectedCTC,
      noticePeriod: app.noticePeriod,
      skills: app.skills,
      qualification: app.qualification,
      specialization: app.specialization,
      university: app.university,
      yearOfPassing: app.yearOfPassing,
      linkedin: app.linkedin,
      portfolio: app.portfolio,
      github: app.github,
      // User data
      user: {
        id: app.userId,
        name: app.user_name,
        email: app.user_email,
        phone: app.user_phone,
        skills: app.user_skills,
        resumeUrl: app.user_resumeUrl
      },
      // Job data
      job: {
        id: app.jobId,
        title: app.job_title,
        company: app.job_company,
        location: app.job_location
      }
    }));

    return res.json(transformedApplications);
  } catch (e) { console.error('Error in getJobApplications:', e); next(e); }
}

export async function getAllEmployerApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    if (!userId || userRole !== 'employer') {
      return res.status(403).json({ message: 'Forbidden - Employer access only' });
    }

    // Get employer's company
    const employer = await User.findByPk(userId);
    if (!employer || !(employer as any).companyName) {
      return res.status(400).json({ message: 'Employer must have a company name' });
    }

    // Find all jobs for this company
    const jobs = await Job.findAll({ where: { company: (employer as any).companyName }, attributes: ['id'] });

    const jobIds = jobs.map(job => job.id);

    // Find all applications for these jobs
    const applications = await Application.findAll({
      where: { jobId: jobIds },
      attributes: ['id', 'userId', 'jobId', 'status', 'coverLetter', 'resumeUrl', 'appliedAt', 'createdAt', 'updatedAt'],
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'skills', 'resumeUrl'] },
        { model: Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json(applications);
  } catch (e) { console.error('Error fetching employer applications:', e); next(e); }
}

export async function getEmployerStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    if (!userId || userRole !== 'employer') {
      return res.status(403).json({ message: 'Forbidden - Employer access only' });
    }

    // Get employer's company
    const employer = await User.findByPk(userId);
    if (!employer || !(employer as any).companyName) {
      return res.status(400).json({ message: 'Employer must have a company name' });
    }

    // Find all jobs for this company
    const jobs = await Job.findAll({ where: { company: (employer as any).companyName }, attributes: ['id'] });

    const jobIds = jobs.map(job => job.id);
    const totalJobs = jobs.length;

    // Count applications by status
    const totalApplications = await Application.count({ where: { jobId: jobIds } });

    const pendingApplications = await Application.count({ where: { jobId: jobIds, status: 'pending' } });

    const reviewedApplications = await Application.count({ where: { jobId: jobIds, status: 'reviewed' } });

    const acceptedApplications = await Application.count({ where: { jobId: jobIds, status: 'accepted' } });

    const rejectedApplications = await Application.count({ where: { jobId: jobIds, status: 'rejected' } });

    return res.json({
      totalJobs,
      totalApplications,
      pendingApplications,
      reviewedApplications,
      acceptedApplications,
      rejectedApplications,
      responseRate: totalApplications > 0 ? Math.round(((acceptedApplications + rejectedApplications) / totalApplications) * 100) : 0
    });
  } catch (e) { console.error('Error fetching employer stats:', e); next(e); }
}
