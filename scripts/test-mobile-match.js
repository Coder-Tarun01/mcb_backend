#!/usr/bin/env node

/**
 * Test Mobile Number Matching
 * 
 * This script tests if a mobile number can be found in the marketing_contacts table.
 * 
 * Usage:
 *   node scripts/test-mobile-match.js <mobile-number>
 * 
 * Example:
 *   node scripts/test-mobile-match.js 9876543210
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

// Database configuration
const dialect = process.env.DB_DIALECT?.toLowerCase() || 'mysql';
const sequelize = new Sequelize(
  process.env.DB_NAME || 'mycareerbuild',
  process.env.DB_USER || (dialect === 'postgres' ? 'postgres' : 'root'),
  process.env.DB_PASSWORD || (dialect === 'postgres' ? 'postgres' : 'secret'),
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || (dialect === 'postgres' ? '5432' : '3306'), 10),
    dialect: dialect,
    logging: false,
  }
);

function normalizeMobile(value) {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

async function testMobileMatch(mobileNumber) {
  if (!mobileNumber) {
    console.error('❌ Error: Mobile number is required');
    console.error('   Usage: node scripts/test-mobile-match.js <mobile-number>');
    process.exit(1);
  }

  const normalized = normalizeMobile(mobileNumber);
  console.log(`🔍 Testing mobile number matching...\n`);
  console.log(`   Input: ${mobileNumber}`);
  console.log(`   Normalized: ${normalized}\n`);

  try {
    // Test the exact query used in the bot
    const rows = await sequelize.query(
      `
        SELECT id, full_name, email, mobile_no, branch, experience, telegram_chat_id
        FROM marketing_contacts
        WHERE mobile_no IS NOT NULL
          AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(mobile_no, '+', ''), '-', ''), ' ', ''), '(', ''), ')', ''), '.', ''), '/', '') = :mobile
        ORDER BY created_at ASC
        LIMIT 1
      `,
      {
        replacements: { mobile: normalized },
        type: QueryTypes.SELECT,
      }
    );

    if (rows.length === 0) {
      console.log('❌ No match found in marketing_contacts table\n');
      console.log('💡 Possible reasons:');
      console.log('   1. Mobile number not in database');
      console.log('   2. Mobile number format mismatch');
      console.log('   3. Mobile number has different formatting\n');
      
      // Show all mobile numbers in database for reference
      const allContacts = await sequelize.query(
        `SELECT id, full_name, mobile_no FROM marketing_contacts WHERE mobile_no IS NOT NULL LIMIT 10`,
        { type: QueryTypes.SELECT }
      );
      
      if (allContacts.length > 0) {
        console.log('📋 Sample mobile numbers in database:');
        allContacts.forEach(contact => {
          const dbMobile = normalizeMobile(contact.mobile_no);
          console.log(`   - ${contact.mobile_no} (normalized: ${dbMobile}) - ${contact.full_name || 'N/A'}`);
        });
      }
      
      return false;
    }

    const contact = rows[0];
    console.log('✅ Match found!\n');
    console.log('📋 Contact Details:');
    console.log(`   ID: ${contact.id}`);
    console.log(`   Name: ${contact.full_name || 'N/A'}`);
    console.log(`   Email: ${contact.email || 'N/A'}`);
    console.log(`   Mobile: ${contact.mobile_no}`);
    console.log(`   Branch: ${contact.branch || 'N/A'}`);
    console.log(`   Experience: ${contact.experience || 'N/A'}`);
    console.log(`   Current Chat ID: ${contact.telegram_chat_id || '(not set)'}\n`);

    // Test UPDATE query
    console.log('🧪 Testing UPDATE query...');
    const testChatId = '123456789';
    
    try {
      const updateResult = await sequelize.query(
        `
          UPDATE marketing_contacts
          SET telegram_chat_id = :chatId
          WHERE id = :contactId
        `,
        {
          replacements: {
            chatId: testChatId,
            contactId: contact.id,
          },
          type: QueryTypes.UPDATE,
        }
      );

      console.log('   ✅ UPDATE query executed successfully');
      console.log('   Result:', JSON.stringify(updateResult, null, 2));

      // Verify
      const verify = await sequelize.query(
        `SELECT telegram_chat_id FROM marketing_contacts WHERE id = :contactId`,
        {
          replacements: { contactId: contact.id },
          type: QueryTypes.SELECT,
        }
      );

      if (verify.length > 0 && verify[0].telegram_chat_id === testChatId) {
        console.log('   ✅ Verification passed - chat_id stored correctly\n');
        
        // Restore original value
        await sequelize.query(
          `UPDATE marketing_contacts SET telegram_chat_id = :original WHERE id = :contactId`,
          {
            replacements: {
              original: contact.telegram_chat_id || null,
              contactId: contact.id,
            },
            type: QueryTypes.UPDATE,
          }
        );
        console.log('   ✅ Restored original chat_id value');
      } else {
        console.log('   ❌ Verification failed - chat_id not stored correctly');
      }
    } catch (updateError) {
      console.error('   ❌ UPDATE query failed:', updateError.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('   Database connection failed. Please check:');
      console.error('   - Database server is running');
      console.error('   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are correct');
    }
    return false;
  } finally {
    await sequelize.close();
  }
}

async function main() {
  const mobileNumber = process.argv[2];
  const success = await testMobileMatch(mobileNumber);
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

