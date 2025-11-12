"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadResumeMiddleware = void 0;
exports.getUserApplications = getUserApplications;
exports.applyToJob = applyToJob;
exports.getApplication = getApplication;
exports.updateApplication = updateApplication;
exports.withdrawApplication = withdrawApplication;
exports.getJobApplications = getJobApplications;
exports.getAllEmployerApplications = getAllEmployerApplications;
exports.getEmployerStats = getEmployerStats;
const models_1 = require("../models");
const models = __importStar(require("../models"));
const multer_1 = __importDefault(require("multer"));
const s3Service_1 = require("../services/s3Service");
// Configure multer for in-memory storage and S3 upload
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowed.includes(file.mimetype))
            cb(null, true);
        else
            cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
});
exports.uploadResumeMiddleware = upload.single('resume');
async function getUserApplications(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        // Limit selected attributes to columns that exist in DB
        const applications = await models_1.Application.findAll({
            where: { userId },
            attributes: ['id', 'userId', 'jobId', 'status', 'coverLetter', 'resumeUrl', 'appliedAt', 'createdAt', 'updatedAt'],
            include: [{ model: models_1.Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] }]
        });
        return res.json(applications);
    }
    catch (e) {
        next(e);
    }
}
async function applyToJob(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        // Accept both JSON and multipart/form-data. Collect known fields and keep others.
        const { jobId, coverLetter, resumeUrl, resumeId, ...otherFields } = req.body || {};
        // Normalize potential array fields coming from FormData clients
        const cleanJobId = Array.isArray(jobId) ? jobId[0] : jobId;
        const cleanCoverLetter = Array.isArray(coverLetter) ? coverLetter.join(' ') : (coverLetter || '');
        const cleanResumeUrl = Array.isArray(resumeUrl) ? resumeUrl[0] : resumeUrl;
        const cleanResumeId = Array.isArray(resumeId) ? resumeId[0] : resumeId;
        // Basic validation
        if (!cleanJobId)
            return res.status(400).json({ message: 'Job ID is required' });
        // Check if job exists
        const job = await models_1.Job.findByPk(cleanJobId);
        if (!job)
            return res.status(404).json({ message: 'Job not found' });
        // Prevent duplicate application
        const existing = await models_1.Application.findOne({ where: { userId, jobId: cleanJobId } });
        if (existing)
            return res.status(409).json({ message: 'Already applied to this job' });
        // Resolve resume URL: uploaded file (S3) > CVFile by id > explicit resumeUrl field > user's profile
        let finalResumeUrl = null;
        if (req.file) {
            const s3 = await (0, s3Service_1.uploadToS3)(req.file, 'resumes');
            finalResumeUrl = s3.url;
        }
        else if (cleanResumeId) {
            try {
                const CVFile = models.CVFile;
                if (CVFile) {
                    const cv = await CVFile.findByPk(cleanResumeId);
                    if (cv && cv.userId === userId)
                        finalResumeUrl = cv.filePath;
                }
            }
            catch (err) {
                // ignore optional CVFile resolution errors
            }
        }
        if (!finalResumeUrl && cleanResumeUrl)
            finalResumeUrl = cleanResumeUrl;
        if (!finalResumeUrl) {
            const user = await models_1.User.findByPk(userId);
            if (user && user.resumeUrl)
                finalResumeUrl = user.resumeUrl;
        }
        // Create application
        let application;
        try {
            application = await models_1.Application.create({
                userId,
                jobId: cleanJobId,
                status: 'pending',
                coverLetter: cleanCoverLetter,
                resumeUrl: finalResumeUrl,
                ...otherFields
            });
        }
        catch (err) {
            console.error('Application creation failed:', err);
            if (err && err.name === 'SequelizeValidationError') {
                return res.status(400).json({ message: 'Validation error', details: err.errors?.map((e) => e.message) });
            }
            return res.status(500).json({ message: 'Failed to create application', error: err?.message });
        }
        return res.status(201).json({ success: true, applicationId: application.id, application });
    }
    catch (e) {
        console.error('Error in applyToJob:', e);
        next(e);
    }
}
async function getApplication(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const application = await models_1.Application.findOne({
            where: { id: req.params.id, userId },
            attributes: ['id', 'userId', 'jobId', 'status', 'coverLetter', 'resumeUrl', 'appliedAt', 'createdAt', 'updatedAt'],
            include: [{ model: models_1.Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] }]
        });
        if (!application)
            return res.status(404).json({ message: 'Not found' });
        return res.json(application);
    }
    catch (e) {
        next(e);
    }
}
async function updateApplication(req, res, next) {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        let application;
        if (userRole === 'employer') {
            // For employers, find application by job ownership
            application = await models_1.Application.findOne({
                where: { id: req.params.id },
                include: [{ model: models_1.Job, as: 'job', where: { companyId: userId } }]
            });
        }
        else {
            // For employees, find their own applications
            application = await models_1.Application.findOne({ where: { id: req.params.id, userId } });
        }
        if (!application)
            return res.status(404).json({ message: 'Not found' });
        await application.update(req.body);
        return res.json(application);
    }
    catch (e) {
        next(e);
    }
}
async function withdrawApplication(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const deleted = await models_1.Application.destroy({ where: { id: req.params.id, userId } });
        return res.json({ deleted: deleted > 0 });
    }
    catch (e) {
        next(e);
    }
}
async function getJobApplications(req, res, next) {
    try {
        const userRole = req.user?.role;
        if (userRole !== 'employer')
            return res.status(403).json({ message: 'Forbidden' });
        // Use raw query to avoid association issues
        const { sequelize } = require('../models');
        const { QueryTypes } = require('sequelize');
        const query = `
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.skills as user_skills,
        u.resumeUrl as user_resumeUrl,
        j.title as job_title,
        j.company as job_company,
        j.location as job_location
      FROM applications a
      LEFT JOIN users u ON a.userId = u.id
      LEFT JOIN jobs j ON a.jobId = j.id
      WHERE a.jobId = :jobId
      ORDER BY a.createdAt DESC
    `;
        const applications = await sequelize.query(query, { replacements: { jobId: req.params.jobId }, type: QueryTypes.SELECT });
        // Transform the raw data to match the expected format
        const transformedApplications = applications.map((app) => ({
            id: app.id,
            userId: app.userId,
            jobId: app.jobId,
            status: app.status,
            coverLetter: app.coverLetter,
            resumeUrl: app.resumeUrl,
            appliedAt: app.appliedAt,
            createdAt: app.createdAt,
            updatedAt: app.updatedAt,
            // Additional application data
            name: app.name,
            email: app.email,
            phone: app.phone,
            location: app.location,
            experience: app.experience,
            currentJobTitle: app.currentJobTitle,
            currentCompany: app.currentCompany,
            currentCTC: app.currentCTC,
            expectedCTC: app.expectedCTC,
            noticePeriod: app.noticePeriod,
            skills: app.skills,
            qualification: app.qualification,
            specialization: app.specialization,
            university: app.university,
            yearOfPassing: app.yearOfPassing,
            linkedin: app.linkedin,
            portfolio: app.portfolio,
            github: app.github,
            // User data
            user: {
                id: app.userId,
                name: app.user_name,
                email: app.user_email,
                phone: app.user_phone,
                skills: app.user_skills,
                resumeUrl: app.user_resumeUrl
            },
            // Job data
            job: {
                id: app.jobId,
                title: app.job_title,
                company: app.job_company,
                location: app.job_location
            }
        }));
        return res.json(transformedApplications);
    }
    catch (e) {
        console.error('Error in getJobApplications:', e);
        next(e);
    }
}
async function getAllEmployerApplications(req, res, next) {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId || userRole !== 'employer') {
            return res.status(403).json({ message: 'Forbidden - Employer access only' });
        }
        // Get employer's company
        const employer = await models_1.User.findByPk(userId);
        if (!employer || !employer.companyName) {
            return res.status(400).json({ message: 'Employer must have a company name' });
        }
        // Find all jobs for this company
        const jobs = await models_1.Job.findAll({ where: { company: employer.companyName }, attributes: ['id'] });
        const jobIds = jobs.map(job => job.id);
        // Find all applications for these jobs
        const applications = await models_1.Application.findAll({
            where: { jobId: jobIds },
            attributes: ['id', 'userId', 'jobId', 'status', 'coverLetter', 'resumeUrl', 'appliedAt', 'createdAt', 'updatedAt'],
            include: [
                { model: models_1.User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'skills', 'resumeUrl'] },
                { model: models_1.Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        return res.json(applications);
    }
    catch (e) {
        console.error('Error fetching employer applications:', e);
        next(e);
    }
}
async function getEmployerStats(req, res, next) {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId || userRole !== 'employer') {
            return res.status(403).json({ message: 'Forbidden - Employer access only' });
        }
        // Get employer's company
        const employer = await models_1.User.findByPk(userId);
        if (!employer || !employer.companyName) {
            return res.status(400).json({ message: 'Employer must have a company name' });
        }
        // Find all jobs for this company
        const jobs = await models_1.Job.findAll({ where: { company: employer.companyName }, attributes: ['id'] });
        const jobIds = jobs.map(job => job.id);
        const totalJobs = jobs.length;
        // Count applications by status
        const totalApplications = await models_1.Application.count({ where: { jobId: jobIds } });
        const pendingApplications = await models_1.Application.count({ where: { jobId: jobIds, status: 'pending' } });
        const reviewedApplications = await models_1.Application.count({ where: { jobId: jobIds, status: 'reviewed' } });
        const acceptedApplications = await models_1.Application.count({ where: { jobId: jobIds, status: 'accepted' } });
        const rejectedApplications = await models_1.Application.count({ where: { jobId: jobIds, status: 'rejected' } });
        return res.json({
            totalJobs,
            totalApplications,
            pendingApplications,
            reviewedApplications,
            acceptedApplications,
            rejectedApplications,
            responseRate: totalApplications > 0 ? Math.round(((acceptedApplications + rejectedApplications) / totalApplications) * 100) : 0
        });
    }
    catch (e) {
        console.error('Error fetching employer stats:', e);
        next(e);
    }
}
//# sourceMappingURL=applications.controller.js.map