import { User } from './User';
import { Job } from './Job';
import { Application } from './Application';
import { SavedJob } from './SavedJob';
import { SavedCandidate } from './SavedCandidate';
import { Candidate } from './Candidate';
import { Notification } from './Notification';
import { CVFile } from './CVFile';
import { Resume } from './Resume';

// Define all associations
export function setupAssociations() {
  // Check if associations are already set up to prevent duplicates
  if (Application.associations.user) {
    console.log('Associations already set up, skipping...');
    return;
  }

  // Application associations
  Application.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Application.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });
  User.hasMany(Application, { foreignKey: 'userId', as: 'applications' });
  Job.hasMany(Application, { foreignKey: 'jobId', as: 'applications' });

  // SavedJob associations
  SavedJob.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  SavedJob.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });
  User.hasMany(SavedJob, { foreignKey: 'userId', as: 'savedJobs' });
  Job.hasMany(SavedJob, { foreignKey: 'jobId', as: 'savedJobs' });

  // SavedCandidate associations
  SavedCandidate.belongsTo(Candidate, { foreignKey: 'candidateId', as: 'candidate' });
  SavedCandidate.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Candidate.hasMany(SavedCandidate, { foreignKey: 'candidateId', as: 'savedBy' });
  User.hasMany(SavedCandidate, { foreignKey: 'userId', as: 'savedCandidates' });

  // Notification associations
  Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

  // CV File associations
  CVFile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(CVFile, { foreignKey: 'userId', as: 'cvFiles' });

  // Resume associations
  Resume.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(Resume, { foreignKey: 'userId', as: 'resumes' });
}
