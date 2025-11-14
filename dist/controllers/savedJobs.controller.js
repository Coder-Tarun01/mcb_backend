"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSavedJobs = getSavedJobs;
exports.saveJob = saveJob;
exports.unsaveJob = unsaveJob;
exports.checkJobSaved = checkJobSaved;
exports.bulkSaveJobs = bulkSaveJobs;
exports.bulkUnsaveJobs = bulkUnsaveJobs;
exports.getSavedJobsStats = getSavedJobsStats;
const models_1 = require("../models");
async function getSavedJobs(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const savedJobs = await models_1.SavedJob.findAll({
            where: { userId },
            include: [{ model: models_1.Job, as: 'job' }],
        });
        res.json(savedJobs);
    }
    catch (e) {
        next(e);
    }
}
async function saveJob(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { jobId } = req.body;
        if (!jobId)
            return res.status(400).json({ message: 'Job ID is required' });
        const existing = await models_1.SavedJob.findOne({
            where: { userId, jobId }
        });
        if (existing) {
            return res.status(409).json({ message: 'Job already saved' });
        }
        const savedJob = await models_1.SavedJob.create({ userId, jobId });
        res.status(201).json(savedJob);
    }
    catch (e) {
        next(e);
    }
}
async function unsaveJob(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const deleted = await models_1.SavedJob.destroy({
            where: { userId, jobId: req.params.jobId }
        });
        res.json({ deleted: deleted > 0 });
    }
    catch (e) {
        next(e);
    }
}
async function checkJobSaved(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { jobId } = req.params;
        const savedJob = await models_1.SavedJob.findOne({
            where: { userId, jobId }
        });
        res.json({ isSaved: !!savedJob });
    }
    catch (e) {
        next(e);
    }
}
async function bulkSaveJobs(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { jobIds } = req.body;
        if (!Array.isArray(jobIds)) {
            return res.status(400).json({ message: 'Job IDs must be an array' });
        }
        const results = [];
        const errors = [];
        for (const jobId of jobIds) {
            try {
                const existing = await models_1.SavedJob.findOne({
                    where: { userId, jobId }
                });
                if (!existing) {
                    await models_1.SavedJob.create({ userId, jobId });
                    results.push(jobId);
                }
            }
            catch (error) {
                errors.push(`Failed to save job ${jobId}: ${error}`);
            }
        }
        res.json({
            success: true,
            saved: results.length,
            errors
        });
    }
    catch (e) {
        next(e);
    }
}
async function bulkUnsaveJobs(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { jobIds } = req.body;
        if (!Array.isArray(jobIds)) {
            return res.status(400).json({ message: 'Job IDs must be an array' });
        }
        const deleted = await models_1.SavedJob.destroy({
            where: {
                userId,
                jobId: jobIds
            }
        });
        res.json({
            success: true,
            removed: deleted
        });
    }
    catch (e) {
        next(e);
    }
}
async function getSavedJobsStats(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const totalSaved = await models_1.SavedJob.count({
            where: { userId }
        });
        const recentSaved = await models_1.SavedJob.count({
            where: {
                userId,
                savedAt: {
                    [require('sequelize').Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            }
        });
        res.json({
            totalSaved,
            recentSaved,
            lastUpdated: new Date()
        });
    }
    catch (e) {
        next(e);
    }
}
//# sourceMappingURL=savedJobs.controller.js.map