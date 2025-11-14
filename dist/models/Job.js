"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Job = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class Job extends sequelize_1.Model {
}
exports.Job = Job;
Job.init({
    id: { type: sequelize_1.DataTypes.STRING, primaryKey: true },
    title: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    company: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    slug: { type: sequelize_1.DataTypes.STRING, allowNull: true, unique: true },
    previousSlugs: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    companyId: { type: sequelize_1.DataTypes.UUID, allowNull: true },
    location: { type: sequelize_1.DataTypes.STRING },
    type: { type: sequelize_1.DataTypes.STRING },
    category: { type: sequelize_1.DataTypes.STRING },
    isRemote: { type: sequelize_1.DataTypes.BOOLEAN },
    description: { type: sequelize_1.DataTypes.TEXT },
    // Enhanced fields
    jobDescription: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    experienceLevel: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    minSalary: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    maxSalary: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    salaryCurrency: { type: sequelize_1.DataTypes.STRING, allowNull: true, defaultValue: 'INR' },
    salaryType: { type: sequelize_1.DataTypes.STRING, allowNull: true, defaultValue: 'Yearly' },
    vacancies: { type: sequelize_1.DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
    educationRequired: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    skillsRequired: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    genderPreference: { type: sequelize_1.DataTypes.STRING, allowNull: true, defaultValue: 'Any' },
    locationType: { type: sequelize_1.DataTypes.STRING, allowNull: true, defaultValue: 'On-site' },
    fullAddress: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    city: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    state: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    country: { type: sequelize_1.DataTypes.STRING, allowNull: true, defaultValue: 'India' },
    companyWebsite: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    contactEmail: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    contactPhone: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    applicationDeadline: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    applyUrl: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    status: { type: sequelize_1.DataTypes.STRING, allowNull: true, defaultValue: 'Active' },
}, {
    sequelize: index_1.sequelize,
    tableName: 'jobs',
});
//# sourceMappingURL=Job.js.map