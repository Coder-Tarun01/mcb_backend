/*
  Backfill companies table from distinct jobs (companyId/company).
  - Upserts companies by id (companyId when present, else generated UUID v4)
  - Sets name from jobs.company
*/
require('dotenv').config();
const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'secret';
  const database = process.env.DB_NAME || 'mycareerbuild';

  const conn = await mysql.createConnection({ host, port, user, password, database });
  console.log('Connected. Reading distinct companies from jobs...');

  const [rows] = await conn.execute(
    'SELECT DISTINCT companyId, company FROM jobs WHERE company IS NOT NULL AND company <> ""'
  );

  if (!rows.length) {
    console.log('No distinct companies found in jobs.');
    await conn.end();
    return;
  }

  let inserted = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    const id = r.companyId && String(r.companyId).trim() ? String(r.companyId).trim() : randomUUID();
    const name = String(r.company || '').trim();
    if (!name) { skipped++; continue; }

    // Try to find existing by id first; if no companyId in jobs, attempt name match
    const [existById] = await conn.execute('SELECT id FROM companies WHERE id = ?', [id]);
    const [existByName] = existById.length ? [existById] : await conn.execute('SELECT id FROM companies WHERE name = ?', [name]);
    if (existById.length || existByName.length) {
      // Ensure name is up to date
      const targetId = existById.length ? existById[0].id : existByName[0].id;
      await conn.execute('UPDATE companies SET name = COALESCE(?, name) WHERE id = ?', [name, targetId]);
      updated++;
      continue;
    }

    await conn.execute(
      'INSERT INTO companies (id, name, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())',
      [id, name]
    );
    inserted++;
  }

  await conn.end();
  console.log(`✅ Backfill companies from jobs complete. Inserted=${inserted} Updated=${updated} Skipped=${skipped}`);
}

run().catch((e) => {
  console.error('❌ Backfill companies from jobs failed:', e);
  process.exit(1);
});


