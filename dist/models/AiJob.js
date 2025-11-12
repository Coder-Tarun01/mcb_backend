"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiJob = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class AiJob extends sequelize_1.Model {
}
exports.AiJob = AiJob;
AiJob.init({
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, allowNull: false },
    company: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    title: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    location: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    description: { type: sequelize_1.DataTypes.TEXT('long'), allowNull: true },
    skills: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    experience: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    job_url: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
    posted_date: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    job_type: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
}, {
    sequelize: index_1.sequelize,
    tableName: 'aijobs',
    timestamps: false,
});
//# sourceMappingURL=AiJob.js.map