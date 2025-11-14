import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  searchJobs, 
  getFilterOptions, 
  getRecommendedJobs,
  autocompleteJobTitles,
  autocompleteCompanies,
  autocompleteLocations,
  autocompleteSearch
} from '../controllers/search.controller';

const router = Router();

router.get('/jobs', searchJobs);
router.get('/filters', getFilterOptions);
router.get('/recommended', authenticate, getRecommendedJobs);

// Autocomplete endpoints
router.get('/autocomplete', autocompleteSearch);
router.get('/autocomplete/titles', autocompleteJobTitles);
router.get('/autocomplete/companies', autocompleteCompanies);
router.get('/autocomplete/locations', autocompleteLocations);

export default router;
