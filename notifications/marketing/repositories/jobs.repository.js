const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../utils/sequelize');

let notificationColumnsPromise = null;
let jobColumnInfoPromise = null;
let aiJobColumnInfoPromise = null;
let currentDialect = 'mysql';
let currentSchema = null;

function configureDialect(sequelize) {
  currentDialect = sequelize.getDialect();
  const defineSchema = sequelize?.options?.define?.schema;
  const directSchema = sequelize?.options?.schema;
  currentSchema = currentDialect === 'postgres' ? defineSchema || directSchema || null : null;
}

function quoteIdentifier(identifier) {
  if (!identifier) {
    return '';
  }
  const quoteChar = currentDialect === 'postgres' ? '"' : '`';
  return `${quoteChar}${String(identifier).replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar)}${quoteChar}`;
}

function createQuoteHelpers(sequelize) {
  const dialect = sequelize.getDialect();
  const quoteIdentifier =
    dialect === 'mysql'
      ? (identifier) => (identifier ? `\`${String(identifier).replace(/`/g, '``')}\`` : '')
      : (identifier) => (identifier ? `"${String(identifier).replace(/"/g, '""')}"` : '');

  const qualifyColumn = (table, column) => {
    if (!table || !column) {
      return '';
    }
    return `${quoteIdentifier(table)}.${quoteIdentifier(column)}`;
  };

  return { quoteIdentifier, qualifyColumn };
}

function qualifyTableName(table) {
  if (!table) {
    return '';
  }
  const tableName = quoteIdentifier(table);
  if (currentDialect === 'postgres' && currentSchema) {
    return `${quoteIdentifier(currentSchema)}.${tableName}`;
  }
  return tableName;
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

async function fetchTableColumns(sequelize, table) {
  if (currentDialect === 'postgres') {
    const replacements = { table };
    let schemaClause = '';
    if (currentSchema) {
      replacements.schema = currentSchema;
      schemaClause = 'AND table_schema = :schema';
    }
    const rows = await sequelize.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = :table
          ${schemaClause}
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );
    return rows.map((row) => ({ column_name: row.column_name }));
  }

  const tableIdentifier = qualifyTableName(table);
  return sequelize.query(`SHOW COLUMNS FROM ${tableIdentifier}`, {
    type: QueryTypes.SELECT,
  });
}

