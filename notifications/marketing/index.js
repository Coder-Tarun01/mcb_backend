const crypto = require('crypto');
const { getConfig, refreshConfig } = require('./config');
const marketingLogger = require('./logger');
const { createJobsRepository } = require('./repositories/jobs.repository');
const { createContactsRepository } = require('./repositories/contacts.repository');
const { createDigestLogRepository } = require('./repositories/digestLogs.repository');
const { createEmailService } = require('./services/email.service');
const { createSchedulerService } = require('./services/scheduler.service');
const { createTelegramService } = require('./services/telegram.service');
const { createTriggerController } = require('./services/trigger.controller');

class MarketingNotificationOrchestrator {
  constructor({
    config = getConfig(),
    jobsRepository = null,
    contactsRepository = null,
    emailService = null,
    telegramService = null,
    schedulerService = null,
    logger = marketingLogger,
  } = {}) {
    this.config = config;
    this.jobsRepository = jobsRepository || createJobsRepository();
    this.contactsRepository = contactsRepository || createContactsRepository({ maxContacts: config.contactFetchLimit });
    this.digestLogRepository = createDigestLogRepository();
    this.emailService = emailService || createEmailService({ config, digestLogRepository: this.digestLogRepository });
    this.telegramService = telegramService || createTelegramService({ config });
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
      contactsTotal: 0,
      contactsSkipped: 0,
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

      const contacts = await this.contactsRepository.fetchContacts();

      if (contacts.length === 0) {
        summary.skipped = true;
        summary.reason = 'No marketing contacts available';
        summary.ok = false;
        summary.errors.push({ stage: 'contacts', message: 'No marketing contacts found' });
        return summary;
      }

      const segmentation = buildPersonalizedDigests({
        contacts,
        jobs,
        digestSize: this.config.digestSize,
      });

      summary.jobsIncluded = segmentation.uniqueJobCount;
      summary.contactsAttempted = segmentation.contactsToSend.length;
      summary.contactsTotal = contacts.length;
      summary.contactsSkipped = segmentation.skippedContacts.length;

      if (segmentation.contactsToSend.length === 0) {
        summary.skipped = true;
        summary.reason = segmentation.reason || 'No jobs matched subscriber preferences';
        summary.ok = true;
        if (segmentation.skippedContacts.length > 0) {
          summary.errors.push({ stage: 'segmentation', message: `No matching jobs for ${segmentation.skippedContacts.length} contact(s)` });
        }
        return summary;
      }

      const emailResult = await this.emailService.sendDigestEmails({
        contacts: segmentation.contactsToSend,
        jobsByContact: segmentation.contactJobsMap,
        batchId,
      });

      const telegramResult =
        this.telegramService && typeof this.telegramService.sendDigestTelegrams === 'function'
          ? await this.telegramService.sendDigestTelegrams({
              contacts: segmentation.contactsToSend,
              jobsByContact: segmentation.contactJobsMap,
              batchId,
            })
          : {
              attempted: 0,
              succeeded: 0,
              failed: 0,
              failures: [],
              successes: [],
              skipped: segmentation.contactsToSend.length,
              reason: 'Telegram service not configured',
            };

      const successfulContactIds = new Set();
      const trackSuccess = (result) => {
        if (!result) {
          return;
        }
        if (result.contactId !== undefined && result.contactId !== null) {
          successfulContactIds.add(result.contactId);
        } else if (result.contact) {
          successfulContactIds.add(result.contact);
        }
      };

      emailResult.successes.forEach(trackSuccess);
      telegramResult.successes.forEach(trackSuccess);

      summary.contactsSucceeded = successfulContactIds.size;
      summary.contactsFailed = Math.max(0, summary.contactsAttempted - summary.contactsSucceeded);
      const formatFailure = (failure, stage) => ({
        stage,
        contact: failure?.contact ?? null,
        message: failure?.error || 'Unknown error',
      });
      summary.errors.push(
        ...emailResult.failures.map((failure) => formatFailure(failure, 'email')),
        ...telegramResult.failures.map((failure) => formatFailure(failure, 'telegram'))
      );

      summary.channels = {
        email: {
          attempted: emailResult.attempted,
          succeeded: emailResult.succeeded,
          failed: emailResult.failed,
        },
        telegram: {
          attempted: telegramResult.attempted,
          succeeded: telegramResult.succeeded,
          failed: telegramResult.failed,
          skipped: telegramResult.skipped ?? 0,
          reason: telegramResult.reason || null,
        },
      };

      const combinedSuccesses = [...emailResult.successes, ...telegramResult.successes];
      if (combinedSuccesses.length > 0) {
        const jobIdsBySource = aggregateJobsBySource(combinedSuccesses, segmentation.contactJobsMap);
        if ((jobIdsBySource.jobs && jobIdsBySource.jobs.length > 0) || (jobIdsBySource.aijobs && jobIdsBySource.aijobs.length > 0)) {
          await this.jobsRepository.markJobsNotified(jobIdsBySource);
          summary.jobsMarkedNotified = jobIdsBySource;
        } else {
          summary.jobsMarkedNotified = {};
        }
      } else {
        summary.jobsMarkedNotified = {};
      }

      summary.ok = summary.contactsFailed === 0;

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

function buildPersonalizedDigests({ contacts, jobs, digestSize }) {
  const digestLimitRaw = Number(digestSize);
  const digestLimit = Number.isFinite(digestLimitRaw) && digestLimitRaw > 0 ? Math.floor(digestLimitRaw) : 5;
  const normalizedLimit = Math.max(1, digestLimit);

  const allJobs = Array.isArray(jobs) ? jobs : [];
  const allAiJobs = allJobs.filter((job) => job && job.source === 'aijobs');

  const contactJobsMap = new Map();
  const skippedContacts = [];
  const uniqueJobKeys = new Set();

  console.log(`[marketing.digest] Building personalized digests for ${contacts.length} contact(s) from ${allJobs.length} job(s)`);

  for (const contact of contacts) {
    const contactBranch = contact?.branch || 'N/A';
    const contactExperience = contact?.experience || 'N/A';
    const contactEmail = contact?.email || 'N/A';
    
    console.log(`[marketing.digest] Processing contact: ${contact.fullName || 'N/A'} (${contactEmail})`);
    console.log(`[marketing.digest]   Branch: ${contactBranch}, Experience: ${contactExperience}`);

    const selection = selectJobsForContact(contact, {
      allJobs,
      fresherJobs: allJobs.filter(isFresherJob),
      aiJobs: allAiJobs,
      digestLimit: normalizedLimit,
    });

    if (!selection || selection.length === 0) {
      console.log(`[marketing.digest]   ❌ No matching jobs found - skipping contact`);
      skippedContacts.push(contact);
      continue;
    }

    const trimmed = selection.slice(0, normalizedLimit);
    contactJobsMap.set(contact.id, trimmed);

    console.log(`[marketing.digest]   ✅ Selected ${trimmed.length} job(s) for this contact:`);
    trimmed.forEach((job, index) => {
      console.log(`[marketing.digest]     ${index + 1}. ${job.title || 'N/A'} @ ${job.company || 'N/A'} (${job.id})`);
    });

    for (const job of trimmed) {
      if (!job || job.id === undefined || job.id === null) {
        continue;
      }
      uniqueJobKeys.add(`${job.source || 'jobs'}:${job.id}`);
    }
  }

  console.log(`[marketing.digest] Summary: ${contactJobsMap.size} contact(s) will receive digests, ${skippedContacts.length} skipped, ${uniqueJobKeys.size} unique job(s) total`);

  return {
    contactsToSend: contacts.filter((contact) => contactJobsMap.has(contact.id)),
    contactJobsMap,
    skippedContacts,
    uniqueJobCount: uniqueJobKeys.size,
    reason: 'No jobs matched subscriber preferences',
  };
}

function selectJobsForContact(contact, context) {
  const allJobs = Array.isArray(context.allJobs) ? context.allJobs : [];
  const fresherJobs = Array.isArray(context.fresherJobs) ? context.fresherJobs : [];
  const digestLimit = Math.max(1, Number(context.digestLimit) || 1);
  const branchTokens = normalizeBranchTokens(contact?.branch);
  const contactRange = parseExperienceRange(contact?.experience);
  const preferFresher = isFresherRange(contactRange);

  const strategies = [];
  const strategyNames = [];

  // Strategy 1: Fresher jobs with both branch AND experience match (strictest for freshers)
  if (preferFresher && fresherJobs.length > 0) {
    strategies.push(() =>
      applyFilters(fresherJobs, {
        branchTokens,
        experienceRange: contactRange,
      })
    );
    strategyNames.push('fresher+branch+experience');

    // Strategy 2: Fresher jobs with branch match only
    strategies.push(() =>
      applyFilters(fresherJobs, {
        branchTokens,
      })
    );
    strategyNames.push('fresher+branch');

    // Strategy 3: Fresher jobs with experience match only
    strategies.push(() =>
      applyFilters(fresherJobs, {
        experienceRange: contactRange,
      })
    );
    strategyNames.push('fresher+experience');

    // Strategy 4: All fresher jobs (if no branch/experience filters)
    if (branchTokens.length === 0 && !contactRange) {
      strategies.push(() => [...fresherJobs]);
      strategyNames.push('fresher-all');
    }
  }

  // Strategy 5: All jobs with both branch AND experience match (strictest)
  strategies.push(() =>
    applyFilters(allJobs, {
      branchTokens,
      experienceRange: contactRange,
    })
  );
  strategyNames.push('all+branch+experience');

  // Strategy 6: All jobs with branch match only
  if (branchTokens.length > 0) {
    strategies.push(() =>
      applyFilters(allJobs, {
        branchTokens,
      })
    );
    strategyNames.push('all+branch');
  }

  // Strategy 7: All jobs with experience match only
  if (contactRange) {
    strategies.push(() =>
      applyFilters(allJobs, {
        experienceRange: contactRange,
      })
    );
    strategyNames.push('all+experience');
  }

  // REMOVED: Final fallback that sends all jobs to everyone
  // This was causing same jobs to be sent to all users
  // If no jobs match the user's profile, they should not receive any jobs

  for (let i = 0; i < strategies.length; i++) {
    const getCandidates = strategies[i];
    const strategyName = strategyNames[i] || `strategy-${i + 1}`;
    
    if (typeof getCandidates !== 'function') {
      continue;
    }
    
    const candidates = uniqueJobs(getCandidates()).filter(Boolean);
    if (candidates.length > 0) {
      console.log(`[marketing.digest]   Match found using strategy: ${strategyName} (${candidates.length} candidate(s))`);
      return candidates.slice(0, digestLimit);
    }
  }

  console.log(`[marketing.digest]   No matches found after trying ${strategies.length} strategy/strategies`);
  return [];
}

function filterJobsByToken(jobs, token) {
  if (!token) {
    return [];
  }
  return jobs.filter((job) => matchesToken(job, token));
}

function matchesToken(job, normalizedToken) {
  if (!normalizedToken) {
    return false;
  }
  const haystacks = collectJobTokens(job);
  
  // Direct match: check if token is in any haystack
  if (haystacks.some((value) => value.includes(normalizedToken))) {
    return true;
  }
  
  // Reverse match: check if any haystack is in the token (for abbreviations)
  // e.g., "cse" should match "computer science engineering"
  if (haystacks.some((value) => normalizedToken.includes(value) && value.length > 3)) {
    return true;
  }
  
  // Branch abbreviation mapping
  const branchMap = getBranchMapping();
  const expandedTokens = branchMap[normalizedToken] || [];
  if (expandedTokens.length > 0) {
    return expandedTokens.some(expandedToken => 
      haystacks.some((value) => value.includes(expandedToken))
    );
  }
  
  return false;
}

function getBranchMapping() {
  return {
    'cse': ['computer science', 'computer science engineering', 'cs', 'cse', 'computer', 'software'],
    'cs': ['computer science', 'computer science engineering', 'cse', 'cs', 'computer', 'software'],
    'it': ['information technology', 'it', 'information', 'technology'],
    'ece': ['electronics', 'electronics communication', 'ece', 'electronic'],
    'eee': ['electrical', 'electrical engineering', 'eee', 'electrical and electronics'],
    'me': ['mechanical', 'mechanical engineering', 'me'],
    'ce': ['civil', 'civil engineering', 'ce'],
    'mca': ['master of computer applications', 'mca', 'computer applications'],
    'bca': ['bachelor of computer applications', 'bca', 'computer applications'],
    'btech': ['bachelor of technology', 'btech', 'b.tech', 'engineering'],
    'mtech': ['master of technology', 'mtech', 'm.tech'],
  };
}

function collectJobTokens(job) {
  const tokens = [];
  const push = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized.length > 0) {
        tokens.push(normalized);
      }
    }
  };

  push(job?.jobType);
  push(job?.category);
  push(job?.locationType);
  push(job?.title);
  push(job?.experience);
  push(job?.experienceLevel);
  push(job?.educationRequired);
  push(job?.description);
  push(job?.companyName);
  push(job?.company);

  if (Array.isArray(job?.skills)) {
    job.skills.forEach(push);
  } else if (job?.skills && typeof job.skills === 'string') {
    // Handle skills as comma-separated string
    job.skills.split(',').forEach(skill => push(skill.trim()));
  }

  return tokens;
}

