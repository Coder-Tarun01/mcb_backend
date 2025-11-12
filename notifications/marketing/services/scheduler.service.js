const cron = require('node-cron');

function createSchedulerService({ orchestrator, config }) {
  if (!orchestrator) {
    throw new Error('Orchestrator instance is required for scheduler service');
  }

  let task = null;

  function start() {
    if (task || config.enabled === false) {
      return;
    }

    const expression = config.cronExpression || '*/30 * * * *';
    task = cron.schedule(
      expression,
      async () => {
        try {
          await orchestrator.run({ source: 'cron' });
        } catch (error) {
          // Logging is handled inside orchestrator
          if (process.env.NODE_ENV !== 'test') {
            console.error('[marketing.scheduler] scheduled run failed', error);
          }
        }
      },
      {
        scheduled: true,
        timezone: process.env.MARKETING_EMAIL_TZ || 'Asia/Kolkata',
      }
    );
  }

  function stop() {
    if (task) {
      task.stop();
      task = null;
    }
  }

  return {
    start,
    stop,
  };
}

module.exports = {
  createSchedulerService,
};


