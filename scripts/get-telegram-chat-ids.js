#!/usr/bin/env node

/**
 * Get Existing Telegram Chat IDs
 * 
 * This script retrieves all existing Telegram chat IDs from the marketing_contacts table.
 * 
 * Usage:
 *   node scripts/get-telegram-chat-ids.js [--format json|csv|table]
 * 
 * Environment Variables:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_DIALECT
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

async function getChatIds(format = 'table') {
  try {
    console.log('🔍 Fetching Telegram chat IDs from marketing_contacts table...\n');

    const rows = await sequelize.query(
      `
        SELECT 
          id,
          full_name,
          email,
          mobile_no,
          branch,
          experience,
          telegram_chat_id,
          created_at
        FROM marketing_contacts
        WHERE telegram_chat_id IS NOT NULL
          AND telegram_chat_id != ''
        ORDER BY created_at DESC
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    if (rows.length === 0) {
      console.log('ℹ️  No chat IDs found in the database.');
      console.log('   The telegram_chat_id column is empty for all contacts.');
      return;
    }

    console.log(`✅ Found ${rows.length} contact(s) with Telegram chat IDs:\n`);

    if (format === 'json') {
      console.log(JSON.stringify(rows, null, 2));
    } else if (format === 'csv') {
      // CSV Header
      console.log('id,full_name,email,mobile_no,branch,experience,telegram_chat_id,created_at');
      // CSV Rows
      rows.forEach(row => {
        const values = [
          row.id,
          `"${(row.full_name || '').replace(/"/g, '""')}"`,
          `"${(row.email || '').replace(/"/g, '""')}"`,
          `"${(row.mobile_no || '').replace(/"/g, '""')}"`,
          `"${(row.branch || '').replace(/"/g, '""')}"`,
          `"${(row.experience || '').replace(/"/g, '""')}"`,
          row.telegram_chat_id,
          row.created_at ? new Date(row.created_at).toISOString() : ''
        ];
        console.log(values.join(','));
      });
    } else {
      // Table format (default)
      console.log('┌─────┬──────────────────────┬──────────────────────────┬──────────────────┬──────────────────┬──────────────┬─────────────────────┬─────────────────────┐');
      console.log('│ ID  │ Full Name            │ Email                   │ Mobile No        │ Branch           │ Experience   │ Telegram Chat ID    │ Created At          │');
      console.log('├─────┼──────────────────────┼──────────────────────────┼──────────────────┼──────────────────┼──────────────┼─────────────────────┼─────────────────────┤');
      
      rows.forEach(row => {
        const id = String(row.id || '').padEnd(3);
        const name = (row.full_name || '').substring(0, 20).padEnd(20);
        const email = (row.email || '').substring(0, 24).padEnd(24);
        const mobile = (row.mobile_no || '').substring(0, 16).padEnd(16);
        const branch = (row.branch || '').substring(0, 16).padEnd(16);
        const experience = (row.experience || '').substring(0, 12).padEnd(12);
        const chatId = (row.telegram_chat_id || '').substring(0, 19).padEnd(19);
        const createdAt = row.created_at 
          ? new Date(row.created_at).toISOString().substring(0, 19).replace('T', ' ')
          : ''.padEnd(19);
        
        console.log(`│ ${id} │ ${name} │ ${email} │ ${mobile} │ ${branch} │ ${experience} │ ${chatId} │ ${createdAt} │`);
      });
      
      console.log('└─────┴──────────────────────┴──────────────────────────┴──────────────────┴──────────────────┴──────────────┴─────────────────────┴─────────────────────┘');
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total contacts with chat IDs: ${rows.length}`);
    
    // Count by branch
    const branchCount = {};
    rows.forEach(row => {
      const branch = row.branch || 'Unknown';
      branchCount[branch] = (branchCount[branch] || 0) + 1;
    });
    
    if (Object.keys(branchCount).length > 0) {
      console.log(`\n   By Branch:`);
      Object.entries(branchCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([branch, count]) => {
          console.log(`     ${branch}: ${count}`);
        });
    }

    // Count by experience
    const expCount = {};
    rows.forEach(row => {
      const exp = row.experience || 'Unknown';
      expCount[exp] = (expCount[exp] || 0) + 1;
    });
    
    if (Object.keys(expCount).length > 0) {
      console.log(`\n   By Experience:`);
      Object.entries(expCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([exp, count]) => {
          console.log(`     ${exp}: ${count}`);
        });
    }

    // List of chat IDs only
    console.log(`\n📱 Chat IDs List:`);
    rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.telegram_chat_id} - ${row.full_name || 'N/A'} (${row.email || 'N/A'})`);
    });

  } catch (error) {
    console.error('❌ Error fetching chat IDs:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('   Database connection failed. Please check:');
      console.error('   - Database server is running');
      console.error('   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are correct in .env');
    } else if (error.message.includes("doesn't exist")) {
      console.error('   Table marketing_contacts does not exist.');
      console.error('   Please run the migration to create the table.');
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function main() {
  const format = process.argv.includes('--format') 
    ? process.argv[process.argv.indexOf('--format') + 1] 
    : process.argv.includes('--json') ? 'json'
    : process.argv.includes('--csv') ? 'csv'
    : 'table';

  if (!['json', 'csv', 'table'].includes(format)) {
    console.error('❌ Invalid format. Use: json, csv, or table');
    process.exit(1);
  }

  await getChatIds(format);
  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

