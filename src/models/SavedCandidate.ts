import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

export interface SavedCandidateAttributes {
  id: string;
  userId: string;
  candidateId: number;
  savedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SavedCandidateCreation = Optional<SavedCandidateAttributes, 'id' | 'savedAt' | 'createdAt' | 'updatedAt'>;

export class SavedCandidate extends Model<SavedCandidateAttributes, SavedCandidateCreation> implements SavedCandidateAttributes {
  declare id: string;
  declare userId: string;
  declare candidateId: number;
  declare savedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SavedCandidate.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  candidateId: { type: DataTypes.INTEGER, allowNull: false },
  savedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName: 'saved_candidates',
});

