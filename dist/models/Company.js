"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Company = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
class Company extends sequelize_1.Model {
    id;
    name;
    slug;
    previousSlugs;
    description;
    website;
    logo;
    industry;
    size;
    location;
    createdAt;
    updatedAt;
}
exports.Company = Company;
Company.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    slug: { type: sequelize_1.DataTypes.STRING, allowNull: true, unique: true },
    previousSlugs: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    description: { type: sequelize_1.DataTypes.TEXT },
    website: { type: sequelize_1.DataTypes.STRING },
    logo: { type: sequelize_1.DataTypes.STRING },
    industry: { type: sequelize_1.DataTypes.STRING },
    size: { type: sequelize_1.DataTypes.STRING },
    location: { type: sequelize_1.DataTypes.STRING },
}, {
    sequelize: index_1.sequelize,
    tableName: 'companies',
});
//# sourceMappingURL=Company.js.map