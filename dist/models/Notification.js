"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class Notification extends sequelize_1.Model {
}
exports.Notification = Notification;
Notification.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    userId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    title: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    message: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
    type: { type: sequelize_1.DataTypes.ENUM('application', 'job', 'system', 'message'), allowNull: false },
    isRead: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
}, {
    sequelize: index_1.sequelize,
    tableName: 'notifications',
});
//# sourceMappingURL=Notification.js.map