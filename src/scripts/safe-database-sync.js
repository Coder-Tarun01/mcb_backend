/**
 * Safe database sync script
 * This script safely syncs the database without constraint issues
 */

const { sequelize } = require('../models');

async function safeDatabaseSync() {
  console.log('🔄 Safe Database Sync');
  console.log('===================');

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const currentDialect = sequelize.getDialect();

    if (currentDialect === 'mysql') {
      // Disable foreign key checks temporarily
      console.log('🔧 Disabling foreign key checks...');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }

    // Sync models with safe options
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ 
      force: false, 
      alter: false,
      logging: console.log 
    });

    if (currentDialect === 'mysql') {
      // Re-enable foreign key checks
      console.log('🔧 Re-enabling foreign key checks...');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    console.log('✅ Database sync completed successfully');

    // Verify tables exist
    if (currentDialect === 'mysql') {
      const [tables] = await sequelize.query('SHOW TABLES');
      console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]));
    } else if (currentDialect === 'postgres') {
      const [tables] = await sequelize.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`
      );
      console.log('📋 Available tables:', tables.map(t => t.table_name));
    }

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
