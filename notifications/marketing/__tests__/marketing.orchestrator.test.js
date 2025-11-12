const test = require('node:test');
const assert = require('node:assert/strict');
const { MarketingNotificationOrchestrator } = require('..');

function createMockConfig(overrides = {}) {
  return {
    enabled: true,
    cronExpression: '*/30 * * * *',
    jobFetchLimit: 100,
    createdAfter: null,
    digestSize: 5,
    batchSize: 50,
    concurrency: 5,
    batchPauseMs: 0,
    maxRetries: 1,
    retryBackoffs: [10],
    dryRun: true,
    smtp: { host: 'localhost', port: 1025, secure: false },
    mailFrom: { name: 'Test', address: 'no-reply@test.dev' },
    alert: { failureRateThreshold: 80, backlogThreshold: 500 },
    healthToken: 'token',
    ...overrides,
  };
}

function createMockJobsRepository({ jobs = [] } = {}) {
  return {
    fetchPendingJobs: async () => jobs,
    countPendingJobs: async () => jobs.length,
    markJobsNotified: async () => ({ jobs: jobs.length }),
  };
}

function createMockContactsRepository({ contacts = [] } = {}) {
  return {
    fetchContacts: async () => contacts,
  };
}

function resolveJobsForContact({ contact, jobs, jobsByContact }) {
  if (jobsByContact instanceof Map && jobsByContact.has(contact.id)) {
    return jobsByContact.get(contact.id) || [];
  }
  return Array.isArray(jobs) ? jobs : [];
}

function createMockEmailService({ shouldFail = false, failContacts = new Set() } = {}) {
  return {
    async sendDigestEmails({ contacts, jobs, jobsByContact, batchId }) {
      const failures = [];
      const successes = [];

      for (const contact of contacts) {
        const jobsForContact = resolveJobsForContact({ contact, jobs, jobsByContact });
        const jobIds = jobsForContact.map((job) => job.id);
        if (shouldFail || failContacts.has(contact.email)) {
          failures.push({ contact: contact.email, contactId: contact.id, error: 'SMTP failure', batchId, jobIds });
        } else {
          successes.push({ contact: contact.email, contactId: contact.id, batchId, jobIds });
        }
      }

      return {
        attempted: contacts.length,
        succeeded: successes.length,
        failed: failures.length,
        failures,
        successes,
      };
    },
  };
}

function createMockTelegramService({ succeedContacts = new Set(), failContacts = new Set(), reason = null } = {}) {
  return {
    async sendDigestTelegrams({ contacts, jobs, jobsByContact, batchId }) {
      const failures = [];
      const successes = [];
      let attempted = 0;

      for (const contact of contacts) {
        if (!contact.telegramChatId) {
          continue;
        }

        const jobsForContact = resolveJobsForContact({ contact, jobs, jobsByContact });
        const jobIds = jobsForContact.map((job) => job.id);

        if (failContacts.has(contact.telegramChatId)) {
          failures.push({
            contact: contact.telegramChatId,
            contactId: contact.id,
            error: 'Telegram failure',
            batchId,
            jobIds,
          });
          attempted += 1;
          continue;
        }

        if (succeedContacts.size === 0 || succeedContacts.has(contact.telegramChatId)) {
          successes.push({
            contact: contact.telegramChatId,
            contactId: contact.id,
            batchId,
            jobIds,
            transport: 'telegram',
          });
          attempted += 1;
        }
      }

      return {
        attempted,
        succeeded: successes.length,
        failed: failures.length,
        failures,
        successes,
        skipped: contacts.length - attempted,
        reason,
      };
    },
  };
}

const sampleJob = (id, source = 'jobs') => ({
  source,
  id,
  title: `Role ${id}`,
  companyName: 'Acme Corp',
  location: 'Remote',
  isRemote: true,
  locationType: 'Remote',
  createdAt: new Date(),
  notifySent: 0,
  notifySentAt: null,
  jobType: 'Full-time',
  experience: '2+ years',
  applyUrl: `https://example.com/${id}`,
  ctaUrl: `https://example.com/${id}`,
});

