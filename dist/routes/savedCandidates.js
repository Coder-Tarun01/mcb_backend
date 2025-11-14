"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const savedCandidates_controller_1 = require("../controllers/savedCandidates.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate); // All routes require authentication
router.get('/', savedCandidates_controller_1.getSavedCandidates);
router.post('/', savedCandidates_controller_1.saveCandidate);
router.delete('/:candidateId', savedCandidates_controller_1.unsaveCandidate);
router.get('/:candidateId/check', savedCandidates_controller_1.checkIfSaved);
exports.default = router;
//# sourceMappingURL=savedCandidates.js.map