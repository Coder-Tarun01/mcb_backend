/*
  Backfill slugs for existing jobs.
  Usage: node scripts/backfill-job-slugs.js
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
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'secret';
  const database = process.env.DB_NAME || 'mycareerbuild';

  const conn = await mysql.createConnection({ host, port, user, password, database });
  console.log('Connected to DB. Fetching jobs without slug...');

  const [rows] = await conn.execute(
    'SELECT id, title, company, location, city, slug FROM jobs WHERE slug IS NULL OR slug = ""'
  );

  if (!rows.length) {
    console.log('No jobs without slug. Nothing to do.');
    await conn.end();
    return;
  }

  console.log(`Found ${rows.length} jobs to backfill...`);

  let updated = 0;
  for (const job of rows) {
    const location = job.location || job.city || '';
    const slug = buildJobSlug({ title: job.title, company: job.company, location, id: job.id });
    try {
      await conn.execute('UPDATE jobs SET slug = ? WHERE id = ?', [slug, job.id]);
      updated++;
    } catch (e) {
      console.log(`Failed to update job ${job.id}:`, e && e.message);
    }
  }

  await conn.end();
  console.log(`✅ Backfill complete. Updated ${updated}/${rows.length} jobs.`);
}

run().catch((e) => {
  console.error('❌ Backfill failed:', e);
  process.exit(1);
});


