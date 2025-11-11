#!/usr/bin/env node

/**
 * Check Resumes Table Script
 * Checks the current structure of the resumes table
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

async function checkResumesTable() {
  console.log('🔍 Checking resumes table structure...');
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
    logging: false
  });

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');

    // Check if table exists
    const [tables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = current_schema()
        AND tablename = 'resumes'
    `);
    if (tables.length === 0) {
      console.log('❌ Resumes table does not exist!');
      return;
    }
    console.log('✅ Resumes table exists');

    // Get table structure
    const [columns] = await sequelize.query(`
      SELECT column_name AS "Field",
             data_type AS "Type",
             is_nullable AS "Null",
             column_default AS "Default"
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'resumes'
      ORDER BY ordinal_position
    `);
    console.log('\n📋 Current table structure:');
    console.table(columns);

    // Check for user_id column specifically
    const userIdColumn = columns.find(col => col.Field === 'user_id');
    if (userIdColumn) {
      console.log('✅ user_id column exists:', userIdColumn);
    } else {
      console.log('❌ user_id column is missing!');
      console.log('Available columns:', columns.map(col => col.Field));
    }

    // Close connection
    await sequelize.close();
    console.log('✅ Database check completed');

  } catch (error) {
    console.error('❌ Failed to check resumes table:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkResumesTable();
}

module.exports = { checkResumesTable };
