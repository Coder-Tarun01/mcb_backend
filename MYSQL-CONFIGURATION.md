# 🗄️ MySQL Configuration Guide

## ✅ **Your Application Now Uses MySQL Exclusively**

Your mycareerbuild Job Portal backend has been successfully configured to use **MySQL only** for all environments.

---

## 🎯 **What Changed:**

### **1. Database Configuration** (`src/config/database.ts`)
- ❌ **Removed**: SQLite configuration and environment switching
- ✅ **Now**: MySQL only for all environments
- ✅ **Enhanced**: Better connection logging and error handling

### **2. Environment Files**
- ✅ `.env` - Development with MySQL
- ✅ `env.example` - Template without SQLite references
- ✅ `env.production` - Production MySQL configuration

### **3. Server Logs**
- Updated to show "MySQL" instead of environment-based database type

---

## 🔧 **Current Configuration**

### **Development Environment:**
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mycareerbuild
DB_USER=root
DB_PASSWORD=secret
```

### **Production Environment:**
```env
NODE_ENV=production
DB_HOST=localhost  # Or your production server
DB_PORT=3306
DB_NAME=mycareerbuild
DB_USER=root
DB_PASSWORD=secret  # Change to secure password
```

---

## 📊 **Current Database Status**

### **Connection Details:**
- **Host:** localhost:3306
- **Database:** mycareerbuild
- **User:** root
- **Charset:** utf8mb4_unicode_ci

### **Tables Created:**
1. ✅ `users` - User accounts (employees & employers)
2. ✅ `jobs` - Job postings (6 records)
3. ✅ `companies` - Company profiles
4. ✅ `applications` - Job applications
5. ✅ `saved_jobs` - Bookmarked jobs
6. ✅ `notifications` - User notifications (6 records)
7. ✅ `candidates` - Candidate profiles (10 records)

### **Migrated Data:**
- ✅ **6 Jobs** from SQLite
- ✅ **10 Candidates** from SQLite
- ✅ **6 Notifications** from SQLite

---

## 🚀 **How to Run**

### **Development Mode:**
```bash
cd C:\mycareerbuildgitlab\mycareerbuild-backend
npm run dev
```

### **Production Mode:**
```bash
cd C:\mycareerbuildgitlab\mycareerbuild-backend
npm run build
npm start
```

### **Expected Output:**
```
✅ MySQL Database connected successfully
📊 Database: mycareerbuild@localhost:3306
✅ Database schema synchronized
🚀 API server listening on port 4000
📊 Environment: development
🗄️ Database: MySQL
```

---

## 🔍 **MySQL Management**

### **Connect to Database:**
```bash
mysql -u root -p mycareerbuild
# Password: secret
```

### **Common Queries:**
```sql
-- Show all tables
SHOW TABLES;

-- Check jobs
SELECT id, title, company, location FROM jobs;

-- Check candidates
SELECT id, name, jobTitle, location FROM candidates LIMIT 10;

-- Check notifications
SELECT id, title, type, isRead FROM notifications;

-- Table structure
DESCRIBE users;
DESCRIBE jobs;
```

### **Database Operations:**
```bash
# Backup database
mysqldump -u root -psecret mycareerbuild > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# Restore database
mysql -u root -psecret mycareerbuild < backup_20251008_120000.sql

# Check database size
mysql -u root -psecret -e "SELECT 
  table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'mycareerbuild'
GROUP BY table_schema;"
```

---

## 🔒 **Security Recommendations**

### **For Production:**

1. **Change Default Password:**
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'very_secure_password_here';
FLUSH PRIVILEGES;
```

2. **Create Application-Specific User:**
```sql
CREATE USER 'mycareerbuild_app'@'localhost' IDENTIFIED BY 'app_secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON mycareerbuild.* TO 'mycareerbuild_app'@'localhost';
FLUSH PRIVILEGES;
```

3. **Update .env file:**
```env
DB_USER=mycareerbuild_app
DB_PASSWORD=app_secure_password
```

4. **Enable SSL (Production):**
```sql
ALTER USER 'mycareerbuild_app'@'%' REQUIRE SSL;
```

---

## 📈 **Performance Optimization**

### **Add Indexes:**
```sql
-- Speed up common queries
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_is_remote ON jobs(isRemote);
CREATE INDEX idx_applications_user_id ON applications(userId);
CREATE INDEX idx_applications_job_id ON applications(jobId);
CREATE INDEX idx_saved_jobs_user_id ON saved_jobs(userId);
CREATE INDEX idx_notifications_user_id ON notifications(userId);
CREATE INDEX idx_notifications_is_read ON notifications(isRead);
```

### **Optimize MySQL Settings:**
```sql
-- View current settings
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW VARIABLES LIKE 'max_connections';

-- Optimize for your workload (run as admin)
SET GLOBAL innodb_buffer_pool_size = 256M;
SET GLOBAL max_connections = 200;
```

---

## 🧪 **Testing**

### **Test API Endpoints:**
```bash
# Health check
curl http://localhost:4000/health

# Get all jobs
curl http://localhost:4000/api/jobs

# Get candidates
curl http://localhost:4000/api/candidates

# Get notifications
curl http://localhost:4000/api/notifications
```

### **Verify Data Integrity:**
```sql
-- Check for NULL values
SELECT COUNT(*) FROM jobs WHERE title IS NULL;
SELECT COUNT(*) FROM users WHERE email IS NULL;

-- Check data types
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'mycareerbuild' AND TABLE_NAME = 'jobs';
```

---

## 🗑️ **SQLite Cleanup (Optional)**

If you want to remove SQLite completely:

```bash
# Remove SQLite database file
Remove-Item database.sqlite -Force

# Remove SQLite backup files
Remove-Item database.sqlite.backup.* -Force

# Optional: Remove sqlite3 from package.json
# npm uninstall sqlite3
```

---

## 🎉 **Benefits of MySQL Only**

- ✅ **Consistency** - Same database for dev & prod
- ✅ **Performance** - Better for concurrent users
- ✅ **Features** - Full SQL capabilities
- ✅ **Scalability** - Ready for growth
- ✅ **Tools** - MySQL Workbench, phpMyAdmin
- ✅ **Production-Ready** - No migration needed

---

## 📞 **Quick Reference**

| Task | Command |
|------|---------|
| Start API | `npm run dev` or `npm start` |
| Connect to DB | `mysql -u root -p mycareerbuild` |
| View tables | `SHOW TABLES;` |
| Backup DB | `mysqldump -u root -p mycareerbuild > backup.sql` |
| Check status | `curl http://localhost:4000/health` |

---

**Your application is now running exclusively on MySQL!** 🚀
