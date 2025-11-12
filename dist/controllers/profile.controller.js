"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSkills = exports.getSkills = exports.uploadAvatarHandler = exports.uploadResumeHandler = exports.updateProfile = exports.getProfile = exports.uploadAvatar = exports.uploadResume = void 0;
const multer_1 = __importDefault(require("multer"));
const models_1 = require("../models");
const s3Service_1 = require("../services/s3Service");
const fileFields = ['avatarUrl', 'resumeUrl', 'companyLogo'];
const primaryFields = [
    'name',
    'phone',
    'companyName',
    'skills',
    'avatarUrl',
    'resumeUrl',
    'companyLogo'
];
const additionalFields = [
    'professionalTitle',
    'languages',
    'age',
    'currentSalary',
    'expectedSalary',
    'description',
    'country',
    'postcode',
    'city',
    'fullAddress'
];
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedAvatarTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
        ];
        const allowedResumeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (file.fieldname === 'avatar') {
            if (allowedAvatarTypes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new Error('Only JPEG, PNG, and WebP images are allowed for avatars'));
            }
            return;
        }
        if (allowedResumeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF and Word documents are allowed for resumes'));
        }
    }
});
exports.uploadResume = upload.single('resume');
exports.uploadAvatar = upload.single('avatar');
// --- Helpers ----------------------------------------------------------------
const getAuthUserId = (req) => req.user?.id;
const isString = (value) => typeof value === 'string';
const isFileField = (field) => fileFields.includes(field);
const isValidFileUrl = (value) => value.startsWith('https://') || value.startsWith('/uploads/');
const sanitizeProfilePayload = (body) => {
    const result = {};
    if (!body || typeof body !== 'object') {
        return result;
    }
    const payload = body;
    for (const field of primaryFields) {
        const value = payload[field];
        if (value === undefined || value === null)
            continue;
        if (field === 'skills') {
            if (Array.isArray(value)) {
                const normalizedSkills = value
                    .filter(isString)
                    .map((skill) => skill.trim())
                    .filter(Boolean);
                if (normalizedSkills.length > 0) {
                    result.skills = normalizedSkills;
                }
            }
            else if (isString(value) && value.trim()) {
                result.skills = [value.trim()];
            }
            continue;
        }
        if (isFileField(field)) {
            if (isString(value) && isValidFileUrl(value)) {
                result[field] = value;
            }
            else {
                console.warn(`[profile] Invalid URL format for ${field}:`, value);
            }
            continue;
        }
        if (isString(value)) {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
                result[field] = trimmed;
            }
            continue;
        }
        result[field] = value;
    }
    for (const field of additionalFields) {
        const value = payload[field];
        if (value === undefined || value === null)
            continue;
        if (isString(value)) {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
                result[field] = trimmed;
            }
            continue;
        }
        result[field] = value;
    }
    return result;
};
const extractS3Key = (url) => {
    try {
        const parsed = new URL(url);
        return parsed.pathname.replace(/^\/+/, '');
    }
    catch {
        const [, key] = url.split('.amazonaws.com/');
        return key ?? null;
    }
};
// --- Controllers ------------------------------------------------------------
const getProfile = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const { password, ...profile } = user.toJSON();
        res.json(profile);
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        console.log('[profile] Update request received', {
            userId,
            timestamp: new Date().toISOString()
        });
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const updateData = sanitizeProfilePayload(req.body);
        console.log('[profile] Update payload', updateData);
        try {
            await user.update(updateData);
        }
        catch (updateError) {
            console.error('[profile] Failed to update user', updateError);
            res.status(500).json({
                message: 'Failed to update profile in database',
                error: updateError instanceof Error ? updateError.message : 'Unknown error'
            });
            return;
        }
        const updatedUser = await models_1.User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });
        if (!updatedUser) {
            res.status(500).json({ message: 'Failed to retrieve updated user data' });
            return;
        }
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser.toJSON(),
            updatedFields: Object.keys(updateData)
        });
    }
    catch (error) {
        console.error('[profile] Update error', error);
        next(error);
    }
};
exports.updateProfile = updateProfile;
const uploadResumeHandler = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const uploadResult = await (0, s3Service_1.uploadToS3)(req.file, 'resumes');
        await user.update({ resumeUrl: uploadResult.url });
        res.json({
            message: 'Resume uploaded successfully',
            resumeUrl: uploadResult.url,
            s3Key: uploadResult.key
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadResumeHandler = uploadResumeHandler;
const uploadAvatarHandler = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const existingAvatarUrl = typeof user.avatarUrl === 'string' ? user.avatarUrl : undefined;
        if (existingAvatarUrl && existingAvatarUrl.includes('amazonaws.com')) {
            try {
                const s3Key = extractS3Key(existingAvatarUrl);
                if (s3Key) {
                    await (0, s3Service_1.deleteFromS3)(s3Key);
                    console.log('[profile] Deleted previous avatar from S3', s3Key);
                }
            }
            catch (deleteError) {
                console.warn('[profile] Failed to delete previous avatar', deleteError);
            }
        }
        const uploadResult = await (0, s3Service_1.uploadToS3)(req.file, 'avatars');
        await user.update({ avatarUrl: uploadResult.url });
        res.json({
            message: 'Avatar uploaded successfully',
            avatarUrl: uploadResult.url,
            s3Key: uploadResult.key
        });
    }
    catch (error) {
        console.error('[profile] Avatar upload error', error);
        res.status(500).json({
            message: 'Failed to upload avatar',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.uploadAvatarHandler = uploadAvatarHandler;
const getSkills = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({ skills: user.skills ?? [] });
    }
    catch (error) {
        next(error);
    }
};
exports.getSkills = getSkills;
const updateSkills = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { skills } = req.body;
        if (!Array.isArray(skills) ||
            !skills.every((skill) => isString(skill) && skill.trim())) {
            res.status(400).json({ message: 'Skills must be an array of strings' });
            return;
        }
        const normalizedSkills = skills
            .map((skill) => skill.trim())
            .filter(Boolean);
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        await user.update({ skills: normalizedSkills });
        res.json({ skills: normalizedSkills });
    }
    catch (error) {
        next(error);
    }
};
exports.updateSkills = updateSkills;
//# sourceMappingURL=profile.controller.js.map