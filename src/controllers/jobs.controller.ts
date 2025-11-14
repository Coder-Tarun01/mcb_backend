import { Request, Response, NextFunction } from 'express';
import { Job, User, JobApplyClick, AiJob } from '../models';
import { buildJobSlug, extractIdFromSlug } from '../utils/slug';
import { AuthRequest } from '../middleware/auth';
import { sendJobNotificationEmail, logEmailError } from '../services/mailService';
import { Op } from 'sequelize';

export async function listJobs(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract query parameters for filtering/pagination
    const {
      limit = 20,
      offset = 0,
      page = 1,
      search,
      type,
      category,
      isRemote,
      location
    } = req.query as any;

    const calculatedLimit = Number(limit);
    const calculatedOffset = page ? (Number(page) - 1) * calculatedLimit : Number(offset);

    // Build Sequelize where clause
    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (typeof isRemote !== 'undefined') {
      if (isRemote === 'true' || isRemote === true) where.isRemote = true;
      if (isRemote === 'false' || isRemote === false) where.isRemote = false;
    }
    if (location) {
      const locationClause = {
        [Op.or]: [
          { location: { [Op.iLike]: `%${location}%` } },
          { city: { [Op.iLike]: `%${location}%` } },
          { state: { [Op.iLike]: `%${location}%` } },
          { country: { [Op.iLike]: `%${location}%` } },
        ],
      };
      if (!where[Op.and]) {
        where[Op.and] = [];
      }
      where[Op.and].push(locationClause);
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await (Job as any).findAndCountAll({
      where,
      limit: calculatedLimit,
      offset: calculatedOffset,
      order: [['createdAt', 'DESC']],
      // Exclude slug fields to avoid selecting non-existent columns in DB
      attributes: {
        exclude: ['slug', 'previousSlugs']
      }
    });

    // Query AI jobs with similar filters
    const aiWhere: any = {};
    if (type) aiWhere.job_type = type;
    if (location) {
      const existingOr = aiWhere[Op.or] || [];
      existingOr.push({ location: { [Op.iLike]: `%${location}%` } });
      aiWhere[Op.or] = existingOr;
    }
    if (search) {
      aiWhere[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    let aiJobs: any[] = [];
    try {
      aiJobs = await (AiJob as any).findAll({
        where: aiWhere,
        order: [['posted_date', 'DESC']],
        limit: calculatedLimit * 2,
        offset: 0,
      });
    } catch (err: any) {
      console.warn('AI jobs query failed, continuing with employer jobs only:', err?.message || err);
      aiJobs = [];
    }

    // Transform Employer DB jobs to frontend-friendly shape
    const employerJobs = rows.map((job: any) => {
      const jobData = job.toJSON ? job.toJSON() : job;
      return {
        id: jobData.id?.toString() || '',
        title: jobData.title || '',
        company: jobData.company || '',
        location: jobData.location || null,
        type: jobData.type || null,
        jobType: jobData.type || null,
        description: jobData.description || jobData.jobDescription || null,
        skills: jobData.skillsRequired || [],
        experience: jobData.experienceLevel ? { level: jobData.experienceLevel } : null,
        experienceLevel: jobData.experienceLevel || null,
        postedDate: jobData.createdAt || null,
        jobUrl: jobData.applyUrl || null,
        rating: 4.5,
        applicantsCount: 0,
        isBookmarked: false,
        isNew: new Date(jobData.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        salary: (jobData.minSalary || jobData.maxSalary) ? {
          min: jobData.minSalary || null,
          max: jobData.maxSalary || null,
          currency: jobData.salaryCurrency || 'INR'
        } : null,
        displaySalary: (jobData.minSalary || jobData.maxSalary) ? undefined : 'Salary not specified',
        requirements: [],
        category: jobData.category || null,
        isRemote: !!jobData.isRemote,
      };
    });

    // Transform AI jobs
    const aiTransformed = aiJobs.map((j: any) => {
      // Parse skills (stored as CSV in ai table)
      let skillsArray: string[] | undefined = undefined;
      if (j.skills) {
        skillsArray = String(j.skills).split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      // Parse experience string into level
      const experienceLevel = j.experience || null;
      return {
        id: String(j.id),
        title: j.title || '',
        company: j.company || '',
        location: j.location || null,
        type: j.job_type || null,
        jobType: j.job_type || null,
        description: j.description || null,
        skills: skillsArray,
        experience: undefined,
        experienceLevel,
        postedDate: j.posted_date || null,
        jobUrl: j.job_url || null,
        rating: 4.5,
        applicantsCount: 0,
        isBookmarked: false,
        isNew: j.posted_date ? (new Date(j.posted_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) : false,
        salary: null,
        displaySalary: 'Salary not specified',
        requirements: [],
        category: null,
        isRemote: false,
      };
    });

    // Merge, sort by postedDate/createdAt desc, then paginate
    const merged = [...employerJobs, ...aiTransformed].sort((a: any, b: any) => {
      const da = a.postedDate ? new Date(a.postedDate).getTime() : 0;
      const db = b.postedDate ? new Date(b.postedDate).getTime() : 0;
      return db - da;
    });

    const totalItems = count + aiTransformed.length; // approximate; for exact, do count query on aijobs
    const start = calculatedOffset;
    const end = start + calculatedLimit;
    const paged = merged.slice(start, end);

    const totalPages = Math.ceil(totalItems / calculatedLimit) || 1;
    res.json({
      jobs: paged,
      pagination: {
        currentPage: page ? Number(page) : Math.floor(calculatedOffset / calculatedLimit) + 1,
        totalPages,
        totalItems,
        itemsPerPage: calculatedLimit
      }
    });
  } catch (e) {
    next(e);
  }
}

export async function getJob(req: Request, res: Response, next: NextFunction) {
  try {
    const param = req.params.id as string;
    const id = extractIdFromSlug(param);
    
    // First try to find in database
    let job = await Job.findByPk(id, {
      attributes: { exclude: ['slug', 'previousSlugs'] }
    });
    if (!job) {
      // Try AI jobs table
      const ai = await (AiJob as any).findByPk(id);
      if (ai) {
        // Transform to frontend shape
        let skillsArray: string[] | undefined = undefined;
        if (ai.skills) {
          skillsArray = String(ai.skills).split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        const transformed = {
          id: String(ai.id),
          title: ai.title || '',
          company: ai.company || '',
          location: ai.location || null,
          type: ai.job_type || null,
          jobType: ai.job_type || null,
          description: ai.description || null,
          skills: skillsArray,
          experience: undefined,
          experienceLevel: ai.experience || null,
          postedDate: ai.posted_date || null,
          jobUrl: ai.job_url || null,
          rating: 4.5,
          applicantsCount: 0,
          isBookmarked: false,
          isNew: ai.posted_date ? (new Date(ai.posted_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) : false,
          salary: null,
          displaySalary: 'Salary not specified',
          requirements: [],
          category: null,
          isRemote: false,
        };
        return res.json(transformed);
      }
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Job found in database - return it with transformations (no slug redirects)
    
    // Transform the data to include legacy fields for frontend compatibility
    const jobData = job.toJSON() as any;
    const transformedJob = {
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
      rating: 4.5, // Default rating
      applicantsCount: 0, // Will be updated if needed
      isBookmarked: false,
      isNew: new Date(jobData.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // New if created within last 7 days
      // Include additional useful fields
      jobType: jobData.type, // Alias for type
      experienceLevel: jobData.experienceLevel,
      vacancies: jobData.vacancies,
      applicationDeadline: jobData.applicationDeadline,
      category: jobData.category,
      educationRequired: jobData.educationRequired,
      companyWebsite: jobData.companyWebsite,
      contactEmail: jobData.contactEmail,
      contactPhone: jobData.contactPhone
    };
    
    res.json(transformedJob);
  } catch (e) { next(e); }
}

export async function createJob(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get the user to access their company name
    const { User } = await import('../models');
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.companyName) {
      return res.status(400).json({ message: 'Employer must have a company name' });
    }

    // Extract and validate required fields
    const { 
      title, 
      location, 
      type, 
      category, 
      description,
      // Enhanced fields
      jobDescription,
      experienceLevel,
      minSalary,
      maxSalary,
      salaryCurrency,
      salaryType,
      vacancies,
      educationRequired,
      skillsRequired,
      genderPreference,
      locationType,
      fullAddress,
      city,
      state,
      country,
      companyWebsite,
      contactEmail,
      contactPhone,
      applicationDeadline,
      status,
      // Legacy fields for backward compatibility
      salary, 
      experience, 
      skills, 
      requirements, 
      responsibilities, 
      benefits, 
      isRemote 
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Job title is required' });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({ message: 'Job location is required' });
    }

    // Prepare comprehensive job data for the database
    const jobData = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
      title: title.trim(),
      company: user.companyName,
      companyId: userId,
      location: location.trim(),
      type: type || 'Full-Time',
      category: category || 'General',
      isRemote: isRemote || locationType === 'Remote' || false,
      description: description || jobDescription || `Job Type: ${type || 'Full-Time'}\nLocation: ${location}\nSkills: ${skillsRequired ? skillsRequired.join(', ') : 'Not specified'}`,
      
      // Enhanced fields
      jobDescription: jobDescription || description,
      experienceLevel: experienceLevel || 'Fresher',
      minSalary: minSalary || null,
      maxSalary: maxSalary || null,
      salaryCurrency: salaryCurrency || 'INR',
      salaryType: salaryType || 'Yearly',
      vacancies: vacancies || 1,
      educationRequired: educationRequired || null,
      skillsRequired: skillsRequired || skills || [],
      genderPreference: genderPreference || 'Any',
      locationType: locationType || 'On-site',
      fullAddress: fullAddress || null,
      city: city || null,
      state: state || null,
      country: country || 'India',
      companyWebsite: companyWebsite || null,
      contactEmail: contactEmail || user.email,
      contactPhone: contactPhone || user.phone,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
      status: status || 'Active'
    };

    console.log('Creating job with data:', jobData);

    const created = await Job.create(jobData);
    // Generate and store slug after ID is known
    try {
      const slug = buildJobSlug({
        title: created.title,
        company: created.company,
        location: created.location || created.city || undefined,
        id: created.id,
      });
      await created.update({ slug });
    } catch (slugErr) {
      console.error('Error generating slug for job:', slugErr);
    }
    
    // Return the created job with all fields
    const responseData = {
      ...created.toJSON(),
      // Include legacy fields for backward compatibility
      salary: salary || { min: minSalary, max: maxSalary, currency: salaryCurrency },
      experience: experience || { level: experienceLevel },
      skills: skillsRequired || skills,
      requirements: requirements || [],
      responsibilities: responsibilities || [],
      benefits: benefits || []
    };

    // Send job notification emails to all job seekers (non-blocking)
    try {
      // Get all job seekers (employees)
      const jobSeekers = await User.findAll({
        where: { role: 'employee' },
        attributes: ['email'],
      });

      if (jobSeekers.length > 0) {
        const jobSeekerEmails = jobSeekers.map(user => user.email).filter(email => email);
        
        const jobData = {
          title: created.title,
          company: created.company,
          location: created.location || 'Not specified',
          experience: created.experienceLevel || 'Not specified',
          type: created.type || 'Full-time',
          salary: created.minSalary && created.maxSalary ? 
            `${created.salaryCurrency || 'USD'} ${created.minSalary} - ${created.maxSalary}` : 
            'Competitive',
          description: created.description || '',
          jobId: created.id
        };

        const emailResult = await sendJobNotificationEmail(jobSeekerEmails, jobData);
        
        if (emailResult.success) {
          console.log('✅ Job notification emails sent successfully');
        } else {
          logEmailError('Job Notification', emailResult.error);
        }
      }
    } catch (emailError) {
      logEmailError('Job Notification', emailError);
      // Don't fail job creation if email fails
    }

    res.status(201).json(responseData);
  } catch (e) { 
    console.error('Error creating job:', e);
    next(e); 
  }
}

export async function updateJob(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const job = await Job.findByPk(req.params.id, {
      attributes: {
        exclude: ['slug', 'previousSlugs']
      }
    });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    
    // Check if the job belongs to this employer
    if (job.companyId !== userId) {
      return res.status(403).json({ message: 'You can only update your own jobs' });
    }
    
    console.log('Updating job with data:', req.body);

    // Extract and validate the update data
    const { 
      title, 
      description,
      category,
      type,
      experienceLevel,
      minSalary,
      maxSalary,
      salaryCurrency,
      salaryType,
      vacancies,
      educationRequired,
      skillsRequired,
      genderPreference,
      locationType,
      fullAddress,
      city,
      state,
      country,
      companyWebsite,
      contactEmail,
      contactPhone,
      applicationDeadline,
      status,
      location,
      isRemote
    } = req.body;

    // Prepare update data with proper field mapping
    const updateData: any = {};

    // Basic job fields
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (type !== undefined) updateData.type = type;
    if (experienceLevel !== undefined) updateData.experienceLevel = experienceLevel;
    
    // Salary fields
    if (minSalary !== undefined) updateData.minSalary = minSalary;
    if (maxSalary !== undefined) updateData.maxSalary = maxSalary;
    if (salaryCurrency !== undefined) updateData.salaryCurrency = salaryCurrency;
    if (salaryType !== undefined) updateData.salaryType = salaryType;
    if (vacancies !== undefined) updateData.vacancies = vacancies;
    
    // Requirements
    if (educationRequired !== undefined) updateData.educationRequired = educationRequired;
    if (skillsRequired !== undefined) updateData.skillsRequired = skillsRequired;
    if (genderPreference !== undefined) updateData.genderPreference = genderPreference;
    
    // Location fields
    if (locationType !== undefined) updateData.locationType = locationType;
    if (fullAddress !== undefined) updateData.fullAddress = fullAddress;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (location !== undefined) updateData.location = location;
    if (isRemote !== undefined) updateData.isRemote = isRemote;
    
    // Company details
    if (companyWebsite !== undefined) updateData.companyWebsite = companyWebsite;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    
    // Status and dates
    if (applicationDeadline !== undefined) {
      updateData.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : null;
    }
    if (status !== undefined) updateData.status = status;

    console.log('Processed update data:', updateData);

    // Update the job
    await job.update(updateData);
    
    // Return the updated job with transformed data for frontend compatibility
    const updatedJob = await Job.findByPk(req.params.id);
    const jobData = updatedJob!.toJSON() as any;
    
    const transformedJob = {
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
      rating: 4.5,
      applicantsCount: 0,
      isBookmarked: false,
      isNew: new Date(jobData.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      // Include additional useful fields
      jobType: jobData.type,
      experienceLevel: jobData.experienceLevel,
      vacancies: jobData.vacancies,
      applicationDeadline: jobData.applicationDeadline,
      category: jobData.category,
      educationRequired: jobData.educationRequired,
      companyWebsite: jobData.companyWebsite,
      contactEmail: jobData.contactEmail,
      contactPhone: jobData.contactPhone
    };
    
    console.log('Job updated successfully:', transformedJob);
    res.json(transformedJob);
  } catch (e) { 
    console.error('Error updating job:', e);
    next(e); 
  }
}

export async function deleteJob(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the job first to check if it exists and belongs to the user
    const job = await Job.findByPk(req.params.id, {
      attributes: {
        exclude: ['slug', 'previousSlugs']
      }
    });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if the job belongs to this employer
    if (job.companyId !== userId) {
      return res.status(403).json({ message: 'You can only delete your own jobs' });
    }

    console.log('Deleting job:', req.params.id, 'for user:', userId);

    // Use a transaction to handle related data deletion
    const { sequelize } = require('../models');
    const transaction = await sequelize.transaction();

    try {
      // Delete related data first to avoid foreign key constraint issues
      console.log('Deleting related data...');
      
      // Delete applications for this job
      const { Application } = require('../models');
      const applicationsDeleted = await Application.destroy({
        where: { jobId: req.params.id },
        transaction
      });
      console.log('Applications deleted:', applicationsDeleted);

      // Delete saved jobs for this job
      const { SavedJob } = require('../models');
      const savedJobsDeleted = await SavedJob.destroy({
        where: { jobId: req.params.id },
        transaction
      });
      console.log('Saved jobs deleted:', savedJobsDeleted);

      // Now delete the job itself
      const deleted = await Job.destroy({ 
        where: { id: req.params.id, companyId: userId },
        transaction
      });
      
      console.log('Job deleted:', deleted);

      // Commit the transaction
      await transaction.commit();
    
    res.json({ 
      success: true,
      deleted: deleted,
        message: 'Job deleted successfully',
        relatedData: {
          applicationsDeleted,
          savedJobsDeleted
        }
      });
    } catch (transactionError) {
      // Rollback the transaction if anything fails
      await transaction.rollback();
      console.error('Transaction error:', transactionError);
      throw transactionError;
    }
  } catch (e) { 
    console.error('Error deleting job:', e);
    next(e); 
  }
}

export async function getEmployerJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    if (!userId || userRole !== 'employer') {
      return res.status(403).json({ message: 'Forbidden - Employer access only' });
    }

    // Get the user to access their company name
    const { User, Application } = await import('../models');
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user doesn't have companyName, provide helpful error with user details
    if (!user.companyName) {
      console.log('User without companyName:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyName: user.companyName
      });
      
      return res.status(400).json({ 
        message: 'Employer must have a company name',
        details: {
          userId: user.id,
          email: user.email,
          name: user.name,
          currentCompanyName: user.companyName,
          suggestion: 'Please update your profile with a company name'
        }
      });
    }

    // Find all jobs for this employer (using companyId instead of company name)
    const jobs = await Job.findAll({
      where: { companyId: userId },
      order: [['createdAt', 'DESC']],
    });

    // Get application counts separately to avoid association issues
    const { Application: ApplicationModel } = await import('../models');
    const jobIds = jobs.map(job => job.id);
    const applications = await ApplicationModel.findAll({
      where: { jobId: jobIds },
      attributes: ['id', 'status', 'userId', 'createdAt', 'jobId'],
    });

    // Group applications by jobId
    const applicationsByJob = applications.reduce((acc, app) => {
      const jobId = app.jobId;
      if (!acc[jobId]) acc[jobId] = [];
      acc[jobId].push(app);
      return acc;
    }, {} as Record<string, any[]>);

    // Transform jobs to include application counts and legacy salary shape
    const jobsWithStats = jobs.map(job => {
      const jobData = job.toJSON() as any;
      const jobApplications = applicationsByJob[job.id] || [];
      
      return {
        ...jobData,
        // Backward-compatible salary structure expected by frontend job cards
        salary: (jobData.minSalary || jobData.maxSalary) ? {
          min: jobData.minSalary || null,
          max: jobData.maxSalary || null,
          currency: jobData.salaryCurrency || 'INR'
        } : null,
        applicationsCount: jobApplications.length,
      };
    });

    console.log(`Found ${jobsWithStats.length} jobs for employer: ${user.email} (${user.companyName})`);
    res.json(jobsWithStats);
  } catch (e) { 
    console.error('Error fetching employer jobs:', e);
    next(e); 
  }
}

export async function recordApplyClick(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const param = req.params.id as string;
    const jobId = extractIdFromSlug(param);
    
    // Verify job exists
    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user already clicked today (deduplication)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingClick = await JobApplyClick.findOne({
      where: {
        jobId,
        userId,
        createdAt: {
          [Op.between]: [todayStart, todayEnd]
        }
      }
    });

    if (existingClick) {
      // Already logged today, return success without creating duplicate
      return res.json({ success: true, message: 'Click already recorded today' });
    }

    // Create new click record
    await JobApplyClick.create({
      jobId,
      userId,
    });

    res.json({ success: true, message: 'Click recorded successfully' });
  } catch (e) {
    console.error('Error recording apply click:', e);
    next(e);
  }
}