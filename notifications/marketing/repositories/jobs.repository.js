const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../utils/sequelize');

let notificationColumnsPromise = null;
let jobColumnInfoPromise = null;
let accountsJobColumnInfoPromise = null;
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
          educationColumn: findColumn('educationRequired', 'education_required', 'education'),
          jobDescriptionColumn: findColumn('jobDescription', 'job_description'),
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
          educationColumn: findColumn('educationRequired', 'education_required', 'education'),
          jobDescriptionColumn: findColumn('jobDescription', 'job_description'),
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
        educationColumn: 'educationRequired',
        jobDescriptionColumn: null,
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
    educationColumn: 'educationRequired',
    jobDescriptionColumn: null,
  });

  return jobColumnInfoPromise;
}

async function resolveAccountsJobColumnInfo(sequelize) {
  if (accountsJobColumnInfoPromise) {
    return accountsJobColumnInfoPromise;
  }

  const dialect = sequelize.getDialect();
  const schema = process.env.DB_SCHEMA || undefined;

  const buildColumnInfo = async () => {
    try {
      if (dialect === 'postgres') {
        const describe = await sequelize
          .getQueryInterface()
          .describeTable({ tableName: 'accounts_jobdata', schema });
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
          educationColumn: findColumn('educationRequired', 'education_required', 'education'),
          slugColumn: findColumn('slug'),
        };
      } else {
        const columns = await sequelize.query('SHOW COLUMNS FROM accounts_jobdata', {
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
          educationColumn: findColumn('educationRequired', 'education_required', 'education'),
          slugColumn: findColumn('slug'),
        };
      }
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
        educationColumn: null,
        slugColumn: null,
      };
    }
  };

  accountsJobColumnInfoPromise = buildSafeColumnInfo(buildColumnInfo, {
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
    educationColumn: null,
    slugColumn: null,
  });

  return accountsJobColumnInfoPromise;
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
    await addColumnIfMissing('accounts_jobdata', 'notify_sent', notifySentDefinition);
    await addColumnIfMissing('accounts_jobdata', 'notify_sent_at', notifySentAtDefinition);
  })();

  return notificationColumnsPromise;
}

