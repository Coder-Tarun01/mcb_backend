"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const profile_controller_1 = require("../controllers/profile.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', profile_controller_1.getProfile);
router.put('/', profile_controller_1.updateProfile);
router.post('/upload-resume', profile_controller_1.uploadResume, profile_controller_1.uploadResumeHandler);
router.post('/upload-avatar', profile_controller_1.uploadAvatar, profile_controller_1.uploadAvatarHandler);
router.get('/skills', profile_controller_1.getSkills);
router.put('/skills', profile_controller_1.updateSkills);
exports.default = router;
//# sourceMappingURL=profile.js.map