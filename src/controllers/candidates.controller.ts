import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { Op } from 'sequelize';
import { getSignedUrl } from '../services/s3Service';
import { AuthRequest } from '../middleware/auth';

export async function listCandidates(req: Request, res: Response, next: NextFunction) {
  try {
    const { 
      search, 
      location, 
      experience, 
      skills,
      minRating,
      page = 1, 
      limit = 20 
    } = req.query;

    const where: any = {
      role: 'employee' // Only fetch employees (candidates)
    };

    // Search by name, professional title, or skills
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { professionalTitle: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter by location (city, country, or fullAddress)
    if (location && location !== 'all') {
      where[Op.or] = [
        { city: { [Op.like]: `%${location}%` } },
        { country: { [Op.like]: `%${location}%` } },
        { fullAddress: { [Op.like]: `%${location}%` } },
      ];
    }

    // Filter by experience (using expectedSalary as a proxy for experience level)
    if (experience && experience !== 'all') {
      // This is a simplified approach - in a real app you'd have a dedicated experience field
      where.description = { [Op.like]: `%${experience}%` };
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']], // Order by newest first
      attributes: [
        'id', 'name', 'email', 'phone', 'professionalTitle', 'skills', 
        'resumeUrl', 'avatarUrl', 'description', 'city', 'country', 
        'fullAddress', 'expectedSalary', 'currentSalary', 'languages', 
        'age', 'postcode', 'createdAt', 'updatedAt'
      ]
    });

    // Transform users to candidate format and filter by skills
    let candidates = users.map(user => {
      // Handle skills - they might be objects with 'skill' key or just strings
      let skillsArray: string[] = [];
      if (user.skills) {
        if (Array.isArray(user.skills)) {
          skillsArray = user.skills.map(skill => {
            if (typeof skill === 'string') {
              return skill;
            } else if (typeof skill === 'object' && skill !== null && 'skill' in skill) {
              return (skill as { skill: string }).skill;
            }
            return String(skill);
          });
        } else if (typeof user.skills === 'string') {
          skillsArray = [user.skills];
        }
      }

      return {
        id: user.id,
        name: user.name,
        jobTitle: user.professionalTitle || 'Professional',
        company: null, // Users don't have company field
        location: user.city || user.country || 'Not specified',
        salary: user.expectedSalary || user.currentSalary || 'Negotiable',
        skills: skillsArray,
        experience: user.description ? 'See profile' : 'Not specified',
        education: null, // Not available in User model
        resumeUrl: user.resumeUrl,
        profileImage: user.avatarUrl,
        rating: 4.5, // Default rating since we don't have ratings for users
        hourlyRate: user.expectedSalary || 'Negotiable',
        lastActive: user.updatedAt,
        email: user.email,
        phone: user.phone,
        description: user.description,
        // Additional profile fields
        professionalTitle: user.professionalTitle,
        languages: user.languages,
        age: user.age,
        currentSalary: user.currentSalary,
        expectedSalary: user.expectedSalary,
        country: user.country,
        postcode: user.postcode,
        city: user.city,
        fullAddress: user.fullAddress
      };
    });

    // Filter by skills in memory
    if (skills && skills !== 'all') {
      candidates = candidates.filter(candidate => 
        candidate.skills && 
        candidate.skills.some((skill: string) => 
          skill.toLowerCase().includes((skills as string).toLowerCase())
        )
      );
    }

    res.json({
      candidates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: candidates.length,
        pages: Math.ceil(candidates.length / Number(limit)),
      },
    });
  } catch (e) { next(e); }
}

