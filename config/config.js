const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const common = {
  dialect: process.env.DB_DIALECT || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || (process.env.DB_DIALECT === 'mysql' ? 3306 : 5432)),
  database: process.env.DB_NAME || 'mycareerbuild',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  logging: false,
  define: {
    underscored: false,
    timestamps: true,
  },
  dialectOptions: {},
};

if (process.env.DB_SSL === 'true') {
  common.dialectOptions.ssl = { require: true, rejectUnauthorized: false };
}

module.exports = {
  development: common,
  test: common,
  production: common,
};
