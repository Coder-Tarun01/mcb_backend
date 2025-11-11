import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const schema = process.env.DB_SCHEMA || 'public';
const dialect = (process.env.DB_DIALECT || 'postgres') as 'postgres';

const sslOption = (() => {
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
})();

const sequelizeConfig = {
  dialect,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'mcb',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
  logging: isDevelopment ? console.log : false,
  dialectOptions: {
    ssl: sslOption,
    searchPath: schema
  },
  pool: {
    max: isProduction ? 10 : 5,
    min: 0,
    acquire: 60000,
    idle: 20000,
    evict: 1000,
    handleDisconnects: true
  },
  retry: {
    max: 5
  },
  define: {
    timestamps: true,
    underscored: false,
    schema
  }
};

export const sequelize = new Sequelize(sequelizeConfig);

export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL database connected successfully');
    console.log(`📊 Database: ${process.env.DB_NAME || 'mcb'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
    console.log(`📁 Schema: ${schema}`);
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL database:', error);
    throw error;
  }
};
