"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const analytics_controller_1 = require("../controllers/analytics.controller");
const router = (0, express_1.Router)();
router.get('/applications', auth_1.authenticate, (0, auth_1.authorize)('employer'), analytics_controller_1.getApplicationAnalytics);
router.get('/jobs', auth_1.authenticate, (0, auth_1.authorize)('employer'), analytics_controller_1.getJobAnalytics);
router.get('/user', auth_1.authenticate, analytics_controller_1.getUserAnalytics);
exports.default = router;
//# sourceMappingURL=analytics.js.map