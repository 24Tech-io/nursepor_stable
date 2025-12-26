# Fix AWS Amplify 404 Error for Next.js 14

## The Problem
After deploying to AWS Amplify, you're getting a 404 error. This is because Next.js 14 with App Router requires **SSR (Server-Side Rendering)** configuration, which needs to be set up in the Amplify Console.

## Solution Steps

### Step 1: Verify Amplify Console Settings

1. **Go to AWS Amplify Console** → Your App → **App settings** → **General**

2. **Check Platform**: Make sure it's set to **"WEB_COMPUTE"** (not "WEB")
   - If it's set to "WEB", you need to change it to "WEB_COMPUTE"
   - This enables SSR support for Next.js

3. **Check Branch Framework**:
   - Go to **App settings** → **Build settings**
   - Click on your branch (usually "main")
   - Verify the **Framework** is set to **"Next.js - SSR"**
   - If it's not, you need to update it

### Step 2: Update Branch Framework (if needed)

If the framework isn't set correctly, you can update it via AWS CLI:

```bash
aws amplify update-branch \
  --app-id d1feuk4cj2m70e \
  --branch-name main \
  --framework "Next.js - SSR" \
  --region us-east-1  # or your region
```

Or update it in the Amplify Console:
- Go to **App settings** → **Build settings**
- Click **Edit** on your branch
- Set **Framework** to **"Next.js - SSR"**
- Save

### Step 3: Verify Build Settings

In **Build settings**, ensure:
- **Build command**: `npm run build`
- **Node version**: 18.x or 20.x (not 22.x - Amplify may not support it yet)
- **Build image**: Amazon Linux 2023 or Ubuntu 22

### Step 4: Check Environment Variables

Make sure all required environment variables are set in **App settings** → **Environment variables**:
- `DATABASE_URL`
- `JWT_SECRET`
- Any `NEXT_PUBLIC_*` variables

### Step 5: Redeploy

After making these changes:
1. **Trigger a new deployment** (either push a commit or manually trigger)
2. **Wait for the build to complete**
3. **Check the build logs** to ensure it completed successfully

## What We Fixed in the Code

1. ✅ Removed `output: 'standalone'` from `next.config.js` (this is for Docker, not Amplify)
2. ✅ Updated `amplify.yml` to use Node 20
3. ✅ Ensured proper build configuration

## If Still Getting 404

1. **Check Build Logs**: 
   - Go to **Build history** → Latest build → View logs
   - Look for any errors or warnings

2. **Verify Build Output**:
   - Check if `.next` directory is being created
   - Look for "Compiled successfully" message

3. **Check Amplify Platform**:
   - Must be **WEB_COMPUTE** (not WEB)
   - This is the most common cause of 404 errors

4. **Contact AWS Support** if the platform can't be changed:
   - Sometimes you need to recreate the app with WEB_COMPUTE from the start

## Quick Test

After redeploying, try accessing:
- `https://main.d1feuk4cj2m70e.amplifyapp.com/` (should show homepage)
- `https://main.d1feuk4cj2m70e.amplifyapp.com/login` (should show login page)

If these work, your app is deployed correctly!

