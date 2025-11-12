import { Request, Response, NextFunction } from 'express';
import { Company, Job } from '../models';
import { ensureCompanySlug, extractIdFromSlug } from '../utils/slug';

export async function getCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const companies = await Company.findAll({
      order: [['name', 'ASC']],
    });
    res.json(companies);
  } catch (e) { next(e); }
}

export async function getCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const param = req.params.id as string;
    const id = extractIdFromSlug(param);
    const company = await Company.findByPk(id);
    if (!company) return res.status(404).json({ message: 'Not found' });
    const canonicalSlug = await ensureCompanySlug(company);
    if (param && param.includes('-') && param !== canonicalSlug) {
      return res.status(301).setHeader('Location', `/api/companies/${canonicalSlug}`).send();
    }
    res.json(company);
  } catch (e) { next(e); }
}

export async function getCompanyJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const id = extractIdFromSlug(req.params.id as string);
    const jobs = await Job.findAll({
      where: { companyId: id },
      order: [['createdAt', 'DESC']],
    });
    res.json(jobs);
  } catch (e) { next(e); }
}
