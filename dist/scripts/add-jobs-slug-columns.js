"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
async function run() {
    try {
        console.log('Checking and adding missing columns slug, previousSlugs on jobs table...');
        const [slugExistsRows] = await models_1.sequelize.query(`SELECT COUNT(*) as count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'jobs'
         AND COLUMN_NAME = 'slug'`);
        const slugExists = Number(slugExistsRows?.[0]?.count || 0) > 0;
        if (!slugExists) {
            console.log('Adding column jobs.slug ...');
            await models_1.sequelize.query(`ALTER TABLE jobs ADD COLUMN slug VARCHAR(255) NULL`);
            await models_1.sequelize.query(`CREATE UNIQUE INDEX idx_jobs_slug ON jobs (slug)`);
        }
        else {
            console.log('Column jobs.slug already exists.');
        }
        const [prevSlugsExistsRows] = await models_1.sequelize.query(`SELECT COUNT(*) as count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'jobs'
         AND COLUMN_NAME = 'previousSlugs'`);
        const prevSlugsExists = Number(prevSlugsExistsRows?.[0]?.count || 0) > 0;
        if (!prevSlugsExists) {
            console.log('Adding column jobs.previousSlugs ...');
            // Use JSON if available; fallback to TEXT if needed by editing this script
            await models_1.sequelize.query(`ALTER TABLE jobs ADD COLUMN previousSlugs JSON NULL`);
        }
        else {
            console.log('Column jobs.previousSlugs already exists.');
        }
        console.log('✅ Jobs table columns check complete.');
        process.exit(0);
    }
    catch (e) {
        console.error('❌ Failed to ensure jobs slug columns:', e);
        process.exit(1);
    }
}
run();
//# sourceMappingURL=add-jobs-slug-columns.js.map