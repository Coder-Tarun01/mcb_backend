/**
 * Migration script to add applyUrl column to jobs table
 * and create job_apply_clicks table
 */

const dotenv = require('dotenv');
dotenv.config();

const { Sequelize } = require('sequelize');

// Create sequelize instance directly (no need for compiled models)
const sequelize = new Sequelize(
  process.env.DB_NAME || 'mcb',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'secret',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
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
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'jobs'
        AND column_name = 'applyUrl'
    `);

    if (columns.length > 0) {
      console.log('✅ applyUrl column already exists in jobs table');
    } else {
      // Add applyUrl column
      await sequelize.query(`
        ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS "applyUrl" VARCHAR(500)
      `);
      console.log('✅ Successfully added applyUrl column to jobs table');
    }

    // Create job_apply_clicks table if it doesn't exist
    const [tables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = current_schema()
        AND tablename = 'job_apply_clicks'
    `);

    if (tables.length > 0) {
      console.log('✅ job_apply_clicks table already exists');
    } else {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS job_apply_clicks (
          id VARCHAR(36) PRIMARY KEY,
          "jobId" VARCHAR(255) NOT NULL,
          "userId" VARCHAR(36) NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_job_user_date
        ON job_apply_clicks ("jobId", "userId", "createdAt")
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

