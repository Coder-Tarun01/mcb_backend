import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

export interface JobAttributes {
  id: string;
  title: string;
  company: string;
  slug?: string | null;
  previousSlugs?: string[] | null;
  companyId?: string | null;
  location?: string | null;
  type?: string | null;
  category?: string | null;
  isRemote?: boolean | null;
  description?: string | null;
  
  // Enhanced fields for comprehensive job posting
  jobDescription?: string | null;
  experienceLevel?: string | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryCurrency?: string | null;
  salaryType?: string | null;
  vacancies?: number | null;
  educationRequired?: string | null;
  skillsRequired?: string[] | null;
  genderPreference?: string | null;
  locationType?: string | null;
  fullAddress?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  companyWebsite?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  applicationDeadline?: Date | null;
  applyUrl?: string | null;
  status?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type JobCreation = Optional<JobAttributes, 'id'>;

export class Job extends Model<JobAttributes, JobCreation> implements JobAttributes {
  declare id: string;
  declare title: string;
  declare company: string;
  declare slug: string | null;
  declare previousSlugs: string[] | null;
  declare companyId: string | null;
  declare location: string | null;
  declare type: string | null;
  declare category: string | null;
  declare isRemote: boolean | null;
  declare description: string | null;
  
  // Enhanced fields
  declare jobDescription: string | null;
  declare experienceLevel: string | null;
  declare minSalary: number | null;
  declare maxSalary: number | null;
  declare salaryCurrency: string | null;
  declare salaryType: string | null;
  declare vacancies: number | null;
  declare educationRequired: string | null;
  declare skillsRequired: string[] | null;
  declare genderPreference: string | null;
  declare locationType: string | null;
  declare fullAddress: string | null;
  declare city: string | null;
  declare state: string | null;
  declare country: string | null;
  declare companyWebsite: string | null;
  declare contactEmail: string | null;
  declare contactPhone: string | null;
  declare applicationDeadline: Date | null;
  declare applyUrl: string | null;
  declare status: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Job.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  company: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: true, unique: true },
  previousSlugs: { type: DataTypes.JSON, allowNull: true },
  companyId: { type: DataTypes.UUID, allowNull: true },
  location: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING },
  category: { type: DataTypes.STRING },
  isRemote: { type: DataTypes.BOOLEAN },
  description: { type: DataTypes.TEXT },
  
  // Enhanced fields
  jobDescription: { type: DataTypes.TEXT, allowNull: true },
  experienceLevel: { type: DataTypes.STRING, allowNull: true },
  minSalary: { type: DataTypes.INTEGER, allowNull: true },
  maxSalary: { type: DataTypes.INTEGER, allowNull: true },
  salaryCurrency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'INR' },
  salaryType: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Yearly' },
  vacancies: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
  educationRequired: { type: DataTypes.TEXT, allowNull: true },
  skillsRequired: { type: DataTypes.JSON, allowNull: true },
  genderPreference: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Any' },
  locationType: { type: DataTypes.STRING, allowNull: true, defaultValue: 'On-site' },
  fullAddress: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING, allowNull: true },
  state: { type: DataTypes.STRING, allowNull: true },
  country: { type: DataTypes.STRING, allowNull: true, defaultValue: 'India' },
  companyWebsite: { type: DataTypes.STRING, allowNull: true },
  contactEmail: { type: DataTypes.STRING, allowNull: true },
  contactPhone: { type: DataTypes.STRING, allowNull: true },
  applicationDeadline: { type: DataTypes.DATE, allowNull: true },
  applyUrl: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Active' },
}, {
  sequelize,
  tableName: 'jobs',
});
