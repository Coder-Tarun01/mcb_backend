import { Router, type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { QueryTypes } from 'sequelize';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  markAsRead,
  updateNotification,
  deleteNotification,
  createNotification
} from '../controllers/notifications.controller';
import { sequelize } from '../models';

const jobFetcher = require('../../notifications/email/jobFetcher') as any;
const emailNotifications = require('../../notifications/email');
const marketingNotifications = require('../../notifications/marketing');
const marketingController = marketingNotifications?.createTriggerController
  ? marketingNotifications.createTriggerController()
  : null;

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max upload size
  },
});

const LOG_DIRECTORY = path.resolve(__dirname, '../../notifications/logs');
const SUCCESS_LOG = path.join(LOG_DIRECTORY, 'success.log');
const FAILED_LOG = path.join(LOG_DIRECTORY, 'failed.log');
const ADMIN_KEY = process.env.ADMIN_KEY?.trim();
const MARKETING_ADMIN_KEY = process.env.MARKETING_ADMIN_TOKEN?.trim();
const ADMIN_HEADER = 'x-admin-key';
const MARKETING_CONTACTS_DEFAULT_PAGE_SIZE = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

interface CsvUserRow {
  name: string;
  email: string;
  mobile?: string;
  branch?: string;
  experience?: string;
  telegramChatId?: string | null;
}

interface UploadSummary {
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; email?: string; message: string }>;
}

interface LogEntry {
  timestamp: string | null;
  status: string;
  meta?: Record<string, unknown> | string;
  raw: string;
}

interface MarketingContactPayload {
  fullName: string;
  email: string;
  mobileNo: string | null;
  branch: string | null;
  experience: string | null;
  telegramChatId: string | null;
}

interface MarketingContactResponse {
  id: number;
  fullName: string;
  email: string;
  mobileNo: string | null;
  branch: string | null;
  experience: string | null;
  telegramChatId: string | null;
  createdAt: string;
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeCsvRow(row: Record<string, unknown>, index: number): CsvUserRow {
  const normalizedEntries = Object.entries(row).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalizedKey = key.trim().toLowerCase();
    const normalizedValue = value === undefined || value === null ? '' : String(value).trim();
    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});

  const emailValue =
    normalizedEntries.email ||
    normalizedEntries['email id'] ||
    normalizedEntries['e-mail'] ||
    normalizedEntries['mail'] ||
    '';

  const nameValue =
    normalizedEntries.name ||
    normalizedEntries['full name'] ||
    normalizedEntries['full_name'] ||
    normalizedEntries['first name'] ||
    normalizedEntries['contact name'] ||
    `Subscriber ${index + 1}`;

  const mobileValue =
    normalizedEntries.mobile ||
    normalizedEntries['mobile no'] ||
    normalizedEntries['mobile_no'] ||
    normalizedEntries['mobile number'] ||
    normalizedEntries['phone'] ||
    normalizedEntries['phone number'] ||
    normalizedEntries['contact'] ||
    '';

  const branchValue =
    normalizedEntries.branch ||
    normalizedEntries['branch name'] ||
    normalizedEntries['branch_name'] ||
    normalizedEntries['department'] ||
    '';

  const experienceValue =
    normalizedEntries.experience ||
    normalizedEntries['experience level'] ||
    normalizedEntries['experience_level'] ||
    normalizedEntries['experience level'] ||
    normalizedEntries['exp'] ||
    '';

  const telegramChatIdValue =
    normalizedEntries.telegram ||
    normalizedEntries['telegram chat id'] ||
    normalizedEntries['telegram_chat_id'] ||
    normalizedEntries['telegram id'] ||
    normalizedEntries['telegram_chatid'] ||
    '';

  return {
    name: nameValue.trim(),
    email: emailValue.trim(),
    mobile: mobileValue.trim(),
    branch: branchValue.trim(),
    experience: experienceValue.trim(),
    telegramChatId: telegramChatIdValue.trim(),
  };
}

