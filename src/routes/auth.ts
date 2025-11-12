import { Router } from 'express';
import { register, login, me, changePassword, sendOTP, verifyOTP } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate, changePassword);

export default router;
