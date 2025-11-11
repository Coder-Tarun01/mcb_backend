const cron = require('node-cron');

let cronTask;

function startMailScheduler(processNotifications, options = {}) {
  if (cronTask) {
    return cronTask;
  }

  if (typeof processNotifications !== 'function') {
    throw new Error('A processor function must be supplied to start the mail scheduler');
  }

  const schedule = options.cronExpression || '0 * * * *'; // top of every hour
  const timezone = options.timezone;

  cronTask = cron.schedule(
    schedule,
    async () => {
      try {
        await processNotifications({ source: 'cron' });
      } catch (error) {
        // Let the processor handle its own logging; swallow to keep cron alive
        console.error('[notifications] cron job failed', error);
      }
    },
    {
      scheduled: true,
      timezone,
    }
  );

  return cronTask;
}

function stopMailScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = undefined;
  }
}

function getCronTask() {
  return cronTask;
}

module.exports = {
  startMailScheduler,
  stopMailScheduler,
  getCronTask,
};

