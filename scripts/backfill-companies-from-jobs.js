/*
  Backfill companies table from distinct jobs (companyId/company).
  - Upserts companies by id (companyId when present, else generated UUID v4)
  - Sets name from jobs.company
*/
require('dotenv').config();
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'secret';
  const database = process.env.DB_NAME || 'mcb';

  const pool = new Pool({ host, port, user, password, database });
  const client = await pool.connect();

  try {
    console.log('Connected. Reading distinct companies from jobs...');

    const { rows } = await client.query(
      "SELECT DISTINCT \"companyId\", company FROM jobs WHERE company IS NOT NULL AND company <> ''"
    );

    if (!rows.length) {
      console.log('No distinct companies found in jobs.');
      return;
    }

    let inserted = 0, updated = 0, skipped = 0;
    for (const r of rows) {
      const id = r.companyId && String(r.companyId).trim() ? String(r.companyId).trim() : randomUUID();
      const name = String(r.company || '').trim();
      if (!name) { skipped++; continue; }

      // Try to find existing by id first; if no companyId in jobs, attempt name match
      const existById = await client.query('SELECT id FROM companies WHERE id = $1', [id]);
      const existByName = existById.rows.length
        ? existById
        : await client.query('SELECT id FROM companies WHERE name = $1', [name]);

      if (existById.rows.length || existByName.rows.length) {
        const targetId = existById.rows.length ? existById.rows[0].id : existByName.rows[0].id;
        await client.query('UPDATE companies SET name = COALESCE($1, name) WHERE id = $2', [name, targetId]);
        updated++;
        continue;
      }

      await client.query(
        'INSERT INTO companies (id, name, "createdAt", "updatedAt") VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [id, name]
      );
      inserted++;
    }

    console.log(`✅ Backfill companies from jobs complete. Inserted=${inserted} Updated=${updated} Skipped=${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('❌ Backfill companies from jobs failed:', e);
  process.exit(1);
});


