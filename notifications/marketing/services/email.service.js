const nodemailer = require('nodemailer');
const { buildDigestTemplate } = require('./template.service');
const { logSuccess, logFailure } = require('../logger');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTransporter(smtpConfig) {
  if (!smtpConfig || !smtpConfig.host) {
    throw new Error('SMTP configuration is incomplete for marketing email service');
  }

  const port = Number.isFinite(smtpConfig.port) ? smtpConfig.port : 587;

  return nodemailer.createTransport({
    host: smtpConfig.host,
    port,
    secure: Boolean(smtpConfig.secure),
    requireTLS: Boolean(smtpConfig.requireTLS),
    auth:
      smtpConfig.user && smtpConfig.pass
        ? {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
          }
        : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function createEmailService({ config, transporter = null, digestLogRepository = null } = {}) {
  if (!config) {
    throw new Error('Config is required to create marketing email service');
  }

  const mailFrom = config.mailFrom;
  let internalTransporter = transporter;

  function ensureTransporter() {
    if (config.dryRun) {
      return null;
    }
    if (!internalTransporter) {
      internalTransporter = createTransporter(config.smtp);
    }
    return internalTransporter;
  }

  async function sendDigestEmails({ contacts, jobs, jobsByContact, batchId }) {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        failures: [],
        successes: [],
      };
    }

    const transporterInstance = ensureTransporter();
    const batches = chunkArray(contacts, config.batchSize);
    const jobsMap = jobsByContact instanceof Map ? jobsByContact : null;

    const resolveJobsForContact = (contact) => {
      if (jobsMap && jobsMap.has(contact.id)) {
        return jobsMap.get(contact.id) || [];
      }
      return Array.isArray(jobs) ? jobs : [];
    };

    const summary = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      failures: [],
      successes: [],
    };

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      const batchLabel = `${batchId}-b${batchIndex + 1}`;
      const batchResults = await processBatch({
        batch,
        resolveJobsForContact,
        transporter: transporterInstance,
        batchId: batchLabel,
        config,
        mailFrom,
        digestLogRepository,
      });

      for (const result of batchResults) {
        summary.attempted += 1;
        if (result.ok) {
          summary.succeeded += 1;
          summary.successes.push(result);
        } else {
          summary.failed += 1;
          summary.failures.push(result);
        }
      }

      if (batchIndex < batches.length - 1 && config.batchPauseMs > 0) {
        await sleep(config.batchPauseMs);
      }
    }

    return summary;
  }

  return {
    sendDigestEmails,
    ensureTransporter,
  };
}

async function processBatch({ batch, resolveJobsForContact, transporter, batchId, config, mailFrom, digestLogRepository }) {
  const results = [];
  const queue = [...batch];
  let active = 0;

  return new Promise((resolve) => {
    const next = () => {
      if (queue.length === 0 && active === 0) {
        resolve(results);
        return;
      }

      if (queue.length === 0 || active >= config.concurrency) {
        return;
      }

      const contact = queue.shift();
      const jobsForContact = resolveJobsForContact(contact);

      if (!Array.isArray(jobsForContact) || jobsForContact.length === 0) {
        if (digestLogRepository) {
          digestLogRepository
            .record({ email: contact.email, jobs: [], status: 'FAILED', error: 'No jobs available for contact' })
            .catch(() => {});
        }
        results.push({
          ok: false,
          contactId: contact.id,
          contact: contact.email,
          attempts: 0,
          error: 'No jobs available for contact',
          batchId,
        });
        next();
        return;
      }

      active += 1;

      sendWithRetry({ contact, jobs: jobsForContact, transporter, batchId, config, mailFrom, digestLogRepository })
        .then((result) => {
          results.push(result);
        })
        .catch((error) => {
          results.push({
            ok: false,
            contactId: contact.id,
            contact: contact.email,
            attempts: config.maxRetries + 1,
            error: error.message,
            batchId,
          });
        })
        .finally(() => {
          active -= 1;
          next();
        });

      next();
    };

    for (let i = 0; i < Math.min(config.concurrency, queue.length); i += 1) {
      next();
    }
  });
}

async function sendWithRetry({ contact, jobs, transporter, batchId, config, mailFrom, digestLogRepository }) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    throw new Error('No jobs selected for contact');
  }

  const jobIds = jobs.map((job) => job.id);
  const payloadBase = {
    recipient: contact.email,
    contactId: contact.id,
    batchId,
    jobIds,
    source: 'marketing-digest',
  };

  const mailContent = buildDigestTemplate({
    contact,
    jobs,
    mailFrom,
  });

  const mailOptions = {
    to: contact.email,
    from: {
      name: mailFrom.name,
      address: mailFrom.address,
    },
    subject: mailContent.subject,
    html: mailContent.html,
    text: mailContent.text,
  };

  let attempt = 0;
  let lastError = null;

  while (attempt <= config.maxRetries) {
    try {
      if (!config.dryRun) {
        if (!transporter) {
          throw new Error('SMTP transporter is unavailable');
        }
        await transporter.sendMail(mailOptions);
      }

      await logSuccess({
        ...payloadBase,
        attempt,
        dryRun: config.dryRun,
      });

      if (digestLogRepository) {
        digestLogRepository
          .record({ email: contact.email, jobs, status: 'SUCCESS' })
          .catch(() => {});
      }

      return {
        ok: true,
        contactId: contact.id,
        contact: contact.email,
        attempts: attempt + 1,
        batchId,
        jobIds,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await logFailure({
        ...payloadBase,
        attempt,
        error: lastError.message,
      });

      if (attempt >= config.maxRetries) {
        if (digestLogRepository) {
          digestLogRepository
            .record({ email: contact.email, jobs, status: 'FAILED', error: lastError.message })
            .catch(() => {});
        }
        return {
          ok: false,
          contactId: contact.id,
          contact: contact.email,
          attempts: attempt + 1,
          error: lastError.message,
          batchId,
          jobIds,
        };
      }

      const backoff = config.retryBackoffs[attempt] || config.retryBackoffs[config.retryBackoffs.length - 1] || 60_000;
      await sleep(backoff);
      attempt += 1;
    }
  }

  if (digestLogRepository) {
    const message = lastError ? lastError.message : 'Unknown error';
    digestLogRepository
      .record({ email: contact.email, jobs, status: 'FAILED', error: message })
      .catch(() => {});
  }

  return {
    ok: false,
    contactId: contact.id,
    contact: contact.email,
    attempts: attempt,
    error: lastError ? lastError.message : 'Unknown error',
    batchId,
    jobIds,
  };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  createEmailService,
  createTransporter,
  chunkArray,
  sleep,
  processBatch,
  sendWithRetry,
};


