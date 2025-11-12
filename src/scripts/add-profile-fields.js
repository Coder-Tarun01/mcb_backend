const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'mycareerbuild',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'secret',
  logging: console.log
});

async function addProfileFields() {
  try {
    console.log('🔄 Adding profile fields to users table...');
    
    // Add new profile fields to users table
    const alterQueries = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS professionalTitle VARCHAR(255) NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS languages VARCHAR(255) NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS age VARCHAR(50) NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS currentSalary VARCHAR(100) NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS expectedSalary VARCHAR(100) NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS description TEXT NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS postcode VARCHAR(20) NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS fullAddress VARCHAR(255) NULL"
    ];
    
    for (const query of alterQueries) {
      try {
        await sequelize.query(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`⚠️  Column already exists: ${query.split(' ')[5]}`);
        } else {
          console.error(`❌ Error executing: ${query}`, error.message);
        }
      }
    }
    
    console.log('✅ Profile fields migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  addProfileFields()
    .then(() => {
      console.log('🎉 Database migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addProfileFields };
