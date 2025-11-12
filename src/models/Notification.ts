import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

export interface NotificationAttributes {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'application' | 'job' | 'system' | 'message';
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NotificationCreation = Optional<NotificationAttributes, 'id' | 'isRead' | 'createdAt' | 'updatedAt'>;

export class Notification extends Model<NotificationAttributes, NotificationCreation> implements NotificationAttributes {
  declare id: string;
  declare userId: string;
  declare title: string;
  declare message: string;
  declare type: 'application' | 'job' | 'system' | 'message';
  declare isRead: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Notification.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('application', 'job', 'system', 'message'), allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  tableName: 'notifications',
});
