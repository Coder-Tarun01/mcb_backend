const path = require('path');
const { QueryTypes } = require('sequelize');

let cachedModels;
let cachedJobColumnInfo;
let subscriberTableReady;
let cachedQuoteHelpers;

function loadModels() {
  if (cachedModels) {
    return cachedModels;
  }

  const baseDir = path.resolve(__dirname, '../../');
  const distModelsPath = path.join(baseDir, 'dist', 'models');
  const srcModelsPath = path.join(baseDir, 'src', 'models');

  try {
    // Prefer compiled dist models if available (production/start script)
    cachedModels = require(distModelsPath);
    return cachedModels;
  } catch (distErr) {
    // Fallback to TypeScript source during development
    try {
      require('ts-node/register');
    } catch (tsNodeErr) {
      const error = new Error(
        `Unable to load Sequelize models. Ensure the backend has been built (dist directory) ` +
          `or install ts-node for development.
Dist error: ${distErr.message}
ts-node error: ${tsNodeErr.message}`
      );
      error.cause = { distErr, tsNodeErr };
      throw error;
    }

    cachedModels = require(srcModelsPath);
    return cachedModels;
  }
}

function getSequelize() {
  const models = loadModels();
  if (!models.sequelize) {
    throw new Error('Sequelize instance not found on loaded models module');
  }
  return models.sequelize;
}

function getQuoteHelpers() {
  if (cachedQuoteHelpers) {
    return cachedQuoteHelpers;
  }

  const sequelize = getSequelize();
  const queryGenerator = sequelize.getQueryInterface().queryGenerator;
  const quoteIdentifier = (identifier) => {
    if (!identifier) {
      return identifier;
    }
    if (identifier.includes('.')) {
      return identifier
        .split('.')
        .map((part) => quoteIdentifier(part))
        .join('.');
    }
    const trimmed = String(identifier).replace(/^["`]|["`]$/g, '');
    return queryGenerator.quoteIdentifier(trimmed);
  };

  cachedQuoteHelpers = {
    quoteIdentifier,
    quoteTable: (tableName) => queryGenerator.quoteTable(tableName),
  };

  return cachedQuoteHelpers;
}

function quoteIfNeeded(identifier) {
  const { quoteIdentifier } = getQuoteHelpers();
  return quoteIdentifier(identifier);
}

async function inspectJobColumns() {
  if (cachedJobColumnInfo) {
    return cachedJobColumnInfo;
  }

  const sequelize = getSequelize();
  const dialect = sequelize.getDialect();
  const quoteIdentifier =
    typeof sequelize.getQueryInterface().quoteIdentifier === 'function'
      ? (identifier) => sequelize.getQueryInterface().quoteIdentifier(identifier)
      : (identifier) =>
          dialect === 'postgres'
            ? `"${String(identifier).replace(/"/g, '""')}"`
            : `\`${String(identifier).replace(/`/g, '``')}\``;

  try {
    const describe = await sequelize.getQueryInterface().describeTable('jobs');
    const columnEntries = Object.keys(describe || {}).map((name) => ({
      raw: String(name),
      lower: String(name).toLowerCase(),
    }));

    const findColumn = (...candidates) => {
      for (const candidate of candidates) {
        const match = columnEntries.find((entry) => entry.lower === String(candidate).toLowerCase());
        if (match) {
          return match.raw;
        }
      }
      return null;
    };

    cachedJobColumnInfo = {
      experienceColumn: findColumn('experienceLevel', 'experience'),
      jobTypeColumn: findColumn('type', 'job_type'),
      linkColumn: findColumn('applyUrl', 'link'),
      createdColumn: findColumn('createdAt', 'created_at'),
      quoteIdentifier,
      dialect,
    };
  } catch (error) {
    cachedJobColumnInfo = {
      experienceColumn: null,
      jobTypeColumn: null,
      linkColumn: null,
      createdColumn: null,
      quoteIdentifier,
      dialect,
    };
  }

  return cachedJobColumnInfo;
}

