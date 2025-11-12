"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// MySQL Configuration - Production Ready
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
// MySQL Configuration for all environments
const mysqlConfig = {
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'mycareerbuild',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'secret',
    logging: isDevelopment ? console.log : false,
    dialectOptions: {
        charset: 'utf8mb4',
        // Safe MySQL driver options
        connectTimeout: 30000, // Increased for remote connections
        supportBigNumbers: true,
        bigNumberStrings: true,
        decimalNumbers: true,
        // SSL configuration - respect DB_SSL environment variable
        ssl: (() => {
            const dbSsl = process.env.DB_SSL;
            if (dbSsl === 'false' || dbSsl === '0') {
                return false;
            }
            if (dbSsl === 'true' || dbSsl === '1' || isProduction) {
                return {
                    require: true,
                    rejectUnauthorized: false
                };
            }
            return false;
        })()
    },
    pool: {
        max: isProduction ? 10 : 5,
        min: 0,
        acquire: 60000,
        idle: 20000,
        evict: 1000,
        handleDisconnects: true
    },
    // Retry policy to mitigate transient network issues
    retry: {
        max: 5
    },
    define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        timestamps: true,
        underscored: false
    }
};
// Initialize Sequelize with MySQL only
exports.sequelize = new sequelize_1.Sequelize(mysqlConfig);
// Database connection test
const testConnection = async () => {
    try {
        await exports.sequelize.authenticate();
        console.log(`✅ MySQL Database connected successfully`);
        console.log(`📊 Database: ${process.env.DB_NAME || 'mycareerbuild'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
    }
    catch (error) {
        console.error('❌ Unable to connect to MySQL database:', error);
        throw error;
    }
};
exports.testConnection = testConnection;
//# sourceMappingURL=database.js.map