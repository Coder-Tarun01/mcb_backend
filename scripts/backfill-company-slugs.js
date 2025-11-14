/*
  Backfill company slugs for existing rows.
*/
require('dotenv').config();
const mysql = require('mysql2/promise');

function toSlugSegment(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildCompanySlug({ name, id }) {
  return [toSlugSegment(name), String(id).toLowerCase()].join('-');
}

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'secret';
  const database = process.env.DB_NAME || 'mycareerbuild';

  const conn = await mysql.createConnection({ host, port, user, password, database });
  console.log('Connected. Fetching companies without slug...');

  const [rows] = await conn.execute('SELECT id, name, slug FROM companies WHERE slug IS NULL OR slug = ""');
  if (!rows.length) {
    console.log('No companies without slug. Nothing to do.');
    await conn.end();
    return;
  }

  console.log(`Found ${rows.length} companies to backfill...`);
  let updated = 0;
  for (const c of rows) {
    const slug = buildCompanySlug({ name: c.name, id: c.id });
    try {
      await conn.execute('UPDATE companies SET slug = ? WHERE id = ?', [slug, c.id]);
      updated++;
    } catch (e) {
      console.log(`Failed to update company ${c.id}:`, e && e.message);
    }
  }

  await conn.end();
  console.log(`✅ Backfill complete. Updated ${updated}/${rows.length} companies.`);
}

run().catch((e) => {
  console.error('❌ Backfill failed:', e);
  process.exit(1);
});


