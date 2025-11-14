"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const companies_controller_1 = require("../controllers/companies.controller");
const router = (0, express_1.Router)();
router.get('/', companies_controller_1.getCompanies);
router.get('/:id', companies_controller_1.getCompany);
router.get('/:id/jobs', companies_controller_1.getCompanyJobs);
exports.default = router;
//# sourceMappingURL=companies.js.map