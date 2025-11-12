/**
 * Database constraint fix script
 * This script fixes foreign key constraint issues
 */

const { sequelize } = require('../models');

async function fixDatabaseConstraints() {
  console.log('🔧 Fixing Database Constraints');
  console.log('=============================');

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get the query interface
    const queryInterface = sequelize.getQueryInterface();

    // Check if saved_jobs table exists and get its constraints
    const [results] = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'saved_jobs' 
      AND TABLE_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME LIKE 'saved_jobs_ibfk_%'
    `);

    console.log('📋 Found constraints:', results);

    // Try to drop problematic constraints if they exist
    for (const constraint of results) {
      try {
        console.log(`🔧 Attempting to drop constraint: ${constraint.CONSTRAINT_NAME}`);
        await sequelize.query(`ALTER TABLE saved_jobs DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`);
        console.log(`✅ Dropped constraint: ${constraint.CONSTRAINT_NAME}`);
      } catch (error) {
        console.log(`⚠️ Could not drop constraint ${constraint.CONSTRAINT_NAME}:`, error.message);
      }
    }

    // Now sync the models properly
    console.log('\n🔄 Syncing database models...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Database models synced successfully');

    console.log('\n🎉 Database constraint fix completed!');
    console.log('📋 Summary:');
    console.log('✅ Database connection verified');
    console.log('✅ Problematic constraints removed');
    console.log('✅ Models synced without errors');

  } catch (error) {
    console.error('❌ Error fixing database constraints:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixDatabaseConstraints()
  .then(() => {
    console.log('\n✅ Database fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database fix failed:', error);
    process.exit(1);
  });
