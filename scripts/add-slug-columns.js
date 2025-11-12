/*
  Plain Node script to add slug columns without TypeScript build.
*/
require('dotenv').config();
const mysql = require('mysql2/promise');

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME || 'mycareerbuild', table, column]
  );
  return rows[0].cnt > 0;
}

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.execute(
    `SHOW INDEX FROM \`${table}\``
  );
  return rows.some(r => r.Key_name === indexName);
}

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'secret';
  const database = process.env.DB_NAME || 'mycareerbuild';

  const conn = await mysql.createConnection({ host, port, user, password, database });
  const table = 'jobs';
  console.log('Connected. Checking table:', table);

  if (!(await columnExists(conn, table, 'slug'))) {
    console.log('Adding column slug');
    await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`slug\` VARCHAR(255) NULL AFTER \`company\``);
  } else {
    console.log('Column slug exists');
  }

  if (!(await columnExists(conn, table, 'previousSlugs'))) {
    console.log('Adding column previousSlugs');
    // JSON type if supported; fallback to TEXT
    try {
      await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`previousSlugs\` JSON NULL AFTER \`slug\``);
    } catch (e) {
      console.log('JSON type unsupported, falling back to TEXT');
      await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`previousSlugs\` TEXT NULL AFTER \`slug\``);
    }
  } else {
    console.log('Column previousSlugs exists');
  }

  if (!(await indexExists(conn, table, 'jobs_slug_unique_idx'))) {
    console.log('Adding unique index on slug');
    await conn.execute(`CREATE UNIQUE INDEX \`jobs_slug_unique_idx\` ON \`${table}\` (\`slug\`)`);
  } else {
    console.log('Unique index exists');
  }

  await conn.end();
  console.log('✅ add-slug-columns.js complete');
}

run().catch(err => {
  console.error('❌ add-slug-columns.js failed:', err);
  process.exit(1);
});


