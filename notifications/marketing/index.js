const crypto = require('crypto');
const { getConfig, refreshConfig } = require('./config');
const marketingLogger = require('./logger');
const { createJobsRepository } = require('./repositories/jobs.repository');
const { createContactsRepository } = require('./repositories/contacts.repository');
const { createEmailService } = require('./services/email.service');
const { createSchedulerService } = require('./services/scheduler.service');
const { createTriggerController } = require('./services/trigger.controller');

class MarketingNotificationOrchestrator {
  constructor({
    config = getConfig(),
    jobsRepository = createJobsRepository(),
    contactsRepository = createContactsRepository(),
    emailService = null,
    schedulerService = null,
    logger = marketingLogger,
  } = {}) {
    this.config = config;
    this.jobsRepository = jobsRepository;
    this.contactsRepository = contactsRepository;
    this.emailService = emailService || createEmailService({ config });
    this.logger = logger;
    this.schedulerService =
      schedulerService ||
      createSchedulerService({
        orchestrator: this,
        config,
      });

    this.state = {
      lastRunAt: null,
      lastBatchId: null,
      lastSummary: null,
      running: false,
    };
    this.schedulerStarted = false;
  }

  getConfig() {
    return this.config;
  }

  async run(options = {}) {
    if (!this.config.enabled) {
      return {
        ok: false,
        skipped: true,
        reason: 'Marketing notifications disabled via configuration',
        source: options.source || 'manual',
      };
    }

    if (this.state.running && !options.force) {
      return {
        ok: false,
        skipped: true,
        reason: 'A marketing notification run is already in progress',
        source: options.source || 'manual',
      };
    }

    const limit = Number.isFinite(options.limit) && options.limit > 0 ? Number(options.limit) : this.config.jobFetchLimit;
    const source = options.source || 'manual';
    const batchId = this.generateBatchId();
    const startedAt = new Date();
    this.state.running = true;

    const summary = {
      ok: false,
      source,
      batchId,
      startedAt: startedAt.toISOString(),
      finishedAt: null,
      jobsQueried: 0,
      jobsIncluded: 0,
      contactsAttempted: 0,
      contactsSucceeded: 0,
      contactsFailed: 0,
      errors: [],
      skipped: false,
    };

    try {
      const jobs = await this.jobsRepository.fetchPendingJobs({
        limit,
        createdAfter: this.config.createdAfter,
      });
      summary.jobsQueried = jobs.length;

      if (jobs.length === 0 && !options.force) {
        summary.skipped = true;
        summary.reason = 'No pending jobs found';
        summary.ok = true;
        return summary;
      }

      // TODO: Implement segmentation based on contact branch/experience before slicing digest.
      const digestJobs = jobs.slice(0, this.config.digestSize);
      summary.jobsIncluded = digestJobs.length;

      if (digestJobs.length === 0) {
        summary.skipped = true;
        summary.reason = 'No jobs to include in digest after applying limits';
        summary.ok = true;
        return summary;
      }

      const contacts = await this.contactsRepository.fetchContacts();
      summary.contactsAttempted = contacts.length;

      if (contacts.length === 0) {
        summary.skipped = true;
        summary.reason = 'No marketing contacts available';
        summary.ok = false;
        summary.errors.push({ stage: 'contacts', message: 'No marketing contacts found' });
        return summary;
      }

      const emailResult = await this.emailService.sendDigestEmails({
        contacts,
        jobs: digestJobs,
        batchId,
      });

      summary.contactsSucceeded = emailResult.succeeded;
      summary.contactsFailed = emailResult.failed;
      summary.errors.push(...emailResult.failures.map((failure) => ({ stage: 'email', contact: failure.contact, message: failure.error })));

      if (emailResult.succeeded > 0) {
        const jobIdsBySource = digestJobs.reduce(
          (acc, job) => {
            acc[job.source] = acc[job.source] || [];
            acc[job.source].push(job.id);
            return acc;
          },
          {}
        );

        await this.jobsRepository.markJobsNotified(jobIdsBySource);
        summary.jobsMarkedNotified = jobIdsBySource;
      } else {
        summary.jobsMarkedNotified = {};
      }

      summary.ok = emailResult.failed === 0;

      await this.evaluateAlerts({ summary });

      return summary;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      summary.errors.push({ stage: 'orchestrator', message: err.message });
      summary.ok = false;
      return summary;
    } finally {
      const finishedAt = new Date();
      summary.finishedAt = finishedAt.toISOString();
      this.state.lastRunAt = finishedAt.toISOString();
      this.state.lastBatchId = batchId;
      this.state.lastSummary = summary;
      this.state.running = false;
    }
  }

  async evaluateAlerts({ summary }) {
    if (!summary) {
      return;
    }

    const pendingJobs = await this.jobsRepository.countPendingJobs({
      createdAfter: this.config.createdAfter,
    });

    const failureRate = await this.logger.getFailureRate(24);

    if (pendingJobs > this.config.alert.backlogThreshold) {
      console.warn(
        `[marketing.notifications] Pending jobs backlog ${pendingJobs} exceeds threshold ${this.config.alert.backlogThreshold}`
      );
    }

    if (failureRate.failureRate > this.config.alert.failureRateThreshold) {
      console.warn(
        `[marketing.notifications] Failure rate ${failureRate.failureRate.toFixed(2)}% exceeds threshold ${this.config.alert.failureRateThreshold}%`
      );
    }

    return {
      pendingJobs,
      failureRate,
    };
  }

  startScheduler() {
    if (this.schedulerStarted) {
      return;
    }
    if (this.schedulerService && typeof this.schedulerService.start === 'function') {
      this.schedulerService.start();
      this.schedulerStarted = true;
    }
  }

  stopScheduler() {
    if (this.schedulerService && typeof this.schedulerService.stop === 'function') {
      this.schedulerService.stop();
    }
    this.schedulerStarted = false;
  }

  async getHealthSummary() {
    return {
      lastRunAt: this.state.lastRunAt,
      lastBatchId: this.state.lastBatchId,
      lastSummary: this.state.lastSummary,
      running: this.state.running,
    };
  }

  refreshConfig() {
    this.config = refreshConfig();
  }

  generateBatchId() {
    return `mkt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

const GLOBAL_KEY = '__mcbMarketingOrchestrator__';

let orchestratorInstance = globalThis[GLOBAL_KEY];

if (!orchestratorInstance) {
  orchestratorInstance = new MarketingNotificationOrchestrator();
  globalThis[GLOBAL_KEY] = orchestratorInstance;
}

orchestratorInstance.startScheduler();

function createDefaultTriggerController() {
  return createTriggerController({
    orchestrator: orchestratorInstance,
    jobsRepository: orchestratorInstance.jobsRepository,
    logger: marketingLogger,
    config: orchestratorInstance.config,
  });
}

module.exports = {
  MarketingNotificationOrchestrator,
  orchestrator: orchestratorInstance,
  startScheduler: () => orchestratorInstance.startScheduler(),
  stopScheduler: () => orchestratorInstance.stopScheduler(),
  runNow: (payload) => orchestratorInstance.run(payload),
  getHealthSummary: () => orchestratorInstance.getHealthSummary(),
  createTriggerController: createDefaultTriggerController,
  getConfig: () => orchestratorInstance.getConfig(),
};


