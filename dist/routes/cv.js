"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const cv_controller_1 = require("../controllers/cv.controller");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Get all CV files for the authenticated user
router.get('/', cv_controller_1.getCVFiles);
// Get CV file statistics
router.get('/stats', cv_controller_1.getCVStats);
// Get a specific CV file
router.get('/:id', cv_controller_1.getCVFile);
// View a CV file (for preview)
router.get('/:id/view', cv_controller_1.viewCVFile);
// Upload a new CV file
router.post('/upload', cv_controller_1.uploadMiddleware, cv_controller_1.uploadCVFile);
// Update a CV file
router.put('/:id', cv_controller_1.updateCVFile);
// Rename a CV file
router.patch('/:id/rename', cv_controller_1.renameCVFile);
// Set primary CV file
router.patch('/:id/primary', cv_controller_1.setPrimaryCVFile);
// Download a CV file
router.get('/:id/download', cv_controller_1.downloadCVFile);
// Delete a CV file
router.delete('/:id', cv_controller_1.deleteCVFile);
exports.default = router;
//# sourceMappingURL=cv.js.map