async function resolveJobColumnInfo(sequelize) {
  if (jobColumnInfoPromise) {
    return jobColumnInfoPromise;
  }

  const dialect = sequelize.getDialect();
  const schema = process.env.DB_SCHEMA || undefined;

  const buildColumnInfo = async () => {
    try {
      if (dialect === 'postgres') {
        const describe = await sequelize
          .getQueryInterface()
          .describeTable({ tableName: 'jobs', schema });
        const columns = Object.keys(describe || {}).map((name) => ({
          raw: name,
          lower: name.toLowerCase(),
        }));
        const findColumn = buildColumnFinder(columns);
        return {
          createdColumn: findColumn('createdAt', 'created_at'),
          jobTypeColumn: findColumn('type', 'job_type'),
          experienceColumn: findColumn('experienceLevel', 'experience'),
          applyUrlColumn: findColumn('applyUrl', 'link'),
          locationTypeColumn: findColumn('locationType', 'location_type'),
          isRemoteColumn: findColumn('isRemote', 'is_remote'),
          notifySentColumn: findColumn('notify_sent', 'notifysent'),
          notifySentAtColumn: findColumn('notify_sent_at', 'notifysentat'),
          categoryColumn: findColumn('category', 'job_category'),
          skillsColumn: findColumn('skillsRequired', 'skills'),
        };
      } else {
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
          notifySentColumn: findColumn('notify_sent', 'notifysent'),
          notifySentAtColumn: findColumn('notify_sent_at', 'notifysentat'),
          categoryColumn: findColumn('category', 'job_category'),
          skillsColumn: findColumn('skillsRequired', 'skills'),
        };
      }
    } catch (error) {
      return {
        createdColumn: 'createdAt',
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
    createdColumn: 'createdAt',
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

  const dialect = sequelize.getDialect();
  const schema = process.env.DB_SCHEMA || undefined;

  const buildColumnInfo = async () => {
    try {
      if (dialect === 'postgres') {
        const describe = await sequelize
          .getQueryInterface()
          .describeTable({ tableName: 'aijobs', schema });
        const columns = Object.keys(describe || {}).map((name) => ({
          raw: name,
          lower: name.toLowerCase(),
        }));
        const findColumn = buildColumnFinder(columns);
        return {
          createdColumn: findColumn('created_at', 'createdAt'),
          postedColumn: findColumn('posted_date', 'postedDate'),
          jobTypeColumn: findColumn('job_type', 'jobType'),
          remoteColumn: findColumn('remote', 'is_remote', 'isRemote'),
          experienceColumn: findColumn('experience'),
          applyUrlColumn: findColumn('job_url', 'applyUrl', 'link'),
          locationTypeColumn: findColumn('location_type', 'job_type', 'type'),
          notifySentColumn: findColumn('notify_sent', 'notifysent'),
          notifySentAtColumn: findColumn('notify_sent_at', 'notifysentat'),
          categoryColumn: findColumn('category', 'job_type'),
          skillsColumn: findColumn('skills'),
        };
      } else {
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
          notifySentColumn: findColumn('notify_sent', 'notifysent'),
          notifySentAtColumn: findColumn('notify_sent_at', 'notifysentat'),
          categoryColumn: findColumn('category', 'job_type'),
          skillsColumn: findColumn('skills'),
        };
      }

      const columns = await sequelize.query('SHOW COLUMNS FROM aijobs', {
        type: QueryTypes.SELECT,
      });
>>>>>>> ed875dd4ab4252a5050f15e4516a68a8721a4d09
      const findColumn = buildColumnFinder(columns);

      return {
        createdColumn: findColumn('created_at', 'createdAt'),
        postedColumn: findColumn('posted_date', 'postedDate'),
        jobTypeColumn: findColumn('job_type', 'jobType'),
        remoteColumn: findColumn('remote', 'is_remote', 'isRemote'),
        experienceColumn: findColumn('experience'),
        applyUrlColumn: findColumn('job_url', 'applyUrl', 'link'),
        locationTypeColumn: findColumn('location_type', 'job_type', 'type'),
        notifySentColumn: findColumn('notify_sent', 'notifysent'),
        notifySentAtColumn: findColumn('notify_sent_at', 'notifysentat'),
        categoryColumn: findColumn('category', 'job_type'),
        skillsColumn: findColumn('skills'),
      };
    } catch (error) {
      return {
        createdColumn: null,
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
    createdColumn: null,
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

  const dialect = sequelize.getDialect();
  if (dialect !== 'mysql') {
    notificationColumnsPromise = Promise.resolve();
    return notificationColumnsPromise;
  }

  async function columnExists(table, column) {
    if (currentDialect === 'postgres') {
      const replacements = { table, column };
      let schemaClause = '';
      if (currentSchema) {
        replacements.schema = currentSchema;
        schemaClause = 'AND table_schema = :schema';
      }
      const rows = await sequelize.query(
        `
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = :table
            ${schemaClause}
            AND column_name = :column
          LIMIT 1
        `,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );
      return Array.isArray(rows) && rows.length > 0;
    }

    const tableIdentifier = qualifyTableName(table);
    const rows = await sequelize.query(`SHOW COLUMNS FROM ${tableIdentifier} LIKE :column`, {
      replacements: { column },
      type: QueryTypes.SELECT,
    });
    return Array.isArray(rows) && rows.length > 0;
  }

  async function addColumnIfMissing(table, column, definition) {
    const exists = await columnExists(table, column);
    if (!exists) {
      await sequelize.query(
        `ALTER TABLE ${qualifyTableName(table)} ADD COLUMN ${quoteIdentifier(column)} ${definition}`
      );
    }
  }

  notificationColumnsPromise = (async () => {
    const notifySentDefinition =
      currentDialect === 'postgres' ? 'BOOLEAN NOT NULL DEFAULT FALSE' : 'TINYINT(1) NOT NULL DEFAULT 0';
    const notifySentAtDefinition =
      currentDialect === 'postgres' ? 'TIMESTAMP WITHOUT TIME ZONE NULL' : 'DATETIME NULL';

    await addColumnIfMissing('jobs', 'notify_sent', notifySentDefinition);
    await addColumnIfMissing('jobs', 'notify_sent_at', notifySentAtDefinition);
    await addColumnIfMissing('aijobs', 'notify_sent', notifySentDefinition);
    await addColumnIfMissing('aijobs', 'notify_sent_at', notifySentAtDefinition);
  })();

  return notificationColumnsPromise;
}

function createJobsRepository({ sequelize = getSequelize() } = {}) {
<<<<<<< HEAD
  configureDialect(sequelize);

=======
  const { quoteIdentifier, qualifyColumn } = createQuoteHelpers(sequelize);
>>>>>>> ed875dd4ab4252a5050f15e4516a68a8721a4d09
  async function fetchPendingJobs({ limit, createdAfter }) {
    await ensureNotificationColumns(sequelize);
    const columns = await resolveJobColumnInfo(sequelize);
    const aiColumns = await resolveAiJobColumnInfo(sequelize);

    const createdColumnName = columns.createdColumn || 'createdAt';
    const jobTypeColumnName = columns.jobTypeColumn || 'type';
    const isRemoteColumnName = columns.isRemoteColumn || 'isRemote';
    const locationTypeColumnName = columns.locationTypeColumn || 'locationType';
    const experienceColumnName = columns.experienceColumn || 'experienceLevel';
    const applyUrlColumnName = columns.applyUrlColumn || 'applyUrl';
    const notifySentColumnName = columns.notifySentColumn || 'notify_sent';
    const categoryColumnName = columns.categoryColumn;
    const skillsColumnName = columns.skillsColumn;

    const createdColumnQualified = qualifyColumn('jobs', createdColumnName);
    const jobTypeQualified = qualifyColumn('jobs', jobTypeColumnName);
    const isRemoteExpr = qualifyColumn('jobs', isRemoteColumnName);
    const locationTypeExpr = qualifyColumn('jobs', locationTypeColumnName);
    const experienceExpr = `COALESCE(${qualifyColumn('jobs', experienceColumnName)}, '')`;
    const applyUrlExpr = `COALESCE(${qualifyColumn('jobs', applyUrlColumnName)}, '')`;
    const jobIdExpr = `${qualifyColumn('jobs', 'id')}::text`;
    const categoryExpr = categoryColumnName ? `COALESCE(${qualifyColumn('jobs', categoryColumnName)}, '')` : "''";
    const skillsExpr = skillsColumnName ? qualifyColumn('jobs', skillsColumnName) : 'NULL';
    const notifySentExpr = notifySentColumnName ? qualifyColumn('jobs', notifySentColumnName) : null;

    const aiCreatedColumns = [aiColumns.createdColumn, aiColumns.postedColumn]
      .filter(Boolean)
      .map((col) => qualifyColumn('aijobs', col));
    const aiCreatedExpr = aiCreatedColumns.length > 0 ? `COALESCE(${aiCreatedColumns.join(', ')})` : 'NULL';
    const aiJobTypeExpr = aiColumns.jobTypeColumn ? `COALESCE(${qualifyColumn('aijobs', aiColumns.jobTypeColumn)}, '')` : "''";
    const aiRemoteExpr = aiColumns.remoteColumn ? qualifyColumn('aijobs', aiColumns.remoteColumn) : 'NULL';
    const aiIdExpr = `${qualifyColumn('aijobs', 'id')}::text`;
    const aiLocationTypeExpr = aiColumns.locationTypeColumn ? `COALESCE(${qualifyColumn('aijobs', aiColumns.locationTypeColumn)}, '')` : "''";
    const aiExperienceExpr = aiColumns.experienceColumn ? `COALESCE(${qualifyColumn('aijobs', aiColumns.experienceColumn)}, '')` : "''";
    const aiApplyUrlExpr = aiColumns.applyUrlColumn ? `COALESCE(${qualifyColumn('aijobs', aiColumns.applyUrlColumn)}, '')` : "''";
    const aiCategoryExpr = aiColumns.categoryColumn ? `COALESCE(${qualifyColumn('aijobs', aiColumns.categoryColumn)}, '')` : "''";
    const aiSkillsExpr = aiColumns.skillsColumn ? qualifyColumn('aijobs', aiColumns.skillsColumn) : 'NULL';
    const aiNotifySentAtExpr = aiColumns.notifySentAtColumn ? qualifyColumn('aijobs', aiColumns.notifySentAtColumn) : 'NULL';
    const aiNotifySentExpr = aiColumns.notifySentColumn ? qualifyColumn('aijobs', aiColumns.notifySentColumn) : null;

    const replacements = { limit };
    const hasCreatedAfter = createdAfter instanceof Date && !Number.isNaN(createdAfter.getTime());

    const jobConditions = [];
    if (notifySentExpr) {
      jobConditions.push(`(${notifySentExpr} = false OR ${notifySentExpr} IS NULL)`);
    }
    if (hasCreatedAfter && createdColumnQualified) {
      replacements.createdAfterJobs = createdAfter;
      jobConditions.push(`${createdColumnQualified} >= :createdAfterJobs`);
    }
    const jobWhereClause = jobConditions.length > 0 ? `WHERE ${jobConditions.join(' AND ')}` : '';

    const aiCreatedFilterColumn =
      aiColumns.createdColumn ? qualifyColumn('aijobs', aiColumns.createdColumn) : aiColumns.postedColumn ? qualifyColumn('aijobs', aiColumns.postedColumn) : null;

    const aiConditions = [];
    if (aiNotifySentExpr) {
      aiConditions.push(`(${aiNotifySentExpr} = false OR ${aiNotifySentExpr} IS NULL)`);
    }
    if (hasCreatedAfter && aiCreatedFilterColumn) {
      replacements.createdAfterAiJobs = createdAfter;
      aiConditions.push(`${aiCreatedFilterColumn} >= :createdAfterAiJobs`);
    }
    const aiWhereClause = aiConditions.length > 0 ? `WHERE ${aiConditions.join(' AND ')}` : '';

    const rows = await sequelize.query(
      `
        SELECT *
        FROM (
          SELECT
            'jobs' AS source,
            ${jobIdExpr} AS id,
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
          FROM ${qualifyTableName('jobs')} AS jobs
          ${jobWhereClause}

          UNION ALL

          SELECT
            'aijobs' AS source,
            ${aiIdExpr} AS id,
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
          FROM ${qualifyTableName('aijobs')} AS aijobs
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
    const jobConditions = [];
    const aiConditions = [];

    const notifySentColumnName = columns.notifySentColumn || 'notify_sent';
    const aiNotifySentColumnName = aiColumns.notifySentColumn || 'notify_sent';

    const notifySentColumn = notifySentColumnName ? qualifyColumn('jobs', notifySentColumnName) : null;
    const aiNotifySentColumn = aiNotifySentColumnName ? qualifyColumn('aijobs', aiNotifySentColumnName) : null;

    if (notifySentColumn) {
      jobConditions.push(`(${notifySentColumn} = false OR ${notifySentColumn} IS NULL)`);
    }
    if (aiNotifySentColumn) {
      aiConditions.push(`(${aiNotifySentColumn} = false OR ${aiNotifySentColumn} IS NULL)`);
    }

    if (createdAfter instanceof Date && !Number.isNaN(createdAfter.getTime())) {
      replacements.createdAfterJobs = createdAfter;
      jobConditions.push(`${jobCreatedColumn} >= :createdAfterJobs`);
      if (aiDateExpression) {
        replacements.createdAfterAiJobs = createdAfter;
        aiConditions.push(`${aiDateExpression} >= :createdAfterAiJobs`);
      }
    }

    const jobsWhere = jobConditions.length > 0 ? `WHERE ${jobConditions.join(' AND ')}` : '';
    const aiWhere = aiConditions.length > 0 ? `WHERE ${aiConditions.join(' AND ')}` : '';

    const [jobsCountRows, aiJobsCountRows] = await Promise.all([
      sequelize.query(`SELECT COUNT(*) AS total FROM ${qualifyTableName('jobs')} AS jobs ${jobsWhere}`, {
        replacements,
        type: QueryTypes.SELECT,
      }),
      aiDateExpression
        ? sequelize.query(`SELECT COUNT(*) AS total FROM ${qualifyTableName('aijobs')} AS aijobs ${aiWhere}`, {
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


