import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

export interface ApplicationAttributes {
  id: string;
  userId: string;
  jobId: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  coverLetter?: string | null;
  resumeUrl?: string | null;
  appliedAt: Date;
  // Additional application data
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  experience?: string | null;
  currentJobTitle?: string | null;
  currentCompany?: string | null;
  currentCTC?: string | null;
  expectedCTC?: string | null;
  noticePeriod?: string | null;
  skills?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  university?: string | null;
  yearOfPassing?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
  github?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ApplicationCreation = Optional<ApplicationAttributes, 'id' | 'appliedAt' | 'createdAt' | 'updatedAt'>;

export class Application extends Model<ApplicationAttributes, ApplicationCreation> implements ApplicationAttributes {
  declare id: string;
  declare userId: string;
  declare jobId: string;
  declare status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  declare coverLetter: string | null;
  declare resumeUrl: string | null;
  declare appliedAt: Date;
  // Additional application data
  declare name: string | null;
  declare email: string | null;
  declare phone: string | null;
  declare location: string | null;
  declare experience: string | null;
  declare currentJobTitle: string | null;
  declare currentCompany: string | null;
  declare currentCTC: string | null;
  declare expectedCTC: string | null;
  declare noticePeriod: string | null;
  declare skills: string | null;
  declare qualification: string | null;
  declare specialization: string | null;
  declare university: string | null;
  declare yearOfPassing: string | null;
  declare linkedin: string | null;
  declare portfolio: string | null;
  declare github: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Application.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  jobId: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'reviewed', 'accepted', 'rejected'), defaultValue: 'pending' },
  coverLetter: { type: DataTypes.TEXT },
  resumeUrl: { type: DataTypes.STRING },
  appliedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  // Additional application data
  name: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  location: { type: DataTypes.STRING },
  experience: { type: DataTypes.STRING },
  currentJobTitle: { type: DataTypes.STRING },
  currentCompany: { type: DataTypes.STRING },
  currentCTC: { type: DataTypes.STRING },
  expectedCTC: { type: DataTypes.STRING },
  noticePeriod: { type: DataTypes.STRING },
  skills: { type: DataTypes.TEXT },
  qualification: { type: DataTypes.STRING },
  specialization: { type: DataTypes.STRING },
  university: { type: DataTypes.STRING },
  yearOfPassing: { type: DataTypes.STRING },
  linkedin: { type: DataTypes.STRING },
  portfolio: { type: DataTypes.STRING },
  github: { type: DataTypes.STRING },
}, {
  sequelize,
  tableName: 'applications',
});
