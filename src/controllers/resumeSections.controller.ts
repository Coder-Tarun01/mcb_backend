import { Request, Response, NextFunction } from 'express';
import { Resume } from '../models/Resume';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get or create user's primary resume
async function getOrCreatePrimaryResume(userId: string) {
  let resume = await Resume.findOne({
    where: { userId, isPrimary: true }
  });

  if (!resume) {
    resume = await Resume.create({
      userId,
      title: 'My Resume',
      isPrimary: true,
      isPublic: false,
      status: 'draft',
      personalInfo: {
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
        summary: '',
        headline: ''
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
      settings: {
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
      }
    });
  }

  return resume;
}

// Resume Headline APIs
export async function getResumeHeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    const headline = resume.personalInfo?.headline || '';

    res.json({
      success: true,
      data: { headline }
    });
  } catch (error) {
    console.error('Error fetching resume headline:', error);
    next(error);
  }
}

export async function updateResumeHeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { headline } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    await resume.update({
      personalInfo: {
        ...resume.personalInfo,
        headline: headline
      }
    });

    res.json({
      success: true,
      message: 'Resume headline updated successfully',
      data: { headline }
    });
  } catch (error) {
    console.error('Error updating resume headline:', error);
    next(error);
  }
}

// Skills APIs
export async function getSkills(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    const skills = resume.skills || [];

    res.json({
      success: true,
      data: { skills }
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    next(error);
  }
}

export async function updateSkills(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { skills } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    // Add IDs to skills if they don't have them
    const skillsWithIds = skills.map((skill: any) => ({
      ...skill,
      id: skill.id || uuidv4()
    }));

    await resume.update({ skills: skillsWithIds });

    res.json({
      success: true,
      message: 'Skills updated successfully',
      data: { skills: skillsWithIds }
    });
  } catch (error) {
    console.error('Error updating skills:', error);
    next(error);
  }
}

// Employment APIs
export async function getEmployment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    const employment = resume.workExperience || [];

    res.json({
      success: true,
      data: { employment }
    });
  } catch (error) {
    console.error('Error fetching employment:', error);
    next(error);
  }
}

export async function updateEmployment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { employment } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    // Add IDs to employment entries if they don't have them
    const employmentWithIds = employment.map((job: any) => ({
      ...job,
      id: job.id || uuidv4()
    }));

    await resume.update({ workExperience: employmentWithIds });

    res.json({
      success: true,
      message: 'Employment updated successfully',
      data: { employment: employmentWithIds }
    });
  } catch (error) {
    console.error('Error updating employment:', error);
    next(error);
  }
}

// Education APIs
export async function getEducation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    const education = resume.education || [];

    res.json({
      success: true,
      data: { education }
    });
  } catch (error) {
    console.error('Error fetching education:', error);
    next(error);
  }
}

export async function updateEducation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { education } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    // Add IDs to education entries if they don't have them
    const educationWithIds = education.map((edu: any) => ({
      ...edu,
      id: edu.id || uuidv4()
    }));

    await resume.update({ education: educationWithIds });

    res.json({
      success: true,
      message: 'Education updated successfully',
      data: { education: educationWithIds }
    });
  } catch (error) {
    console.error('Error updating education:', error);
    next(error);
  }
}

// Projects APIs
export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    const projects = resume.projects || [];

    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    next(error);
  }
}

export async function updateProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { projects } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    // Add IDs to projects if they don't have them
    const projectsWithIds = projects.map((project: any) => ({
      ...project,
      id: project.id || uuidv4()
    }));

    await resume.update({ projects: projectsWithIds });

    res.json({
      success: true,
      message: 'Projects updated successfully',
      data: { projects: projectsWithIds }
    });
  } catch (error) {
    console.error('Error updating projects:', error);
    next(error);
  }
}

// Profile Summary APIs
export async function getProfileSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    const summary = resume.personalInfo?.summary || '';

    res.json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    console.error('Error fetching profile summary:', error);
    next(error);
  }
}

export async function updateProfileSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { summary } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    await resume.update({
      personalInfo: {
        ...resume.personalInfo,
        summary: summary
      }
    });

    res.json({
      success: true,
      message: 'Profile summary updated successfully',
      data: { summary }
    });
  } catch (error) {
    console.error('Error updating profile summary:', error);
    next(error);
  }
}

// Accomplishments APIs
export async function getAccomplishments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    const accomplishments = resume.additionalInfo?.awards || [];

    res.json({
      success: true,
      data: { accomplishments }
    });
  } catch (error) {
    console.error('Error fetching accomplishments:', error);
    next(error);
  }
}

export async function updateAccomplishments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { accomplishments } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    // Add IDs to accomplishments if they don't have them
    const accomplishmentsWithIds = accomplishments.map((accomplishment: any) => ({
      ...accomplishment,
      id: accomplishment.id || uuidv4()
    }));

    await resume.update({
      additionalInfo: {
        ...resume.additionalInfo,
        awards: accomplishmentsWithIds
      }
    });

    res.json({
      success: true,
      message: 'Accomplishments updated successfully',
      data: { accomplishments: accomplishmentsWithIds }
    });
  } catch (error) {
    console.error('Error updating accomplishments:', error);
    next(error);
  }
}

