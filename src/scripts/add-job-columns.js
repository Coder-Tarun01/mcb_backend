// Load environment variables
require('dotenv').config();
const { sequelize } = require('../../dist/config/database');

async function addJobColumns() {
  try {
    console.log('🚀 Adding job columns to remote database...');
    
    // Check which columns already exist
    const [existingColumns] = await sequelize.query('SHOW COLUMNS FROM jobs');
    const existingColumnNames = existingColumns.map(col => col.Field);
    console.log('Existing columns:', existingColumnNames.length);
    
    // Define all the columns we want to add
    const columnsToAdd = [
      { name: 'jobDescription', sql: 'ADD COLUMN jobDescription TEXT' },
      { name: 'experienceLevel', sql: 'ADD COLUMN experienceLevel VARCHAR(255) DEFAULT "Fresher"' },
      { name: 'minSalary', sql: 'ADD COLUMN minSalary INT' },
      { name: 'maxSalary', sql: 'ADD COLUMN maxSalary INT' },
      { name: 'salaryCurrency', sql: 'ADD COLUMN salaryCurrency VARCHAR(10) DEFAULT "INR"' },
      { name: 'salaryType', sql: 'ADD COLUMN salaryType VARCHAR(20) DEFAULT "Yearly"' },
      { name: 'vacancies', sql: 'ADD COLUMN vacancies INT DEFAULT 1' },
      { name: 'educationRequired', sql: 'ADD COLUMN educationRequired TEXT' },
      { name: 'skillsRequired', sql: 'ADD COLUMN skillsRequired JSON' },
      { name: 'genderPreference', sql: 'ADD COLUMN genderPreference VARCHAR(20) DEFAULT "Any"' },
      { name: 'locationType', sql: 'ADD COLUMN locationType VARCHAR(20) DEFAULT "On-site"' },
      { name: 'fullAddress', sql: 'ADD COLUMN fullAddress TEXT' },
      { name: 'city', sql: 'ADD COLUMN city VARCHAR(255)' },
      { name: 'state', sql: 'ADD COLUMN state VARCHAR(255)' },
      { name: 'country', sql: 'ADD COLUMN country VARCHAR(255) DEFAULT "India"' },
      { name: 'companyWebsite', sql: 'ADD COLUMN companyWebsite VARCHAR(500)' },
      { name: 'contactEmail', sql: 'ADD COLUMN contactEmail VARCHAR(255)' },
      { name: 'contactPhone', sql: 'ADD COLUMN contactPhone VARCHAR(50)' },
      { name: 'applicationDeadline', sql: 'ADD COLUMN applicationDeadline DATETIME' },
      { name: 'status', sql: 'ADD COLUMN status VARCHAR(20) DEFAULT "Active"' }
    ];
    
    let addedCount = 0;
    
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        try {
          await sequelize.query(`ALTER TABLE jobs ${column.sql}`);
          console.log(`✅ Added column: ${column.name}`);
          addedCount++;
        } catch (error) {
          console.log(`❌ Error adding ${column.name}:`, error.message);
        }
      } else {
        console.log(`⏭️  Column ${column.name} already exists`);
      }
    }
    
    console.log(`🎉 Enhancement completed! Added ${addedCount} new columns.`);
    
    // Verify final structure
    const [finalColumns] = await sequelize.query('SHOW COLUMNS FROM jobs');
    console.log(`📊 Total columns in jobs table: ${finalColumns.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

addJobColumns();