const sampleContact = (email, id, experience, overrides = {}) => ({
  id,
  fullName: `Contact ${id}`,
  email,
  experience,
  ...overrides,
});

test('orchestrator happy path marks jobs notified after successful sends', async () => {
  let markedCalled = false;
  const jobsRepo = {
    ...createMockJobsRepository({ jobs: [sampleJob(1), sampleJob(2)] }),
    markJobsNotified: async (payload) => {
      markedCalled = true;
      assert.deepEqual(payload, { jobs: [1, 2] });
      return { jobs: 2 };
    },
  };

  const orchestrator = new MarketingNotificationOrchestrator({
    config: createMockConfig(),
    jobsRepository: jobsRepo,
    contactsRepository: createMockContactsRepository({
      contacts: [sampleContact('contact@example.com', 1)],
    }),
    emailService: createMockEmailService(),
    telegramService: createMockTelegramService(),
    logger: {
      getFailureRate: async () => ({ failureRate: 0, failed: 0, total: 1 }),
    },
    schedulerService: { start() {}, stop() {} },
  });

  const summary = await orchestrator.run({ source: 'test' });

  assert.equal(summary.ok, true);
  assert.equal(summary.contactsSucceeded, 1);
  assert.equal(summary.contactsFailed, 0);
  assert.equal(markedCalled, true);
});

test('orchestrator handles SMTP failure and skips marking jobs', async () => {
  const jobsRepo = {
    ...createMockJobsRepository({ jobs: [sampleJob(42)] }),
    markJobsNotified: async () => {
      throw new Error('should not be called');
    },
  };

  const orchestrator = new MarketingNotificationOrchestrator({
    config: createMockConfig(),
    jobsRepository: jobsRepo,
    contactsRepository: createMockContactsRepository({
      contacts: [sampleContact('fail@example.com', 2)],
    }),
    emailService: createMockEmailService({ shouldFail: true }),
    telegramService: createMockTelegramService(),
    logger: {
      getFailureRate: async () => ({ failureRate: 100, failed: 1, total: 1 }),
    },
    schedulerService: { start() {}, stop() {} },
  });

  const summary = await orchestrator.run({ source: 'test' });

  assert.equal(summary.ok, false);
  assert.equal(summary.contactsSucceeded, 0);
  assert.equal(summary.contactsFailed, 1);
});

test('orchestrator deduplicates contacts and respects digest size', async () => {
  const orchestrator = new MarketingNotificationOrchestrator({
    config: createMockConfig({ digestSize: 1, batchSize: 2 }),
    jobsRepository: createMockJobsRepository({ jobs: [sampleJob(1), sampleJob(2), sampleJob(3)] }),
    contactsRepository: createMockContactsRepository({
      contacts: [
        sampleContact('dup@example.com', 1),
        sampleContact('unique@example.com', 2),
      ],
    }),
    emailService: createMockEmailService(),
    telegramService: createMockTelegramService(),
    logger: {
      getFailureRate: async () => ({ failureRate: 0, failed: 0, total: 1 }),
    },
    schedulerService: { start() {}, stop() {} },
  });

  const summary = await orchestrator.run({ source: 'test' });

  assert.equal(summary.jobsIncluded, 1);
  assert.equal(summary.contactsAttempted, 2);
});

