import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize';

export class AiJob extends Model {}

AiJob.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  company: { type: DataTypes.STRING(255), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  location: { type: DataTypes.STRING(255), allowNull: true },
  description: { type: DataTypes.TEXT('long'), allowNull: true },
  skills: { type: DataTypes.TEXT, allowNull: true },
  experience: { type: DataTypes.STRING(50), allowNull: true },
  job_url: { type: DataTypes.STRING(500), allowNull: true },
  posted_date: { type: DataTypes.DATE, allowNull: true },
  job_type: { type: DataTypes.STRING(100), allowNull: true },
}, {
  sequelize,
  tableName: 'aijobs',
  timestamps: false,
});


