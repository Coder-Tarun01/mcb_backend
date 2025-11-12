const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../utils/sequelize');

let notificationColumnsPromise = null;
let jobColumnInfoPromise = null;
let aiJobColumnInfoPromise = null;

function quoteIdentifier(identifier) {
  if (!identifier) {
    return '';
  }
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function qualifyColumn(table, column) {
  if (!table || !column) {
    return '';
  }
  return `${quoteIdentifier(table)}.${quoteIdentifier(column)}`;
}

function buildColumnFinder(columns) {
  const entries = Array.isArray(columns)
    ? columns
        .map((col) => col.Field || col.column_name || col.COLUMN_NAME)
        .filter(Boolean)
        .map((name) => {
          const normalized = String(name);
          return {
            raw: normalized,
            lower: normalized.toLowerCase(),
          };
        })
    : [];

  return function findColumn(...candidates) {
    for (const candidate of candidates) {
      const match = entries.find((entry) => entry.lower === String(candidate).toLowerCase());
      if (match) {
        return match.raw;
      }
    }
    return null;
  };
}

function buildSafeColumnInfo(builder, fallback) {
  return builder().catch(() => fallback);
}

async function resolveJobColumnInfo(sequelize) {
  if (jobColumnInfoPromise) {
    return jobColumnInfoPromise;
  }

  const buildColumnInfo = async () => {
    try {
      const columns = await sequelize.query('SHOW COLUMNS FROM jobs', {
        type: QueryTypes.SELECT,
      });
      const findColumn = buildColumnFinder(columns);

      return {
        createdColumn: findColumn('createdAt', 'created_at'),
        jobTypeColumn: findColumn('type', 'job_type'),
        experienceColumn: findColumn('experienceLevel', 'experience'),
        applyUrlColumn: findColumn('applyUrl', 'link'),
        locationTypeColumn: findColumn('locationType', 'location_type'),
        isRemoteColumn: findColumn('isRemote', 'is_remote'),
        notifySentColumn: findColumn('notify_sent'),
        notifySentAtColumn: findColumn('notify_sent_at'),
        categoryColumn: findColumn('category', 'job_category'),
        skillsColumn: findColumn('skillsRequired', 'skills'),
      };
    } catch (error) {
      return {
        createdColumn: 'created_at',
        jobTypeColumn: 'type',
        experienceColumn: 'experienceLevel',
        applyUrlColumn: 'applyUrl',
        locationTypeColumn: 'locationType',
        isRemoteColumn: 'isRemote',
        notifySentColumn: 'notify_sent',
        notifySentAtColumn: 'notify_sent_at',
        categoryColumn: 'category',
        skillsColumn: 'skillsRequired',
      };
    }
  };

  jobColumnInfoPromise = buildSafeColumnInfo(buildColumnInfo, {
    createdColumn: 'created_at',
    jobTypeColumn: 'type',
    experienceColumn: 'experienceLevel',
    applyUrlColumn: 'applyUrl',
    locationTypeColumn: 'locationType',
    isRemoteColumn: 'isRemote',
    notifySentColumn: 'notify_sent',
    notifySentAtColumn: 'notify_sent_at',
    categoryColumn: 'category',
    skillsColumn: 'skillsRequired',
  });

  return jobColumnInfoPromise;
}

async function resolveAiJobColumnInfo(sequelize) {
  if (aiJobColumnInfoPromise) {
    return aiJobColumnInfoPromise;
  }

  const buildColumnInfo = async () => {
    try {
      const columns = await sequelize.query('SHOW COLUMNS FROM aijobs', {
        type: QueryTypes.SELECT,
      });
      const findColumn = buildColumnFinder(columns);

      return {
        createdColumn: findColumn('created_at', 'createdAt'),
        postedColumn: findColumn('posted_date', 'postedDate'),
        jobTypeColumn: findColumn('job_type', 'jobType'),
        remoteColumn: findColumn('remote', 'is_remote', 'isRemote'),
        experienceColumn: findColumn('experience'),
        applyUrlColumn: findColumn('job_url', 'applyUrl', 'link'),
        locationTypeColumn: findColumn('location_type', 'job_type', 'type'),
        notifySentColumn: findColumn('notify_sent'),
        notifySentAtColumn: findColumn('notify_sent_at'),
        categoryColumn: findColumn('category', 'job_type'),
        skillsColumn: findColumn('skills'),
      };
    } catch (error) {
      return {
        createdColumn: 'created_at',
        postedColumn: 'posted_date',
        jobTypeColumn: 'job_type',
        remoteColumn: 'remote',
        experienceColumn: 'experience',
        applyUrlColumn: 'job_url',
        locationTypeColumn: 'job_type',
        notifySentColumn: 'notify_sent',
        notifySentAtColumn: 'notify_sent_at',
        categoryColumn: 'job_type',
        skillsColumn: 'skills',
      };
    }
  };

  aiJobColumnInfoPromise = buildSafeColumnInfo(buildColumnInfo, {
    createdColumn: 'created_at',
    postedColumn: 'posted_date',
    jobTypeColumn: 'job_type',
    remoteColumn: 'remote',
    experienceColumn: 'experience',
    applyUrlColumn: 'job_url',
    locationTypeColumn: 'job_type',
    notifySentColumn: 'notify_sent',
    notifySentAtColumn: 'notify_sent_at',
    categoryColumn: 'job_type',
    skillsColumn: 'skills',
  });

  return aiJobColumnInfoPromise;
}

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
    const columns = await resolveJobColumnInfo(sequelize);
    const aiColumns = await resolveAiJobColumnInfo(sequelize);

    const createdColumnName = columns.createdColumn || 'created_at';
    const jobTypeColumnName = columns.jobTypeColumn || 'type';
    const isRemoteColumnName = columns.isRemoteColumn || 'isRemote';
    const locationTypeColumnName = columns.locationTypeColumn || 'locationType';
    const experienceColumnName = columns.experienceColumn || 'experienceLevel';
    const applyUrlColumnName = columns.applyUrlColumn || 'applyUrl';
    const categoryColumnName = columns.categoryColumn;
    const skillsColumnName = columns.skillsColumn;

    const createdColumnQualified = qualifyColumn('jobs', createdColumnName);
    const jobTypeQualified = qualifyColumn('jobs', jobTypeColumnName);
    const isRemoteExpr = qualifyColumn('jobs', isRemoteColumnName);
    const locationTypeExpr = qualifyColumn('jobs', locationTypeColumnName);
    const experienceExpr = `COALESCE(${qualifyColumn('jobs', experienceColumnName)}, '')`;
    const applyUrlExpr = `COALESCE(${qualifyColumn('jobs', applyUrlColumnName)}, '')`;
    const categoryExpr = categoryColumnName ? qualifyColumn('jobs', categoryColumnName) : 'NULL';
    const skillsExpr = skillsColumnName ? qualifyColumn('jobs', skillsColumnName) : 'NULL';

    const aiCreatedColumns = [aiColumns.createdColumn, aiColumns.postedColumn]
      .filter(Boolean)
      .map((col) => qualifyColumn('aijobs', col));
    const aiCreatedExpr = aiCreatedColumns.length > 0 ? `COALESCE(${aiCreatedColumns.join(', ')})` : 'NULL';
    const aiJobTypeExpr = aiColumns.jobTypeColumn ? qualifyColumn('aijobs', aiColumns.jobTypeColumn) : "''";
    const aiRemoteExpr = aiColumns.remoteColumn ? qualifyColumn('aijobs', aiColumns.remoteColumn) : 'NULL';
    const aiLocationTypeExpr = aiColumns.locationTypeColumn ? qualifyColumn('aijobs', aiColumns.locationTypeColumn) : "''";
    const aiExperienceExpr = aiColumns.experienceColumn ? qualifyColumn('aijobs', aiColumns.experienceColumn) : "''";
    const aiApplyUrlExpr = aiColumns.applyUrlColumn ? qualifyColumn('aijobs', aiColumns.applyUrlColumn) : "''";
    const aiCategoryExpr = aiColumns.categoryColumn ? qualifyColumn('aijobs', aiColumns.categoryColumn) : "''";
    const aiSkillsExpr = aiColumns.skillsColumn ? qualifyColumn('aijobs', aiColumns.skillsColumn) : 'NULL';
    const aiNotifySentAtExpr = aiColumns.notifySentAtColumn ? qualifyColumn('aijobs', aiColumns.notifySentAtColumn) : 'NULL';

    const replacements = { limit };
    const hasCreatedAfter = createdAfter instanceof Date && !Number.isNaN(createdAfter.getTime());

    let jobWhereClause = '';
    if (hasCreatedAfter && createdColumnQualified) {
      replacements.createdAfterJobs = createdAfter;
      jobWhereClause = `WHERE ${createdColumnQualified} >= :createdAfterJobs`;
    }

    const aiCreatedFilterColumn =
      aiColumns.createdColumn ? qualifyColumn('aijobs', aiColumns.createdColumn) : aiColumns.postedColumn ? qualifyColumn('aijobs', aiColumns.postedColumn) : null;

    let aiWhereClause = '';
    if (hasCreatedAfter && aiCreatedFilterColumn) {
      replacements.createdAfterAiJobs = createdAfter;
      aiWhereClause = `WHERE ${aiCreatedFilterColumn} >= :createdAfterAiJobs`;
    }

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
            ${isRemoteExpr} AS is_remote,
            ${locationTypeExpr} AS location_type,
            ${createdColumnQualified} AS created_at,
            NULL AS notify_sent,
            NULL AS notify_sent_at,
            ${jobTypeQualified} AS job_type,
            ${experienceExpr} AS experience,
            ${applyUrlExpr} AS apply_url,
            ${categoryExpr} AS category,
            ${skillsExpr} AS skills
          FROM jobs
          ${jobWhereClause}

          UNION ALL

          SELECT
            'aijobs' AS source,
            aijobs.id AS id,
            aijobs.title AS title,
            aijobs.company AS company_name,
            aijobs.location AS location,
            ${aiRemoteExpr} AS is_remote,
            ${aiLocationTypeExpr} AS location_type,
            ${aiCreatedExpr} AS created_at,
            NULL AS notify_sent,
            ${aiNotifySentAtExpr} AS notify_sent_at,
            ${aiJobTypeExpr} AS job_type,
            ${aiExperienceExpr} AS experience,
            ${aiApplyUrlExpr} AS apply_url,
            ${aiCategoryExpr} AS category,
            ${aiSkillsExpr} AS skills
          FROM aijobs
          ${aiWhereClause}
        ) AS pending
        ORDER BY pending.created_at DESC
        LIMIT :limit;
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    return rows.map((row) => {
      const skills = normalizeSkills(row.skills);
      return {
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
        category: row.category || null,
        skills,
      };
    });
  }

  async function countPendingJobs({ createdAfter } = {}) {
    await ensureNotificationColumns(sequelize);
    const columns = await resolveJobColumnInfo(sequelize);
    const aiColumns = await resolveAiJobColumnInfo(sequelize);

    const jobCreatedColumnName = columns.createdColumn || 'createdAt';
    const jobCreatedColumn = qualifyColumn('jobs', jobCreatedColumnName);

    const aiDateColumns = [aiColumns.createdColumn, aiColumns.postedColumn]
      .filter(Boolean)
      .map((column) => qualifyColumn('aijobs', column));
    const aiDateExpression =
      aiDateColumns.length === 0
        ? null
        : aiDateColumns.length === 1
          ? aiDateColumns[0]
          : `COALESCE(${aiDateColumns.join(', ')})`;

    const replacements = {};
    let jobsWhere = '';
    let aiWhere = '';

    if (createdAfter instanceof Date && !Number.isNaN(createdAfter.getTime())) {
      replacements.createdAfterJobs = createdAfter;
      jobsWhere = `WHERE ${jobCreatedColumn} >= :createdAfterJobs`;
      if (aiDateExpression) {
        replacements.createdAfterAiJobs = createdAfter;
        aiWhere = `WHERE ${aiDateExpression} >= :createdAfterAiJobs`;
      }
    }

    const [jobsCountRows, aiJobsCountRows] = await Promise.all([
      sequelize.query(`SELECT COUNT(*) AS total FROM jobs ${jobsWhere}`, {
        replacements,
        type: QueryTypes.SELECT,
      }),
      aiDateExpression
        ? sequelize.query(`SELECT COUNT(*) AS total FROM aijobs ${aiWhere}`, {
            replacements,
            type: QueryTypes.SELECT,
          })
        : Promise.resolve([{ total: 0 }]),
    ]);

    const jobsCount = Array.isArray(jobsCountRows) && jobsCountRows.length > 0 ? Number(jobsCountRows[0].total || 0) : 0;
    const aiJobsCount =
      Array.isArray(aiJobsCountRows) && aiJobsCountRows.length > 0 ? Number(aiJobsCountRows[0].total || 0) : 0;
    return jobsCount + aiJobsCount;
  }

  async function markJobsNotified(_jobIdsBySource) {
    return { jobs: 0, aijobs: 0 };
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

function normalizeSkills(value) {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => (entry === null || entry === undefined ? null : String(entry).trim()))
      .filter((entry) => entry && entry.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (entry === null || entry === undefined ? null : String(entry).trim()))
          .filter((entry) => entry && entry.length > 0);
      }
    } catch (error) {
      // fall through to delimiter split
    }
    return trimmed
      .split(/[,|]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return [String(value).trim()].filter((entry) => entry.length > 0);
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


