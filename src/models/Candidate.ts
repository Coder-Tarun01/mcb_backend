import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

export interface CandidateAttributes {
  id: number;
  name: string;
  jobTitle?: string | null;
  company?: string | null;
  location?: string | null;
  salary?: string | null;
  skills?: string[] | null;
  experience?: string | null;
  education?: string | null;
  resumeUrl?: string | null;
  profileImage?: string | null;
  rating?: number | null;
  hourlyRate?: string | null;
  lastActive?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CandidateCreation = Optional<CandidateAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class Candidate extends Model<CandidateAttributes, CandidateCreation> implements CandidateAttributes {
  declare id: number;
  declare name: string;
  declare jobTitle: string | null;
  declare company: string | null;
  declare location: string | null;
  declare salary: string | null;
  declare skills: string[] | null;
  declare experience: string | null;
  declare education: string | null;
  declare resumeUrl: string | null;
  declare profileImage: string | null;
  declare rating: number | null;
  declare hourlyRate: string | null;
  declare lastActive: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Candidate.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  jobTitle: { type: DataTypes.STRING },
  company: { type: DataTypes.STRING },
  location: { type: DataTypes.STRING },
  salary: { type: DataTypes.STRING },
  skills: { type: DataTypes.JSON },
  experience: { type: DataTypes.STRING },
  education: { type: DataTypes.STRING },
  resumeUrl: { type: DataTypes.STRING },
  profileImage: { type: DataTypes.STRING },
  rating: { type: DataTypes.DECIMAL(2, 1) },
  hourlyRate: { type: DataTypes.STRING },
  lastActive: { type: DataTypes.DATE },
}, {
  sequelize,
  tableName: 'candidates',
});