function createJobsRepository({ sequelize = getSequelize() } = {}) {
  configureDialect(sequelize);
  const { quoteIdentifier, qualifyColumn } = createQuoteHelpers(sequelize);
  async function fetchPendingJobs({ limit, createdAfter }) {
    await ensureNotificationColumns(sequelize);
    const columns = await resolveJobColumnInfo(sequelize);
    const aiColumns = await resolveAccountsJobColumnInfo(sequelize);

    const createdColumnName = columns.createdColumn || 'createdAt';
    const jobTypeColumnName = columns.jobTypeColumn || 'type';
    const isRemoteColumnName = columns.isRemoteColumn || 'isRemote';
    const locationTypeColumnName = columns.locationTypeColumn || 'locationType';
    const experienceColumnName = columns.experienceColumn || 'experienceLevel';
    const applyUrlColumnName = columns.applyUrlColumn || 'applyUrl';
    const notifySentColumnName = columns.notifySentColumn || 'notify_sent';
    const categoryColumnName = columns.categoryColumn;
    const skillsColumnName = columns.skillsColumn;
    const educationColumnName = columns.educationColumn;

    const createdColumnQualified = qualifyColumn('jobs', createdColumnName);
    const jobTypeQualified = qualifyColumn('jobs', jobTypeColumnName);
    const isRemoteExpr = qualifyColumn('jobs', isRemoteColumnName);
    const locationTypeExpr = qualifyColumn('jobs', locationTypeColumnName);
    const experienceExpr = `COALESCE(${qualifyColumn('jobs', experienceColumnName)}, '')`;
    const applyUrlExpr = `COALESCE(${qualifyColumn('jobs', applyUrlColumnName)}, '')`;
    const jobIdExpr = `${qualifyColumn('jobs', 'id')}::text`;
    const categoryExpr = categoryColumnName ? `COALESCE(${qualifyColumn('jobs', categoryColumnName)}, '')` : "''";
    const skillsExpr = skillsColumnName ? qualifyColumn('jobs', skillsColumnName) : 'NULL';
    const educationExpr = educationColumnName ? `COALESCE(${qualifyColumn('jobs', educationColumnName)}, '')` : "''";
    const notifySentExpr = notifySentColumnName ? qualifyColumn('jobs', notifySentColumnName) : null;
    const jobDescriptionColumnName = columns.jobDescriptionColumn;
    const descriptionExpr = jobDescriptionColumnName
      ? `COALESCE(${qualifyColumn('jobs', 'description')}, ${qualifyColumn('jobs', jobDescriptionColumnName)}, '')`
      : `COALESCE(${qualifyColumn('jobs', 'description')}, '')`;

    const aiCreatedColumns = [aiColumns.createdColumn, aiColumns.postedColumn]
      .filter(Boolean)
      .map((col) => qualifyColumn('accounts_jobdata', col));
    const aiCreatedExpr = aiCreatedColumns.length > 0 ? `COALESCE(${aiCreatedColumns.join(', ')})` : 'NULL';
    const aiJobTypeExpr = aiColumns.jobTypeColumn ? `COALESCE(${qualifyColumn('accounts_jobdata', aiColumns.jobTypeColumn)}, '')` : "''";
    const aiRemoteExpr = aiColumns.remoteColumn ? qualifyColumn('accounts_jobdata', aiColumns.remoteColumn) : 'NULL';
    const aiIdExpr = `${qualifyColumn('accounts_jobdata', 'id')}::text`;
    const aiLocationTypeExpr = aiColumns.locationTypeColumn ? `COALESCE(${qualifyColumn('accounts_jobdata', aiColumns.locationTypeColumn)}, '')` : "''";
    const aiExperienceExpr = aiColumns.experienceColumn ? `COALESCE(${qualifyColumn('accounts_jobdata', aiColumns.experienceColumn)}, '')` : "''";
    const aiApplyUrlExpr = aiColumns.applyUrlColumn ? `COALESCE(${qualifyColumn('accounts_jobdata', aiColumns.applyUrlColumn)}, '')` : "''";
    const aiCategoryExpr = aiColumns.categoryColumn ? `COALESCE(${qualifyColumn('accounts_jobdata', aiColumns.categoryColumn)}, '')` : "''";
    const aiSkillsExpr = aiColumns.skillsColumn ? qualifyColumn('accounts_jobdata', aiColumns.skillsColumn) : 'NULL';
    const aiEducationExpr = aiColumns.educationColumn ? `COALESCE(${qualifyColumn('accounts_jobdata', aiColumns.educationColumn)}, '')` : "''";
    const aiNotifySentAtExpr = aiColumns.notifySentAtColumn ? qualifyColumn('accounts_jobdata', aiColumns.notifySentAtColumn) : 'NULL';
    const aiNotifySentExpr = aiColumns.notifySentColumn ? qualifyColumn('accounts_jobdata', aiColumns.notifySentColumn) : null;
    const aiSlugExpr = aiColumns.slugColumn ? `COALESCE(${qualifyColumn('accounts_jobdata', aiColumns.slugColumn)}, '')` : "''";

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
      aiColumns.createdColumn ? qualifyColumn('accounts_jobdata', aiColumns.createdColumn) : aiColumns.postedColumn ? qualifyColumn('accounts_jobdata', aiColumns.postedColumn) : null;

    const aiConditions = [];
    if (aiNotifySentExpr) {
      aiConditions.push(`(${aiNotifySentExpr} = false OR ${aiNotifySentExpr} IS NULL)`);
    }
    if (hasCreatedAfter && aiCreatedFilterColumn) {
      replacements.createdAfteraccounts_jobdata = createdAfter;
      aiConditions.push(`${aiCreatedFilterColumn} >= :createdAfteraccounts_jobdata`);
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
            COALESCE(jobs.slug, '') AS slug,
            ${isRemoteExpr} AS is_remote,
            ${locationTypeExpr} AS location_type,
            ${createdColumnQualified} AS created_at,
            NULL AS notify_sent,
            NULL AS notify_sent_at,
            ${jobTypeQualified} AS job_type,
            ${experienceExpr} AS experience,
            ${applyUrlExpr} AS apply_url,
            ${categoryExpr} AS category,
            ${skillsExpr} AS skills,
            ${educationExpr} AS education_required,
            ${descriptionExpr} AS description
          FROM ${qualifyTableName('jobs')} AS jobs
          ${jobWhereClause}

          UNION ALL

          SELECT
            'accounts_jobdata' AS source,
            ${aiIdExpr} AS id,
            accounts_jobdata.title AS title,
            accounts_jobdata.company AS company_name,
            accounts_jobdata.location AS location,
            ${aiSlugExpr} AS slug,
            ${aiRemoteExpr} AS is_remote,
            ${aiLocationTypeExpr} AS location_type,
            ${aiCreatedExpr} AS created_at,
            NULL AS notify_sent,
            ${aiNotifySentAtExpr} AS notify_sent_at,
            ${aiJobTypeExpr} AS job_type,
            ${aiExperienceExpr} AS experience,
            ${aiApplyUrlExpr} AS apply_url,
            ${aiCategoryExpr} AS category,
            ${aiSkillsExpr} AS skills,
            ${aiEducationExpr} AS education_required,
            COALESCE(accounts_jobdata.description, '') AS description
          FROM ${qualifyTableName('accounts_jobdata')} AS accounts_jobdata
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
      const jobData = {
        source: row.source,
        id: row.id,
        title: row.title,
        company: row.company_name,
        location: row.location,
        slug: row.slug || null,
      };
      const jobUrl = buildDefaultApplyUrl(row.source, row.id, jobData);
      return {
        source: row.source,
        id: row.id,
        title: row.title,
        companyName: row.company_name,
        company: row.company_name,
        location: row.location,
        slug: row.slug || null,
        isRemote: normalizeRemote(row.is_remote),
        locationType: row.location_type,
        createdAt: row.created_at ? new Date(row.created_at) : null,
        notifySent: row.notify_sent,
        notifySentAt: row.notify_sent_at ? new Date(row.notify_sent_at) : null,
        jobType: row.job_type,
        experience: row.experience,
        applyUrl: row.apply_url || jobUrl,
        ctaUrl: jobUrl,
        category: row.category || null,
        skills,
        educationRequired: row.education_required || null,
        description: row.description || null,
      };
    });
  }

  async function countPendingJobs({ createdAfter } = {}) {
    await ensureNotificationColumns(sequelize);
    const columns = await resolveJobColumnInfo(sequelize);
    const aiColumns = await resolveAccountsJobColumnInfo(sequelize);

    const jobCreatedColumnName = columns.createdColumn || 'createdAt';
    const jobCreatedColumn = qualifyColumn('jobs', jobCreatedColumnName);

    const aiDateColumns = [aiColumns.createdColumn, aiColumns.postedColumn]
      .filter(Boolean)
      .map((column) => qualifyColumn('accounts_jobdata', column));
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
    const aiNotifySentColumn = aiNotifySentColumnName ? qualifyColumn('accounts_jobdata', aiNotifySentColumnName) : null;

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
        replacements.createdAfteraccounts_jobdata = createdAfter;
        aiConditions.push(`${aiDateExpression} >= :createdAfteraccounts_jobdata`);
      }
    }

    const jobsWhere = jobConditions.length > 0 ? `WHERE ${jobConditions.join(' AND ')}` : '';
    const aiWhere = aiConditions.length > 0 ? `WHERE ${aiConditions.join(' AND ')}` : '';

    const [jobsCountRows, accounts_jobdataCountRows] = await Promise.all([
      sequelize.query(`SELECT COUNT(*) AS total FROM ${qualifyTableName('jobs')} AS jobs ${jobsWhere}`, {
        replacements,
        type: QueryTypes.SELECT,
      }),
      aiDateExpression
        ? sequelize.query(`SELECT COUNT(*) AS total FROM ${qualifyTableName('accounts_jobdata')} AS accounts_jobdata ${aiWhere}`, {
            replacements,
            type: QueryTypes.SELECT,
          })
        : Promise.resolve([{ total: 0 }]),
    ]);

    const jobsCount = Array.isArray(jobsCountRows) && jobsCountRows.length > 0 ? Number(jobsCountRows[0].total || 0) : 0;
    const accounts_jobdataCount =
      Array.isArray(accounts_jobdataCountRows) && accounts_jobdataCountRows.length > 0 ? Number(accounts_jobdataCountRows[0].total || 0) : 0;
    return jobsCount + accounts_jobdataCount;
  }

  async function markJobsNotified(_jobIdsBySource) {
    return { jobs: 0, accounts_jobdata: 0 };
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

function toSlugSegment(input) {
  if (!input) return '';
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove punctuation
    .trim()
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-'); // collapse hyphens
}

function buildJobSlug(params) {
  const titlePart = toSlugSegment(params.title);
  const companyPart = toSlugSegment(params.company);
  const locationRaw = params.location?.toString().trim();
  const locationPart = locationRaw ? toSlugSegment(locationRaw.split(',')[0] || '') : '';
  
  const parts = [titlePart];
  if (locationPart) parts.push(locationPart);
  parts.push('at', companyPart, String(params.id).toLowerCase());
  
  return parts.filter(Boolean).join('-');
}

function buildDefaultApplyUrl(source, id, jobData = null) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  // If we have job data with a slug, use it
  if (jobData && jobData.slug) {
    return `${frontendUrl}/jobs/${jobData.slug}`;
  }
  
  // If we have job data without slug, build it from title, company, location, id
  if (jobData && jobData.title && jobData.company) {
    const slug = buildJobSlug({
      title: jobData.title,
      company: jobData.company,
      location: jobData.location || null,
      id: id,
    });
    return `${frontendUrl}/jobs/${slug}`;
  }
  
  // Fallback: use ID only (for backward compatibility)
  return `${frontendUrl}/jobs/${id}`;
}

module.exports = {
  createJobsRepository,
  normalizeRemote,
  buildDefaultApplyUrl,
};


