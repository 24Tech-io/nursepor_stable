# 🚀 Production Deployment Guide
## Nurse Pro Academy LMS Platform

**Version**: 3.0.0  
**Last Updated**: November 10, 2025  
**Deployment Status**: Production Ready ✅  

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Options](#deployment-options)
3. [Docker Deployment](#docker-deployment)
4. [Vercel Deployment](#vercel-deployment)
5. [AWS Deployment](#aws-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [Security Hardening](#security-hardening)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup Strategy](#backup-strategy)
11. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### Critical Requirements

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL/TLS certificates obtained
- [ ] Domain name configured
- [ ] SMTP email service configured
- [ ] Stripe payment keys (production)
- [ ] Redis instance setup (recommended)
- [ ] Backup strategy implemented
- [ ] Monitoring tools configured
- [ ] Security audit completed

### Security Checklist

- [ ] Change all default passwords
- [ ] Generate new JWT_SECRET (64+ characters)
- [ ] Generate new CSRF_SECRET (64+ characters)
- [ ] Generate new SESSION_SECRET (64+ characters)
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS for your domain
- [ ] Set up rate limiting
- [ ] Configure security headers
- [ ] Enable Redis for security features
- [ ] Review and test authentication flows

### Performance Checklist

- [ ] Enable Redis caching
- [ ] Configure CDN for static assets
- [ ] Optimize database indexes
- [ ] Set up connection pooling
- [ ] Configure image optimization
- [ ] Enable gzip compression
- [ ] Test load balancing

---

## 🐳 Docker Deployment (Recommended)

### Why Docker?

✅ Consistent environment across dev/staging/production  
✅ Easy scaling and orchestration  
✅ Isolated dependencies  
✅ Simple rollback strategy  
✅ Built-in health checks  

### Step 1: Prepare Environment

```bash
# Clone repository
git clone https://github.com/yourusername/nurse-pro-academy.git
cd nurse-pro-academy

# Copy environment template
cp .env.example .env.production

# Edit .env.production with production values
nano .env.production
```

### Step 2: Build Docker Image

```bash
# Build the image
docker build -t nurse-pro-academy:latest .

# Verify build
docker images | grep nurse-pro-academy
```

### Step 3: Launch with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Step 4: Database Migration

```bash
# Run migrations
docker-compose exec app npm run db:push

# Seed initial data (optional)
docker-compose exec app node seed.js

# Verify database
docker-compose exec postgres psql -U lmsuser -d lmsdb -c "SELECT COUNT(*) FROM users;"
```

### Step 5: Health Check

```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","uptime":123.45,"checks":{...}}
```

### Docker Compose Services

```yaml
services:
  app:         # Next.js application (port 3000)
  postgres:    # PostgreSQL database (port 5432)
  redis:       # Redis cache (port 6379)
  pgadmin:     # Database UI (port 5050) - optional
```

### Production Docker Configuration

```bash
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: nurse-pro-academy:latest
    restart: always
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

### Scaling with Docker

```bash
# Scale to 5 instances
docker-compose up -d --scale app=5

# With load balancer
docker-compose -f docker-compose.yml -f docker-compose.lb.yml up -d
```

---

## ☁️ Vercel Deployment

### Advantages

✅ One-command deployment  
✅ Automatic HTTPS  
✅ Global CDN  
✅ Serverless scaling  
✅ Preview deployments  

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Configure Project

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add STRIPE_SECRET_KEY
# ... add all required env vars
```

### Step 3: Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Step 4: Configure Database

```bash
# Use Neon (recommended for Vercel)
# Already configured with DATABASE_URL in your .env.local

# Or use Vercel Postgres
vercel postgres create
```

### Vercel Configuration (vercel.json)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/payments/webhook",
      "headers": {
        "cache-control": "no-cache"
      }
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 🏢 AWS Deployment

### Option A: AWS Amplify

#### Step 1: Connect Repository

1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect your Git repository
4. Select branch (main/master)

#### Step 2: Configure Build

```yaml
# amplify.yml (already included in project)
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

#### Step 3: Add Environment Variables

1. Go to App settings → Environment variables
2. Add all required variables:
   - DATABASE_URL
   - JWT_SECRET
   - STRIPE_SECRET_KEY
   - etc.

#### Step 4: Deploy

- Automatic deployment on git push
- Preview deployments for PRs
- Custom domains supported

### Option B: AWS ECS (Elastic Container Service)

#### Architecture

```
User → CloudFront (CDN)
     → ALB (Load Balancer)
     → ECS Fargate (Containers)
     → RDS (Database)
     → ElastiCache (Redis)
```

#### Step 1: Create ECS Cluster

```bash
# Using AWS CLI
aws ecs create-cluster --cluster-name nurse-pro-academy-prod

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

#### Step 2: Set Up RDS Database

```bash
# Create PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier nurse-pro-academy-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20
```

#### Step 3: Deploy Container

```bash
# Push image to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin
docker tag nurse-pro-academy:latest YOUR_ECR_REPO:latest
docker push YOUR_ECR_REPO:latest

# Create service
aws ecs create-service \
  --cluster nurse-pro-academy-prod \
  --service-name app \
  --task-definition nurse-pro-academy:1 \
  --desired-count 3 \
  --launch-type FARGATE
```

### Option C: AWS EC2 (Traditional)

#### Step 1: Launch EC2 Instance

```bash
# Recommended: t3.medium or larger
# Ubuntu 22.04 LTS
# Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

#### Step 2: Install Dependencies

```bash
# SSH into instance
ssh ubuntu@your-ec2-ip

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install nginx

# Install Docker (if using)
sudo apt-get install docker.io docker-compose
```

#### Step 3: Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/nurse-pro-academy.git
cd nurse-pro-academy

# Install dependencies
npm install

# Build
npm run build

# Start with PM2
pm2 start npm --name "lms-app" -- start
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx

```nginx
# /etc/nginx/sites-available/nurse-pro-academy
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nurse-pro-academy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
```

---

## ⚙️ Environment Configuration

### Production Environment Variables

```bash
# Core Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database (Use production database URL)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Security Secrets (Generate new ones!)
JWT_SECRET=GENERATE_64_CHAR_RANDOM_STRING
CSRF_SECRET=GENERATE_64_CHAR_RANDOM_STRING
SESSION_SECRET=GENERATE_64_CHAR_RANDOM_STRING
ENCRYPTION_KEY=GENERATE_64_CHAR_RANDOM_STRING

# Stripe (Production keys)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY

# SMTP (Production email service)
SMTP_HOST=smtp.youremailprovider.com
SMTP_PORT=587
SMTP_USER=your-production-email@yourdomain.com
SMTP_PASSWORD=your-production-password
SMTP_FROM=Nurse Pro Academy <noreply@yourdomain.com>

# Redis (Production instance)
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_TLS=true

# Google Gemini AI
GEMINI_API_KEY=your-production-gemini-api-key

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

### Generating Secure Secrets

```bash
# Generate all secrets at once
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex')); console.log('CSRF_SECRET=' + require('crypto').randomBytes(64).toString('hex')); console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex')); console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(64).toString('hex'));"
```

---

## 🗄️ Database Setup

### Option 1: Neon (Serverless PostgreSQL) - Current Setup

```bash
# Already configured in .env.local
# Advantages:
# - Serverless (auto-scaling)
# - Built-in connection pooling
# - Automatic backups
# - Free tier available

# Production setup:
1. Go to https://neon.tech
2. Create production project
3. Create production database
4. Copy connection string
5. Update DATABASE_URL in production env
```

### Option 2: AWS RDS

```bash
# Create production database
aws rds create-db-instance \
  --db-instance-identifier nurse-pro-academy-prod \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 16.1 \
  --master-username admin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 100 \
  --storage-encrypted \
  --backup-retention-period 7 \
  --multi-az
```

### Option 3: Self-Hosted PostgreSQL

```bash
# Install PostgreSQL 16
sudo apt-get install postgresql-16

# Create database and user
sudo -u postgres psql
CREATE DATABASE lmsdb;
CREATE USER lmsuser WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE lmsdb TO lmsuser;
```

### Database Migrations

```bash
# Apply migrations
npm run db:push

# Or using Drizzle CLI
npx drizzle-kit push:pg

# Verify migrations
psql $DATABASE_URL -c "SELECT * FROM pg_tables WHERE schemaname = 'public';"
```

---

## 🔒 Security Hardening

### 1. Environment Security

```bash
# Restrict .env file permissions
chmod 600 .env.production

# Never commit .env files
echo ".env*" >> .gitignore

# Use secrets management
# AWS: AWS Secrets Manager
# Azure: Azure Key Vault
# GCP: Google Secret Manager
```

### 2. Firewall Configuration

```bash
# Ubuntu UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 3. SSL/TLS Configuration

```nginx
# Nginx SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
add_header Strict-Transport-Security "max-age=31536000" always;
```

### 4. Rate Limiting (Additional Layer)

```nginx
# Nginx rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

location /api/ {
    limit_req zone=api burst=20 nodelay;
}

location /api/auth/login {
    limit_req zone=login burst=2 nodelay;
}
```

### 5. Security Headers

Already implemented in middleware, but verify:

```bash
curl -I https://yourdomain.com

# Should see:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: ...
```

---

## 📊 Monitoring & Logging

### Application Monitoring

#### Option A: PM2 Monitoring

```bash
# Monitor with PM2
pm2 monit

# View logs
pm2 logs

# Setup PM2 monitoring dashboard
pm2 plus
```

#### Option B: Custom Monitoring

```javascript
// Add to your monitoring service
import { HealthCheck } from './lib/health-check';

setInterval(async () => {
  const health = await HealthCheck.check();
  if (health.status !== 'healthy') {
    // Send alert
    AlertService.send({
      severity: 'critical',
      message: 'Application health check failed',
      details: health
    });
  }
}, 60000); // Check every minute
```

### Log Management

```bash
# Centralized logging with Winston (already configured)
# Logs are written to ./logs/

# Rotate logs
sudo apt-get install logrotate

# /etc/logrotate.d/nurse-pro-academy
/var/log/lms/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### External Monitoring Tools

1. **Sentry** (Error Tracking)
   ```bash
   npm install @sentry/nextjs
   # Add SENTRY_DSN to environment
   ```

2. **Datadog** (APM)
   ```bash
   npm install dd-trace
   # Add DATADOG_API_KEY to environment
   ```

3. **New Relic** (Performance)
   ```bash
   npm install newrelic
   # Configure newrelic.js
   ```

---

## 💾 Backup Strategy

### Database Backups

#### Automated Daily Backups

```bash
# Cron job for PostgreSQL backups
# /etc/cron.daily/backup-lms-db

#!/bin/bash
BACKUP_DIR="/backups/lms"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="lms-backup-$DATE.sql.gz"

# Create backup
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/$FILENAME"

# Upload to S3
aws s3 cp "$BACKUP_DIR/$FILENAME" s3://your-backup-bucket/

# Delete local backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Keep only last 30 days in S3
aws s3 ls s3://your-backup-bucket/ | \
  awk '$1 < "'$(date -d '30 days ago' +%Y-%m-%d)'" {print $4}' | \
  xargs -I {} aws s3 rm s3://your-backup-bucket/{}
```

```bash
# Make executable
chmod +x /etc/cron.daily/backup-lms-db
```

### File Uploads Backup

```bash
# Backup user uploads
rsync -avz ./public/uploads/ backups@backup-server:/backups/lms-uploads/

# Or use S3
aws s3 sync ./public/uploads/ s3://your-uploads-bucket/
```

### Redis Backup

```bash
# Redis persistence is configured in docker-compose.yml
# AOF (Append-Only File) is enabled

# Manual backup
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backups/redis-$(date +%Y%m%d).rdb
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker-compose logs app
# or
pm2 logs

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port already in use

# Solution:
# 1. Verify all env vars are set
# 2. Test database connection
# 3. Check if port 3000 is free
```

#### 2. Database Connection Errors

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Common causes:
# - Incorrect DATABASE_URL
# - Database not accepting connections
# - SSL/TLS misconfiguration

# Solution:
# 1. Verify DATABASE_URL format
# 2. Check database is running
# 3. Add ?sslmode=require to URL if needed
```

#### 3. Performance Issues

```bash
# Check resource usage
docker stats
# or
htop

# Common causes:
# - No Redis caching
# - Slow database queries
# - Memory leak

# Solution:
# 1. Enable Redis
# 2. Add database indexes
# 3. Monitor memory usage
# 4. Check for slow queries
```

#### 4. SSL Certificate Issues

```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate expiry
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com | openssl x509 -noout -dates

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 📈 Performance Optimization

### 1. Enable Redis Caching

```bash
# Start Redis
docker-compose up -d redis

# Add to .env.production
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. CDN Configuration

```bash
# Use CloudFront, Cloudflare, or similar
# Configure for:
# - Static assets (/public/*)
# - Images (/uploads/*)
# - API responses (with proper cache headers)
```

### 3. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX idx_progress_user_chapter ON student_progress(user_id, chapter_id);

-- Analyze tables
ANALYZE users;
ANALYZE courses;
ANALYZE enrollments;
```

### 4. Connection Pooling

```javascript
// Already configured in Drizzle ORM
// Neon has built-in connection pooling

// For self-hosted PostgreSQL:
// Use PgBouncer or similar
```

---

## ✅ Post-Deployment Verification

### Checklist

1. **Application Health**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Authentication**
   - [ ] Login works
   - [ ] Registration works
   - [ ] Password reset works
   - [ ] Session persists

3. **Core Features**
   - [ ] Course browsing works
   - [ ] Video playback works
   - [ ] Quiz submission works
   - [ ] Progress tracking works

4. **Payment**
   - [ ] Stripe checkout works
   - [ ] Webhook receives events
   - [ ] Course unlocked after payment

5. **Email**
   - [ ] Welcome email sent
   - [ ] Password reset email sent
   - [ ] Course notification email sent

6. **Security**
   - [ ] HTTPS enforced
   - [ ] Security headers present
   - [ ] Rate limiting works
   - [ ] CSRF protection active

7. **Performance**
   - [ ] Page load < 3 seconds
   - [ ] API response < 500ms
   - [ ] Redis caching works
   - [ ] No memory leaks

---

## 📞 Support & Resources

### Documentation
- [README.md](README.md) - Project overview
- [CONFIGURATION_COMPLETE_GUIDE.md](CONFIGURATION_COMPLETE_GUIDE.md) - Configuration
- [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) - Security details

### Community
- GitHub Issues: Report bugs
- Discussions: Ask questions
- Wiki: Additional guides

### Professional Support
- Email: support@nursepro.com
- Response time: 24-48 hours
- Emergency: Critical issues only

---

## 🎯 Next Steps After Deployment

1. **Monitor** - Set up monitoring and alerts
2. **Test** - Comprehensive testing in production
3. **Optimize** - Performance tuning based on real usage
4. **Scale** - Add more instances as needed
5. **Backup** - Verify backup strategy works
6. **Update** - Keep dependencies up to date
7. **Audit** - Regular security audits

---

**Deployment Status**: ✅ **READY FOR PRODUCTION**

**Last Updated**: November 10, 2025  
**Version**: 3.0.0  
**Maintainer**: Development Team  

---

*This guide should be updated as the deployment process evolves and new features are added.*

