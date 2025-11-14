"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobApplyClick = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class JobApplyClick extends sequelize_1.Model {
}
exports.JobApplyClick = JobApplyClick;
JobApplyClick.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    jobId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    userId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    createdAt: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW },
}, {
    sequelize: index_1.sequelize,
    tableName: 'job_apply_clicks',
});
//# sourceMappingURL=JobApplyClick.js.map