#!/usr/bin/env node

/**
 * Test Telegram Webhook Endpoint
 * 
 * This script tests if the Telegram webhook endpoint is accessible
 * and properly configured.
 * 
 * Usage:
 *   node scripts/test-telegram-webhook.js [webhook-url]
 * 
 * Environment Variables:
 *   TELEGRAM_WEBHOOK_SECRET - Secret for webhook authentication (optional)
 */

require('dotenv').config();
const axios = require('axios');
const https = require('https');

const WEBHOOK_URL = process.argv[2] || process.env.TELEGRAM_WEBHOOK_URL || 'https://103.154.233.210/api/notifications/telegram/webhook';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'Tanasvi@123';

async function testWebhookEndpoint() {
  console.log('🔍 Testing Telegram Webhook Endpoint\n');
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔐 Secret: ${WEBHOOK_SECRET ? '***' + WEBHOOK_SECRET.slice(-3) : '(not set)'}\n`);

  // Test 1: Check if endpoint is reachable (GET request)
  console.log('1️⃣ Testing GET request to webhook endpoint...');
  try {
    const getResponse = await axios.get(WEBHOOK_URL, {
      timeout: 10000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Allow self-signed certificates for testing
      })
    });
    console.log('   ✅ GET request successful');
    console.log('   Status:', getResponse.status);
    console.log('   Response:', JSON.stringify(getResponse.data, null, 2));
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('   ❌ Connection failed - Server might not be running or IP is not accessible');
      console.log('   Error:', error.message);
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   ❌ Connection timeout - Server might be behind a firewall');
      console.log('   Error:', error.message);
    } else if (error.response) {
      console.log('   ⚠️  Server responded with error');
      console.log('   Status:', error.response.status);
      console.log('   Response:', error.response.data);
    } else {
      console.log('   ❌ Error:', error.message);
    }
  }

  console.log('\n2️⃣ Testing POST request with sample Telegram update...');
  
  // Sample Telegram update (like what Telegram sends)
  const sampleUpdate = {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser'
      },
      chat: {
        id: 123456789,
        first_name: 'Test',
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: '/start'
    }
  };

  try {
    const postResponse = await axios.post(
      `${WEBHOOK_URL}${WEBHOOK_URL.includes('?') ? '&' : '?'}secret=${encodeURIComponent(WEBHOOK_SECRET)}`,
      sampleUpdate,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    );
    console.log('   ✅ POST request successful');
    console.log('   Status:', postResponse.status);
    console.log('   Response:', JSON.stringify(postResponse.data, null, 2));
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('   ❌ Connection failed - Server might not be running or IP is not accessible');
      console.log('   Error:', error.message);
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   ❌ Connection timeout - Server might be behind a firewall');
      console.log('   Error:', error.message);
    } else if (error.response) {
      console.log('   ⚠️  Server responded with error');
      console.log('   Status:', error.response.status);
      console.log('   Response:', error.response.data);
    } else {
      console.log('   ❌ Error:', error.message);
    }
  }

  console.log('\n3️⃣ Testing from external perspective (like Telegram would)...');
  console.log('   This simulates how Telegram\'s servers would access your webhook...');
  
  // Try to get the IP address
  try {
    const url = new URL(WEBHOOK_URL);
    const hostname = url.hostname;
    console.log(`   Hostname: ${hostname}`);
    
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      console.log('   ⚠️  Using IP address instead of domain name');
      console.log('   ⚠️  Telegram may have issues with IP addresses, especially with SSL');
      console.log('   💡 Recommendation: Use a domain name with valid SSL certificate');
    }
  } catch (e) {
    console.log('   ⚠️  Could not parse URL');
  }
}

async function checkServerStatus() {
  console.log('\n4️⃣ Checking if backend server is running locally...');
  
  try {
    const localResponse = await axios.get('http://localhost:4000/health', {
      timeout: 3000
    });
    console.log('   ✅ Backend server is running locally');
    console.log('   Response:', localResponse.data);
  } catch (error) {
    console.log('   ⚠️  Backend server is not running locally');
    console.log('   💡 Start the server with: npm run dev');
  }
}

async function provideRecommendations() {
  console.log('\n📋 Recommendations:\n');
  
  console.log('1. Server Accessibility:');
  console.log('   - Ensure your server is running and accessible from the internet');
  console.log('   - Check if port 443 (HTTPS) is open in your firewall');
  console.log('   - Verify the IP address 103.154.233.210 is publicly accessible\n');
  
  console.log('2. SSL Certificate:');
  console.log('   - Telegram requires HTTPS with a valid SSL certificate');
  console.log('   - IP addresses often have SSL certificate issues');
  console.log('   - Consider using a domain name (e.g., mycareerbuild.com)');
  console.log('   - Use Let\'s Encrypt or similar for free SSL certificates\n');
  
  console.log('3. Domain Name Setup:');
  console.log('   - Point a domain/subdomain to your IP: 103.154.233.210');
  console.log('   - Set up SSL certificate for the domain');
  console.log('   - Update webhook URL to use domain instead of IP\n');
  
  console.log('4. Testing Locally:');
  console.log('   - Use ngrok or similar tool to create a public tunnel');
  console.log('   - Example: ngrok http 4000');
  console.log('   - Use the ngrok HTTPS URL as your webhook URL\n');
  
  console.log('5. Firewall Configuration:');
  console.log('   - Allow incoming connections on port 443 (HTTPS)');
  console.log('   - Allow connections from Telegram IP ranges');
  console.log('   - Check server firewall and cloud provider security groups\n');
}

async function main() {
  await testWebhookEndpoint();
  await checkServerStatus();
  await provideRecommendations();
  
  console.log('\n✨ Testing complete!');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

