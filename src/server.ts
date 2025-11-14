import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import app from './app';
import { sequelize, testConnection } from './models';
import { runSeed } from './utils/seed';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';

async function start() {
  try {
    // Test database connection
    await testConnection();

    const currentDialect = sequelize.getDialect();

    // Ensure the configured schema exists (PostgreSQL only)
    try {
      if (currentDialect === 'postgres' && DB_SCHEMA !== 'public') {
        await sequelize.createSchema(DB_SCHEMA, { logging: false });
        console.log(`📁 Schema ensured: ${DB_SCHEMA}`);
      }
    } catch (schemaError: any) {
      if (schemaError?.original?.code === '42P06') {
        console.log(`ℹ️ Schema "${DB_SCHEMA}" already exists`);
      } else {
        console.warn(`⚠️ Unable to ensure schema "${DB_SCHEMA}":`, schemaError.message);
      }
    }

    // Disable referential integrity checks for MySQL only
    if (currentDialect === 'mysql') {
      console.log('🔧 Temporarily disabling foreign key checks...');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }
    
    // Sync database schema with safe options
    try {
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ Database schema synchronized');
    } catch (syncError) {
      console.log('⚠️ Database sync encountered issues, but continuing...');
      console.log('Sync error:', (syncError as Error).message);
    }
    
    // Re-enable referential integrity checks for MySQL only
    if (currentDialect === 'mysql') {
      console.log('🔧 Re-enabling foreign key checks...');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    
    // Skip seed data loading - using real database jobs only
    // if (process.env.NODE_ENV !== 'production') {
    //   try {
    //     await runSeed();
    //   } catch (seedError) {
    //     console.log('⚠️ Seed data loading failed, but continuing...');
    //     console.log('Seed error:', (seedError as Error).message);
    //   }
    // }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 API server listening on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      const readableDialect =
        currentDialect === 'postgres'
          ? 'PostgreSQL'
          : currentDialect.toUpperCase();
      const displayPort = process.env.DB_PORT || (currentDialect === 'postgres' ? '5432' : '3306');
      console.log(`🗄️  Database: ${readableDialect} @ ${process.env.DB_HOST || 'localhost'}:${displayPort} / ${process.env.DB_NAME || 'mcb'}`);
      if (currentDialect === 'postgres') {
        console.log(`📁 Schema: ${DB_SCHEMA}`);
      }

      try {
        const notificationModulePath = path.resolve(__dirname, '../notifications/email');
        const notificationModule = require(notificationModulePath);
        if (notificationModule && typeof notificationModule.startMailScheduler === 'function') {
          notificationModule.startMailScheduler();
          console.log('⏰ Fresher job mail scheduler initialised');
        }
      } catch (schedulerError) {
        console.error('⚠️  Failed to start fresher job mail scheduler', schedulerError);
      }

      try {
        const marketingModulePath = path.resolve(__dirname, '../notifications/marketing');
        const marketingModule = require(marketingModulePath);
        if (marketingModule && typeof marketingModule.startScheduler === 'function') {
          marketingModule.startScheduler();
          console.log('📣 Marketing notification scheduler initialised');
        }
      } catch (marketingSchedulerError) {
        console.error('⚠️  Failed to start marketing notification scheduler', marketingSchedulerError);
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server', err);
    process.exit(1);
  }
}

start();
