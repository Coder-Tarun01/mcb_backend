#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates database and runs initial setup for PostgreSQL deployments
 */

const { Client } = require('pg');
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

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🗄️  Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}`);

  const adminDatabase = process.env.DB_ADMIN_DATABASE || 'postgres';
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: adminDatabase
  });

  try {
    await client.connect();
    console.log(`✅ Connected to PostgreSQL server (database: ${adminDatabase})`);

    const escapedDbName = DB_NAME.replace(/"/g, '""');
    const dbExists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
    if (dbExists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${escapedDbName}"`);
      console.log(`✅ Database '${DB_NAME}' created successfully`);
    } else {
      console.log(`ℹ️  Database '${DB_NAME}' already exists`);
    }

    const appUser = process.env.DB_APP_USER || `${DB_NAME}_user`;
    const appPassword = process.env.DB_APP_PASSWORD || 'app_password_123';
    const escapedAppUser = appUser.replace(/"/g, '""');
    const escapedAppPassword = appPassword.replace(/'/g, "''");

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${escapedAppUser}') THEN
          CREATE ROLE "${escapedAppUser}" LOGIN PASSWORD '${escapedAppPassword}';
        END IF;
      END
      $$;
    `);
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${escapedDbName}" TO "${escapedAppUser}"`);
    console.log(`✅ Application role '${appUser}' ensured with access to '${DB_NAME}'`);

    console.log('✅ Database setup completed successfully');

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
  } finally {
    await client.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
