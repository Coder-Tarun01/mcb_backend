const { Sequelize } = require('sequelize');

// PostgreSQL Configuration
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'mcb',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
  logging: console.log,
});

async function cleanupDatabase() {
  try {
    console.log('🔧 Starting database cleanup...');
    
    const [tables] = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = current_schema()`
    );
    console.log(`📋 Found ${tables.length} tables:`, tables.map(t => t.tablename));

    for (const table of tables) {
      const tableName = table.tablename;
      console.log(`🗑️  Dropping table: ${tableName}`);
      await sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }
    
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


