"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const path_1 = __importDefault(require("path"));
const app_1 = __importDefault(require("./app"));
const models_1 = require("./models");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
async function start() {
    try {
        // Test database connection
        await (0, models_1.testConnection)();
        const currentDialect = models_1.sequelize.getDialect();
        // Disable referential integrity checks for MySQL only
        if (currentDialect === 'mysql') {
            console.log('🔧 Temporarily disabling foreign key checks...');
            await models_1.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        }
        // Sync database schema with safe options
        try {
            await models_1.sequelize.sync({ force: false, alter: false });
            console.log('✅ Database schema synchronized');
        }
        catch (syncError) {
            console.log('⚠️ Database sync encountered issues, but continuing...');
            console.log('Sync error:', syncError.message);
        }
        // Re-enable referential integrity checks for MySQL only
        if (currentDialect === 'mysql') {
            console.log('🔧 Re-enabling foreign key checks...');
            await models_1.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
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
        app_1.default.listen(PORT, () => {
            console.log(`🚀 API server listening on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            const readableDialect = currentDialect === 'postgres'
                ? 'PostgreSQL'
                : currentDialect.toUpperCase();
            console.log(`🗄️  Database: ${readableDialect}`);
            try {
                const notificationModulePath = path_1.default.resolve(__dirname, '../notifications/email');
                const notificationModule = require(notificationModulePath);
                if (notificationModule && typeof notificationModule.startMailScheduler === 'function') {
                    notificationModule.startMailScheduler();
                    console.log('⏰ Fresher job mail scheduler initialised');
                }
            }
            catch (schedulerError) {
                console.error('⚠️  Failed to start fresher job mail scheduler', schedulerError);
            }
            try {
                const marketingModulePath = path_1.default.resolve(__dirname, '../notifications/marketing');
                const marketingModule = require(marketingModulePath);
                if (marketingModule && typeof marketingModule.startScheduler === 'function') {
                    marketingModule.startScheduler();
                    console.log('📣 Marketing notification scheduler initialised');
                }
            }
            catch (marketingSchedulerError) {
                console.error('⚠️  Failed to start marketing notification scheduler', marketingSchedulerError);
            }
        });
    }
    catch (err) {
        console.error('❌ Failed to start server', err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=server.js.map