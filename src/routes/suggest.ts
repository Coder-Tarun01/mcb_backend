import { Router } from 'express';
import { getSuggestions } from '../controllers/suggest.controller';

const router = Router();

router.get('/', getSuggestions);

export default router;

