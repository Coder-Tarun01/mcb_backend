const { Sequelize } = require('sequelize');

// MySQL Configuration
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'mycareerbuild',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'secret',
  logging: console.log,
});

async function cleanupDatabase() {
  try {
    console.log('🔧 Starting database cleanup...');
    
    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✅ Foreign key checks disabled');
    
    // Get all tables
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log(`📋 Found ${tables.length} tables:`, tables.map(t => Object.values(t)[0]));
    
    // Drop all tables
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`🗑️  Dropping table: ${tableName}`);
      await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Foreign key checks re-enabled');
    
    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupDatabase()
    .then(() => {
      console.log('✅ Cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupDatabase };


