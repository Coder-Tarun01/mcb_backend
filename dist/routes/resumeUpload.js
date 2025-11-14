"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const resumeUpload_controller_1 = require("../controllers/resumeUpload.controller");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(auth_1.authenticate);
// Upload and parse resume
router.post('/upload-and-parse', resumeUpload_controller_1.uploadMiddleware, resumeUpload_controller_1.uploadAndParseResume);
exports.default = router;
//# sourceMappingURL=resumeUpload.js.map