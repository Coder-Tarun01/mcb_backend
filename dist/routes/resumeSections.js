"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const resumeSections_controller_1 = require("../controllers/resumeSections.controller");
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_1.authenticate);
// Resume Overview
router.get('/overview', resumeSections_controller_1.getResumeOverview);
// Resume Headline
router.get('/headline', resumeSections_controller_1.getResumeHeadline);
router.put('/headline', resumeSections_controller_1.updateResumeHeadline);
// Skills
router.get('/skills', resumeSections_controller_1.getSkills);
router.put('/skills', resumeSections_controller_1.updateSkills);
// Employment
router.get('/employment', resumeSections_controller_1.getEmployment);
router.put('/employment', resumeSections_controller_1.updateEmployment);
// Education
router.get('/education', resumeSections_controller_1.getEducation);
router.put('/education', resumeSections_controller_1.updateEducation);
// Projects
router.get('/projects', resumeSections_controller_1.getProjects);
router.put('/projects', resumeSections_controller_1.updateProjects);
// Profile Summary
router.get('/profile-summary', resumeSections_controller_1.getProfileSummary);
router.put('/profile-summary', resumeSections_controller_1.updateProfileSummary);
// Accomplishments
router.get('/accomplishments', resumeSections_controller_1.getAccomplishments);
router.put('/accomplishments', resumeSections_controller_1.updateAccomplishments);
// Desired Career Profile
router.get('/desired-career', resumeSections_controller_1.getDesiredCareer);
router.put('/desired-career', resumeSections_controller_1.updateDesiredCareer);
// Personal Details
router.get('/personal-details', resumeSections_controller_1.getPersonalDetails);
router.put('/personal-details', resumeSections_controller_1.updatePersonalDetails);
// Generic CRUD operations for array items
router.post('/:section', resumeSections_controller_1.createResumeSection);
router.delete('/:section/:itemId', resumeSections_controller_1.deleteResumeSection);
exports.default = router;
//# sourceMappingURL=resumeSections.js.map