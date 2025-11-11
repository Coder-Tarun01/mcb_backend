import { DataTypes } from 'sequelize';
import { sequelize } from '../models';

declare const process: any;

async function run() {
  const qi = sequelize.getQueryInterface();
  const table = 'jobs';
  console.log('Checking columns on table:', table);
  const desc = await qi.describeTable(table).catch(() => ({} as any));

  // Add slug column if missing
  if (!(desc as any).slug) {
    console.log('Adding column: slug');
    await qi.addColumn(table, 'slug', {
      type: DataTypes.STRING,
      allowNull: true
    });
  } else {
    console.log('Column exists: slug');
  }

  // Add previousSlugs column if missing
  if (!(desc as any).previousSlugs) {
    console.log('Adding column: previousSlugs');
    // Use JSON if supported, fallback to TEXT
    const dialect = sequelize.getDialect();
    const jsonType = (() => {
      switch (dialect) {
        case 'postgres':
          return DataTypes.JSONB;
        case 'mysql':
        case 'mariadb':
          return DataTypes.JSON;
        default:
          return DataTypes.TEXT;
      }
    })();
    await qi.addColumn(table, 'previousSlugs', {
      type: jsonType,
      allowNull: true
    });
  } else {
    console.log('Column exists: previousSlugs');
  }

  // Add unique index on slug if missing
  const indexes = (await qi.showIndex(table)) as any[];
  const hasSlugUnique = Array.isArray(indexes) && indexes.some((idx: any) => idx.unique && (idx.fields || idx.columns)?.some((f: any) => (f.attribute || f.column) === 'slug'));
  if (!hasSlugUnique) {
    console.log('Adding unique index on slug');
    await qi.addIndex(table, ['slug'], { name: 'jobs_slug_unique_idx', unique: true } as any);
  } else {
    console.log('Unique index on slug already exists');
  }

  console.log('✅ add-slug-columns complete');
}

run().then(() => process.exit(0)).catch((e) => {
  console.error('❌ add-slug-columns failed:', e);
  process.exit(1);
});


