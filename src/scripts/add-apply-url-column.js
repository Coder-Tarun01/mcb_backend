/**
 * Migration script to add applyUrl column to jobs table
 * and create job_apply_clicks table
 */

const dotenv = require('dotenv');
dotenv.config();

const { Sequelize } = require('sequelize');

// Create sequelize instance directly (no need for compiled models)
const sequelize = new Sequelize(
  process.env.DB_NAME || 'mycareerbuild',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'secret',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false
  }
);

async function addApplyUrlColumn() {
  console.log('🔄 Adding applyUrl column to jobs table');
  console.log('========================================');

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Check if column already exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'jobs' 
      AND COLUMN_NAME = 'applyUrl'
    `);

    if (columns.length > 0) {
      console.log('✅ applyUrl column already exists in jobs table');
    } else {
      // Add applyUrl column
      await sequelize.query(`
        ALTER TABLE jobs 
        ADD COLUMN applyUrl VARCHAR(500) NULL 
        AFTER applicationDeadline
      `);
      console.log('✅ Successfully added applyUrl column to jobs table');
    }

    // Create job_apply_clicks table if it doesn't exist
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'job_apply_clicks'
    `);

    if (tables.length > 0) {
      console.log('✅ job_apply_clicks table already exists');
    } else {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS job_apply_clicks (
          id VARCHAR(36) PRIMARY KEY,
          jobId VARCHAR(255) NOT NULL,
          userId VARCHAR(36) NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_job_user_date (jobId, userId, createdAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Successfully created job_apply_clicks table');
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addApplyUrlColumn()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });

