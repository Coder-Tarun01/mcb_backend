/**
 * Safe database sync script
 * This script safely syncs the database without constraint issues
 */

require('dotenv').config();
const { sequelize } = require('../models');

const schema = process.env.DB_SCHEMA || 'public';

async function safeDatabaseSync() {
  console.log('🔄 Safe Database Sync');
  console.log('===================');

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');
    console.log(`📁 Target schema: ${schema}`);

    // Sync models with safe options
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ 
      force: false, 
      alter: false,
      logging: console.log 
    });

    console.log('✅ Database sync completed successfully');

    // Verify tables exist
    const [tables] = await sequelize.query(
      `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = :schema ORDER BY tablename`,
      { replacements: { schema } }
    );
    console.log('📋 Available tables:', tables.map(t => t.tablename));

    console.log('\n🎉 Safe database sync completed!');

  } catch (error) {
    console.error('❌ Error during safe database sync:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the safe sync
safeDatabaseSync()
  .then(() => {
    console.log('\n✅ Safe database sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Safe database sync failed:', error);
    process.exit(1);
  });
