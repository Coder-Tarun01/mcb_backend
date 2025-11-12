#!/usr/bin/env node

/**
 * Migration Script: SQLite to MySQL
 * Migrates data from SQLite to MySQL for production deployment
 */

const { Sequelize } = require('sequelize');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_NAME = 'mycareerbuild',
  DB_USER = 'root',
  DB_PASSWORD = 'secret',
  DB_PATH = './database.sqlite',
  NODE_ENV = 'development'
} = process.env;

async function migrateToMySQL() {
  console.log('🚀 Starting SQLite to MySQL migration...');
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`📁 SQLite: ${DB_PATH}`);
  console.log(`🗄️  MySQL: ${DB_NAME}@${DB_HOST}:${DB_PORT}`);

  // Check if SQLite database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ SQLite database not found at: ${DB_PATH}`);
    process.exit(1);
  }

  // Connect to SQLite
  const sqliteDb = new sqlite3.Database(DB_PATH);

  // Connect to MySQL
  const mysqlSequelize = new Sequelize({
    dialect: 'mysql',
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    username: DB_USER,
    password: DB_PASSWORD,
    logging: false,
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  });

  try {
    // Test MySQL connection
    await mysqlSequelize.authenticate();
    console.log('✅ Connected to MySQL successfully');

    // Get all table names from SQLite
    const tables = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.name));
      });
    });

    console.log(`📋 Found ${tables.length} tables: ${tables.join(', ')}`);

    // Migrate each table
    for (const tableName of tables) {
      console.log(`\n🔄 Migrating table: ${tableName}`);
      
      // Get table schema
      const schema = await new Promise((resolve, reject) => {
        sqliteDb.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Get all data from SQLite table
      const data = await new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      console.log(`   📊 Found ${data.length} records`);

      // Insert data into MySQL table
      if (data.length > 0) {
        try {
          // Clear existing data in MySQL table
          await mysqlSequelize.query(`DELETE FROM ${tableName}`);
          
          // Insert data in batches
          const batchSize = 100;
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            // Convert SQLite data to MySQL format
            const processedBatch = batch.map(row => {
              const processedRow = { ...row };
              
              // Handle JSON fields
              if (row.skills && typeof row.skills === 'string') {
                try {
                  processedRow.skills = JSON.parse(row.skills);
                } catch (e) {
                  processedRow.skills = null;
                }
              }
              
              // Handle boolean fields
              if (row.isRemote !== undefined) {
                processedRow.isRemote = Boolean(row.isRemote);
              }
              if (row.isRead !== undefined) {
                processedRow.isRead = Boolean(row.isRead);
              }
              
              // Handle date fields
              if (row.createdAt) {
                processedRow.createdAt = new Date(row.createdAt);
              }
              if (row.updatedAt) {
                processedRow.updatedAt = new Date(row.updatedAt);
              }
              if (row.appliedAt) {
                processedRow.appliedAt = new Date(row.appliedAt);
              }
              if (row.savedAt) {
                processedRow.savedAt = new Date(row.savedAt);
              }
              
              return processedRow;
            });

            // Insert batch
            await mysqlSequelize.query(
              `INSERT INTO ${tableName} (${Object.keys(processedBatch[0]).join(', ')}) VALUES ${processedBatch.map(() => `(${Object.keys(processedBatch[0]).map(() => '?').join(', ')})`).join(', ')}`,
              {
                replacements: processedBatch.flatMap(row => Object.values(row))
              }
            );
          }
          
          console.log(`   ✅ Migrated ${data.length} records successfully`);
        } catch (error) {
          console.error(`   ❌ Error migrating ${tableName}:`, error.message);
        }
      } else {
        console.log(`   ⚠️  No data to migrate for ${tableName}`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    
    // Create backup of SQLite database
    const backupPath = `${DB_PATH}.backup.${Date.now()}`;
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`📦 SQLite backup created: ${backupPath}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Close connections
    sqliteDb.close();
    await mysqlSequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToMySQL();
}

module.exports = { migrateToMySQL };
