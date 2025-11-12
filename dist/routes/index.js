"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const users_1 = __importDefault(require("./users"));
const jobs_1 = __importDefault(require("./jobs"));
const candidates_1 = __importDefault(require("./candidates"));
const applications_1 = __importDefault(require("./applications"));
const savedJobs_1 = __importDefault(require("./savedJobs"));
const savedCandidates_1 = __importDefault(require("./savedCandidates"));
const notifications_1 = __importDefault(require("./notifications"));
const profile_1 = __importDefault(require("./profile"));
const search_1 = __importDefault(require("./search"));
const companies_1 = __importDefault(require("./companies"));
const analytics_1 = __importDefault(require("./analytics"));
const cv_1 = __importDefault(require("./cv"));
const resume_1 = __importDefault(require("./resume"));
const resumeSections_1 = __importDefault(require("./resumeSections"));
const resumeUpload_1 = __importDefault(require("./resumeUpload"));
const upload_1 = __importDefault(require("./upload"));
const email_1 = __importDefault(require("./email"));
const router = (0, express_1.Router)();
router.use('/auth', auth_1.default);
router.use('/users', users_1.default);
router.use('/jobs', jobs_1.default);
router.use('/candidates', candidates_1.default);
router.use('/applications', applications_1.default);
router.use('/saved-jobs', savedJobs_1.default);
router.use('/saved-candidates', savedCandidates_1.default);
router.use('/notifications', notifications_1.default);
router.use('/profile', profile_1.default);
router.use('/search', search_1.default);
router.use('/companies', companies_1.default);
router.use('/analytics', analytics_1.default);
router.use('/cv', cv_1.default);
router.use('/resume', resume_1.default);
router.use('/resume-sections', resumeSections_1.default);
router.use('/resume', resumeUpload_1.default);
router.use('/upload', upload_1.default);
router.use('/email', email_1.default);
router.get('/send-fresher-mails', async (_req, res, next) => {
    try {
        const notificationModulePath = path_1.default.resolve(__dirname, '../../notifications/email');
        const notificationModule = require(notificationModulePath);
        if (!notificationModule || typeof notificationModule.triggerFresherJobEmailRun !== 'function') {
            throw new Error('Fresher job notification module is unavailable');
        }
        const summary = await notificationModule.triggerFresherJobEmailRun({ source: 'api' });
        res.json({
            status: 'ok',
            summary,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map