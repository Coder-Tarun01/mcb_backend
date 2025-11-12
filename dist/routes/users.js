"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const users_controller_1 = require("../controllers/users.controller");
const router = (0, express_1.Router)();
// Public routes
router.get('/', users_controller_1.listUsers);
router.get('/:id', users_controller_1.getUser);
router.post('/', users_controller_1.createUser);
// Protected routes
router.put('/:id', users_controller_1.updateUser);
router.delete('/:id', users_controller_1.deleteUser);
// Profile update route (authenticated user updates their own profile)
router.put('/profile/me', auth_1.authenticate, users_controller_1.updateProfile);
exports.default = router;
//# sourceMappingURL=users.js.map