#!/usr/bin/env node

/**
 * Clean Telegram Bot
 * 
 * This script performs a complete cleanup of your Telegram bot:
 * - Deletes webhook
 * - Drops all pending updates
 * - Clears bot commands (optional)
 * - Shows bot information
 * 
 * Usage:
 *   node scripts/clean-telegram-bot.js [--clear-commands]
 * 
 * Environment Variables Required:
 *   MARKETING_TELEGRAM_BOT_TOKEN - Your Telegram bot token
 */

require('dotenv').config();
const axios = require('axios');

const BOT_TOKEN = process.env.MARKETING_TELEGRAM_BOT_TOKEN;
const CLEAR_COMMANDS = process.argv.includes('--clear-commands') || process.argv.includes('-c');

async function getBotInfo() {
  if (!BOT_TOKEN) {
    return null;
  }

  try {
    const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    if (response.data.ok) {
      return response.data.result;
    }
  } catch (error) {
    console.error('   ❌ Error fetching bot info:', error.message);
  }
  return null;
}

async function getWebhookInfo() {
  if (!BOT_TOKEN) {
    return null;
  }

  try {
    const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    if (response.data.ok) {
      return response.data.result;
    }
  } catch (error) {
    console.error('   ❌ Error fetching webhook info:', error.message);
  }
  return null;
}

async function deleteWebhook() {
  if (!BOT_TOKEN) {
    console.error('❌ Error: MARKETING_TELEGRAM_BOT_TOKEN is not set');
    return false;
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`,
      {
        drop_pending_updates: true
      }
    );

    if (response.data.ok) {
      console.log('   ✅ Webhook deleted and pending updates dropped');
      return true;
    } else {
      console.log('   ⚠️  Failed to delete webhook:', response.data.description);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error deleting webhook:', error.message);
    return false;
  }
}

async function clearPendingUpdates() {
  if (!BOT_TOKEN) {
    return false;
  }

  try {
    // Get pending updates count
    const webhookInfo = await getWebhookInfo();
    const pendingCount = webhookInfo?.pending_update_count || 0;

    if (pendingCount > 0) {
      // Delete webhook with drop_pending_updates to clear them
      await deleteWebhook();
      console.log(`   ✅ Cleared ${pendingCount} pending update(s)`);
      return true;
    } else {
      console.log('   ℹ️  No pending updates to clear');
      return true;
    }
  } catch (error) {
    console.error('   ❌ Error clearing pending updates:', error.message);
    return false;
  }
}

async function clearBotCommands() {
  if (!BOT_TOKEN) {
    return false;
  }

  try {
    // Clear commands for all scopes
    const scopes = [
      { type: 'default' },
      { type: 'all_private_chats' },
      { type: 'all_group_chats' },
      { type: 'all_chat_administrators' }
    ];

    let cleared = 0;
    for (const scope of scopes) {
      try {
        const response = await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/deleteMyCommands`,
          { scope }
        );
        if (response.data.ok) {
          cleared++;
        }
      } catch (e) {
        // Some scopes might not exist, that's okay
      }
    }

    if (cleared > 0) {
      console.log(`   ✅ Cleared bot commands (${cleared} scope(s))`);
    } else {
      console.log('   ℹ️  No bot commands to clear');
    }
    return true;
  } catch (error) {
    console.error('   ❌ Error clearing bot commands:', error.message);
    return false;
  }
}

async function showCurrentState() {
  console.log('\n📊 Current Bot State:\n');

  // Bot Info
  console.log('1️⃣ Bot Information:');
  const botInfo = await getBotInfo();
  if (botInfo) {
    console.log(`   Name: ${botInfo.first_name}${botInfo.username ? ` (@${botInfo.username})` : ''}`);
    console.log(`   ID: ${botInfo.id}`);
    console.log(`   Can join groups: ${botInfo.can_join_groups || false}`);
    console.log(`   Can read all group messages: ${botInfo.can_read_all_group_messages || false}`);
    console.log(`   Supports inline queries: ${botInfo.supports_inline_queries || false}`);
  } else {
    console.log('   ❌ Could not fetch bot information');
  }

  // Webhook Info
  console.log('\n2️⃣ Webhook Information:');
  const webhookInfo = await getWebhookInfo();
  if (webhookInfo) {
    console.log(`   URL: ${webhookInfo.url || '(not set)'}`);
    console.log(`   Has custom certificate: ${webhookInfo.has_custom_certificate || false}`);
    console.log(`   Pending updates: ${webhookInfo.pending_update_count || 0}`);
    if (webhookInfo.last_error_date) {
      console.log(`   ⚠️  Last error: ${new Date(webhookInfo.last_error_date * 1000).toISOString()}`);
      console.log(`   ⚠️  Error message: ${webhookInfo.last_error_message}`);
    }
    if (webhookInfo.max_connections) {
      console.log(`   Max connections: ${webhookInfo.max_connections}`);
    }
  } else {
    console.log('   ❌ Could not fetch webhook information');
  }
}

async function cleanBot() {
  console.log('🧹 Telegram Bot Cleanup Tool\n');

  if (!BOT_TOKEN) {
    console.error('❌ Error: MARKETING_TELEGRAM_BOT_TOKEN is not set in environment variables');
    console.error('   Please set it in your .env file before running this script.');
    process.exit(1);
  }

  // Show current state
  await showCurrentState();

  console.log('\n🧹 Starting cleanup...\n');

  // Step 1: Delete webhook and clear pending updates
  console.log('1️⃣ Deleting webhook and clearing pending updates...');
  const webhookDeleted = await deleteWebhook();

  // Step 2: Clear pending updates (if webhook deletion didn't handle it)
  if (!webhookDeleted) {
    console.log('\n2️⃣ Clearing pending updates...');
    await clearPendingUpdates();
  }

  // Step 3: Clear bot commands (if requested)
  if (CLEAR_COMMANDS) {
    console.log('\n3️⃣ Clearing bot commands...');
    await clearBotCommands();
  } else {
    console.log('\n3️⃣ Skipping bot commands (use --clear-commands to clear them)');
  }

  // Show final state
  console.log('\n📊 Final State:\n');
  await showCurrentState();

  console.log('\n✨ Cleanup complete!');
  console.log('\n💡 Next steps:');
  console.log('   - Set a new webhook when ready: npm run telegram:set <url>');
  console.log('   - Test webhook endpoint: npm run telegram:test');
}

async function main() {
  await cleanBot();
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

