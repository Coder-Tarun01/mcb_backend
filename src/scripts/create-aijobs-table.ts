import { sequelize } from '../models';

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS aijobs (
      id INT NOT NULL PRIMARY KEY,
      company VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      description LONGTEXT,
      skills TEXT,
      experience VARCHAR(50),
      job_url VARCHAR(500),
      posted_date DATETIME,
      job_type VARCHAR(100),
      INDEX idx_company (company),
      INDEX idx_title (title),
      INDEX idx_location (location),
      INDEX idx_posted_date (posted_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    console.log('Creating table aijobs if not exists...');
    await sequelize.query(sql);
    console.log('✅ aijobs table ready');
    return;
  } catch (e) {
    console.error('❌ Failed to create aijobs table:', e);
    throw e;
  }
}

run();


