#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates database and runs initial setup for MySQL production deployment
 */

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_NAME = 'mycareerbuild',
  DB_USER = 'root',
  DB_PASSWORD = 'secret',
  NODE_ENV = 'development'
} = process.env;

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🗄️  Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}`);

  // Connect to MySQL server (without specifying database)
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USER,
    password: DB_PASSWORD,
    logging: console.log,
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  });

  try {
    // Test connection to MySQL server
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL server successfully');

    // Create database if it doesn't exist
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database '${DB_NAME}' created/verified successfully`);

    // Create application user with limited privileges
    const appUser = `${DB_NAME}_user`;
    const appPassword = process.env.DB_APP_PASSWORD || 'app_password_123';

    try {
      await sequelize.query(`CREATE USER IF NOT EXISTS '${appUser}'@'%' IDENTIFIED BY '${appPassword}';`);
      await sequelize.query(`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON \`${DB_NAME}\`.* TO '${appUser}'@'%';`);
      await sequelize.query(`FLUSH PRIVILEGES;`);
      console.log(`✅ Application user '${appUser}' created successfully`);
    } catch (userError) {
      console.warn('⚠️  Could not create application user (may already exist):', userError.message);
    }

    // Close connection
    await sequelize.close();
    console.log('✅ Database setup completed successfully');

    // Display connection information
    console.log('\n📋 Connection Information:');
    console.log(`   Host: ${DB_HOST}`);
    console.log(`   Port: ${DB_PORT}`);
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Admin User: ${DB_USER}`);
    console.log(`   App User: ${appUser}`);
    console.log('\n💡 Update your .env file with the app user credentials for production:');
    console.log(`   DB_USER=${appUser}`);
    console.log(`   DB_PASSWORD=${appPassword}`);

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
