const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '../logs');
const SUCCESS_LOG = path.join(LOG_DIR, 'marketing-success.log');
const FAILED_LOG = path.join(LOG_DIR, 'marketing-failed.log');

async function ensureLogDir() {
  await fs.promises.mkdir(LOG_DIR, { recursive: true });
}

function serializeLogEntry(entry) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  });
}

async function appendLog(filePath, entry) {
  await ensureLogDir();
  await fs.promises.appendFile(filePath, `${serializeLogEntry(entry)}\n`, 'utf8');
}

async function logSuccess(payload) {
  await appendLog(SUCCESS_LOG, { status: 'SUCCESS', ...payload });
}

async function logFailure(payload) {
  await appendLog(FAILED_LOG, { status: 'FAILED', ...payload });
}

async function readRecentEntries(filePath, windowMs) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const cutoff = Date.now() - windowMs;
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((entry) => entry && entry.timestamp)
      .filter((entry) => {
        const ts = Date.parse(entry.timestamp);
        return Number.isFinite(ts) && ts >= cutoff;
      });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function getFailureRate(hours = 24) {
  const windowMs = hours * 60 * 60 * 1000;
  const [successEntries, failedEntries] = await Promise.all([
    readRecentEntries(SUCCESS_LOG, windowMs),
    readRecentEntries(FAILED_LOG, windowMs),
  ]);
  const total = successEntries.length + failedEntries.length;
  const failureRate = total === 0 ? 0 : (failedEntries.length / total) * 100;
  return {
    failureRate,
    total,
    failed: failedEntries.length,
  };
}

async function readRecentFailures(limit = 50) {
  const entries = await readRecentEntries(FAILED_LOG, 24 * 60 * 60 * 1000);
  return entries.slice(-limit);
}

module.exports = {
  logSuccess,
  logFailure,
  getFailureRate,
  readRecentFailures,
  LOG_DIR,
  SUCCESS_LOG,
  FAILED_LOG,
};


