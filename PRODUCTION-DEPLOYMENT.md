# 🚀 Production Deployment Guide

This guide will help you deploy your mycareerbuild Job Portal backend to production using MySQL database.

## 📋 Prerequisites

- Docker and Docker Compose installed
- MySQL 8.0+ (if not using Docker)
- Node.js 20+ (for local development)
- SSL certificates (for HTTPS in production)

## 🗄️ Database Migration: SQLite → MySQL

### Step 1: Setup MySQL Database

```bash
# Create and setup MySQL database
npm run setup:db

# Or manually:
mysql -u root -p
CREATE DATABASE mycareerbuild CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mycareerbuild_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON mycareerbuild.* TO 'mycareerbuild_user'@'%';
FLUSH PRIVILEGES;
```

### Step 2: Migrate Data from SQLite

```bash
# Migrate existing SQLite data to MySQL
npm run migrate:mysql

# This will:
# - Copy all tables and data from SQLite
# - Convert data types for MySQL compatibility
# - Create a backup of your SQLite database
# - Handle JSON fields, dates, and booleans properly
```

### Step 3: Verify Migration

```bash
# Test the migration
mysql -u mycareerbuild_user -p mycareerbuild -e "SELECT COUNT(*) as total_users FROM users;"
mysql -u mycareerbuild_user -p mycareerbuild -e "SELECT COUNT(*) as total_jobs FROM jobs;"
```

## 🐳 Docker Deployment

### Development Environment

```bash
# Start development environment
npm run docker:dev

# This starts:
# - MySQL 8.0 database
# - API server with hot reload
# - Volume mounts for development
```

### Production Environment

#### 1. Configure Environment Variables

```bash
# Copy and edit production environment file
cp env.example env.production

# Update these critical values:
NODE_ENV=production
DB_PASSWORD=your_secure_mysql_password
JWT_SECRET=your_very_secure_jwt_secret_key
CORS_ORIGIN=https://yourdomain.com
```

#### 2. Deploy with Docker Compose

```bash
# Deploy production stack
npm run docker:prod

# This starts:
# - MySQL 8.0 with optimized settings
# - Redis for caching (optional)
# - API server with production optimizations
# - Nginx reverse proxy (optional)
# - Health checks and auto-restart
```

#### 3. Monitor Deployment

```bash
# View logs
npm run logs

# Check service health
docker-compose -f docker-compose.prod.yml ps

# Scale services if needed
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## 🔧 Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DB_HOST` | MySQL host | `mysql` or `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_NAME` | Database name | `mycareerbuild` |
| `DB_USER` | Database user | `mycareerbuild_user` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `JWT_SECRET` | JWT signing key | `very_long_random_string` |
| `PORT` | API server port | `4000` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_APP_PASSWORD` | App-specific DB password | Auto-generated |
| `REDIS_HOST` | Redis host | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `LOG_LEVEL` | Logging level | `warn` |
| `MAX_FILE_SIZE` | Max upload size | `5242880` (5MB) |

## 🔒 Security Best Practices

### 1. Database Security

```sql
-- Remove default MySQL users
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- Create application-specific user with limited privileges
CREATE USER 'mycareerbuild_user'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON mycareerbuild.* TO 'mycareerbuild_user'@'%';

-- Enable SSL (recommended)
ALTER USER 'mycareerbuild_user'@'%' REQUIRE SSL;
```

### 2. Application Security

```bash
# Use strong JWT secrets
JWT_SECRET=$(openssl rand -base64 64)

# Enable HTTPS in production
CORS_ORIGIN=https://yourdomain.com

# Set secure file permissions
chmod 600 env.production
chmod 644 docker-compose.prod.yml
```

### 3. Docker Security

```bash
# Run containers as non-root user
USER nodejs

# Use specific image tags
FROM node:20-alpine

# Enable health checks
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3
```

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# API health check
curl http://localhost:4000/health

# Database health check
docker-compose -f docker-compose.prod.yml exec mysql mysqladmin ping -h localhost

# Redis health check
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### Logging

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f api

# View database logs
docker-compose -f docker-compose.prod.yml logs -f mysql

# View all logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Backup and Restore

```bash
# Backup database
npm run backup:db

# Restore database
npm run restore:db

# Manual backup
docker-compose -f docker-compose.prod.yml exec mysql mysqldump -u root -p mycareerbuild > backup.sql
```

## 🔄 Updates and Scaling

### Application Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
npm run docker:prod

# Zero-downtime deployment
docker-compose -f docker-compose.prod.yml up -d --no-deps api
```

### Database Updates

```bash
# Run migrations
npm run migrate:mysql

# Update schema
docker-compose -f docker-compose.prod.yml exec api npm run build
```

### Horizontal Scaling

```bash
# Scale API instances
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# Use load balancer
# Configure Nginx or HAProxy for load balancing
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check MySQL status
   docker-compose -f docker-compose.prod.yml ps mysql
   
   # Check logs
   docker-compose -f docker-compose.prod.yml logs mysql
   ```

2. **Migration Errors**
   ```bash
   # Check data types
   mysql -u root -p mycareerbuild -e "DESCRIBE users;"
   
   # Verify JSON fields
   mysql -u root -p mycareerbuild -e "SELECT skills FROM users LIMIT 1;"
   ```

3. **Performance Issues**
   ```bash
   # Check MySQL slow query log
   docker-compose -f docker-compose.prod.yml exec mysql mysql -e "SHOW VARIABLES LIKE 'slow_query_log';"
   
   # Monitor resource usage
   docker stats
   ```

### Recovery Procedures

```bash
# Restart services
docker-compose -f docker-compose.prod.yml restart

# Reset database (CAUTION: Data loss!)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d

# Restore from backup
docker-compose -f docker-compose.prod.yml exec mysql mysql -u root -p mycareerbuild < backup.sql
```

## 📈 Performance Optimization

### MySQL Optimization

```sql
-- Optimize for production workload
SET GLOBAL innodb_buffer_pool_size = 256M;
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 64M;

-- Add indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_applications_user_id ON applications(userId);
```

### Application Optimization

```bash
# Enable compression
app.use(compression());

# Set cache headers
app.use(express.static('uploads', { maxAge: '1d' }));

# Use Redis for session storage
app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET
}));
```

## 📞 Support

For deployment issues:
1. Check the logs: `npm run logs`
2. Verify environment variables
3. Test database connectivity
4. Review Docker container status

---

**🎉 Congratulations!** Your mycareerbuild Job Portal is now running on production-grade MySQL infrastructure.
