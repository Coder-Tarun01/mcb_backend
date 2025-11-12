const { logSuccess, logFailure } = require('../logger');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(items, size) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  const normalizedSize = Math.max(1, Number.isFinite(size) && size > 0 ? Math.floor(size) : items.length);
  const chunks = [];
  for (let i = 0; i < items.length; i += normalizedSize) {
    chunks.push(items.slice(i, i + normalizedSize));
  }
  return chunks;
}

function sanitizeName(fullName) {
  if (typeof fullName !== 'string' || fullName.trim().length === 0) {
    return 'there';
  }
  const [first] = fullName.trim().split(/\s+/);
  return first || 'there';
}

function resolvePrimaryLink(job) {
  if (!job) {
    return '';
  }
  return (
    job.applyUrl ||
    job.ctaUrl ||
    job.url ||
    job.jobUrl ||
    job.applicationUrl ||
    job.redirectUrl ||
    ''
  );
}

function buildTelegramMessage({ contact, jobs }) {
  const safeName = sanitizeName(contact?.fullName);
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return `Hi ${safeName}, we could not find suitable roles for you today. We'll keep looking!`;
  }

  const header =
    jobs.length === 1
      ? `Hi ${safeName}, here is a new role we think you'll like:`
      : `Hi ${safeName}, here are ${jobs.length} roles we think you'll like:`;

  const lines = jobs.map((job, index) => {
    if (!job) {
      return null;
    }
    const number = index + 1;
    const title = job.title || 'Open role';
    const company = job.companyName || job.company || job.company_name || '';
    const location = job.location || job.locationType || job.city || job.country || '';
    const link = resolvePrimaryLink(job);

    const details = [];
    if (company) {
      details.push(` @ ${company}`);
    }
    if (location) {
      details.push(` (${location})`);
    }

    const bullets = [`${number}. ${title}${details.join('')}`];
    if (link) {
      bullets.push(`   ${link}`);
    }
    return bullets.join('\n');
  });

  const body = lines.filter(Boolean);
  const footer = 'Tap a link to learn more. Reply STOP to opt out.';

  return [header, '', ...body, '', footer].filter((part) => typeof part === 'string' && part.length > 0).join('\n');
}

function getFetchImplementation(fetchOverride) {
  if (typeof fetchOverride === 'function') {
    return fetchOverride;
  }
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error('Fetch API is not available. Provide a fetch implementation when creating the Telegram service.');
}

function createTelegramService({ config, fetch: fetchOverride } = {}) {
  if (!config) {
    throw new Error('Config is required to create marketing Telegram service');
  }

  const telegramConfig = config.telegram || {};
  const fetchImpl = getFetchImplementation(fetchOverride);

  async function sendDigestTelegrams({ contacts, jobs, jobsByContact, batchId }) {
    const summary = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      failures: [],
      successes: [],
      skipped: 0,
    };

    if (!telegramConfig.enabled) {
      summary.reason = 'Telegram notifications are disabled';
      return summary;
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      summary.reason = 'No contacts provided';
      return summary;
    }

    const eligibleContacts = contacts.filter((contact) => contact && contact.telegramChatId);
    if (eligibleContacts.length === 0) {
      summary.reason = 'No contacts have a linked Telegram chat id';
      summary.skipped = contacts.length;
      return summary;
    }

    if (!telegramConfig.dryRun && !telegramConfig.botToken) {
      throw new Error('Telegram bot token is required when Telegram notifications are enabled');
    }

    const jobsMap = jobsByContact instanceof Map ? jobsByContact : null;
    const resolveJobsForContact = (contact) => {
      if (jobsMap && contact && jobsMap.has(contact.id)) {
        return jobsMap.get(contact.id) || [];
      }
      return Array.isArray(jobs) ? jobs : [];
    };

    const batches = chunkArray(eligibleContacts, telegramConfig.batchSize || eligibleContacts.length);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      const batchLabel = `${batchId}-tg${batchIndex + 1}`;
      const batchResults = await processBatch({
        batch,
        resolveJobsForContact,
        batchId: batchLabel,
        telegramConfig,
        fetchImpl,
      });

      for (const result of batchResults) {
        if (!result) {
          continue;
        }
        summary.attempted += 1;
        if (result.ok) {
          summary.succeeded += 1;
          summary.successes.push(result);
        } else {
          summary.failed += 1;
          summary.failures.push(result);
        }
      }

      if (batchIndex < batches.length - 1 && telegramConfig.batchPauseMs > 0) {
        await sleep(telegramConfig.batchPauseMs);
      }
    }

    return summary;
  }

  return {
    sendDigestTelegrams,
  };
}