function isFresherJob(job) {
  if (!job) {
    return false;
  }
  
  // Check experienceLevel field directly
  const experienceLevel = job.experienceLevel || job.experience;
  if (experienceLevel) {
    const expLower = String(experienceLevel).trim().toLowerCase();
    if (expLower.includes('fresher') || expLower.includes('entry') || expLower === '0' || expLower === '0-0' || expLower === '0-1') {
      return true;
    }
    
    // Check if parsed experience range is 0-1 years
    const parsedRange = parseExperienceRange(experienceLevel);
    if (parsedRange && parsedRange.min <= 0 && parsedRange.max <= 1) {
      return true;
    }
  }
  
  // Fallback to token-based check
  const tokens = collectJobTokens(job);
  return tokens.some((token) => token.includes('fresher') || token.includes('entry'));
}

function normalizeBranchTokens(branch) {
  if (!branch || typeof branch !== 'string') {
    return [];
  }
  return branch
    .split(/[,/&\s]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
}

function filterByBranch(jobs, branchTokens) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return [];
  }
  
  // If no branch tokens, return all jobs (no branch filtering)
  if (!Array.isArray(branchTokens) || branchTokens.length === 0) {
    return jobs;
  }
  
  const seen = new Set();
  const results = [];

  for (const job of jobs) {
    if (!job || seen.has(jobKey(job))) {
      continue;
    }
    const matchesBranch = branchTokens.some((token) => matchesToken(job, token));
    if (matchesBranch) {
      seen.add(jobKey(job));
      results.push(job);
    }
  }
  return results;
}

