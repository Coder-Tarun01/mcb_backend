#!/usr/bin/env node

/**
 * Create Resumes Table Script
 * Creates the resumes table with the correct schema for the resume sections API
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

async function createResumesTable() {
  console.log('🚀 Creating resumes table...');
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🗄️  Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}`);

  // Connect to the database
  const sequelize = new Sequelize({
    database: DB_NAME,
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
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');

    // Create resumes table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS resumes (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'My Resume',
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
        personal_info JSON NOT NULL,
        work_experience JSON NOT NULL,
        education JSON NOT NULL,
        skills JSON NOT NULL,
        projects JSON NOT NULL,
        certifications JSON NOT NULL,
        languages JSON NOT NULL,
        \`references\` JSON NOT NULL,
        additional_info JSON NOT NULL,
        settings JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_is_primary (is_primary),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sequelize.query(createTableQuery);
    console.log('✅ Resumes table created successfully');

    // Close connection
    await sequelize.close();
    console.log('✅ Database operation completed successfully');

  } catch (error) {
    console.error('❌ Failed to create resumes table:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createResumesTable();
}

module.exports = { createResumesTable };
