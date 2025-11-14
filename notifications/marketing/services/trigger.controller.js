function createTriggerController({ orchestrator, jobsRepository, logger, config }) {
  if (!orchestrator) {
    throw new Error('Orchestrator is required to create trigger controller');
  }

  async function trigger(req, res) {
    try {
      const payload = typeof req.body === 'object' && req.body !== null ? req.body : {};
      const force = parseBoolean(payload.force, false);
      const limit = payload.limit ? Number(payload.limit) : undefined;

      const runPromise = orchestrator
        .run({
          source: 'manual-trigger',
          force,
          limit,
        })
        .then((summary) => {
          logger?.logSuccess?.({
            status: 'COMPLETED',
            source: 'manual-trigger',
            batchId: summary?.batchId,
            jobsQueried: summary?.jobsQueried,
            contactsSucceeded: summary?.contactsSucceeded,
            contactsFailed: summary?.contactsFailed,
          });
          return summary;
        })
        .catch((error) => {
          console.error('Marketing digest run failed', error);
          logger?.logFailure?.({
            status: 'FAILED',
            source: 'manual-trigger',
            error: error?.message ?? 'Unknown error',
          });
        });

      res.status(202).json({
        success: true,
        message: 'Marketing digest run started',
        data: {
          queued: true,
          force,
          limit,
        },
      });
      void runPromise;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to execute marketing notification trigger',
      });
    }
  }

  async function health(req, res) {
    try {
      if (config.healthToken) {
        const headerToken = extractToken(req);
        if (!headerToken || headerToken !== config.healthToken) {
          res.status(401).json({ success: false, error: 'Unauthorized' });
          return;
        }
      }

      const [healthSummary, pendingJobs, failureRate] = await Promise.all([
        orchestrator.getHealthSummary(),
        jobsRepository.countPendingJobs({ createdAfter: config.createdAfter }),
        logger.getFailureRate(24),
      ]);

      res.json({
        success: true,
        data: {
          last_run_at: healthSummary.lastRunAt,
          last_batch_id: healthSummary.lastBatchId,
          pending_jobs_count: pendingJobs,
          failure_rate_24h: Number(failureRate.failureRate.toFixed(2)),
          runs_24h: failureRate.total,
          failures_24h: failureRate.failed,
        },
      });
    } catch (error) {
      console.error('Marketing notifications health check failed', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Marketing notifications health check failed',
      });
    }
  }

  return {
    trigger,
    health,
  };
}

function parseBoolean(value, fallback = false) {
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

function extractToken(req) {
  const headerToken = req.headers['x-marketing-token'] || req.headers['x-marketing-health-token'];
  if (typeof headerToken === 'string') {
    return headerToken.trim();
  }
  if (Array.isArray(headerToken)) {
    return headerToken[0].trim();
  }

  if (req.query && typeof req.query.token === 'string') {
    return req.query.token.trim();
  }

  if (req.query && typeof req.query.healthToken === 'string') {
    return req.query.healthToken.trim();
  }

  if (req.body && typeof req.body.token === 'string') {
    return req.body.token.trim();
  }

  return undefined;
}

module.exports = {
  createTriggerController,
};


