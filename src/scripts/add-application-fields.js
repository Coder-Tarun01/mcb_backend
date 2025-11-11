const { sequelize } = require('../../dist/models');
const { QueryTypes } = require('sequelize');

async function addApplicationFields() {
  try {
    console.log('🔄 Adding additional fields to applications table...');

    // Add new columns to applications table
    const alterQueries = [
      "ALTER TABLE applications ADD COLUMN name VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN email VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN phone VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN location VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN experience VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN currentJobTitle VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN currentCompany VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN currentCTC VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN expectedCTC VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN noticePeriod VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN skills TEXT NULL",
      "ALTER TABLE applications ADD COLUMN qualification VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN specialization VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN university VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN yearOfPassing VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN linkedin VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN portfolio VARCHAR(255) NULL",
      "ALTER TABLE applications ADD COLUMN github VARCHAR(255) NULL"
    ];

    for (const query of alterQueries) {
      try {
        await sequelize.query(query, { type: QueryTypes.RAW });
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`⚠️  Column already exists: ${query.split('ADD COLUMN ')[1].split(' ')[0]}`);
        } else {
          console.error(`❌ Error executing: ${query}`, error.message);
        }
      }
    }

    console.log('✅ Application fields migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding application fields:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addApplicationFields()
  .then(() => {
    console.log('🏁 Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
