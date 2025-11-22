# LMS Platform - Production Deployment Guide

## Quick Start

### Prerequisites
- Node.js 22.x or higher
- PostgreSQL 14+ (via Neon or self-hosted)
- npm 10.x or higher

### 1. Environment Setup

```bash
# Clone repository
git clone <your-repo-url>
cd lms-platform

# Install dependencies
npm install
cd admin-app && npm install && cd ..

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
```

### 2. Database Setup

```bash
# Set DATABASE_URL in .env.local
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"

# Run migrations
npm run db:push

# (Optional) Seed demo data
npm run seed:qbank
```

### 3. Build & Deploy

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy student app
vercel --prod

# Deploy admin app
cd admin-app
vercel --prod
```

#### Docker
```bash
# Build and run
docker-compose up -d

# Or build individually
docker build -t lms-platform .
docker run -p 3000:3000 --env-file .env.local lms-platform
```

#### Manual (PM2)
```bash
# Build
npm run build
cd admin-app && npm run build && cd ..

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Production Checklist

### Security
- [ ] Change JWT_SECRET to strong random value
- [ ] Enable HTTPS only
- [ ] Configure CORS for production domains
- [ ] Set secure cookie flags
- [ ] Review and update CSP headers
- [ ] Enable rate limiting
- [ ] Set up firewall rules

### Database
- [ ] Set up daily automated backups
- [ ] Configure connection pooling
- [ ] Add database indices (run schema-indices.ts)
- [ ] Set up replica for read queries (optional)
- [ ] Monitor query performance

### Monitoring
- [ ] Set up error tracking (Sentry/LogRocket)
- [ ] Configure uptime monitoring (UptimeRobot/StatusCake)
- [ ] Set up performance monitoring
- [ ] Configure log aggregation
- [ ] Create alerting rules

### Performance
- [ ] Enable CDN for static assets
- [ ] Configure image optimization
- [ ] Set up Redis for caching (optional)
- [ ] Enable gzip compression
- [ ] Minify and bundle assets

### Backups
```bash
# Schedule daily backups (cron)
0 2 * * * /path/to/scripts/backup-database.sh

# Or use Windows Task Scheduler
# Run: scripts/backup-database.ps1
```

---

## Environment Variables

### Required
```env
DATABASE_URL=           # Neon Postgres URL
JWT_SECRET=             # Generate with: openssl rand -base64 32
```

### Optional
```env
# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Payments
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI
GEMINI_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com
```

---

## Monitoring Endpoints

### Health Check
```bash
GET /api/health
# Returns: 200 (healthy) or 503 (unhealthy)
```

### System Metrics
```bash
GET /api/monitoring
# Returns: CPU, memory, database latency, uptime
```

---

## Backup & Recovery

### Automated Backups
```bash
# Linux/Mac
chmod +x scripts/backup-database.sh
./scripts/backup-database.sh

# Windows
.\scripts\backup-database.ps1
```

### Manual Backup
```bash
pg_dump $DATABASE_URL > backup.sql
gzip backup.sql
```

### Restore
```bash
gunzip backup.sql.gz
psql $DATABASE_URL < backup.sql
```

---

## Scaling

### Horizontal Scaling
- Deploy multiple app instances
- Use load balancer (Nginx/HAProxy)
- Share session store (Redis)

### Database Scaling
- Enable read replicas
- Add connection pooling (PgBouncer)
- Implement caching layer

### CDN Setup
- Configure Cloudflare/CloudFront
- Set cache headers
- Optimize images

---

## Troubleshooting

### High Memory Usage
```bash
# Check Node.js memory
GET /api/monitoring

# Increase heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Slow Database Queries
```bash
# Enable query logging
LOG_LEVEL=debug npm start

# Add missing indices
# Review schema-indices.ts
```

### Rate Limit Issues
```bash
# Adjust limit in middleware.ts
const RATE_LIMIT_MAX = 200; // Increase if needed
```

---

## Security Best Practices

1. **Never commit .env.local**
2. **Rotate JWT_SECRET regularly**
3. **Keep dependencies updated**
4. **Monitor security audit**
   ```bash
   npm audit
   ```
5. **Enable 2FA for admin accounts**
6. **Review logs regularly**
7. **Set up intrusion detection**

---

## Support

- Documentation: /docs
- API Reference: /api/docs
- Issues: GitHub Issues
- Contact: support@yourdomain.com

---

**Last Updated**: 2025-11-22
**Version**: 1.0.0
