/*
  Add slug and previousSlugs to companies.
*/
require('dotenv').config();
const { Pool } = require('pg');

async function columnExists(client, table, column) {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1
       AND column_name = $2`,
    [table, column]
  );
  return Number(rows[0].cnt) > 0;
}

async function indexExists(client, table, indexName) {
  const { rows } = await client.query(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = current_schema()
       AND tablename = $1
       AND indexname = $2`,
    [table, indexName]
  );
  return rows.length > 0;
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
    const table = 'companies';
    console.log('Connected. Checking table:', table);

    if (!(await columnExists(client, table, 'slug'))) {
      console.log('Adding column slug');
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "slug" VARCHAR(255)`);
    } else {
      console.log('Column slug exists');
    }

    if (!(await columnExists(client, table, 'previousSlugs'))) {
      console.log('Adding column previousSlugs');
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "previousSlugs" JSONB`);
    } else {
      console.log('Column previousSlugs exists');
    }

    if (!(await indexExists(client, table, 'companies_slug_unique_idx'))) {
      console.log('Adding unique index on slug');
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_unique_idx ON ${table} ("slug")`);
    } else {
      console.log('Unique index exists');
    }

    console.log('✅ add-company-slug-columns.js complete');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ add-company-slug-columns.js failed:', err);
  process.exit(1);
});


