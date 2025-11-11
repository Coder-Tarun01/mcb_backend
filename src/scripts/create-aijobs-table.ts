import { sequelize } from '../models';

async function run() {
  const tableSql = `
    CREATE TABLE IF NOT EXISTS aijobs (
      id INTEGER PRIMARY KEY,
      company VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      description TEXT,
      skills TEXT,
      experience VARCHAR(50),
      job_url VARCHAR(500),
      posted_date TIMESTAMPTZ,
      job_type VARCHAR(100)
    );
  `;

  const indexSql = [
    'CREATE INDEX IF NOT EXISTS idx_aijobs_company ON aijobs (company)',
    'CREATE INDEX IF NOT EXISTS idx_aijobs_title ON aijobs (title)',
    'CREATE INDEX IF NOT EXISTS idx_aijobs_location ON aijobs (location)',
    'CREATE INDEX IF NOT EXISTS idx_aijobs_posted_date ON aijobs (posted_date)'
  ];

  try {
    console.log('Creating table aijobs if not exists...');
    await sequelize.query(tableSql);
    for (const statement of indexSql) {
      await sequelize.query(statement);
    }
    console.log('✅ aijobs table ready');
    return;
  } catch (e) {
    console.error('❌ Failed to create aijobs table:', e);
    throw e;
  }
}

run();


