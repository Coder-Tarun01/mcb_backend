#!/usr/bin/env node

/**
 * Set Telegram Bot Webhook
 * 
 * This script sets the webhook URL for your Telegram bot.
 * 
 * Usage:
 *   node scripts/set-telegram-webhook.js [webhook-url]
 * 
 * Environment Variables:
 *   MARKETING_TELEGRAM_BOT_TOKEN - Your Telegram bot token
 *   TELEGRAM_WEBHOOK_SECRET - Secret for webhook authentication
 *   TELEGRAM_WEBHOOK_URL - Default webhook URL (optional)
 */

require('dotenv').config();
const axios = require('axios');

const BOT_TOKEN = process.env.MARKETING_TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'Tanasvi@123';
const WEBHOOK_URL = process.argv[2] || process.env.TELEGRAM_WEBHOOK_URL;

async function setWebhook(webhookUrl) {
  if (!BOT_TOKEN) {
    console.error('❌ Error: MARKETING_TELEGRAM_BOT_TOKEN is not set in environment variables');
    process.exit(1);
  }

  if (!webhookUrl) {
    console.error('❌ Error: Webhook URL is required');
    console.error('   Usage: node scripts/set-telegram-webhook.js <webhook-url>');
    console.error('   Or set TELEGRAM_WEBHOOK_URL in .env file');
    process.exit(1);
  }

  // Add secret to URL if not already present
  const urlWithSecret = webhookUrl.includes('?') 
    ? `${webhookUrl}&secret=${encodeURIComponent(WEBHOOK_SECRET)}`
    : `${webhookUrl}?secret=${encodeURIComponent(WEBHOOK_SECRET)}`;

  try {
    console.log('🔄 Setting Telegram bot webhook...');
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    console.log(`🔐 Secret: ${WEBHOOK_SECRET ? '***' + WEBHOOK_SECRET.slice(-3) : '(not set)'}\n`);

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        url: urlWithSecret,
        drop_pending_updates: true,
        allowed_updates: ['message', 'edited_message']
      }
    );

    if (response.data.ok) {
      console.log('✅ Webhook has been successfully set!');
      
      // Get webhook info to confirm
      const infoResponse = await axios.get(
        `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
      );
      
      if (infoResponse.data.ok) {
        const webhookInfo = infoResponse.data.result;
        console.log('\n📋 Webhook Information:');
        console.log('   URL:', webhookInfo.url || '(not set)');
        console.log('   Has custom certificate:', webhookInfo.has_custom_certificate || false);
        console.log('   Pending update count:', webhookInfo.pending_update_count || 0);
        
        if (webhookInfo.last_error_date) {
          console.log('   ⚠️  Last error date:', new Date(webhookInfo.last_error_date * 1000).toISOString());
          console.log('   ⚠️  Last error message:', webhookInfo.last_error_message);
        }
        
        if (webhookInfo.url && webhookInfo.url.includes('103.154.233.210')) {
          console.log('\n⚠️  WARNING: Using IP address in webhook URL');
          console.log('   Telegram may have SSL certificate issues with IP addresses.');
          console.log('   Consider using a domain name with valid SSL certificate instead.');
        }
      }
    } else {
      console.error('❌ Failed to set webhook:', response.data.description || 'Unknown error');
      process.exit(1);
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Telegram API Error:', error.response.data);
      console.error('   Status:', error.response.status);
    } else if (error.request) {
      console.error('❌ Network Error: Could not reach Telegram API');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

async function main() {
  await setWebhook(WEBHOOK_URL);
  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

