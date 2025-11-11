import { Request, Response, NextFunction } from 'express';
import { SavedJob, Job } from '../models';
import { AuthRequest } from '../middleware/auth';

export async function getSavedJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const savedJobs = await SavedJob.findAll({
      where: { userId },
      include: [{ model: Job, as: 'job' }],
    });
    res.json(savedJobs);
  } catch (e) { next(e); }
}

export async function saveJob(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: 'Job ID is required' });

    const existing = await SavedJob.findOne({
      where: { userId, jobId }
    });
    if (existing) {
      return res.status(409).json({ message: 'Job already saved' });
    }

    const savedJob = await SavedJob.create({ userId, jobId });
    res.status(201).json(savedJob);
  } catch (e) { next(e); }
}

export async function unsaveJob(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const deleted = await SavedJob.destroy({
      where: { userId, jobId: req.params.jobId }
    });
    res.json({ deleted: deleted > 0 });
  } catch (e) { next(e); }
}

export async function checkJobSaved(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { jobId } = req.params;
    const savedJob = await SavedJob.findOne({
      where: { userId, jobId }
    });
    
    res.json({ isSaved: !!savedJob });
  } catch (e) { next(e); }
}

export async function bulkSaveJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { jobIds } = req.body;
    if (!Array.isArray(jobIds)) {
      return res.status(400).json({ message: 'Job IDs must be an array' });
    }

    const results = [];
    const errors = [];

    for (const jobId of jobIds) {
      try {
        const existing = await SavedJob.findOne({
          where: { userId, jobId }
        });
        
        if (!existing) {
          await SavedJob.create({ userId, jobId });
          results.push(jobId);
        }
      } catch (error) {
        errors.push(`Failed to save job ${jobId}: ${error}`);
      }
    }

    res.json({
      success: true,
      saved: results.length,
      errors
    });
  } catch (e) { next(e); }
}

export async function bulkUnsaveJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { jobIds } = req.body;
    if (!Array.isArray(jobIds)) {
      return res.status(400).json({ message: 'Job IDs must be an array' });
    }

    const deleted = await SavedJob.destroy({
      where: { 
        userId, 
        jobId: jobIds 
      }
    });

    res.json({
      success: true,
      removed: deleted
    });
  } catch (e) { next(e); }
}

export async function getSavedJobsStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const totalSaved = await SavedJob.count({
      where: { userId }
    });

    const recentSaved = await SavedJob.count({
      where: { 
        userId,
        savedAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    res.json({
      totalSaved,
      recentSaved,
      lastUpdated: new Date()
    });
  } catch (e) { next(e); }
}