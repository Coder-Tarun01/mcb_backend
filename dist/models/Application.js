"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class Application extends sequelize_1.Model {
}
exports.Application = Application;
Application.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    userId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    jobId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    status: { type: sequelize_1.DataTypes.ENUM('pending', 'reviewed', 'accepted', 'rejected'), defaultValue: 'pending' },
    coverLetter: { type: sequelize_1.DataTypes.TEXT },
    resumeUrl: { type: sequelize_1.DataTypes.STRING },
    appliedAt: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW },
    // Additional application data
    name: { type: sequelize_1.DataTypes.STRING },
    email: { type: sequelize_1.DataTypes.STRING },
    phone: { type: sequelize_1.DataTypes.STRING },
    location: { type: sequelize_1.DataTypes.STRING },
    experience: { type: sequelize_1.DataTypes.STRING },
    currentJobTitle: { type: sequelize_1.DataTypes.STRING },
    currentCompany: { type: sequelize_1.DataTypes.STRING },
    currentCTC: { type: sequelize_1.DataTypes.STRING },
    expectedCTC: { type: sequelize_1.DataTypes.STRING },
    noticePeriod: { type: sequelize_1.DataTypes.STRING },
    skills: { type: sequelize_1.DataTypes.TEXT },
    qualification: { type: sequelize_1.DataTypes.STRING },
    specialization: { type: sequelize_1.DataTypes.STRING },
    university: { type: sequelize_1.DataTypes.STRING },
    yearOfPassing: { type: sequelize_1.DataTypes.STRING },
    linkedin: { type: sequelize_1.DataTypes.STRING },
    portfolio: { type: sequelize_1.DataTypes.STRING },
    github: { type: sequelize_1.DataTypes.STRING },
}, {
    sequelize: index_1.sequelize,
    tableName: 'applications',
});
//# sourceMappingURL=Application.js.map