function filterByExperience(jobs, experienceRange) {
  if (!Array.isArray(jobs) || jobs.length === 0 || !experienceRange) {
    return Array.isArray(jobs) ? [...jobs] : [];
  }
  return jobs.filter((job) => experienceMatches(experienceRange, job));
}

function applyFilters(jobs, { branchTokens = [], experienceRange = null } = {}) {
  const base = Array.isArray(jobs) ? jobs.filter(Boolean) : [];
  if (base.length === 0) {
    return [];
  }

  let working = base;
  if (Array.isArray(branchTokens) && branchTokens.length > 0) {
    const branchMatches = filterByBranch(working, branchTokens);
    if (branchMatches.length === 0) {
      return [];
    }
    working = branchMatches;
  }

  if (experienceRange) {
    const experienceMatchesList = filterByExperience(working, experienceRange);
    if (experienceMatchesList.length === 0) {
      return [];
    }
    working = experienceMatchesList;
  }

  return working;
}

function isFresherRange(range) {
  if (!range) {
    return false;
  }
  const min = Number.isFinite(range.min) ? range.min : 0;
  const max = Number.isFinite(range.max) ? range.max : Infinity;
  return min <= 0 && max <= 1;
}

function uniqueJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (const job of jobs) {
    if (!job) {
      continue;
    }
    const key = jobKey(job);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(job);
  }
  return result;
}

