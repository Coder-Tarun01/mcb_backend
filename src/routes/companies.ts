import { Router } from 'express';
import { getCompanies, getCompany, getCompanyJobs } from '../controllers/companies.controller';

const router = Router();

router.get('/', getCompanies);
router.get('/:id', getCompany);
router.get('/:id/jobs', getCompanyJobs);

export default router;
