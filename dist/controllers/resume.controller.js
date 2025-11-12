"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResumes = getResumes;
exports.getResume = getResume;
exports.createResume = createResume;
exports.updateResume = updateResume;
exports.deleteResume = deleteResume;
exports.setPrimaryResume = setPrimaryResume;
exports.duplicateResume = duplicateResume;
exports.getResumeStats = getResumeStats;
exports.exportResume = exportResume;
const Resume_1 = require("../models/Resume");
// Get all resumes for a user
async function getResumes(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { page = 1, limit = 10, status, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause = { userId };
        if (status) {
            whereClause.status = status;
        }
        if (search) {
            whereClause.title = {
                [require('sequelize').Op.like]: `%${search}%`
            };
        }
        const { count, rows: resumes } = await Resume_1.Resume.findAndCountAll({
            where: whereClause,
            limit: Number(limit),
            offset,
            order: [['updatedAt', 'DESC']]
        });
        res.json({
            success: true,
            resumes,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(count / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching resumes:', error);
        next(error);
    }
}
// Get a single resume
async function getResume(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const resume = await Resume_1.Resume.findOne({
            where: { id, userId }
        });
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }
        res.json({
            success: true,
            resume
        });
    }
    catch (error) {
        console.error('Error fetching resume:', error);
        next(error);
    }
}
// Create a new resume
async function createResume(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { title, personalInfo, settings } = req.body;
        // Check if this should be the primary resume
        const { isPrimary } = req.body;
        if (isPrimary) {
            // Remove primary status from other resumes
            await Resume_1.Resume.update({ isPrimary: false }, { where: { userId } });
        }
        const resume = await Resume_1.Resume.create({
            userId,
            title: title || 'My Resume',
            personalInfo: personalInfo || {
                fullName: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
                linkedin: '',
                website: '',
                summary: ''
            },
            workExperience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
            languages: [],
            references: [],
            additionalInfo: {
                interests: [],
                volunteerWork: [],
                publications: [],
                awards: []
            },
            settings: settings || {
                template: 'modern',
                colorScheme: 'blue',
                fontFamily: 'Arial',
                fontSize: 12,
                margins: { top: 1, bottom: 1, left: 1, right: 1 },
                sections: {
                    personalInfo: true,
                    summary: true,
                    workExperience: true,
                    education: true,
                    skills: true,
                    projects: false,
                    certifications: false,
                    languages: false,
                    references: false,
                    additionalInfo: false
                },
                sectionOrder: ['personalInfo', 'summary', 'workExperience', 'education', 'skills']
            },
            isPrimary: isPrimary || false,
            isPublic: false,
            status: 'draft'
        });
        res.status(201).json({
            success: true,
            message: 'Resume created successfully',
            resume
        });
    }
    catch (error) {
        console.error('Error creating resume:', error);
        next(error);
    }
}
// Update a resume
async function updateResume(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const updateData = req.body;
        const resume = await Resume_1.Resume.findOne({
            where: { id, userId }
        });
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }
        // Handle primary resume logic
        if (updateData.isPrimary && !resume.isPrimary) {
            await Resume_1.Resume.update({ isPrimary: false }, { where: { userId } });
        }
        await resume.update(updateData);
        res.json({
            success: true,
            message: 'Resume updated successfully',
            resume
        });
    }
    catch (error) {
        console.error('Error updating resume:', error);
        next(error);
    }
}
// Delete a resume
async function deleteResume(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const resume = await Resume_1.Resume.findOne({
            where: { id, userId }
        });
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }
        await resume.destroy();
        res.json({
            success: true,
            message: 'Resume deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting resume:', error);
        next(error);
    }
}
// Set primary resume
async function setPrimaryResume(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const resume = await Resume_1.Resume.findOne({
            where: { id, userId }
        });
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }
        // Remove primary status from other resumes
        await Resume_1.Resume.update({ isPrimary: false }, { where: { userId } });
        // Set this resume as primary
        await resume.update({ isPrimary: true });
        res.json({
            success: true,
            message: 'Primary resume updated successfully',
            resume
        });
    }
    catch (error) {
        console.error('Error setting primary resume:', error);
        next(error);
    }
}
// Duplicate a resume
async function duplicateResume(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const originalResume = await Resume_1.Resume.findOne({
            where: { id, userId }
        });
        if (!originalResume) {
            return res.status(404).json({ message: 'Resume not found' });
        }
        const resumeData = originalResume.toJSON();
        delete resumeData.id;
        delete resumeData.createdAt;
        delete resumeData.updatedAt;
        const newResume = await Resume_1.Resume.create({
            ...resumeData,
            title: `${resumeData.title} (Copy)`,
            isPrimary: false,
            status: 'draft'
        });
        res.status(201).json({
            success: true,
            message: 'Resume duplicated successfully',
            resume: newResume
        });
    }
    catch (error) {
        console.error('Error duplicating resume:', error);
        next(error);
    }
}
// Get resume statistics
async function getResumeStats(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const totalResumes = await Resume_1.Resume.count({ where: { userId } });
        const publishedResumes = await Resume_1.Resume.count({ where: { userId, status: 'published' } });
        const draftResumes = await Resume_1.Resume.count({ where: { userId, status: 'draft' } });
        const primaryResume = await Resume_1.Resume.findOne({ where: { userId, isPrimary: true } });
        res.json({
            success: true,
            stats: {
                total: totalResumes,
                published: publishedResumes,
                draft: draftResumes,
                primary: primaryResume ? primaryResume.id : null
            }
        });
    }
    catch (error) {
        console.error('Error fetching resume stats:', error);
        next(error);
    }
}
// Export resume as PDF (placeholder - would need actual PDF generation)
async function exportResume(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const { format = 'pdf' } = req.query;
        const resume = await Resume_1.Resume.findOne({
            where: { id, userId }
        });
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }
        // This is a placeholder - in a real implementation, you would generate PDF here
        res.json({
            success: true,
            message: `Resume export as ${format} is not yet implemented`,
            resume: {
                id: resume.id,
                title: resume.title,
                status: resume.status
            }
        });
    }
    catch (error) {
        console.error('Error exporting resume:', error);
        next(error);
    }
}
//# sourceMappingURL=resume.controller.js.map