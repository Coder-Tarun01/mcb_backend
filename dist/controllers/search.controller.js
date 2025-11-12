"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchJobs = searchJobs;
exports.getFilterOptions = getFilterOptions;
exports.getRecommendedJobs = getRecommendedJobs;
exports.autocompleteJobTitles = autocompleteJobTitles;
exports.autocompleteCompanies = autocompleteCompanies;
exports.autocompleteLocations = autocompleteLocations;
exports.autocompleteSearch = autocompleteSearch;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
async function searchJobs(req, res, next) {
    try {
        const { q, location, type, category, minSalary, maxSalary, isRemote } = req.query;
        const where = {};
        if (q) {
            where[sequelize_1.Op.or] = [
                { title: { [sequelize_1.Op.like]: `%${q}%` } },
                { description: { [sequelize_1.Op.like]: `%${q}%` } },
                { company: { [sequelize_1.Op.like]: `%${q}%` } }
            ];
        }
        if (location) {
            where.location = { [sequelize_1.Op.like]: `%${location}%` };
        }
        if (type) {
            where.type = type;
        }
        if (category) {
            where.category = category;
        }
        if (isRemote !== undefined) {
            where.isRemote = isRemote === 'true';
        }
        const jobs = await models_1.Job.findAll({
            where,
            attributes: [
                'id', 'title', 'company', 'companyId', 'location', 'type', 'category',
                'isRemote', 'description', 'createdAt', 'updatedAt',
                // Enhanced fields
                'jobDescription', 'experienceLevel', 'minSalary', 'maxSalary',
                'salaryCurrency', 'salaryType', 'vacancies', 'educationRequired',
                'skillsRequired', 'genderPreference', 'locationType', 'fullAddress',
                'city', 'state', 'country', 'companyWebsite', 'contactEmail',
                'contactPhone', 'applicationDeadline', 'status'
            ],
            order: [['createdAt', 'DESC']],
        });
        // Transform the data to include legacy fields for frontend compatibility
        const transformedJobs = jobs.map(job => {
            const jobData = job.toJSON();
            return {
                ...jobData,
                // Add legacy fields for backward compatibility
                salary: (jobData.minSalary || jobData.maxSalary) ? {
                    min: jobData.minSalary || null,
                    max: jobData.maxSalary || null,
                    currency: jobData.salaryCurrency || 'INR'
                } : null,
                experience: jobData.experienceLevel ? {
                    level: jobData.experienceLevel
                } : null,
                skills: jobData.skillsRequired || [],
                requirements: [],
                postedDate: jobData.createdAt,
                // Add additional fields for frontend
                jobType: jobData.type, // Alias for type
                rating: 4.5, // Default rating
                applicantsCount: 0, // Will be updated if needed
                isBookmarked: false,
                isNew: new Date(jobData.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // New if created within last 7 days
            };
        });
        res.json(transformedJobs);
    }
    catch (e) {
        next(e);
    }
}
async function getFilterOptions(req, res, next) {
    try {
        const [locations, types, categories] = await Promise.all([
            models_1.Job.findAll({
                attributes: ['location'],
                where: { location: { [sequelize_1.Op.ne]: null } },
                group: ['location'],
                raw: true,
            }),
            models_1.Job.findAll({
                attributes: ['type'],
                where: { type: { [sequelize_1.Op.ne]: null } },
                group: ['type'],
                raw: true,
            }),
            models_1.Job.findAll({
                attributes: ['category'],
                where: { category: { [sequelize_1.Op.ne]: null } },
                group: ['category'],
                raw: true,
            }),
        ]);
        res.json({
            locations: locations.map(l => l.location).filter(Boolean),
            types: types.map(t => t.type).filter(Boolean),
            categories: categories.map(c => c.category).filter(Boolean),
        });
    }
    catch (e) {
        next(e);
    }
}
async function getRecommendedJobs(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        // Simple recommendation based on user's skills and preferences
        const user = await models_1.User.findByPk(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const userSkills = user.skills || [];
        const where = {};
        if (userSkills.length > 0) {
            where[sequelize_1.Op.or] = userSkills.map(skill => ({
                description: { [sequelize_1.Op.like]: `%${skill}%` }
            }));
        }
        const jobs = await models_1.Job.findAll({
            where,
            limit: 10,
            order: [['createdAt', 'DESC']],
        });
        res.json(jobs);
    }
    catch (e) {
        next(e);
    }
}
// Autocomplete for job titles
async function autocompleteJobTitles(req, res, next) {
    try {
        const { q } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        if (!q || q.length < 2) {
            return res.json([]);
        }
        const jobs = await models_1.Job.findAll({
            where: {
                title: { [sequelize_1.Op.like]: `%${q}%` }
            },
            attributes: ['title'],
            group: ['title'],
            limit,
            raw: true
        });
        res.json(jobs.map(j => j.title));
    }
    catch (e) {
        next(e);
    }
}
// Autocomplete for company names
async function autocompleteCompanies(req, res, next) {
    try {
        const { q } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        if (!q || q.length < 2) {
            return res.json([]);
        }
        const jobs = await models_1.Job.findAll({
            where: {
                company: { [sequelize_1.Op.like]: `%${q}%` }
            },
            attributes: ['company'],
            group: ['company'],
            limit,
            raw: true
        });
        res.json(jobs.map(j => j.company));
    }
    catch (e) {
        next(e);
    }
}
// Autocomplete for locations
async function autocompleteLocations(req, res, next) {
    try {
        const { q } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        if (!q || q.length < 2) {
            return res.json([]);
        }
        const jobs = await models_1.Job.findAll({
            where: {
                location: { [sequelize_1.Op.like]: `%${q}%` }
            },
            attributes: ['location'],
            group: ['location'],
            limit,
            raw: true
        });
        res.json(jobs.map(j => j.location).filter(Boolean));
    }
    catch (e) {
        next(e);
    }
}
// Combined autocomplete - returns jobs, companies, and locations
async function autocompleteSearch(req, res, next) {
    try {
        const { q } = req.query;
        const limit = parseInt(req.query.limit) || 5;
        if (!q || q.length < 2) {
            return res.json({
                jobs: [],
                companies: [],
                locations: []
            });
        }
        const [jobs, companies, locations] = await Promise.all([
            models_1.Job.findAll({
                where: {
                    title: { [sequelize_1.Op.like]: `%${q}%` }
                },
                attributes: ['id', 'title', 'company', 'location', 'type'],
                limit,
                order: [['createdAt', 'DESC']]
            }),
            models_1.Job.findAll({
                where: {
                    company: { [sequelize_1.Op.like]: `%${q}%` }
                },
                attributes: ['company'],
                group: ['company'],
                limit,
                raw: true
            }),
            models_1.Job.findAll({
                where: {
                    location: { [sequelize_1.Op.like]: `%${q}%` }
                },
                attributes: ['location'],
                group: ['location'],
                limit,
                raw: true
            })
        ]);
        res.json({
            jobs,
            companies: companies.map(c => c.company).filter(Boolean),
            locations: locations.map(l => l.location).filter(Boolean)
        });
    }
    catch (e) {
        next(e);
    }
}
//# sourceMappingURL=search.controller.js.map