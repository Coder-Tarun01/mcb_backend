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

function createMockEmailService({ shouldFail = false, failContacts = new Set() } = {}) {
  return {
    async sendDigestEmails({ contacts, jobs, batchId }) {
      const failures = [];
      const successes = [];

      for (const contact of contacts) {
        if (shouldFail || failContacts.has(contact.email)) {
          failures.push({ contact: contact.email, error: 'SMTP failure', batchId, jobIds: jobs.map((job) => job.id) });
        } else {
          successes.push({ contact: contact.email, batchId, jobIds: jobs.map((job) => job.id) });
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

const sampleContact = (email, id) => ({
  id,
  fullName: `Contact ${id}`,
  email,
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
    logger: {
      getFailureRate: async () => ({ failureRate: 0, failed: 0, total: 1 }),
    },
    schedulerService: { start() {}, stop() {} },
  });

  const summary = await orchestrator.run({ source: 'test' });

  assert.equal(summary.jobsIncluded, 1);
  assert.equal(summary.contactsAttempted, 2);
});


