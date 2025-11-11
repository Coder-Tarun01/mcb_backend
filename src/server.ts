import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import app from './app';
import { sequelize, testConnection } from './models';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';

async function start() {
  try {
    // Test database connection
    await testConnection();

    // Ensure the configured schema exists (PostgreSQL only)
    try {
      if (sequelize.getDialect() === 'postgres' && DB_SCHEMA !== 'public') {
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

    // Sync database schema with safe options
    try {
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ Database schema synchronized');
    } catch (syncError) {
      console.log('⚠️ Database sync encountered issues, but continuing...');
      console.log('Sync error:', (syncError as Error).message);
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 API server listening on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      const dialect = sequelize.getDialect();
      const displayPort = process.env.DB_PORT || (dialect === 'postgres' ? '5432' : '3306');
      console.log(`🗄️  Database: ${dialect.toUpperCase()} @ ${process.env.DB_HOST || 'localhost'}:${displayPort} / ${process.env.DB_NAME || 'mcb'}`);
      if (dialect === 'postgres') {
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
