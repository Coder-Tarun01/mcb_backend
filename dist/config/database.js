"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Database configuration - Production Ready
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const inferDialect = () => {
    const envDialect = process.env.DB_DIALECT?.toLowerCase();
    if (envDialect === 'postgres' || envDialect === 'postgresql') {
        return 'postgres';
    }
    if (envDialect === 'mysql') {
        return 'mysql';
    }
    const port = process.env.DB_PORT;
    if (port === '5432') {
        return 'postgres';
    }
    const host = process.env.DB_HOST?.toLowerCase() ?? '';
    if (host.includes('postgres')) {
        return 'postgres';
    }
    return 'mysql';
};
const dialect = inferDialect();
const defineOptions = {
    timestamps: true,
    underscored: false
};
if (dialect === 'mysql') {
    defineOptions.charset = 'utf8mb4';
    defineOptions.collate = 'utf8mb4_unicode_ci';
}
if (dialect === 'postgres' && process.env.DB_SCHEMA) {
    defineOptions.schema = process.env.DB_SCHEMA;
}
const dbSsl = process.env.DB_SSL;
const shouldUseSsl = dbSsl === 'true' ||
    dbSsl === '1' ||
    (dbSsl === undefined && isProduction);
const dialectOptions = {};
if (dialect === 'mysql') {
    Object.assign(dialectOptions, {
        charset: 'utf8mb4',
        // Safe MySQL driver options
        connectTimeout: 30000, // Increased for remote connections
        supportBigNumbers: true,
        bigNumberStrings: true,
        decimalNumbers: true
    });
}
if (shouldUseSsl) {
    dialectOptions.ssl = {
        require: true,
        rejectUnauthorized: false
    };
}
else if (dbSsl === 'false' || dbSsl === '0') {
    dialectOptions.ssl = false;
}
const sequelizeOptions = {
    dialect,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ||
        (dialect === 'postgres' ? '5432' : '3306'), 10),
    database: process.env.DB_NAME || 'mycareerbuild',
    username: process.env.DB_USER || (dialect === 'postgres' ? 'postgres' : 'root'),
    password: process.env.DB_PASSWORD || (dialect === 'postgres' ? 'postgres' : 'secret'),
    logging: isDevelopment ? console.log : false,
    pool: {
        max: isProduction ? 10 : 5,
        min: 0,
        acquire: 60000,
        idle: 20000,
        evict: 1000
    },
    // Retry policy to mitigate transient network issues
    retry: {
        max: 5
    },
    define: defineOptions
};
if (Object.keys(dialectOptions).length > 0) {
    sequelizeOptions.dialectOptions = dialectOptions;
}
// Initialize Sequelize with current dialect
exports.sequelize = new sequelize_1.Sequelize(sequelizeOptions);
// Database connection test
const testConnection = async () => {
    try {
        await exports.sequelize.authenticate();
        const readableDialect = dialect === 'postgres'
            ? 'PostgreSQL'
            : dialect === 'mysql'
                ? 'MySQL'
                : dialect;
        const defaultPort = dialect === 'postgres' ? '5432' : '3306';
        console.log(`✅ ${readableDialect} database connected successfully`);
        console.log(`📊 Database: ${process.env.DB_NAME || 'mycareerbuild'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || defaultPort}`);
    }
    catch (error) {
        const readableDialect = dialect === 'postgres'
            ? 'PostgreSQL'
            : dialect === 'mysql'
                ? 'MySQL'
                : dialect;
        console.error(`❌ Unable to connect to ${readableDialect} database:`, error);
        throw error;
    }
};
exports.testConnection = testConnection;
//# sourceMappingURL=database.js.map