async function readLogFile(filePath: string, limit: number): Promise<LogEntry[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const limitedLines = limit > 0 ? lines.slice(-limit) : lines;

    return limitedLines.map((line) => {
      const match = line.match(/^\[(.+?)\]\s+(\w+)(?:\s*\|\s*(.*))?$/);
      if (!match) {
        return {
          timestamp: null,
          status: 'UNKNOWN',
          raw: line,
        };
      }

      const [, timestamp, status, metaString] = match;
      let meta: LogEntry['meta'];
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
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function ensureLogDirectory(): Promise<void> {
  await fs.mkdir(LOG_DIRECTORY, { recursive: true });
}

function extractAdminKey(req: Request): string | undefined {
  const headerValue = req.headers[ADMIN_HEADER] || req.headers[ADMIN_HEADER.toUpperCase()];
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  const queryValueRaw = (req.query as Record<string, unknown>).adminKey ?? (req.query as Record<string, unknown>).adminkey;
  const queryCandidate = Array.isArray(queryValueRaw) ? queryValueRaw[0] : queryValueRaw;
  if (typeof queryCandidate === 'string' && queryCandidate.trim().length > 0) {
    return queryCandidate.trim();
  }

  if (typeof req.body === 'object' && req.body !== null) {
    const bodyValue = (req.body as Record<string, unknown>).adminKey;
    if (typeof bodyValue === 'string' && bodyValue.trim().length > 0) {
      return bodyValue.trim();
    }
  }

  return undefined;
}

function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const availableKeys = [ADMIN_KEY, MARKETING_ADMIN_KEY].filter((value): value is string => Boolean(value && value.length > 0));

  if (availableKeys.length === 0) {
    res.status(500).json({ success: false, error: 'Admin key not configured on server' });
    return;
  }

  const provided = extractAdminKey(req);
  if (provided && availableKeys.some((key) => key === provided)) {
    next();
    return;
  }

  res.status(401).json({ success: false, error: 'Invalid or missing admin key' });
}

router.get('/jobs/freshers', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const includeNotified = parseBoolean(req.query.includeNotified ?? req.query.include_notified, false);
    const limitParam = req.query.limit;
    let limit = 0;
    if (typeof limitParam === 'string') {
      const parsed = Number.parseInt(limitParam, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        limit = Math.min(parsed, 500);
      }
    }

    const sequelizeInstance =
      jobFetcher && typeof jobFetcher.getSequelize === 'function' ? jobFetcher.getSequelize() : sequelize;

    const replacements: Record<string, unknown> = {};
    let query =
      "SELECT id, title, company, location, " +
      "COALESCE(experienceLevel, '') AS experience, " +
      "type AS jobType, COALESCE(applyUrl, '') AS link, notify_sent AS notifySent, createdAt AS createdAt " +
      "FROM jobs WHERE type = 'Fresher'";

    if (!includeNotified) {
      query += ' AND notify_sent = 0';
    }

    query += ' ORDER BY createdAt DESC';

    if (limit > 0) {
      query += ' LIMIT :limit';
      replacements.limit = limit;
    }

    const jobs = await sequelizeInstance.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const statsRows = (await sequelizeInstance.query(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN notify_sent = 0 THEN 1 ELSE 0 END) AS pending " +
        "FROM jobs WHERE type = 'Fresher'",
      {
        type: QueryTypes.SELECT,
      }
    )) as Array<{ total: number; pending: number | null }>;

    const statsRow = statsRows[0] || { total: 0, pending: 0 };
    const pending = Number(statsRow.pending ?? 0);
    const total = Number(statsRow.total ?? 0);
    const stats = {
      total,
      pending,
      notified: Math.max(total - pending, 0),
    };

    res.json({
      success: true,
      message: 'Fresher jobs retrieved',
      data: {
        jobs,
        stats,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch fresher jobs', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch fresher jobs',
    });
  }
});

