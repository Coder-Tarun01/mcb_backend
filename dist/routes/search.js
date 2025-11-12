"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const search_controller_1 = require("../controllers/search.controller");
const router = (0, express_1.Router)();
router.get('/jobs', search_controller_1.searchJobs);
router.get('/filters', search_controller_1.getFilterOptions);
router.get('/recommended', auth_1.authenticate, search_controller_1.getRecommendedJobs);
// Autocomplete endpoints
router.get('/autocomplete', search_controller_1.autocompleteSearch);
router.get('/autocomplete/titles', search_controller_1.autocompleteJobTitles);
router.get('/autocomplete/companies', search_controller_1.autocompleteCompanies);
router.get('/autocomplete/locations', search_controller_1.autocompleteLocations);
exports.default = router;
//# sourceMappingURL=search.js.map