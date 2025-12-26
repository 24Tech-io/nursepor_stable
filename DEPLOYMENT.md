# AWS Deployment Guide for NursePro Academy

## Prerequisite Checks
1. **GitHub Repository**: Ensure your code is pushed to a private GitHub repository.
2. **Database**: You are using **Neon Postgres**. Ensure it is accessible from AWS (0.0.0.0/0 or AWS specific IP allowlist).
3. **Environment Variables**: You will need to set these in AWS (Amplify/EC2/Vercel).

## Deployment Options

### Option A: Vercel (Recommended for Next.js)
Since this is a Next.js app, Vercel is the easiest deployment target.
1. Connect your GitHub repo to Vercel.
2. Set the **Environment Variables** (see below) in the Vercel dashboard.
3. Deploy.

### Option B: AWS Amplify (Good for AWS ecosystem)
1. Go to **AWS Amplify Console**.
2. Click "Host web app".
3. Connect your GitHub provider.
4. Select your repository and branch.
5. In "Build settings", it should auto-detect Next.js.
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
6. **Environment Variables**: Add all variables from your `.env.local` to the Amplify console under "Environment variables".
7. Deploy.

### Option C: AWS EC2 (Manual / Docker)
1. Launch an EC2 instance (Ubuntu).
2. Install Node.js 18+ and PM2:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```
3. Clone your repo:
   ```bash
   git clone <your-repo-url>
   cd lms-platform
   npm install
   ```
4. Create `.env` file with production values.
5. Build and Start:
   ```bash
   npm run build
   pm2 start ecosystem.config.js
   ```

## Production Environment Variables (Required)
```env
# Application URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_ADMIN_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:pass@ep-xyz.region.neon.tech/neondb?sslmode=require

# Authentication
JWT_SECRET=production_secret_key_at_least_32_chars_long

# Stripe (Live Keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Security Verification
- Ensure `NEXT_PUBLIC_APP_URL` matches your actual domain (e.g., `https://nursepro.com`).
- The application runs on **Port 3000** internally.
- Admin dashboard is at `/admin`.
