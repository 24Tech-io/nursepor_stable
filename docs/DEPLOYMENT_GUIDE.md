# 🚀 Deployment Guide - Nurse Pro Academy

## Quick Start

This guide covers deploying your LMS platform to production with all next-level upgrades enabled.

---

## Prerequisites

- Node.js 22+ and npm 10+
- PostgreSQL 16+
- Redis 7+
- Domain name (optional, but recommended)
- SSL certificate (Let's Encrypt recommended)

---

## 1. Environment Setup

### 1.1 Copy Environment Template

```bash
cp .env.example .env.production
```

### 1.2 Configure Environment Variables

```env
# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
PORT=3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/lmsdb

# Redis (Required for scaling)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=strong-redis-password
REDIS_DB=0

# JWT & Security
JWT_SECRET=generate-64-char-random-string
CSRF_SECRET=generate-64-char-random-string
SESSION_SECRET=generate-64-char-random-string

# Stripe Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Email (SMTP)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@your-domain.com

# Google Gemini AI (Optional)
GEMINI_API_KEY=your-gemini-api-key

# File Storage (if using cloud storage)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

---

## 2. Database Setup

### 2.1 Create Database

```sql
CREATE DATABASE lmsdb;
CREATE USER lmsuser WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE lmsdb TO lmsuser;
```

### 2.2 Run Migrations

```bash
# Generate migrations from schema
npm run db:generate

# Apply migrations
npm run db:push

# Seed initial data (optional)
node seed.js
```

---

## 3. Redis Setup

### Option A: Docker (Recommended for Development)

```bash
docker run -d \
  --name lms-redis \
  -p 6379:6379 \
  --restart unless-stopped \
  redis:7-alpine redis-server --requirepass your-redis-password
```

### Option B: Cloud Redis (Recommended for Production)

Use managed Redis services:
- **AWS ElastiCache**
- **Redis Cloud**
- **Azure Cache for Redis**
- **Google Cloud Memorystore**

---

## 4. Build Application

```bash
# Install dependencies
npm ci --production

# Build Next.js application
npm run build

# Test build locally
npm start
```

---

## 5. Deployment Options

### Option A: Docker Deployment (Recommended)

```bash
# Build Docker image
docker build -t lms-platform:latest .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Option B: PM2 (Node Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start npm --name "lms-platform" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Option C: Cloud Platforms

#### Vercel (Easiest)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### AWS Amplify

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Deploy
amplify publish
```

#### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create lms-platform

# Add buildpack
heroku buildpacks:set heroku/nodejs

# Deploy
git push heroku main
```

---

## 6. Nginx Configuration (For VPS/Dedicated Server)

### 6.1 Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 6.2 Configure Nginx

Create `/etc/nginx/sites-available/lms-platform`:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

# Upstream Next.js application
upstream nextjs_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers (defense in depth with application CSP)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # File Upload Limits
    client_max_body_size 50M;
    client_body_buffer_size 1M;

    # Logging
    access_log /var/log/nginx/lms_access.log;
    error_log /var/log/nginx/lms_error.log warn;

    # Root location - proxy to Next.js
    location / {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Stricter rate limiting for login
    location /api/auth/login {
        limit_req zone=login_limit burst=2 nodelay;
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://nextjs_upstream;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # Public files
    location /public {
        proxy_pass http://nextjs_upstream;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6.3 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/lms-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

---

## 8. Monitoring & Logging

### 8.1 Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs lms-platform

# View error logs
pm2 logs lms-platform --err
```

### 8.2 Redis Monitoring

```bash
# Connect to Redis CLI
redis-cli -h localhost -p 6379 -a your-password

# Monitor commands
MONITOR

# Get info
INFO

# Check memory usage
INFO memory

# View cache keys
KEYS cache:*
```

### 8.3 Database Monitoring

```sql
-- Active connections
SELECT * FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('lmsdb'));

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 9. Backup Strategy

### 9.1 Database Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/lms-db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U lmsuser -h localhost lmsdb | gzip > $BACKUP_DIR/lmsdb_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "lmsdb_*.sql.gz" -mtime +30 -delete

# Add to crontab
# 0 2 * * * /path/to/backup-script.sh
```

### 9.2 File Backups

```bash
# Backup uploads directory
tar -czf /backups/uploads_$(date +%Y%m%d).tar.gz public/uploads

# Backup configuration
tar -czf /backups/config_$(date +%Y%m%d).tar.gz .env.production
```

---

## 10. Security Checklist

- ✅ All secrets rotated from defaults
- ✅ HTTPS enabled with valid SSL certificate
- ✅ Redis password set
- ✅ Database password is strong (20+ characters)
- ✅ JWT secrets are 64+ characters
- ✅ CSRF protection enabled
- ✅ Rate limiting configured
- ✅ WAF rules active
- ✅ File upload limits set
- ✅ Security headers applied
- ✅ Database backups automated
- ✅ Monitoring set up

---

## 11. Performance Optimization

### 11.1 Enable Caching

```javascript
// Redis caching is already configured
// Warm up cache on startup
import { warmCache } from '@/lib/db-cache';
await warmCache();
```

### 11.2 Database Indexing

```sql
-- Add indexes for common queries
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_student_progress_user_id ON student_progress(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

### 11.3 CDN Configuration

Use a CDN for static assets:
- **Cloudflare** (Free tier available)
- **AWS CloudFront**
- **Fastly**

---

## 12. Troubleshooting

### Issue: Application won't start

```bash
# Check logs
pm2 logs lms-platform --lines 100

# Check port availability
netstat -tuln | grep 3000

# Verify environment variables
pm2 env 0
```

### Issue: Redis connection failed

```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# Check Redis is running
sudo systemctl status redis

# Check firewall
sudo ufw status
```

### Issue: Database connection failed

```bash
# Test database connection
psql -U lmsuser -h localhost -d lmsdb

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

---

## 13. Scaling Strategy

### Horizontal Scaling (Multiple Instances)

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: lms-platform:latest
    deploy:
      replicas: 3  # Run 3 instances
      update_config:
        parallelism: 1
        delay: 10s
    environment:
      - REDIS_HOST=redis
      - DATABASE_URL=postgresql://...
    depends_on:
      - redis
      - postgres

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    
  postgres:
    image: postgres:16-alpine
```

---

## 14. Health Checks

### Application Health Endpoint

```bash
# Check health
curl https://your-domain.com/api/health

# Expected response
{"status":"ok","timestamp":"2025-11-10T12:00:00.000Z"}
```

### Automated Monitoring

```bash
# Add to cron for uptime monitoring
*/5 * * * * curl -f https://your-domain.com/api/health || echo "Site down" | mail -s "LMS Platform Alert" admin@your-domain.com
```

---

## 15. Rollback Procedure

```bash
# PM2 rollback
pm2 reload lms-platform --update-env

# Docker rollback
docker-compose down
docker-compose up -d lms-platform:previous-version

# Database rollback
psql lmsdb < /backups/lmsdb_backup.sql
```

---

## Support

For deployment issues:
1. Check logs: `pm2 logs lms-platform`
2. Verify environment: All variables set correctly
3. Test connections: Database, Redis accessible
4. Check ports: 3000, 5432, 6379 available

---

**Deployment Version**: 3.0.0
**Last Updated**: 2025-11-10
**Status**: Production Ready ✅