test('orchestrator filters jobs by contact experience', async () => {
  const matchingJob = {
    ...sampleJob(101),
    experience: '3-5 years',
  };
  const nonMatchingJob = {
    ...sampleJob(102),
    experience: '0-1 years',
  };
  const highExperienceJob = {
    ...sampleJob(103),
    experience: '6+ years',
  };

  const captured = new Map();
  const emailService = {
    async sendDigestEmails({ contacts, jobsByContact, batchId }) {
      const successes = [];
      for (const contact of contacts) {
        const list = jobsByContact.get(contact.id) || [];
        captured.set(contact.email, list.map((job) => job.id));
        successes.push({
          contact: contact.email,
          contactId: contact.id,
          jobIds: list.map((job) => job.id),
          batchId,
        });
      }
      return {
        attempted: contacts.length,
        succeeded: contacts.length,
        failed: 0,
        failures: [],
        successes,
      };
    },
  };

  let notifiedPayload = null;
  const orchestrator = new MarketingNotificationOrchestrator({
    config: createMockConfig({ digestSize: 5, dryRun: false }),
    jobsRepository: {
      ...createMockJobsRepository({ jobs: [matchingJob, nonMatchingJob, highExperienceJob] }),
      markJobsNotified: async (payload) => {
        notifiedPayload = payload;
        return { jobs: payload.jobs?.length ?? 0 };
      },
    },
    contactsRepository: createMockContactsRepository({
      contacts: [sampleContact('exp3@example.com', 1, '3')],
    }),
    emailService,
    telegramService: createMockTelegramService(),
    logger: {
      getFailureRate: async () => ({ failureRate: 0, failed: 0, total: 1 }),
    },
    schedulerService: { start() {}, stop() {} },
  });

  const summary = await orchestrator.run({ source: 'test' });

  assert.equal(summary.ok, true);
  assert.equal(summary.contactsSucceeded, 1);
  assert.deepEqual(captured.get('exp3@example.com'), [101]);
  assert.deepEqual(notifiedPayload, { jobs: [101] });
});

test('contacts without experience receive default job selection', async () => {
  const jobs = [
    { ...sampleJob(201), experience: '0-1 years' },
    { ...sampleJob(202), experience: '3-5 years' },
  ];

  const captured = new Map();
  const emailService = {
    async sendDigestEmails({ contacts, jobsByContact, batchId }) {
      const successes = [];
      for (const contact of contacts) {
        const list = jobsByContact.get(contact.id) || [];
        captured.set(contact.email, list.map((job) => job.id));
        successes.push({
          contact: contact.email,
          contactId: contact.id,
          jobIds: list.map((job) => job.id),
          batchId,
        });
      }
      return {
        attempted: contacts.length,
        succeeded: contacts.length,
        failed: 0,
        failures: [],
        successes,
      };
    },
  };

  const orchestrator = new MarketingNotificationOrchestrator({
    config: createMockConfig({ digestSize: 2, dryRun: false }),
    jobsRepository: createMockJobsRepository({ jobs }),
    contactsRepository: createMockContactsRepository({
      contacts: [sampleContact('noexp@example.com', 1, null)],
    }),
    emailService,
    telegramService: createMockTelegramService(),
    logger: {
      getFailureRate: async () => ({ failureRate: 0, failed: 0, total: 1 }),
    },
    schedulerService: { start() {}, stop() {} },
  });

  const summary = await orchestrator.run({ source: 'test' });

  assert.equal(summary.ok, true);
  assert.equal(summary.contactsSucceeded, 1);
  assert.deepEqual(captured.get('noexp@example.com'), [201, 202]);
});

test('orchestrator treats telegram success as delivering the digest when email fails', async () => {
  let markedCalled = false;
  const jobsRepo = {
    ...createMockJobsRepository({ jobs: [sampleJob(301)] }),
    markJobsNotified: async (payload) => {
      markedCalled = true;
      assert.deepEqual(payload, { jobs: [301] });
      return { jobs: 1 };
    },
  };

  const orchestrator = new MarketingNotificationOrchestrator({
    config: createMockConfig(),
    jobsRepository: jobsRepo,
    contactsRepository: createMockContactsRepository({
      contacts: [
        sampleContact('telegram@example.com', 7, '2', {
          telegramChatId: '12345',
        }),
      ],
    }),
    emailService: createMockEmailService({ shouldFail: true }),
    telegramService: createMockTelegramService({
      succeedContacts: new Set(['12345']),
    }),
    logger: {
      getFailureRate: async () => ({ failureRate: 0, failed: 0, total: 1 }),
    },
    schedulerService: { start() {}, stop() {} },
  });

  const summary = await orchestrator.run({ source: 'test' });

  assert.equal(summary.ok, true);
  assert.equal(summary.contactsSucceeded, 1);
  assert.equal(summary.contactsFailed, 0);
  assert.equal(summary.channels.email.failed, 1);
  assert.equal(summary.channels.telegram.succeeded, 1);
  assert.deepEqual(summary.jobsMarkedNotified, { jobs: [301] });
  assert.equal(markedCalled, true);
});


