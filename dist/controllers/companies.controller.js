"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanies = getCompanies;
exports.getCompany = getCompany;
exports.getCompanyJobs = getCompanyJobs;
const models_1 = require("../models");
const slug_1 = require("../utils/slug");
async function getCompanies(req, res, next) {
    try {
        const companies = await models_1.Company.findAll({
            order: [['name', 'ASC']],
        });
        res.json(companies);
    }
    catch (e) {
        next(e);
    }
}
async function getCompany(req, res, next) {
    try {
        const param = req.params.id;
        const id = (0, slug_1.extractIdFromSlug)(param);
        const company = await models_1.Company.findByPk(id);
        if (!company)
            return res.status(404).json({ message: 'Not found' });
        const canonicalSlug = await (0, slug_1.ensureCompanySlug)(company);
        if (param && param.includes('-') && param !== canonicalSlug) {
            return res.status(301).setHeader('Location', `/api/companies/${canonicalSlug}`).send();
        }
        res.json(company);
    }
    catch (e) {
        next(e);
    }
}
async function getCompanyJobs(req, res, next) {
    try {
        const id = (0, slug_1.extractIdFromSlug)(req.params.id);
        const jobs = await models_1.Job.findAll({
            where: { companyId: id },
            order: [['createdAt', 'DESC']],
        });
        res.json(jobs);
    }
    catch (e) {
        next(e);
    }
}
//# sourceMappingURL=companies.controller.js.map