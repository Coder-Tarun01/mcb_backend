import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Job, Company, User, AiJob } from '../models';
import { AuthRequest } from '../middleware/auth';

export async function searchJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, location, type, category, minSalary, maxSalary, isRemote } = req.query;
    
    const where: any = {};
    const aiWhere: any = {};
    
    if (q) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { company: { [Op.like]: `%${q}%` } }
      ];
      aiWhere[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        { company: { [Op.iLike]: `%${q}%` } },
        { skills: { [Op.iLike]: `%${q}%` } },
        { job_type: { [Op.iLike]: `%${q}%` } },
      ];
    }
    
    if (location) {
      where.location = { [Op.like]: `%${location}%` };
      aiWhere.location = { [Op.iLike]: `%${location}%` };
    }
    
    if (type) {
      where.type = type;
      aiWhere.job_type = { [Op.iLike]: `%${type}%` };
    }
    
    if (category) {
      where.category = category;
    }
    
    if (isRemote !== undefined) {
      where.isRemote = isRemote === 'true';
    }

    const jobs = await Job.findAll({
      where,
      attributes: [
        'id', 'title', 'company', 'companyId', 'location', 'type', 'category', 
        'isRemote', 'description', 'createdAt', 'updatedAt',
        // Enhanced fields
        'jobDescription', 'experienceLevel', 'minSalary', 'maxSalary', 
        'salaryCurrency', 'salaryType', 'vacancies', 'educationRequired', 
        'skillsRequired', 'genderPreference', 'locationType', 'fullAddress', 
        'city', 'state', 'country', 'companyWebsite', 'contactEmail', 
        'contactPhone', 'applicationDeadline', 'status'
      ],
      order: [['createdAt', 'DESC']],
    });

    const aiJobs = await AiJob.findAll({
      where: aiWhere,
      attributes: [
        'id',
        'title',
        'company',
        'location',
        'description',
        'skills',
        'experience',
        'job_url',
        'posted_date',
        'job_type',
      ],
      order: [['posted_date', 'DESC']],
    });

    const now = Date.now();

    // Transform the data to include legacy fields for frontend compatibility
    const transformedJobs = jobs.map(job => {
      const jobData = job.toJSON() as any;
      
      return {
        ...jobData,
        source: 'internal' as const,
        // Add legacy fields for backward compatibility
        salary: (jobData.minSalary || jobData.maxSalary) ? {
          min: jobData.minSalary || null,
          max: jobData.maxSalary || null,
          currency: jobData.salaryCurrency || 'INR'
        } : null,
        experience: jobData.experienceLevel ? {
          level: jobData.experienceLevel
        } : null,
        skills: jobData.skillsRequired || [],
        requirements: [],
        postedDate: jobData.createdAt,
        // Add additional fields for frontend
        jobType: jobData.type, // Alias for type
        rating: 4.5, // Default rating
        applicantsCount: 0, // Will be updated if needed
        isBookmarked: false,
        isNew: new Date(jobData.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // New if created within last 7 days
      };
    });

    const transformedAiJobs = aiJobs.map(job => {
      const jobData = job.toJSON() as {
        id: number;
        title?: string | null;
        company?: string | null;
        location?: string | null;
        description?: string | null;
        skills?: string | string[] | null;
        experience?: string | null;
        job_url?: string | null;
        posted_date?: string | Date | null;
        job_type?: string | null;
      };

      const skillsArray = (() => {
        if (!jobData.skills) return [];
        if (Array.isArray(jobData.skills)) {
          return jobData.skills.map((skill) => String(skill).trim()).filter(Boolean);
        }
        const trimmed = jobData.skills.trim();
        if (!trimmed) return [];
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map((skill) => String(skill).trim()).filter(Boolean);
          }
        } catch {
          // fall through
        }
        return trimmed.split(/[,|;/]/).map((skill) => skill.trim()).filter(Boolean);
      })();

      const postedDate = jobData.posted_date ? new Date(jobData.posted_date) : null;

      return {
        id: `ai-${jobData.id}`,
        title: jobData.title || '',
        company: jobData.company || 'External company',
        companyId: null,
        location: jobData.location || null,
        type: jobData.job_type || null,
        category: null,
        isRemote: jobData.location ? jobData.location.toLowerCase().includes('remote') : null,
        locationType: null,
        description: jobData.description || null,
        jobDescription: jobData.description || null,
        experienceLevel: jobData.experience || undefined,
        experience: null,
        skills: skillsArray,
        requirements: [],
        postedDate: postedDate ? postedDate.toISOString() : null,
        applicationDeadline: null,
        jobUrl: jobData.job_url || null,
        rating: 4.3,
        applicantsCount: 0,
        isBookmarked: false,
        isNew: postedDate ? postedDate.getTime() > now - 7 * 24 * 60 * 60 * 1000 : false,
        createdAt: postedDate ? postedDate.toISOString() : null,
        updatedAt: postedDate ? postedDate.toISOString() : null,
        jobType: jobData.job_type || undefined,
        salary: null,
        source: 'external' as const,
      };
    });

    const combinedJobs = [...transformedJobs, ...transformedAiJobs].sort((a, b) => {
      const dateA = a.postedDate || a.createdAt || null;
      const dateB = b.postedDate || b.createdAt || null;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });

    res.json(combinedJobs);
  } catch (e) { next(e); }
}

export async function getFilterOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const [locations, types, categories] = await Promise.all([
      Job.findAll({
        attributes: ['location'],
        where: { location: { [Op.ne]: null } },
        group: ['location'],
        raw: true,
      }),
      Job.findAll({
        attributes: ['type'],
        where: { type: { [Op.ne]: null } },
        group: ['type'],
        raw: true,
      }),
      Job.findAll({
        attributes: ['category'],
        where: { category: { [Op.ne]: null } },
        group: ['category'],
        raw: true,
      }),
    ]);

    res.json({
      locations: locations.map(l => l.location).filter(Boolean),
      types: types.map(t => t.type).filter(Boolean),
      categories: categories.map(c => c.category).filter(Boolean),
    });
  } catch (e) { next(e); }
}

export async function getRecommendedJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Simple recommendation based on user's skills and preferences
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const userSkills = user.skills || [];
    const where: any = {};

    if (userSkills.length > 0) {
      where[Op.or] = userSkills.map(skill => ({
        description: { [Op.like]: `%${skill}%` }
      }));
    }

    const jobs = await Job.findAll({
      where,
      limit: 10,
      order: [['createdAt', 'DESC']],
    });

    res.json(jobs);
  } catch (e) { next(e); }
}
