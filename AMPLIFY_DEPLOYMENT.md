# AWS Amplify Deployment Guide for Next.js 14

## Current Configuration

Your `package.json` already has the correct scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "export": "next export",
    "start": "next start"
  }
}
```

## Fixing the 404 Error

### Option 1: Use Amplify's Managed Next.js Hosting (Recommended)

1. **In AWS Amplify Console:**
   - Go to your app → **Build settings**
   - Click **Edit** on the build settings
   - **Remove or comment out** the custom `amplify.yml` file
   - Amplify will auto-detect Next.js and configure SSR automatically

2. **Build Settings:**
   - Build command: `npm run build`
   - Build image: Use **Amazon Linux 2023** or **Ubuntu 22**
   - Node version: **18.x** or **20.x**

3. **Environment Variables:**
   - Make sure all required env vars are set:
     - `DATABASE_URL`
     - `JWT_SECRET`
     - `NEXT_PUBLIC_*` variables if any

### Option 2: Keep Custom amplify.yml (Current Setup)

Your current `amplify.yml` is correct. The 404 might be due to:

1. **Build failing** - Check build logs in Amplify Console
2. **Missing environment variables** - Ensure all env vars are set
3. **Wrong base directory** - Should be `.next` (already correct)

### Steps to Fix:

1. **Check Build Logs:**
   - Go to Amplify Console → Your app → Build history
   - Check the latest build for errors

2. **Verify Environment Variables:**
   - Go to App settings → Environment variables
   - Ensure all required variables are set

3. **Redeploy:**
   - After fixing issues, trigger a new deployment
   - Or push a new commit to trigger auto-deploy

4. **If using SSR (which you are):**
   - Make sure Amplify is using **Managed Next.js hosting**
   - This is usually auto-detected, but you can verify in Build settings

## Troubleshooting

If you still get 404:
- Check that the build completes successfully
- Verify the `.next` directory is being created
- Ensure Node.js version is 18+ or 20+
- Check that all dependencies are installed correctly

