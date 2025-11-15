const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let cachedConfig;
let envLoaded = false;

function toNumber(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function toStringArray(value, fallback) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return Array.isArray(fallback) ? fallback : [];
}

function loadEnvironment() {
  if (envLoaded) {
    return;
  }

  const marketingEnvPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(marketingEnvPath)) {
    dotenv.config({ path: marketingEnvPath, override: false });
  }

  const notificationsEnvPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(notificationsEnvPath)) {
    dotenv.config({ path: notificationsEnvPath, override: false });
  }

  const rootEnvPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath, override: false });
  }

  dotenv.config();
  envLoaded = true;
}

function buildConfig() {
  loadEnvironment();

  const now = Date.now();
  const retryBackoffDefaults = [5_000, 15_000, 30_000];
  const retryBackoffsRaw = process.env.MARKETING_EMAIL_RETRY_BACKOFF_MS;
  const retryBackoffs = toStringArray(retryBackoffsRaw, retryBackoffDefaults)
    .map((value, index) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : retryBackoffDefaults[Math.min(index, retryBackoffDefaults.length - 1)];
    })
    .slice(0, 3);

  const createdSinceHoursRaw = process.env.MARKETING_JOBS_CREATED_SINCE_HOURS;
  const createdSinceHours = createdSinceHoursRaw ? Number(createdSinceHoursRaw) : NaN;
  const createdAfter = Number.isFinite(createdSinceHours) && createdSinceHours > 0
    ? new Date(now - createdSinceHours * 60 * 60 * 1000)
    : null;

  const digestSize = Math.max(1, toNumber(process.env.MARKETING_DIGEST_SIZE, 5));
  const batchSize = Math.max(digestSize, toNumber(process.env.MARKETING_EMAIL_BATCH_SIZE, 50));
  const concurrency = Math.max(1, toNumber(process.env.MARKETING_EMAIL_CONCURRENCY, 5));
  const contactFetchLimit = Math.max(1, toNumber(process.env.MARKETING_CONTACTS_FETCH_LIMIT, 200));

  const telegramRetryDefaults = [2_000, 5_000, 10_000];
  const telegramRetryRaw = process.env.MARKETING_TELEGRAM_RETRY_BACKOFF_MS;
  const telegramRetryBackoffs = toStringArray(telegramRetryRaw, telegramRetryDefaults)
    .map((value, index) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : telegramRetryDefaults[Math.min(index, telegramRetryDefaults.length - 1)];
    })
    .slice(0, 3);
  const telegramBatchSize = Math.max(1, toNumber(process.env.MARKETING_TELEGRAM_BATCH_SIZE, batchSize));
  const telegramConcurrency = Math.max(1, toNumber(process.env.MARKETING_TELEGRAM_CONCURRENCY, concurrency));
  const telegramMaxRetries = Math.max(0, toNumber(process.env.MARKETING_TELEGRAM_MAX_RETRIES, telegramRetryBackoffs.length));
  const telegramBatchPause = Math.max(0, toNumber(process.env.MARKETING_TELEGRAM_BATCH_PAUSE_MS, 2_000));
  const telegramTimeoutMs = Math.max(0, toNumber(process.env.MARKETING_TELEGRAM_TIMEOUT_MS, 20_000));
  const telegramDisablePreview = toBoolean(process.env.MARKETING_TELEGRAM_DISABLE_LINK_PREVIEW, true);
  const telegramEnabled = toBoolean(process.env.MARKETING_TELEGRAM_ENABLED, false);
  const telegramDryRun = toBoolean(process.env.MARKETING_TELEGRAM_DRY_RUN, false);
  const telegramBotToken = process.env.MARKETING_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || null;
  const telegramApiBase = process.env.MARKETING_TELEGRAM_API_BASE || 'https://api.telegram.org';

  return {
    enabled: toBoolean(process.env.MARKETING_EMAIL_ENABLED, true),
    cronExpression: process.env.MARKETING_EMAIL_CRON || '0 0 */3 * *',
    jobFetchLimit: Math.max(digestSize, toNumber(process.env.MARKETING_JOBS_FETCH_LIMIT, 100)),
    createdAfter,
    digestSize,
    batchSize,
    concurrency,
    contactFetchLimit,
    batchPauseMs: Math.max(0, toNumber(process.env.MARKETING_EMAIL_BATCH_PAUSE_MS, 10_000)),
    maxRetries: Math.max(0, toNumber(process.env.MARKETING_EMAIL_MAX_RETRIES, 0)),
    retryBackoffs,
    dryRun: toBoolean(process.env.MARKETING_EMAIL_DRY_RUN, false),
    smtp: {
      host: process.env.MARKETING_SMTP_HOST || process.env.EMAIL_HOST,
      port: toNumber(process.env.MARKETING_SMTP_PORT, process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587),
      secure:
        toBoolean(
          process.env.MARKETING_SMTP_SECURE,
          process.env.MARKETING_SMTP_PORT === '465' || process.env.EMAIL_PORT === '465'
        ),
      requireTLS: toBoolean(
        process.env.MARKETING_SMTP_REQUIRE_TLS,
        (process.env.MARKETING_SMTP_PORT || process.env.EMAIL_PORT || '587') === '587'
      ),
      user: process.env.MARKETING_SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.MARKETING_SMTP_PASS || process.env.EMAIL_PASS,
    },
    mailFrom: {
      name: process.env.MARKETING_FROM_NAME || process.env.FROM_NAME || 'MyCareerBuild',
      address:
        process.env.MARKETING_FROM_EMAIL ||
        process.env.FROM_EMAIL ||
        process.env.EMAIL_FROM ||
        process.env.EMAIL_USER,
    },
    healthToken: process.env.MARKETING_HEALTH_TOKEN || null,
    adminToken: process.env.MARKETING_ADMIN_TOKEN || null,
    alert: {
      failureRateThreshold: Math.max(0, toNumber(process.env.MARKETING_ALERT_FAILURE_RATE, 10)),
      backlogThreshold: Math.max(0, toNumber(process.env.MARKETING_ALERT_BACKLOG_THRESHOLD, 500)),
    },
    telemetry: {
      enabled: toBoolean(process.env.MARKETING_TELEMETRY_ENABLED, false),
    },
    telegram: {
      enabled: telegramEnabled,
      dryRun: telegramDryRun,
      botToken: telegramBotToken,
      apiBaseUrl: telegramApiBase.replace(/\/+$/, ''),
      batchSize: telegramBatchSize,
      batchPauseMs: telegramBatchPause,
      concurrency: telegramConcurrency,
      maxRetries: telegramMaxRetries,
      retryBackoffs: telegramRetryBackoffs,
      timeoutMs: telegramTimeoutMs,
      disableLinkPreview: telegramDisablePreview,
    },
  };
}

function getConfig() {
  if (!cachedConfig) {
    cachedConfig = buildConfig();
  }
  return cachedConfig;
}

function refreshConfig() {
  cachedConfig = null;
  return getConfig();
}

module.exports = {
  getConfig,
  refreshConfig,
  toBoolean,
  toNumber,
  toStringArray,
};


