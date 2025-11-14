"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApplicationAnalytics = getApplicationAnalytics;
exports.getJobAnalytics = getJobAnalytics;
exports.getUserAnalytics = getUserAnalytics;
const models_1 = require("../models");
async function getApplicationAnalytics(req, res, next) {
    try {
        const userRole = req.user?.role;
        if (userRole !== 'employer')
            return res.status(403).json({ message: 'Forbidden' });
        const totalApplications = await models_1.Application.count();
        const pendingApplications = await models_1.Application.count({ where: { status: 'pending' } });
        const acceptedApplications = await models_1.Application.count({ where: { status: 'accepted' } });
        const rejectedApplications = await models_1.Application.count({ where: { status: 'rejected' } });
        res.json({
            total: totalApplications,
            pending: pendingApplications,
            accepted: acceptedApplications,
            rejected: rejectedApplications,
        });
    }
    catch (e) {
        next(e);
    }
}
async function getJobAnalytics(req, res, next) {
    try {
        const userRole = req.user?.role;
        if (userRole !== 'employer')
            return res.status(403).json({ message: 'Forbidden' });
        const totalJobs = await models_1.Job.count();
        const jobsByCategory = await models_1.Job.findAll({
            attributes: ['category', [models_1.Job.sequelize.fn('COUNT', models_1.Job.sequelize.col('id')), 'count']],
            group: ['category'],
            raw: true,
        });
        res.json({
            total: totalJobs,
            byCategory: jobsByCategory,
        });
    }
    catch (e) {
        next(e);
    }
}
async function getUserAnalytics(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const userApplications = await models_1.Application.count({ where: { userId } });
        const userSavedJobs = await models_1.SavedJob.count({ where: { userId } });
        res.json({
            applications: userApplications,
            savedJobs: userSavedJobs,
        });
    }
    catch (e) {
        next(e);
    }
}
//# sourceMappingURL=analytics.controller.js.map