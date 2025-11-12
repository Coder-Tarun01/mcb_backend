"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidates_controller_1 = require("../controllers/candidates.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', candidates_controller_1.listCandidates);
router.get('/:id', candidates_controller_1.getCandidate);
router.get('/:id/resume/download', auth_1.authenticate, (0, auth_1.authorize)('employer'), candidates_controller_1.getCandidateResumeDownloadUrl);
// Note: POST, PUT, DELETE are not needed since we use real User records
exports.default = router;
//# sourceMappingURL=candidates.js.map