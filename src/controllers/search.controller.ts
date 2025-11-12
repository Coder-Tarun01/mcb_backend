import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Job, Company, User } from '../models';
import { AuthRequest } from '../middleware/auth';

export async function searchJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, location, type, category, minSalary, maxSalary, isRemote } = req.query;
    
    const where: any = {};
    
    if (q) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { company: { [Op.like]: `%${q}%` } }
      ];
    }
    
    if (location) {
      where.location = { [Op.like]: `%${location}%` };
    }
    
    if (type) {
      where.type = type;
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

    // Transform the data to include legacy fields for frontend compatibility
    const transformedJobs = jobs.map(job => {
      const jobData = job.toJSON() as any;
      
      return {
        ...jobData,
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

    res.json(transformedJobs);
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

// Autocomplete for job titles
export async function autocompleteJobTitles(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!q || (q as string).length < 2) {
      return res.json([]);
    }

    const jobs = await Job.findAll({
      where: {
        title: { [Op.like]: `%${q}%` }
      },
      attributes: ['title'],
      group: ['title'],
      limit,
      raw: true
    });

    res.json(jobs.map(j => j.title));
  } catch (e) { next(e); }
}

// Autocomplete for company names
export async function autocompleteCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!q || (q as string).length < 2) {
      return res.json([]);
    }

    const jobs = await Job.findAll({
      where: {
        company: { [Op.like]: `%${q}%` }
      },
      attributes: ['company'],
      group: ['company'],
      limit,
      raw: true
    });

    res.json(jobs.map(j => j.company));
  } catch (e) { next(e); }
}

// Autocomplete for locations
export async function autocompleteLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!q || (q as string).length < 2) {
      return res.json([]);
    }

    const jobs = await Job.findAll({
      where: {
        location: { [Op.like]: `%${q}%` }
      },
      attributes: ['location'],
      group: ['location'],
      limit,
      raw: true
    });

    res.json(jobs.map(j => j.location).filter(Boolean));
  } catch (e) { next(e); }
}

// Combined autocomplete - returns jobs, companies, and locations
export async function autocompleteSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!q || (q as string).length < 2) {
      return res.json({
        jobs: [],
        companies: [],
        locations: []
      });
    }

    const [jobs, companies, locations] = await Promise.all([
      Job.findAll({
        where: {
          title: { [Op.like]: `%${q}%` }
        },
        attributes: ['id', 'title', 'company', 'location', 'type'],
        limit,
        order: [['createdAt', 'DESC']]
      }),
      Job.findAll({
        where: {
          company: { [Op.like]: `%${q}%` }
        },
        attributes: ['company'],
        group: ['company'],
        limit,
        raw: true
      }),
      Job.findAll({
        where: {
          location: { [Op.like]: `%${q}%` }
        },
        attributes: ['location'],
        group: ['location'],
        limit,
        raw: true
      })
    ]);

    res.json({
      jobs,
      companies: companies.map(c => c.company).filter(Boolean),
      locations: locations.map(l => l.location).filter(Boolean)
    });
  } catch (e) { next(e); }
}