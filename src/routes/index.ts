import path from 'path';
import { Router } from 'express';
import auth from './auth';
import users from './users';
import jobs from './jobs';
import candidates from './candidates';
import applications from './applications';
import savedJobs from './savedJobs';
import savedCandidates from './savedCandidates';
import notifications from './notifications';
import profile from './profile';
import search from './search';
import companies from './companies';
import analytics from './analytics';
import cv from './cv';
import resume from './resume';
import resumeSections from './resumeSections';
import resumeUpload from './resumeUpload';
import upload from './upload';
import email from './email';

const router = Router();
router.use('/auth', auth);
router.use('/users', users);
router.use('/jobs', jobs);
router.use('/candidates', candidates);
router.use('/applications', applications);
router.use('/saved-jobs', savedJobs);
router.use('/saved-candidates', savedCandidates);
router.use('/notifications', notifications);
router.use('/profile', profile);
router.use('/search', search);
router.use('/companies', companies);
router.use('/analytics', analytics);
router.use('/cv', cv);
router.use('/resume', resume);
router.use('/resume-sections', resumeSections);
router.use('/resume', resumeUpload);
router.use('/upload', upload);
router.use('/email', email);

router.get('/send-fresher-mails', async (_req, res, next) => {
  try {
    const notificationModulePath = path.resolve(__dirname, '../../notifications/email');
    const notificationModule = require(notificationModulePath);
    if (!notificationModule || typeof notificationModule.triggerFresherJobEmailRun !== 'function') {
      throw new Error('Fresher job notification module is unavailable');
    }

    const summary = await notificationModule.triggerFresherJobEmailRun({ source: 'api' });
    res.json({
      status: 'ok',
      summary,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
