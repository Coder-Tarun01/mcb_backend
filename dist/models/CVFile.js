"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CVFile = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class CVFile extends sequelize_1.Model {
}
exports.CVFile = CVFile;
CVFile.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    originalName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('resume', 'cover-letter', 'portfolio', 'certificate'),
        allowNull: false
    },
    size: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false
    },
    mimeType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    filePath: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    uploadDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    isPrimary: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    isPublic: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    downloadCount: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    lastViewed: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('active', 'archived', 'draft'),
        allowNull: false,
        defaultValue: 'active'
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    tags: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true
    }
}, {
    sequelize: index_1.sequelize,
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
exports.default = CVFile;
//# sourceMappingURL=CVFile.js.map