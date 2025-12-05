# AWS Deployment Guide - Single Domain Setup

## Architecture Overview

```
Internet (abc.com)
    ↓
CloudFront (CDN)
    ↓
Application Load Balancer (ALB)
    ↓
ECS/EC2 (Single Next.js App)
    ↓
RDS PostgreSQL (Neon/Aurora)
```

## Deployment Options

### Option 1: AWS Amplify (Easiest) ⭐ RECOMMENDED

**Pros:**
- Automatic CI/CD from Git
- Built-in SSL/HTTPS
- Automatic scaling
- Simple environment variable management
- Zero-downtime deployments

**Setup:**

1. **Create `amplify.yml` in project root:**
```yaml
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
      - .next/cache/**/*
```

2. **Connect to AWS Amplify:**
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize project
amplify init

# Add hosting
amplify add hosting

# Publish
amplify publish
```

3. **Configure Environment Variables in Amplify Console:**
- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NODE_ENV=production`

4. **Custom Domain Setup:**
- Go to Amplify Console → Domain Management
- Add custom domain: `abc.com`
- AWS will automatically provision SSL certificate
- Update DNS records as instructed

---

### Option 2: Docker + ECS Fargate (Scalable)

**Pros:**
- Full control over infrastructure
- Easy horizontal scaling
- Container-based deployment
- Good for microservices

**Setup:**

1. **Create `Dockerfile`:**
```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

2. **Update `next.config.js`:**
```javascript
const nextConfig = {
  output: 'standalone', // Enable for Docker
  // ... other config
}
```

3. **Build and Push to ECR:**
```bash
# Build image
docker build -t lms-platform .

# Test locally
docker run -p 3000:3000 -e DATABASE_URL=xxx -e JWT_SECRET=xxx lms-platform

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL
docker tag lms-platform:latest YOUR_ECR_URL/lms-platform:latest
docker push YOUR_ECR_URL/lms-platform:latest
```

4. **Create ECS Task Definition:**
```json
{
  "family": "lms-platform",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "lms-platform",
      "image": "YOUR_ECR_URL/lms-platform:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:jwt-secret"
        }
      ]
    }
  ]
}
```

5. **Create ALB:**
- Create Application Load Balancer
- Configure target group (port 3000)
- Add SSL certificate
- Configure health check: `/api/health`

---

### Option 3: EC2 with PM2 (Traditional)

**Pros:**
- Full server control
- Lower cost for small apps
- Easy to debug

**Setup:**

1. **Launch EC2 Instance:**
- AMI: Ubuntu 22.04 LTS
- Instance Type: t3.small (minimum)
- Security Group: Allow 80, 443, 22

2. **Install Dependencies:**
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx
```

3. **Deploy Application:**
```bash
# Clone repository
git clone your-repo-url /var/www/lms-platform
cd /var/www/lms-platform

# Install dependencies
npm ci

# Build application
npm run build

# Start with PM2
pm2 start npm --name "lms-platform" -- start
pm2 save
pm2 startup
```

4. **Configure Nginx:**
```nginx
# /etc/nginx/sites-available/lms-platform
server {
    listen 80;
    server_name abc.com www.abc.com;

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

5. **Enable SSL with Certbot:**
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d abc.com -d www.abc.com
```

---

## Database Setup

### Option A: Neon (Current)
- Already configured
- Serverless PostgreSQL
- Auto-scaling
- No changes needed

### Option B: AWS RDS
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier lms-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YourPassword \
  --allocated-storage 20

# Update DATABASE_URL in environment
DATABASE_URL=postgresql://admin:password@lms-db.xxx.rds.amazonaws.com:5432/lms
```

---

## Environment Variables

### Required for Production:
```env
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-super-secret-key-min-32-chars

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://abc.com
PORT=3000

# Optional: Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Optional: Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Domain Configuration

### DNS Records (Route 53 or your provider):
```
Type    Name    Value
A       @       ALB-IP-or-CloudFront
A       www     ALB-IP-or-CloudFront
CNAME   admin   abc.com (optional subdomain)
```

### SSL Certificate:
- AWS Certificate Manager (ACM) - Free
- Auto-renewal
- Wildcard support: `*.abc.com`

---

## Monitoring & Logging

### CloudWatch Setup:
```bash
# Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure logs
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

### Application Logs:
```javascript
// Add to next.config.js
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}
```

---

## CI/CD Pipeline

### GitHub Actions Example:
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and push Docker image
        run: |
          docker build -t lms-platform .
          docker tag lms-platform:latest $ECR_REGISTRY/lms-platform:latest
          docker push $ECR_REGISTRY/lms-platform:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster lms-cluster --service lms-service --force-new-deployment
```

---

## Cost Estimation

### Amplify (Recommended):
- Build minutes: ~$0.01/min
- Hosting: ~$0.15/GB
- Data transfer: ~$0.15/GB
- **Estimated**: $20-50/month

### ECS Fargate:
- Fargate: ~$30/month (0.5 vCPU, 1GB)
- ALB: ~$20/month
- Data transfer: ~$10/month
- **Estimated**: $60-80/month

### EC2:
- t3.small: ~$15/month
- EBS: ~$5/month
- Data transfer: ~$10/month
- **Estimated**: $30-40/month

---

## Security Checklist

- ✅ HTTPS/SSL enabled
- ✅ Environment variables in AWS Secrets Manager
- ✅ Security groups configured (minimal ports)
- ✅ Database not publicly accessible
- ✅ IAM roles with least privilege
- ✅ CloudWatch logging enabled
- ✅ Automated backups configured
- ✅ WAF rules for DDoS protection (optional)

---

## Deployment Checklist

- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Configure production database
- [ ] Set up SSL certificate
- [ ] Configure DNS records
- [ ] Enable CloudWatch monitoring
- [ ] Set up automated backups
- [ ] Test all features in staging
- [ ] Run security audit
- [ ] Document rollback procedure
- [ ] Deploy to production
- [ ] Monitor for 24 hours

---

## Rollback Procedure

### Amplify:
```bash
# Revert to previous deployment
amplify console
# Click "Redeploy this version" on previous build
```

### ECS:
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster lms-cluster \
  --service lms-service \
  --task-definition lms-platform:PREVIOUS_VERSION
```

### EC2:
```bash
# SSH into server
cd /var/www/lms-platform
git checkout PREVIOUS_COMMIT
npm ci
npm run build
pm2 restart lms-platform
```

---

## Support & Troubleshooting

### Common Issues:

**Issue**: 502 Bad Gateway
- Check application logs
- Verify health check endpoint
- Ensure port 3000 is listening

**Issue**: Database connection timeout
- Check security group rules
- Verify DATABASE_URL
- Check RDS/Neon status

**Issue**: Environment variables not loading
- Verify in AWS Secrets Manager
- Check ECS task definition
- Restart service

---

## Next Steps

1. Choose deployment option (Amplify recommended)
2. Set up staging environment
3. Test thoroughly
4. Deploy to production
5. Monitor and optimize
6. Set up automated backups
7. Configure CDN for static assets
8. Implement rate limiting (if needed)

