const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../utils/sequelize');

let notificationColumnsPromise = null;

async function ensureNotificationColumns(sequelize) {
  if (notificationColumnsPromise) {
    return notificationColumnsPromise;
  }

  async function columnExists(table, column) {
    const rows = await sequelize.query(`SHOW COLUMNS FROM ${table} LIKE :column`, {
      replacements: { column },
      type: QueryTypes.SELECT,
    });
    return Array.isArray(rows) && rows.length > 0;
  }

  async function addColumnIfMissing(table, column, definition) {
    const exists = await columnExists(table, column);
    if (!exists) {
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  notificationColumnsPromise = (async () => {
    await addColumnIfMissing('jobs', 'notify_sent', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumnIfMissing('jobs', 'notify_sent_at', 'DATETIME NULL');
    await addColumnIfMissing('aijobs', 'notify_sent', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumnIfMissing('aijobs', 'notify_sent_at', 'DATETIME NULL');
  })();

  return notificationColumnsPromise;
}

function createJobsRepository({ sequelize = getSequelize() } = {}) {
  async function fetchPendingJobs({ limit, createdAfter }) {
    await ensureNotificationColumns(sequelize);

    const replacements = { limit };
    if (createdAfter instanceof Date && !Number.isNaN(createdAfter.getTime())) {
      replacements.createdAfterJobs = createdAfter;
      replacements.createdAfterAiJobs = createdAfter;
    }

    const dateFilterJobs = replacements.createdAfterJobs ? 'AND jobs.createdAt >= :createdAfterJobs' : '';
    const dateFilterAiJobs = replacements.createdAfterAiJobs ? 'AND COALESCE(aijobs.created_at, aijobs.posted_date) >= :createdAfterAiJobs' : '';

    const rows = await sequelize.query(
      `
        SELECT *
        FROM (
          SELECT
            'jobs' AS source,
            jobs.id AS id,
            jobs.title AS title,
            jobs.company AS company_name,
            jobs.location AS location,
            jobs.isRemote AS is_remote,
            jobs.locationType AS location_type,
            jobs.createdAt AS created_at,
            jobs.notify_sent AS notify_sent,
            jobs.notify_sent_at AS notify_sent_at,
            jobs.type AS job_type,
            jobs.experienceLevel AS experience,
            jobs.applyUrl AS apply_url
          FROM jobs
          WHERE jobs.notify_sent = 0
            AND jobs.type = 'Fresher'
          ${dateFilterJobs}

          UNION ALL

          SELECT
            'aijobs' AS source,
            aijobs.id AS id,
            aijobs.title AS title,
            aijobs.company AS company_name,
            aijobs.location AS location,
            aijobs.remote AS is_remote,
            aijobs.job_type AS location_type,
            COALESCE(aijobs.created_at, aijobs.posted_date) AS created_at,
            aijobs.notify_sent AS notify_sent,
            aijobs.notify_sent_at AS notify_sent_at,
            aijobs.job_type AS job_type,
            aijobs.experience AS experience,
            aijobs.job_url AS apply_url
          FROM aijobs
          WHERE aijobs.notify_sent = 0
          ${dateFilterAiJobs}
        ) AS pending
        ORDER BY pending.created_at DESC
        LIMIT :limit;
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    return rows.map((row) => ({
      source: row.source,
      id: row.id,
      title: row.title,
      companyName: row.company_name,
      location: row.location,
      isRemote: normalizeRemote(row.is_remote),
      locationType: row.location_type,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      notifySent: row.notify_sent,
      notifySentAt: row.notify_sent_at ? new Date(row.notify_sent_at) : null,
      jobType: row.job_type,
      experience: row.experience,
      applyUrl: row.apply_url || buildDefaultApplyUrl(row.source, row.id),
      ctaUrl: buildDefaultApplyUrl(row.source, row.id),
    }));
  }

  async function countPendingJobs({ createdAfter } = {}) {
    await ensureNotificationColumns(sequelize);

    const replacements = {};
    const parts = [];

    const jobsFilter = createdAfter instanceof Date && !Number.isNaN(createdAfter.getTime()) ? 'AND createdAt >= :createdAfterJobs' : '';
    const aiJobsFilter = createdAfter instanceof Date && !Number.isNaN(createdAfter.getTime()) ? 'AND COALESCE(created_at, posted_date) >= :createdAfterAiJobs' : '';

    if (jobsFilter) {
      replacements.createdAfterJobs = createdAfter;
      replacements.createdAfterAiJobs = createdAfter;
    }

    parts.push(
      sequelize.query(
        `SELECT COUNT(*) AS total FROM jobs WHERE notify_sent = 0 AND type = 'Fresher' ${jobsFilter}`,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      )
    );

    parts.push(
      sequelize.query(
        `SELECT COUNT(*) AS total FROM aijobs WHERE notify_sent = 0 ${aiJobsFilter}`,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      )
    );

    const [jobsCountRows, aiJobsCountRows] = await Promise.all(parts);
    const jobsCount = Array.isArray(jobsCountRows) && jobsCountRows.length > 0 ? Number(jobsCountRows[0].total || 0) : 0;
    const aiJobsCount = Array.isArray(aiJobsCountRows) && aiJobsCountRows.length > 0 ? Number(aiJobsCountRows[0].total || 0) : 0;
    return jobsCount + aiJobsCount;
  }

  async function markJobsNotified(jobIdsBySource) {
    await ensureNotificationColumns(sequelize);

    const { jobs = [], aijobs = [] } = jobIdsBySource;
    if (jobs.length === 0 && aijobs.length === 0) {
      return { jobs: 0, aijobs: 0 };
    }

    return sequelize.transaction(async (transaction) => {
      let jobsUpdated = 0;
      let aiJobsUpdated = 0;

      if (jobs.length > 0) {
        const [result] = await sequelize.query(
          `
            UPDATE jobs
            SET notify_sent = 1,
                notify_sent_at = NOW()
            WHERE id IN (:jobIds)
          `,
          {
            replacements: { jobIds: jobs },
            type: QueryTypes.BULKUPDATE,
            transaction,
          }
        );
        jobsUpdated = typeof result === 'number' ? result : 0;
      }

      if (aijobs.length > 0) {
        const [result] = await sequelize.query(
          `
            UPDATE aijobs
            SET notify_sent = 1,
                notify_sent_at = NOW()
            WHERE id IN (:jobIds)
          `,
          {
            replacements: { jobIds: aijobs },
            type: QueryTypes.BULKUPDATE,
            transaction,
          }
        );
        aiJobsUpdated = typeof result === 'number' ? result : 0;
      }

      return {
        jobs: jobsUpdated,
        aijobs: aiJobsUpdated,
      };
    });
  }

  return {
    fetchPendingJobs,
    countPendingJobs,
    markJobsNotified,
  };
}

function normalizeRemote(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['remote', 'yes', 'true', '1'].includes(normalized)) {
    return true;
  }
  if (['no', 'false', '0', 'on-site', 'onsite'].includes(normalized)) {
    return false;
  }
  return null;
}

function buildDefaultApplyUrl(source, id) {
  const base = 'https://mycareerbuild.com';
  if (source === 'aijobs') {
    return `${base}/aijobs/${id}`;
  }
  return `${base}/jobs/${id}`;
}

module.exports = {
  createJobsRepository,
  normalizeRemote,
  buildDefaultApplyUrl,
};


