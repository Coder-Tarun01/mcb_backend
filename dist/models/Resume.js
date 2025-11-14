"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resume = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
const User_1 = require("./User");
class Resume extends sequelize_1.Model {
}
exports.Resume = Resume;
Resume.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.User,
            key: 'id',
        },
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'My Resume',
    },
    isPrimary: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    isPublic: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('draft', 'published', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
    },
    personalInfo: {
        type: sequelize_1.DataTypes.JSON,
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
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    education: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    skills: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    projects: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    certifications: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    languages: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    references: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    additionalInfo: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            interests: [],
            volunteerWork: [],
            publications: [],
            awards: []
        },
    },
    settings: {
        type: sequelize_1.DataTypes.JSON,
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
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: index_1.sequelize,
    tableName: 'resumes',
    timestamps: true,
    underscored: true,
});
//# sourceMappingURL=Resume.js.map