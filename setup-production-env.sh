#!/bin/bash

# Production Environment Setup Script
# This script creates the .env file from your provided configuration

cat > .env << 'EOF'
NODE_ENV=production
PORT=4000

# MySQL Database Configuration - Remote Server
DB_HOST=103.127.146.54
DB_SSL=false
DB_PORT=3306
DB_NAME=mcb
DB_USER=root
DB_PASSWORD=your-db-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-2
AWS_BUCKET_NAME=mcbjobportal

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# SMTP Configuration
EMAIL_HOST=mail.mcb5.in
EMAIL_PORT=25
EMAIL_SECURE=false
EMAIL_USER=your-smtp-username
EMAIL_PASS=your-smtp-password

# Sender & Owner
EMAIL_FROM_EMAIL=careers@mycareerbuild.com
EMAIL_FROM_NAME=mycareerbuild
OWNER_EMAIL=tanasvi77@gmail.com

# Redis Configuration (Optional - for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
EOF

echo "✅ .env file created successfully!"
echo "⚠️  IMPORTANT: Change JWT_SECRET to a strong random string before deploying!"
chmod 600 .env
echo "✅ File permissions set to 600 (read/write for owner only)"

