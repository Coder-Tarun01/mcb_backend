"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const applications_controller_1 = require("../controllers/applications.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Use controller-provided upload middleware; remove redundant local multer
// Employer-specific routes (must come before parameter routes)
router.get('/employer/all', (0, auth_1.authorize)('employer'), applications_controller_1.getAllEmployerApplications);
router.get('/employer/stats', (0, auth_1.authorize)('employer'), applications_controller_1.getEmployerStats);
router.get('/job/:jobId', (0, auth_1.authorize)('employer'), applications_controller_1.getJobApplications);
// Employee routes
router.get('/', applications_controller_1.getUserApplications);
router.post('/', applications_controller_1.uploadResumeMiddleware, applications_controller_1.applyToJob);
router.get('/:id', applications_controller_1.getApplication);
router.put('/:id', applications_controller_1.updateApplication);
router.delete('/:id', applications_controller_1.withdrawApplication);
exports.default = router;
//# sourceMappingURL=applications.js.map