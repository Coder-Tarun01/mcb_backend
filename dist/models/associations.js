"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAssociations = setupAssociations;
const User_1 = require("./User");
const Job_1 = require("./Job");
const Application_1 = require("./Application");
const SavedJob_1 = require("./SavedJob");
const SavedCandidate_1 = require("./SavedCandidate");
const Candidate_1 = require("./Candidate");
const Notification_1 = require("./Notification");
const CVFile_1 = require("./CVFile");
const Resume_1 = require("./Resume");
// Define all associations
function setupAssociations() {
    // Check if associations are already set up to prevent duplicates
    if (Application_1.Application.associations.user) {
        console.log('Associations already set up, skipping...');
        return;
    }
    // Application associations
    Application_1.Application.belongsTo(User_1.User, { foreignKey: 'userId', as: 'user' });
    Application_1.Application.belongsTo(Job_1.Job, { foreignKey: 'jobId', as: 'job' });
    User_1.User.hasMany(Application_1.Application, { foreignKey: 'userId', as: 'applications' });
    Job_1.Job.hasMany(Application_1.Application, { foreignKey: 'jobId', as: 'applications' });
    // SavedJob associations
    SavedJob_1.SavedJob.belongsTo(User_1.User, { foreignKey: 'userId', as: 'user' });
    SavedJob_1.SavedJob.belongsTo(Job_1.Job, { foreignKey: 'jobId', as: 'job' });
    User_1.User.hasMany(SavedJob_1.SavedJob, { foreignKey: 'userId', as: 'savedJobs' });
    Job_1.Job.hasMany(SavedJob_1.SavedJob, { foreignKey: 'jobId', as: 'savedJobs' });
    // SavedCandidate associations
    SavedCandidate_1.SavedCandidate.belongsTo(Candidate_1.Candidate, { foreignKey: 'candidateId', as: 'candidate' });
    SavedCandidate_1.SavedCandidate.belongsTo(User_1.User, { foreignKey: 'userId', as: 'user' });
    Candidate_1.Candidate.hasMany(SavedCandidate_1.SavedCandidate, { foreignKey: 'candidateId', as: 'savedBy' });
    User_1.User.hasMany(SavedCandidate_1.SavedCandidate, { foreignKey: 'userId', as: 'savedCandidates' });
    // Notification associations
    Notification_1.Notification.belongsTo(User_1.User, { foreignKey: 'userId', as: 'user' });
    User_1.User.hasMany(Notification_1.Notification, { foreignKey: 'userId', as: 'notifications' });
    // CV File associations
    CVFile_1.CVFile.belongsTo(User_1.User, { foreignKey: 'userId', as: 'user' });
    User_1.User.hasMany(CVFile_1.CVFile, { foreignKey: 'userId', as: 'cvFiles' });
    // Resume associations
    Resume_1.Resume.belongsTo(User_1.User, { foreignKey: 'userId', as: 'user' });
    User_1.User.hasMany(Resume_1.Resume, { foreignKey: 'userId', as: 'resumes' });
}
//# sourceMappingURL=associations.js.map