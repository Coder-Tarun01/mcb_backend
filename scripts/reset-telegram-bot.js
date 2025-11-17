#!/usr/bin/env node

/**
 * Reset Telegram Bot Webhook
 * 
 * This script deletes the current webhook for the Telegram bot,
 * effectively resetting it so it stops receiving updates at the current endpoint.
 * 
 * Usage:
 *   node scripts/reset-telegram-bot.js
 * 
 * Environment Variables Required:
 *   MARKETING_TELEGRAM_BOT_TOKEN - Your Telegram bot token
 */

require('dotenv').config();
const axios = require('axios');

const BOT_TOKEN = process.env.MARKETING_TELEGRAM_BOT_TOKEN;

async function deleteWebhook() {
  if (!BOT_TOKEN) {
    console.error('❌ Error: MARKETING_TELEGRAM_BOT_TOKEN is not set in environment variables');
    console.error('   Please set it in your .env file or export it before running this script.');
    process.exit(1);
  }

  try {
    console.log('🔄 Resetting Telegram bot webhook...');
    
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`,
      {
        drop_pending_updates: true // Also drop pending updates
      }
    );

    if (response.data.ok) {
      console.log('✅ Telegram bot webhook has been successfully reset!');
      console.log('   The bot will no longer receive updates at the previous webhook URL.');
      console.log('   Pending updates have been dropped.');
      
      // Get webhook info to confirm
      const infoResponse = await axios.get(
        `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
      );
      
      if (infoResponse.data.ok) {
        const webhookInfo = infoResponse.data.result;
        if (!webhookInfo.url || webhookInfo.url === '') {
          console.log('   ✅ Webhook URL is now empty (confirmed reset)');
        } else {
          console.log(`   ⚠️  Webhook URL still exists: ${webhookInfo.url}`);
        }
      }
    } else {
      console.error('❌ Failed to reset webhook:', response.data.description || 'Unknown error');
      process.exit(1);
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Telegram API Error:', error.response.data);
      console.error('   Status:', error.response.status);
    } else if (error.request) {
      console.error('❌ Network Error: Could not reach Telegram API');
      console.error('   Please check your internet connection.');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

async function getWebhookInfo() {
  if (!BOT_TOKEN) {
    return;
  }

  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );

    if (response.data.ok) {
      const info = response.data.result;
      console.log('\n📋 Current Webhook Information:');
      console.log('   URL:', info.url || '(not set)');
      console.log('   Has custom certificate:', info.has_custom_certificate || false);
      console.log('   Pending update count:', info.pending_update_count || 0);
      if (info.last_error_date) {
        console.log('   Last error date:', new Date(info.last_error_date * 1000).toISOString());
        console.log('   Last error message:', info.last_error_message);
      }
      if (info.max_connections) {
        console.log('   Max connections:', info.max_connections);
      }
      if (info.allowed_updates && info.allowed_updates.length > 0) {
        console.log('   Allowed updates:', info.allowed_updates.join(', '));
      }
    }
  } catch (error) {
    console.error('⚠️  Could not fetch webhook info:', error.message);
  }
}

async function main() {
  console.log('🤖 Telegram Bot Webhook Reset Tool\n');
  
  // Show current webhook info before reset
  await getWebhookInfo();
  
  // Delete the webhook
  await deleteWebhook();
  
  // Show webhook info after reset
  console.log('\n');
  await getWebhookInfo();
  
  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

