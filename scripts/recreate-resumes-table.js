#!/usr/bin/env node

/**
 * Recreate Resumes Table Script
 * Drops the existing resumes table and creates a new one with the correct schema
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

async function recreateResumesTable() {
  console.log('🔄 Recreating resumes table...');
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

    // Drop existing table
    console.log('🗑️  Dropping existing resumes table...');
    await sequelize.query('DROP TABLE IF EXISTS resumes CASCADE');
    console.log('✅ Existing table dropped');

    // Create new table with correct schema
    console.log('🏗️  Creating new resumes table...');
    const createTableQuery = `
      CREATE TABLE resumes (
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

    await sequelize.query(createTableQuery);
    await sequelize.query(statusConstraint).catch(() => {});
    await sequelize.query(makeConstraintValid).catch(() => {});
    console.log('✅ New resumes table created successfully');

    // Verify the new table structure
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'resumes'
      ORDER BY ordinal_position
    `);
    console.log('\n📋 New table structure:');
    console.table(columns);

    // Check for user_id column specifically
    const userIdColumn = columns.find(col => col.Field === 'user_id');
    if (userIdColumn) {
      console.log('✅ user_id column exists:', userIdColumn);
    } else {
      console.log('❌ user_id column is missing!');
    }

    // Close connection
    await sequelize.close();
    console.log('✅ Database operation completed successfully');

  } catch (error) {
    console.error('❌ Failed to recreate resumes table:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  recreateResumesTable();
}

module.exports = { recreateResumesTable };
