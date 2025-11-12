import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

export interface JobApplyClickAttributes {
  id: string;
  jobId: string;
  userId: string;
  createdAt?: Date;
}

export type JobApplyClickCreation = Optional<JobApplyClickAttributes, 'id' | 'createdAt'>;

export class JobApplyClick extends Model<JobApplyClickAttributes, JobApplyClickCreation> implements JobApplyClickAttributes {
  declare id: string;
  declare jobId: string;
  declare userId: string;
  declare readonly createdAt: Date;
}

JobApplyClick.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  jobId: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName: 'job_apply_clicks',
});

