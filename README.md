# mycareerbuild REST API (Node.js + PostgreSQL)

TypeScript-based REST API powering the MyCareerBuild platform. Uses Express, Sequelize and PostgreSQL.

## Prerequisites
- Node.js 18+
- PostgreSQL 13+

## Quick Start
```bash
cd mcb-backend
cp env.example .env            # adjust credentials for your local PostgreSQL
npm install
npm run setup:db               # optional helper to create the database/role
npm run dev
```
The API listens on `http://localhost:4000` by default. Check `GET /health` for a quick status.

## Project Structure
- `src/` – Express app, Sequelize models, routes, services
- `scripts/` – Node helpers for database setup, maintenance tasks
- `seed/` – Example JSON data for onboarding
- `env.example` – Reference environment variables

## Environment
```
PORT=4000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=mcb
DB_SCHEMA=public
```
See `env.example` for the full list.

## Common Commands
```bash
npm run dev        # start using ts-node-dev
npm run build      # compile TypeScript to dist/
npm run start      # run compiled JS from dist/
npm run setup:db   # create database/role in PostgreSQL
```

## Notes
- Sequelize `sync()` keeps tables in sync at boot; migrations live in `src/scripts/`.
- Background schedulers (email, marketing) start automatically when enabled in env vars.
- Cron-driven notifications rely on valid SMTP and AWS credentials.