function parseExperienceRange(raw) {
  if (!raw) {
    return null;
  }

  // Handle numeric values directly
  if (typeof raw === 'number') {
    if (raw === 0) {
      return { min: 0, max: 1 };
    }
    return { min: raw, max: raw };
  }

  if (typeof raw !== 'string') {
    return null;
  }

  const value = raw.trim();
  if (!value) {
    return null;
  }

  const lower = value.toLowerCase();
  if (lower.includes('fresher') || lower.includes('entry')) {
    return { min: 0, max: 1 };
  }

  // Handle single "0" as fresher
  if (value === '0' || lower === '0') {
    return { min: 0, max: 1 };
  }

  // Extract numeric values
  const numberMatches = lower.match(/(\d+(?:\.\d+)?)/g);
  if (!numberMatches || numberMatches.length === 0) {
    return null;
  }

  const numbers = numberMatches.map((n) => Number.parseFloat(n)).filter((n) => Number.isFinite(n));
  if (numbers.length === 0) {
    return null;
  }

  const hasPlus = /(\+|above|more than|\bupwards\b|\bminimum\b)/.test(lower);
  const hasMaxHint = /(upto|up to|less than|max|maximum)/.test(lower);

  if (numbers.length >= 2) {
    const [first, second] = numbers;
    const min = Math.min(first, second);
    const max = Math.max(first, second);
    // If range is 0-0 or 0-1, treat as fresher
    if (min === 0 && max <= 1) {
      return { min: 0, max: 1 };
    }
    return { min, max };
  }

  const single = numbers[0];
  // Single 0 means fresher
  if (single === 0) {
    return { min: 0, max: 1 };
  }
  if (hasPlus) {
    return { min: single, max: Infinity };
  }
  if (hasMaxHint) {
    return { min: 0, max: single };
  }

  return { min: single, max: single };
}

