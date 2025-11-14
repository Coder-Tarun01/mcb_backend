# 🗄️ PostgreSQL Configuration Guide

## ✅ Current State

The mycareerbuild backend now runs exclusively on **PostgreSQL** in every environment. All MySQL tooling, drivers, and docs have been removed or updated.

---

## 🎯 Quick Reference

- Runtime config: `src/config/database.ts` (Sequelize + PostgreSQL)
- Environment samples: `env.example`, `env.production`
- CLI helper: `npm run setup:db` (uses node-postgres client)
- Default schema: `public` (configurable via `DB_SCHEMA`)

---

## 🔧 Environment Templates

### Development
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mycareerbuild
DB_USER=postgres
DB_PASSWORD=secret
DB_SCHEMA=public
DB_SSL=false
```

### Production (sample)
```env
NODE_ENV=production
DB_HOST=db.prod.aws.example.com
DB_PORT=5432
DB_NAME=mycareerbuild
DB_USER=mycareerbuild_app
DB_PASSWORD=super-secure-password
DB_SCHEMA=core
DB_SSL=true
```

---

## 🚀 Common Tasks

### Start locally
```bash
npm install
npm run dev                   # ts-node-dev hot reload
```

### Compile & run production build
```bash
npm run build
npm start
```

Expected boot logs:
```
✅ PostgreSQL database connected successfully
📊 Database: mycareerbuild@localhost:5432
📁 Schema: public
✅ Database schema synchronized
🚀 API server listening on port 4000
```

---

## 📊 Admin Commands (psql)

```bash
# Connect
psql "postgres://mycareerbuild_app:password@localhost:5432/mycareerbuild"

# List tables
\dt

# Inspect table structure
\d+ users

# Quick data checks
SELECT COUNT(*) FROM jobs;
SELECT id, email, role FROM users LIMIT 5;
```

### Backup & Restore

```bash
# Backup (custom format)
pg_dump -Fc --no-owner --dbname=postgres://user:pass@host:5432/mycareerbuild > backup.pgcustom

# Restore
pg_restore --clean --no-owner --dbname=postgres://user:pass@host:5432/mycareerbuild backup.pgcustom
```

---

## 🔒 Security Checklist

1. Create dedicated application role:
   ```sql
   CREATE ROLE mycareerbuild_app LOGIN PASSWORD '<generated>';
   GRANT CONNECT ON DATABASE mycareerbuild TO mycareerbuild_app;
   GRANT USAGE ON SCHEMA public TO mycareerbuild_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mycareerbuild_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mycareerbuild_app;
   ```

2. Force SSL/TLS if required:
   - Set `DB_SSL=true`
   - Load CA bundle via `PGSSLROOTCERT` or custom driver options

3. Rotate credentials regularly and store them in a secret manager (AWS Secrets Manager, Azure Key Vault, etc.)

---

## 📈 Performance Tips

- Enable connection pooling (PgBouncer) for high concurrency workloads
- Monitor with `pg_stat_statements`
- Run `ANALYZE` on large data imports
- Create indexes via Sequelize migrations (see `src/migrations/`)
- Tune `work_mem`, `shared_buffers`, `max_connections` according to workload

Suggested indexes for heavy queries:

```sql
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_jobs_company ON jobs (company);
CREATE INDEX idx_jobs_location ON jobs (location);
CREATE INDEX idx_applications_user ON applications ("userId");
CREATE INDEX idx_notifications_user ON notifications ("userId");
```

---

## 🧪 Verification

```bash
# API health
curl http://localhost:4000/health

# Validate schema is reachable
psql "postgres://..." -c "\dt"

# Confirm marketing contacts table (new in Postgres migration)
psql "postgres://..." -c "\d marketing_contacts"
```

---

## 📞 Need More?

- Want automated migrations? Add new SQL or TS migration files in `src/migrations/`.
- Need cloud setup guidance (AWS RDS, Azure Database for PostgreSQL)? Ping me anytime.

Your backend is now 100% PostgreSQL-native. 🎉