// Desired Career Profile APIs
export async function getDesiredCareer(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    const careerProfile = resume.additionalInfo?.careerProfile || {
      jobType: '',
      preferredLocation: '',
      noticePeriod: '',
      expectedSalary: '',
      currency: 'INR'
    };

    res.json({
      success: true,
      data: { careerProfile }
    });
  } catch (error) {
    console.error('Error fetching desired career:', error);
    next(error);
  }
}

export async function updateDesiredCareer(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { careerProfile } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    await resume.update({
      additionalInfo: {
        ...resume.additionalInfo,
        careerProfile: careerProfile
      }
    });

    res.json({
      success: true,
      message: 'Desired career profile updated successfully',
      data: { careerProfile }
    });
  } catch (error) {
    console.error('Error updating desired career:', error);
    next(error);
  }
}

// Personal Details APIs
export async function getPersonalDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    const personalDetails = resume.personalInfo || {};

    res.json({
      success: true,
      data: { personalDetails }
    });
  } catch (error) {
    console.error('Error fetching personal details:', error);
    next(error);
  }
}

export async function updatePersonalDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { personalDetails } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    await resume.update({
      personalInfo: personalDetails
    });

    res.json({
      success: true,
      message: 'Personal details updated successfully',
      data: { personalDetails }
    });
  } catch (error) {
    console.error('Error updating personal details:', error);
    next(error);
  }
}

// Generic functions for creating and deleting resume section items
export async function createResumeSection(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { section, data } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    let updatedData;
    const newItem = { ...data, id: uuidv4() };

    switch (section) {
      case 'skills':
        updatedData = [...(resume.skills || []), newItem];
        await resume.update({ skills: updatedData });
        break;
      case 'employment':
        updatedData = [...(resume.workExperience || []), newItem];
        await resume.update({ workExperience: updatedData });
        break;
      case 'education':
        updatedData = [...(resume.education || []), newItem];
        await resume.update({ education: updatedData });
        break;
      case 'projects':
        updatedData = [...(resume.projects || []), newItem];
        await resume.update({ projects: updatedData });
        break;
      case 'accomplishments':
        updatedData = [...(resume.additionalInfo?.awards || []), newItem];
        await resume.update({
          additionalInfo: {
            ...resume.additionalInfo,
            awards: updatedData
          }
        });
        break;
      default:
        return res.status(400).json({ message: 'Invalid section' });
    }

    res.json({
      success: true,
      message: `${section} item created successfully`,
      data: newItem
    });
  } catch (error) {
    console.error('Error creating resume section item:', error);
    next(error);
  }
}

export async function deleteResumeSection(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { itemId } = req.params;
    const { section } = req.body;
    const resume = await getOrCreatePrimaryResume(userId);

    let updatedData;

    switch (section) {
      case 'skills':
        updatedData = (resume.skills || []).filter((item: any) => item.id !== itemId);
        await resume.update({ skills: updatedData });
        break;
      case 'employment':
        updatedData = (resume.workExperience || []).filter((item: any) => item.id !== itemId);
        await resume.update({ workExperience: updatedData });
        break;
      case 'education':
        updatedData = (resume.education || []).filter((item: any) => item.id !== itemId);
        await resume.update({ education: updatedData });
        break;
      case 'projects':
        updatedData = (resume.projects || []).filter((item: any) => item.id !== itemId);
        await resume.update({ projects: updatedData });
        break;
      case 'accomplishments':
        updatedData = (resume.additionalInfo?.awards || []).filter((item: any) => item.id !== itemId);
        await resume.update({
          additionalInfo: {
            ...resume.additionalInfo,
            awards: updatedData
          }
        });
        break;
      default:
        return res.status(400).json({ message: 'Invalid section' });
    }

    res.json({
      success: true,
      message: `${section} item deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting resume section item:', error);
    next(error);
  }
}

// Resume Overview API
export async function getResumeOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const resume = await getOrCreatePrimaryResume(userId);
    
    // Calculate completion percentage
    let completedSections = 0;
    const totalSections = 9;
    
    if (resume.personalInfo?.fullName) completedSections++;
    if (resume.personalInfo?.headline) completedSections++;
    if (resume.workExperience?.length > 0) completedSections++;
    if (resume.education?.length > 0) completedSections++;
    if (resume.skills?.length > 0) completedSections++;
    if (resume.projects?.length > 0) completedSections++;
    if (resume.additionalInfo?.awards?.length > 0) completedSections++;
    if (resume.additionalInfo?.careerProfile) completedSections++;
    if (resume.personalInfo?.email) completedSections++;

    const completionPercentage = Math.round((completedSections / totalSections) * 100);

    const overview = {
      completionPercentage,
      totalSections,
      completedSections,
      sections: {
        personalDetails: !!resume.personalInfo?.fullName,
        headline: !!resume.personalInfo?.headline,
        employment: resume.workExperience?.length > 0,
        education: resume.education?.length > 0,
        skills: resume.skills?.length > 0,
        projects: resume.projects?.length > 0,
        accomplishments: resume.additionalInfo?.awards?.length > 0,
        careerProfile: !!resume.additionalInfo?.careerProfile
      }
    };

    res.json({
      success: true,
      data: { overview }
    });
  } catch (error) {
    console.error('Error fetching resume overview:', error);
    next(error);
  }
}