router.post(
  '/upload-csv',
  requireAdminKey,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'CSV file is required' });
        return;
      }

      const csvContent = req.file.buffer.toString('utf8');
      let records: Record<string, unknown>[];

      try {
        records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (parseError) {
        console.error('Failed to parse CSV', parseError);
        res.status(400).json({ success: false, error: 'Unable to parse CSV file. Please check the format.' });
        return;
      }

      if (!Array.isArray(records) || records.length === 0) {
        res.status(400).json({ success: false, error: 'CSV file does not contain any rows.' });
        return;
      }

      const normalizedRows = records.map((row, index) => normalizeCsvRow(row, index));
      const summary: UploadSummary = {
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      await sequelize.transaction(async (transaction) => {
        for (const [index, row] of normalizedRows.entries()) {
          summary.processed += 1;

          const email = row.email.trim().toLowerCase();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            summary.skipped += 1;
            summary.errors.push({ row: index + 1, email: row.email, message: 'Invalid email address' });
            continue;
          }

          const name = row.name.trim() || email.split('@')[0];
          const mobile = row.mobile?.trim() || null;
          const branch = row.branch?.trim() || null;
          const experience = row.experience?.trim() || null;
          const telegramChatId = row.telegramChatId?.trim() || null;

          try {
            const existingContactRows = await sequelize.query(
              `SELECT id, full_name, mobile_no, branch, experience, telegram_chat_id
               FROM marketing_contacts
               WHERE email = :email
               LIMIT 1`,
              {
                replacements: { email },
                type: QueryTypes.SELECT,
                transaction,
              }
            );

            if (existingContactRows.length > 0) {
              const existingContact = existingContactRows[0] as {
                id: number;
                full_name?: string | null;
                mobile_no?: string | null;
                branch?: string | null;
                experience?: string | null;
                telegram_chat_id?: string | null;
              };

              const shouldUpdate =
                (existingContact.full_name || '') !== name ||
                (existingContact.mobile_no || '') !== (mobile || '') ||
                (existingContact.branch || '') !== (branch || '') ||
                (existingContact.experience || '') !== (experience || '') ||
                (existingContact.telegram_chat_id || '') !== (telegramChatId || '');

              if (shouldUpdate) {
                await sequelize.query(
                  `UPDATE marketing_contacts
                   SET full_name = :fullName,
                       mobile_no = :mobileNo,
                       branch = :branch,
                       experience = :experience,
                       telegram_chat_id = :telegramChatId
                   WHERE id = :id`,
                  {
                    replacements: {
                      id: existingContact.id,
                      fullName: name,
                      mobileNo: mobile,
                      branch,
                      experience,
                      telegramChatId,
                    },
                    type: QueryTypes.UPDATE,
                    transaction,
                  }
                );
                summary.updated += 1;
              } else {
                summary.skipped += 1;
              }
              continue;
            }

            await sequelize.query(
              `INSERT INTO marketing_contacts (full_name, email, mobile_no, branch, experience, telegram_chat_id, created_at)
               VALUES (:fullName, :email, :mobileNo, :branch, :experience, :telegramChatId, NOW())`,
              {
                replacements: {
                  fullName: name,
                  email,
                  mobileNo: mobile,
                  branch,
                  experience,
                  telegramChatId,
                },
                type: QueryTypes.INSERT,
                transaction,
              }
            );
            summary.inserted += 1;
          } catch (loopError: any) {
            console.error('Failed to process CSV row', loopError);
            summary.skipped += 1;
            summary.errors.push({ row: index + 1, email, message: loopError?.message || 'Unexpected error' });
          }
        }
      });

      res.json({
        success: true,
        message: 'Subscriber list processed successfully',
        data: summary,
      });
    } catch (error: any) {
      console.error('Failed to upload subscriber CSV', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to process CSV upload',
      });
    }
  }
);

router.get('/send-mails', requireAdminKey, async (_req: Request, res: Response) => {
  try {
    const summary = await emailNotifications.triggerFresherJobEmailRun({ source: 'manual-api' });
    res.json({
      success: true,
      message: 'Fresher job notification emails triggered',
      data: summary,
    });
  } catch (error: any) {
    console.error('Failed to trigger fresher job notifications', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to trigger fresher job notifications',
      data: error?.summary,
    });
  }
});

router.get('/logs', requireAdminKey, async (req: Request, res: Response) => {
  try {
    await ensureLogDirectory();

    const limitParam = req.query.limit;
    let limit = 50;
    if (typeof limitParam === 'string') {
      const parsed = Number.parseInt(limitParam, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        limit = Math.min(parsed, 500);
      }
    }

    const [successLogs, failedLogs] = await Promise.all([
      readLogFile(SUCCESS_LOG, limit),
      readLogFile(FAILED_LOG, limit),
    ]);

    res.json({
      success: true,
      message: 'Notification logs retrieved',
      data: {
        success: successLogs,
        failed: failedLogs,
      },
    });
  } catch (error: any) {
    console.error('Failed to load notification logs', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to load notification logs',
    });
  }
});

