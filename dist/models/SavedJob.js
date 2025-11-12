"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedJob = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class SavedJob extends sequelize_1.Model {
}
exports.SavedJob = SavedJob;
SavedJob.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    userId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    jobId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    savedAt: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW },
}, {
    sequelize: index_1.sequelize,
    tableName: 'saved_jobs',
});
//# sourceMappingURL=SavedJob.js.map