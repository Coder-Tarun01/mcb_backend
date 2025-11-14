"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedCandidate = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class SavedCandidate extends sequelize_1.Model {
}
exports.SavedCandidate = SavedCandidate;
SavedCandidate.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    userId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    candidateId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    savedAt: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW },
}, {
    sequelize: index_1.sequelize,
    tableName: 'saved_candidates',
});
//# sourceMappingURL=SavedCandidate.js.map