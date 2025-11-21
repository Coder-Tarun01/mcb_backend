# Marketing Email Notification System

## Overview

The marketing notification module sends periodic job digests to subscribed marketing contacts. It operates independently from existing fresher notifications and can be managed via cron automation or manual triggers.

**Important**: The `MARKETING_EMAIL_CRON` environment variable controls the schedule for **BOTH email and Telegram notifications**. They run together on the same schedule.

## Key Features

- Pulls pending jobs from `jobs` and `accounts_jobdata`, deduplicates, and composes personalized digests (top five roles per contact).
- **Personalized filtering**: Jobs are filtered by each contact's branch and experience level, ensuring different users receive different job recommendations.
- Sends personalised HTML + text emails with unsubscribe guidance.
- Optionally broadcasts the same personalized digest over Telegram for contacts linked with a chat id.
- Default schedule: Runs every 3 days at midnight (`0 0 */3 * *`).
- Batches delivery (default 50 contacts), enforces concurrency (default 5), and retries with exponential backoff (1m, 5m, 15m) per channel.
- Logs success and failure events under `notifications/logs`.
- Exposes health and manual-trigger endpoints under `/notifications/marketing`.
- Marks jobs as notified once at least one channel succeeds, preventing duplicate sends.

## Configuration

Define the following environment variables (update `env.example` and production secrets):

```
MARKETING_EMAIL_ENABLED=true
MARKETING_EMAIL_CRON=0 0 */3 * *
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
MARKETING_TELEGRAM_ENABLED=false
MARKETING_TELEGRAM_BOT_TOKEN=123456:replace-me
MARKETING_TELEGRAM_DRY_RUN=true
MARKETING_TELEGRAM_BATCH_SIZE=50
MARKETING_TELEGRAM_CONCURRENCY=5
MARKETING_TELEGRAM_BATCH_PAUSE_MS=2000
MARKETING_TELEGRAM_MAX_RETRIES=2
MARKETING_TELEGRAM_RETRY_BACKOFF_MS=2000,5000,10000
MARKETING_TELEGRAM_TIMEOUT_MS=20000
MARKETING_TELEGRAM_DISABLE_LINK_PREVIEW=true
```

For production, store SMTP credentials in the secrets manager rather than `.env`.

## Deployment Checklist

1. **Migration**: run `src/migrations/20251110_create_marketing_contacts.sql` and `src/migrations/20251112_add_telegram_chat_id_to_marketing_contacts.sql` against the target database.
2. **Environment**: configure SMTP and marketing-specific environment variables (see above).
3. **Cron**: ensure the process manager (PM2/Systemd) keeps the Node server active; the module self-schedules using the cron expression.
4. **Smoke test**:
   - Hit `GET /notifications/marketing/health` with the health token; verify pending count > 0 and failure rate numbers load.
   - Trigger a manual run using `POST /notifications/marketing/trigger` with the admin key (`{ "force": true, "limit": 5 }`).
   - Confirm success/failure entries in `notifications/logs/marketing-success.log` and `marketing-failed.log`.
   - Check `notify_sent` and `notify_sent_at` fields in `jobs` / `accounts_jobdata` for processed rows.

## Rollback

1. Disable the scheduler by setting `MARKETING_EMAIL_ENABLED=false` or stopping the server.
2. Remove the marketing module import if necessary (server restarts will not load the scheduler).
3. Reset affected job rows: `UPDATE jobs SET notify_sent = 0, notify_sent_at = NULL WHERE notify_sent_at >= <timestamp>;` (repeat for `accounts_jobdata`).
4. Drop `marketing_contacts` if the table is not required: `DROP TABLE marketing_contacts;`.

## Operational Runbook

- **Rerun failed jobs**: `POST /notifications/marketing/trigger` with `{ "force": true }` to bypass skip conditions. Check logs for persistent SMTP errors.
- **Import contacts**: seed `marketing_contacts` via migration or manual SQL; ensure unique emails with valid names and optional `telegram_chat_id`.
- **Pause/resume**: flip `MARKETING_EMAIL_ENABLED` for email, and `MARKETING_TELEGRAM_ENABLED` (or the respective `*_DRY_RUN` flags) to simulate sends without dispatching.
- **Logs**: inspect `notifications/logs/marketing-success.log` (success) and `marketing-failed.log` (errors). Each line includes the `transport` used (email or telegram).
- **Alerts**: warnings print to stdout if failure rate exceeds 10% or backlog surpasses 500 pending jobs. Integrate with monitoring for automated alerts.
- **Troubleshooting**:
  - SMTP authentication / TLS issues: verify credentials, check SPF/DKIM/DMARC records.
  - DNS problems: ensure sending domain resolves correctly and matches SPF.
  - Database timeouts: increase connection pool or check network latency; cron will retry on next window.

## Manual QA Procedure

1. Seed `marketing_contacts` with test recipients.
2. Insert sample jobs with `notify_sent = 0` in both `jobs` and `accounts_jobdata`.
3. Run `POST /notifications/marketing/trigger { "force": true }`.
4. Confirm:
   - Emails delivered (or dry-run log entries recorded).
   - Telegram messages delivered to linked chat ids (or dry-run log entries recorded).
   - `notify_sent` flipped to `1`.
   - CTA links point to `https://mycareerbuild.com/jobs/{id}` or `/accounts_jobdata/{id}`.
   - Logs capture outcomes with matching batch IDs.

## Testing

- Unit tests live under `notifications/marketing/__tests__/marketing.orchestrator.test.js`.
- Run with `node --test notifications/marketing/__tests__/marketing.orchestrator.test.js`.
- Coverage includes happy path, SMTP failures, and contact deduping.

## Job Filtering and Personalization

The system personalizes job recommendations for each contact based on their `branch` and `experience` fields in the `marketing_contacts` table.

### Filtering Strategy

The system uses a multi-strategy approach to find matching jobs:

1. **Fresher jobs with branch + experience match** (strictest for freshers)
2. **Fresher jobs with branch match only**
3. **Fresher jobs with experience match only**
4. **All jobs with branch + experience match** (strictest)
5. **All jobs with branch match only**
6. **All jobs with experience match only**

**Important**: If no jobs match a contact's profile, they will **not** receive any jobs. The system does not send all jobs as a fallback to prevent spam.

### Branch Format

- Can be a single branch (e.g., `"Computer Science"`)
- Can be comma-separated (e.g., `"Computer Science, Information Technology"`)
- Can use `/` or `&` separators (e.g., `"CS/IT"`)
- Matching is case-insensitive and partial (e.g., `"CS"` matches `"Computer Science"`)

### Experience Format

- Range format: `"0-2"`, `"2-5"`, `"5-10"`
- Plus format: `"5+"` (5 years and above)
- Single value: `"2"` (exactly 2 years)
- Fresher: `"fresher"`, `"0"`, `"0-0"`, `"0-1"`

### Testing Filtering

Use the test script to verify filtering works correctly:

```bash
# Test all contacts
node scripts/test-marketing-filtering.js

# Test specific contact
node scripts/test-marketing-filtering.js --contact-id 123

# Test with all contacts (up to 10)
node scripts/test-marketing-filtering.js --all-contacts
```

The script will show:
- Which jobs are selected for each contact
- Which strategy was used to match jobs
- Whether jobs are personalized (different contacts get different jobs)
- Any shared jobs across contacts (should be minimal)

## Future Enhancements

Comments within the code mark placeholders for:

- Preference-driven frequency controls.
- Analytics and attribution tracking.

These are intentionally left as stubs for subsequent iterations.


