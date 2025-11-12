const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const { sendFresherJobsEmail, verifyEmailTransport } = require('./emailService');
const { getNewFresherJobs, getSubscribedUsers, markJobsNotified, getSequelize } = require('./jobFetcher');
const { startMailScheduler: createMailScheduler } = require('./mailScheduler');

const LOG_DIRECTORY = path.resolve(__dirname, '../logs');
const SUCCESS_LOG = path.join(LOG_DIRECTORY, 'success.log');
const FAILED_LOG = path.join(LOG_DIRECTORY, 'failed.log');

let environmentLoaded = false;
let schedulerStarted = false;

function ensureEnvironment() {
  if (environmentLoaded) {
    return;
  }

  // Load notification specific env if present, but do not override global values
  const localEnvPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: false });
  }

  // Fallback to root env
  const rootEnvPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath, override: false });
  }

  // Always read default environment
  dotenv.config();
  environmentLoaded = true;
}

async function appendToLog(filePath, payload) {
  await fs.promises.mkdir(LOG_DIRECTORY, { recursive: true });
  await fs.promises.appendFile(filePath, `${payload}\n`, 'utf8');
}

function createLogMessage(status, details) {
  const timestamp = new Date().toISOString();
  const meta = details ? ` | ${JSON.stringify(details)}` : '';
  return `[${timestamp}] ${status}${meta}`;
}

async function processFresherJobNotifications(options = {}) {
  ensureEnvironment();

  const limit = Number(options.limit || process.env.NOTIFICATION_JOB_LIMIT || 5);
  const source = options.source || 'manual';

  const summary = {
    ok: false,
    source,
    jobsQueried: 0,
    jobsNotified: 0,
    recipientsAttempted: 0,
    recipientsSucceeded: 0,
    recipientsFailed: 0,
    errors: [],
    skipped: false,
  };

  try {
    await fs.promises.mkdir(LOG_DIRECTORY, { recursive: true });

    const jobs = await getNewFresherJobs(limit);
    summary.jobsQueried = jobs.length;

    if (jobs.length === 0) {
      summary.skipped = true;
      const message = createLogMessage('SKIP', { reason: 'No fresher jobs pending notification', source });
      await appendToLog(SUCCESS_LOG, message);
      summary.ok = true;
      return summary;
    }

    const users = await getSubscribedUsers();
    summary.recipientsAttempted = users.length;

    if (users.length === 0) {
      summary.skipped = true;
      const message = createLogMessage('SKIP', { reason: 'No subscribed users found', source });
      await appendToLog(FAILED_LOG, message);
      return summary;
    }

    await verifyEmailTransport();

    const successfulRecipients = [];
    for (const user of users) {
      try {
        await sendFresherJobsEmail(user, jobs, options.mailOptions);
        successfulRecipients.push(user.email);
        summary.recipientsSucceeded += 1;
        const message = createLogMessage('SUCCESS', {
          source,
          user: user.email,
          jobs: jobs.map((job) => job.id),
        });
        await appendToLog(SUCCESS_LOG, message);
      } catch (error) {
        summary.recipientsFailed += 1;
        summary.errors.push({ user: user.email, message: error.message });
        const message = createLogMessage('FAILURE', {
          source,
          user: user.email,
          error: error.message,
        });
        await appendToLog(FAILED_LOG, message);
      }
    }

    if (successfulRecipients.length > 0) {
      const sequelize = getSequelize();
      const transaction = await sequelize.transaction();
      try {
        await markJobsNotified(jobs.map((job) => job.id), transaction);
        await transaction.commit();
        summary.jobsNotified = jobs.length;
      } catch (error) {
        await transaction.rollback();
        summary.errors.push({ stage: 'markJobsNotified', message: error.message });
        const message = createLogMessage('FAILURE', {
          source,
          error: error.message,
          stage: 'markJobsNotified',
        });
        await appendToLog(FAILED_LOG, message);
        throw error;
      }
    }

    summary.ok = summary.recipientsFailed === 0;
    return summary;
  } catch (error) {
    summary.errors.push({ stage: 'processor', message: error.message });
    const message = createLogMessage('FAILURE', {
      source,
      error: error.message,
    });
    await appendToLog(FAILED_LOG, message);
    throw Object.assign(error, { summary });
  }
}

function startMailScheduler(options = {}) {
  ensureEnvironment();

  if (schedulerStarted) {
    return;
  }

  createMailScheduler(processFresherJobNotifications, options);
  schedulerStarted = true;
}

module.exports = {
  processFresherJobNotifications,
  triggerFresherJobEmailRun: processFresherJobNotifications,
  startMailScheduler,
};

