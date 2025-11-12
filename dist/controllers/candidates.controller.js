"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCandidates = listCandidates;
exports.getCandidate = getCandidate;
exports.getCandidateResumeDownloadUrl = getCandidateResumeDownloadUrl;
exports.downloadCandidateResume = downloadCandidateResume;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const s3Service_1 = require("../services/s3Service");
async function listCandidates(req, res, next) {
    try {
        const { search, location, experience, skills, minRating, page = 1, limit = 20 } = req.query;
        const where = {
            role: 'employee' // Only fetch employees (candidates)
        };
        // Search by name, professional title, or skills
        if (search) {
            where[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { professionalTitle: { [sequelize_1.Op.like]: `%${search}%` } },
                { description: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        // Filter by location (city, country, or fullAddress)
        if (location && location !== 'all') {
            where[sequelize_1.Op.or] = [
                { city: { [sequelize_1.Op.like]: `%${location}%` } },
                { country: { [sequelize_1.Op.like]: `%${location}%` } },
                { fullAddress: { [sequelize_1.Op.like]: `%${location}%` } },
            ];
        }
        // Filter by experience (using expectedSalary as a proxy for experience level)
        if (experience && experience !== 'all') {
            // This is a simplified approach - in a real app you'd have a dedicated experience field
            where.description = { [sequelize_1.Op.like]: `%${experience}%` };
        }
        const offset = (Number(page) - 1) * Number(limit);
        const { rows: users, count: total } = await models_1.User.findAndCountAll({
            where,
            limit: Number(limit),
            offset,
            order: [['createdAt', 'DESC']], // Order by newest first
            attributes: [
                'id', 'name', 'email', 'phone', 'professionalTitle', 'skills',
                'resumeUrl', 'avatarUrl', 'description', 'city', 'country',
                'fullAddress', 'expectedSalary', 'currentSalary', 'languages',
                'age', 'postcode', 'createdAt', 'updatedAt'
            ]
        });
        // Transform users to candidate format and filter by skills
        let candidates = users.map(user => {
            // Handle skills - they might be objects with 'skill' key or just strings
            let skillsArray = [];
            if (user.skills) {
                if (Array.isArray(user.skills)) {
                    skillsArray = user.skills.map(skill => {
                        if (typeof skill === 'string') {
                            return skill;
                        }
                        else if (typeof skill === 'object' && skill !== null && 'skill' in skill) {
                            return skill.skill;
                        }
                        return String(skill);
                    });
                }
                else if (typeof user.skills === 'string') {
                    skillsArray = [user.skills];
                }
            }
            return {
                id: user.id,
                name: user.name,
                jobTitle: user.professionalTitle || 'Professional',
                company: null, // Users don't have company field
                location: user.city || user.country || 'Not specified',
                salary: user.expectedSalary || user.currentSalary || 'Negotiable',
                skills: skillsArray,
                experience: user.description ? 'See profile' : 'Not specified',
                education: null, // Not available in User model
                resumeUrl: user.resumeUrl,
                profileImage: user.avatarUrl,
                rating: 4.5, // Default rating since we don't have ratings for users
                hourlyRate: user.expectedSalary || 'Negotiable',
                lastActive: user.updatedAt,
                email: user.email,
                phone: user.phone,
                description: user.description,
                // Additional profile fields
                professionalTitle: user.professionalTitle,
                languages: user.languages,
                age: user.age,
                currentSalary: user.currentSalary,
                expectedSalary: user.expectedSalary,
                country: user.country,
                postcode: user.postcode,
                city: user.city,
                fullAddress: user.fullAddress
            };
        });
        // Filter by skills in memory
        if (skills && skills !== 'all') {
            candidates = candidates.filter(candidate => candidate.skills &&
                candidate.skills.some((skill) => skill.toLowerCase().includes(skills.toLowerCase())));
        }
        res.json({
            candidates,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: candidates.length,
                pages: Math.ceil(candidates.length / Number(limit)),
            },
        });
    }
    catch (e) {
        next(e);
    }
}
async function getCandidate(req, res, next) {
    try {
        const user = await models_1.User.findOne({
            where: {
                id: req.params.id,
                role: 'employee'
            },
            attributes: [
                'id', 'name', 'email', 'phone', 'professionalTitle', 'skills',
                'resumeUrl', 'avatarUrl', 'description', 'city', 'country',
                'fullAddress', 'expectedSalary', 'currentSalary', 'languages',
                'age', 'postcode', 'createdAt', 'updatedAt'
            ]
        });
        if (!user)
            return res.status(404).json({ message: 'Candidate not found' });
        // Handle skills - they might be objects with 'skill' key or just strings
        let skillsArray = [];
        if (user.skills) {
            if (Array.isArray(user.skills)) {
                skillsArray = user.skills.map(skill => {
                    if (typeof skill === 'string') {
                        return skill;
                    }
                    else if (typeof skill === 'object' && skill !== null && 'skill' in skill) {
                        return skill.skill;
                    }
                    return String(skill);
                });
            }
            else if (typeof user.skills === 'string') {
                skillsArray = [user.skills];
            }
        }
        // Transform user to candidate format
        const candidate = {
            id: user.id,
            name: user.name,
            jobTitle: user.professionalTitle || 'Professional',
            company: null,
            location: user.city || user.country || 'Not specified',
            salary: user.expectedSalary || user.currentSalary || 'Negotiable',
            skills: skillsArray,
            experience: user.description ? 'See profile' : 'Not specified',
            education: null,
            resumeUrl: user.resumeUrl,
            profileImage: user.avatarUrl,
            rating: 4.5,
            hourlyRate: user.expectedSalary || 'Negotiable',
            lastActive: user.updatedAt,
            email: user.email,
            phone: user.phone,
            description: user.description,
            // Additional profile fields
            professionalTitle: user.professionalTitle,
            languages: user.languages,
            age: user.age,
            currentSalary: user.currentSalary,
            expectedSalary: user.expectedSalary,
            country: user.country,
            postcode: user.postcode,
            city: user.city,
            fullAddress: user.fullAddress
        };
        res.json(candidate);
    }
    catch (e) {
        next(e);
    }
}
/**
 * Get a signed download URL for a candidate's resume (employer-only)
 */
async function getCandidateResumeDownloadUrl(req, res, next) {
    try {
        const requester = req.user;
        if (!requester) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (requester.role !== 'employer') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { id } = req.params;
        const user = await models_1.User.findOne({
            where: {
                id,
                role: 'employee'
            },
            attributes: ['resumeUrl', 'name']
        });
        if (!user) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        if (!user.resumeUrl) {
            return res.status(404).json({ message: 'Resume not available for this person' });
        }
        // Generate a signed URL from the stored S3 URL or key
        const signedUrl = await (0, s3Service_1.getSignedUrl)(user.resumeUrl, 60 * 60); // 1 hour expiry
        return res.json({
            url: signedUrl,
            fileName: `${user.name || 'candidate'}_resume`
        });
    }
    catch (e) {
        next(e);
    }
}
/**
 * Download candidate resume
 * Generates a signed URL for S3 files or returns the resume URL directly
 */
async function downloadCandidateResume(req, res, next) {
    try {
        // Check if user is authenticated and is an employer
        const user = req.user;
        if (!user || user.role !== 'employer') {
            return res.status(403).json({ message: 'Only employers can download candidate resumes' });
        }
        const candidateId = req.params.id;
        // Find the candidate
        const candidate = await models_1.User.findOne({
            where: {
                id: candidateId,
                role: 'employee'
            },
            attributes: ['id', 'name', 'resumeUrl']
        });
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        // Check if candidate has a resume
        if (!candidate.resumeUrl) {
            return res.status(404).json({ message: 'Resume not available for this candidate' });
        }
        // If resumeUrl is an S3 URL, generate a signed URL
        let downloadUrl = candidate.resumeUrl;
        // Check if it's an S3 URL (either from our bucket or any S3 bucket)
        if (candidate.resumeUrl.includes('amazonaws.com') || candidate.resumeUrl.includes('.s3.')) {
            try {
                downloadUrl = await (0, s3Service_1.getSignedUrl)(candidate.resumeUrl, 3600); // Valid for 1 hour
            }
            catch (s3Error) {
                console.error('Error generating signed URL:', s3Error);
                // If signed URL generation fails, fall back to the original URL
                // This works if the bucket/object has public read access
                downloadUrl = candidate.resumeUrl;
            }
        }
        // Return the download URL
        res.json({
            success: true,
            downloadUrl,
            candidateName: candidate.name,
            message: 'Resume download URL generated successfully'
        });
    }
    catch (e) {
        console.error('Error downloading candidate resume:', e);
        next(e);
    }
}
// Note: createCandidate, updateCandidate, and deleteCandidate are not needed
// since we're using real User records. Users are managed through the users API.
//# sourceMappingURL=candidates.controller.js.map