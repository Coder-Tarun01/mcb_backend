import { Dialect, Options, Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

// Database configuration - Production Ready
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const inferDialect = (): Dialect => {
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
const schema = process.env.DB_SCHEMA || 'public';

const defineOptions: NonNullable<Options['define']> = {
  timestamps: true,
  underscored: false
};

if (dialect === 'mysql') {
  defineOptions.charset = 'utf8mb4';
  defineOptions.collate = 'utf8mb4_unicode_ci';
}

if (dialect === 'postgres' && schema) {
  defineOptions.schema = schema;
}

const dbSsl = process.env.DB_SSL;
const shouldUseSsl =
  dbSsl === 'true' ||
  dbSsl === '1' ||
  (dbSsl === undefined && isProduction);

const dialectOptions: Record<string, unknown> = {};

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

if (dialect === 'postgres' && schema) {
  dialectOptions.searchPath = schema;
}

if (shouldUseSsl) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false
  };
} else if (dbSsl === 'false' || dbSsl === '0') {
  dialectOptions.ssl = false;
}

const sequelizeOptions: Options = {
  dialect,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(
    process.env.DB_PORT ||
      (dialect === 'postgres' ? '5432' : '3306'),
    10
  ),
  database: process.env.DB_NAME || (dialect === 'postgres' ? 'mcb' : 'mycareerbuild'),
  username: process.env.DB_USER || (dialect === 'postgres' ? 'postgres' : 'root'),
  password: process.env.DB_PASSWORD || (dialect === 'postgres' ? 'secret' : 'secret'),
  logging: isDevelopment ? console.log : false,
  pool: {
    max: isProduction ? 10 : 5,
    min: 0,
    acquire: 60000,
    idle: 20000,
    evict: 1000,
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
export const sequelize = new Sequelize(sequelizeOptions);

// Database connection test
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    const readableDialect =
      dialect === 'postgres'
        ? 'PostgreSQL'
        : dialect === 'mysql'
          ? 'MySQL'
          : dialect;
    const defaultPort = dialect === 'postgres' ? '5432' : '3306';
    console.log(`✅ ${readableDialect} database connected successfully`);
    console.log(
      `📊 Database: ${process.env.DB_NAME || (dialect === 'postgres' ? 'mcb' : 'mycareerbuild')}@${
        process.env.DB_HOST || 'localhost'
      }:${process.env.DB_PORT || defaultPort}`
    );
    if (dialect === 'postgres') {
      console.log(`📁 Schema: ${schema}`);
    }
  } catch (error) {
    const readableDialect =
      dialect === 'postgres'
        ? 'PostgreSQL'
        : dialect === 'mysql'
          ? 'MySQL'
          : dialect;
    console.error(`❌ Unable to connect to ${readableDialect} database:`, error);
    throw error;
  }
};
