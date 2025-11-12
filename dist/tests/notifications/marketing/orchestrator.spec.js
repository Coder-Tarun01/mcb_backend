"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createOrchestrator } = require('../../../../notifications/marketing');
(0, node_test_1.describe)('Marketing notifications orchestrator', () => {
    (0, node_test_1.it)('runs digest with dry run configuration', async () => {
        const sentLogs = [];
        const orchestrator = createOrchestrator({
            enabled: true,
            dryRun: true,
            retryDelaysMs: [],
            batchSize: 2,
            concurrency: 2,
            sleepBetweenBatchesMs: 0,
        }, {
            loggerFactory: () => ({
                logSuccess: async (entry) => {
                    sentLogs.push(entry);
                },
                logFailure: async () => { },
                getHistory: () => [],
            }),
            jobsRepositoryFactory: () => ({
                fetchPendingJobs: async () => [
                    { id: 101, title: 'Backend Engineer', company_name: 'Acme', source: 'jobs', slug: 'backend-engineer' },
                ],
                markJobsNotified: async () => { },
                countPendingJobs: async () => ({ jobs: 0, aiJobs: 0, total: 0 }),
            }),
            contactsRepositoryFactory: () => ({
                fetchContacts: async () => [
                    { id: 1, full_name: 'Alice Example', email: 'alice@example.com' },
                    { id: 2, full_name: 'Bob Example', email: 'bob@example.com' },
                ],
            }),
            emailServiceFactory: () => ({
                sendEmail: async () => ({
                    accepted: ['alice@example.com'],
                    rejected: [],
                    messageId: 'mock',
                }),
            }),
        });
        const result = await orchestrator.runDigest({ force: true });
        strict_1.default.equal(result.sentCount, 2);
        strict_1.default.equal(result.failedCount, 0);
        strict_1.default.equal(sentLogs.length >= 2, true);
    });
    (0, node_test_1.it)('records failures when email sending throws', async () => {
        const orchestrator = createOrchestrator({
            enabled: true,
            dryRun: false,
            retryDelaysMs: [],
            sleepBetweenBatchesMs: 0,
        }, {
            loggerFactory: () => ({
                logSuccess: async () => { },
                logFailure: async () => { },
                getHistory: () => [],
            }),
            jobsRepositoryFactory: () => ({
                fetchPendingJobs: async () => [
                    { id: 201, title: 'Data Scientist', company_name: 'DataWorks', source: 'aijobs', slug: 'data-scientist' },
                ],
                markJobsNotified: async () => { },
                countPendingJobs: async () => ({ jobs: 0, aiJobs: 0, total: 0 }),
            }),
            contactsRepositoryFactory: () => ({
                fetchContacts: async () => [
                    { id: 5, full_name: 'Charlie Example', email: 'charlie@example.com' },
                ],
            }),
            emailServiceFactory: () => ({
                sendEmail: async () => {
                    throw new Error('SMTP unavailable');
                },
            }),
        });
        const result = await orchestrator.runDigest({ force: true });
        strict_1.default.equal(result.sentCount, 0);
        strict_1.default.equal(result.failedCount, 1);
    });
    (0, node_test_1.it)('exposes health metrics with backlog data', async () => {
        const orchestrator = createOrchestrator({
            enabled: true,
            dryRun: true,
            retryDelaysMs: [],
            sleepBetweenBatchesMs: 0,
        }, {
            loggerFactory: () => ({
                logSuccess: async () => { },
                logFailure: async () => { },
                getHistory: () => [],
            }),
            jobsRepositoryFactory: () => ({
                fetchPendingJobs: async () => [],
                markJobsNotified: async () => { },
                countPendingJobs: async () => ({ jobs: 12, aiJobs: 3, total: 15 }),
            }),
            contactsRepositoryFactory: () => ({
                fetchContacts: async () => [],
            }),
            emailServiceFactory: () => ({
                sendEmail: async () => ({
                    accepted: [],
                    rejected: [],
                    messageId: 'noop',
                }),
            }),
        });
        await orchestrator.runDigest({ force: true });
        const metrics = await orchestrator.state.getHealthMetrics();
        strict_1.default.equal(metrics.pending_jobs_count, 15);
        strict_1.default.equal(typeof metrics.failure_rate_24h === 'number', true);
    });
});
//# sourceMappingURL=orchestrator.spec.js.map