/*
  Backfill company slugs for existing rows.
*/
require('dotenv').config();
const { Pool } = require('pg');

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
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'secret';
  const database = process.env.DB_NAME || 'mcb';

  const pool = new Pool({ host, port, user, password, database });
  const client = await pool.connect();

  try {
    console.log('Connected. Fetching companies without slug...');

    const { rows } = await client.query(
      "SELECT id, name, slug FROM companies WHERE slug IS NULL OR slug = ''"
    );
    if (!rows.length) {
      console.log('No companies without slug. Nothing to do.');
      return;
    }

    console.log(`Found ${rows.length} companies to backfill...`);
    let updated = 0;
    for (const c of rows) {
      const slug = buildCompanySlug({ name: c.name, id: c.id });
      try {
        await client.query('UPDATE companies SET slug = $1 WHERE id = $2', [slug, c.id]);
        updated++;
      } catch (e) {
        console.log(`Failed to update company ${c.id}:`, e && e.message);
      }
    }

    console.log(`✅ Backfill complete. Updated ${updated}/${rows.length} companies.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('❌ Backfill failed:', e);
  process.exit(1);
});


