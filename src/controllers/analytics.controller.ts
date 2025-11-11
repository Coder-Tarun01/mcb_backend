import { Request, Response, NextFunction } from 'express';
import { Application, Job, User, SavedJob } from '../models';
import { AuthRequest } from '../middleware/auth';

export async function getApplicationAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const userRole = (req as AuthRequest).user?.role;
    if (userRole !== 'employer') return res.status(403).json({ message: 'Forbidden' });

    const totalApplications = await Application.count();
    const pendingApplications = await Application.count({ where: { status: 'pending' } });
    const acceptedApplications = await Application.count({ where: { status: 'accepted' } });
    const rejectedApplications = await Application.count({ where: { status: 'rejected' } });

    res.json({
      total: totalApplications,
      pending: pendingApplications,
      accepted: acceptedApplications,
      rejected: rejectedApplications,
    });
  } catch (e) { next(e); }
}

export async function getJobAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const userRole = (req as AuthRequest).user?.role;
    if (userRole !== 'employer') return res.status(403).json({ message: 'Forbidden' });

    const totalJobs = await Job.count();
    const jobsByCategory = await Job.findAll({
      attributes: ['category', [Job.sequelize!.fn('COUNT', Job.sequelize!.col('id')), 'count']],
      group: ['category'],
      raw: true,
    });

    res.json({
      total: totalJobs,
      byCategory: jobsByCategory,
    });
  } catch (e) { next(e); }
}

export async function getUserAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userApplications = await Application.count({ where: { userId } });
    const userSavedJobs = await SavedJob.count({ where: { userId } });

    res.json({
      applications: userApplications,
      savedJobs: userSavedJobs,
    });
  } catch (e) { next(e); }
}
