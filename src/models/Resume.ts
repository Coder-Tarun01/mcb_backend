import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './sequelize';
import { User } from './User';

export interface ResumeAttributes {
  id: string;
  userId: string;
  title: string;
  isPrimary: boolean;
  isPublic: boolean;
  status: 'draft' | 'published' | 'archived';
  
  // Personal Information
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    linkedin: string;
    website: string;
    summary: string;
    headline: string;
  };
  
  // Work Experience
  workExperience: Array<{
    id: string;
    company: string;
    position: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
    achievements: string[];
  }>;
  
  // Education
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string;
    location: string;
    startDate: string;
    endDate: string;
    gpa: string;
    description: string;
  }>;
  
  // Skills
  skills: Array<{
    id: string;
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category: string;
  }>;
  
  // Projects
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string[];
    startDate: string;
    endDate: string;
    url: string;
    github: string;
  }>;
  
  // Certifications
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
    expiryDate: string;
    credentialId: string;
    url: string;
  }>;
  
  // Languages
  languages: Array<{
    id: string;
    language: string;
    proficiency: 'basic' | 'conversational' | 'professional' | 'native';
  }>;
  
  // References
  references: Array<{
    id: string;
    name: string;
    position: string;
    company: string;
    email: string;
    phone: string;
    relationship: string;
  }>;
  
  // Additional Information
  additionalInfo: {
    interests: string[];
    volunteerWork: Array<{
      id: string;
      organization: string;
      position: string;
      startDate: string;
      endDate: string;
      description: string;
    }>;
    publications: Array<{
      id: string;
      title: string;
      publisher: string;
      date: string;
      url: string;
    }>;
    awards: Array<{
      id: string;
      title: string;
      issuer: string;
      date: string;
      description: string;
    }>;
    careerProfile?: string;
  };
  
  // Resume Settings
  settings: {
    template: string;
    colorScheme: string;
    fontFamily: string;
    fontSize: number;
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    sections: {
      personalInfo: boolean;
      summary: boolean;
      workExperience: boolean;
      education: boolean;
      skills: boolean;
      projects: boolean;
      certifications: boolean;
      languages: boolean;
      references: boolean;
      additionalInfo: boolean;
    };
    sectionOrder: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export type ResumeCreationAttributes = Optional<ResumeAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class Resume extends Model<ResumeAttributes, ResumeCreationAttributes> implements ResumeAttributes {
  declare id: string;
  declare userId: string;
  declare title: string;
  declare isPrimary: boolean;
  declare isPublic: boolean;
  declare status: 'draft' | 'published' | 'archived';
  declare personalInfo: any;
  declare workExperience: any;
  declare education: any;
  declare skills: any;
  declare projects: any;
  declare certifications: any;
  declare languages: any;
  declare references: any;
  declare additionalInfo: any;
  declare settings: any;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Resume.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'My Resume',
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
  },
  personalInfo: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      linkedin: '',
      website: '',
      summary: ''
    },
  },
  workExperience: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  education: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  projects: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  certifications: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  languages: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  references: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  additionalInfo: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      interests: [],
      volunteerWork: [],
      publications: [],
      awards: []
    },
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      template: 'modern',
      colorScheme: 'blue',
      fontFamily: 'Arial',
      fontSize: 12,
      margins: {
        top: 1,
        bottom: 1,
        left: 1,
        right: 1
      },
      sections: {
        personalInfo: true,
        summary: true,
        workExperience: true,
        education: true,
        skills: true,
        projects: false,
        certifications: false,
        languages: false,
        references: false,
        additionalInfo: false
      },
      sectionOrder: [
        'personalInfo',
        'summary',
        'workExperience',
        'education',
        'skills'
      ]
    },
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  tableName: 'resumes',
  timestamps: true,
  underscored: true,
});
