# 🚀 AWS Amplify Deployment - Quick Action Guide

## ⚡ IMMEDIATE ACTIONS REQUIRED

### Step 1: Set Environment Variables in AWS Amplify

1. **Go to AWS Amplify Console:**
   - URL: https://console.aws.amazon.com/amplify
   - Sign in to your AWS account

2. **Navigate to Your App:**
   - Find app: `main.d37ba296v07j95.amplifyapp.com`
   - Click on the app name

3. **Go to Environment Variables:**
   - Click **App settings** (left sidebar)
   - Click **Environment variables** (under App settings)

4. **Add/Edit These 4 Variables:**

   **Variable 1: JWT_SECRET**
   - Click **Add environment variable** (or Edit if exists)
   - Variable name: `JWT_SECRET`
   - Value: `4Jaej0rbLXsSnRDulk25WfwpV1qYM8AK9ZPzh6U7ExNOQ3yoFvdHBItigGcCmT`
   - ⚠️ **IMPORTANT:** Copy the value exactly, NO spaces before or after
   - Click **Save**

   **Variable 2: NODE_ENV**
   - Variable name: `NODE_ENV`
   - Value: `production`
   - Click **Save**

   **Variable 3: NEXT_PUBLIC_APP_URL**
   - Variable name: `NEXT_PUBLIC_APP_URL`
   - Value: `https://main.d37ba296v07j95.amplifyapp.com`
   - ⚠️ **NO trailing slash**
   - Click **Save**

   **Variable 4: DATABASE_URL**
   - Variable name: `DATABASE_URL`
   - Value: `postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - Click **Save**

### Step 2: Redeploy the App

**CRITICAL:** Environment variables only take effect after redeployment!

1. **Go to Deployments Tab:**
   - Click **Deployments** (left sidebar)

2. **Trigger Redeployment:**
   - Click **Redeploy this version** button
   - OR if you see a new commit, it will auto-deploy

3. **Wait for Deployment:**
   - Deployment usually takes 3-5 minutes
   - Watch the build logs for any errors
   - Status will show "Deployed" when complete

### Step 3: Verify Deployment

**After deployment completes:**

1. **Check Environment Variables:**
   Visit: https://main.d37ba296v07j95.amplifyapp.com/api/debug/env-check
   
   You should see:
   ```json
   {
     "jwtSecret": {
       "exists": true,
       "isValid": true,
       "trimmedLength": 62
     }
   }
   ```

2. **Test Admin Login:**
   - URL: https://main.d37ba296v07j95.amplifyapp.com/admin/login
   - Email: `admin@lms.com`
   - Password: `Password123`
   - Should redirect to dashboard (no error)

3. **Test Student Login:**
   - URL: https://main.d37ba296v07j95.amplifyapp.com/login
   - Email: `student@lms.com`
   - Password: `Password123`
   - Should redirect to dashboard (no error)

---

## ✅ Verification Checklist

After completing all steps:

- [ ] All 4 environment variables are set in AWS Console
- [ ] JWT_SECRET has NO spaces before/after
- [ ] App has been redeployed
- [ ] Deployment completed successfully
- [ ] `/api/debug/env-check` shows `jwtSecret.isValid: true`
- [ ] Admin login works
- [ ] Student login works

---

## 🆘 If Still Not Working

### Check 1: Verify Variable Value
- Edit `JWT_SECRET` in AWS Console
- Select all text (Ctrl+A)
- Delete everything
- Type: `4Jaej0rbLXsSnRDulk25WfwpV1qYM8AK9ZPzh6U7ExNOQ3yoFvdHBItigGcCmT`
- Make sure NO spaces
- Save and redeploy

### Check 2: Check Build Logs
- Go to Deployments → Latest deployment → Build logs
- Look for errors related to environment variables
- Check if `JWT_SECRET` is being read

### Check 3: Verify Branch/Environment
- Make sure variables are set in the correct environment
- If using branches, ensure variables are for the deployed branch

---

**Status:** Ready for deployment - Follow steps above to complete setup