router.get('/marketing/health', async (req: Request, res: Response) => {
  if (!marketingController || typeof marketingController.health !== 'function') {
    res.status(501).json({ success: false, error: 'Marketing notifications are not configured' });
    return;
  }

  await marketingController.health(req, res);
});

router.post('/marketing/trigger', requireAdminKey, async (req: Request, res: Response) => {
  if (!marketingController || typeof marketingController.trigger !== 'function') {
    res.status(501).json({ success: false, error: 'Marketing notifications are not configured' });
    return;
  }

  await marketingController.trigger(req, res);
});

router.get('/marketing/contacts', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const pageParam = Number.parseInt(String(req.query.page ?? '1'), 10);
    const targetPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const pageSizeParam = Number.parseInt(String(req.query.pageSize ?? MARKETING_CONTACTS_DEFAULT_PAGE_SIZE), 10);
    const pageSize = Math.max(1, Math.min(Number.isFinite(pageSizeParam) ? pageSizeParam : MARKETING_CONTACTS_DEFAULT_PAGE_SIZE, 100));

    const searchRaw = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const searchValue = searchRaw.length > 0 ? `%${searchRaw.toLowerCase()}%` : null;

    const sortByParam = typeof req.query.sortBy === 'string' ? req.query.sortBy.toLowerCase() : 'created_at';
    const sortDirectionParam = typeof req.query.sortDirection === 'string' ? req.query.sortDirection.toUpperCase() : 'DESC';
    const allowedSortColumns: Record<string, string> = {
      created_at: 'created_at',
      full_name: 'full_name',
      email: 'email',
    };
    const sortColumn = allowedSortColumns[sortByParam] || 'created_at';
    const sortDirection = sortDirectionParam === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = searchValue
      ? 'WHERE LOWER(full_name) LIKE :search OR LOWER(email) LIKE :search OR LOWER(branch) LIKE :search OR LOWER(experience) LIKE :search'
      : '';

    const replacements: Record<string, unknown> = {
      limit: pageSize,
      offset: (targetPage - 1) * pageSize,
    };
    if (searchValue) {
      replacements.search = searchValue;
    }

    const contactRowsPromise = sequelize.query(
      `SELECT id, full_name, email, mobile_no, branch, experience, telegram_chat_id, created_at
       FROM marketing_contacts
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const countRowsPromise = sequelize.query(
      `SELECT COUNT(*) AS total FROM marketing_contacts ${whereClause}`,
      {
        replacements: searchValue ? { search: searchValue } : undefined,
        type: QueryTypes.SELECT,
      }
    );

    const [contactRows, countRows] = await Promise.all([contactRowsPromise, countRowsPromise]);

    const total = Number((countRows[0] as any)?.total ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    res.json({
      success: true,
      data: {
        contacts: contactRows.map(mapMarketingContactRow),
        pagination: {
          page: targetPage,
          pageSize,
          total,
          totalPages,
          hasNextPage: totalPages > 0 && targetPage < totalPages,
          hasPrevPage: targetPage > 1,
        },
      },
    });
  } catch (error) {
    console.error('Failed to load marketing contacts', error);
    res.status(500).json({ success: false, error: 'Failed to load marketing contacts' });
  }
});

router.post('/marketing/contacts', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const payload = normalizeMarketingContactPayload(req.body);

    if (!payload.fullName) {
      res.status(400).json({ success: false, error: 'Full name is required' });
      return;
    }
    if (!payload.email || !EMAIL_REGEX.test(payload.email)) {
      res.status(400).json({ success: false, error: 'A valid email address is required' });
      return;
    }

    const existing = await sequelize.query(
      `SELECT id FROM marketing_contacts WHERE email = :email LIMIT 1`,
      {
        replacements: { email: payload.email },
        type: QueryTypes.SELECT,
      }
    );

    if (existing.length > 0) {
      res.status(409).json({ success: false, error: 'A marketing contact with this email already exists' });
      return;
    }

    const { fullName, email, mobileNo, branch, experience, telegramChatId } = payload;

    const [insertResult] = await sequelize.query(
      `INSERT INTO marketing_contacts (full_name, email, mobile_no, branch, experience, telegram_chat_id, created_at)
       VALUES (:fullName, :email, :mobileNo, :branch, :experience, :telegramChatId, NOW())`,
      {
        replacements: {
          fullName,
          email,
          mobileNo,
          branch,
          experience,
          telegramChatId,
        },
        type: QueryTypes.INSERT,
      }
    );

    const insertedId = (insertResult as any)?.insertId;
    let contact = await loadMarketingContactById(insertedId);

    if (!contact) {
      const fallbackRows = await sequelize.query(
        `SELECT id, full_name, email, mobile_no, branch, experience, telegram_chat_id, created_at
         FROM marketing_contacts
         WHERE email = :email
         ORDER BY id DESC
         LIMIT 1`,
        {
          replacements: { email: payload.email },
          type: QueryTypes.SELECT,
        }
      );
      if (fallbackRows.length > 0) {
        contact = mapMarketingContactRow(fallbackRows[0]);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Marketing contact created',
      data: contact,
    });
  } catch (error) {
    console.error('Failed to create marketing contact', error);
    res.status(500).json({ success: false, error: 'Failed to create marketing contact' });
  }
});

router.put('/marketing/contacts/:id', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      res.status(400).json({ success: false, error: 'Contact id is required' });
      return;
    }

    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, error: 'Invalid contact id' });
      return;
    }

    const existing = await loadMarketingContactById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Marketing contact not found' });
      return;
    }

    const payload = normalizeMarketingContactPayload(req.body);
    if (!payload.fullName) {
      res.status(400).json({ success: false, error: 'Full name is required' });
      return;
    }
    if (!payload.email || !EMAIL_REGEX.test(payload.email)) {
      res.status(400).json({ success: false, error: 'A valid email address is required' });
      return;
    }

    const duplicateEmail = await sequelize.query(
      `SELECT id FROM marketing_contacts WHERE email = :email AND id <> :id LIMIT 1`,
      {
        replacements: { email: payload.email, id },
        type: QueryTypes.SELECT,
      }
    );

    if (duplicateEmail.length > 0) {
      res.status(409).json({ success: false, error: 'Another marketing contact already uses this email' });
      return;
    }

    await sequelize.query(
      `UPDATE marketing_contacts
       SET full_name = :fullName,
           email = :email,
           mobile_no = :mobileNo,
           branch = :branch,
           experience = :experience,
           telegram_chat_id = :telegramChatId
       WHERE id = :id`,
      {
        replacements: {
          fullName: payload.fullName,
          email: payload.email,
          mobileNo: payload.mobileNo,
          branch: payload.branch,
          experience: payload.experience,
          telegramChatId: payload.telegramChatId,
          id,
        },
        type: QueryTypes.UPDATE,
      }
    );

    const updated = await loadMarketingContactById(id);
    res.json({
      success: true,
      message: 'Marketing contact updated',
      data: updated,
    });
  } catch (error) {
    console.error('Failed to update marketing contact', error);
    res.status(500).json({ success: false, error: 'Failed to update marketing contact' });
  }
});

router.delete('/marketing/contacts/:id', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      res.status(400).json({ success: false, error: 'Contact id is required' });
      return;
    }

    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, error: 'Invalid contact id' });
      return;
    }

    const existing = await loadMarketingContactById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Marketing contact not found' });
      return;
    }

    await sequelize.query(
      `DELETE FROM marketing_contacts WHERE id = :id`,
      {
        replacements: { id },
        type: QueryTypes.DELETE,
      }
    );

    res.json({
      success: true,
      message: 'Marketing contact deleted',
      data: { id },
    });
  } catch (error) {
    console.error('Failed to delete marketing contact', error);
    res.status(500).json({ success: false, error: 'Failed to delete marketing contact' });
  }
});

router.get('/subscribers', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const pageParam = Number.parseInt(String(req.query.page ?? '1'), 10);
    const targetPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const pageSizeParam = Number.parseInt(String(req.query.pageSize ?? MARKETING_CONTACTS_DEFAULT_PAGE_SIZE), 10);
    const pageSize = Math.max(1, Math.min(Number.isFinite(pageSizeParam) ? pageSizeParam : MARKETING_CONTACTS_DEFAULT_PAGE_SIZE, 100));

    const searchRaw = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const searchValue = searchRaw.length > 0 ? `%${searchRaw.toLowerCase()}%` : null;

    const replacements: Record<string, unknown> = {
      limit: pageSize,
      offset: (targetPage - 1) * pageSize,
    };

    const whereClause = searchValue
      ? `
        WHERE
          LOWER(s.email) LIKE :search OR
          LOWER(COALESCE(NULLIF(s.full_name, ''), '')) LIKE :search OR
          LOWER(COALESCE(NULLIF(s.branch, ''), '')) LIKE :search OR
          LOWER(COALESCE(NULLIF(s.experience, ''), '')) LIKE :search
      `
      : '';

    if (searchValue) {
      replacements.search = searchValue;
    }

    const subscribersPromise = sequelize.query(
      `SELECT
         s.id,
         s.email,
         COALESCE(NULLIF(s.full_name, ''), 'Subscriber') AS full_name,
         s.mobile_no,
         s.branch,
         s.experience,
         s.telegram_chat_id,
         s.created_at
       FROM marketing_contacts s
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const countPromise = sequelize.query(
      `SELECT COUNT(*) AS total FROM marketing_contacts s
       ${whereClause}`,
      {
        replacements: searchValue ? { search: searchValue } : undefined,
        type: QueryTypes.SELECT,
      }
    );

    const [subscriberRows, countRows] = await Promise.all([subscribersPromise, countPromise]);

    const total = Number((countRows[0] as any)?.total ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    res.json({
      success: true,
      data: {
        subscribers: subscriberRows.map(mapSubscriberRow),
        pagination: {
          page: targetPage,
          pageSize,
          total,
          totalPages,
          hasNextPage: totalPages > 0 && targetPage < totalPages,
          hasPrevPage: targetPage > 1,
        },
      },
    });
  } catch (error) {
    console.error('Failed to load fresher notification subscribers', error);
    res.status(500).json({ success: false, error: 'Failed to load fresher notification subscribers' });
  }
});

