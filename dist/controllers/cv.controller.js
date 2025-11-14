"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
exports.getCVFiles = getCVFiles;
exports.getCVFile = getCVFile;
exports.uploadCVFile = uploadCVFile;
exports.updateCVFile = updateCVFile;
exports.setPrimaryCVFile = setPrimaryCVFile;
exports.viewCVFile = viewCVFile;
exports.downloadCVFile = downloadCVFile;
exports.deleteCVFile = deleteCVFile;
exports.renameCVFile = renameCVFile;
exports.getCVStats = getCVStats;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const multer_1 = __importDefault(require("multer"));
const s3Service_1 = require("../services/s3Service");
const fs_1 = __importDefault(require("fs"));
// Configure multer for S3 uploads (memory storage)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
        }
    }
});
exports.uploadMiddleware = upload.single('file');
// Get all CV files for a user
async function getCVFiles(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { type, status, search, page = 1, limit = 50 } = req.query;
        let whereClause = { userId };
        if (type && type !== 'all') {
            whereClause.type = type;
        }
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        // Add search to database query for better performance
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { originalName: { [sequelize_1.Op.like]: `%${search}%` } },
                { description: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        const offset = (Number(page) - 1) * Number(limit);
        const { count, rows: cvFiles } = await models_1.CVFile.findAndCountAll({
            where: whereClause,
            order: [['uploadDate', 'DESC']],
            limit: Number(limit),
            offset: offset,
            attributes: { exclude: ['filePath'] } // Don't send file path to frontend
        });
        res.json({
            success: true,
            files: cvFiles,
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit))
        });
    }
    catch (error) {
        console.error('Error fetching CV files:', error);
        next(error);
    }
}
// Get a single CV file
async function getCVFile(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const cvFile = await models_1.CVFile.findOne({
            where: { id, userId }
        });
        if (!cvFile) {
            return res.status(404).json({ message: 'CV file not found' });
        }
        res.json({
            success: true,
            file: cvFile
        });
    }
    catch (error) {
        console.error('Error fetching CV file:', error);
        next(error);
    }
}
// Upload a new CV file
async function uploadCVFile(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const { type, description, tags, isPublic } = req.body;
        // Validate file type
        const allowedTypes = ['resume', 'cover-letter', 'portfolio', 'certificate'];
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid file type' });
        }
        console.log('🔄 Uploading CV file to S3...', {
            userId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            type
        });
        // Upload file to S3
        const uploadResult = await (0, s3Service_1.uploadToS3)(req.file, 'cv-files');
        console.log('✅ CV file uploaded to S3:', uploadResult);
        // Create CV file record with S3 URL
        const cvFile = await models_1.CVFile.create({
            userId,
            name: req.file.originalname,
            originalName: req.file.originalname,
            type: type,
            size: req.file.size,
            mimeType: req.file.mimetype,
            filePath: uploadResult.url, // Store S3 URL instead of local path
            uploadDate: new Date(),
            description: description || null,
            tags: tags ? JSON.parse(tags) : null,
            isPublic: isPublic === 'true',
            isPrimary: false,
            status: 'active'
        });
        // If this is a resume upload, update the user's primary resume URL for employer access
        if (type === 'resume') {
            try {
                const user = await models_1.User.findByPk(userId);
                if (user) {
                    await user.update({ resumeUrl: uploadResult.url });
                }
            }
            catch (err) {
                console.warn('Failed to update user.resumeUrl after CV upload:', err);
            }
        }
        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            file: cvFile
        });
    }
    catch (error) {
        console.error('Error uploading CV file:', error);
        next(error);
    }
}
// Update CV file
async function updateCVFile(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const { name, description, tags, isPublic, status } = req.body;
        // Validate input
        if (name && name.trim().length === 0) {
            return res.status(400).json({ message: 'File name cannot be empty' });
        }
        // Update file properties directly for better performance
        const updateData = {};
        if (name !== undefined)
            updateData.name = name.trim();
        if (description !== undefined)
            updateData.description = description;
        if (tags !== undefined)
            updateData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        if (isPublic !== undefined)
            updateData.isPublic = isPublic === 'true' || isPublic === true;
        if (status !== undefined)
            updateData.status = status;
        const [affectedCount] = await models_1.CVFile.update(updateData, {
            where: { id, userId }
        });
        if (affectedCount === 0) {
            return res.status(404).json({ message: 'CV file not found' });
        }
        // Fetch updated file
        const updatedFile = await models_1.CVFile.findOne({
            where: { id, userId },
            attributes: { exclude: ['filePath'] }
        });
        res.json({
            success: true,
            message: 'CV file updated successfully',
            file: updatedFile
        });
    }
    catch (error) {
        console.error('Error updating CV file:', error);
        next(error);
    }
}
// Set primary CV file
async function setPrimaryCVFile(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const cvFile = await models_1.CVFile.findOne({
            where: { id, userId }
        });
        if (!cvFile) {
            return res.status(404).json({ message: 'CV file not found' });
        }
        // Remove primary status from all other files of the same type
        await models_1.CVFile.update({ isPrimary: false }, { where: { userId, type: cvFile.type } });
        // Set this file as primary
        await cvFile.update({ isPrimary: true });
        // If the primary file is a resume, reflect it on the user's profile for employer visibility
        if (cvFile.type === 'resume') {
            try {
                const user = await models_1.User.findByPk(userId);
                if (user) {
                    await user.update({ resumeUrl: cvFile.filePath });
                }
            }
            catch (err) {
                console.warn('Failed to sync user.resumeUrl when setting primary CV:', err);
            }
        }
        res.json({
            success: true,
            message: 'Primary CV file updated successfully',
            file: cvFile
        });
    }
    catch (error) {
        console.error('Error setting primary CV file:', error);
        next(error);
    }
}
// View CV file (stream for preview)
async function viewCVFile(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const cvFile = await models_1.CVFile.findOne({
            where: { id, userId }
        });
        if (!cvFile) {
            return res.status(404).json({ message: 'CV file not found' });
        }
        // Check if file exists
        if (!fs_1.default.existsSync(cvFile.filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }
        // Update last viewed (but not download count for viewing)
        await cvFile.update({
            lastViewed: new Date()
        });
        // Set headers for file viewing (inline display)
        res.setHeader('Content-Disposition', `inline; filename="${cvFile.originalName}"`);
        res.setHeader('Content-Type', cvFile.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        // Stream the file for viewing
        const fileStream = fs_1.default.createReadStream(cvFile.filePath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error('Error viewing CV file:', error);
        next(error);
    }
}
// Download CV file
async function downloadCVFile(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const cvFile = await models_1.CVFile.findOne({
            where: { id, userId }
        });
        if (!cvFile) {
            return res.status(404).json({ message: 'CV file not found' });
        }
        // Update download count and last viewed
        await cvFile.update({
            downloadCount: cvFile.downloadCount + 1,
            lastViewed: new Date()
        });
        // For S3 files, redirect to the S3 URL
        if (cvFile.filePath && cvFile.filePath.includes('amazonaws.com')) {
            return res.redirect(cvFile.filePath);
        }
        // For local files (legacy support)
        if (!fs_1.default.existsSync(cvFile.filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }
        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${cvFile.originalName}"`);
        res.setHeader('Content-Type', cvFile.mimeType);
        // Stream the file
        const fileStream = fs_1.default.createReadStream(cvFile.filePath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error('Error downloading CV file:', error);
        next(error);
    }
}
// Delete CV file
async function deleteCVFile(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        // First, get the file to extract S3 key for deletion
        const cvFile = await models_1.CVFile.findOne({
            where: { id, userId }
        });
        if (!cvFile) {
            return res.status(404).json({ message: 'CV file not found' });
        }
        // Delete from S3 if it's an S3 URL
        if (cvFile.filePath && cvFile.filePath.includes('amazonaws.com')) {
            try {
                const urlParts = cvFile.filePath.split('/');
                const s3Key = urlParts.slice(3).join('/');
                await (0, s3Service_1.deleteFromS3)(s3Key);
                console.log('🗑️ Deleted CV file from S3:', s3Key);
            }
            catch (deleteError) {
                console.warn('⚠️ Failed to delete CV file from S3:', deleteError);
                // Continue with database deletion even if S3 deletion fails
            }
        }
        // Delete from database
        await models_1.CVFile.destroy({
            where: { id, userId }
        });
        res.json({
            success: true,
            message: 'CV file deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting CV file:', error);
        next(error);
    }
}
// Rename CV file
async function renameCVFile(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const { name } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: 'File name is required' });
        }
        const [affectedCount] = await models_1.CVFile.update({ name: name.trim() }, { where: { id, userId } });
        if (affectedCount === 0) {
            return res.status(404).json({ message: 'CV file not found' });
        }
        res.json({
            success: true,
            message: 'File renamed successfully'
        });
    }
    catch (error) {
        console.error('Error renaming CV file:', error);
        next(error);
    }
}
// Get CV file statistics
async function getCVStats(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const totalFiles = await models_1.CVFile.count({ where: { userId } });
        const primaryFiles = await models_1.CVFile.count({ where: { userId, isPrimary: true } });
        const publicFiles = await models_1.CVFile.count({ where: { userId, isPublic: true } });
        const activeFiles = await models_1.CVFile.count({ where: { userId, status: 'active' } });
        res.json({
            success: true,
            stats: {
                totalFiles,
                primaryFiles,
                publicFiles,
                activeFiles
            }
        });
    }
    catch (error) {
        console.error('Error fetching CV stats:', error);
        next(error);
    }
}
//# sourceMappingURL=cv.controller.js.map