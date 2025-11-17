require('dotenv').config();

const path = require('path');
const { createTelegramService } = require('./services/telegram.service');

async function main() {
  const botToken = process.env.MARKETING_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TEST_TELEGRAM_CHAT_ID;

  if (!botToken) {
    console.error('❌ Set MARKETING_TELEGRAM_BOT_TOKEN in your .env before running this test.');
    process.exit(1);
  }

  if (!chatId) {
    console.error('❌ Set TEST_TELEGRAM_CHAT_ID in your .env to a chat ID you control.');
    process.exit(1);
  }

  const telegramService = createTelegramService({
    config: {
      telegram: {
        enabled: true,
        dryRun: process.env.TELEGRAM_TEST_DRY_RUN === 'true',
        botToken,
        apiBaseUrl: process.env.MARKETING_TELEGRAM_API_BASE || 'https://api.telegram.org',
        timeoutMs: Number(process.env.MARKETING_TELEGRAM_TIMEOUT_MS || 15_000),
        concurrency: Number(process.env.MARKETING_TELEGRAM_CONCURRENCY || 1),
        batchSize: Number(process.env.MARKETING_TELEGRAM_BATCH_SIZE || 1),
        maxRetries: Number(process.env.MARKETING_TELEGRAM_MAX_RETRIES || 1),
        retryBackoffs: (process.env.MARKETING_TELEGRAM_RETRY_BACKOFF_MS || '2000')
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value) && value > 0),
        disableLinkPreview: process.env.MARKETING_TELEGRAM_DISABLE_LINK_PREVIEW !== 'false',
      },
    },
  });

  const summary = await telegramService.sendDigestTelegrams({
    contacts: [
      {
        id: 1,
        fullName: process.env.TEST_TELEGRAM_CONTACT_NAME || 'Demo Contact',
        telegramChatId: chatId,
      },
    ],
    jobs: [
      {
        id: 'job-demo',
        title: process.env.TEST_TELEGRAM_JOB_TITLE || 'Sample Role',
        companyName: process.env.TEST_TELEGRAM_JOB_COMPANY || 'MyCareerBuild',
        location: process.env.TEST_TELEGRAM_JOB_LOCATION || 'Remote',
        applyUrl:
          process.env.TEST_TELEGRAM_JOB_LINK ||
          'https://mycareerbuild.com/jobs/sample',
      },
    ],
    jobsByContact: null,
    batchId: `manual-telegram-test-${Date.now()}`,
  });

  console.log('✅ Telegram test summary:', summary);
  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Telegram test failed:', error);
  process.exit(1);
});

