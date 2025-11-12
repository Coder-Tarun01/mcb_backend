// Load environment variables
require('dotenv').config();
const { sequelize } = require('../../dist/config/database');

async function enhanceJobsTable() {
  try {
    console.log('🚀 Starting jobs table enhancement...');
    
    // Add new columns to the jobs table
    const alterQueries = [
      // Job description and experience
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS jobDescription TEXT`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experienceLevel VARCHAR(255) DEFAULT 'Fresher'`,
      
      // Salary information
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS minSalary INT`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS maxSalary INT`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salaryCurrency VARCHAR(10) DEFAULT 'INR'`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salaryType VARCHAR(20) DEFAULT 'Yearly'`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS vacancies INT DEFAULT 1`,
      
      // Requirements
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS educationRequired TEXT`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skillsRequired JSON`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS genderPreference VARCHAR(20) DEFAULT 'Any'`,
      
      // Location details
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS locationType VARCHAR(20) DEFAULT 'On-site'`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fullAddress TEXT`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS city VARCHAR(255)`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS state VARCHAR(255)`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country VARCHAR(255) DEFAULT 'India'`,
      
      // Company details
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS companyWebsite VARCHAR(500)`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contactEmail VARCHAR(255)`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contactPhone VARCHAR(50)`,
      
      // Status and dates
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applicationDeadline DATETIME`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active'`
    ];

    // Execute all alter queries
    for (const query of alterQueries) {
      try {
        await sequelize.query(query);
        console.log(`✅ Executed: ${query.split(' ')[2]} column`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`⚠️  Column already exists: ${query.split(' ')[2]}`);
        } else {
          console.error(`❌ Error adding column: ${error.message}`);
        }
      }
    }

    // Update existing jobs with default values where needed
    const updateQueries = [
      `UPDATE jobs SET experienceLevel = 'Fresher' WHERE experienceLevel IS NULL`,
      `UPDATE jobs SET salaryCurrency = 'INR' WHERE salaryCurrency IS NULL`,
      `UPDATE jobs SET salaryType = 'Yearly' WHERE salaryType IS NULL`,
      `UPDATE jobs SET vacancies = 1 WHERE vacancies IS NULL`,
      `UPDATE jobs SET genderPreference = 'Any' WHERE genderPreference IS NULL`,
      `UPDATE jobs SET locationType = 'On-site' WHERE locationType IS NULL`,
      `UPDATE jobs SET country = 'India' WHERE country IS NULL`,
      `UPDATE jobs SET status = 'Active' WHERE status IS NULL`
    ];

    for (const query of updateQueries) {
      try {
        await sequelize.query(query);
        console.log(`✅ Updated existing records: ${query.split(' ')[1]}`);
      } catch (error) {
        console.error(`❌ Error updating records: ${error.message}`);
      }
    }

    console.log('🎉 Jobs table enhancement completed successfully!');
    console.log('📊 New columns added:');
    console.log('   - Job Description & Experience Level');
    console.log('   - Salary Information (min, max, currency, type, vacancies)');
    console.log('   - Requirements (education, skills, gender preference)');
    console.log('   - Location Details (type, address, city, state, country)');
    console.log('   - Company Details (website, contact email, phone)');
    console.log('   - Status & Dates (deadline, status)');

  } catch (error) {
    console.error('❌ Error enhancing jobs table:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  enhanceJobsTable()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = enhanceJobsTable;
