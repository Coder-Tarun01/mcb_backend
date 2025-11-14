import { QueryTypes, Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import { sequelize } from '../models';

export interface FresherJobsOptions {
  includeNotified: boolean;
  limit: number;
}

export type FresherJobsResult = {
  jobs: any[];
  stats: {
    total: number;
    pending: number;
    notified: number;
  };
};

function resolveSequelizeInstance(): Sequelize {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jobFetcher = require('../../notifications/email/jobFetcher');
    if (jobFetcher && typeof jobFetcher.getSequelize === 'function') {
      return jobFetcher.getSequelize();
    }
  } catch (err) {
    // ignore, fallback to primary instance
  }
  return sequelize;
}

export async function getFresherJobs({ includeNotified, limit }: FresherJobsOptions): Promise<FresherJobsResult> {
  const sequelizeInstance = resolveSequelizeInstance();
  const dialect = sequelizeInstance.getDialect();
  const queryInterface = sequelizeInstance.getQueryInterface();
  const quoteIdentifier = (identifier: string): string => queryInterface.quoteIdentifier(identifier);
  const alias = (expression: string, name: string): string => `${expression} AS ${quoteIdentifier(name)}`;
  const falseLiteral = dialect === 'postgres' ? 'FALSE' : '0';

  const replacements: Record<string, unknown> = {};
  const selectColumns = [
    'id',
    'title',
    'company',
    'location',
    alias(`COALESCE(${quoteIdentifier('experienceLevel')}, '')`, 'experience'),
    alias(quoteIdentifier('type'), 'jobType'),
    alias(`COALESCE(${quoteIdentifier('applyUrl')}, '')`, 'link'),
    alias(quoteIdentifier('notify_sent'), 'notifySent'),
    alias(quoteIdentifier('createdAt'), 'createdAt'),
  ].join(', ');
  let query = `SELECT ${selectColumns} FROM jobs WHERE ${quoteIdentifier('type')} = 'Fresher'`;

  if (!includeNotified) {
    query += ` AND ${quoteIdentifier('notify_sent')} = ${falseLiteral}`;
  }

  query += ` ORDER BY ${quoteIdentifier('createdAt')} DESC`;

  if (limit > 0) {
    query += ' LIMIT :limit';
    replacements.limit = limit;
  }

  const jobs = await sequelizeInstance.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  });

  const statsQuery =
    `SELECT COUNT(*) AS ${quoteIdentifier('total')}, ` +
    `SUM(CASE WHEN ${quoteIdentifier('notify_sent')} = ${falseLiteral} THEN 1 ELSE 0 END) AS ${quoteIdentifier('pending')} ` +
    `FROM jobs WHERE ${quoteIdentifier('type')} = 'Fresher'`;

  const statsRows = (await sequelizeInstance.query(statsQuery, {
    type: QueryTypes.SELECT,
  })) as Array<{ total: number; pending: number | null }>;

  const statsRow = statsRows[0] || { total: 0, pending: 0 };
  const pending = Number(statsRow.pending ?? 0);
  const total = Number(statsRow.total ?? 0);

  return {
    jobs,
    stats: {
      total,
      pending,
      notified: Math.max(total - pending, 0),
    },
  };
}

export async function readNotificationLogs(limit: number) {
  const LOG_DIRECTORY = path.resolve(__dirname, '../../notifications/logs');
  const SUCCESS_LOG = path.join(LOG_DIRECTORY, 'success.log');
  const FAILED_LOG = path.join(LOG_DIRECTORY, 'failed.log');

  const parseLines = (lines: string[]) => {
    return lines.map((line) => {
      const match = line.match(/^\[(.+?)\]\s+(\w+)(?:\s*\|\s*(.*))?$/);
      if (!match) {
        return {
          timestamp: null,
          status: 'UNKNOWN',
          raw: line,
        };
      }

      const [, timestamp, status, metaString] = match;
      let meta: Record<string, unknown> | string | undefined;
      if (metaString) {
        const trimmedMeta = metaString.trim();
        try {
          meta = JSON.parse(trimmedMeta);
        } catch (err) {
          meta = trimmedMeta;
        }
      }

      return {
        timestamp: timestamp ?? null,
        status: status ?? 'UNKNOWN',
        meta,
        raw: line,
      };
    });
  };

  const readLog = async (filePath: string) => {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const lines = raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const limitedLines = limit > 0 ? lines.slice(-limit) : lines;
      return parseLines(limitedLines);
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  };

  const [success, failed] = await Promise.all([readLog(SUCCESS_LOG), readLog(FAILED_LOG)]);
  return { success, failed };
}
