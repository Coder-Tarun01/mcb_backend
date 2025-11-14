"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const resume_controller_1 = require("../controllers/resume.controller");
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_1.authenticate);
// Resume routes
router.get('/', resume_controller_1.getResumes); // GET /api/resume - Get all resumes
router.get('/stats', resume_controller_1.getResumeStats); // GET /api/resume/stats - Get resume statistics
router.get('/:id', resume_controller_1.getResume); // GET /api/resume/:id - Get single resume
router.post('/', resume_controller_1.createResume); // POST /api/resume - Create new resume
router.put('/:id', resume_controller_1.updateResume); // PUT /api/resume/:id - Update resume
router.delete('/:id', resume_controller_1.deleteResume); // DELETE /api/resume/:id - Delete resume
router.patch('/:id/primary', resume_controller_1.setPrimaryResume); // PATCH /api/resume/:id/primary - Set as primary
router.post('/:id/duplicate', resume_controller_1.duplicateResume); // POST /api/resume/:id/duplicate - Duplicate resume
router.get('/:id/export', resume_controller_1.exportResume); // GET /api/resume/:id/export - Export resume
exports.default = router;
//# sourceMappingURL=resume.js.map