const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../utils/sequelize');

let initializePromise = null;

async function ensureTable(sequelize) {
  if (initializePromise) {
    return initializePromise;
  }

  const createStatement = `
    CREATE TABLE IF NOT EXISTS digest_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      jobs_sent JSON NULL,
      status ENUM('SUCCESS','FAILED') NOT NULL DEFAULT 'SUCCESS',
      error_message TEXT NULL,
      sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_digest_logs_email (email),
      INDEX idx_digest_logs_sent_at (sent_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  initializePromise = sequelize
    .query(createStatement, { type: QueryTypes.RAW })
    .catch((error) => {
      initializePromise = null;
      throw error;
    });

  return initializePromise;
}

function createDigestLogRepository({ sequelize = getSequelize() } = {}) {
  async function record({ email, jobs, status, error }) {
    if (!email) {
      return;
    }

    await ensureTable(sequelize);

    const sanitizedJobs = Array.isArray(jobs) ? jobs.map((job) => ({
      id: job && job.id !== undefined ? job.id : null,
      source: job && job.source ? job.source : null,
      title: job && job.title ? job.title : null,
      company: job && job.companyName ? job.companyName : null,
      applyUrl: job && job.applyUrl ? job.applyUrl : null,
    })) : [];

    await sequelize.query(
      `INSERT INTO digest_logs (email, jobs_sent, status, error_message)
       VALUES (:email, :jobs_sent, :status, :error_message)`,
      {
        replacements: {
          email,
          jobs_sent: JSON.stringify(sanitizedJobs),
          status: status === 'FAILED' ? 'FAILED' : 'SUCCESS',
          error_message: error || null,
        },
        type: QueryTypes.INSERT,
      }
    );
  }

  return {
    record,
  };
}

module.exports = {
  createDigestLogRepository,
};
