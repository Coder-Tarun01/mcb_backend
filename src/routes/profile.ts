import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProfile,
  updateProfile,
  uploadResume,
  uploadResumeHandler,
  uploadAvatar,
  uploadAvatarHandler,
  getSkills,
  updateSkills
} from '../controllers/profile.controller';

const router = Router();
router.use(authenticate);

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/upload-resume', uploadResume, uploadResumeHandler);
router.post('/upload-avatar', uploadAvatar, uploadAvatarHandler);
router.get('/skills', getSkills);
router.put('/skills', updateSkills);

export default router;