function experienceMatches(contactRange, job) {
  const jobRange = extractJobExperienceRange(job);
  if (!jobRange) {
    // If the job has no experience data, treat it as a match
    return true;
  }

  return rangesOverlap(contactRange, jobRange);
}

function extractJobExperienceRange(job) {
  if (!job) {
    return null;
  }
  
  // Prioritize experienceLevel field, then experience field
  const jobExperience =
    job.experienceLevel ||
    job.experience ||
    job.jobExperience ||
    (Array.isArray(job.requirements) ? job.requirements.find((req) => typeof req === 'string' && req.toLowerCase().includes('experience')) : null);

  if (!jobExperience) {
    return null;
  }

  // If it's already a parsed range object, return it
  if (typeof jobExperience === 'object' && jobExperience !== null && 'min' in jobExperience && 'max' in jobExperience) {
    return jobExperience;
  }

  return parseExperienceRange(jobExperience);
}

function rangesOverlap(a, b) {
  if (!a || !b) {
    return false;
  }
  const aMin = Number.isFinite(a.min) ? a.min : 0;
  const aMax = Number.isFinite(a.max) ? a.max : Infinity;
  const bMin = Number.isFinite(b.min) ? b.min : 0;
  const bMax = Number.isFinite(b.max) ? b.max : Infinity;
  return aMin <= bMax && bMin <= aMax;
}

function normalizeToken(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function aggregateJobsBySource(successes, contactJobsMap) {
  const jobsSet = new Set();
  const aiJobsSet = new Set();

  if (Array.isArray(successes)) {
    for (const result of successes) {
      if (!result || !result.contactId) {
        continue;
      }
      const jobList = contactJobsMap.get(result.contactId);
      if (!Array.isArray(jobList) || jobList.length === 0) {
        continue;
      }
      for (const job of jobList) {
        if (!job || job.id === undefined || job.id === null) {
          continue;
        }
        if (job.source === 'aijobs') {
          aiJobsSet.add(job.id);
        } else {
          jobsSet.add(job.id);
        }
      }
    }
  }

  const payload = {};
  if (jobsSet.size > 0) {
    payload.jobs = Array.from(jobsSet);
  }
  if (aiJobsSet.size > 0) {
    payload.aijobs = Array.from(aiJobsSet);
  }
  return payload;
}

function jobKey(job) {
  const source = job && job.source ? String(job.source) : 'jobs';
  const id = job && job.id !== undefined && job.id !== null ? String(job.id) : '';
  return `${source}:${id}`;
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