router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markAsRead);
router.put('/:id', authenticate, updateNotification);
router.delete('/:id', authenticate, deleteNotification);
router.post('/', createNotification); // For system notifications

export default router;

function normalizeMarketingContactPayload(body: any): MarketingContactPayload {
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const mobileNoRaw = typeof body?.mobileNo === 'string' ? body.mobileNo.trim() : '';
  const branchRaw = typeof body?.branch === 'string' ? body.branch.trim() : '';
  const experienceRaw = typeof body?.experience === 'string' ? body.experience.trim() : '';
  const telegramChatIdRawCandidate =
    typeof body?.telegramChatId === 'string'
      ? body.telegramChatId.trim()
      : typeof body?.telegram_chat_id === 'string'
      ? body.telegram_chat_id.trim()
      : '';

  return {
    fullName,
    email,
    mobileNo: mobileNoRaw.length > 0 ? mobileNoRaw : null,
    branch: branchRaw.length > 0 ? branchRaw : null,
    experience: experienceRaw.length > 0 ? experienceRaw : null,
    telegramChatId: telegramChatIdRawCandidate.length > 0 ? telegramChatIdRawCandidate : null,
  };
}

function mapMarketingContactRow(row: any): MarketingContactResponse {
  return {
    id: Number(row.id),
    fullName: row.full_name || row.name || '',
    email: row.email || '',
    mobileNo: row.mobile_no ?? null,
    branch: row.branch ?? null,
    experience: row.experience ?? null,
     telegramChatId: row.telegram_chat_id ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function loadMarketingContactById(id: number | null | undefined): Promise<MarketingContactResponse | null> {
  if (!id) {
    return null;
  }

  const rows = await sequelize.query(
    `SELECT id, full_name, email, mobile_no, branch, experience, telegram_chat_id, created_at
     FROM marketing_contacts
     WHERE id = :id
     LIMIT 1`,
    {
      replacements: { id },
      type: QueryTypes.SELECT,
    }
  );

  if (rows.length === 0) {
    return null;
  }

  return mapMarketingContactRow(rows[0]);
}

function mapSubscriberRow(row: any) {
  return {
    id: Number(row.id),
    email: row.email || '',
    fullName: row.full_name || 'Subscriber',
    mobileNo: row.mobile_no ?? null,
    branch: row.branch ?? null,
    experience: row.experience ?? null,
    telegramChatId: row.telegram_chat_id ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: null,
  };
}
