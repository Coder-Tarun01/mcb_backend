import { sequelize as sequelizeInstance, testConnection } from '../config/database';
export const sequelize = sequelizeInstance;
export { testConnection };

// Import models
import { User } from './User';
import { Job } from './Job';
import { Candidate } from './Candidate';
import { Application } from './Application';
import { SavedJob } from './SavedJob';
import { SavedCandidate } from './SavedCandidate';
import { Notification } from './Notification';
import { Company } from './Company';
import { CVFile } from './CVFile';
import { Resume } from './Resume';
import { JobApplyClick } from './JobApplyClick';
import { AiJob } from './AiJob';

// Set up associations after all models are imported
import { setupAssociations } from './associations';

// Set up associations immediately after models are imported
setupAssociations();

// Export models
export { User, Job, Candidate, Application, SavedJob, SavedCandidate, Notification, Company, CVFile, Resume, JobApplyClick, AiJob };