export async function getCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findOne({
      where: { 
        id: req.params.id,
        role: 'employee'
      },
      attributes: [
        'id', 'name', 'email', 'phone', 'professionalTitle', 'skills', 
        'resumeUrl', 'avatarUrl', 'description', 'city', 'country', 
        'fullAddress', 'expectedSalary', 'currentSalary', 'languages', 
        'age', 'postcode', 'createdAt', 'updatedAt'
      ]
    });
    
    if (!user) return res.status(404).json({ message: 'Candidate not found' });
    
    // Handle skills - they might be objects with 'skill' key or just strings
    let skillsArray: string[] = [];
    if (user.skills) {
      if (Array.isArray(user.skills)) {
        skillsArray = user.skills.map(skill => {
          if (typeof skill === 'string') {
            return skill;
          } else if (typeof skill === 'object' && skill !== null && 'skill' in skill) {
            return (skill as { skill: string }).skill;
          }
          return String(skill);
        });
      } else if (typeof user.skills === 'string') {
        skillsArray = [user.skills];
      }
    }

    // Transform user to candidate format
    const candidate = {
      id: user.id,
      name: user.name,
      jobTitle: user.professionalTitle || 'Professional',
      company: null,
      location: user.city || user.country || 'Not specified',
      salary: user.expectedSalary || user.currentSalary || 'Negotiable',
      skills: skillsArray,
      experience: user.description ? 'See profile' : 'Not specified',
      education: null,
      resumeUrl: user.resumeUrl,
      profileImage: user.avatarUrl,
      rating: 4.5,
      hourlyRate: user.expectedSalary || 'Negotiable',
      lastActive: user.updatedAt,
      email: user.email,
      phone: user.phone,
      description: user.description,
      // Additional profile fields
      professionalTitle: user.professionalTitle,
      languages: user.languages,
      age: user.age,
      currentSalary: user.currentSalary,
      expectedSalary: user.expectedSalary,
      country: user.country,
      postcode: user.postcode,
      city: user.city,
      fullAddress: user.fullAddress
    };
    
    res.json(candidate);
  } catch (e) { next(e); }
}

/**
 * Get a signed download URL for a candidate's resume (employer-only)
 */
export async function getCandidateResumeDownloadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = (req as AuthRequest).user;
    if (!requester) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (requester.role !== 'employer') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { id } = req.params;
    const user = await User.findOne({
      where: {
        id,
        role: 'employee'
      },
      attributes: ['resumeUrl', 'name']
    });

    if (!user) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    if (!user.resumeUrl) {
      return res.status(404).json({ message: 'Resume not available for this person' });
    }

    // Generate a signed URL from the stored S3 URL or key
    const signedUrl = await getSignedUrl(user.resumeUrl, 60 * 60); // 1 hour expiry

    return res.json({
      url: signedUrl,
      fileName: `${user.name || 'candidate'}_resume`
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Download candidate resume
 * Generates a signed URL for S3 files or returns the resume URL directly
 */
export async function downloadCandidateResume(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user is authenticated and is an employer
    const user = (req as AuthRequest).user;
    if (!user || user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can download candidate resumes' });
    }

    const candidateId = req.params.id;
    
    // Find the candidate
    const candidate = await User.findOne({
      where: { 
        id: candidateId,
        role: 'employee'
      },
      attributes: ['id', 'name', 'resumeUrl']
    });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Check if candidate has a resume
    if (!candidate.resumeUrl) {
      return res.status(404).json({ message: 'Resume not available for this candidate' });
    }

    // If resumeUrl is an S3 URL, generate a signed URL
    let downloadUrl = candidate.resumeUrl;
    
    // Check if it's an S3 URL (either from our bucket or any S3 bucket)
    if (candidate.resumeUrl.includes('amazonaws.com') || candidate.resumeUrl.includes('.s3.')) {
      try {
        downloadUrl = await getSignedUrl(candidate.resumeUrl, 3600); // Valid for 1 hour
      } catch (s3Error) {
        console.error('Error generating signed URL:', s3Error);
        // If signed URL generation fails, fall back to the original URL
        // This works if the bucket/object has public read access
        downloadUrl = candidate.resumeUrl;
      }
    }

    // Return the download URL
    res.json({
      success: true,
      downloadUrl,
      candidateName: candidate.name,
      message: 'Resume download URL generated successfully'
    });
  } catch (e) { 
    console.error('Error downloading candidate resume:', e);
    next(e); 
  }
}

// Note: createCandidate, updateCandidate, and deleteCandidate are not needed
// since we're using real User records. Users are managed through the users API.
