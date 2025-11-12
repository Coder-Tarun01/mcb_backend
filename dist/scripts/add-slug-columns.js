"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
async function run() {
    const qi = models_1.sequelize.getQueryInterface();
    const table = 'jobs';
    console.log('Checking columns on table:', table);
    const desc = await qi.describeTable(table).catch(() => ({}));
    // Add slug column if missing
    if (!desc.slug) {
        console.log('Adding column: slug');
        await qi.addColumn(table, 'slug', {
            type: 'VARCHAR(255)',
            allowNull: true,
            after: 'company'
        });
    }
    else {
        console.log('Column exists: slug');
    }
    // Add previousSlugs column if missing
    if (!desc.previousSlugs) {
        console.log('Adding column: previousSlugs');
        // Use JSON if supported, fallback to TEXT
        const dialect = models_1.sequelize.getDialect();
        const jsonType = dialect === 'mysql' ? 'JSON' : 'TEXT';
        await qi.addColumn(table, 'previousSlugs', {
            type: jsonType,
            allowNull: true,
            after: 'slug'
        });
    }
    else {
        console.log('Column exists: previousSlugs');
    }
    // Add unique index on slug if missing
    const indexes = (await qi.showIndex(table));
    const hasSlugUnique = Array.isArray(indexes) && indexes.some((idx) => idx.unique && (idx.fields || idx.columns)?.some((f) => (f.attribute || f.column) === 'slug'));
    if (!hasSlugUnique) {
        console.log('Adding unique index on slug');
        await qi.addIndex(table, ['slug'], { name: 'jobs_slug_unique_idx', unique: true });
    }
    else {
        console.log('Unique index on slug already exists');
    }
    console.log('✅ add-slug-columns complete');
}
run().then(() => process.exit(0)).catch((e) => {
    console.error('❌ add-slug-columns failed:', e);
    process.exit(1);
});
//# sourceMappingURL=add-slug-columns.js.map