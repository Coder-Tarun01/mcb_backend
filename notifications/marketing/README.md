# Marketing Email Notification System

## Overview

The marketing notification module sends periodic job digests to subscribed marketing contacts. It operates independently from existing fresher notifications and can be managed via cron automation or manual triggers.

## Key Features

- Pulls pending jobs from `jobs` and `aijobs`, deduplicates, and composes a daily digest (top five roles).
- Sends personalised HTML + text emails with unsubscribe guidance.
- Batches delivery (default 50 contacts), enforces concurrency (default 5), and retries with exponential backoff (1m, 5m, 15m).
- Logs success and failure events under `notifications/logs`.
- Exposes health and manual-trigger endpoints under `/notifications/marketing`.
- Marks jobs as notified once at least one email succeeds, preventing duplicate sends.

## Configuration

Define the following environment variables (update `env.example` and production secrets):

```
MARKETING_EMAIL_ENABLED=true
MARKETING_EMAIL_CRON=*/30 * * * *
MARKETING_JOBS_FETCH_LIMIT=100
MARKETING_JOBS_CREATED_SINCE_HOURS=72
MARKETING_DIGEST_SIZE=5
MARKETING_EMAIL_BATCH_SIZE=50
MARKETING_EMAIL_CONCURRENCY=5
MARKETING_EMAIL_BATCH_PAUSE_MS=10000
MARKETING_EMAIL_MAX_RETRIES=3
MARKETING_EMAIL_RETRY_BACKOFF_MS=60000,300000,900000
MARKETING_EMAIL_DRY_RUN=false
MARKETING_SMTP_HOST=mail.mcb5.in
MARKETING_SMTP_PORT=587
MARKETING_SMTP_SECURE=false
MARKETING_SMTP_REQUIRE_TLS=true
MARKETING_SMTP_USER=admin@mail.mcb5.in
MARKETING_SMTP_PASS=super-secret
MARKETING_FROM_NAME=MyCareerBuild
MARKETING_FROM_EMAIL=careers@example.com
MARKETING_HEALTH_TOKEN=replace-with-token
MARKETING_ALERT_FAILURE_RATE=10
MARKETING_ALERT_BACKLOG_THRESHOLD=500
```

For production, store SMTP credentials in the secrets manager rather than `.env`.

## Deployment Checklist

1. **Migration**: run `src/migrations/20251110_create_marketing_contacts.sql` against the target database.
2. **Environment**: configure SMTP and marketing-specific environment variables (see above).
3. **Cron**: ensure the process manager (PM2/Systemd) keeps the Node server active; the module self-schedules using the cron expression.
4. **Smoke test**:
   - Hit `GET /notifications/marketing/health` with the health token; verify pending count > 0 and failure rate numbers load.
   - Trigger a manual run using `POST /notifications/marketing/trigger` with the admin key (`{ "force": true, "limit": 5 }`).
   - Confirm success/failure entries in `notifications/logs/marketing-success.log` and `marketing-failed.log`.
   - Check `notify_sent` and `notify_sent_at` fields in `jobs` / `aijobs` for processed rows.

## Rollback

1. Disable the scheduler by setting `MARKETING_EMAIL_ENABLED=false` or stopping the server.
2. Remove the marketing module import if necessary (server restarts will not load the scheduler).
3. Reset affected job rows: `UPDATE jobs SET notify_sent = 0, notify_sent_at = NULL WHERE notify_sent_at >= <timestamp>;` (repeat for `aijobs`).
4. Drop `marketing_contacts` if the table is not required: `DROP TABLE marketing_contacts;`.

## Operational Runbook

- **Rerun failed jobs**: `POST /notifications/marketing/trigger` with `{ "force": true }` to bypass skip conditions. Check logs for persistent SMTP errors.
- **Import contacts**: seed `marketing_contacts` via migration or manual SQL; ensure unique emails with valid names. Future enhancement placeholders exist for CSV/API import.
- **Pause/resume**: flip `MARKETING_EMAIL_ENABLED` or set `MARKETING_EMAIL_DRY_RUN=true` to simulate sends without dispatching emails.
- **Logs**: inspect `notifications/logs/marketing-success.log` (success) and `marketing-failed.log` (errors). Each line is JSON for easy parsing.
- **Alerts**: warnings print to stdout if failure rate exceeds 10% or backlog surpasses 500 pending jobs. Integrate with monitoring for automated alerts.
- **Troubleshooting**:
  - SMTP authentication / TLS issues: verify credentials, check SPF/DKIM/DMARC records.
  - DNS problems: ensure sending domain resolves correctly and matches SPF.
  - Database timeouts: increase connection pool or check network latency; cron will retry on next window.

## Manual QA Procedure

1. Seed `marketing_contacts` with test recipients.
2. Insert sample jobs with `notify_sent = 0` in both `jobs` and `aijobs`.
3. Run `POST /notifications/marketing/trigger { "force": true }`.
4. Confirm:
   - Emails delivered (or dry-run log entries recorded).
   - `notify_sent` flipped to `1`.
   - CTA links point to `https://mycareerbuild.com/jobs/{id}` or `/aijobs/{id}`.
   - Logs capture outcomes with matching batch IDs.

## Testing

- Unit tests live under `notifications/marketing/__tests__/marketing.orchestrator.test.js`.
- Run with `node --test notifications/marketing/__tests__/marketing.orchestrator.test.js`.
- Coverage includes happy path, SMTP failures, and contact deduping.

## Future Enhancements

Comments within the code mark placeholders for:

- Contact segmentation by branch/experience.
- Preference-driven frequency controls.
- Alternate channels (e.g., Telegram).
- Analytics and attribution tracking.

These are intentionally left as stubs for subsequent iterations.


