"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiJob = exports.JobApplyClick = exports.Resume = exports.CVFile = exports.Company = exports.Notification = exports.SavedCandidate = exports.SavedJob = exports.Application = exports.Candidate = exports.Job = exports.User = exports.testConnection = exports.sequelize = void 0;
const database_1 = require("../config/database");
Object.defineProperty(exports, "testConnection", { enumerable: true, get: function () { return database_1.testConnection; } });
exports.sequelize = database_1.sequelize;
// Import models
const User_1 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return User_1.User; } });
const Job_1 = require("./Job");
Object.defineProperty(exports, "Job", { enumerable: true, get: function () { return Job_1.Job; } });
const Candidate_1 = require("./Candidate");
Object.defineProperty(exports, "Candidate", { enumerable: true, get: function () { return Candidate_1.Candidate; } });
const Application_1 = require("./Application");
Object.defineProperty(exports, "Application", { enumerable: true, get: function () { return Application_1.Application; } });
const SavedJob_1 = require("./SavedJob");
Object.defineProperty(exports, "SavedJob", { enumerable: true, get: function () { return SavedJob_1.SavedJob; } });
const SavedCandidate_1 = require("./SavedCandidate");
Object.defineProperty(exports, "SavedCandidate", { enumerable: true, get: function () { return SavedCandidate_1.SavedCandidate; } });
const Notification_1 = require("./Notification");
Object.defineProperty(exports, "Notification", { enumerable: true, get: function () { return Notification_1.Notification; } });
const Company_1 = require("./Company");
Object.defineProperty(exports, "Company", { enumerable: true, get: function () { return Company_1.Company; } });
const CVFile_1 = require("./CVFile");
Object.defineProperty(exports, "CVFile", { enumerable: true, get: function () { return CVFile_1.CVFile; } });
const Resume_1 = require("./Resume");
Object.defineProperty(exports, "Resume", { enumerable: true, get: function () { return Resume_1.Resume; } });
const JobApplyClick_1 = require("./JobApplyClick");
Object.defineProperty(exports, "JobApplyClick", { enumerable: true, get: function () { return JobApplyClick_1.JobApplyClick; } });
const AiJob_1 = require("./AiJob");
Object.defineProperty(exports, "AiJob", { enumerable: true, get: function () { return AiJob_1.AiJob; } });
// Set up associations after all models are imported
const associations_1 = require("./associations");
// Set up associations immediately after models are imported
(0, associations_1.setupAssociations)();
//# sourceMappingURL=index.js.map