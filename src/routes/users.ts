import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listUsers, getUser, createUser, updateUser, deleteUser, updateProfile } from '../controllers/users.controller';

const router = Router();

// Public routes
router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);

// Protected routes
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Profile update route (authenticated user updates their own profile)
router.put('/profile/me', authenticate, updateProfile);

export default router;
