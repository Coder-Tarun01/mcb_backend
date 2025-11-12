"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', auth_controller_1.register);
router.post('/login', auth_controller_1.login);
router.post('/send-otp', auth_controller_1.sendOTP);
router.post('/verify-otp', auth_controller_1.verifyOTP);
router.get('/me', auth_1.authenticate, auth_controller_1.me);
router.put('/change-password', auth_1.authenticate, auth_controller_1.changePassword);
exports.default = router;
//# sourceMappingURL=auth.js.map