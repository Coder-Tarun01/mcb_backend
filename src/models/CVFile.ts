import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

export interface CVFileAttributes {
  id: string;
  userId: string;
  name: string;
  originalName: string;
  type: 'resume' | 'cover-letter' | 'portfolio' | 'certificate';
  size: number;
  mimeType: string;
  filePath: string;
  uploadDate: Date;
  isPrimary: boolean;
  isPublic: boolean;
  downloadCount: number;
  lastViewed: Date | null;
  status: 'active' | 'archived' | 'draft';
  description?: string | null;
  tags?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CVFileCreation = Optional<CVFileAttributes, 'id' | 'downloadCount' | 'lastViewed' | 'createdAt' | 'updatedAt'>;

export class CVFile extends Model<CVFileAttributes, CVFileCreation> implements CVFileAttributes {
  declare id: string;
  declare userId: string;
  declare name: string;
  declare originalName: string;
  declare type: 'resume' | 'cover-letter' | 'portfolio' | 'certificate';
  declare size: number;
  declare mimeType: string;
  declare filePath: string;
  declare uploadDate: Date;
  declare isPrimary: boolean;
  declare isPublic: boolean;
  declare downloadCount: number;
  declare lastViewed: Date | null;
  declare status: 'active' | 'archived' | 'draft';
  declare description: string | null;
  declare tags: string[] | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

CVFile.init({
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  userId: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  originalName: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  type: { 
    type: DataTypes.ENUM('resume', 'cover-letter', 'portfolio', 'certificate'), 
    allowNull: false 
  },
  size: { 
    type: DataTypes.BIGINT, 
    allowNull: false 
  },
  mimeType: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  filePath: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  uploadDate: { 
    type: DataTypes.DATE, 
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  isPrimary: { 
    type: DataTypes.BOOLEAN, 
    allowNull: false, 
    defaultValue: false 
  },
  isPublic: { 
    type: DataTypes.BOOLEAN, 
    allowNull: false, 
    defaultValue: false 
  },
  downloadCount: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    defaultValue: 0 
  },
  lastViewed: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  status: { 
    type: DataTypes.ENUM('active', 'archived', 'draft'), 
    allowNull: false, 
    defaultValue: 'active' 
  },
  description: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  tags: { 
    type: DataTypes.JSON, 
    allowNull: true 
  }
}, {
  sequelize,
  tableName: 'cv_files',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['isPrimary']
    }
  ]
});

export default CVFile;
