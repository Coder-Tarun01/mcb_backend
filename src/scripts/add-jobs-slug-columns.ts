import { sequelize } from '../models';

async function run() {
  try {
    console.log('Checking and adding missing columns slug, previousSlugs on jobs table...');

    const [slugExistsRows]: any = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'jobs'
         AND column_name = 'slug'`
    );
    const slugExists = Number(slugExistsRows?.[0]?.count || 0) > 0;

    if (!slugExists) {
      console.log('Adding column jobs.slug ...');
      await sequelize.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "slug" VARCHAR(255)`);
      await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_slug ON jobs ("slug")`);
    } else {
      console.log('Column jobs.slug already exists.');
    }

    const [prevSlugsExistsRows]: any = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'jobs'
         AND column_name = 'previousSlugs'`
    );
    const prevSlugsExists = Number(prevSlugsExistsRows?.[0]?.count || 0) > 0;

    if (!prevSlugsExists) {
      console.log('Adding column jobs.previousSlugs ...');
      // Use JSON if available; fallback to TEXT if needed by editing this script
      await sequelize.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "previousSlugs" JSONB`);
    } else {
      console.log('Column jobs.previousSlugs already exists.');
    }

    console.log('✅ Jobs table columns check complete.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed to ensure jobs slug columns:', e);
    process.exit(1);
  }
}

run();


