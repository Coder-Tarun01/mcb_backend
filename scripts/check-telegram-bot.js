#!/usr/bin/env node

/**
 * Check Telegram Bot Status
 * 
 * This script checks if the bot is properly configured and receiving messages.
 */

require('dotenv').config();
const axios = require('axios');

const BOT_TOKEN = process.env.MARKETING_TELEGRAM_BOT_TOKEN || '8315129812:AAF8p0aeDxSY1M7aR3WrWUchxIWrpHbAlkU';

async function checkBotInfo() {
  console.log('🤖 Checking Bot Information...\n');
  
  try {
    const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    if (response.data.ok) {
      const bot = response.data.result;
      console.log('✅ Bot is active:');
      console.log(`   Name: ${bot.first_name}${bot.username ? ` (@${bot.username})` : ''}`);
      console.log(`   ID: ${bot.id}`);
      console.log(`   Can join groups: ${bot.can_join_groups || false}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error fetching bot info:', error.message);
    return false;
  }
}

async function checkWebhook() {
  console.log('\n📡 Checking Webhook Status...\n');
  
  try {
    const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    if (response.data.ok) {
      const info = response.data.result;
      console.log('Webhook Information:');
      console.log(`   URL: ${info.url || '(not set)'}`);
      console.log(`   Has custom certificate: ${info.has_custom_certificate || false}`);
      console.log(`   Pending updates: ${info.pending_update_count || 0}`);
      
      if (info.last_error_date) {
        console.log(`\n   ⚠️  LAST ERROR:`);
        console.log(`   Date: ${new Date(info.last_error_date * 1000).toISOString()}`);
        console.log(`   Message: ${info.last_error_message}`);
        console.log(`   Error count: ${info.last_error_message ? 'Multiple errors' : '0'}`);
      }
      
      if (!info.url || info.url === '') {
        console.log('\n   ❌ Webhook is NOT set!');
        console.log('   The bot will not receive any messages.');
        console.log('   Set webhook with: npm run telegram:set <url>');
        return false;
      } else {
        console.log('\n   ✅ Webhook is set');
        if (info.last_error_date) {
          console.log('   ⚠️  But there are errors - webhook may not be working');
        } else {
          console.log('   ✅ No errors detected');
        }
        return true;
      }
    }
  } catch (error) {
    console.error('❌ Error fetching webhook info:', error.message);
    return false;
  }
}

async function testSendMessage(chatId) {
  if (!chatId) {
    console.log('\n💬 To test sending a message, provide your chat ID:');
    console.log('   node scripts/check-telegram-bot.js <your-chat-id>');
    return;
  }

  console.log(`\n💬 Testing message send to chat_id: ${chatId}...\n`);
  
  try {
    const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: 'Test message from bot! If you receive this, the bot is working.'
    });
    
    if (response.data.ok) {
      console.log('✅ Test message sent successfully!');
      console.log(`   Message ID: ${response.data.result.message_id}`);
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Failed to send message:', error.response.data);
      if (error.response.data.description) {
        console.error(`   Error: ${error.response.data.description}`);
      }
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function main() {
  console.log('🔍 Telegram Bot Status Check\n');
  console.log('='.repeat(50) + '\n');

  const botOk = await checkBotInfo();
  const webhookOk = await checkWebhook();

  console.log('\n' + '='.repeat(50));
  console.log('\n📋 Summary:');
  console.log(`   Bot Status: ${botOk ? '✅ Active' : '❌ Error'}`);
  console.log(`   Webhook Status: ${webhookOk ? '✅ Set' : '❌ Not Set'}`);

  if (!webhookOk) {
    console.log('\n💡 Next Steps:');
    console.log('   1. Make sure your backend server is running: npm run dev');
    console.log('   2. Set up webhook URL (use ngrok for testing):');
    console.log('      ngrok http 4000');
    console.log('   3. Set webhook: npm run telegram:set <ngrok-url>/api/notifications/telegram/webhook');
  } else {
    const chatId = process.argv[2];
    if (chatId) {
      await testSendMessage(chatId);
    } else {
      console.log('\n💡 To test the bot:');
      console.log('   1. Send /start to your bot in Telegram');
      console.log('   2. Check server logs to see if webhook is receiving messages');
      console.log('   3. Or test sending a message: node scripts/check-telegram-bot.js <your-chat-id>');
    }
  }

  console.log('\n✨ Check complete!');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

