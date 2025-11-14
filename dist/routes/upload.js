"use strict";
/**
 * File Upload Routes
 * Handles file upload endpoints with multer middleware
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const upload_controller_1 = require("../controllers/upload.controller");
const router = (0, express_1.Router)();
// Configure multer for memory storage
const storage = multer_1.default.memoryStorage();
// File filter to validate file types
const fileFilter = (req, file, cb) => {
    // Allowed MIME types
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
};
// Multer configuration
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files for multiple upload
    },
    fileFilter: fileFilter
});
// Single file upload
router.post('/', upload.single('file'), upload_controller_1.uploadFile);
// Multiple files upload
router.post('/multiple', upload.array('files', 5), upload_controller_1.uploadMultipleFiles);
// Health check endpoint
router.get('/health', upload_controller_1.uploadHealthCheck);
exports.default = router;
//# sourceMappingURL=upload.js.map