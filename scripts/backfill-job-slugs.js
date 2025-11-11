/*
  Backfill slugs for existing jobs.
  Usage: node scripts/backfill-job-slugs.js
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

function buildJobSlug({ title, company, location, id }) {
  const titlePart = toSlugSegment(title);
  const companyPart = toSlugSegment(company);
  const locRaw = (location || '').toString().trim();
  const locPart = locRaw ? toSlugSegment(locRaw.split(',')[0]) : '';
  const parts = [titlePart];
  if (locPart) parts.push(locPart);
  parts.push('at', companyPart, String(id).toLowerCase());
  return parts.filter(Boolean).join('-');
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
    console.log('Connected to DB. Fetching jobs without slug...');

    const { rows } = await client.query(
      "SELECT id, title, company, location, city, slug FROM jobs WHERE slug IS NULL OR slug = ''"
    );

    if (!rows.length) {
      console.log('No jobs without slug. Nothing to do.');
      return;
    }

    console.log(`Found ${rows.length} jobs to backfill...`);

    let updated = 0;
    for (const job of rows) {
      const location = job.location || job.city || '';
      const slug = buildJobSlug({ title: job.title, company: job.company, location, id: job.id });
      try {
        await client.query('UPDATE jobs SET slug = $1 WHERE id = $2', [slug, job.id]);
        updated++;
      } catch (e) {
        console.log(`Failed to update job ${job.id}:`, e && e.message);
      }
    }

    console.log(`✅ Backfill complete. Updated ${updated}/${rows.length} jobs.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('❌ Backfill failed:', e);
  process.exit(1);
});


