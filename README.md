# mycareerbuild REST API (Node.js + MySQL + Docker)

A simple REST API for jobs, users, and candidates. Runs with MySQL using Docker Compose and seeds data from JSON.

## Prerequisites
- Docker and Docker Compose installed

## Quick Start
```bash
cd /Users/nareshkumarterli/Documents/mycareerbuild/latest_2/api
# Start MySQL and API
docker compose up -d --build

# API will be available at
curl http://localhost:4000/health
```

## Endpoints
- GET `/health` – health check
- CRUD under `/api/users`, `/api/jobs`, `/api/candidates`

## Project Structure
- `src/` – TypeScript source (Express, Sequelize models and routes)
- `seed/` – `users.json`, `jobs.json`, `candidates.json` used for seeding
- `docker-compose.yml` – MySQL and API services
- `Dockerfile` – API container

## Environment
Create `.env` (already created by setup):
```
PORT=4000
NODE_ENV=development
DB_HOST=db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=mycareerbuild
SEED_DIR=seed
```

## Common Commands
```bash
# Start
docker compose up -d --build
# Follow logs
docker compose logs -f api
# Stop
docker compose down
```

## Notes
- Tables are auto-created with Sequelize `sync()`.
- Seed runs automatically in non-production envs at startup.
- Update JSON in `seed/` and restart to refresh.

## Marketing Email Notifications
- Module lives under `notifications/marketing` with dedicated README and runbook.
- Scheduler auto-starts with the API (cron default: every 30 minutes).
- Manual trigger: `POST /notifications/marketing/trigger` (admin key required).
- Health endpoint: `GET /notifications/marketing/health` (token header `x-marketing-token`).
- Configure SMTP and quota settings via the marketing environment variables listed in `env.example`.