async function processBatch({ batch, resolveJobsForContact, batchId, telegramConfig, fetchImpl }) {
  const results = [];
  const queue = [...batch];
  let active = 0;

  return new Promise((resolve) => {
    const launchNext = () => {
      if (queue.length === 0 && active === 0) {
        resolve(results);
        return;
      }

      if (queue.length === 0 || active >= telegramConfig.concurrency) {
        return;
      }

      const contact = queue.shift();
      const jobsForContact = resolveJobsForContact(contact);
      active += 1;
      sendWithRetry({
        contact,
        jobs: jobsForContact,
        batchId,
        telegramConfig,
        fetchImpl,
      })
        .then((result) => {
          results.push(result);
        })
        .catch((error) => {
          const jobIds = Array.isArray(jobsForContact) ? jobsForContact.map((job) => job?.id).filter((id) => id !== undefined && id !== null) : [];
          const failure = {
            ok: false,
            contactId: contact?.id ?? null,
            contact: contact?.telegramChatId ?? null,
            attempts: 0,
            error: error instanceof Error ? error.message : String(error),
            batchId,
            jobIds,
          };
          results.push(failure);
        })
        .finally(() => {
          active -= 1;
          launchNext();
        });
    };

    const starters = Math.min(telegramConfig.concurrency || 1, queue.length);
    if (starters === 0) {
      launchNext();
    } else {
      for (let i = 0; i < starters; i += 1) {
        launchNext();
      }
    }
  });
}

async function sendWithRetry({ contact, jobs, batchId, telegramConfig, fetchImpl }) {
  if (!contact || !contact.telegramChatId) {
    return {
      ok: false,
      contactId: contact?.id ?? null,
      contact: contact?.telegramChatId ?? null,
      attempts: 0,
      error: 'Contact does not have a Telegram chat id',
      batchId,
      jobIds: [],
    };
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    throw new Error('No jobs selected for contact');
  }

  const jobIds = jobs.map((job) => job && job.id).filter((id) => id !== undefined && id !== null);
  const payloadBase = {
    recipient: contact.telegramChatId,
    contactId: contact.id,
    batchId,
    jobIds,
    source: 'marketing-digest-telegram',
  };

  const message = buildTelegramMessage({ contact, jobs });

  let attempt = 0;
  let lastError = null;

  while (attempt <= (telegramConfig.maxRetries ?? 0)) {
    try {
      if (!telegramConfig.dryRun) {
        await sendTelegramMessage({
          fetchImpl,
          telegramConfig,
          chatId: contact.telegramChatId,
          text: message,
        });
      }

      await logSuccess({
        ...payloadBase,
        attempt,
        dryRun: telegramConfig.dryRun,
        transport: 'telegram',
      });

      return {
        ok: true,
        contactId: contact.id,
        contact: contact.telegramChatId,
        attempts: attempt + 1,
        batchId,
        jobIds,
        transport: 'telegram',
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await logFailure({
        ...payloadBase,
        attempt,
        error: lastError.message,
        transport: 'telegram',
      });

      if (attempt >= (telegramConfig.maxRetries ?? 0)) {
        return {
          ok: false,
          contactId: contact.id,
          contact: contact.telegramChatId,
          attempts: attempt + 1,
          error: lastError.message,
          batchId,
          jobIds,
          transport: 'telegram',
        };
      }

      const backoff =
        telegramConfig.retryBackoffs?.[attempt] ??
        telegramConfig.retryBackoffs?.[telegramConfig.retryBackoffs.length - 1] ??
        5_000;
      await sleep(backoff);
      attempt += 1;
    }
  }

  return {
    ok: false,
    contactId: contact.id,
    contact: contact.telegramChatId,
    attempts: attempt,
    error: lastError ? lastError.message : 'Unknown error',
    batchId,
    jobIds,
    transport: 'telegram',
  };
}

async function sendTelegramMessage({ fetchImpl, telegramConfig, chatId, text }) {
  const AbortControllerImpl = typeof AbortController === 'function' ? AbortController : null;
  const controller = telegramConfig.timeoutMs > 0 && AbortControllerImpl ? new AbortControllerImpl() : null;
  const timeout = controller
    ? setTimeout(() => {
        controller.abort();
      }, telegramConfig.timeoutMs)
    : null;

  try {
    const response = await fetchImpl(`${telegramConfig.apiBaseUrl}/bot${telegramConfig.botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: telegramConfig.disableLinkPreview,
      }),
      signal: controller ? controller.signal : undefined,
    });

    if (!response.ok) {
      let errorMessage = `Telegram API responded with HTTP ${response.status}`;
      try {
        const payload = await response.json();
        if (payload && typeof payload.description === 'string') {
          errorMessage = payload.description;
        } else if (payload && typeof payload.error === 'string') {
          errorMessage = payload.error;
        }
      } catch {
        // ignore parse errors
      }
      throw new Error(errorMessage);
    }

    // Consume body to allow keep-alive reuse; ignore result.
    try {
      await response.json();
    } catch {
      // Some Telegram responses may not be JSON when proxies intervene; ignore.
    }
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

module.exports = {
  createTelegramService,
  buildTelegramMessage,
};


