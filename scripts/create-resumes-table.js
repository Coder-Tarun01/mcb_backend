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
  DB_PORT = 5432,
  DB_NAME = 'mcb',
  DB_USER = 'postgres',
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
    dialect: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USER,
    password: DB_PASSWORD,
    logging: console.log
  });

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');

    // Create resumes table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS resumes (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'My Resume',
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'draft',
        personal_info JSONB NOT NULL,
        work_experience JSONB NOT NULL,
        education JSONB NOT NULL,
        skills JSONB NOT NULL,
        projects JSONB NOT NULL,
        certifications JSONB NOT NULL,
        languages JSONB NOT NULL,
        "references" JSONB NOT NULL,
        additional_info JSONB NOT NULL,
        settings JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const statusConstraint = `
      ALTER TABLE resumes
      ADD CONSTRAINT resumes_status_check
      CHECK (status IN ('draft', 'published', 'archived'))
      NOT VALID;
    `;

    const makeConstraintValid = `
      ALTER TABLE resumes
      VALIDATE CONSTRAINT resumes_status_check;
    `;

    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_resumes_is_primary ON resumes (is_primary)',
      'CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes (status)'
    ];

    await sequelize.query(createTableQuery);
    await sequelize.query(statusConstraint).catch(() => {});
    await sequelize.query(makeConstraintValid).catch(() => {});
    for (const indexQuery of indexQueries) {
      await sequelize.query(indexQuery);
    }
    console.log('✅ Resumes table created successfully');

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