async function getNewFresherJobs(limit = 5) {
  const sequelize = getSequelize();
  const dialect = sequelize.getDialect();
  const columnInfo = await inspectJobColumns();
<<<<<<< HEAD
  const { quoteIdentifier, quoteTable } = getQuoteHelpers();

  const experienceSelect = columnInfo.experienceColumn
    ? `COALESCE(${quoteIfNeeded(columnInfo.experienceColumn)}, '') AS experience`
    : "'Not provided' AS experience";
  const jobTypeColumn = columnInfo.jobTypeColumn || 'type';
  const jobTypeSelect = `${quoteIfNeeded(jobTypeColumn)} AS jobType`;
  const linkSelect = columnInfo.linkColumn
    ? `COALESCE(${quoteIfNeeded(columnInfo.linkColumn)}, '') AS link`
    : "'' AS link";
  const createdColumn = columnInfo.createdColumn || 'createdAt';
  const createdSelect = `${quoteIfNeeded(createdColumn)} AS createdAt`;

  const notifySentColumn = quoteIdentifier('notify_sent');
  const notifySentFalse = dialect === 'postgres' ? 'FALSE' : '0';

  const jobs = await sequelize.query(
    `SELECT id, title, company, location, ${experienceSelect}, ${jobTypeSelect}, ${linkSelect}, ${quoteIdentifier('notify_sent')} AS notifySent, ${createdSelect}
     FROM ${quoteTable('jobs')}
     WHERE ${quoteIfNeeded(jobTypeColumn)} = 'Fresher' AND ${notifySentColumn} = ${notifySentFalse}
     ORDER BY ${quoteIfNeeded(createdColumn)} DESC
=======
  const quoteIdentifier = columnInfo.quoteIdentifier;
  const dialect = columnInfo.dialect;

  const quote = (identifier) => quoteIdentifier(identifier);
  const tableJobs = quote('jobs');
  const notifyColumn = quote('notify_sent');
  const jobTypeColumn = quote(columnInfo.jobTypeColumn || 'type');
  const createdColumn = quote(columnInfo.createdColumn || 'createdAt');

  const experienceSelect = columnInfo.experienceColumn
    ? `COALESCE(${quote(columnInfo.experienceColumn)}, '') AS experience`
    : "'Not provided' AS experience";
  const jobTypeSelect = `${jobTypeColumn} AS jobType`;
  const linkSelect = columnInfo.linkColumn ? `COALESCE(${quote(columnInfo.linkColumn)}, '') AS link` : "'' AS link";
  const createdSelect = `${createdColumn} AS createdAt`;
  const falseLiteral = dialect === 'postgres' ? 'FALSE' : '0';

  const jobs = await sequelize.query(
    `SELECT id, title, company, location, ${experienceSelect}, ${jobTypeSelect}, ${linkSelect}, ${notifyColumn} AS notifySent, ${createdSelect}
     FROM ${tableJobs}
     WHERE ${jobTypeColumn} = 'Fresher' AND ${notifyColumn} = ${falseLiteral}
     ORDER BY ${createdColumn} DESC
>>>>>>> ed875dd4ab4252a5050f15e4516a68a8721a4d09
     LIMIT :limit`,
    {
      replacements: { limit },
      type: QueryTypes.SELECT,
    }
  );

  return jobs;
}

async function getSubscribedUsers() {
  const sequelize = getSequelize();
  await ensureSubscriberSupport();
  const users = await sequelize.query(
    `SELECT u.id, COALESCE(NULLIF(u.name, ''), NULLIF(s.name, ''), 'Subscriber') AS name, s.email
     FROM fresher_notification_subscribers s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.email IS NOT NULL AND s.email <> ''`,
    { type: QueryTypes.SELECT }
  );
  return users;
}

async function markJobsNotified(jobIds, transaction) {
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return 0;
  }

  const sequelize = getSequelize();
  const columnInfo = await inspectJobColumns();
  const quoteIdentifier = columnInfo.quoteIdentifier;
  const dialect = columnInfo.dialect;
  const tableJobs = quoteIdentifier('jobs');
  const notifyColumn = quoteIdentifier('notify_sent');
  const idColumn = quoteIdentifier('id');
  const trueLiteral = dialect === 'postgres' ? 'TRUE' : '1';

  const [result] = await sequelize.query(
    `UPDATE ${tableJobs}
     SET ${notifyColumn} = ${trueLiteral}
     WHERE ${idColumn} IN (:jobIds)`,
    {
      replacements: { jobIds },
      type: QueryTypes.BULKUPDATE,
      transaction,
    }
  );

  return typeof result === 'number' ? result : 0;
}

async function ensureSubscriberSupport() {
  if (subscriberTableReady) {
    return subscriberTableReady;
  }

  const sequelize = getSequelize();
  const statements = [
    `CREATE TABLE IF NOT EXISTS fresher_notification_subscribers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id CHAR(36) DEFAULT NULL,
      email VARCHAR(191) NOT NULL,
      name VARCHAR(191) DEFAULT NULL,
      full_name VARCHAR(191) DEFAULT NULL,
      mobile_no VARCHAR(32) DEFAULT NULL,
      branch VARCHAR(191) DEFAULT NULL,
      experience VARCHAR(191) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_fresher_subscribers_user (user_id),
      UNIQUE KEY uq_fresher_subscribers_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    'ALTER TABLE fresher_notification_subscribers MODIFY COLUMN user_id CHAR(36) NULL',
    'ALTER TABLE fresher_notification_subscribers ADD COLUMN IF NOT EXISTS full_name VARCHAR(191) DEFAULT NULL',
    'ALTER TABLE fresher_notification_subscribers ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(32) DEFAULT NULL',
    'ALTER TABLE fresher_notification_subscribers ADD COLUMN IF NOT EXISTS branch VARCHAR(191) DEFAULT NULL',
    'ALTER TABLE fresher_notification_subscribers ADD COLUMN IF NOT EXISTS experience VARCHAR(191) DEFAULT NULL',
  ];

  for (const statement of statements) {
    try {
      await sequelize.query(statement);
    } catch (error) {
      // Ignore errors from databases that do not support IF NOT EXISTS (e.g., MySQL < 8)
      // or when column already exists.
    }
  }

  subscriberTableReady = true;
  return subscriberTableReady;
}

module.exports = {
  getNewFresherJobs,
  getSubscribedUsers,
  markJobsNotified,
  getSequelize,
  ensureSubscriberSupport,
};

