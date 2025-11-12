"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Candidate = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class Candidate extends sequelize_1.Model {
}
exports.Candidate = Candidate;
Candidate.init({
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    jobTitle: { type: sequelize_1.DataTypes.STRING },
    company: { type: sequelize_1.DataTypes.STRING },
    location: { type: sequelize_1.DataTypes.STRING },
    salary: { type: sequelize_1.DataTypes.STRING },
    skills: { type: sequelize_1.DataTypes.JSON },
    experience: { type: sequelize_1.DataTypes.STRING },
    education: { type: sequelize_1.DataTypes.STRING },
    resumeUrl: { type: sequelize_1.DataTypes.STRING },
    profileImage: { type: sequelize_1.DataTypes.STRING },
    rating: { type: sequelize_1.DataTypes.DECIMAL(2, 1) },
    hourlyRate: { type: sequelize_1.DataTypes.STRING },
    lastActive: { type: sequelize_1.DataTypes.DATE },
}, {
    sequelize: index_1.sequelize,
    tableName: 'candidates',
});
//# sourceMappingURL=Candidate.js.map