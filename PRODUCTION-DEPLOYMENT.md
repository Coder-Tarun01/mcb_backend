# 🚀 Production Deployment Guide (PostgreSQL)

This guide walks through deploying the mycareerbuild backend on a PostgreSQL database stack (no Docker required). Adjust the steps for your infrastructure provider or automation tooling as needed.

## 📋 Prerequisites

- PostgreSQL 13+ provisioned (managed service or self-hosted)
- Node.js 18+ on the application server
- Reverse proxy or platform TLS termination ready (Nginx, AWS ALB, etc.)
- Access to configure environment variables and secrets

## 🗄️ Database Setup (PostgreSQL)

### 1. Create database and role

```bash
# Log into your PostgreSQL server as an admin role
psql -h <host> -U postgres

-- Create the application database (adjust encoding if required)
CREATE DATABASE mycareerbuild ENCODING 'UTF8';

-- Create an application role with a strong password
CREATE ROLE mycareerbuild_user LOGIN PASSWORD '<generated-strong-password>';

-- Grant access
GRANT ALL PRIVILEGES ON DATABASE mycareerbuild TO mycareerbuild_user;
```

### 2. Configure schema ownership

```sql
\c mycareerbuild
ALTER SCHEMA public OWNER TO mycareerbuild_user;
GRANT USAGE, CREATE ON SCHEMA public TO mycareerbuild_user;
```

### 3. Verify connectivity

```bash
psql "postgres://mycareerbuild_user:<password>@<host>:5432/mycareerbuild" -c "SELECT 1;"
```

## 🌱 Application Bootstrap

1. Copy `env.example` to `.env` (or configure secrets in your platform)

```
NODE_ENV=production
PORT=4000
DB_HOST=<postgres-host>
DB_PORT=5432
DB_NAME=mycareerbuild
DB_USER=mycareerbuild_user
DB_PASSWORD=<password>
DB_SCHEMA=public
JWT_SECRET=<64-char-random-string>
FRONTEND_URL=https://your-frontend.example.com
```

2. Install dependencies and compile

```bash
cd mcb-backend
npm install
npm run build   # generates dist/ for production
```

3. Run database preparation scripts (optional helper)

```bash
npm run setup:db    # Ensures database/role exist using pg client
```

4. Start the service (choose one)

```bash
# Development style (ts-node-dev, reloads on changes)
npm run dev

# Production (prebuilt dist/)
npm run start
```

Use a process manager like PM2, systemd, or a cloud run-time to keep the process alive and restart on failure.

## 🔧 Environment Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Run mode | `production` |
| `PORT` | API port | `4000` |
| `DB_HOST` | PostgreSQL host | `db.example.com` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `mycareerbuild` |
| `DB_USER` | Application role | `mycareerbuild_user` |
| `DB_PASSWORD` | Role password | _(secret)_ |
| `DB_SCHEMA` | Schema search path | `public` |
| `DB_SSL` | `'true'` if TLS required | `true` |
| `JWT_SECRET` | Token signing key | `random` |
| `FRONTEND_URL` | Used in notification emails | `https://jobs.example.com` |

## 🔒 Security Checklist

- Enforce TLS between app server and PostgreSQL (`DB_SSL=true`)
- Restrict inbound firewall rules to the app server IPs
- Rotate `DB_PASSWORD` and `JWT_SECRET` regularly
- Disable unused Postgres extensions and default accounts
- Set `NODE_ENV=production` to leverage secure Express defaults
- Configure CORS whitelist via `CORS_ORIGIN`

## 📊 Monitoring & Maintenance

| Task | Command |
|------|---------|
| API health | `curl http://localhost:4000/health` |
| DB health | `psql ... -c "SELECT NOW();"` |
| Logs | `journalctl -u mycareerbuild` (systemd) or `pm2 logs` |
| Backup | `pg_dump -Fc mycareerbuild > backup.pgcustom` |
| Restore | `pg_restore -c -d mycareerbuild backup.pgcustom` |

## 🚨 Troubleshooting Tips

1. **Cannot connect to PostgreSQL**
   - Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
   - Check firewall rules / security groups
   - Confirm SSL requirements match server configuration

2. **Migrations or sync issues**
   - Run `npm run build` to ensure latest models are compiled
   - Inspect `src/models` changes; Sequelize sync runs automatically on boot
   - Check server logs for permission errors (schema ownership)

3. **Email or S3 integration failures**
   - Validate AWS and SMTP credentials in the environment
   - Use `npm run test-email` or `test-s3-upload.js` scripts for diagnostics

## 📈 Performance Tips

- Enable PostgreSQL connection pooling (e.g., PgBouncer) for high concurrency
- Add indexes for frequent lookups (Sequelize migrations in `src/migrations/`)
- Configure application logging level via `LOG_LEVEL`
- Run `ANALYZE` and `VACUUM` (autovacuum recommended)

## ✅ Launch Checklist

- [ ] Secrets and environment variables configured
- [ ] Database connectivity verified
- [ ] `npm run build` executed successfully
- [ ] Process manager configured with auto-restart
- [ ] Health checks responding with HTTP 200
- [ ] Backups scheduled via `pg_dump`

Once all boxes are checked, your mycareerbuild backend is serving traffic on PostgreSQL. 🎉
